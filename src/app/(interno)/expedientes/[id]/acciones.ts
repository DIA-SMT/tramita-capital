"use server"

import { headers } from "next/headers"
import { after } from "next/server"
import * as z from "zod"
import type { Enum } from "@/lib/database.types"
import { crearClienteServidor } from "@/lib/supabase/servidor"
import { avisarArea, avisarSinFallar } from "@/lib/avisos"
import { entorno } from "@/lib/entorno"
import { DOCUMENTOS_REDACTABLES } from "@/lib/ia/redaccion"
import { CLAVE_FIRMA } from "@/lib/firma"
import { Crudo, Dispositivo, Tinta } from "@/lib/firma-esquema"

export type Resultado = { ok: true } | { ok: false; error: string }

const Id = z.uuid()

function fallo(error: { message: string } | null, porDefecto: string): Resultado {
  return { ok: false, error: error?.message ?? porDefecto }
}

/** Ejecuta avisos después de responder, solo si hay clave de servicio configurada. */
function luego(tarea: () => Promise<unknown>) {
  if (!entorno.supabaseClaveSecreta) return
  after(async () => {
    try {
      await tarea()
    } catch (e) {
      console.error("[avisos]", e)
    }
  })
}

export async function tomarExpediente(expedienteId: string): Promise<Resultado> {
  const id = Id.safeParse(expedienteId)
  if (!id.success) return { ok: false, error: "Expediente inválido" }
  const supabase = await crearClienteServidor()
  const { error } = await supabase.rpc("tomar_expediente", { p_expediente: id.data })
  return error ? fallo(error, "No se pudo tomar el expediente") : { ok: true }
}

export async function pasarExpediente(entrada: {
  expedienteId: string
  haciaArea?: string | null
  haciaPerfil?: string | null
  motivo?: string
}): Promise<Resultado> {
  const datos = z
    .object({
      expedienteId: Id,
      haciaArea: Id.nullish(),
      haciaPerfil: Id.nullish(),
      motivo: z.string().max(2000).optional(),
    })
    .safeParse(entrada)
  if (!datos.success) return { ok: false, error: "Datos del pase inválidos" }

  const supabase = await crearClienteServidor()
  const { data: exp, error } = await supabase.rpc("pasar_expediente", {
    p_expediente: datos.data.expedienteId,
    p_hacia_area: datos.data.haciaArea ?? null,
    p_hacia_perfil: datos.data.haciaPerfil ?? null,
    p_motivo: datos.data.motivo?.trim() || null,
  })
  if (error || !exp) return fallo(error, "No se pudo pasar el expediente")

  luego(async () => {
    const { data: area } = await supabase.from("areas").select("nombre").eq("id", exp.area_actual_id!).single()
    await avisarSinFallar({
      perfilId: exp.iniciador_id,
      expedienteId: exp.id,
      titulo: `Tu trámite ${exp.numero} avanzó`,
      cuerpo: `Ahora está en ${area?.nombre ?? "otra área"}.`,
      ruta: `/mis-tramites/${exp.id}`,
    })
    if (exp.asignado_a) {
      await avisarSinFallar({
        perfilId: exp.asignado_a,
        expedienteId: exp.id,
        titulo: `Te asignaron el expediente ${exp.numero}`,
        cuerpo: exp.asunto,
        ruta: `/expedientes/${exp.id}`,
      })
    } else if (exp.area_actual_id) {
      await avisarArea(exp.area_actual_id, {
        expedienteId: exp.id,
        titulo: `Ingresó el expediente ${exp.numero}`,
        cuerpo: exp.asunto,
        ruta: `/expedientes/${exp.id}`,
      })
    }
  })
  return { ok: true }
}

export async function observarExpediente(expedienteId: string, motivo: string): Promise<Resultado> {
  const id = Id.safeParse(expedienteId)
  if (!id.success) return { ok: false, error: "Expediente inválido" }
  const supabase = await crearClienteServidor()
  const { data: exp, error } = await supabase.rpc("observar_expediente", { p_expediente: id.data, p_motivo: motivo.slice(0, 4000) })
  if (error || !exp) return fallo(error, "No se pudo observar el expediente")

  luego(() =>
    avisarSinFallar({
      perfilId: exp.iniciador_id,
      expedienteId: exp.id,
      titulo: `Tu trámite ${exp.numero} necesita una corrección`,
      cuerpo: motivo,
      ruta: `/mis-tramites/${exp.id}`,
    }),
  )
  return { ok: true }
}

