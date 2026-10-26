// Comparador de firmas (espejo en TypeScript de la base) con firmas sintéticas.
import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { crudoDeTrazos, evaluar, patronDeCrudo, patronDeTrazos, registroDe, REGLAS, variaciones, visibleDeCrudo } from "@/lib/firma-trazo"
import { firmar, persona, sembrar } from "../../scripts/firma-sintetica"

describe("patrón de la firma", () => {
  it("un trazo demasiado corto no tiene patrón", () => {
    assert.equal(patronDeCrudo([[[0, 0, 0, -1], [1, 1, 10, -1]]]), null)
  })
  it("el patrón tiene 64 puntos de forma (x, y, dirección) y 64 de ritmo", () => {
    sembrar(3)
    const p = patronDeTrazos(firmar(persona(), "genuina"))!
    assert.equal(p.v.length, 64 * 4)
    assert.equal(p.r.length, 64)
    assert.equal(p.trazos, 3)
    assert.ok(p.duracion > 0)
  })
  it("el crudo viaja con tiempos relativos y presión -1 si el dispositivo no la informa", () => {
    const crudo = crudoDeTrazos([[{ x: 10.04, y: 20, t: 500 }, { x: 11, y: 21, t: 512, p: 0.456 }]])
    assert.deepEqual(crudo, [[[10, 20, 0, -1], [11, 21, 12, 0.46]]])
  })
  it("la firma visible se normaliza a alto 100", () => {
    sembrar(3)
    const visible = visibleDeCrudo(crudoDeTrazos(firmar(persona(), "genuina")))!
    assert.equal(visible.trazos.length, 3)
    assert.ok(visible.ancho > 0)
  })
})

describe("comparación", () => {
  // Varias personas sintéticas: la genuina pasa, la imitación y la copia exacta no.
  for (const semilla of [11, 23, 42]) {
    it(`persona sintética ${semilla}`, () => {
      sembrar(semilla)
      const per = persona()
      const muestras = [0, 1, 2].map(() => patronDeTrazos(firmar(per, "genuina"))!)
      const v = variaciones(muestras)
      assert.ok(v.forma <= REGLAS.variacionMaxima.forma && v.ritmo <= REGLAS.variacionMaxima.ritmo, "las muestras son consistentes")
      const reg = registroDe(muestras)
      assert.ok(reg.umbralForma >= REGLAS.forma.piso && reg.umbralForma <= REGLAS.forma.techo)
      assert.ok(reg.umbralRitmo >= REGLAS.ritmo.piso && reg.umbralRitmo <= REGLAS.ritmo.techo)

      assert.equal(evaluar(patronDeTrazos(firmar(per, "genuina"))!, reg).coincide, true, "la firma genuina coincide")
      assert.equal(evaluar(patronDeTrazos(firmar(per, "imitacion"))!, reg).coincide, false, "la imitación no coincide")
      assert.equal(evaluar(patronDeTrazos(firmar(persona(), "genuina"))!, reg).coincide, false, "otra persona no coincide")
      const copia = evaluar(muestras[0], reg)
      assert.equal(copia.copia, true, "una muestra reenviada es una copia exacta")
      assert.equal(copia.coincide, false)
    })
  }
})
