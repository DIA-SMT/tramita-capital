// Campo "hijos" del formulario: lista guardada, resumen de la presentación y DNI de la línea de la novedad.
import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { MAX_HIJOS, dniDigitos, guardarHijos, hijoCompleto, hijoVacio, leerHijos, resumenHijos } from "@/lib/hijos"

const juan = { nombre: "Paz, Juan", dni: "30.111.222", nacimiento: "2015-03-02" }
const lola = { nombre: "Paz, Lola", dni: "30111333", nacimiento: "2018-11-20" }

describe("lista de hijos/as", () => {
  it("se guarda y se vuelve a leer igual", () => {
    assert.deepEqual(leerHijos(guardarHijos([juan, lola])), [juan, lola])
  })
  it("tolera datos rotos o ajenos", () => {
    assert.deepEqual(leerHijos(null), [])
    assert.deepEqual(leerHijos("no es json"), [])
    assert.deepEqual(leerHijos('{"nombre":"x"}'), [])
    assert.deepEqual(leerHijos('[{"nombre":" Ana ","dni":5},null]'), [{ nombre: "Ana", dni: "", nacimiento: "" }])
  })
  it("no pasa del tope", () => {
    const muchos = Array.from({ length: MAX_HIJOS + 3 }, (_, i) => ({ ...juan, dni: String(i) }))
    assert.equal(leerHijos(guardarHijos(muchos)).length, MAX_HIJOS)
  })
})

describe("resumenHijos", () => {
  it("lista cada hijo/a con su DNI y su fecha de nacimiento", () => {
    assert.equal(resumenHijos([juan, lola]), "Paz, Juan, DNI 30.111.222, nacido/a el 02/03/2015; Paz, Lola, DNI 30111333, nacido/a el 20/11/2018")
  })
  it("ignora las filas vacías", () => {
    assert.equal(resumenHijos([juan, { nombre: "", dni: "", nacimiento: "" }]), "Paz, Juan, DNI 30.111.222, nacido/a el 02/03/2015")
  })
  it("queda vacío si falta un dato, así el campo obligatorio no se da por completo", () => {
    assert.equal(resumenHijos([juan, { ...lola, nacimiento: "" }]), "")
    assert.equal(resumenHijos([]), "")
  })
})

describe("ayudantes", () => {
  it("completo y vacío", () => {
    assert.equal(hijoCompleto(juan), true)
    assert.equal(hijoCompleto({ ...juan, nacimiento: "02/03/2015" }), false)
    assert.equal(hijoVacio({ nombre: " ", dni: "", nacimiento: "" }), true)
  })
  it("el DNI de la línea, solo dígitos", () => {
    assert.equal(dniDigitos("30.111.222"), "30111222")
  })
})
