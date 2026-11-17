// Certificado de trabajo automático (migración 001900): lo emite el sistema con la firma que la Dirección
// autorizó en "Mi firma". Sale al pedirlo si el perfil confirma «Liquida SÍ» con un dato reciente; si no,
// lo emite el Departamento de Registro después de controlar en Civitas.
import type { Json } from "@/lib/database.types"

/** Días que vale el dato «Liquida SÍ» (igual que vigencia_dato_liquida() en la base). */
export const VIGENCIA_DATO_LIQUIDA = 31

export type MotivoSinEmitir = "autorizacion" | "liquida" | "datos"

export type Emision = { emitido: true; actuacionId: string; numero: string | null } | { emitido: false; motivo: MotivoSinEmitir }

/** Lee lo que devuelve emitir_certificado. */
export function leerEmision(v: Json | null | undefined): Emision | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null
  if (v.emitido === true && typeof v.actuacion_id === "string") {
    return { emitido: true, actuacionId: v.actuacion_id, numero: typeof v.numero === "string" ? v.numero : null }
  }
  if (v.emitido === false && (v.motivo === "autorizacion" || v.motivo === "liquida" || v.motivo === "datos")) return { emitido: false, motivo: v.motivo }
  return null
}

/** Por qué no salió al instante, dicho al/a la agente. */
export const MOTIVO_AGENTE: Record<MotivoSinEmitir, string> = {
  liquida: "El Departamento de Registro confirma en Civitas que estás activo/a y lo emite.",
  autorizacion: "El Departamento de Registro lo emite en cuanto la Dirección habilite la firma de los certificados.",
  datos: "El Departamento de Registro completa tus datos y lo emite.",
}

/** Autorización vigente de la emisión automática de un trámite (emision_automatica_autorizada). */
export type AutorizacionEmision = { autorizada: false } | { autorizada: true; aclaracion: string; cargo: string; desde: string; propia: boolean }

export function leerAutorizacion(v: Json | null | undefined): AutorizacionEmision {
  if (!v || typeof v !== "object" || Array.isArray(v) || v.autorizada !== true) return { autorizada: false }
  const texto = (x: Json | undefined) => (typeof x === "string" ? x : "")
  return { autorizada: true, aclaracion: texto(v.aclaracion), cargo: texto(v.cargo), desde: texto(v.desde), propia: v.propia === true }
}

/** ¿El dato «Liquida SÍ» del perfil alcanza para emitir sin control? (misma regla que la base). */
export function liquidaVigente(liquida: boolean | null, liquidaAl: string | null, hoy = new Date()): boolean {
  if (liquida !== true || !liquidaAl) return false
  const dias = (hoy.getTime() - new Date(`${liquidaAl}T12:00:00`).getTime()) / 86_400_000
  return dias <= VIGENCIA_DATO_LIQUIDA + 0.5
}

/** Lo que Registro ve al emitir: los datos del perfil que van al certificado. */
export type DatosCertificado = {
  agente: string
  legajo: string | null
  cuil: string | null
  dependencia: string | null
  reparticion: string | null
  categoria: string | null
  /** AAAA-MM-DD */
  fechaIngreso: string | null
  situacionRevista: string | null
  liquida: boolean | null
  liquidaAl: string | null
  presentarAnte: string | null
  autorizacion: AutorizacionEmision
}
