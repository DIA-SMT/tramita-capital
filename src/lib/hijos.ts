// Campo "hijos" del formulario (migración 001800): uno o más hijos/as en el mismo expediente. El valor del campo es
// un resumen legible, que va a la presentación firmada; la lista va aparte, en `<clave>_lista` (JSON).

export type Hijo = { nombre: string; dni: string; nacimiento: string }

/** Tope: un pedido razonable, y que el JSON entre en un dato del formulario (4000 caracteres). */
export const MAX_HIJOS = 12

const texto = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, 120) : "")

/** La lista guardada; si no es válida, vacía. */
export function leerHijos(json: string | null | undefined): Hijo[] {
  if (!json) return []
  try {
    const v: unknown = JSON.parse(json)
    if (!Array.isArray(v)) return []
    return v
      .filter((h): h is Record<string, unknown> => typeof h === "object" && h !== null)
      .map((h) => ({ nombre: texto(h.nombre), dni: texto(h.dni), nacimiento: texto(h.nacimiento) }))
      .slice(0, MAX_HIJOS)
  } catch {
    return []
  }
}

export function guardarHijos(hijos: Hijo[]): string {
  return JSON.stringify(hijos.slice(0, MAX_HIJOS).map((h) => ({ nombre: h.nombre.trim(), dni: h.dni.trim(), nacimiento: h.nacimiento })))
}

export const hijoCompleto = (h: Hijo) => Boolean(h.nombre.trim() && h.dni.trim() && /^\d{4}-\d{2}-\d{2}$/.test(h.nacimiento))
export const hijoVacio = (h: Hijo) => !h.nombre.trim() && !h.dni.trim() && !h.nacimiento

/** Solo los dígitos del DNI: identifica la línea de la novedad de cada hijo/a. */
export const dniDigitos = (dni: string) => dni.replace(/\D/g, "")

const fecha = (iso: string) => {
  const [a, m, d] = iso.split("-")
  return d && m && a ? `${d}/${m}/${a}` : iso
}

/**
 * Resumen que queda en la presentación: cada hijo/a con su DNI y fecha de nacimiento. Vacío si falta un dato de
 * alguno (así el campo obligatorio no se da por completo).
 */
export function resumenHijos(hijos: Hijo[]): string {
  const cargados = hijos.filter((h) => !hijoVacio(h))
  if (cargados.length === 0 || !cargados.every(hijoCompleto)) return ""
  return cargados.map((h) => `${h.nombre.trim()}, DNI ${h.dni.trim()}, nacido/a el ${fecha(h.nacimiento)}`).join("; ")
}
