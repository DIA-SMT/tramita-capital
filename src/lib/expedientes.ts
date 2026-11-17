import "server-only"
import { cache } from "react"
import { crearClienteServidor } from "@/lib/supabase/servidor"
import { leerDatos, nombreCompleto } from "@/lib/dominio"
import { leerProtocolo } from "@/lib/firma"
import { leerPlazo, type OrigenRecurso } from "@/lib/reconsideracion"

/**
 * Carga completa de un expediente para las vistas de detalle.
 * Todo pasa por RLS: si el usuario no puede verlo, devuelve null.
 */
export const cargarExpediente = cache(async (id: string) => {
  const supabase = await crearClienteServidor()
  const { data: exp } = await supabase
    .from("expedientes")
    .select(
      "*, tipo:tipos_tramite!expedientes_tipo_tramite_id_fkey(id, codigo, nombre, icono, plazo_dias, linea_base_dias, requisitos, formulario, normativa, altas_adicionales), area:areas!expedientes_area_actual_id_fkey(id, nombre, codigo)",
    )
    .eq("id", id)
    .maybeSingle()
  if (!exp || !exp.tipo) return null

  const [{ data: pasos }, { data: actuaciones }, { data: documentos }, { data: movimientos }, { data: areas }, { data: novedades }] = await Promise.all([
    supabase.from("pasos_circuito").select("orden, nombre, area_id, accion, instrucciones, controles, revisa, genera, permite_subsanacion, destino_final").eq("tipo_tramite_id", exp.tipo_tramite_id).order("orden"),
    supabase
      .from("actuaciones")
      .select("id, foja, tipo, titulo, contenido, datos, estado, autor_id, area_id, generada_por_ia, ia_generacion_id, firmada_por, firmada_at, hash, created_at, updated_at")
      .eq("expediente_id", id)
      .order("created_at"),
    supabase
      .from("documentos")
      .select("id, nombre_archivo, mime_type, tamano_bytes, created_at, requisito_clave")
      .eq("expediente_id", id)
      .order("created_at"),
    supabase
      .from("movimientos")
      .select("id, desde_area_id, hacia_area_id, desde_perfil_id, hacia_perfil_id, motivo, created_at")
      .eq("expediente_id", id)
      .order("created_at"),
    supabase.from("areas").select("id, nombre, codigo").order("nombre"),
    // Novedades de haberes: las ve el propio agente y las áreas que trabajan con ellas (RLS).
    supabase
      .from("novedades_haberes")
      .select("id, movimiento, concepto, vigencia_desde, vigencia_hasta, estado, created_at, cargada_at, item, detalle")
      .eq("expediente_id", id)
      .neq("estado", "anulada")
      .order("created_at"),
  ])

  const nombreArea = new Map((areas ?? []).map((a) => [a.id, a.nombre]))
  const idsPersonas = new Set<string>([exp.iniciador_id])
  for (const a of actuaciones ?? []) {
    if (a.firmada_por) idsPersonas.add(a.firmada_por)
    if (a.autor_id) idsPersonas.add(a.autor_id)
  }
  for (const m of movimientos ?? []) {
    if (m.desde_perfil_id) idsPersonas.add(m.desde_perfil_id)
    if (m.hacia_perfil_id) idsPersonas.add(m.hacia_perfil_id)
  }
  if (exp.asignado_a) idsPersonas.add(exp.asignado_a)

  const [{ data: personas }, reconsideracion] = await Promise.all([
    supabase.rpc("perfiles_basicos", { p_ids: [...idsPersonas] }),
    cargarReconsideracion(supabase, exp),
  ])
  // Altas de otros trámites que se piden en el mismo expediente (la familia numerosa en la asignación por hijo/a). En
  // un recurso, las del trámite recurrido, porque la novedad es la de ese trámite.
  const codigosAdicionales = reconsideracion.tramiteOrigen?.altas_adicionales ?? (exp.origen_id ? [] : exp.tipo.altas_adicionales)
  const { data: adicionales } =
    codigosAdicionales.length > 0
      ? await supabase.from("tipos_tramite").select("codigo, nombre").in("codigo", codigosAdicionales)
      : { data: [] as { codigo: string; nombre: string }[] }
  const nombres: Record<string, string> = Object.fromEntries((personas ?? []).map((p) => [p.id, nombreCompleto(p)]))

  const todas = actuaciones ?? []
  return {
    expediente: exp,
    tipo: exp.tipo,
    area: exp.area,
    pasos: (pasos ?? []).map((p) => ({ ...p, area: nombreArea.get(p.area_id) ?? "" })),
    fojas: todas.filter((a) => a.estado === "firmada").map((a) => ({ ...a, area: a.area_id ? (nombreArea.get(a.area_id) ?? null) : null })),
    borradores: todas.filter((a) => a.estado === "borrador"),
    documentos: documentos ?? [],
    movimientos: (movimientos ?? []).map((m) => ({
      ...m,
      desde: m.desde_area_id ? nombreArea.get(m.desde_area_id) : null,
      hacia: m.hacia_area_id ? nombreArea.get(m.hacia_area_id) : null,
    })),
    areas: areas ?? [],
    nombres,
    novedades: (novedades ?? []).map((n) => ({ ...n, detalle: leerDatos(n.detalle) })),
    reconsideracion,
    adicionales: adicionales ?? [],
  }
})

type Cliente = Awaited<ReturnType<typeof crearClienteServidor>>

/**
 * Recurso de reconsideración: si el expediente es un recurso, el expediente recurrido (con su resolución y, para la
 * novedad, su trámite y sus datos); si no, el plazo para pedirla y el recurso, si ya se pidió. Todo por RLS.
 */
async function cargarReconsideracion(supabase: Cliente, exp: { id: string; origen_id: string | null }) {
  if (!exp.origen_id) {
    const { data } = await supabase.rpc("plazo_reconsideracion", { p_expediente: exp.id })
    return { origen: null, tramiteOrigen: null, plazo: leerPlazo(data) }
  }
  const [{ data: origen }, { data: resolucion }] = await Promise.all([
    supabase
      .from("expedientes")
      .select("id, numero, datos, tipo:tipos_tramite!expedientes_tipo_tramite_id_fkey(codigo, nombre, formulario, altas_adicionales)")
      .eq("id", exp.origen_id)
      .maybeSingle(),
    supabase
      .from("actuaciones")
      .select("id, datos")
      .eq("expediente_id", exp.origen_id)
      .eq("tipo", "resolucion")
      .eq("estado", "firmada")
      .order("foja", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])
  const sentido = resolucion ? leerDatos(resolucion.datos).sentido : undefined
  const vinculo: OrigenRecurso = {
    id: origen?.id ?? null,
    numero: origen?.numero ?? "",
    tramite: origen?.tipo?.nombre ?? "",
    resolucion: resolucion
      ? { fojaId: resolucion.id, numero: leerProtocolo(resolucion.datos)?.numero ?? null, sentido: sentido === "hace_lugar" || sentido === "rechaza" ? sentido : null }
      : null,
  }
  return {
    origen: vinculo,
    // La novedad de un recurso es la del trámite recurrido.
    tramiteOrigen: origen?.tipo
      ? { codigo: origen.tipo.codigo, nombre: origen.tipo.nombre, formulario: origen.tipo.formulario, datos: origen.datos, altas_adicionales: origen.tipo.altas_adicionales }
      : null,
    plazo: null,
  }
}

export type ExpedienteCompleto = NonNullable<Awaited<ReturnType<typeof cargarExpediente>>>
