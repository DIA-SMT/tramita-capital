// Lectura de datos del tablero, sin IA: la radiografía de los circuitos (cuánto tarda cada paso de cada trámite),
// dónde se observan los trámites y el resumen en texto que lee la IA. Sirve igual con datos de Supabase o de la demo.
import { MIN_CASOS, type TiempoPaso } from "@/lib/pronostico"
import type { CargaPersona, CircuitoComparado, DiaSerie, EtapaMetrica, ImpactoMetricas, MetricaTipo, ResumenMetricas } from "@/lib/vistas"

export type PasoRadiografia = {
  orden: number
  nombre: string
  area: string
  /** Mediana medida o, si el paso tiene pocos casos, su plazo (medido = false). */
  horas: number
  p80: number | null
  casos: number
  medido: boolean
}
export type FilaRadiografia = {
  codigo: string
  nombre: string
  plazoDias: number | null
  pasos: PasoRadiografia[]
  totalHoras: number
  medidos: number
  /** Orden del paso medido que más tarda. */
  lento: number
}

/** Un trámite por fila, con al menos un paso medido, del que más tarda al que menos. */
export function armarRadiografia(
  tipos: { id: string; codigo: string; nombre: string; plazo_dias: number | null }[],
  pasos: { tipo_tramite_id: string; orden: number; nombre: string; area: string; plazo_horas: number | null }[],
  tiempos: Map<string, TiempoPaso[]>,
): FilaRadiografia[] {
  return tipos
    .flatMap((t) => {
      const suyos = pasos.filter((p) => p.tipo_tramite_id === t.id).sort((a, b) => a.orden - b.orden)
      const historia = new Map((tiempos.get(t.id) ?? []).map((x) => [x.orden, x]))
      const reparto = t.plazo_dias ? (t.plazo_dias * 24) / Math.max(1, suyos.length) : 48
      const filas = suyos.map((p): PasoRadiografia => {
        const h = historia.get(p.orden)
        const medido = Boolean(h && h.estadias >= MIN_CASOS)
        return {
          orden: p.orden,
          nombre: p.nombre,
          area: p.area,
          horas: medido ? h!.mediana_horas : (p.plazo_horas ?? reparto),
          p80: medido ? h!.p80_horas : null,
          casos: h?.estadias ?? 0,
          medido,
        }
      })
      const medidos = filas.filter((f) => f.medido)
      if (medidos.length === 0) return []
      const lento = medidos.reduce((a, b) => (b.horas > a.horas ? b : a))
      return [
        {
          codigo: t.codigo,
          nombre: t.nombre,
          plazoDias: t.plazo_dias,
          pasos: filas,
          totalHoras: filas.reduce((s, f) => s + f.horas, 0),
          medidos: medidos.length,
          lento: lento.orden,
        },
      ]
    })
    .sort((a, b) => b.totalHoras - a.totalHoras)
}

export type ObservacionesTramite = {
  codigo: string
  nombre: string
  observaciones: number
  expedientes: number
  /** Mediana de horas entre la observación y la respuesta del agente (null si nadie respondió todavía). */
  respuestaHoras: number | null
}

/** Cuántas observaciones tuvo cada trámite y cuánto tardaron los agentes en responderlas. */
export function estadisticasObservaciones(
  observaciones: { expediente_id: string; tipo_tramite_id: string; at: string }[],
  subsanaciones: { expediente_id: string; at: string }[],
  tipos: { id: string; codigo: string; nombre: string }[],
): ObservacionesTramite[] {
  const porTipo = new Map<string, { obs: number; exps: Set<string>; respuestas: number[] }>()
  for (const o of observaciones) {
    const fila = porTipo.get(o.tipo_tramite_id) ?? { obs: 0, exps: new Set(), respuestas: [] }
    fila.obs++
    fila.exps.add(o.expediente_id)
    const respuesta = subsanaciones
      .filter((s) => s.expediente_id === o.expediente_id && s.at > o.at)
      .reduce<string | null>((min, s) => (!min || s.at < min ? s.at : min), null)
    if (respuesta) fila.respuestas.push((Date.parse(respuesta) - Date.parse(o.at)) / 3_600_000)
    porTipo.set(o.tipo_tramite_id, fila)
  }
  return tipos
    .flatMap((t) => {
      const f = porTipo.get(t.id)
      return f ? [{ codigo: t.codigo, nombre: t.nombre, observaciones: f.obs, expedientes: f.exps.size, respuestaHoras: mediana(f.respuestas) }] : []
    })
    .sort((a, b) => b.observaciones - a.observaciones)
}

export function mediana(valores: number[]) {
  if (valores.length === 0) return null
  const v = [...valores].sort((a, b) => a - b)
  const m = Math.floor(v.length / 2)
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2
}

