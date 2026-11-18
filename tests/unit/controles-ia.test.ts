// Controles con IA: lo que se decide sin IA (datos sin completar, veredicto, controles viejos) y lo que se lee de la base.
import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  baseProyecto,
  combinarRevision,
  desactualizado,
  leerControlGuardado,
  pendientesEnTexto,
  type Revision,
} from "@/lib/controles-ia"

const revision = (resultados: Revision["chequeos"][number]["resultado"][], veredicto: Revision["veredicto"] = "lista"): Revision => ({
  veredicto,
  resumen: "x",
  chequeos: resultados.map((resultado, i) => ({ aspecto: i === 0 ? "Datos sin completar" : `Aspecto ${i}`, resultado, detalle: "d" })),
})

describe("pendientesEnTexto", () => {
  it("encuentra [COMPLETAR…] y variables sin reemplazar", () => {
    assert.deepEqual(pendientesEnTexto("Decreto [COMPLETAR: número] del {{ fecha_decreto }} y {{agente}}"), [
      "[COMPLETAR: número]",
      "{{ fecha_decreto }}",
      "{{agente}}",
    ])
  })
  it("el número y la fecha de la resolución se completan al firmar", () => {
    assert.deepEqual(pendientesEnTexto("RESOLUCIÓN N.º {{numero_resolucion}} — {{fecha_resolucion}}"), [])
  })
  it("no repite el mismo marcador", () => {
    assert.equal(pendientesEnTexto("[COMPLETAR] y [COMPLETAR]").length, 1)
  })
})

describe("combinarRevision", () => {
  it("lo que encuentra el control fijo pisa a la IA y obliga a corregir", () => {
    const r = combinarRevision(revision(["ok", "ok"]), ["[COMPLETAR]"])
    assert.equal(r.veredicto, "corregir")
    assert.equal(r.chequeos[0].resultado, "error")
    assert.match(r.chequeos[0].detalle, /\[COMPLETAR\]/)
  })
  it("el veredicto sigue a los chequeos", () => {
    assert.equal(combinarRevision(revision(["ok", "atencion"]), []).veredicto, "revisar")
    assert.equal(combinarRevision(revision(["ok", "ok"], "lista"), []).veredicto, "lista")
    // Si la IA dice corregir sin ningún error marcado, queda en revisar: hay algo que mirar, pero no un error concreto.
    assert.equal(combinarRevision(revision(["ok", "ok"], "corregir"), []).veredicto, "revisar")
  })
  it("agrega el chequeo si la IA lo omitió", () => {
    const sinDatos: Revision = { veredicto: "lista", resumen: "x", chequeos: [{ aspecto: "Agente", resultado: "ok", detalle: "d" }] }
    const r = combinarRevision(sinDatos, ["{{agente}}"])
    assert.equal(r.chequeos.at(-1)?.aspecto, "Datos sin completar")
    assert.equal(r.veredicto, "corregir")
  })
})

describe("lo guardado", () => {
  it("lee un control válido y descarta lo que no lo es", () => {
    const guardado = { tipo: "revision", revision: revision(["ok"]), base: ["p@1"] }
    assert.deepEqual(leerControlGuardado(JSON.stringify(guardado)), guardado)
    assert.equal(leerControlGuardado("{no es json"), null)
    assert.equal(leerControlGuardado(JSON.stringify({ tipo: "revision", base: [] })), null)
    assert.equal(leerControlGuardado(null), null)
  })
  it("avisa cuando cambiaron los documentos o el proyecto", () => {
    assert.equal(desactualizado({ base: ["a", "b"] }, ["b", "a"]), false)
    assert.equal(desactualizado({ base: ["a"] }, ["a", "c"]), true)
    assert.equal(desactualizado(null, ["a"]), false)
    const p = { id: "p", created_at: "2026-11-18T10:00:00Z", updated_at: "2026-11-18T11:00:00Z" }
    assert.equal(desactualizado({ base: [baseProyecto(p)] }, [baseProyecto({ ...p, updated_at: "2026-11-18T12:00:00Z" })]), true)
  })
})
