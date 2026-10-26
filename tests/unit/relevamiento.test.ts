// Interpretación de los documentos del relevamiento: cómo se produce cada uno y si ya está.
import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { estadoDocumento, estaPresente, formaDeGenerar, normalizar } from "@/lib/relevamiento"

describe("formaDeGenerar", () => {
  it("dictámenes y resoluciones se redactan con IA", () => {
    assert.deepEqual(formaDeGenerar("PROYECTO DE DICTAMEN"), { tipo: "ia", documento: "dictamen", etiqueta: "Redactar dictamen" })
    assert.equal(formaDeGenerar("Proyecto de resolución").tipo, "ia")
  })
  it("la resolución firmada se firma y la protocolización es automática", () => {
    assert.equal(formaDeGenerar("RESOLUCIÓN FIRMADA").tipo, "firma")
    assert.equal(formaDeGenerar("PROTOCOLIZACIÓN").tipo, "automatico")
  })
  it("lo que viene de Civitas se adjunta y el desglose es la novedad de haberes", () => {
    assert.deepEqual(formaDeGenerar("Foja de servicio"), { tipo: "adjunto", clave: "foja_servicios", etiqueta: "Adjuntar", origen: "Civitas" })
    assert.equal(formaDeGenerar("NOTA DE DESGLOSE").tipo, "novedad")
  })
  it("normaliza acentos y signos", () => {
    assert.equal(normalizar("  Resolución   N.º 12 "), "RESOLUCION N 12")
  })
})

describe("estado de lo que produce la oficina", () => {
  const vacio = { documentos: [], fojas: [], etiquetasRequisitos: {} }

  it("falta si no hay foja ni documento", () => {
    assert.equal(estadoDocumento("DICTAMEN", vacio), "falta")
    assert.equal(estaPresente("FORMULARIO", vacio), false)
  })
  it("un dictamen en borrador está en borrador; firmado, listo", () => {
    const borrador = { ...vacio, fojas: [{ tipo: "dictamen" as const, titulo: "Dictamen", firmada: false }] }
    assert.equal(estadoDocumento("DICTAMEN", borrador), "borrador")
    const firmado = { ...vacio, fojas: [{ tipo: "dictamen" as const, titulo: "Dictamen", firmada: true }] }
    assert.equal(estadoDocumento("DICTAMEN", firmado), "listo")
  })
  it("el proyecto de resolución en borrador cuenta como listo (lo firma la Dirección)", () => {
    const p = { ...vacio, fojas: [{ tipo: "resolucion" as const, titulo: "Resolución", firmada: false }] }
    assert.equal(estadoDocumento("PROYECTO DE RESOLUCION", p), "listo")
    assert.equal(estadoDocumento("RESOLUCION FIRMADA", p), "borrador")
  })
  it("el formulario en papel es la presentación digital", () => {
    const p = { ...vacio, fojas: [{ tipo: "presentacion" as const, titulo: "Presentación", firmada: true }] }
    assert.equal(estaPresente("FORMULARIO 14", p), true)
  })
  it("un adjunto cuenta si se cargó con su requisito", () => {
    const p = { ...vacio, documentos: [{ requisito_clave: "foja_servicios", nombre_archivo: "foja.pdf" }] }
    assert.equal(estadoDocumento("FOJA DE SERVICIO", p), "listo")
  })
})
