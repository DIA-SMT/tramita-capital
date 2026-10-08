// Firma ológrafa electrónica: biometría dinámica de la firma.
//
// El navegador captura el trazo crudo (posición, tiempo y presión de cada punto) y lo
// envía tal cual. La base de datos (public._firma_patron) calcula el patrón con el mismo
// algoritmo que está acá, lo compara (public._dtw) y estampa el trazo verificado.
// Este archivo es el espejo exacto de ese cálculo: sirve para la vista previa, para
// explicar el resultado y para calibrar (scripts/calibrar-firma.ts). La base decide.

export type Punto = { x: number; y: number; t: number; p?: number }
export type Trazo = Punto[]

/** Punto crudo: [x, y, t (ms desde el inicio), presión o -1]. */
export type PuntoCrudo = [number, number, number, number]
/** Trazo crudo tal como viaja a la base: los trazos de la firma, cada uno con sus puntos. */
export type FirmaCruda = PuntoCrudo[][]

/** Patrón normalizado (lo calcula la base a partir del trazo crudo). */
export type PatronFirma = {
  /** PUNTOS × 4: x, y (centrados y escalados a la altura) y dirección del trazo (cos, sen). */
  v: number[]
  /** PUNTOS: perfil de velocidad relativa (ln(1 + v / v̄)): el ritmo de la mano. */
  r: number[]
  /** Duración total en milisegundos. */
  duracion: number
  /** Cantidad de trazos (levantadas de lapicera + 1). */
  trazos: number
  /** Largo de la tinta, relativo a la altura de la firma. */
  largo: number
  /** Proporción del tiempo con la lapicera levantada. */
  pausa: number
  /** Ancho / alto de la firma. */
  relacion: number
}

/** Trazo para estampar: coordenadas relativas (alto 100), sin tiempos. */
export type FirmaVisible = { ancho: number; trazos: number[][] }

/** Con qué se dibujó (lo informa el navegador; la base solo acepta estos valores). */
export type Dispositivo = "pen" | "touch" | "mouse" | "desconocido"
export const DISPOSITIVOS = ["pen", "touch", "mouse", "desconocido"] as const
export const TINTAS = ["#1e3a8a", "#111827"] as const
export type Tinta = (typeof TINTAS)[number]

/** Lo que entrega el lienzo: el trazo crudo (lo que viaja), su patrón y cómo se dibujó. */
export type FirmaCapturada = { crudo: FirmaCruda; patron: PatronFirma; visible: FirmaVisible; tinta: Tinta; dispositivo: Dispositivo }

/** Máximo de puntos que acepta la base por firma. */
export const MAXIMO_PUNTOS = 5000

export const PUNTOS = 64
export const DIM = 4
export const VENTANA = 12
/** El ritmo es una señal de una dimensión: con mucho margen de alineamiento cualquier perfil se parece. */
export const VENTANA_RITMO = 3

// Redondeos idénticos a los de la base (floor(x + 0,5), no el redondeo "al par").
const r3 = (n: number) => Math.floor(n * 1000 + 0.5) / 1000
const r1 = (n: number) => Math.floor(n * 10 + 0.5) / 10
const r2 = (n: number) => Math.floor(n * 100 + 0.5) / 100

/** Pasa los trazos capturados al formato crudo que viaja a la base. */
export function crudoDeTrazos(trazos: Trazo[]): FirmaCruda {
  const validos = trazos.filter((t) => t.length > 0)
  const t0 = Math.min(...validos.flat().map((p) => p.t))
  return validos.map((t) => t.map((p): PuntoCrudo => [r1(p.x), r1(p.y), Math.round(p.t - t0), p.p === undefined || p.p < 0 ? -1 : r2(p.p)]))
}

