import "server-only"
import { cache } from "react"
import { crearClienteServidor } from "@/lib/supabase/servidor"
import { nombreCompleto } from "@/lib/dominio"

/**
 * Carga completa de un expediente para las vistas de detalle.
 * Todo pasa por RLS: si el usuario no puede verlo, devuelve null.
 */
export const cargarExpediente = cache(async (id: string) => {
  const supabase = await crearClienteServidor()
  const { data: exp } = await supabase
    .from("expedientes")
    .select(
      "*, tipo:tipos_tramite!expedientes_tipo_tramite_id_fkey(id, codigo, nombre, icono, plazo_dias, linea_base_dias, requisitos, formulario, normativa), area:areas!expedientes_area_actual_id_fkey(id, nombre, codigo)",
    )
    .eq("id", id)
    .maybeSingle()
  if (!exp || !exp.tipo) return null

  const [{ data: pasos }, { data: actuaciones }, { data: documentos }, { data: movimientos }, { data: areas }] = await Promise.all([
    supabase.from("pasos_circuito").select("orden, nombre, area_id, accion").eq("tipo_tramite_id", exp.tipo_tramite_id).order("orden"),
    supabase
      .from("actuaciones")
      .select("id, foja, tipo, titulo, contenido, estado, autor_id, area_id, generada_por_ia, ia_generacion_id, firmada_por, firmada_at, hash, created_at, updated_at")
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

  const { data: personas } = await supabase.rpc("perfiles_basicos", { p_ids: [...idsPersonas] })
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
  }
})

export type ExpedienteCompleto = NonNullable<Awaited<ReturnType<typeof cargarExpediente>>>
