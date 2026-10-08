// Firma de las fojas: lo que el sistema deja en actuaciones.datos.firma al firmar.
// Todo el sello queda dentro del hash SHA-256 encadenado de la foja.
import type { Json } from "@/lib/database.types"
import type { FirmaVisible } from "@/lib/firma-trazo"

export type SelloFirma = {
  /** olografa: firma dibujada en el acto, verificada contra la registrada, más clave (resoluciones). electronica: sesión del usuario. */
  tipo: "olografa" | "electronica"
  aclaracion: string | null
  cargo: string | null
  registroId: string | null
  /** Trazo verificado que se estampa (firma biométrica, versión 2). Las anteriores usaban una imagen. */
  visible: FirmaVisible | null
  tinta: string | null
}

/** Valida el trazo visible guardado en el sello (viene de la base, pero se lee con cuidado). */
export function leerVisible(v: Json | undefined): FirmaVisible | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null
  const { ancho, trazos } = v
  if (typeof ancho !== "number" || !Array.isArray(trazos)) return null
  const limpios = trazos.filter((t): t is number[] => Array.isArray(t) && t.length % 2 === 0 && t.every((n) => typeof n === "number"))
  return limpios.length > 0 && limpios.length === trazos.length ? { ancho, trazos: limpios } : null
}

export function leerSello(datos: Json | null | undefined): SelloFirma | null {
  if (!datos || typeof datos !== "object" || Array.isArray(datos)) return null
  const f = datos.firma
  if (!f || typeof f !== "object" || Array.isArray(f)) return null
  const texto = (v: Json | undefined) => (typeof v === "string" && v.trim() ? v : null)
  return {
    tipo: f.tipo === "olografa" || f.tipo === "registrada" ? "olografa" : "electronica",
    aclaracion: texto(f.aclaracion),
    cargo: texto(f.cargo),
    registroId: texto(f.registro_id),
    visible: leerVisible(f.visible),
    tinta: texto(f.tinta),
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

export const CLAVE_FIRMA = /^\d{6}$/

/** Imagen de una firma estampada con la versión anterior (PNG en el bucket privado). */
export const urlImagenFirma = (fojaId: string, demo?: boolean) => (demo ? "/demo/firma-ejemplo.svg" : `/api/firmas/${fojaId}`)
