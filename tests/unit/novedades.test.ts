// Novedades de haberes: período leído de la resolución, propuesta y planilla para Civitas.
import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { guardarHijos } from "@/lib/hijos"
import {
  hastaDeLinea,
  periodo,
  periodoLargo,
  planillaCSV,
  propuestaNovedad,
  sinRegistrar,
  textoNovedad,
  textoNovedades,
  vigenciaDeResolucion,
  type FilaNovedad,
} from "@/lib/novedades"

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
  it("sin campo de hijos/as propone una sola línea, sin item", () => {
    const p = propuestaNovedad(entrada("BAJA-DIVORCIO", "Baja por divorcio", ""), agente)
    assert.equal(p.lineas.length, 1)
    assert.equal(p.lineas[0].item, "")
    assert.equal(p.lineas[0].codigo, "BAJA-DIVORCIO")
    assert.deepEqual(p.lineas[0].detalle, p.detalle)
  })
})

describe("varias altas en un expediente", () => {
  const hijos = [
    { nombre: "Paz, Juan", dni: "30.111.222", nacimiento: "2015-03-02" },
    { nombre: "Paz, Lola", dni: "30111333", nacimiento: "2018-11-20" },
  ]
  const entrada = (familiaNumerosa: string, adicionales?: { codigo: string; nombre: string }[]) => ({
    expediente: {
      datos: {
        hijos: "Paz, Juan, DNI 30.111.222, nacido/a el 02/03/2015; Paz, Lola, DNI 30111333, nacido/a el 20/11/2018",
        hijos_lista: guardarHijos(hijos),
        familia_numerosa: familiaNumerosa,
        progenitor: "Gómez, Luis",
      },
    },
    tipo: {
      codigo: "ASIG-HIJO",
      nombre: "Asignación familiar por hijo/a",
      formulario: [
        { clave: "hijos", etiqueta: "Hijos/as", tipo: "hijos" },
        { clave: "familia_numerosa", etiqueta: "¿Pedís también la asignación por familia numerosa?", tipo: "seleccion" },
        { clave: "progenitor", etiqueta: "Otro progenitor", tipo: "texto" },
      ],
    },
    fojas: [],
    adicionales,
  })
  const agente = { nombre: "Ana", apellido: "Paz", legajo: "10234" }
  const familiaNumerosa = [{ codigo: "ASIG-FAM-NUM", nombre: "Asignación familiar por familia numerosa" }]

  it("propone una línea por hijo/a, con sus datos y los comunes", () => {
    const p = propuestaNovedad(entrada("No", familiaNumerosa), agente)
    assert.deepEqual(
      p.lineas.map((l) => l.item),
      ["hijo:30111222", "hijo:30111333"],
    )
    assert.deepEqual(p.lineas[0].detalle, { "Hijo/a": "Paz, Juan", DNI: "30.111.222", "Fecha de nacimiento": "02/03/2015", "Otro progenitor": "Gómez, Luis" })
    assert.ok(p.lineas.every((l) => l.codigo === "ASIG-HIJO"))
  })
  it("suma la familia numerosa si se pidió y el trámite la admite", () => {
    const p = propuestaNovedad(entrada("Sí", familiaNumerosa), agente)
    assert.equal(p.lineas.length, 3)
    const fn = p.lineas[2]
    assert.equal(fn.item, "familia_numerosa")
    assert.equal(fn.codigo, "ASIG-FAM-NUM")
    assert.equal(fn.concepto, "Asignación familiar por familia numerosa")
    assert.equal(fn.detalle["En relación a"], "Paz, Juan (DNI 30.111.222); Paz, Lola (DNI 30111333)")
  })
  it("sin la familia numerosa entre las altas del trámite, no la propone", () => {
    assert.equal(propuestaNovedad(entrada("Sí"), agente).lineas.length, 2)
  })
  it("el texto de la foja numera las líneas; con una sola es el de siempre", () => {
    const p = propuestaNovedad(entrada("Sí", familiaNumerosa), agente)
    const varias = textoNovedades(p, p.lineas, "alta", "2026-11")
    assert.match(varias, /dispone las siguientes novedades del\/de la agente Ana Paz, legajo N\.º 10234, a partir del período 11\/2026:/)
    assert.match(varias, /^1\. Alta de asignación familiar por hijo\/a \(Hijo\/a: Paz, Juan; DNI: 30\.111\.222; Fecha de nacimiento: 02\/03\/2015\)\.$/m)
    assert.match(varias, /^3\. Alta de asignación familiar por familia numerosa \(En relación a: /m)
    // Lo que comparten todas las líneas va una sola vez.
    assert.match(varias, /Datos comunes:\n- Otro progenitor: Gómez, Luis/)
    assert.equal(varias.match(/Gómez, Luis/g)?.length, 1)
    const una = { ...p, concepto: p.lineas[1].concepto, detalle: p.lineas[1].detalle }
    assert.equal(textoNovedades(p, [p.lineas[1]], "alta", "2026-11"), textoNovedad(una, "alta", "2026-11"))
  })
  it("después de registrar una parte, propone solo lo que falta", () => {
    const p = propuestaNovedad(entrada("Sí", familiaNumerosa), agente)
    assert.deepEqual(
      sinRegistrar(p, [{ item: "hijo:30111222" }, { item: "hijo:30111333" }])?.lineas.map((l) => l.item),
      ["familia_numerosa"],
    )
    assert.equal(sinRegistrar(p, p.lineas), null)
    // Una novedad de antes de las líneas cubre todo el expediente.
    assert.equal(sinRegistrar(p, [{ item: "" }]), null)
  })
})

describe("nacimiento y asignación por hijo/a en un expediente", () => {
  const mellizos = [
    { nombre: "Paz, Tomás", dni: "60.111.222", nacimiento: "2026-10-02" },
    { nombre: "Paz, Clara", dni: "60111223", nacimiento: "2026-10-02" },
  ]
  const entrada = (porHijo: string, familiaNumerosa = "No") => ({
    expediente: {
      datos: {
        hijos: "Paz, Tomás, DNI 60.111.222, nacido/a el 02/10/2026; Paz, Clara, DNI 60111223, nacido/a el 02/10/2026",
        hijos_lista: guardarHijos(mellizos),
        asignacion_hijo: porHijo,
        familia_numerosa: familiaNumerosa,
        progenitor: "Gómez, Luis",
      },
    },
    tipo: {
      codigo: "ASIG-NACIMIENTO",
      nombre: "Asignación familiar por nacimiento (pago único)",
      formulario: [
        { clave: "hijos", etiqueta: "Hijos/as", tipo: "hijos" },
        { clave: "asignacion_hijo", etiqueta: "¿Pedís también la asignación mensual por hijo/a?", tipo: "seleccion" },
        { clave: "familia_numerosa", etiqueta: "¿Pedís también la asignación por familia numerosa?", tipo: "seleccion" },
        { clave: "progenitor", etiqueta: "Otro progenitor", tipo: "texto" },
      ],
    },
    fojas: [],
    adicionales: [
      { codigo: "ASIG-HIJO", nombre: "Asignación familiar por hijo/a" },
      { codigo: "ASIG-FAM-NUM", nombre: "Asignación familiar por familia numerosa" },
    ],
  })
  const agente = { nombre: "Ana", apellido: "Paz", legajo: "10234" }

  it("por cada hijo/a, un pago único por nacimiento y otra línea mensual por hijo/a", () => {
    const p = propuestaNovedad(entrada("Sí"), agente)
    assert.deepEqual(
      p.lineas.map((l) => [l.item, l.codigo, !!l.pagoUnico]),
      [
        ["hijo:60111222", "ASIG-NACIMIENTO", true],
        ["hijo:60111223", "ASIG-NACIMIENTO", true],
        ["por_hijo:60111222", "ASIG-HIJO", false],
        ["por_hijo:60111223", "ASIG-HIJO", false],
      ],
    )
    // Los pedidos de otras asignaciones no viajan como datos de la novedad.
    assert.deepEqual(p.lineas[2].detalle, { "Hijo/a": "Paz, Tomás", DNI: "60.111.222", "Fecha de nacimiento": "02/10/2026", "Otro progenitor": "Gómez, Luis" })
  })
  it("sin la asignación por hijo/a, solo el pago único; con la familia numerosa, también esa", () => {
    assert.deepEqual(
      propuestaNovedad(entrada("No"), agente).lineas.map((l) => l.item),
      ["hijo:60111222", "hijo:60111223"],
    )
    assert.deepEqual(
      propuestaNovedad(entrada("Sí", "Sí"), agente).lineas.map((l) => l.item),
      ["hijo:60111222", "hijo:60111223", "por_hijo:60111222", "por_hijo:60111223", "familia_numerosa"],
    )
  })
  it("el pago único rige un solo período; las mensuales, el hasta elegido", () => {
    assert.equal(hastaDeLinea({ pagoUnico: true }, "2026-11", null), "2026-11")
    assert.equal(hastaDeLinea({ pagoUnico: true }, "2026-11", "2027-03"), "2026-11")
    assert.equal(hastaDeLinea({}, "2026-11", null), null)
    assert.equal(hastaDeLinea({}, "2026-11", "2027-03"), "2027-03")
  })
  it("el texto dice qué es por única vez", () => {
    const p = propuestaNovedad(entrada("Sí"), agente)
    const ambas = textoNovedades(p, p.lineas, "alta", "2026-11")
    assert.match(ambas, /a partir del período 11\/2026:/)
    assert.match(ambas, /^1\. Alta de asignación familiar por nacimiento \(pago único\), por única vez en el período 11\/2026 \(Hijo\/a: Paz, Tomás/m)
    assert.match(ambas, /^3\. Alta de asignación familiar por hijo\/a \(Hijo\/a: Paz, Tomás/m)
    const solo = textoNovedades(p, p.lineas.slice(0, 2), "alta", "2026-11")
    assert.match(solo, /por única vez, en el período 11\/2026:/)
    assert.doesNotMatch(solo, /^1\..*por única vez/m)
    assert.match(textoNovedades(p, [p.lineas[0]], "alta", "2026-11"), /, por única vez, en el período 11\/2026\./)
  })
  it("el matrimonio, sin hijos/as, es una sola línea de pago único", () => {
    const p = propuestaNovedad(
      { expediente: { datos: {} }, tipo: { codigo: "ASIG-MATRIMONIO", nombre: "Asignación familiar por matrimonio (pago único)", formulario: [] }, fojas: [] },
      agente,
    )
    assert.equal(p.lineas.length, 1)
    assert.equal(p.lineas[0].pagoUnico, true)
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
