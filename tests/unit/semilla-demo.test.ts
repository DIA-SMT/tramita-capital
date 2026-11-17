// La semilla local de la demo crea expedientes con crear_expediente, que rechaza los que no traen
// los datos obligatorios del formulario. Si el catálogo suma un campo obligatorio, la semilla
// tiene que traerlo: si no, falla al levantar Supabase (local y CI) y no se corre pgTAP.
import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { CATALOGO_SEMILLA } from "@/lib/semilla/catalogo"

const semilla = readFileSync("supabase/seeds/02_demo_local.sql", "utf8")
const creados = [...semilla.matchAll(/crear_expediente\('([A-Z-]+)',\s*'[^']*',\s*'(\{[^']*\})'/g)].map((m) => ({
  codigo: m[1],
  datos: JSON.parse(m[2]) as Record<string, string>,
}))

describe("semilla local de la demo", () => {
  it("encuentra los expedientes que crea", () => {
    assert.ok(creados.length > 0)
  })

  it("cada expediente es de un trámite del catálogo y trae sus datos obligatorios", () => {
    for (const { codigo, datos } of creados) {
      const tramite = CATALOGO_SEMILLA.find((t) => t.codigo === codigo)
      assert.ok(tramite, `${codigo} no está en el catálogo`)
      const faltan = tramite.formulario.filter((c) => c.obligatorio !== false && !(c.clave in datos)).map((c) => c.clave)
      assert.deepEqual(faltan, [], `${codigo}: faltan datos obligatorios en 02_demo_local.sql`)
    }
  })
})
