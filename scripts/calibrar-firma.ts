// Calibración del comparador de firmas con firmas sintéticas (no reemplaza pruebas con firmas reales).
// Uso: npx tsx scripts/calibrar-firma.ts
// Resultado de referencia (250 personas sintéticas): solo forma acepta ~77 % de imitaciones hábiles;
// forma + ritmo + largo (reglas actuales) ~6 %, con ~0,6 % de genuinas rechazadas y 0 % de otra persona.
// Las firmas genuinas, de otra persona e imitaciones hábiles salen de scripts/firma-sintetica.ts.
import { evaluar, patronDeTrazos, registroDe, REGLAS, type Trazo } from "../src/lib/firma-trazo"
import { firmar, persona } from "./firma-sintetica"

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
