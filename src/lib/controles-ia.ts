import * as z from "zod/v4"

/**
 * Controles con IA: el cotejo de la documentación y la segunda lectura del proyecto de resolución.
 * La IA no decide ni firma: señala lo que una persona tiene que mirar. Cada control queda en
 * `ia_generaciones` (tipo `cotejo` o `revision`) con el resultado en JSON, para que lo vea el resto del área.
 */

// ---------------------------------------------------------------------
// Cotejo de la documentación
// ---------------------------------------------------------------------
export const EsquemaCotejo = z.object({
  semaforo: z.enum(["verde", "amarillo", "rojo"]),
  conclusion: z.string(),
  documentos: z.array(
    z.object({
      documento: z.string(),
      requisito: z.string(),
      tipo_detectado: z.string(),
      corresponde: z.enum(["si", "no", "dudoso"]),
      legible: z.boolean(),
      cotejos: z.array(
        z.object({
          dato: z.string(),
          declarado: z.string(),
          en_documento: z.string(),
          resultado: z.enum(["coincide", "difiere", "no_figura"]),
        }),
      ),
      alertas: z.array(z.string()),
    }),
  ),
})
export type Cotejo = z.infer<typeof EsquemaCotejo>

// ---------------------------------------------------------------------
// Segunda lectura del proyecto
// ---------------------------------------------------------------------
/** Lo que se revisa del proyecto, siempre en este orden. */
export const ASPECTOS_REVISION = [
  "Agente",
  "Lo pedido y lo resuelto",
  "Coherencia con el dictamen",
  "Fechas y período",
  "Fojas citadas",
  "Normativa",
  "Datos sin completar",
  "Redacción",
] as const

export const EsquemaRevision = z.object({
  veredicto: z.enum(["lista", "revisar", "corregir"]),
  resumen: z.string(),
  chequeos: z.array(
    z.object({
      aspecto: z.string(),
      resultado: z.enum(["ok", "atencion", "error"]),
      detalle: z.string(),
    }),
  ),
})
export type Revision = z.infer<typeof EsquemaRevision>

/** Marcadores que se completan solos al firmar: no cuentan como datos faltantes. */
const AL_FIRMAR = new Set(["numero_resolucion", "fecha_resolucion"])

/** Lo que quedó sin completar en un texto: «[COMPLETAR…]» y variables del modelo sin reemplazar. */
export function pendientesEnTexto(texto: string): string[] {
  const encontrados = new Set<string>()
  for (const m of texto.matchAll(/\[COMPLETAR[^\]]*\]/gi)) encontrados.add(m[0])
  for (const m of texto.matchAll(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi)) if (!AL_FIRMAR.has(m[1].toLowerCase())) encontrados.add(m[0])
  return [...encontrados]
}

/** Lo que encuentra el control fijo pisa lo que dijo la IA sobre los datos sin completar; el veredicto se recalcula. */
export function combinarRevision(revision: Revision, pendientes: string[]): Revision {
  const chequeos = revision.chequeos.map((c) =>
    c.aspecto === "Datos sin completar" && pendientes.length > 0
      ? { ...c, resultado: "error" as const, detalle: `Quedan sin completar: ${pendientes.join(", ")}.` }
      : c,
  )
  if (pendientes.length > 0 && !chequeos.some((c) => c.aspecto === "Datos sin completar")) {
    chequeos.push({ aspecto: "Datos sin completar", resultado: "error", detalle: `Quedan sin completar: ${pendientes.join(", ")}.` })
  }
  const veredicto = chequeos.some((c) => c.resultado === "error")
    ? "corregir"
    : chequeos.some((c) => c.resultado === "atencion")
      ? "revisar"
      : revision.veredicto === "corregir"
        ? "revisar"
        : revision.veredicto
  return { ...revision, veredicto, chequeos }
}

// ---------------------------------------------------------------------
// Lo guardado
// ---------------------------------------------------------------------
/**
 * Lo que se guarda en `ia_generaciones.resultado`: el control y la `base` sobre la que se hizo (los documentos
 * cotejados o el proyecto con su versión), para avisar cuando cambió y conviene volver a correrlo.
 */
export type ControlGuardado =
  | { tipo: "cotejo"; cotejo: Cotejo; base: string[] }
  | { tipo: "revision"; revision: Revision; base: string[] }

export type ControlIA = ControlGuardado & { at: string; por: string | null }

const Guardado = z.union([
  z.object({ tipo: z.literal("cotejo"), cotejo: EsquemaCotejo, base: z.array(z.string()) }),
  z.object({ tipo: z.literal("revision"), revision: EsquemaRevision, base: z.array(z.string()) }),
])

export function leerControlGuardado(texto: string | null | undefined): ControlGuardado | null {
  if (!texto) return null
  try {
    const r = Guardado.safeParse(JSON.parse(texto))
    return r.success ? r.data : null
  } catch {
    return null
  }
}

/** Base de un proyecto: cambia cada vez que se edita el borrador. */
export const baseProyecto = (p: { id: string; updated_at: string | null; created_at: string }) => `${p.id}@${p.updated_at ?? p.created_at}`

/** El control se hizo sobre otra base (documentos nuevos o el proyecto editado). */
export function desactualizado(guardado: { base: string[] } | null | undefined, actual: string[]) {
  if (!guardado) return false
  const a = new Set(guardado.base)
  return actual.length !== a.size || actual.some((x) => !a.has(x))
}
