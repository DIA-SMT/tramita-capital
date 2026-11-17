// Recorrido del agente entre su casa y el trabajo (campo `recorrido` del formulario, cambio de domicilio).
// El valor del campo es un resumen legible, que va a la presentación firmada; los puntos van aparte, en
// `<clave>_geo` (JSON de [latitud, longitud]), y las calles que escribe el agente, en `<clave>_calles`.

export type Punto = [lat: number, lng: number]

/** Tope de puntos: el JSON tiene que entrar en un dato del formulario (4000 caracteres). */
export const MAX_PUNTOS = 120

/** Centro de San Miguel de Tucumán (plaza Independencia), donde abre el mapa vacío. */
export const CENTRO_SMT: Punto = [-26.83035, -65.20381]

const valido = (p: unknown): p is Punto =>
  Array.isArray(p) && p.length === 2 && p.every((n) => typeof n === "number" && Number.isFinite(n)) && Math.abs(p[0]) <= 90 && Math.abs(p[1]) <= 180

/** Puntos guardados en el expediente; si el dato no es válido, ninguno. */
export function leerPuntos(json: string | null | undefined): Punto[] {
  if (!json) return []
  try {
    const v: unknown = JSON.parse(json)
    return Array.isArray(v) ? v.filter(valido).slice(0, MAX_PUNTOS) : []
  } catch {
    return []
  }
}

/** Cinco decimales: alrededor de un metro, y el JSON queda corto. */
const redondear = (n: number) => Math.round(n * 1e5) / 1e5

export function guardarPuntos(puntos: Punto[]): string {
  return JSON.stringify(puntos.slice(0, MAX_PUNTOS).map(([lat, lng]) => [redondear(lat), redondear(lng)]))
}

/** Distancia del recorrido en kilómetros (suma de tramos, fórmula del haversine). */
export function distanciaKm(puntos: Punto[]): number {
  const R = 6371
  const rad = (g: number) => (g * Math.PI) / 180
  let total = 0
  for (let i = 1; i < puntos.length; i++) {
    const [a, b] = [puntos[i - 1], puntos[i]]
    const dLat = rad(b[0] - a[0])
    const dLng = rad(b[1] - a[1])
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2
    total += 2 * R * Math.asin(Math.sqrt(h))
  }
  return total
}

const km = (n: number) => `${n.toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`

/**
 * Resumen que queda en la presentación. Vacío si no hay recorrido (ni dos puntos ni calles), así el campo
 * obligatorio no se da por completo.
 */
export function resumenRecorrido(puntos: Punto[], calles = ""): string {
  const texto = calles.trim()
  const partes: string[] = []
  if (puntos.length >= 2) partes.push(`Marcado en el mapa: ${km(distanciaKm(puntos))}, ${puntos.length} puntos, de la casa al trabajo.`)
  if (texto) partes.push(`Calles: ${texto}`)
  return partes.join(" ")
}
