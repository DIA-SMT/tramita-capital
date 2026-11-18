// La IA lee el tablero: la lectura (hallazgos), las preguntas y las causas de las observaciones. Esquemas de lo que
// devuelve y de lo que se guarda en ia_generaciones (tipo 'tablero' u 'observaciones', sin expediente).
import * as z from "zod/v4"

export const TIPOS_HALLAZGO = ["cuello", "tendencia", "desvio", "carga", "logro", "riesgo"] as const

export const EsquemaLectura = z.object({
  titular: z.string(),
  hallazgos: z.array(
    z.object({
      tipo: z.enum(TIPOS_HALLAZGO),
      titulo: z.string(),
      cifra: z.string(),
      detalle: z.string(),
      accion: z.string(),
    }),
  ),
  limites: z.array(z.string()),
})
export type Lectura = z.infer<typeof EsquemaLectura>

export const EsquemaRespuestaTablero = z.object({
  respuesta: z.string(),
  cifras: z.array(z.object({ etiqueta: z.string(), valor: z.string() })),
  sin_datos: z.string(),
})
export type RespuestaTablero = z.infer<typeof EsquemaRespuestaTablero>

export const DONDE_MEJORA = ["formulario", "requisitos", "instrucciones", "circuito", "otro"] as const

/** Lo que devuelve la IA: cada causa con los números de las observaciones que agrupa (la cuenta la hace el código). */
export const EsquemaCausas = z.object({
  resumen: z.string(),
  causas: z.array(
    z.object({
      causa: z.string(),
      ids: z.array(z.number().int()),
      donde: z.enum(DONDE_MEJORA),
      mejora: z.string(),
    }),
  ),
})
export type CausasIA = z.infer<typeof EsquemaCausas>

export type Causa = { causa: string; cantidad: number; tramites: string[]; donde: (typeof DONDE_MEJORA)[number]; mejora: string }
export type AnalisisObservaciones = { resumen: string; total: number; causas: Causa[] }

/** Cuenta cada causa con las observaciones que la IA le asignó (ids válidos y sin repetir) y la ordena. */
export function contarCausas(ia: CausasIA, observaciones: { id: number; tramite: string }[]): AnalisisObservaciones {
  const porId = new Map(observaciones.map((o) => [o.id, o]))
  const usadas = new Set<number>()
  const causas = ia.causas
    .map((c): Causa => {
      const propias = [...new Set(c.ids)].filter((id) => porId.has(id) && !usadas.has(id))
      propias.forEach((id) => usadas.add(id))
      return {
        causa: c.causa,
        cantidad: propias.length,
        tramites: [...new Set(propias.map((id) => porId.get(id)!.tramite))],
        donde: c.donde,
        mejora: c.mejora,
      }
    })
    .filter((c) => c.cantidad > 0)
    .sort((a, b) => b.cantidad - a.cantidad)
  return { resumen: ia.resumen, total: observaciones.length, causas }
}

export type AnalisisGuardado =
  | { tipo: "lectura"; dias: number; lectura: Lectura }
  | { tipo: "observaciones"; dias: number; analisis: AnalisisObservaciones }
export type AnalisisIA = AnalisisGuardado & { at: string; por: string | null }

const Guardado = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("lectura"), dias: z.number(), lectura: EsquemaLectura }),
  z.object({
    tipo: z.literal("observaciones"),
    dias: z.number(),
    analisis: z.object({
      resumen: z.string(),
      total: z.number(),
      causas: z.array(z.object({ causa: z.string(), cantidad: z.number(), tramites: z.array(z.string()), donde: z.enum(DONDE_MEJORA), mejora: z.string() })),
    }),
  }),
])

export function leerAnalisisGuardado(texto: string | null | undefined): AnalisisGuardado | null {
  if (!texto) return null
  try {
    const r = Guardado.safeParse(JSON.parse(texto))
    return r.success ? r.data : null
  } catch {
    return null
  }
}

/** Preguntas de ejemplo para el tablero. */
export const PREGUNTAS_SUGERIDAS = [
  "¿Dónde se traban más los trámites?",
  "¿Está pareja la carga del equipo?",
  "¿Cuánto mejoramos frente al papel?",
  "¿Qué tendría que mirar esta semana?",
]
