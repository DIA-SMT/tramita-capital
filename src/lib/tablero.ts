import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import { tiemposPorTramite } from "@/lib/pronostico"
import { armarRadiografia, estadisticasObservaciones, type DatosTablero } from "@/lib/tablero-datos"
import type { ImpactoMetricas, ResumenMetricas } from "@/lib/vistas"

type Cliente = SupabaseClient<Database>

const num = (v: unknown) => (v == null ? 0 : Number(v))
const enDias = (v: unknown) => (v == null ? null : Number(v))

/**
 * Todos los indicadores del tablero, para la pantalla y para la IA que lo lee. Las métricas son funciones de la base
 * (solo personal interno); si falta alguna (metricas_impacto, tiempos_por_paso), esa sección queda vacía. Las
 * observaciones se leen por RLS: son las de los expedientes que la persona puede ver.
 */
export async function cargarTablero(supabase: Cliente, dias: number): Promise<DatosTablero> {
  const desde = new Date(Date.now() - dias * 86_400_000).toISOString()
  const [
    { data: resumen },
    { data: porTipo },
    { data: carga },
    { data: serie },
    { data: etapas },
    { data: tipos },
    { data: pasos },
    { data: areas },
    { data: impacto },
    { data: tiempos },
    observaciones,
  ] = await Promise.all([
    supabase.rpc("metricas_resumen"),
    supabase.rpc("metricas_por_tipo"),
    supabase.rpc("metricas_carga"),
    supabase.rpc("metricas_serie", { p_dias: dias }),
    supabase.rpc("metricas_por_etapa", { p_dias: dias }),
    supabase.from("tipos_tramite").select("id, codigo, nombre, plazo_dias, pasos_actuales").eq("activo", true).order("codigo_relevamiento"),
    supabase.from("pasos_circuito").select("tipo_tramite_id, orden, nombre, area_id, plazo_horas"),
    supabase.from("areas").select("id, nombre"),
    supabase.rpc("metricas_impacto", { p_dias: dias }),
    supabase.rpc("tiempos_por_paso"),
    cargarObservaciones(supabase, desde),
  ])
  const r = (resumen ?? {}) as Record<string, unknown>
  const m = impacto && typeof impacto === "object" && !Array.isArray(impacto) ? (impacto as Record<string, unknown>) : null
  const nombreArea = new Map((areas ?? []).map((a) => [a.id, a.nombre]))
  const listaTipos = tipos ?? []
  const listaPasos = (pasos ?? []).map((p) => ({ ...p, area: nombreArea.get(p.area_id) ?? "" }))

  return {
    dias,
    resumen: {
      activos: num(r.activos),
      ingresados_hoy: num(r.ingresados_hoy),
      resueltos_30d: num(r.resueltos_30d),
      vencidos: num(r.vencidos),
      urgentes: num(r.urgentes),
      promedio_dias: enDias(r.promedio_dias),
      linea_base_dias: enDias(r.linea_base_dias),
      hojas_evitadas: num(r.hojas_evitadas),
      borradores_ia: num(r.borradores_ia),
      borradores_ia_aceptados: num(r.borradores_ia_aceptados),
    } satisfies ResumenMetricas,
    impacto: m
      ? ({
          resoluciones: num(m.resoluciones),
          resoluciones_olografas: num(m.resoluciones_olografas),
          novedades_registradas: num(m.novedades_registradas),
          novedades_pendientes: num(m.novedades_pendientes),
          novedades_cargadas: num(m.novedades_cargadas),
          novedades_demora_carga: enDias(m.novedades_demora_carga),
          resolucion_a_civitas: enDias(m.resolucion_a_civitas),
          consultas_migue: num(m.consultas_migue),
          personas_migue: num(m.personas_migue),
          consultas_migue_ok: num(m.consultas_migue_ok),
          hojas_anio: num(m.hojas_anio),
        } satisfies ImpactoMetricas)
      : null,
    porTipo: (porTipo ?? []).map((t) => ({
      codigo: t.codigo,
      nombre: t.nombre,
      promedio: t.promedio_dias != null ? Number(t.promedio_dias) : null,
      lineaBase: t.linea_base_dias != null ? Number(t.linea_base_dias) : null,
      plazo: t.plazo_dias,
      resueltos: Number(t.resueltos),
      total: Number(t.total),
    })),
    carga: (carga ?? []).map((c) => ({ ...c, asignados: Number(c.asignados), fojas_30d: Number(c.fojas_30d) })),
    serie: (serie ?? []).map((d) => ({ dia: d.dia, ingresados: Number(d.ingresados), resueltos: Number(d.resueltos) })),
    etapas: (etapas ?? []).map((e) => ({ ...e, estadias: Number(e.estadias), horas_promedio: Number(e.horas_promedio), horas_maximo: Number(e.horas_maximo) })),
    circuitos: listaTipos
      .filter((t) => t.pasos_actuales != null)
      .map((t) => ({
        codigo: t.codigo,
        nombre: t.nombre,
        antes: t.pasos_actuales ?? 0,
        despues: listaPasos.filter((p) => p.tipo_tramite_id === t.id).length,
      })),
    radiografia: armarRadiografia(listaTipos, listaPasos, tiemposPorTramite(tiempos)),
    observaciones: estadisticasObservaciones(observaciones.observaciones, observaciones.subsanaciones, listaTipos),
  }
}

/**
 * Observaciones al agente del período y sus respuestas, de los expedientes que la persona puede ver (RLS). Los
 * reservados (salud, discapacidad) no entran: el texto de sus observaciones no sale de su expediente.
 */
export async function cargarObservaciones(supabase: Cliente, desde: string) {
  const [{ data: obs }, { data: subs }] = await Promise.all([
    supabase
      .from("actuaciones")
      .select("expediente_id, contenido, firmada_at, expediente:expedientes!inner(tipo_tramite_id, reservado)")
      .eq("tipo", "observacion")
      .eq("estado", "firmada")
      .eq("expediente.reservado", false)
      .gte("firmada_at", desde)
      .order("firmada_at", { ascending: false })
      .limit(400),
    supabase.from("actuaciones").select("expediente_id, firmada_at").eq("tipo", "subsanacion").eq("estado", "firmada").gte("firmada_at", desde).limit(1000),
  ])
  return {
    observaciones: (obs ?? []).flatMap((o) =>
      o.expediente && o.firmada_at ? [{ expediente_id: o.expediente_id, tipo_tramite_id: o.expediente.tipo_tramite_id, at: o.firmada_at, texto: o.contenido ?? "" }] : [],
    ),
    subsanaciones: (subs ?? []).flatMap((s) => (s.firmada_at ? [{ expediente_id: s.expediente_id, at: s.firmada_at }] : [])),
  }
}
