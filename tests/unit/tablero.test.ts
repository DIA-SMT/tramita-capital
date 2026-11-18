// Lectura de datos del tablero: radiografía de los circuitos, observaciones, texto para la IA y conteo de causas.
import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { armarRadiografia, estadisticasObservaciones, mediana, textoTablero, type DatosTablero } from "@/lib/tablero-datos"
import { contarCausas, leerAnalisisGuardado } from "@/lib/tablero-ia"

const tipos = [
  { id: "a", codigo: "A", nombre: "Trámite A", plazo_dias: 10 },
  { id: "b", codigo: "B", nombre: "Trámite B", plazo_dias: 5 },
  { id: "c", codigo: "C", nombre: "Sin historia", plazo_dias: 5 },
]
const pasos = [
  { tipo_tramite_id: "a", orden: 1, nombre: "Control", area: "Bonificaciones", plazo_horas: 24 },
  { tipo_tramite_id: "a", orden: 2, nombre: "Dictamen", area: "Asesoría", plazo_horas: 72 },
  { tipo_tramite_id: "b", orden: 1, nombre: "Control", area: "Licencias", plazo_horas: 12 },
  { tipo_tramite_id: "c", orden: 1, nombre: "Control", area: "Mesa", plazo_horas: 12 },
]
const tiempos = new Map([
  [
    "a",
    [
      { orden: 1, estadias: 10, mediana_horas: 8, p80_horas: 12 },
      { orden: 2, estadias: 2, mediana_horas: 300, p80_horas: 400 }, // pocos casos: plazo
    ],
  ],
  ["b", [{ orden: 1, estadias: 4, mediana_horas: 100, p80_horas: 150 }]],
  ["c", [{ orden: 1, estadias: 1, mediana_horas: 5, p80_horas: 5 }]],
])

describe("armarRadiografia", () => {
  const filas = armarRadiografia(tipos, pasos, tiempos)
  it("solo trámites con algún paso medido, del más largo al más corto", () => {
    assert.deepEqual(
      filas.map((f) => f.codigo),
      ["B", "A"],
    )
  })
  it("un paso con pocos casos usa su plazo y no compite por el más lento", () => {
    const a = filas.find((f) => f.codigo === "A")!
    assert.deepEqual(
      a.pasos.map((p) => [p.horas, p.medido]),
      [
        [8, true],
        [72, false],
      ],
    )
    assert.equal(a.lento, 1)
    assert.equal(a.totalHoras, 80)
  })
})

describe("observaciones", () => {
  it("cuenta por trámite y mide la respuesta del agente con la primera subsanación posterior", () => {
    const r = estadisticasObservaciones(
      [
        { expediente_id: "e1", tipo_tramite_id: "a", at: "2026-11-01T10:00:00Z" },
        { expediente_id: "e2", tipo_tramite_id: "a", at: "2026-11-02T10:00:00Z" },
        { expediente_id: "e3", tipo_tramite_id: "b", at: "2026-11-03T10:00:00Z" },
      ],
      [
        { expediente_id: "e1", at: "2026-10-30T10:00:00Z" }, // anterior: no cuenta
        { expediente_id: "e1", at: "2026-11-02T10:00:00Z" },
        { expediente_id: "e1", at: "2026-11-05T10:00:00Z" },
        { expediente_id: "e2", at: "2026-11-02T22:00:00Z" },
      ],
      tipos,
    )
    assert.deepEqual(r[0], { codigo: "A", nombre: "Trámite A", observaciones: 2, expedientes: 2, respuestaHoras: 18 })
    assert.equal(r[1].respuestaHoras, null)
  })
  it("mediana", () => {
    assert.equal(mediana([]), null)
    assert.equal(mediana([3, 1, 2]), 2)
    assert.equal(mediana([4, 1, 2, 3]), 2.5)
  })
})

describe("IA del tablero", () => {
  it("el texto para la IA trae cada bloque, sin datos de los agentes", () => {
    const d: DatosTablero = {
      dias: 30,
      resumen: { activos: 3, ingresados_hoy: 1, resueltos_30d: 5, vencidos: 0, urgentes: 1, promedio_dias: 2, linea_base_dias: 35, hojas_evitadas: 10, borradores_ia: 4, borradores_ia_aceptados: 3 },
      impacto: null,
      porTipo: [{ codigo: "A", nombre: "Trámite A", promedio: 2, lineaBase: 35, plazo: 10, resueltos: 5, total: 6 }],
      carga: [{ perfil_id: "p", nombre: "Sofía", area: "Bonificaciones", asignados: 3, fojas_30d: 9 }],
      serie: Array.from({ length: 14 }, (_, i) => ({ dia: `2026-11-${String(i + 1).padStart(2, "0")}`, ingresados: 1, resueltos: 1 })),
      etapas: [],
      circuitos: [],
      radiografia: armarRadiografia(tipos, pasos, tiempos),
      observaciones: [],
    }
    const t = textoTablero(d, new Date("2026-11-18T12:00:00-03:00"))
    for (const bloque of ["<resumen>", "<por_tramite", "<tiempos_por_paso", "<carga_del_equipo", "<ingresados_y_resueltos_por_semana"]) assert.ok(t.includes(bloque), bloque)
    assert.match(t, /2026-11-01 \| 7 \| 7/)
    assert.match(t, /Dictamen \(Asesoría\): medido=no, plazo 72 h/)
    assert.ok(!t.includes("<impacto"))
  })
  it("las causas se cuentan con los ids válidos, cada observación una sola vez", () => {
    const r = contarCausas(
      {
        resumen: "x",
        causas: [
          { causa: "Título sin legalizar", ids: [1, 2, 2, 99], donde: "requisitos", mejora: "m" },
          { causa: "Partida", ids: [2, 3], donde: "formulario", mejora: "m" },
          { causa: "Vacía", ids: [42], donde: "otro", mejora: "m" },
        ],
      },
      [
        { id: 1, tramite: "A" },
        { id: 2, tramite: "B" },
        { id: 3, tramite: "B" },
      ],
    )
    assert.equal(r.total, 3)
    assert.deepEqual(
      r.causas.map((c) => [c.causa, c.cantidad, c.tramites]),
      [
        ["Título sin legalizar", 2, ["A", "B"]],
        ["Partida", 1, ["B"]],
      ],
    )
  })
  it("lee lo guardado y descarta lo que no es un análisis", () => {
    const g = { tipo: "lectura", dias: 30, lectura: { titular: "t", hallazgos: [], limites: [] } }
    assert.deepEqual(leerAnalisisGuardado(JSON.stringify(g)), g)
    assert.equal(leerAnalisisGuardado('{"tipo":"cotejo"}'), null)
    assert.equal(leerAnalisisGuardado("no"), null)
  })
})
