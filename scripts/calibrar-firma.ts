// Calibración del comparador de firmas con firmas sintéticas (no reemplaza pruebas con firmas reales).
// Uso: npx tsx scripts/calibrar-firma.ts
// Resultado de referencia (250 personas sintéticas): solo forma acepta ~77 % de imitaciones hábiles;
// forma + ritmo + largo (reglas actuales) ~6 %, con ~0,6 % de genuinas rechazadas y 0 % de otra persona.
//
// Cada "persona" tiene una forma de firma y un ritmo propio (perfil de velocidad y pausas).
// Se simulan: firmas genuinas (variación natural), firmas de otra persona e imitaciones
// hábiles (copian la forma con más variación, más lento y sin conocer el ritmo).
// Los puntos se muestrean por tiempo, como un dispositivo real (cada 8–16 ms).
import { evaluar, patronDeTrazos, registroDe, REGLAS, type Trazo } from "../src/lib/firma-trazo"

let semilla = 7
const azar = () => ((semilla = (semilla * 1103515245 + 12345) % 2147483648) / 2147483648)
const entre = (a: number, b: number) => a + (b - a) * azar()

type Persona = {
  a: number[]; f: number[]; p: number[]; b: number[]; g: number[]; q: number[]
  cortes: number[]; ancho: number
  vel: number; m1: number; w1: number; f1: number; m2: number; w2: number; f2: number; pausa: number
}
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
    vel: entre(0.35, 1.2),
    m1: entre(0.3, 0.6), w1: entre(6, 18), f1: entre(0, 6.28),
    m2: entre(0.1, 0.35), w2: entre(15, 40), f2: entre(0, 6.28),
    pausa: entre(60, 260),
  }
}

type Modo = "genuina" | "imitacion"
function firmar(per: Persona, modo: Modo, v = 1): Trazo[] {
  const im = modo === "imitacion"
  const forma = im ? 2.6 : v
  const esc = 1 + entre(-0.12, 0.12) * forma
  const rot = entre(-0.08, 0.08) * forma
  const incl = entre(-0.1, 0.1) * forma
  const fase = per.p.map((x) => x + entre(-0.25, 0.25) * forma)
  const amp = per.a.map((x) => x * (1 + entre(-0.1, 0.1) * forma))
  const ampY = per.b.map((x) => x * (1 + entre(-0.1, 0.1) * forma))
  // Ritmo: la genuina conserva el perfil de velocidad; la imitación va más lenta y sin conocerlo.
  const vel = per.vel * (im ? entre(0.4, 0.8) : entre(0.8, 1.25))
  const f1 = im ? entre(0, 6.28) : per.f1 + entre(-0.2, 0.2) * v
  const f2 = im ? entre(0, 6.28) : per.f2 + entre(-0.2, 0.2) * v
  const m1 = per.m1 * (im ? 0.5 : entre(0.9, 1.1))
  const m2 = per.m2 * (im ? 0.5 : entre(0.9, 1.1))
  const pausa = per.pausa * (im ? entre(1, 3) : entre(0.7, 1.4))

  // Recorrido denso de la forma.
  const N = 1200
  const xs: number[] = []
  const ys: number[] = []
  for (let i = 0; i < N; i++) {
    const s = i / (N - 1)
    let x = s * per.ancho
    let y = 0
    for (let k = 0; k < amp.length; k++) {
      x += amp[k] * Math.sin(per.f[k] * s + fase[k]) * 0.35
      y += ampY[k] * Math.sin(per.g[k] * s + per.q[k])
    }
    x += y * incl
    xs.push((x * Math.cos(rot) - y * Math.sin(rot)) * esc + 400)
    ys.push((x * Math.sin(rot) + y * Math.cos(rot)) * esc + 150)
  }
  const acum = [0]
  for (let i = 1; i < N; i++) acum.push(acum[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]))
  const total = acum[N - 1]

  // Avance por tiempo, con el perfil de velocidad y pausas entre trazos.
  const trazos: Trazo[] = [[], [], []]
  let t = 0
  let largo = 0
  let j = 0
  let tramoActual = 0
  while (largo < total) {
    const s = largo / total
    const tramo = s < per.cortes[0] ? 0 : s < per.cortes[1] ? 1 : 2
    if (tramo !== tramoActual) {
      t += pausa
      tramoActual = tramo
    }
    while (j < N - 1 && acum[j + 1] < largo) j++
    const f = (largo - acum[j]) / Math.max(1e-9, acum[j + 1] - acum[j])
    const x = xs[j] + (xs[j + 1] - xs[j]) * f + entre(-0.6, 0.6) * forma
    const y = ys[j] + (ys[j + 1] - ys[j]) * f + entre(-0.6, 0.6) * forma
    trazos[tramo].push({ x, y, t })
    const dt = entre(8, 16)
    const rapidez = Math.max(0.08, vel * (1 + m1 * Math.sin(per.w1 * s + f1) + m2 * Math.sin(per.w2 * s + f2)))
    t += dt
    largo += rapidez * dt
  }
  return trazos
}

const patron = (t: Trazo[]) => patronDeTrazos(t)!
type Caso = { reg: ReturnType<typeof registroDe>; g: ReturnType<typeof patron>[]; o: ReturnType<typeof patron>[]; im: ReturnType<typeof patron>[] }

const casos: Caso[] = []
for (let caso = 0; caso < 250; caso++) {
  const per = persona()
  const reg = registroDe([0, 1, 2].map(() => patron(firmar(per, "genuina"))))
  casos.push({
    reg,
    g: Array.from({ length: 6 }, () => patron(firmar(per, "genuina", 1.5))),
    o: Array.from({ length: 6 }, () => patron(firmar(persona(), "genuina"))),
    im: Array.from({ length: 6 }, () => patron(firmar(per, "imitacion"))),
  })
}

const pct = (n: number, d: number) => `${((n / d) * 100).toFixed(1)} %`
function medir(soloForma: boolean) {
  let rg = 0, ao = 0, ai = 0, n = 0
  for (const c of casos) {
    const ok = (p: (typeof c.g)[number]) => {
      const e = evaluar(p, c.reg)
      return soloForma ? e.forma.puntaje <= e.forma.umbral && e.duracionOk && e.trazosOk : e.coincide
    }
    c.g.forEach((p) => (rg += ok(p) ? 0 : 1))
    c.o.forEach((p) => (ao += ok(p) ? 1 : 0))
    c.im.forEach((p) => (ai += ok(p) ? 1 : 0))
    n += c.g.length
  }
  return `rechaza genuina ${pct(rg, n)} | acepta otra persona ${pct(ao, n)} | acepta imitación hábil ${pct(ai, n)}`
}

console.log("Reglas:", JSON.stringify({ forma: REGLAS.forma, ritmo: REGLAS.ritmo }))
console.log("Solo forma (versión anterior):", medir(true))
console.log("Forma + ritmo + largo (actual):", medir(false))
