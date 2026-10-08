// Firma de las fojas: lo que el sistema deja en actuaciones.datos.firma al firmar.
// Todo el sello queda dentro del hash SHA-256 encadenado de la foja.
import type { Json } from "@/lib/database.types"

export type SelloFirma = {
  /** registrada: firma manuscrita registrada + clave personal. electronica: sesión del usuario. */
  tipo: "registrada" | "electronica"
  aclaracion: string | null
  cargo: string | null
  registroId: string | null
  imagenSha256: string | null
}

export function leerSello(datos: Json | null | undefined): SelloFirma | null {
  if (!datos || typeof datos !== "object" || Array.isArray(datos)) return null
  const f = datos.firma
  if (!f || typeof f !== "object" || Array.isArray(f)) return null
  const texto = (v: Json | undefined) => (typeof v === "string" && v.trim() ? v : null)
  return {
    tipo: f.tipo === "registrada" ? "registrada" : "electronica",
    aclaracion: texto(f.aclaracion),
    cargo: texto(f.cargo),
    registroId: texto(f.registro_id),
    imagenSha256: texto(f.imagen_sha256),
  }
}

export function leerProtocolo(datos: Json | null | undefined): { numero: string; fecha: string } | null {
  if (!datos || typeof datos !== "object" || Array.isArray(datos)) return null
  const p = datos.protocolo
  if (!p || typeof p !== "object" || Array.isArray(p)) return null
  return typeof p.numero === "string" && typeof p.fecha === "string" ? { numero: p.numero, fecha: p.fecha } : null
}

/** Código de verificación impreso en la copia: los primeros 20 caracteres del hash (80 bits). */
export const codigoVerificacion = (hash: string) => hash.slice(0, 20)

/** Formato legible del código: 5 grupos de 4. */
export const codigoLegible = (codigo: string) => codigo.toUpperCase().match(/.{1,4}/g)?.join("-") ?? codigo

/** Documentos de fondo: llevan la firma registrada del funcionario cuando la tiene. */
export const DOCUMENTOS_CON_FIRMA_REGISTRADA = ["resolucion", "dictamen"] as const

export const CLAVE_FIRMA = /^\d{6}$/