/** Patrón biométrico del trazo crudo (misma cuenta, en el mismo orden, que public._firma_patron). */
export function patronDeCrudo(crudo: FirmaCruda): PatronFirma | null {
  const xs: number[] = []
  const ys: number[] = []
  const ts: number[] = []
  const ks: number[] = []
  let k = 0
  for (const trazo of crudo) {
    if (trazo.length === 0) continue
    k++
    for (const p of trazo) {
      xs.push(p[0])
      ys.push(p[1])
      ts.push(p[2])
      ks.push(k)
    }
  }
  const n = xs.length
  if (n < 12 || n > 5000 || k > 60) return null

  let minx = xs[0], maxx = xs[0], miny = ys[0], maxy = ys[0], mint = ts[0], maxt = ts[0]
  let sx = 0, sy = 0
  for (let i = 0; i < n; i++) {
    if (xs[i] < minx) minx = xs[i]
    if (xs[i] > maxx) maxx = xs[i]
    if (ys[i] < miny) miny = ys[i]
    if (ys[i] > maxy) maxy = ys[i]
    if (ts[i] < mint) mint = ts[i]
    if (ts[i] > maxt) maxt = ts[i]
    sx += xs[i]
    sy += ys[i]
  }
  const ancho = maxx - minx
  const alto = maxy - miny
  if (Math.max(ancho, alto) < 20) return null
  const cx = sx / n
  const cy = sy / n
  const esc = alto > 0 ? alto : ancho

  // Posición normalizada, velocidad en cada punto y largo acumulado del recorrido.
  const qx: number[] = []
  const qy: number[] = []
  const vel: number[] = []
  const acum: number[] = []
  let largo = 0
  let pausas = 0
  for (let i = 0; i < n; i++) {
    qx.push((xs[i] - cx) / esc)
    qy.push((ys[i] - cy) / esc)
    if (i === 0) {
      vel.push(0)
      acum.push(0)
      continue
    }
    const dq = Math.sqrt((qx[i] - qx[i - 1]) * (qx[i] - qx[i - 1]) + (qy[i] - qy[i - 1]) * (qy[i] - qy[i - 1]))
    acum.push(acum[i - 1] + dq)
    if (ks[i] === ks[i - 1]) {
      const d = Math.sqrt((xs[i] - xs[i - 1]) * (xs[i] - xs[i - 1]) + (ys[i] - ys[i - 1]) * (ys[i] - ys[i - 1]))
      vel.push(d / Math.max(1, ts[i] - ts[i - 1]))
      largo += dq
    } else {
      vel.push(0)
      pausas += ts[i] - ts[i - 1]
    }
  }

  // Remuestreo a PUNTOS puntos equidistantes sobre el recorrido.
  const total = acum[n - 1] > 0 ? acum[n - 1] : 1
  const rx: number[] = []
  const ry: number[] = []
  const rv: number[] = []
  let j = 1
  for (let m = 0; m < PUNTOS; m++) {
    const objetivo = (total * m) / (PUNTOS - 1)
    while (j < n - 1 && acum[j] < objetivo) j++
    const tramo = acum[j] - acum[j - 1] > 0 ? acum[j] - acum[j - 1] : 1
    const f = Math.min(1, Math.max(0, (objetivo - acum[j - 1]) / tramo))
    rx.push(qx[j - 1] + (qx[j] - qx[j - 1]) * f)
    ry.push(qy[j - 1] + (qy[j] - qy[j - 1]) * f)
    rv.push(vel[j - 1] + (vel[j] - vel[j - 1]) * f)
  }

  let sv = 0
  for (let m = 0; m < PUNTOS; m++) sv += rv[m]
  const vm = sv / PUNTOS
  const v: number[] = []
  const r: number[] = []
  for (let m = 0; m < PUNTOS; m++) {
    const a = Math.max(0, m - 1)
    const b = Math.min(PUNTOS - 1, m + 1)
    const dx = rx[b] - rx[a]
    const dy = ry[b] - ry[a]
    const d = Math.sqrt(dx * dx + dy * dy) > 0 ? Math.sqrt(dx * dx + dy * dy) : 1
    v.push(r3(rx[m]), r3(ry[m]), r3(dx / d), r3(dy / d))
    r.push(r3(vm > 0 ? Math.log(1 + rv[m] / vm) : 0))
  }
  const duracion = maxt - mint
  return {
    v,
    r,
    duracion,
    trazos: k,
    largo: r3(largo),
    pausa: r3(duracion > 0 ? pausas / duracion : 0),
    relacion: r3(alto > 0 ? ancho / alto : 10),
  }
}

export const patronDeTrazos = (trazos: Trazo[]) => patronDeCrudo(crudoDeTrazos(trazos))

