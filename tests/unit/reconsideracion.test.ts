// Plazo de la reconsideración: lo calcula la base (plazo_reconsideracion); acá se prueba cómo se lee y se muestra.
import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { fechaDia, leerPlazo } from "@/lib/reconsideracion"
import { CATALOGO_SEMILLA } from "@/lib/semilla/catalogo"

describe("reconsideración", () => {
  it("lee el plazo que devuelve la base, con o sin recurso", () => {
    const sin = leerPlazo({ notificacion: "2026-11-13", ultimo_dia: "2026-11-25", limite: "2026-11-26T12:00:00+00:00", vigente: true, recurso: null })
    assert.deepEqual(sin, { notificacion: "2026-11-13", ultimoDia: "2026-11-25", limite: "2026-11-26T12:00:00+00:00", vigente: true, recurso: null })
    const con = leerPlazo({
      notificacion: "2026-11-13",
      ultimo_dia: "2026-11-25",
      limite: "2026-11-26T12:00:00+00:00",
      vigente: false,
      recurso: { id: "r1", numero: "CH-2026-000019", estado: "en_tramite", resultado: null },
    })
    assert.equal(con?.vigente, false)
    assert.deepEqual(con?.recurso, { id: "r1", numero: "CH-2026-000019", estado: "en_tramite", resultado: null })
  })

  it("sin plazo (el trámite no la admite o no hay resolución) no hay nada que mostrar", () => {
    assert.equal(leerPlazo(null), null)
    assert.equal(leerPlazo({ vigente: true }), null)
  })

  it("muestra el último día sin correrlo por la zona horaria", () => {
    assert.equal(fechaDia("2026-11-25"), "25/11/2026")
  })

  it("cada trámite que la admite usa un trámite de recurso del catálogo, y los de recurso no se recurren", () => {
    const recursos = new Set(CATALOGO_SEMILLA.filter((t) => t.es_recurso).map((t) => t.codigo))
    assert.ok(recursos.size >= 2)
    for (const t of CATALOGO_SEMILLA) {
      if (t.es_recurso) assert.equal(t.reconsideracion ?? null, null, `${t.codigo}: un recurso no tiene reconsideración`)
      else if (t.reconsideracion) assert.ok(recursos.has(t.reconsideracion), `${t.codigo}: ${t.reconsideracion} no es un recurso`)
    }
    // El relevamiento dice que no la admiten.
    for (const codigo of ["BAJA-ESTUDIOS", "BAJA-PARTICULAR", "ESC-FIN", "ESC-INICIO", "CAMBIO-DOMICILIO"])
      assert.equal(CATALOGO_SEMILLA.find((t) => t.codigo === codigo)?.reconsideracion ?? null, null, codigo)
  })
})
