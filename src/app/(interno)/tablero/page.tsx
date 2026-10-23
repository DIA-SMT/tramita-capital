import type { Metadata } from "next"
import { crearClienteServidor } from "@/lib/supabase/servidor"
import { requerirInterno } from "@/lib/usuario"
import type { ImpactoMetricas, ResumenMetricas } from "@/lib/vistas"
import { VistaTablero } from "./vista"

export const metadata: Metadata = { title: "Tablero de impacto" }

const num = (v: unknown) => (v == null ? 0 : Number(v))

export default async function Tablero({ searchParams }: PageProps<"/tablero">) {
  await requerirInterno()
  const { dias: diasParam } = await searchParams
  const dias = [7, 30, 90].includes(Number(diasParam)) ? Number(diasParam) : 30

  const supabase = await crearClienteServidor()
  const [{ data: resumen }, { data: porTipo }, { data: carga }, { data: serie }, { data: etapas }, { data: tipos }, { data: pasos }, { data: impacto }] = await Promise.all([
    supabase.rpc("metricas_resumen"),
    supabase.rpc("metricas_por_tipo"),
    supabase.rpc("metricas_carga"),
    supabase.rpc("metricas_serie", { p_dias: dias }),
    supabase.rpc("metricas_por_etapa", { p_dias: dias }),
    supabase.from("tipos_tramite").select("id, codigo, nombre, pasos_actuales").eq("activo", true).not("pasos_actuales", "is", null).order("codigo_relevamiento"),
    supabase.from("pasos_circuito").select("tipo_tramite_id"),
    // Si la base todavía no tiene metricas_impacto, el tablero se muestra sin esas secciones.
    supabase.rpc("metricas_impacto", { p_dias: dias }),
  ])
  const r = (resumen ?? {}) as Record<string, unknown>

  const datos: ResumenMetricas = {
    activos: num(r.activos),
    ingresados_hoy: num(r.ingresados_hoy),
    resueltos_30d: num(r.resueltos_30d),
    vencidos: num(r.vencidos),
    urgentes: num(r.urgentes),
    promedio_dias: r.promedio_dias == null ? null : Number(r.promedio_dias),
    linea_base_dias: r.linea_base_dias == null ? null : Number(r.linea_base_dias),
    hojas_evitadas: num(r.hojas_evitadas),
    borradores_ia: num(r.borradores_ia),
    borradores_ia_aceptados: num(r.borradores_ia_aceptados),
  }

  const m = impacto && typeof impacto === "object" && !Array.isArray(impacto) ? (impacto as Record<string, unknown>) : null
  const enDias = (v: unknown) => (v == null ? null : Number(v))
  const datosImpacto: ImpactoMetricas | null = m
    ? {
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
      }
    : null

  return (
    <VistaTablero
      resumen={datos}
      impacto={datosImpacto}
      dias={dias}
      porTipo={(porTipo ?? []).map((t) => ({
        codigo: t.codigo,
        nombre: t.nombre,
        promedio: t.promedio_dias != null ? Number(t.promedio_dias) : null,
        lineaBase: t.linea_base_dias != null ? Number(t.linea_base_dias) : null,
        plazo: t.plazo_dias,
        resueltos: Number(t.resueltos),
        total: Number(t.total),
      }))}
      carga={(carga ?? []).map((c) => ({ ...c, asignados: Number(c.asignados), fojas_30d: Number(c.fojas_30d) }))}
      serie={(serie ?? []).map((d) => ({ dia: d.dia, ingresados: Number(d.ingresados), resueltos: Number(d.resueltos) }))}
      etapas={(etapas ?? []).map((e) => ({ ...e, estadias: Number(e.estadias), horas_promedio: Number(e.horas_promedio), horas_maximo: Number(e.horas_maximo) }))}
      circuitos={(tipos ?? []).map((t) => ({
        codigo: t.codigo,
        nombre: t.nombre,
        antes: t.pasos_actuales ?? 0,
        despues: (pasos ?? []).filter((p) => p.tipo_tramite_id === t.id).length,
      }))}
    />
  )
}
