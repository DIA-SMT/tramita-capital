import type { Enum } from "@/lib/database.types"

/**
 * Pronóstico de un expediente: cuándo se resolvería según cuánto tardó cada paso en los trámites iguales ya
 * cumplidos (mediana y percentil 80 de `tiempos_por_paso`). Un paso con menos de `MIN_CASOS` estadías usa el plazo
 * del paso en el circuito o, si no tiene, el plazo del trámite repartido entre sus pasos. Es una estimación para
 * ordenar el trabajo y anticipar vencimientos, no un plazo: los textos lo dicen así.
 */

/** Estadías cumplidas que hacen falta para confiar en la historia de un paso. */
export const MIN_CASOS = 3
const HORAS_SIN_PLAZO = 48
const ZONA = "America/Argentina/Tucuman"

export type TiempoPaso = { tipo_tramite_id?: string; orden: number; estadias: number; mediana_horas: number; p80_horas: number }
export type PasoParaPronostico = { orden: number; nombre: string; area?: string; accion: string; plazo_horas?: number | null }

export type PasoEstimado = { orden: number; nombre: string; area: string; horas: number; fin: string; desde: "historia" | "plazo" }

export type Pronostico = {
  /** Hasta la firma de la resolución o, en un trámite sin resolución, hasta el último paso. */
  meta: "resolucion" | "cierre"
  /** Fecha estimada (mediana) y fecha si se demora como los más lentos (percentil 80). */
  fecha: string
  tarde: string
  base: "historia" | "plazos" | "mixta"
  /** Estadías del paso con menos historia entre los que la usan (0 si no usa historia). */
  casos: number
  pasos: PasoEstimado[]
  /** Contra el vencimiento: null si no tiene o si ya venció (eso lo muestra el semáforo). */
  riesgo: "en_plazo" | "justo" | "fuera" | null
  /** Observado: el paso actual espera la respuesta del agente. */
  esperaAgente: boolean
}

export type PronosticoBreve = Pick<Pronostico, "meta" | "fecha" | "tarde" | "riesgo" | "base">

const ACTIVOS: Enum<"estado_expediente">[] = ["iniciado", "en_tramite", "observado"]

export function pronosticar(a: {
  pasos: PasoParaPronostico[]
  tiempos: TiempoPaso[] | null
  pasoActual: number
  /** Cuándo entró al paso actual (el último pase que lo llevó ahí). */
  enPasoDesde: string | null
  estado: Enum<"estado_expediente">
  venceAt: string | null
  plazoDias: number | null
  ahora?: number
}): Pronostico | null {
  if (!ACTIVOS.includes(a.estado) || a.pasos.length === 0) return null
  const ahora = a.ahora ?? Date.now()
  const ordenados = [...a.pasos].sort((x, y) => x.orden - y.orden)
  const firma = ordenados.find((p) => p.accion === "firma" && p.orden >= a.pasoActual)
  const restantes = ordenados.filter((p) => p.orden >= a.pasoActual && (!firma || p.orden <= firma.orden))
  if (restantes.length === 0) return null

  const historia = new Map((a.tiempos ?? []).filter((t) => t.estadias >= MIN_CASOS).map((t) => [t.orden, t]))
  const reparto = a.plazoDias ? (a.plazoDias * 24) / ordenados.length : HORAS_SIN_PLAZO
  let fin = ahora
  let finTarde = ahora
  let conHistoria = 0
  let casos = Infinity

  const pasos = restantes.map((p): PasoEstimado => {
    const h = historia.get(p.orden)
    let medio = h ? h.mediana_horas : (p.plazo_horas ?? reparto)
    let alto = h ? Math.max(h.p80_horas, medio) : medio * 1.5
    if (h) {
      conHistoria++
      casos = Math.min(casos, h.estadias)
    }
    if (p.orden === a.pasoActual && a.enPasoDesde) {
      // Lo que ya lleva en el paso se descuenta, pero siempre le queda algo: un cuarto de lo habitual.
      const transcurrido = Math.max(0, (ahora - new Date(a.enPasoDesde).getTime()) / 3_600_000)
      const resto = Math.max(medio - transcurrido, medio * 0.25)
      alto = Math.max(alto - transcurrido, resto)
      medio = resto
    }
    fin += medio * 3_600_000
    finTarde += alto * 3_600_000
    return { orden: p.orden, nombre: p.nombre, area: p.area ?? "", horas: Math.round(medio * 10) / 10, fin: new Date(fin).toISOString(), desde: h ? "historia" : "plazo" }
  })

  const vence = a.venceAt ? new Date(a.venceAt).getTime() : null
  return {
    meta: firma ? "resolucion" : "cierre",
    fecha: new Date(fin).toISOString(),
    tarde: new Date(finTarde).toISOString(),
    base: conHistoria === pasos.length ? "historia" : conHistoria === 0 ? "plazos" : "mixta",
    casos: conHistoria ? casos : 0,
    pasos,
    riesgo: vence == null || vence <= ahora ? null : fin > vence ? "fuera" : finTarde > vence ? "justo" : "en_plazo",
    esperaAgente: a.estado === "observado",
  }
}

