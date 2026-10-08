import { formatDistanceToNowStrict, format, differenceInHours } from "date-fns"
import { es } from "date-fns/locale"
import type { Enum, Json } from "@/lib/database.types"

// ---------------------------------------------------------------------
// Parametrización de trámites
// ---------------------------------------------------------------------
export type TipoCampo = "texto" | "texto_largo" | "numero" | "fecha" | "seleccion"

export type CampoFormulario = {
  clave: string
  etiqueta: string
  tipo: TipoCampo
  obligatorio?: boolean
  opciones?: string[]
  ayuda?: string
}

export type Requisito = {
  clave: string
  nombre: string
  descripcion?: string
  obligatorio?: boolean
}

function esObjeto(v: Json): v is { [k: string]: Json | undefined } {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

export function leerFormulario(valor: Json): CampoFormulario[] {
  if (!Array.isArray(valor)) return []
  return valor.filter(esObjeto).map((c) => ({
    clave: String(c.clave ?? ""),
    etiqueta: String(c.etiqueta ?? c.clave ?? ""),
    tipo: (["texto", "texto_largo", "numero", "fecha", "seleccion"].includes(String(c.tipo)) ? c.tipo : "texto") as TipoCampo,
    obligatorio: c.obligatorio === true,
    opciones: Array.isArray(c.opciones) ? c.opciones.map(String) : undefined,
    ayuda: typeof c.ayuda === "string" ? c.ayuda : undefined,
  }))
}

export function leerRequisitos(valor: Json): Requisito[] {
  if (!Array.isArray(valor)) return []
  return valor.filter(esObjeto).map((r) => ({
    clave: String(r.clave ?? ""),
    nombre: String(r.nombre ?? r.clave ?? ""),
    descripcion: typeof r.descripcion === "string" ? r.descripcion : undefined,
    obligatorio: r.obligatorio === true,
  }))
}

export function leerDatos(valor: Json): Record<string, string> {
  if (!esObjeto(valor)) return {}
  return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, v == null ? "" : String(v)]))
}