export async function archivarExpediente(expedienteId: string, motivo?: string): Promise<Resultado> {
  const id = Id.safeParse(expedienteId)
  if (!id.success) return { ok: false, error: "Expediente inválido" }
  const supabase = await crearClienteServidor()
  const { data: exp, error } = await supabase.rpc("archivar_expediente", { p_expediente: id.data, p_motivo: motivo?.slice(0, 2000) ?? null })
  if (error || !exp) return fallo(error, "No se pudo archivar el expediente")

  luego(() =>
    avisarSinFallar({
      perfilId: exp.iniciador_id,
      expedienteId: exp.id,
      titulo: `Tu trámite ${exp.numero} finalizó`,
      cuerpo: "Podés ver la resolución y todo el recorrido en el detalle del trámite.",
      ruta: `/mis-tramites/${exp.id}`,
    }),
  )
  return { ok: true }
}

const Borrador = z.object({
  id: Id.optional(),
  expedienteId: Id,
  tipo: z.enum([...DOCUMENTOS_REDACTABLES, "nota"]),
  titulo: z.string().trim().min(3).max(300),
  contenido: z.string().trim().min(1).max(60000),
  iaGeneracionId: Id.nullish(),
  // Resoluciones y dictámenes: define el resultado del expediente al firmar.
  sentido: z.enum(["hace_lugar", "rechaza"]).optional(),
})

export async function guardarBorrador(entrada: z.input<typeof Borrador>): Promise<Resultado & { id?: string }> {
  const datos = Borrador.safeParse(entrada)
  if (!datos.success) return { ok: false, error: "Completá el título y el texto del documento" }
  const supabase = await crearClienteServidor()
  const { data: claims } = await supabase.auth.getClaims()
  const autor = claims?.claims?.sub
  if (!autor) return { ok: false, error: "Sesión vencida" }

  const d = datos.data
  if (d.id) {
    const { error } = await supabase
      .from("actuaciones")
      .update({ titulo: d.titulo, contenido: d.contenido, tipo: d.tipo as Enum<"tipo_actuacion">, ...(d.sentido ? { datos: { sentido: d.sentido } } : {}) })
      .eq("id", d.id)
    return error ? fallo(error, "No se pudo guardar") : { ok: true, id: d.id }
  }

  const { data, error } = await supabase
    .from("actuaciones")
    .insert({
      expediente_id: d.expedienteId,
      tipo: d.tipo as Enum<"tipo_actuacion">,
      titulo: d.titulo,
      contenido: d.contenido,
      autor_id: autor,
      generada_por_ia: Boolean(d.iaGeneracionId),
      ia_generacion_id: d.iaGeneracionId ?? null,
      ...(d.sentido ? { datos: { sentido: d.sentido } } : {}),
    })
    .select("id")
    .single()
  return error || !data ? fallo(error, "No se pudo guardar el borrador") : { ok: true, id: data.id }
}

export async function eliminarBorrador(actuacionId: string): Promise<Resultado> {
  const id = Id.safeParse(actuacionId)
  if (!id.success) return { ok: false, error: "Borrador inválido" }
  const supabase = await crearClienteServidor()
  const { error } = await supabase.from("actuaciones").delete().eq("id", id.data)
  return error ? fallo(error, "No se pudo eliminar") : { ok: true }
}

/** Aviso al agente cuando se firma la resolución de su trámite. */
function avisarResolucion(supabase: Awaited<ReturnType<typeof crearClienteServidor>>, act: { expediente_id: string; titulo: string }) {
  luego(async () => {
    const { data: exp } = await supabase.from("expedientes").select("id, numero, iniciador_id").eq("id", act.expediente_id).single()
    if (exp) {
      await avisarSinFallar({
        perfilId: exp.iniciador_id,
        expedienteId: exp.id,
        titulo: `Se resolvió tu trámite ${exp.numero}`,
        cuerpo: act.titulo,
        ruta: `/mis-tramites/${exp.id}`,
      })
    }
  })
}

/** Firma electrónica simple: dictámenes, informes, notas y demás fojas (no resoluciones). */
export async function firmarActuacion(actuacionId: string): Promise<Resultado> {
  const id = Id.safeParse(actuacionId)
  if (!id.success) return { ok: false, error: "Actuación inválida" }
  const supabase = await crearClienteServidor()
  const { data: act, error } = await supabase.rpc("firmar_actuacion", { p_actuacion: id.data })
  if (error || !act) return fallo(error, "No se pudo firmar")
  return { ok: true }
}

