// Novedades de haberes: lo que una resolución firmada manda impactar en la liquidación.
// Propuesta precargada para Bonificaciones, texto de la foja y planilla para Civitas.
import type { Json } from "@/lib/database.types"
import { fechaCorta, leerDatos, leerFormulario } from "@/lib/dominio"

export type Movimiento = "alta" | "baja" | "modificacion"
export type EstadoNovedad = "pendiente" | "cargada" | "anulada"

export const MOVIMIENTOS: Record<Movimiento, string> = { alta: "Alta", baja: "Baja", modificacion: "Modificación" }
const MOVIMIENTO_TEXTO: Record<Movimiento, string> = { alta: "el alta", baja: "la baja", modificacion: "la modificación" }

export const ESTADOS_NOVEDAD: Record<EstadoNovedad, { etiqueta: string; clase: string }> = {
  pendiente: { etiqueta: "Pendiente de carga", clase: "bg-amber-500/15 text-amber-800 dark:text-amber-300" },
  cargada: { etiqueta: "Cargada en Civitas", clase: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  anulada: { etiqueta: "Anulada", clase: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400" },
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]

/** Fecha sin hora ("2026-10-07") o con hora: dd/mm/aaaa sin correrse de día por la zona horaria. */
export function fechaSimple(fecha: string) {
  const dia = fecha.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return dia ? `${dia[3]}/${dia[2]}/${dia[1]}` : fechaCorta(fecha)
}

/** "2026-08-01" o "2026-08" → "08/2026". */
export function periodo(fecha: string) {
  const [anio, mes] = fecha.split("-")
  return `${mes}/${anio}`
}

/** Nombre del período: "2026-08" → "agosto de 2026". */
export function periodoLargo(fecha: string) {
  const [anio, mes] = fecha.split("-")
  return `${MESES[Number(mes) - 1]} de ${anio}`
}

/**
 * Período (AAAA-MM) desde el que rige, leído de la resolución:
 * "a partir de agosto de 2026", "a partir de 08/2026" o "a partir del 01/08/2026".
 */
export function vigenciaDeResolucion(texto: string): string | null {
  const t = texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
  const conMes = t.match(/a partir (?:del? )?(?:mes de |periodo )?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?: de| del)? (?:ano )?(\d{4})/)
  if (conMes) {
    const mes = MESES.indexOf(conMes[1] === "setiembre" ? "septiembre" : conMes[1]) + 1
    return `${conMes[2]}-${String(mes).padStart(2, "0")}`
  }
  const conFecha = t.match(/a partir del? (?:(\d{1,2})[/.-])?(\d{1,2})[/.-](\d{4})/)
  if (conFecha) return `${conFecha[3]}-${conFecha[2].padStart(2, "0")}`
  return null
}

export type PropuestaNovedad = {
  agente: string
  legajo: string | null
  concepto: string
  codigo: string
  movimiento: Movimiento
  /** AAAA-MM */
  vigencia: string
  /** Si el período salió del texto de la resolución (si no, es el mes de la firma). */
  vigenciaLeida: boolean
  detalle: Record<string, string>
  resolucion: { numero: string | null; fecha: string | null } | null
}

type EntradaPropuesta = {
  expediente: { datos: Json }
  tipo: { codigo: string; nombre: string; formulario: Json }
  fojas: { tipo: string; titulo: string; contenido: string | null; firmada_at: string | null; datos: Json }[]
}

function numeroProtocolo(f: EntradaPropuesta["fojas"][number]) {
  const d = f.datos
  if (d && typeof d === "object" && !Array.isArray(d)) {
    const p = d.protocolo
    if (p && typeof p === "object" && !Array.isArray(p) && typeof p.numero === "string") return p.numero
  }
  return f.titulo.match(/N\.º\s*(\S+)/)?.[1] ?? null
}

/** Lo que el sistema propone registrar, a partir de la resolución firmada y del formulario. */
export function propuestaNovedad(d: EntradaPropuesta, agente: { nombre: string; apellido: string; legajo: string | null } | null): PropuestaNovedad {
  const resolucion = d.fojas.findLast((f) => f.tipo === "resolucion" && f.firmada_at)
  const valores = leerDatos(d.expediente.datos)
  const detalle = Object.fromEntries(
    leerFormulario(d.tipo.formulario)
      .filter((c) => valores[c.clave])
      .map((c) => [c.etiqueta, c.tipo === "fecha" && /^\d{4}-\d{2}-\d{2}$/.test(valores[c.clave]) ? fechaCorta(`${valores[c.clave]}T12:00:00`) : valores[c.clave]]),
  )
  const leida = resolucion?.contenido ? vigenciaDeResolucion(resolucion.contenido) : null
  return {
    agente: agente ? `${agente.nombre} ${agente.apellido}`.trim() : "",
    legajo: agente?.legajo ?? null,
    concepto: d.tipo.nombre,
    codigo: d.tipo.codigo,
    movimiento: d.tipo.codigo.startsWith("BAJA") || /^baja/i.test(d.tipo.nombre) ? "baja" : "alta",
    vigencia: leida ?? (resolucion?.firmada_at ?? new Date().toISOString()).slice(0, 7),
    vigenciaLeida: leida !== null,
    detalle,
    resolucion: resolucion ? { numero: numeroProtocolo(resolucion), fecha: resolucion.firmada_at } : null,
  }
}

/** Texto de la foja "Novedad a Liquidación de Haberes". */
export function textoNovedad(p: PropuestaNovedad, movimiento: Movimiento, desde: string, hasta?: string | null, observaciones?: string) {
  const resolucion = p.resolucion?.numero
    ? `la Resolución N.º ${p.resolucion.numero}${p.resolucion.fecha ? ` del ${fechaCorta(p.resolucion.fecha)}` : ""}`
    : "la resolución firmada en este expediente"
  const detalle = Object.entries(p.detalle).map(([k, v]) => `- ${k}: ${v}`)
  return [
    `Se comunica a Liquidación de Haberes ${resolucion}, que dispone ${MOVIMIENTO_TEXTO[movimiento]} de ${p.concepto.charAt(0).toLowerCase()}${p.concepto.slice(1)} del/de la agente ${p.agente}${p.legajo ? `, legajo N.º ${p.legajo}` : ""}, a partir del período ${periodo(desde)}${hasta ? ` y hasta el período ${periodo(hasta)}` : ""}.`,
    detalle.length ? `Datos de la novedad:\n${detalle.join("\n")}` : null,
    observaciones?.trim() ? `Observaciones: ${observaciones.trim()}` : null,
    "Se solicita su impacto en la liquidación de haberes y su registro en Civitas.",
    "Pase para su conocimiento y efectos.",
  ]
    .filter(Boolean)
    .join("\n\n")
}

// ---------------------------------------------------------------------
// Planilla para Civitas
// ---------------------------------------------------------------------
export type FilaNovedad = {
  id: string
  estado: EstadoNovedad
  movimiento: Movimiento
  concepto: string
  codigo: string
  vigenciaDesde: string
  vigenciaHasta: string | null
  detalle: Record<string, string>
  observaciones: string | null
  agente: string
  legajo: string | null
  cuil: string | null
  /** id null: expediente que esta persona no puede abrir (o de la demo). */
  expediente: { id: string | null; numero: string }
  resolucion: { numero: string | null; fecha: string | null }
  registradaAt: string
  cargadaAt: string | null
  referencia: string | null
}

/** Detalle guardado en la base (jsonb) como pares etiqueta → valor. */
export function leerDetalle(valor: Json): Record<string, string> {
  return leerDatos(valor)
}

// Columnas provisorias: se ajustan al formato de importación de Civitas cuando lo tengamos.
const COLUMNAS = [
  "Legajo",
  "CUIL",
  "Apellido y nombre",
  "Movimiento",
  "Concepto",
  "Código de trámite",
  "Período desde",
  "Período hasta",
  "Detalle",
  "Resolución",
  "Fecha de resolución",
  "Expediente",
  "Estado",
  "Registrada",
  "Cargada en Civitas",
  "Referencia de carga",
]

/** Valor seguro para una celda: sin saltos de línea ni fórmulas (inyección en planillas). */
function celda(valor: string | null | undefined) {
  let s = (valor ?? "").replace(/\r?\n/g, " ").trim()
  if (/^[=+\-@\t]/.test(s)) s = `'${s}`
  return /[";]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
}

/** CSV con separador ";" y BOM, como lo abre Excel en español. */
export function planillaCSV(filas: FilaNovedad[]) {
  const lineas = filas.map((f) =>
    [
      f.legajo,
      f.cuil,
      f.agente,
      MOVIMIENTOS[f.movimiento],
      f.concepto,
      f.codigo,
      periodo(f.vigenciaDesde),
      f.vigenciaHasta ? periodo(f.vigenciaHasta) : "",
      Object.entries(f.detalle)
        .map(([k, v]) => `${k}: ${v}`)
        .join(" · "),
      f.resolucion.numero,
      f.resolucion.fecha ? fechaSimple(f.resolucion.fecha) : "",
      f.expediente.numero,
      ESTADOS_NOVEDAD[f.estado].etiqueta,
      fechaCorta(f.registradaAt),
      f.cargadaAt ? fechaCorta(f.cargadaAt) : "",
      f.referencia,
    ]
      .map(celda)
      .join(";"),
  )
  return `﻿${[COLUMNAS.join(";"), ...lineas].join("\r\n")}\r\n`
}
