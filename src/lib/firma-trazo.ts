// Trazo de la firma ológrafa electrónica: se normaliza en el navegador y se compara
// en la base de datos (función public._dtw) contra el patrón registrado.
// La comparación es dinámica: forma, orden y dirección del trazo, no solo la imagen final.

export type Punto = { x: number; y: number; t: number }
export type Trazo = Punto[]

/** Representación normalizada que viaja a la base: sin coordenadas de pantalla ni tiempos crudos. */
export type PatronFirma = {
  /** N puntos × DIM valores: x, y (centrados y escalados) y dirección del trazo (cos, sen). */
  v: number[]
  /** Duración total en milisegundos. */
  duracion: number
  /** Cantidad de trazos (levantadas de lapicera + 1). */
  trazos: number
  /** Ancho / alto de la firma. */
  relacion: number
}

export const PUNTOS = 64
export const DIM = 4
export const VENTANA = 12

const redondear = (n: number) => Math.round(n * 1000) / 1000

/** Remuestrea la secuencia completa (con los saltos entre trazos) a PUNTOS puntos equidistantes. */
function remuestrear(puntos: { x: number; y: number }[], n: number) {
  const largos = [0]
  for (let i = 1; i < puntos.length; i++) largos.push(largos[i - 1] + Math.hypot(puntos[i].x - puntos[i - 1].x, puntos[i].y - puntos[i - 1].y))
  const total = largos[largos.length - 1] || 1
  const salida: { x: number; y: number }[] = []
  let j = 1
  for (let k = 0; k < n; k++) {
    const objetivo = (total * k) / (n - 1)
    while (j < largos.length - 1 && largos[j] < objetivo) j++
    const a = puntos[j - 1]
    const b = puntos[j] ?? a
    const tramo = largos[j] - largos[j - 1] || 1
    const f = Math.min(1, Math.max(0, (objetivo - largos[j - 1]) / tramo))
    salida.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f })
  }
  return salida
}

/** Normaliza los trazos dibujados. Devuelve null si la firma es demasiado corta para comparar. */
export function patronDeTrazos(trazos: Trazo[]): PatronFirma | null {
  const validos = trazos.filter((t) => t.length > 0)
  const todos = validos.flat()
  if (todos.length < 12) return null
  const xs = todos.map((p) => p.x)
  const ys = todos.map((p) => p.y)
  const ancho = Math.max(...xs) - Math.min(...xs)
  const alto = Math.max(...ys) - Math.min(...ys)
  if (Math.max(ancho, alto) < 20) return null
  const cx = xs.reduce((s, v) => s + v, 0) / xs.length
  const cy = ys.reduce((s, v) => s + v, 0) / ys.length
  const escala = alto > 0 ? alto : ancho
  const normalizados = todos.map((p) => ({ x: (p.x - cx) / escala, y: (p.y - cy) / escala }))
  const r = remuestrear(normalizados, PUNTOS)
  const v: number[] = []
  for (let i = 0; i < r.length; i++) {
    const a = r[Math.max(0, i - 1)]
    const b = r[Math.min(r.length - 1, i + 1)]
    const d = Math.hypot(b.x - a.x, b.y - a.y) || 1
    v.push(redondear(r[i].x), redondear(r[i].y), redondear((b.x - a.x) / d), redondear((b.y - a.y) / d))
  }
  const t0 = Math.min(...todos.map((p) => p.t))
  const t1 = Math.max(...todos.map((p) => p.t))
  return { v, duracion: Math.round(t1 - t0), trazos: validos.length, relacion: redondear(alto > 0 ? ancho / alto : 10) }
}

/** Distancia DTW media por paso (misma fórmula que public._dtw en la base). */
export function distancia(a: number[], b: number[], dim = DIM, ventana = VENTANA) {
  const n = a.length / dim
  const m = b.length / dim
  let previa = new Array<number>(m + 1).fill(Infinity)
  previa[0] = 0
  for (let i = 1; i <= n; i++) {
    const actual = new Array<number>(m + 1).fill(Infinity)
    for (let j = Math.max(1, i - ventana); j <= Math.min(m, i + ventana); j++) {
      let d = 0
      for (let k = 0; k < dim; k++) {
        const c = a[(i - 1) * dim + k] - b[(j - 1) * dim + k]
        d += c * c
      }
      actual[j] = Math.sqrt(d) + Math.min(previa[j], actual[j - 1], previa[j - 1])
    }
    previa = actual
  }
  return previa[m] / (n + m)
}

// ---------------------------------------------------------------------
// Reglas de comparación (las mismas que aplican public.registrar_firma y
// public.firmar_actuacion; la base es la que decide, esto es su espejo para
// la vista previa y para explicar el resultado).
// ---------------------------------------------------------------------
export const REGLAS = {
  /** El umbral es tu propia variación entre las tres muestras × factor… */
  factor: 1.6,
  /** …acotado entre un piso y un techo. */
  piso: 0.12,
  techo: 0.3,
  /** Si las tres muestras varían más que esto, el registro se rechaza. */
  variacionMaxima: 0.3,
  /** Duración aceptada: entre un tercio y el triple de tu duración media. */
  duracionFactor: 3,
  /** Diferencia de cantidad de trazos aceptada: 2, o 60 % de tu media si es mayor. */
  trazosTolerancia: 2,
  trazosProporcion: 0.6,
} as const

export type RegistroPatron = { muestras: PatronFirma[]; umbral: number; duracionMedia: number; trazosMedio: number }
export type Evaluacion = { puntaje: number; umbral: number; duracionOk: boolean; trazosOk: boolean; coincide: boolean }

export function variacion(muestras: PatronFirma[]) {
  let maxima = 0
  for (let i = 0; i < muestras.length; i++) for (let j = i + 1; j < muestras.length; j++) maxima = Math.max(maxima, distancia(muestras[i].v, muestras[j].v))
  return maxima
}

export function registroDe(muestras: PatronFirma[]): RegistroPatron {
  const v = variacion(muestras)
  return {
    muestras,
    umbral: Math.min(REGLAS.techo, Math.max(REGLAS.piso, v * REGLAS.factor)),
    duracionMedia: Math.round(muestras.reduce((s, m) => s + m.duracion, 0) / muestras.length),
    trazosMedio: muestras.reduce((s, m) => s + m.trazos, 0) / muestras.length,
  }
}

export function evaluar(trazo: PatronFirma, r: RegistroPatron): Evaluacion {
  const puntaje = Math.min(...r.muestras.map((m) => distancia(trazo.v, m.v)))
  const duracionOk = trazo.duracion >= r.duracionMedia / REGLAS.duracionFactor && trazo.duracion <= r.duracionMedia * REGLAS.duracionFactor
  const trazosOk = Math.abs(trazo.trazos - r.trazosMedio) <= Math.max(REGLAS.trazosTolerancia, r.trazosMedio * REGLAS.trazosProporcion)
  return { puntaje, umbral: r.umbral, duracionOk, trazosOk, coincide: puntaje <= r.umbral && duracionOk && trazosOk }
}
