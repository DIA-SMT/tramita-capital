// Planilla de Civitas (migración 002000): la que exportan Registro o Liquidación, leída en el navegador.
// Columnas provisorias hasta conocer el formato real del reporte de Civitas: se reconocen por el nombre del
// encabezado, en cualquier orden, con o sin acentos. Hace falta el legajo o el CUIL y al menos un dato.
import { normalizar } from "@/lib/relevamiento"

export type FilaCivitas = {
  legajo: string | null
  cuil: string | null
  /** «Liquida SÍ» y sin baja; null si la planilla no lo dice. */
  liquida: boolean | null
  /** AAAA-MM-DD */
  fecha_ingreso: string | null
  situacion_revista: string | null
}

export type ColumnaCivitas = "legajo" | "cuil" | "liquida" | "baja" | "fecha_ingreso" | "situacion_revista"

export type LecturaCivitas =
  | {
      ok: true
      filas: FilaCivitas[]
      columnas: ColumnaCivitas[]
      /** Filas descartadas por un dato que no se pudo leer (la línea cuenta el encabezado como 1). */
      errores: { linea: number; motivo: string }[]
      /** El mismo agente más de una vez: vale la última. */
      repetidas: number
      /** Filas sin legajo ni CUIL, o sin ningún dato. */
      vacias: number
    }
  | { ok: false; error: string }

export const MAX_FILAS_CIVITAS = 6000

export const ETIQUETAS_COLUMNA: Record<ColumnaCivitas, string> = {
  legajo: "Legajo",
  cuil: "CUIL",
  liquida: "Liquida",
  baja: "Baja",
  fecha_ingreso: "Fecha de ingreso",
  situacion_revista: "Situación de revista",
}

const SINONIMOS: Record<ColumnaCivitas, string[]> = {
  legajo: ["LEGAJO", "NRO LEGAJO", "N LEGAJO", "NRO DE LEGAJO", "NUMERO DE LEGAJO", "NUMERO LEGAJO", "AFILIADO", "NRO AFILIADO", "AF"],
  cuil: ["CUIL", "C U I L", "CUIT", "NRO CUIL", "NUMERO DE CUIL"],
  liquida: ["LIQUIDA", "LIQUIDA SI", "LIQUIDA SI NO", "ESTADO LIQUIDACION", "LIQUIDACION", "LIQ"],
  baja: ["BAJA", "FECHA BAJA", "FECHA DE BAJA", "BAJA EN CURSO", "BAJA CARGADA"],
  fecha_ingreso: ["FECHA INGRESO", "FECHA DE INGRESO", "INGRESO", "FECHA ALTA", "FECHA DE ALTA", "ALTA"],
  situacion_revista: ["SITUACION REVISTA", "SITUACION DE REVISTA", "REVISTA", "PLANTA", "TIPO DE PLANTA"],
}

const SI = new Set(["SI", "S", "1", "X", "TRUE", "VERDADERO"])
const NO = new Set(["NO", "N", "0", "FALSE", "FALSO"])

/** Planilla de ejemplo para descargar: el formato que entiende el sistema mientras no se conozca el de Civitas. */
export const PLANILLA_EJEMPLO = "Legajo;CUIL;Liquida;Fecha de ingreso;Situación de revista\r\n10234;27-30111222-4;SÍ;03/03/2014;planta permanente\r\n"

/** Texto del archivo: UTF-8 si se puede; si no, Windows-1252 (lo que suele guardar Excel en español). */
export function decodificar(bytes: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^﻿/, "")
  } catch {
    return new TextDecoder("windows-1252").decode(bytes)
  }
}

/** Separa un CSV en filas y celdas, con comillas ("a;b" y "" como comilla). */
export function celdasCSV(texto: string, separador: string): string[][] {
  const filas: string[][] = []
  let fila: string[] = []
  let celda = ""
  let comillas = false
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]
    if (comillas) {
      if (c === '"' && texto[i + 1] === '"') {
        celda += '"'
        i++
      } else if (c === '"') comillas = false
      else celda += c
    } else if (c === '"' && celda === "") comillas = true
    else if (c === separador) {
      fila.push(celda)
      celda = ""
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++
      fila.push(celda)
      filas.push(fila)
      fila = []
      celda = ""
    } else celda += c
  }
  if (celda !== "" || fila.length > 0) {
    fila.push(celda)
    filas.push(fila)
  }
  return filas
}

/** El separador del encabezado: punto y coma (Excel en español), tabulación o coma. */
function separadorDe(encabezado: string) {
  const cuenta = (s: string) => encabezado.split(s).length - 1
  return [";", "\t", ","].reduce((mejor, s) => (cuenta(s) > cuenta(mejor) ? s : mejor), ";")
}

function columnaDe(encabezado: string): ColumnaCivitas | null {
  const n = normalizar(encabezado)
  for (const [col, nombres] of Object.entries(SINONIMOS) as [ColumnaCivitas, string[]][]) if (nombres.includes(n)) return col
  return null
}

const dos = (n: number) => String(n).padStart(2, "0")