const FirmaResolucion = z.object({
  actuacionId: Id,
  clave: z.string().regex(CLAVE_FIRMA, "La clave de firma tiene 6 números"),
  trazo: Crudo,
  dispositivo: Dispositivo,
  tinta: Tinta,
  entorno: z.object({ pantalla: z.string().max(40), zona: z.string().max(60), idioma: z.string().max(35) }).partial(),
})

/**
 * Firma ológrafa electrónica de una resolución: el trazo crudo dibujado en el acto (posición,
 * tiempo y presión de cada punto) y la clave de 6 números. La base calcula el patrón, lo compara
 * en forma y ritmo con la firma registrada, rechaza copias exactas de firmas anteriores, estampa
 * el trazo verificado y guarda la evidencia pericial. Si algo no coincide devuelve null y deja
 * el intento registrado.
 */
export async function firmarResolucion(entrada: z.input<typeof FirmaResolucion>): Promise<Resultado> {
  const f = FirmaResolucion.safeParse(entrada)
  if (!f.success) {
    const campo = f.error.issues[0]?.path[0]
    return { ok: false, error: campo === "clave" ? "La clave de firma tiene 6 números" : campo === "trazo" ? "Dibujá tu firma completa para firmar" : "Datos de la firma inválidos" }
  }

  const supabase = await crearClienteServidor()
  const { data: claims } = await supabase.auth.getClaims()
  const uid = claims?.claims?.sub
  if (!uid) return { ok: false, error: "Sesión vencida" }

  const h = await headers()
  const contexto = {
    ...f.data.entorno,
    navegador: (h.get("user-agent") ?? "").slice(0, 300),
    ip: (h.get("x-forwarded-for") ?? "").split(",")[0].trim().slice(0, 45) || null,
    puntos: f.data.trazo.reduce((s, t) => s + t.length, 0),
  }

  const { data: act, error } = await supabase.rpc("firmar_actuacion", {
    p_actuacion: f.data.actuacionId,
    p_clave: f.data.clave,
    p_trazo: f.data.trazo,
    p_dispositivo: f.data.dispositivo,
    p_tinta: f.data.tinta,
    p_contexto: contexto,
  })
  if (error) return fallo(error, "No se pudo firmar")
  if (!act) {
    const [{ data: intento }, { data: firma }] = await Promise.all([
      supabase.from("intentos_firma").select("motivo").eq("perfil_id", uid).order("id", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("firmas_registradas").select("bloqueada_hasta").eq("perfil_id", uid).eq("activa", true).maybeSingle(),
    ])
    const motivo =
      intento?.motivo === "trazo"
        ? "La firma no coincide con la registrada (en la forma o en el ritmo). Dibujala de nuevo, con calma y como siempre."
        : intento?.motivo === "copia"
          ? "La firma es idéntica a una anterior: se rechaza como copia. Firmá de nuevo, a mano."
          : "La clave de firma no es correcta."
    const hasta = firma?.bloqueada_hasta ? new Date(firma.bloqueada_hasta) : null
    return {
      ok: false,
      error:
        hasta && hasta > new Date()
          ? `${motivo} Por seguridad, la firma quedó bloqueada hasta las ${hasta.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Tucuman" })}.`
          : motivo,
    }
  }

  avisarResolucion(supabase, act)
  return { ok: true }
}

export async function cambiarPrioridad(expedienteId: string, prioridad: Enum<"prioridad_expediente">, motivo: string): Promise<Resultado> {
  const id = Id.safeParse(expedienteId)
  const p = z.enum(["baja", "normal", "alta", "urgente"]).safeParse(prioridad)
  if (!id.success || !p.success) return { ok: false, error: "Datos inválidos" }
  const supabase = await crearClienteServidor()
  const { error } = await supabase.rpc("fijar_prioridad", {
    p_expediente: id.data,
    p_prioridad: p.data,
    p_motivo: motivo.trim() || "Prioridad ajustada manualmente",
  })
  return error ? fallo(error, "No se pudo cambiar la prioridad") : { ok: true }
}

export async function verificarIntegridad(expedienteId: string) {
  const id = Id.safeParse(expedienteId)
  if (!id.success) return { ok: false as const, error: "Expediente inválido" }
  const supabase = await crearClienteServidor()
  const { data, error } = await supabase.rpc("verificar_integridad", { p_expediente: id.data })
  if (error || !data) return { ok: false as const, error: error?.message ?? "No se pudo verificar" }
  const fallas = data.filter((f) => !f.hash_ok || !f.cadena_ok).map((f) => f.foja)
  return { ok: true as const, fojas: data.length, fallas }
}
