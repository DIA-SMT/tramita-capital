// Certificado de trabajo automático (migración 001900): lo que devuelve la base, la vigencia del dato de Civitas,
// la tarea del paso de Registro, el sello de la firma autorizada y el modelo del catálogo.
import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { leerAutorizacion, leerEmision, liquidaVigente, VIGENCIA_DATO_LIQUIDA } from "@/lib/certificado"
import { leerSello } from "@/lib/firma"
import { estadoDocumento, formaDeGenerar } from "@/lib/relevamiento"
import { CATALOGO_SEMILLA } from "@/lib/semilla/catalogo"

describe("lo que devuelve la base", () => {
  it("emitido, con su foja y su número", () => {
    assert.deepEqual(leerEmision({ emitido: true, actuacion_id: "a1", numero: "3/CT/2026" }), { emitido: true, actuacionId: "a1", numero: "3/CT/2026" })
  })
  it("sin emitir, con el motivo", () => {
    assert.deepEqual(leerEmision({ emitido: false, motivo: "liquida" }), { emitido: false, motivo: "liquida" })
    assert.equal(leerEmision({ emitido: false, motivo: "otro" }), null)
    assert.equal(leerEmision(null), null)
  })
  it("la autorización vigente, o ninguna", () => {
    assert.deepEqual(leerAutorizacion({ autorizada: true, aclaracion: "Laura Campos", cargo: "Directora", desde: "2026-11-17", propia: true }), {
      autorizada: true,
      aclaracion: "Laura Campos",
      cargo: "Directora",
      desde: "2026-11-17",
      propia: true,
    })
    assert.deepEqual(leerAutorizacion({ autorizada: false }), { autorizada: false })
    assert.deepEqual(leerAutorizacion("x"), { autorizada: false })
  })
})

describe("dato «Liquida SÍ» de Civitas", () => {
  const hoy = new Date("2026-11-17T15:00:00-03:00")
  it("vale un mes", () => {
    assert.equal(liquidaVigente(true, "2026-11-17", hoy), true)
    assert.equal(liquidaVigente(true, "2026-10-17", hoy), true)
    assert.equal(liquidaVigente(true, "2026-10-10", hoy), false)
    assert.equal(VIGENCIA_DATO_LIQUIDA, 31)
  })
  it("sin dato o «no liquida», pasa por Registro", () => {
    assert.equal(liquidaVigente(null, "2026-11-17", hoy), false)
    assert.equal(liquidaVigente(false, "2026-11-17", hoy), false)
    assert.equal(liquidaVigente(true, null, hoy), false)
  })
  it("la base usa la misma vigencia", () => {
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/20261118001900_certificado_trabajo.sql"), "utf8")
    assert.match(sql, new RegExp(`as \\$\\$ select ${VIGENCIA_DATO_LIQUIDA} \\$\\$`))
  })
})

describe("tarea del paso de Registro", () => {
  it("el certificado se emite con su propio botón", () => {
    assert.deepEqual(formaDeGenerar("Certificado de trabajo"), { tipo: "certificado", etiqueta: "Emitir certificado" })
    // Otros certificados del catálogo (escolaridad) no son este.
    assert.notEqual(formaDeGenerar("Certificado de escolaridad").tipo, "certificado")
  })
  it("está listo cuando hay un certificado firmado", () => {
    const vacio = { documentos: [], fojas: [], etiquetasRequisitos: {} }
    assert.equal(estadoDocumento("Certificado de trabajo", vacio), "falta")
    assert.equal(estadoDocumento("Certificado de trabajo", { ...vacio, fojas: [{ tipo: "certificado", titulo: "Certificado de trabajo N.º 1/CT/2026", firmada: true }] }), "listo")
  })
})

describe("firma autorizada", () => {
  it("el sello estampa el trazo registrado y la fecha de la autorización", () => {
    const sello = leerSello({
      firma: {
        tipo: "automatica",
        aclaracion: "Laura Campos",
        cargo: "Directora de Capital Humano",
        registro_id: "r1",
        autorizada_at: "2026-11-17T12:00:00Z",
        visible: { ancho: 300, trazos: [[0, 0, 10, 10]] },
        tinta: "#1e3a8a",
      },
    })
    assert.equal(sello?.tipo, "automatica")
    assert.equal(sello?.autorizadaAt, "2026-11-17T12:00:00Z")
    assert.deepEqual(sello?.visible, { ancho: 300, trazos: [[0, 0, 10, 10]] })
  })
})

describe("modelo del catálogo", () => {
  const tramite = CATALOGO_SEMILLA.find((t) => t.codigo === "CERT-TRABAJO")
  it("es de emisión automática, sin reconsideración y con un solo paso en Registro", () => {
    assert.ok(tramite?.emision_automatica)
    assert.equal(tramite.reconsideracion, null)
    assert.deepEqual(
      tramite.pasos.map((p) => p.area),
      ["REG"],
    )
    assert.deepEqual(tramite.pasos[0].genera, ["Certificado de trabajo"])
  })
  it("solo usa los marcadores que completa emitir_certificado", () => {
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/20261118001900_certificado_trabajo.sql"), "utf8")
    const completa = new Set([...sql.matchAll(/'\{\{(\w+)\}\}'/g)].map((m) => m[1]))
    const modelo = tramite?.plantillas.find((p) => p.tipo === "certificado")?.cuerpo ?? ""
    const usados = [...modelo.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1])
    assert.ok(usados.length > 0)
    for (const u of usados) assert.ok(completa.has(u), `{{${u}}} no lo completa la base`)
  })
})
