// Calibración del comparador de firmas con firmas sintéticas (no reemplaza pruebas con firmas reales).
// Uso: npx tsx scripts/calibrar-firma.ts
// Resultado con la configuración elegida (factor 1,6, piso 0,12, techo 0,30): 0 % de genuinas rechazadas,
// 0 % de firmas de otra persona aceptadas y ~23 % de imitaciones hábiles aceptadas: por eso además se exige la clave.
import { distancia, patronDeTrazos, type Trazo } from "../src/lib/firma-trazo"

let semilla = 7
const azar = () => ((semilla = (semilla * 1103515245 + 12345) % 2147483648) / 2147483648)
const entre = (a: number, b: number) => a + (b - a) * azar()

type Persona = { a: number[]; f: number[]; p: number[]; b: number[]; g: number[]; q: number[]; cortes: number[]; ancho: number }
function persona(): Persona {
  const k = 4
  return {
    a: Array.from({ length: k }, () => entre(10, 40)),
    f: Array.from({ length: k }, () => entre(4, 22)),
    p: Array.from({ length: k }, () => entre(0, 6.28)),
    b: Array.from({ length: k }, () => entre(10, 45)),
    g: Array.from({ length: k }, () => entre(5, 26)),
    q: Array.from({ length: k }, () => entre(0, 6.28)),
    cortes: [entre(0.25, 0.45), entre(0.6, 0.8)].sort(),
    ancho: entre(220, 360),
  }
}

/** Una ejecución de la firma: variación natural (v) en forma, escala, inclinación, velocidad y ruido. */
function firmar(per: Persona, v: number): Trazo[] {
  const esc = 1 + entre(-0.12, 0.12) * v
  const rot = entre(-0.08, 0.08) * v
  const incl = entre(-0.1, 0.1) * v
  const fase = per.p.map((x) => x + entre(-0.25, 0.25) * v)
  const amp = per.a.map((x) => x * (1 + entre(-0.1, 0.1) * v))
  const ampY = per.b.map((x) => x * (1 + entre(-0.1, 0.1) * v))
  const warp = entre(-0.06, 0.06) * v
  const n = Math.round(entre(90, 220))
  const trazos: Trazo[] = [[], [], []]
  let t = 0
  for (let i = 0; i < n; i++) {
    let s = i / (n - 1)
    s = s + warp * Math.sin(2 * Math.PI * s)
    let x = s * per.ancho
    let y = 0
    for (let k = 0; k < amp.length; k++) {
      x += amp[k] * Math.sin(per.f[k] * s + fase[k]) * 0.35
      y += ampY[k] * Math.sin(per.g[k] * s + per.q[k])
    }
    x += y * incl
    const xr = (x * Math.cos(rot) - y * Math.sin(rot)) * esc + entre(-1.5, 1.5) * v
    const yr = (x * Math.sin(rot) + y * Math.cos(rot)) * esc + entre(-1.5, 1.5) * v
    t += entre(6, 18)
    const tramo = s < per.cortes[0] ? 0 : s < per.cortes[1] ? 1 : 2
    trazos[tramo].push({ x: xr + 400, y: yr + 150, t })
  }
  return trazos
}

const patron = (t: Trazo[]) => patronDeTrazos(t)!.v


type Caso = { intraMax: number; g: number[]; o: number[]; im: number[] }
const casos: Caso[] = []
for (let caso = 0; caso < 300; caso++) {
  const per = persona()
  const muestras = [0, 1, 2].map(() => patron(firmar(per, 1)))
  const intraMax = Math.max(distancia(muestras[0], muestras[1]), distancia(muestras[0], muestras[2]), distancia(muestras[1], muestras[2]))
  const puntaje = (v: number[]) => Math.min(...muestras.map((m) => distancia(v, m)))
  const c: Caso = { intraMax, g: [], o: [], im: [] }
  for (let r = 0; r < 6; r++) {
    c.g.push(puntaje(patron(firmar(per, 1.6))))
    c.o.push(puntaje(patron(firmar(persona(), 1))))
    c.im.push(puntaje(patron(firmar(per, 3))))
  }
  casos.push(c)
}
for (const factor of [1.3, 1.6, 2.0])
  for (const piso of [0.08, 0.1, 0.12, 0.15]) {
    let rg = 0, ao = 0, ai = 0, n = 0
    for (const c of casos) {
      const u = Math.min(0.3, Math.max(piso, c.intraMax * factor))
      c.g.forEach((x) => (rg += x > u ? 1 : 0)); c.o.forEach((x) => (ao += x <= u ? 1 : 0)); c.im.forEach((x) => (ai += x <= u ? 1 : 0)); n += c.g.length
    }
    console.log('factor', factor, 'piso', piso, '| rechaza genuina', (rg/n*100).toFixed(1)+'%', '| acepta otra', (ao/n*100).toFixed(1)+'%', '| acepta imitación', (ai/n*100).toFixed(1)+'%')
  }
