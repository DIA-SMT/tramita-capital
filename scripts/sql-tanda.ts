// Arma UN solo archivo SQL con todo lo pendiente en Supabase (decisión del 17/11/2026: la base se aplica por tandas).
// Uso: npm run tanda -- <primera migración pendiente> [seeds...]
//   npm run tanda -- 001900 03_usuarios_prueba 03b_clave_prueba
// Escribe supabase/tanda.sql (git lo ignora), en este orden: las migraciones desde esa, `commit;` (un valor nuevo de
// un enum no se puede usar en la misma transacción), el catálogo, los seeds pedidos, la limpieza de los retornos de
// carro que deja el SQL Editor de Windows y, al final, la comprobación de la huella (lo único que muestra el Editor).
// Nunca incluye 02_demo_local ni 02b_firma_demo: son solo locales.
import { readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { CONSULTA_HUELLA, huellaCatalogo } from "./lib/huella"

const [desde, ...seeds] = process.argv.slice(2)
if (!desde || !/^\d{6}$/.test(desde)) {
  console.error("Indicá la primera migración pendiente (6 dígitos, por ejemplo 001900) y, si hacen falta, los seeds.")
  process.exit(1)
}

const raiz = process.cwd()
const carpetaMigraciones = join(raiz, "supabase", "migrations")
const migraciones = readdirSync(carpetaMigraciones)
  .filter((f) => f.endsWith(".sql") && f.slice(8, 14) >= desde)
  .sort()
if (migraciones.length === 0) {
  console.error(`No hay migraciones desde la ${desde}.`)
  process.exit(1)
}

const SOLO_LOCALES = ["02_demo_local", "02b_firma_demo"]
const archivosSeed = seeds.map((s) => {
  const nombre = s.replace(/\.sql$/, "")
  if (SOLO_LOCALES.includes(nombre)) {
    console.error(`${nombre} es solo local: no va a la nube.`)
    process.exit(1)
  }
  return `${nombre}.sql`
})

const leer = (...ruta: string[]) => readFileSync(join(raiz, ...ruta), "utf8").replace(/\r\n/g, "\n")
const { md5, modelos } = huellaCatalogo()
const fecha = new Date().toLocaleDateString("es-AR", { timeZone: "America/Argentina/Tucuman" })

const partes = [
  `-- =====================================================================
-- Tanda de cambios para Supabase, armada el ${fecha} con scripts/sql-tanda.ts.
-- Se corre UNA vez, completa, en el SQL Editor. Después se mergean las PR.
-- Migraciones: ${migraciones.join(", ")}
-- Catálogo: 01_catalogo.sql (huella esperada ${md5}, ${modelos} modelos)
-- Seeds: ${archivosSeed.length ? archivosSeed.join(", ") : "ninguno"}
-- Al final, "coincide" tiene que dar true.
-- =====================================================================`,
  ...migraciones.map((m) => `-- ---------- Migración ${m}\n${leer("supabase", "migrations", m)}`),
  `-- Las migraciones quedan guardadas antes de seguir (valores nuevos de enum).\ncommit;`,
  `-- ---------- Catálogo\n${leer("supabase", "seeds", "01_catalogo.sql")}`,
  ...archivosSeed.map((s) => `-- ---------- Seed ${s}\n${leer("supabase", "seeds", s)}`),
  `-- ---------- Limpieza de los retornos de carro que deja el SQL Editor al pegar desde Windows
update public.plantillas
   set cuerpo = replace(cuerpo, chr(13), ''), instrucciones_ia = replace(instrucciones_ia, chr(13), '')
 where cuerpo like '%' || chr(13) || '%' or instrucciones_ia like '%' || chr(13) || '%';`,
  `-- ---------- Comprobación (lo que muestra el Editor al terminar)
select (${CONSULTA_HUELLA}) = '${md5}' as coincide,
       (${CONSULTA_HUELLA}) as huella,
       (select count(*) from public.plantillas) as modelos;`,
]

const destino = join(raiz, "supabase", "tanda.sql")
writeFileSync(destino, partes.join("\n\n") + "\n", "utf8")
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`
console.log(`Tanda armada: ${plural(migraciones.length, "migración", "migraciones")}, catálogo y ${plural(archivosSeed.length, "seed", "seeds")} → ${destino}`)
console.log(`Huella esperada: ${md5} (${modelos} modelos)`)
