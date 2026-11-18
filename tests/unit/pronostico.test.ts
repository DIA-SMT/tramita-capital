// Pronóstico de un expediente: historia de los pasos, plazos del circuito, lo que ya lleva y el riesgo de vencer.
import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { entradaAlPaso, pronosticar, rangoFechas, tiemposPorTramite, type PasoParaPronostico } from "@/lib/pronostico"

const H = 3_600_000
const AHORA = Date.parse("2026-11-18T12:00:00-03:00")
const pasos: PasoParaPronostico[] = [
  { orden: 1, nombre: "Control", accion: "analisis", plazo_horas: 24 },
  { orden: 2, nombre: "Dictamen", accion: "dictamen", plazo_horas: 72 },
  { orden: 3, nombre: "Firma", accion: "firma", plazo_horas: 24 },
  { orden: 4, nombre: "Novedad", accion: "liquidacion", plazo_horas: 24 },
]
const base = { pasos, tiempos: null, pasoActual: 1, enPasoDesde: null, estado: "en_tramite" as const, venceAt: null, plazoDias: 10, ahora: AHORA }
const horasHasta = (iso: string) => (Date.parse(iso) - AHORA) / H

describe("pronosticar", () => {
  it("sin historia usa los plazos del circuito, hasta la firma", () => {
    const p = pronosticar(base)!
    assert.equal(p.meta, "resolucion")
    assert.equal(p.base, "plazos")
    assert.deepEqual(p.pasos.map((x) => x.orden), [1, 2, 3])
    assert.equal(horasHasta(p.fecha), 24 + 72 + 24)
    assert.equal(horasHasta(p.tarde), (24 + 72 + 24) * 1.5)
  })
  it("con historia suficiente usa la mediana y el percentil 80", () => {
    const tiempos = [
      { orden: 1, estadias: 5, mediana_horas: 10, p80_horas: 20 },
      { orden: 2, estadias: 2, mediana_horas: 1, p80_horas: 2 }, // pocos casos: plazo del paso
      { orden: 3, estadias: 9, mediana_horas: 6, p80_horas: 8 },
    ]
    const p = pronosticar({ ...base, tiempos })!
    assert.equal(p.base, "mixta")
    assert.equal(p.casos, 5)
    assert.equal(horasHasta(p.fecha), 10 + 72 + 6)
    assert.deepEqual(p.pasos.map((x) => x.desde), ["historia", "plazo", "historia"])
  })
  it("descuenta lo que ya lleva en el paso, pero siempre deja un cuarto", () => {
    const tiempos = [{ orden: 3, estadias: 9, mediana_horas: 40, p80_horas: 60 }]
    const p = pronosticar({ ...base, tiempos, pasoActual: 3, enPasoDesde: new Date(AHORA - 30 * H).toISOString() })!
    assert.equal(horasHasta(p.fecha), 10)
    assert.equal(horasHasta(p.tarde), 30)
    const vencido = pronosticar({ ...base, tiempos, pasoActual: 3, enPasoDesde: new Date(AHORA - 100 * H).toISOString() })!
    assert.equal(horasHasta(vencido.fecha), 10)
  })
  it("sin firma por delante, estima hasta el último paso", () => {
    const p = pronosticar({ ...base, pasoActual: 4 })!
    assert.equal(p.meta, "cierre")
    assert.equal(p.pasos.length, 1)
  })
  it("el riesgo compara con el vencimiento", () => {
    const vence = (h: number) => new Date(AHORA + h * H).toISOString()
    assert.equal(pronosticar({ ...base, venceAt: vence(200) })!.riesgo, "en_plazo")
    assert.equal(pronosticar({ ...base, venceAt: vence(150) })!.riesgo, "justo")
    assert.equal(pronosticar({ ...base, venceAt: vence(100) })!.riesgo, "fuera")
    assert.equal(pronosticar({ ...base, venceAt: vence(-1) })!.riesgo, null)
  })
  it("solo para expedientes en curso", () => {
    assert.equal(pronosticar({ ...base, estado: "resuelto" }), null)
    assert.equal(pronosticar({ ...base, pasos: [] }), null)
    assert.equal(pronosticar({ ...base, estado: "observado" })!.esperaAgente, true)
  })
})

describe("ayudantes", () => {
  it("la entrada al paso es el último pase que cambió de paso", () => {
    const movs = [
      { paso_desde: null, paso_hacia: 1, created_at: "2026-11-01T10:00:00Z" },
      { paso_desde: 1, paso_hacia: 2, created_at: "2026-11-02T10:00:00Z" },
      { paso_desde: 2, paso_hacia: 2, created_at: "2026-11-03T10:00:00Z" },
    ]
    assert.equal(entradaAlPaso(movs, 2), "2026-11-02T10:00:00Z")
    assert.equal(entradaAlPaso(movs, 3), null)
  })
  it("agrupa los tiempos por trámite y los pasa a números", () => {
    const m = tiemposPorTramite([{ tipo_tramite_id: "a", orden: 1, estadias: "4", mediana_horas: "12.5", p80_horas: "20.0" }])
    assert.deepEqual(m.get("a"), [{ tipo_tramite_id: "a", orden: 1, estadias: 4, mediana_horas: 12.5, p80_horas: 20 }])
  })
  it("el rango de fechas se lee en castellano", () => {
    assert.equal(rangoFechas("2026-11-24T15:00:00Z", "2026-11-24T20:00:00Z"), "el 24 de noviembre")
    assert.equal(rangoFechas("2026-11-24T15:00:00Z", "2026-11-27T15:00:00Z"), "entre el 24 y el 27 de noviembre")
    assert.equal(rangoFechas("2026-11-30T15:00:00Z", "2026-12-02T15:00:00Z"), "entre el 30 de noviembre y el 2 de diciembre")
  })
})
