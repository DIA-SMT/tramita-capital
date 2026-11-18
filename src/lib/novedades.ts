// Novedades de haberes: lo que una resolución firmada manda impactar en la liquidación.
// Propuesta precargada para Bonificaciones, texto de la foja y planilla para Civitas.
import type { Json } from "@/lib/database.types"
import { fechaCorta, leerDatos, leerFormulario } from "@/lib/dominio"
import { dniDigitos, hijoCompleto, leerHijos } from "@/lib/hijos"

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

/**
 * Una línea de la novedad (migración 001800): en la asignación por hijo/a, una por cada hijo/a y otra para la familia
 * numerosa, si se pidió; en el nacimiento, además, una mensual por hijo/a si se pidió; en los demás trámites, una sola
 * (item ""). `codigo` es el trámite del concepto. `pagoUnico`: se liquida una sola vez, en el período desde.
 */
export type LineaNovedad = { item: string; codigo: string; concepto: string; detalle: Record<string, string>; pagoUnico?: boolean }

/** Matrimonio y nacimiento son pagos únicos: lo dice su nombre en el catálogo. */
export const esPagoUnico = (concepto: string) => /pago [úu]nico/i.test(concepto)

/** Hasta qué período rige una línea: un pago único, solo el período desde; las demás, el hasta elegido (o abierto). */
export function hastaDeLinea(l: Pick<LineaNovedad, "pagoUnico">, desde: string, hasta: string | null | undefined): string | null {
  return l.pagoUnico ? desde : (hasta ?? null)
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
  /** Las líneas a registrar; una sola en la mayoría de los trámites. */
  lineas: LineaNovedad[]
}

type EntradaPropuesta = {
  expediente: { datos: Json }
  tipo: { codigo: string; nombre: string; formulario: Json }
  fojas: { tipo: string; titulo: string; contenido: string | null; firmada_at: string | null; datos: Json }[]
  /** Altas de otros trámites que se pueden pedir en el mismo expediente (familia numerosa en la asignación por hijo/a). */
  adicionales?: { codigo: string; nombre: string }[]
}

/** Campos del formulario con los que el agente pide también otra asignación en el mismo expediente. */
const CLAVE_FAMILIA_NUMEROSA = "familia_numerosa"
const CLAVE_POR_HIJO = "asignacion_hijo"

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
    lineas: lineasDeNovedad(d, valores, detalle),
  }
}

/**
 * Las líneas: si el formulario tiene hijos/as, una por cada uno (con sus datos); en el nacimiento, otra mensual por
 * cada uno si pidió también la asignación por hijo/a; y la familia numerosa si se pidió. Las altas adicionales van
 * solo si el trámite las admite. Sin hijos/as, una sola línea con todos los datos del formulario.
 */
function lineasDeNovedad(d: EntradaPropuesta, valores: Record<string, string>, detalle: Record<string, string>): LineaNovedad[] {
  const pagoUnico = esPagoUnico(d.tipo.nombre)
  const campos = leerFormulario(d.tipo.formulario)
  const campoHijos = campos.find((c) => c.tipo === "hijos")
  const hijos = campoHijos ? leerHijos(valores[`${campoHijos.clave}_lista`]).filter(hijoCompleto) : []
  if (!campoHijos || hijos.length === 0) return [{ item: "", codigo: d.tipo.codigo, concepto: d.tipo.nombre, detalle, ...(pagoUnico && { pagoUnico }) }]

  // Lo común a todas las líneas: los datos del formulario que no son los hijos/as ni los pedidos de otras asignaciones.
  const propias = new Set([campoHijos.clave, CLAVE_FAMILIA_NUMEROSA, CLAVE_POR_HIJO].map((k) => campos.find((c) => c.clave === k)?.etiqueta))
  const comunes = Object.fromEntries(Object.entries(detalle).filter(([k]) => !propias.has(k)))
  const datosHijo = (h: (typeof hijos)[number]) => ({ "Hijo/a": h.nombre, DNI: h.dni, "Fecha de nacimiento": fechaCorta(`${h.nacimiento}T12:00:00`), ...comunes })
  const clave = (h: (typeof hijos)[number]) => dniDigitos(h.dni) || h.dni

  const lineas: LineaNovedad[] = hijos.map((h) => ({
    item: `hijo:${clave(h)}`,
    codigo: d.tipo.codigo,
    concepto: d.tipo.nombre,
    detalle: datosHijo(h),
    ...(pagoUnico && { pagoUnico }),
  }))
  const porHijo = d.adicionales?.find((a) => a.codigo === "ASIG-HIJO")
  if (porHijo && valores[CLAVE_POR_HIJO] === "Sí") {
    for (const h of hijos) lineas.push({ item: `por_hijo:${clave(h)}`, codigo: porHijo.codigo, concepto: porHijo.nombre, detalle: datosHijo(h) })
  }
  const familiaNumerosa = d.adicionales?.find((a) => a.codigo === "ASIG-FAM-NUM")
  if (familiaNumerosa && valores[CLAVE_FAMILIA_NUMEROSA] === "Sí") {
    lineas.push({
      item: "familia_numerosa",
      codigo: familiaNumerosa.codigo,
      concepto: familiaNumerosa.nombre,
      // Cada dato de la novedad admite 300 caracteres.
      detalle: { "En relación a": hijos.map((h) => `${h.nombre} (DNI ${h.dni})`).join("; ").slice(0, 300), ...comunes },
    })
  }
  return lineas
}

/**
 * La propuesta sin las líneas ya registradas (y no anuladas): si se registró una parte, el resto se puede registrar
 * después. Null si no queda ninguna.
 */
