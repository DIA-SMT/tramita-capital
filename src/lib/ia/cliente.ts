import "server-only"
import Anthropic from "@anthropic-ai/sdk"

let cliente: Anthropic | undefined

/** Cliente de Claude. Toma las credenciales de ANTHROPIC_API_KEY. */
export function clienteIA() {
  cliente ??= new Anthropic()
  return cliente
}

/** Beta de respaldo del lado del servidor: si el modelo declina, otro modelo continúa. */
export const BETA_RESPALDO = "server-side-fallback-2026-07-01" as const

/** Evita que texto cargado por usuarios cierre o abra etiquetas del prompt. */
export function escaparDatos(texto: string | null | undefined) {
  return (texto ?? "").replaceAll("<", "‹").replaceAll(">", "›")
}