/** El último pase que llevó el expediente a su paso actual (tomarlo o consultar a otra área no cuenta). */
export function entradaAlPaso(
  movimientos: { paso_desde: number | null; paso_hacia: number | null; created_at: string }[],
  pasoActual: number,
): string | null {
  let entrada: string | null = null
  for (const m of movimientos) {
    if (m.paso_hacia === pasoActual && m.paso_desde !== m.paso_hacia && (!entrada || m.created_at > entrada)) entrada = m.created_at
  }
  return entrada
}

/** Agrupa la salida de `tiempos_por_paso` por trámite, con números (la base devuelve numeric como texto). */
export function tiemposPorTramite(filas: { tipo_tramite_id: string; orden: number; estadias: number | string; mediana_horas: number | string; p80_horas: number | string }[] | null) {
  const porTipo = new Map<string, TiempoPaso[]>()
  for (const f of filas ?? []) {
    const lista = porTipo.get(f.tipo_tramite_id) ?? []
    lista.push({ tipo_tramite_id: f.tipo_tramite_id, orden: f.orden, estadias: Number(f.estadias), mediana_horas: Number(f.mediana_horas), p80_horas: Number(f.p80_horas) })
    porTipo.set(f.tipo_tramite_id, lista)
  }
  return porTipo
}

// --- Textos -------------------------------------------------------------------------------------------------

const dia = (iso: string) => new Intl.DateTimeFormat("es-AR", { timeZone: ZONA, day: "numeric" }).format(new Date(iso))
const mes = (iso: string) => new Intl.DateTimeFormat("es-AR", { timeZone: ZONA, month: "long" }).format(new Date(iso))
const clave = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(new Date(iso))

/** «el 24 de noviembre», «entre el 24 y el 27 de noviembre» o «entre el 30 de noviembre y el 2 de diciembre». */
export function rangoFechas(desde: string, hasta: string) {
  if (clave(desde) === clave(hasta)) return `el ${dia(desde)} de ${mes(desde)}`
  if (mes(desde) === mes(hasta)) return `entre el ${dia(desde)} y el ${dia(hasta)} de ${mes(hasta)}`
  return `entre el ${dia(desde)} de ${mes(desde)} y el ${dia(hasta)} de ${mes(hasta)}`
}

/** «24/11», para filas y listas. */
export function fechaBreve(iso: string) {
  return new Intl.DateTimeFormat("es-AR", { timeZone: ZONA, day: "2-digit", month: "2-digit" }).format(new Date(iso))
}

export function textoBase(p: Pick<Pronostico, "base" | "casos">) {
  if (p.base === "historia") return "Según cuánto tardaron los trámites iguales ya cumplidos."
  if (p.base === "mixta") return "Según los trámites iguales ya cumplidos y, en los pasos con pocos casos, los plazos del circuito."
  return "Según los plazos del circuito: todavía hay pocos trámites cumplidos para medirlo."
}

export const RIESGOS = {
  en_plazo: { etiqueta: "En plazo", detalle: "Terminaría antes del vencimiento." },
  justo: { etiqueta: "Justo", detalle: "Si se demora como los más lentos, vencería." },
  fuera: { etiqueta: "En riesgo", detalle: "Al ritmo habitual terminaría después del vencimiento." },
} as const
