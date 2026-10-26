// Novedades de haberes: período leído de la resolución, propuesta y planilla para Civitas.
import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { periodo, periodoLargo, planillaCSV, propuestaNovedad, vigenciaDeResolucion, type FilaNovedad } from "@/lib/novedades"

describe("vigenciaDeResolucion", () => {
  it("lee el mes escrito", () => {
    assert.equal(vigenciaDeResolucion("Hace lugar a partir de agosto de 2026."), "2026-08")
    assert.equal(vigenciaDeResolucion("A PARTIR DEL MES DE SETIEMBRE DE 2026"), "2026-09")
    assert.equal(vigenciaDeResolucion("a partir de marzo del año 2027"), "2027-03")
  })
  it("lee mes/año y día/mes/año", () => {
    assert.equal(vigenciaDeResolucion("a partir de 08/2026"), "2026-08")
    assert.equal(vigenciaDeResolucion("a partir del 01/08/2026"), "2026-08")
    assert.equal(vigenciaDeResolucion("a partir del 1.9.2026"), "2026-09")
  })
  it("devuelve null si la resolución no dice desde cuándo", () => {
    assert.equal(vigenciaDeResolucion("Hace lugar a lo solicitado."), null)
  })
})

describe("períodos", () => {
  it("formatea mm/aaaa y el nombre del mes", () => {
    assert.equal(periodo("2026-08-01"), "08/2026")
    assert.equal(periodoLargo("2026-08"), "agosto de 2026")
  })
})

describe("propuestaNovedad", () => {
  const entrada = (codigo: string, nombre: string, contenido: string | null) => ({
    expediente: { datos: { hijo: "Juan", nacimiento: "2026-07-15" } },
    tipo: {
      codigo,
      nombre,
      formulario: [
        { clave: "hijo", etiqueta: "Hijo/a", tipo: "texto" },
        { clave: "nacimiento", etiqueta: "Fecha de nacimiento", tipo: "fecha" },
      ],
    },
    fojas: [
      { tipo: "presentacion", titulo: "Presentación", contenido: "", firmada_at: "2026-10-01T12:00:00Z", datos: {} },
      {
        tipo: "resolucion",
        titulo: "Resolución — Res. N.º 12/DCH/2026",
        contenido,
        firmada_at: "2026-10-20T15:00:00Z",
        datos: { protocolo: { numero: "12/DCH/2026", fecha: "20/10/2026" } },
      },
    ],
  })
  const agente = { nombre: "Ana", apellido: "Paz", legajo: "10234" }

  it("propone el alta con el período de la resolución", () => {
    const p = propuestaNovedad(entrada("ASIG-HIJO", "Asignación por hijo/a", "Hace lugar a partir de agosto de 2026."), agente)
    assert.equal(p.movimiento, "alta")
    assert.equal(p.vigencia, "2026-08")
    assert.equal(p.vigenciaLeida, true)
    assert.equal(p.resolucion?.numero, "12/DCH/2026")
    assert.equal(p.agente, "Ana Paz")
    assert.deepEqual(Object.keys(p.detalle), ["Hijo/a", "Fecha de nacimiento"])
  })
  it("propone la baja para los trámites de baja", () => {
    assert.equal(propuestaNovedad(entrada("BAJA-DIVORCIO", "Baja por divorcio", ""), agente).movimiento, "baja")
  })
  it("sin período en el texto toma el mes de la firma y lo avisa", () => {
    const p = propuestaNovedad(entrada("ASIG-HIJO", "Asignación por hijo/a", "Hace lugar."), agente)
    assert.equal(p.vigencia, "2026-10")
    assert.equal(p.vigenciaLeida, false)
  })
})

describe("planillaCSV", () => {
  const fila: FilaNovedad = {
    id: "1",
    estado: "pendiente",
    movimiento: "alta",
    concepto: "Asignación por hijo/a",
    codigo: "ASIG-HIJO",
    vigenciaDesde: "2026-08-01",
    vigenciaHasta: null,
    detalle: { "Hijo/a": "Juan" },
    observaciones: null,
    agente: '=HYPERLINK("http://malicioso")',
    legajo: "10234",
    cuil: "27-30111222-4",
    expediente: { id: null, numero: "CH-2026-000001" },
    resolucion: { numero: "12/DCH/2026", fecha: "2026-10-20" },
    registradaAt: "2026-10-21T12:00:00Z",
    cargadaAt: null,
    referencia: null,
  }
  const csv = planillaCSV([fila])

  it("abre en Excel en español: BOM, punto y coma y CRLF", () => {
    assert.ok(csv.startsWith("﻿"))
    assert.ok(csv.endsWith("\r\n"))
    assert.equal(csv.split("\r\n")[0].split(";").length, 16)
  })
  it("neutraliza fórmulas y escapa comillas", () => {
    const linea = csv.split("\r\n")[1]
    assert.ok(linea.includes(`"'=HYPERLINK(""http://malicioso"")"`))
    assert.ok(!linea.includes(";=HYPERLINK"))
  })
  it("escribe períodos y fechas como los lee Liquidación", () => {
    const celdas = csv.split("\r\n")[1].split(";")
    assert.equal(celdas[6], "08/2026")
    assert.equal(celdas[10], "20/10/2026")
  })
})
