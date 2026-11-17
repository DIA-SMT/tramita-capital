// Recorrido del cambio de domicilio: lo que se guarda, la distancia y el resumen de la presentación.
import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { distanciaKm, guardarPuntos, leerPuntos, MAX_PUNTOS, resumenRecorrido, type Punto } from "@/lib/recorrido"

const CASA: Punto = [-26.83035, -65.20381]
const TRABAJO: Punto = [-26.82135, -65.20381] // 1 km al norte, más o menos

describe("recorrido", () => {
  it("guarda con cinco decimales y se vuelve a leer igual", () => {
    const json = guardarPuntos([[-26.830351234, -65.203819876], TRABAJO])
    assert.deepEqual(leerPuntos(json), [[-26.83035, -65.20382], TRABAJO])
  })

  it("descarta lo que no es un punto y no pasa del tope", () => {
    assert.deepEqual(leerPuntos("no es json"), [])
    assert.deepEqual(leerPuntos('[[1,2],["a",3],[91,0],[1]]'), [[1, 2]])
    const muchos = JSON.stringify(Array.from({ length: MAX_PUNTOS + 10 }, () => CASA))
    assert.equal(leerPuntos(muchos).length, MAX_PUNTOS)
    assert.ok(guardarPuntos(Array.from({ length: MAX_PUNTOS }, () => CASA)).length < 4000, "entra en un dato del formulario")
  })

  it("mide la distancia sumando los tramos", () => {
    assert.equal(distanciaKm([CASA]), 0)
    const d = distanciaKm([CASA, TRABAJO])
    assert.ok(d > 0.99 && d < 1.01, `un kilómetro, dio ${d}`)
    assert.ok(Math.abs(distanciaKm([CASA, TRABAJO, CASA]) - 2 * d) < 1e-9)
  })

  it("el resumen queda vacío sin recorrido, para que el campo obligatorio no se dé por completo", () => {
    assert.equal(resumenRecorrido([CASA]), "")
    assert.equal(resumenRecorrido([], "  "), "")
    assert.match(resumenRecorrido([CASA, TRABAJO]), /^Marcado en el mapa: 1,0 km, 2 puntos/)
    assert.equal(resumenRecorrido([], "Av. Mate de Luna y 24 de Septiembre"), "Calles: Av. Mate de Luna y 24 de Septiembre")
  })
})