// ---------------------------------------------------------------------
// Etiquetas y estilos
// ---------------------------------------------------------------------
export const ESTADOS: Record<Enum<"estado_expediente">, { etiqueta: string; clase: string; punto: string }> = {
  iniciado:   { etiqueta: "Iniciado",    clase: "bg-sky-500/10 text-sky-700 dark:text-sky-300",            punto: "bg-sky-500" },
  en_tramite: { etiqueta: "En trámite",  clase: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",   punto: "bg-indigo-500" },
  observado:  { etiqueta: "Observado",   clase: "bg-amber-500/15 text-amber-800 dark:text-amber-300",      punto: "bg-amber-500" },
  resuelto:   { etiqueta: "Resuelto",    clase: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", punto: "bg-emerald-500" },
  archivado:  { etiqueta: "Archivado",   clase: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",         punto: "bg-zinc-400" },
  rechazado:  { etiqueta: "Rechazado",   clase: "bg-rose-500/10 text-rose-700 dark:text-rose-300",         punto: "bg-rose-500" },
}

export const PRIORIDADES: Record<Enum<"prioridad_expediente">, { etiqueta: string; clase: string; orden: number }> = {
  urgente: { etiqueta: "Urgente", clase: "bg-rose-600 text-white",                                     orden: 0 },
  alta:    { etiqueta: "Alta",    clase: "bg-orange-500/15 text-orange-700 dark:text-orange-300",       orden: 1 },
  normal:  { etiqueta: "Normal",  clase: "bg-muted text-muted-foreground",                              orden: 2 },
  baja:    { etiqueta: "Baja",    clase: "bg-muted/60 text-muted-foreground",                           orden: 3 },
}

export const TIPOS_ACTUACION: Record<Enum<"tipo_actuacion">, string> = {
  presentacion: "Presentación",
  documento: "Documento",
  providencia: "Providencia",
  informe: "Informe",
  dictamen: "Dictamen",
  resolucion: "Resolución",
  notificacion: "Notificación",
  observacion: "Observación",
  subsanacion: "Subsanación",
  pase: "Pase",
  nota: "Nota",
}

export const ROLES: Record<Enum<"rol_area">, string> = {
  operador: "Operador/a",
  dictaminante: "Dictaminante",
  firmante: "Firmante",
  jefe: "Jefe/a de área",
}

export const ESTADOS_ACTIVOS: Enum<"estado_expediente">[] = ["iniciado", "en_tramite", "observado"]

/**
 * Estado simple y comprensible para el agente (especificación del relevamiento):
 * iniciado, pendiente de documentación, en revisión, en Asesoría Legal, en Fiscalía,
 * pendiente de firma, aprobado, rechazado, en reconsideración y finalizado.
 * Internamente se conserva la oficina exacta.
 */
export type EstadoVisible = { etiqueta: string; tono: "neutro" | "progreso" | "alerta" | "exito" | "error" }

export function estadoVisible(e: {
  estado: Enum<"estado_expediente">
  resultado?: string | null
  instancia?: number | null
  areaCodigo?: string | null
  accionPaso?: Enum<"accion_paso"> | null
}): EstadoVisible {
  if (e.estado === "observado") return { etiqueta: "Pendiente de documentación", tono: "alerta" }
  if (e.estado === "rechazado" || e.resultado === "rechazado") {
    return e.estado === "archivado" ? { etiqueta: "Finalizado · rechazado", tono: "error" } : { etiqueta: "Rechazado", tono: "error" }
  }
  if (e.estado === "archivado") return { etiqueta: "Finalizado", tono: "exito" }
  if (e.estado === "resuelto") return { etiqueta: "Aprobado", tono: "exito" }
  if ((e.instancia ?? 0) > 0) return { etiqueta: "En reconsideración", tono: "progreso" }
  if (e.estado === "iniciado") return { etiqueta: "Iniciado", tono: "neutro" }
  if (e.areaCodigo === "DICT") return { etiqueta: "En Asesoría Legal", tono: "progreso" }
  if (e.areaCodigo === "FISC") return { etiqueta: "En Fiscalía", tono: "progreso" }
  if (e.accionPaso === "firma") return { etiqueta: "Pendiente de firma", tono: "progreso" }
  return { etiqueta: "En revisión", tono: "progreso" }
}

// ---------------------------------------------------------------------
// Fechas y plazos
// ---------------------------------------------------------------------
export function haceCuanto(fecha: string | Date) {
  return formatDistanceToNowStrict(new Date(fecha), { locale: es, addSuffix: true })
}

export function fechaCorta(fecha: string | Date) {
  return format(new Date(fecha), "dd/MM/yyyy", { locale: es })
}

export function fechaHora(fecha: string | Date) {
  return format(new Date(fecha), "dd/MM/yyyy HH:mm", { locale: es })
}

export type Semaforo = "verde" | "amarillo" | "rojo" | "sin_plazo"

/** Semáforo de vencimiento: rojo vencido, amarillo < 24 h, verde en plazo. */
export function semaforo(venceAt: string | null, estado: Enum<"estado_expediente">): Semaforo {
  if (!venceAt || !ESTADOS_ACTIVOS.includes(estado)) return "sin_plazo"
  const horas = differenceInHours(new Date(venceAt), new Date())
  if (horas < 0) return "rojo"
  if (horas < 24) return "amarillo"
  return "verde"
}

export function nombreCompleto(p?: { nombre: string; apellido: string } | null) {
  if (!p) return "—"
  return `${p.nombre} ${p.apellido}`.trim() || "—"
}

export function iniciales(p?: { nombre: string; apellido: string } | null) {
  if (!p) return "?"
  return `${p.nombre.at(0) ?? ""}${p.apellido.at(0) ?? ""}`.toUpperCase() || "?"
}