/** «36 min», «5,5 h» o «2,3 días». */
export function duracionHoras(h: number) {
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`
  if (h < 48) return `${h.toLocaleString("es-AR", { maximumFractionDigits: 1 })} h`
  return `${(h / 24).toLocaleString("es-AR", { maximumFractionDigits: 1 })} días`
}

export type DatosTablero = {
  dias: number
  resumen: ResumenMetricas
  impacto: ImpactoMetricas | null
  porTipo: MetricaTipo[]
  carga: CargaPersona[]
  serie: DiaSerie[]
  etapas: EtapaMetrica[]
  circuitos: CircuitoComparado[]
  radiografia: FilaRadiografia[]
  observaciones: ObservacionesTramite[]
}

const n = (v: number | null | undefined, decimales = 1) => (v == null ? "sin dato" : v.toLocaleString("es-AR", { maximumFractionDigits: decimales }))

/** A, B, … Z, AA, AB… */
const letra = (i: number): string => (i < 26 ? String.fromCharCode(65 + i) : letra(Math.floor(i / 26) - 1) + letra(i % 26))

/**
 * Los indicadores del tablero en texto, para que la IA los lea. Solo cantidades y promedios: nada de los agentes ni de
 * sus trámites, y el personal sin nombre (Persona A, B…, con su área), así la lectura habla del reparto y no de nadie.
 */
export function textoTablero(d: DatosTablero, hoy = new Date()) {
  const r = d.resumen
  // La serie diaria, por semana: alcanza para ver tendencias y ocupa mucho menos.
  const semanas: { desde: string; ingresados: number; resueltos: number }[] = []
  d.serie.forEach((x, i) => {
    if (i % 7 === 0) semanas.push({ desde: x.dia, ingresados: 0, resueltos: 0 })
    semanas[semanas.length - 1].ingresados += x.ingresados
    semanas[semanas.length - 1].resueltos += x.resueltos
  })
  const bloques = [
    `<periodo dias="${d.dias}" hoy="${hoy.toLocaleDateString("es-AR", { timeZone: "America/Argentina/Tucuman" })}" />`,
    `<resumen>
En curso: ${r.activos}; ingresaron hoy: ${r.ingresados_hoy}; resueltos en los últimos 30 días: ${r.resueltos_30d}; vencidos (fuera del plazo objetivo): ${r.vencidos}; con prioridad alta o urgente: ${r.urgentes}.
Tiempo promedio de resolución (últimos 90 días): ${n(r.promedio_dias)} días. Línea de base del papel (promedio de los trámites que la tienen cargada): ${n(r.linea_base_dias)} días.
Borradores preparados por IA: ${r.borradores_ia}; firmados por personas: ${r.borradores_ia_aceptados}.
</resumen>`,
    `<por_tramite columnas="trámite | promedio de resolución en días | demora en papel (línea de base) | objetivo en días | resueltos | iniciados en total">
${d.porTipo.map((t) => `${t.nombre} | ${n(t.promedio)} | ${n(t.lineaBase)} | ${t.plazo ?? "sin dato"} | ${t.resueltos} | ${t.total}`).join("\n")}
</por_tramite>`,
    `<demora_por_oficina periodo_dias="${d.dias}" columnas="oficina | estadías | promedio en horas | máximo en horas">
${d.etapas.map((e) => `${e.area} | ${e.estadias} | ${n(e.horas_promedio)} | ${n(e.horas_maximo)}`).join("\n") || "Sin pases en el período."}
</demora_por_oficina>`,
    `<tiempos_por_paso nota="mediana y percentil 80 de las estadías cumplidas en el último año; con menos de ${MIN_CASOS} casos el paso figura con su plazo y medido=no">
${
  d.radiografia
    .map(
      (t) =>
        `${t.nombre} (objetivo: ${t.plazoDias ?? "sin dato"} días; suma de medianas: ${n(t.totalHoras / 24)} días)\n` +
        t.pasos
          .map((p) => `  ${p.orden}. ${p.nombre} (${p.area}): ${p.medido ? `mediana ${n(p.horas)} h, percentil 80 ${n(p.p80)} h, ${p.casos} casos` : `medido=no, plazo ${n(p.horas)} h`}`)
          .join("\n"),
    )
    .join("\n") || "Todavía no hay pasos con estadías suficientes."
}
</tiempos_por_paso>`,
    `<carga_del_equipo columnas="persona | área | expedientes en curso asignados | fojas firmadas en 30 días">
${d.carga.map((c, i) => `Persona ${letra(i)} | ${c.area} | ${c.asignados} | ${c.fojas_30d}`).join("\n")}
</carga_del_equipo>`,
    `<ingresados_y_resueltos_por_semana columnas="semana desde | ingresados | resueltos">
${semanas.map((s) => `${s.desde} | ${s.ingresados} | ${s.resueltos}`).join("\n")}
</ingresados_y_resueltos_por_semana>`,
    d.impacto
      ? `<impacto periodo_dias="${d.dias}">
Resoluciones firmadas: ${d.impacto.resoluciones} (${d.impacto.resoluciones_olografas} con firma ológrafa electrónica).
Novedades de haberes: ${d.impacto.novedades_registradas} registradas, ${d.impacto.novedades_cargadas} cargadas en Civitas, ${d.impacto.novedades_pendientes} pendientes hoy; de la resolución a Civitas: ${n(d.impacto.resolucion_a_civitas)} días; carga desde que se registra: ${n(d.impacto.novedades_demora_carga)} días.
Consultas a Migue: ${d.impacto.consultas_migue} de ${d.impacto.personas_migue} agentes (${d.impacto.consultas_migue_ok} respondidas).
Hojas de papel evitadas en 12 meses: ${d.impacto.hojas_anio} (la hoja de ruta en papel consumía unas 8.000 por año).
</impacto>`
      : null,
    d.circuitos.length
      ? `<circuitos columnas="trámite | pasos en papel | pasos en el sistema">
${d.circuitos.map((c) => `${c.nombre} | ${c.antes} | ${c.despues}`).join("\n")}
</circuitos>`
      : null,
    d.observaciones.length
      ? `<observaciones_al_agente periodo_dias="${d.dias}" columnas="trámite | observaciones | expedientes observados | mediana de respuesta del agente">
${d.observaciones.map((o) => `${o.nombre} | ${o.observaciones} | ${o.expedientes} | ${o.respuestaHoras == null ? "sin respuestas" : `${n(o.respuestaHoras)} h`}`).join("\n")}
</observaciones_al_agente>`
      : null,
  ]
  return `<datos_tablero>\n${bloques.filter(Boolean).join("\n\n")}\n</datos_tablero>`
}
