// Acceso rápido de la etapa de prueba: los botones del ingreso tienen que coincidir con los usuarios de la semilla.
import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { CLAVE_PRUEBA, USUARIOS_PRUEBA } from "@/lib/usuarios-prueba"

const semilla = readFileSync("supabase/seeds/03_usuarios_prueba.sql", "utf8")
const clave = readFileSync("supabase/seeds/03b_clave_prueba.sql", "utf8")

describe("usuarios de prueba", () => {
  it("cada botón entra con un usuario que crea la semilla", () => {
    for (const u of USUARIOS_PRUEBA) assert.ok(semilla.includes(`'${u.email}'`), `${u.email} no está en 03_usuarios_prueba.sql`)
  })

  it("no ofrece cuentas reales ni la de administración", () => {
    const emails = USUARIOS_PRUEBA.map((u) => u.email as string)
    assert.ok(!emails.includes("direccionia@smt.gob.ar"))
    assert.ok(!emails.includes("admin@smt.gob.ar"))
    assert.equal(new Set(emails).size, emails.length)
  })

  it("la clave del botón es la que asigna el SQL, y solo a las cuentas de prueba", () => {
    assert.ok(clave.includes(`crypt('${CLAVE_PRUEBA}'`))
    assert.match(clave, /where raw_app_meta_data ->> 'prueba' = 'true'/)
  })
})
