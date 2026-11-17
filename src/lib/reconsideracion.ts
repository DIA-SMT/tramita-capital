// Recurso de reconsideración (migración 001700): el plazo de un trámite resuelto y el vínculo entre el recurso y el
// expediente recurrido. El cálculo del plazo lo hace la base (plazo_reconsideracion); acá solo se lee.
import type { Json } from "@/lib/database.types"

const esObjeto = (v: Json | null | undefined): v is { [k: string]: Json } => typeof v === "object" && v !== null && !Array.isArray(v)

export type RecursoResumen = {
  id: string
  numero: string
  estado: string
  resultado: "aprobado" | "rechazado" | null
}

export type PlazoReconsideracion = {
  /** Día de la notificación (la firma de la resolución). */
  notificacion: string
  /** 8.º día hábil desde la notificación. */
  ultimoDia: string
  /** Límite con el plazo extraordinario del art. 25 de la OPA (las 2 primeras horas del día hábil siguiente). */
  limite: string
  vigente: boolean
  /** El recurso, si ya se pidió. */
  recurso: RecursoResumen | null
}

/** Lo que devuelve plazo_reconsideracion; null si el trámite no la admite o todavía no tiene resolución. */
export function leerPlazo(valor: Json | null | undefined): PlazoReconsideracion | null {
  if (!esObjeto(valor)) return null
  const v = valor
  if (typeof v.ultimo_dia !== "string" || typeof v.limite !== "string") return null
  const r = esObjeto(v.recurso) ? v.recurso : null
  return {
    notificacion: String(v.notificacion ?? ""),
    ultimoDia: v.ultimo_dia,
    limite: v.limite,
    vigente: v.vigente === true,
    recurso:
      r && typeof r.id === "string"
        ? {
            id: r.id,
            numero: String(r.numero ?? ""),
            estado: String(r.estado ?? ""),
            resultado: r.resultado === "aprobado" || r.resultado === "rechazado" ? r.resultado : null,
          }
        : null,
  }
}

/** El expediente cuya resolución se recurre, visto desde el recurso. */
export type OrigenRecurso = {
  /** null si quien mira no puede abrirlo. */
  id: string | null
  numero: string
  tramite: string
  resolucion: { fojaId: string | null; numero: string | null; sentido: "hace_lugar" | "rechaza" | null } | null
}

/** Una fecha "AAAA-MM-DD" como "dd/mm/aaaa", sin correrla por la zona horaria. */
export function fechaDia(iso: string) {
  const [a, m, d] = iso.slice(0, 10).split("-")
  return d && m && a ? `${d}/${m}/${a}` : iso
}
