"use server"

import { after } from "next/server"
import * as z from "zod"
import { crearClienteServidor } from "@/lib/supabase/servidor"
import { avisarArea, avisarSinFallar } from "@/lib/avisos"
import { priorizarExpediente } from "@/lib/ia/priorizacion"
import { entorno } from "@/lib/entorno"
import { leerEmision, type Emision } from "@/lib/certificado"

const Inicio = z.object({
  codigo: z.string().min(1).max(40),
  asunto: z.string().trim().max(300),
  datos: z.record(z.string(), z.string().max(4000)),
})

export type ResultadoInicio = { ok: true; id: string; numero: string; certificado?: Emision | null } | { ok: false; error: string }

export async function iniciarTramite(entrada: z.input<typeof Inicio>): Promise<ResultadoInicio> {
  const datos = Inicio.safeParse(entrada)
  if (!datos.success) return { ok: false, error: "Revisá los datos del formulario" }

  const supabase = await crearClienteServidor()
  const { data: claims } = await supabase.auth.getClaims()
  const perfilId = claims?.claims?.sub
  if (!perfilId) return { ok: false, error: "Tu sesión venció. Volvé a ingresar." }

  const { data: exp, error } = await supabase.rpc("crear_expediente", {
    p_tipo: datos.data.codigo,
    p_asunto: datos.data.asunto,
    p_datos: datos.data.datos,
  })
  if (error || !exp) return { ok: false, error: error?.message ?? "No se pudo iniciar el trámite" }

  // Certificado de trabajo (migración 001900): si el perfil confirma «Liquida SÍ» y la Dirección autorizó la firma,
  // sale ahora mismo y el trámite queda cerrado. Si no, sigue en el Departamento de Registro.
  const { data: tipo } = await supabase.from("tipos_tramite").select("emision_automatica").eq("codigo", datos.data.codigo).maybeSingle()
  let certificado: Emision | null = null
  if (tipo?.emision_automatica) {
    const { data: emision, error: errorEmision } = await supabase.rpc("emitir_certificado", { p_expediente: exp.id })
    if (errorEmision) console.error("[certificado]", errorEmision.message)
    certificado = leerEmision(emision)
  }

  after(async () => {
    if (certificado?.emitido) {
      if (entorno.supabaseClaveSecreta) {
        await avisarSinFallar({
          perfilId,
          expedienteId: exp.id,
          titulo: "Tu certificado de trabajo está listo",
          cuerpo: `Certificado N.º ${certificado.numero ?? ""}: descargalo desde tu trámite ${exp.numero}.`,
          ruta: `/mis-tramites/${exp.id}`,
        })
      }
      return
    }
    if (entorno.supabaseClaveSecreta) {
      await priorizarExpediente(exp.id).catch((e) => console.error("[priorización]", e))
      await avisarSinFallar({
        perfilId,
        expedienteId: exp.id,
        titulo: `Recibimos tu trámite ${exp.numero}`,
        cuerpo: "Ya está en Mesa de Entradas. Te vamos a avisar cada vez que avance.",
        ruta: `/mis-tramites/${exp.id}`,
      })
      if (exp.area_actual_id) {
        await avisarArea(exp.area_actual_id, {
          expedienteId: exp.id,
          titulo: `Nuevo trámite ${exp.numero}`,
          cuerpo: exp.asunto,
          ruta: `/expedientes/${exp.id}`,
        })
      }
    }
  })

  return { ok: true, id: exp.id, numero: exp.numero, certificado }
}

export async function subsanarTramite(expedienteId: string, texto: string) {
  const id = z.uuid().safeParse(expedienteId)
  if (!id.success) return { ok: false as const, error: "Expediente inválido" }

  const supabase = await crearClienteServidor()
  const { data: exp, error } = await supabase.rpc("subsanar_expediente", { p_expediente: id.data, p_texto: texto.slice(0, 4000) })
  if (error || !exp) return { ok: false as const, error: error?.message ?? "No se pudo enviar la respuesta" }

  after(async () => {
    if (entorno.supabaseClaveSecreta && exp.area_actual_id) {
      await avisarArea(exp.area_actual_id, {
        expedienteId: exp.id,
        titulo: `${exp.numero}: el agente respondió la observación`,
        cuerpo: "El expediente volvió a tu bandeja.",
        ruta: `/expedientes/${exp.id}`,
      })
    }
  })
  return { ok: true as const }
}

/** El/la agente pide la reconsideración de su trámite resuelto (migración 001700): se crea el expediente del recurso. */
export async function pedirReconsideracion(origenId: string, fundamentos: string): Promise<ResultadoInicio> {
  const id = z.uuid().safeParse(origenId)
  if (!id.success) return { ok: false, error: "Expediente inválido" }
  const texto = fundamentos.trim().slice(0, 4000)
  if (!texto) return { ok: false, error: "Contá por qué no estás de acuerdo con lo resuelto" }

  const supabase = await crearClienteServidor()
  const { data: exp, error } = await supabase.rpc("interponer_reconsideracion", { p_origen: id.data, p_fundamentos: texto })
  if (error || !exp) return { ok: false, error: error?.message ?? "No se pudo pedir la reconsideración" }

  after(async () => {
    if (entorno.supabaseClaveSecreta) {
      await avisarSinFallar({
        perfilId: exp.iniciador_id,
        expedienteId: exp.id,
        titulo: `Recibimos tu pedido de reconsideración ${exp.numero}`,
        cuerpo: "Lo analiza Asesoría Legal. Te vamos a avisar cada vez que avance.",
        ruta: `/mis-tramites/${exp.id}`,
      })
      if (exp.area_actual_id) {
        await avisarArea(exp.area_actual_id, {
          expedienteId: exp.id,
          titulo: `Nuevo recurso de reconsideración ${exp.numero}`,
          cuerpo: exp.asunto,
          ruta: `/expedientes/${exp.id}`,
        })
      }
    }
  })
  return { ok: true, id: exp.id, numero: exp.numero }
}
