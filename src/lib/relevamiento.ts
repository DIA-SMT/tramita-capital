// Interpretación de los nombres de documentos del relevamiento (ACTUAL / FINAL DIGITAL)
// para saber, en cada paso, qué ya está en el expediente y cómo se produce lo que falta.
import type { Enum } from "@/lib/database.types"

export const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

export type FormaDeGenerar =
  | { tipo: "ia"; documento: "dictamen" | "resolucion" | "informe" | "nota"; etiqueta: string }
  | { tipo: "adjunto"; clave: string; etiqueta: string; origen: string }
  | { tipo: "firma"; etiqueta: string }
  | { tipo: "automatico"; etiqueta: string }

/** Cómo se produce en el sistema cada documento que el relevamiento dice que "genera" una oficina. */
export function formaDeGenerar(nombre: string): FormaDeGenerar {
  const n = normalizar(nombre)
  if (n.includes("DICTAMEN")) return { tipo: "ia", documento: "dictamen", etiqueta: "Redactar dictamen" }
  if (n.includes("PROTOCOLIZ")) return { tipo: "automatico", etiqueta: "Número y fecha se asignan al firmar" }
  if (n.includes("RESOLUCION FIRMADA")) return { tipo: "firma", etiqueta: "Firmar resolución" }
  if (n.includes("RESOLUCION")) return { tipo: "ia", documento: "resolucion", etiqueta: "Redactar resolución" }
  if (n.includes("FOJA DE SERVICIO")) return { tipo: "adjunto", clave: "foja_servicios", etiqueta: "Adjuntar", origen: "Civitas" }
  if (n.includes("SITUACION DE REVISTA")) return { tipo: "adjunto", clave: "situacion_revista", etiqueta: "Adjuntar", origen: "Civitas" }
  if (n.includes("GRUPO FAMILIAR")) return { tipo: "adjunto", clave: "grupo_familiar", etiqueta: "Adjuntar", origen: "Civitas" }
  if (n.includes("DESGLOSE") || n.includes("NOVEDAD")) return { tipo: "ia", documento: "nota", etiqueta: "Redactar novedad" }
  if (n.startsWith("INFORME")) return { tipo: "ia", documento: "informe", etiqueta: "Redactar informe" }
  if (n.includes("NOTA")) return { tipo: "ia", documento: "nota", etiqueta: "Redactar nota" }
  return { tipo: "adjunto", clave: n.toLowerCase().replace(/ /g, "_").slice(0, 60), etiqueta: "Adjuntar", origen: "la oficina" }
}

type Presente = {
  documentos: { requisito_clave: string | null; nombre_archivo: string }[]
  /** Fojas firmadas y borradores (firmada = false). */
  fojas: { tipo: Enum<"tipo_actuacion">; titulo: string; firmada: boolean }[]
  etiquetasRequisitos: Record<string, string>
}

type Foja = Presente["fojas"][number]

/** Qué foja corresponde a cada documento del relevamiento producido dentro del sistema. */
function fojaDe(n: string): ((f: Foja) => boolean) | null {
  // El formulario en papel se reemplaza por la presentación digital del agente.
  if (n === "FORMULARIO" || n.startsWith("FORMULARIO ") || n.includes("SOLICITUD")) return (f) => f.tipo === "presentacion"
  if (n.includes("RESOLUCION")) return (f) => f.tipo === "resolucion"
  if (n.includes("DICTAMEN")) return (f) => f.tipo === "dictamen"
  if (n.includes("DESGLOSE") || n.includes("NOVEDAD")) return (f) => f.tipo === "nota" && normalizar(f.titulo).includes("LIQUIDACION")
  if (n.startsWith("INFORME")) return (f) => f.tipo === "informe"
  return null
}

function enDocumentos(nombre: string, p: Presente) {
  const n = normalizar(nombre)
  const forma = formaDeGenerar(nombre)
  const clave = forma.tipo === "adjunto" ? forma.clave : null
  return p.documentos.some((d) => {
    if (clave && d.requisito_clave === clave) return true
    const etiqueta = d.requisito_clave ? normalizar(p.etiquetasRequisitos[d.requisito_clave] ?? d.requisito_clave) : ""
    return etiqueta.length > 0 && (etiqueta.includes(n) || n.includes(etiqueta))
  })
}

/** ¿El documento que el paso debe revisar ya está en el expediente (aunque sea en borrador)? */
export function estaPresente(nombre: string, p: Presente): boolean {
  const cumple = fojaDe(normalizar(nombre))
  return cumple ? p.fojas.some(cumple) : enDocumentos(nombre, p)
}

export type EstadoDocumento = "listo" | "borrador" | "falta"

/**
 * Estado de lo que produce la oficina: firmado o incorporado (listo), en borrador sin firmar,
 * o ausente. El proyecto de resolución cuenta como listo en borrador: lo firma la Dirección.
 */
export function estadoDocumento(nombre: string, p: Presente): EstadoDocumento {
  const n = normalizar(nombre)
  const cumple = fojaDe(n)
  if (!cumple) return enDocumentos(nombre, p) ? "listo" : "falta"
  const hallados = p.fojas.filter(cumple)
  if (hallados.length === 0) return "falta"
  if (n.includes("RESOLUCION") && !n.includes("FIRMADA")) return "listo"
  return hallados.some((f) => f.firmada) ? "listo" : "borrador"
}

/** Nombre legible a partir del texto en mayúsculas del relevamiento. */
export function legible(nombre: string) {
  const s = nombre.trim().toLowerCase()
  return s.charAt(0).toUpperCase() + s.slice(1)
}
