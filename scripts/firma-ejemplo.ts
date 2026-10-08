// Genera el trazo de la firma ficticia de la vista previa (src/lib/demo/firma-ejemplo.ts)
// a partir de public/demo/firma-ejemplo.svg. No corresponde a ninguna persona real.
// Uso: npx tsx scripts/firma-ejemplo.ts
import { readFileSync, writeFileSync } from "node:fs"
import { crudoDeTrazos, visibleDeCrudo, type Trazo } from "../src/lib/firma-trazo"

const svg = readFileSync("public/demo/firma-ejemplo.svg", "utf8")
const caminos = [...svg.matchAll(/ d="([^"]+)"/g)].map((m) => m[1])

let t = 0
const trazos: Trazo[] = caminos.map((d) => {
  const n = (d.match(/-?\d*\.?\d+/g) ?? []).map(Number)
  let x = n[0]
  let y = n[1]
  const trazo: Trazo = [{ x, y, t }]
  // Curvas cúbicas relativas ("c"): se muestrean en 10 puntos cada una.
  for (let i = 2; i + 5 < n.length; i += 6) {
    const [x1, y1, x2, y2, dx, dy] = n.slice(i, i + 6)
    for (let k = 1; k <= 10; k++) {
      const s = k / 10
      // Bézier relativa al punto inicial: el término (1 - s)³ multiplica al origen (0, 0).
      const b = 3 * (1 - s) ** 2 * s
      const c = 3 * (1 - s) * s ** 2
      const e = s ** 3
      t += 9
      trazo.push({ x: x + b * x1 + c * x2 + e * dx, y: y + b * y1 + c * y2 + e * dy, t })
    }
    x += dx
    y += dy
  }
  t += 180
  return trazo
})

const visible = visibleDeCrudo(crudoDeTrazos(trazos))
writeFileSync(
  "src/lib/demo/firma-ejemplo.ts",
  `// Generado con scripts/firma-ejemplo.ts. Firma ficticia: no corresponde a ninguna persona real.
import type { FirmaVisible } from "@/lib/firma-trazo"

export const FIRMA_EJEMPLO: FirmaVisible = ${JSON.stringify(visible)}
`,
)
console.log("trazos:", visible?.trazos.length, "ancho:", visible?.ancho)
