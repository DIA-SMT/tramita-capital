import * as z from "zod"
import type { Json } from "@/lib/database.types"
import { DISPOSITIVOS, MAXIMO_PUNTOS, TINTAS, type Evaluacion } from "@/lib/firma-trazo"

/** Punto crudo: [x, y, t (ms desde el inicio), presión o -1]. La base vuelve a validar todo. */
const PuntoCrudo = z.tuple([
  z.number().finite().min(-20000).max(20000),
  z.number().finite().min(-20000).max(20000),
  z.number().int().min(0).max(600000),
  z.number().min(-1).max(1),
])

/** Trazo crudo de una firma (ver src/lib/firma-trazo.ts). */
export const Crudo = z
  .array(z.array(PuntoCrudo).max(MAXIMO_PUNTOS))
  .min(1)
  .max(60)
  .refine((t) => {
    const n = t.reduce((s, x) => s + x.length, 0)
    return n >= 12 && n <= MAXIMO_PUNTOS
  })

export const Dispositivo = z.enum(DISPOSITIVOS)
export const Tinta = z.enum(TINTAS)

/** Lee un trazo crudo enviado como JSON en un FormData. */
export function leerCrudo(valor: FormDataEntryValue | null) {
  try {
    const r = Crudo.safeParse(JSON.parse(String(valor ?? "")))
    return r.success ? r.data : null
  } catch {
    return null
  }
}

const Medida = z.object({ puntaje: z.coerce.number(), umbral: z.coerce.number() })
const EvaluacionBase = z.object({
  forma: Medida,
  ritmo: Medida,
  duracion_ok: z.boolean(),
  trazos_ok: z.boolean(),
  largo_ok: z.boolean(),
  copia: z.boolean(),
  coincide: z.boolean(),
})

/** Evaluación que devuelve la base (public._firma_evaluar), en el formato de la app. */
export function leerEvaluacion(datos: Json | null): Evaluacion | null {
  const r = EvaluacionBase.safeParse(datos)
  if (!r.success) return null
  const e = r.data
  return { forma: e.forma, ritmo: e.ritmo, duracionOk: e.duracion_ok, trazosOk: e.trazos_ok, largoOk: e.largo_ok, copia: e.copia, coincide: e.coincide }
}
