// Planilla de Civitas (migración 002000): separadores, encabezados, valores, fechas y filas que se descartan.
import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { celdasCSV, decodificar, fechaCivitas, leerPlanillaCivitas, leerResultadoImportacion, MAX_FILAS_CIVITAS, PLANILLA_EJEMPLO } from "@/lib/civitas"

const leer = (texto: string) => {
  const r = leerPlanillaCivitas(texto)
  if (!r.ok) throw new Error(r.error)
  return r
}

describe("celdas del CSV", () => {
  it("respeta comillas, comillas dobles y saltos de línea de Windows", () => {
    assert.deepEqual(celdasCSV('a;"b;c";"dice ""hola"""\r\n1;2;3', ";"), [
      ["a", "b;c", 'dice "hola"'],
      ["1", "2", "3"],
    ])
  })
})

describe("encabezados y separadores", () => {
  it("la planilla de ejemplo se lee entera", () => {
    const r = leer(PLANILLA_EJEMPLO)
    assert.deepEqual(r.columnas, ["legajo", "cuil", "liquida", "fecha_ingreso", "situacion_revista"])
    assert.deepEqual(r.filas, [{ legajo: "10234", cuil: "27-30111222-4", liquida: true, fecha_ingreso: "2014-03-03", situacion_revista: "planta permanente" }])
  })
  it("reconoce otros nombres, sin acentos, con coma o tabulación", () => {
    const coma = leer("Nro. de Legajo,Liquida SI/NO,Situacion de Revista\n00123,si,Contratado\n")
    assert.deepEqual(coma.columnas, ["legajo", "liquida", "situacion_revista"])
    assert.equal(coma.filas[0].legajo, "00123")
    const tab = leer("CUIL\tFecha de alta\n20-12345678-9\t1/2/2010\n")
    assert.deepEqual(tab.filas[0], { legajo: null, cuil: "20-12345678-9", liquida: null, fecha_ingreso: "2010-02-01", situacion_revista: null })
  })
  it("sin legajo ni CUIL, o sin datos, no se puede importar", () => {
    assert.equal(leerPlanillaCivitas("Nombre;Liquida\nAna;SI").ok, false)
    assert.equal(leerPlanillaCivitas("Legajo;Nombre\n1;Ana").ok, false)
    assert.equal(leerPlanillaCivitas("").ok, false)
  })
  it("tiene un máximo de filas", () => {
    const muchas = "Legajo;Liquida\n" + Array.from({ length: MAX_FILAS_CIVITAS + 1 }, (_, i) => `${i + 1};SI`).join("\n")
    assert.equal(leerPlanillaCivitas(muchas).ok, false)
  })
})

describe("valores", () => {
  it("«Liquida» admite SÍ/NO, S/N, 1/0 y X", () => {
    const r = leer("Legajo;Liquida\n1;SÍ\n2;no\n3;X\n4;0\n5;\n")
    assert.deepEqual(
      r.filas.map((f) => f.liquida),
      [true, false, true, false],
    )
    assert.equal(r.vacias, 1)
  })
  it("una baja cargada o en curso corta el «Liquida SÍ»", () => {
    const r = leer("Legajo;Liquida;Baja\n1;SI;15/10/2026\n2;SI;NO\n3;SI;\n")
    assert.deepEqual(
      r.filas.map((f) => f.liquida),
      [false, true, true],
    )
  })
  it("la situación de revista en mayúsculas pasa a minúsculas", () => {
    assert.equal(leer("Legajo;Revista\n1;PLANTA PERMANENTE\n").filas[0].situacion_revista, "planta permanente")
    assert.equal(leer("Legajo;Revista\n1;Planta Permanente\n").filas[0].situacion_revista, "Planta Permanente")
  })
  it("las filas con un dato ilegible se descartan y se informan con su línea", () => {
    const r = leer("Legajo;Liquida;Fecha de ingreso\n1;tal vez;\n2;SI;31/02/2020\n3;SI;01/03/2020\n")
    assert.deepEqual(
      r.errores.map((e) => e.linea),
      [2, 3],
    )
    assert.equal(r.filas.length, 1)
  })
  it("el mismo agente dos veces: vale la última fila", () => {
    const r = leer("Legajo;Liquida\n0042;SI\n42;NO\n")
    assert.equal(r.repetidas, 1)
    assert.deepEqual(
      r.filas.map((f) => [f.legajo, f.liquida]),
      [["42", false]],
    )
  })
})

describe("fechas", () => {
  it("lee los formatos de Excel en español y el número de serie", () => {
    assert.equal(fechaCivitas("03/03/2014"), "2014-03-03")
    assert.equal(fechaCivitas("3-3-2014"), "2014-03-03")
    assert.equal(fechaCivitas("2014-03-03"), "2014-03-03")
    assert.equal(fechaCivitas("41701"), "2014-03-03")
  })
  it("rechaza lo que no es una fecha", () => {
    assert.equal(fechaCivitas("31/02/2020"), null)
    assert.equal(fechaCivitas("ayer"), null)
    assert.equal(fechaCivitas("03/03/14"), null)
  })
})

describe("archivo", () => {
  it("lee UTF-8 y, si no, Windows-1252", () => {
    assert.equal(decodificar(new TextEncoder().encode("﻿Situación").buffer as ArrayBuffer), "Situación")
    const latin = new Uint8Array([0x53, 0x69, 0x74, 0x75, 0x61, 0x63, 0x69, 0xf3, 0x6e])
    assert.equal(decodificar(latin.buffer), "Situación")
  })
  it("lee lo que devuelve la base", () => {
    assert.deepEqual(leerResultadoImportacion({ filas: 3, actualizados: 2, sin_coincidencia: 1, no_encontrados: ["999"] }), {
      filas: 3,
      actualizados: 2,
      sinCoincidencia: 1,
      noEncontrados: ["999"],
    })
    assert.equal(leerResultadoImportacion(null), null)
  })
})