/** dd/mm/aaaa, d-m-aaaa, aaaa-mm-dd o el número de serie de Excel → AAAA-MM-DD; null si no es una fecha. */
export function fechaCivitas(valor: string): string | null {
  const v = valor.trim()
  let a: number, m: number, d: number
  let r = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/)
  if (r) [d, m, a] = [Number(r[1]), Number(r[2]), Number(r[3])]
  else if ((r = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/))) [a, m, d] = [Number(r[1]), Number(r[2]), Number(r[3])]
  else if (/^\d{5}$/.test(v)) {
    // Excel cuenta los días desde el 30/12/1899.
    const f = new Date(Date.UTC(1899, 11, 30) + Number(v) * 86_400_000)
    ;[a, m, d] = [f.getUTCFullYear(), f.getUTCMonth() + 1, f.getUTCDate()]
  } else return null
  const f = new Date(Date.UTC(a, m - 1, d))
  if (a < 1900 || f.getUTCFullYear() !== a || f.getUTCMonth() !== m - 1 || f.getUTCDate() !== d) return null
  return `${a}-${dos(m)}-${dos(d)}`
}

/** Lee la planilla. Las filas con un dato ilegible se descartan y se informan; el resto se importa. */
export function leerPlanillaCivitas(texto: string): LecturaCivitas {
  const limpio = texto.replace(/^﻿/, "")
  const primera = limpio.split(/\r?\n/, 1)[0] ?? ""
  if (!primera.trim()) return { ok: false, error: "El archivo está vacío." }
  const tabla = celdasCSV(limpio, separadorDe(primera))
  const [encabezado, ...resto] = tabla
  const columnas = encabezado.map(columnaDe)
  const indice = (c: ColumnaCivitas) => columnas.indexOf(c)
  if (indice("legajo") < 0 && indice("cuil") < 0) return { ok: false, error: "La planilla tiene que tener una columna «Legajo» o «CUIL»." }
  if (!["liquida", "baja", "fecha_ingreso", "situacion_revista"].some((c) => indice(c as ColumnaCivitas) >= 0)) {
    return { ok: false, error: "La planilla no trae ningún dato para actualizar: «Liquida», «Baja», «Fecha de ingreso» o «Situación de revista»." }
  }
  const datos = resto.filter((f) => f.some((c) => c.trim() !== ""))
  if (datos.length > MAX_FILAS_CIVITAS) return { ok: false, error: `La planilla tiene ${datos.length} filas: el máximo es ${MAX_FILAS_CIVITAS}. Dividila.` }

  const errores: { linea: number; motivo: string }[] = []
  const porClave = new Map<string, FilaCivitas>()
  let repetidas = 0
  let vacias = 0
  const celda = (fila: string[], c: ColumnaCivitas) => (indice(c) >= 0 ? (fila[indice(c)] ?? "").trim() : "")

  resto.forEach((fila, i) => {
    const linea = i + 2
    if (!fila.some((c) => c.trim() !== "")) return
    const legajo = celda(fila, "legajo").replace(/[.\s]/g, "") || null
    const cuilTexto = celda(fila, "cuil")
    const cuilDigitos = cuilTexto.replace(/\D/g, "")
    if (cuilTexto && cuilDigitos.length !== 11 && !legajo) return void errores.push({ linea, motivo: `CUIL inválido: ${cuilTexto}` })
    const cuil = cuilDigitos.length === 11 ? cuilTexto : null
    if (!legajo && !cuil) return void vacias++

    let liquida: boolean | null = null
    const textoLiquida = normalizar(celda(fila, "liquida"))
    if (textoLiquida) {
      if (SI.has(textoLiquida)) liquida = true
      else if (NO.has(textoLiquida)) liquida = false
      else return void errores.push({ linea, motivo: `«Liquida» no se entiende: ${celda(fila, "liquida")}` })
    }
    // Una baja cargada o en curso corta el «Liquida SÍ».
    const textoBaja = normalizar(celda(fila, "baja"))
    if (textoBaja && !NO.has(textoBaja) && textoBaja !== "") liquida = false

    const textoIngreso = celda(fila, "fecha_ingreso")
    const fecha_ingreso = textoIngreso ? fechaCivitas(textoIngreso) : null
    if (textoIngreso && !fecha_ingreso) return void errores.push({ linea, motivo: `Fecha de ingreso inválida: ${textoIngreso}` })

    let revista = celda(fila, "situacion_revista").slice(0, 120) || null
    // En mayúsculas sostenidas se lee mal en el certificado: «PLANTA PERMANENTE» → «planta permanente».
    if (revista && revista === revista.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(revista)) revista = revista.toLowerCase()

    if (liquida === null && !fecha_ingreso && !revista) return void vacias++
    const clave = legajo ? `L:${legajo.replace(/^0+/, "")}` : `C:${cuilDigitos}`
    if (porClave.has(clave)) repetidas++
    porClave.set(clave, { legajo, cuil, liquida, fecha_ingreso, situacion_revista: revista })
  })

  return {
    ok: true,
    filas: [...porClave.values()],
    columnas: columnas.filter((c): c is ColumnaCivitas => c !== null),
    errores,
    repetidas,
    vacias,
  }
}

/** Lo que devuelve importar_datos_civitas. */
export type ResultadoImportacion = { filas: number; actualizados: number; sinCoincidencia: number; noEncontrados: string[] }

export function leerResultadoImportacion(v: unknown): ResultadoImportacion | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null
  const o = v as Record<string, unknown>
  if (typeof o.actualizados !== "number") return null
  return {
    filas: typeof o.filas === "number" ? o.filas : 0,
    actualizados: o.actualizados,
    sinCoincidencia: typeof o.sin_coincidencia === "number" ? o.sin_coincidencia : 0,
    noEncontrados: Array.isArray(o.no_encontrados) ? o.no_encontrados.filter((x): x is string => typeof x === "string") : [],
  }
}