/** Trazo para estampar (misma cuenta que public._firma_visible). */
export function visibleDeCrudo(crudo: FirmaCruda): FirmaVisible | null {
  const todos = crudo.flat()
  if (todos.length === 0) return null
  let minx = todos[0][0], maxx = todos[0][0], miny = todos[0][1], maxy = todos[0][1]
  for (const p of todos) {
    if (p[0] < minx) minx = p[0]
    if (p[0] > maxx) maxx = p[0]
    if (p[1] < miny) miny = p[1]
    if (p[1] > maxy) maxy = p[1]
  }
  const esc = maxy - miny > 0 ? maxy - miny : maxx - minx > 0 ? maxx - minx : 1
  const trazos: number[][] = []
  for (const t of crudo) {
    if (t.length === 0) continue
    const salida: number[] = []
    let ux = 0
    let uy = 0
    t.forEach((p, i) => {
      const x = r1(((p[0] - minx) / esc) * 100)
      const y = r1(((p[1] - miny) / esc) * 100)
      const ultimo = i === t.length - 1
      if (i === 0 || ultimo || Math.sqrt((x - ux) * (x - ux) + (y - uy) * (y - uy)) >= 0.6) {
        salida.push(x, y)
        ux = x
        uy = y
      }
    })
    trazos.push(salida)
  }
  return { ancho: r1(((maxx - minx) / esc) * 100), trazos }
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
// Reglas de comparación (las mismas que aplica la base; ella decide).
// ---------------------------------------------------------------------
export const REGLAS = {
  /** Forma: tu variación entre las tres muestras × factor, acotada. */
  forma: { factor: 1.6, piso: 0.12, techo: 0.3 },
  /** Ritmo (perfil de velocidad): ídem, en su propia escala. */
  ritmo: { factor: 1.8, piso: 0.035, techo: 0.08 },
  /** Si las muestras varían más que esto, el registro se rechaza. */
  variacionMaxima: { forma: 0.3, ritmo: 0.1 },
  /** Duración aceptada: entre la media / 2,5 y la media × 2,5. */
  duracionFactor: 2.5,
  /** Largo de la tinta: ±35 % de la media. */
  largoTolerancia: 0.35,
  /** Trazos: diferencia de hasta 2, o 60 % de la media si es mayor. */
  trazosTolerancia: 2,
  trazosProporcion: 0.6,
  /** Por debajo de esto en forma y ritmo, la firma es una copia exacta, no una firma nueva. */
  copia: { forma: 0.006, ritmo: 0.004 },
} as const

export type RegistroPatron = {
  version: 2
  muestras: PatronFirma[]
  umbralForma: number
  umbralRitmo: number
  duracionMedia: number
  trazosMedio: number
  largoMedio: number
}
export type Evaluacion = {
  forma: { puntaje: number; umbral: number }
  ritmo: { puntaje: number; umbral: number }
  duracionOk: boolean
  trazosOk: boolean
  largoOk: boolean
  copia: boolean
  coincide: boolean
}

const acotar = (v: number, r: { factor: number; piso: number; techo: number }) => Math.min(r.techo, Math.max(r.piso, v * r.factor))

export function variaciones(muestras: PatronFirma[]) {
  let forma = 0
  let ritmo = 0
  for (let i = 0; i < muestras.length; i++)
    for (let j = i + 1; j < muestras.length; j++) {
      forma = Math.max(forma, distancia(muestras[i].v, muestras[j].v))
      ritmo = Math.max(ritmo, distancia(muestras[i].r, muestras[j].r, 1, VENTANA_RITMO))
    }
  return { forma, ritmo }
}

export function registroDe(muestras: PatronFirma[]): RegistroPatron {
  const v = variaciones(muestras)
  const media = (f: (m: PatronFirma) => number) => muestras.reduce((s, m) => s + f(m), 0) / muestras.length
  return {
    version: 2,
    muestras,
    umbralForma: acotar(v.forma, REGLAS.forma),
    umbralRitmo: acotar(v.ritmo, REGLAS.ritmo),
    duracionMedia: Math.round(media((m) => m.duracion)),
    trazosMedio: media((m) => m.trazos),
    largoMedio: media((m) => m.largo),
  }
}

export function evaluar(p: PatronFirma, reg: RegistroPatron, anteriores: PatronFirma[] = []): Evaluacion {
  const forma = Math.min(...reg.muestras.map((m) => distancia(p.v, m.v)))
  const ritmo = Math.min(...reg.muestras.map((m) => distancia(p.r, m.r, 1, VENTANA_RITMO)))
  const copia = [...reg.muestras, ...anteriores].some((m) => distancia(p.v, m.v) < REGLAS.copia.forma && distancia(p.r, m.r, 1, VENTANA_RITMO) < REGLAS.copia.ritmo)
  const duracionOk = p.duracion >= reg.duracionMedia / REGLAS.duracionFactor && p.duracion <= reg.duracionMedia * REGLAS.duracionFactor
  const trazosOk = Math.abs(p.trazos - reg.trazosMedio) <= Math.max(REGLAS.trazosTolerancia, reg.trazosMedio * REGLAS.trazosProporcion)
  const largoOk = Math.abs(p.largo - reg.largoMedio) <= reg.largoMedio * REGLAS.largoTolerancia
  return {
    forma: { puntaje: forma, umbral: reg.umbralForma },
    ritmo: { puntaje: ritmo, umbral: reg.umbralRitmo },
    duracionOk,
    trazosOk,
    largoOk,
    copia,
    coincide: forma <= reg.umbralForma && ritmo <= reg.umbralRitmo && duracionOk && trazosOk && largoOk && !copia,
  }
}
