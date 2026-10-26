// Prueba de humo de las pantallas: recorre la vista previa (datos de ejemplo, sin login) desde
// la galería, con cada rol de la demo, y comprueba que cada página responda 200 y se dibuje
// sin errores. Necesita la app corriendo (next start o next dev) con la vista previa habilitada.
// Uso: npx tsx scripts/humo.ts [http://localhost:3000]
const BASE = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "")
const ROLES = ["bonificaciones", "medicina", "dictamenes", "direccion", "mesa", "licencias", "despacho", "liquidacion"]
const SECCIONES_INTERNAS = ["bandeja", "tablero", "parametrizacion", "mi-firma", "novedades"]
const LIMITE = 400

// Lo que Next dibuja cuando una pantalla falla al renderizar.
const SENALES_DE_ERROR = [/Application error/i, /Unhandled Runtime Error/i, /__next_error__/, /Internal Server Error/i]

const pendientes = new Set<string>(["/vista-previa"])
for (const s of SECCIONES_INTERNAS) for (const r of ROLES) pendientes.add(`/vista-previa/${s}?como=${r}`)
const vistas = new Set<string>()
const fallas: string[] = []

function enlaces(html: string) {
  return [...html.matchAll(/href="(\/vista-previa[^"#]*)"/g)].map((m) => m[1].replaceAll("&amp;", "&"))
}

async function recorrer() {
  while (pendientes.size > 0 && vistas.size < LIMITE) {
    const ruta = pendientes.values().next().value as string
    pendientes.delete(ruta)
    if (vistas.has(ruta)) continue
    vistas.add(ruta)
    try {
      const r = await fetch(BASE + ruta, { redirect: "manual" })
      const html = await r.text()
      if (r.status !== 200) fallas.push(`${r.status} ${ruta}`)
      else if (SENALES_DE_ERROR.some((s) => s.test(html))) fallas.push(`error en la página ${ruta}`)
      else for (const e of enlaces(html)) if (!vistas.has(e)) pendientes.add(e)
    } catch (e) {
      fallas.push(`sin respuesta ${ruta}: ${(e as Error).message}`)
    }
  }

  console.log(`Pantallas recorridas: ${vistas.size}`)
  if (fallas.length > 0) {
    console.error(`Fallaron ${fallas.length}:\n${fallas.map((f) => `  - ${f}`).join("\n")}`)
    process.exit(1)
  }
  if (vistas.size < 20) {
    console.error("Se recorrieron muy pocas pantallas: ¿está habilitada la vista previa?")
    process.exit(1)
  }
  console.log("Todas respondieron 200 y se dibujaron sin errores.")
}

void recorrer()