export function sinRegistrar(p: PropuestaNovedad, registradas: { item?: string | null }[]): PropuestaNovedad | null {
  const hechas = new Set(registradas.map((n) => n.item ?? ""))
  const lineas = p.lineas.filter((l) => !hechas.has(l.item))
  // Una novedad de antes de las líneas (item "") cubre todo el expediente.
  if (lineas.length === 0 || hechas.has("")) return null
  return { ...p, lineas }
}

/** Período de la novedad en el texto: un pago único se liquida una sola vez; las demás, desde (y hasta, si hay). */
function textoPeriodo(desde: string, hasta: string | null | undefined, pagoUnico: boolean) {
  return pagoUnico ? `por única vez, en el período ${periodo(desde)}` : `a partir del período ${periodo(desde)}${hasta ? ` y hasta el período ${periodo(hasta)}` : ""}`
}

/** Texto de la foja "Novedad a Liquidación de Haberes". */
export function textoNovedad(p: PropuestaNovedad, movimiento: Movimiento, desde: string, hasta?: string | null, observaciones?: string, pagoUnico = false) {
  const resolucion = p.resolucion?.numero
    ? `la Resolución N.º ${p.resolucion.numero}${p.resolucion.fecha ? ` del ${fechaCorta(p.resolucion.fecha)}` : ""}`
    : "la resolución firmada en este expediente"
  const detalle = Object.entries(p.detalle).map(([k, v]) => `- ${k}: ${v}`)
  return [
    `Se comunica a Liquidación de Haberes ${resolucion}, que dispone ${MOVIMIENTO_TEXTO[movimiento]} de ${p.concepto.charAt(0).toLowerCase()}${p.concepto.slice(1)} del/de la agente ${p.agente}${p.legajo ? `, legajo N.º ${p.legajo}` : ""}, ${textoPeriodo(desde, hasta, pagoUnico)}.`,
    detalle.length ? `Datos de la novedad:\n${detalle.join("\n")}` : null,
    observaciones?.trim() ? `Observaciones: ${observaciones.trim()}` : null,
    "Se solicita su impacto en la liquidación de haberes y su registro en Civitas.",
    "Pase para su conocimiento y efectos.",
  ]
    .filter(Boolean)
    .join("\n\n")
}

/**
 * Texto de la foja con varias líneas (por ejemplo, dos hijos/as y la familia numerosa). Con una sola línea es el
 * mismo texto de siempre.
 */
export function textoNovedades(p: PropuestaNovedad, lineas: LineaNovedad[], movimiento: Movimiento, desde: string, hasta?: string | null, observaciones?: string) {
  if (lineas.length <= 1)
    return textoNovedad({ ...p, concepto: lineas[0]?.concepto ?? p.concepto, detalle: lineas[0]?.detalle ?? p.detalle }, movimiento, desde, hasta, observaciones, !!lineas[0]?.pagoUnico)
  // Con pagos únicos y asignaciones mensuales juntas (nacimiento y por hijo/a), cada pago único dice su período.
  const todasPagoUnico = lineas.every((l) => l.pagoUnico)
  const resolucion = p.resolucion?.numero
    ? `la Resolución N.º ${p.resolucion.numero}${p.resolucion.fecha ? ` del ${fechaCorta(p.resolucion.fecha)}` : ""}`
    : "la resolución firmada en este expediente"
  // Lo que se repite igual en todas las líneas (por ejemplo, el otro progenitor) va una sola vez, al final.
  const comunes = Object.entries(lineas[0].detalle).filter(([k, v]) => lineas.every((l) => l.detalle[k] === v))
  const esComun = new Set(comunes.map(([k]) => k))
  const detalle = lineas.map((l, i) => {
    const datos = Object.entries(l.detalle)
      .filter(([k]) => !esComun.has(k))
      .map(([k, v]) => `${k}: ${v}`)
    const unico = l.pagoUnico && !todasPagoUnico ? `, por única vez en el período ${periodo(desde)}` : ""
    return `${i + 1}. ${MOVIMIENTOS[movimiento]} de ${l.concepto.charAt(0).toLowerCase()}${l.concepto.slice(1)}${unico}${datos.length ? ` (${datos.join("; ")})` : ""}.`
  })
  return [
    `Se comunica a Liquidación de Haberes ${resolucion}, que dispone las siguientes novedades del/de la agente ${p.agente}${p.legajo ? `, legajo N.º ${p.legajo}` : ""}, ${textoPeriodo(desde, hasta, todasPagoUnico)}:`,
    detalle.join("\n"),
    comunes.length ? `Datos comunes:\n${comunes.map(([k, v]) => `- ${k}: ${v}`).join("\n")}` : null,
    observaciones?.trim() ? `Observaciones: ${observaciones.trim()}` : null,
    "Se solicita su impacto en la liquidación de haberes y su registro en Civitas.",
    "Pase para su conocimiento y efectos.",
  ]
    .filter(Boolean)
    .join("\n\n")
}

/** Novedad tal como se muestra en el expediente (agente y Capital Humano). */
export type NovedadExpediente = {
  id: string
  movimiento: Movimiento
  concepto: string
  vigencia_desde: string
  vigencia_hasta: string | null
  estado: EstadoNovedad
  created_at: string
  cargada_at: string | null
  /** La línea: "" si el expediente tiene una sola novedad; si no, por ejemplo "hijo:<dni>" o "familia_numerosa". */
  item?: string
  /** Datos de la línea (por ejemplo, el hijo/a). */
  detalle?: Record<string, string>
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
