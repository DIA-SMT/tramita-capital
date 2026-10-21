// Asigna contraseñas nuevas y aleatorias a los usuarios de prueba (seeds/03_usuarios_prueba.sql).
//   npx tsx scripts/claves-prueba.ts
// Deja las contraseñas en credenciales-prueba.txt (git lo ignora) y el SQL con los hashes bcrypt en
// supabase/.temp/claves-prueba.sql, para aplicarlo en la base. Las contraseñas nunca van al repo
// ni a la base en texto plano. El SQL también cierra las sesiones abiertas de esos usuarios.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { randomInt } from "node:crypto"
import bcrypt from "bcryptjs"

// Sin caracteres que se confunden al dictarlos (0/O, 1/l/I).
const ALFABETO = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"

function contrasena() {
  const grupo = () => Array.from({ length: 4 }, () => ALFABETO[randomInt(ALFABETO.length)]).join("")
  return [grupo(), grupo(), grupo(), grupo()].join("-")
}

const semilla = readFileSync("supabase/seeds/03_usuarios_prueba.sql", "utf8")
const emails = [...new Set(semilla.match(/'[a-z.]+@smt\.gob\.ar'/g)?.map((e) => e.slice(1, -1)) ?? [])]
if (emails.length === 0) throw new Error("No encontré usuarios en 03_usuarios_prueba.sql")

const filas = emails.map((email) => ({ email, clave: contrasena() }))
const sql = [
  "-- Generado por scripts/claves-prueba.ts. Solo hashes: las contraseñas están en credenciales-prueba.txt.",
  ...filas.map(
    ({ email, clave }) =>
      `update auth.users set encrypted_password = '${bcrypt.hashSync(clave, 10)}', updated_at = now()\n` +
      ` where email = '${email}' and raw_app_meta_data ->> 'prueba' = 'true';`,
  ),
  "delete from auth.sessions where user_id in (select id from auth.users where raw_app_meta_data ->> 'prueba' = 'true');",
  "",
].join("\n")

mkdirSync("supabase/.temp", { recursive: true })
writeFileSync("supabase/.temp/claves-prueba.sql", sql)
writeFileSync(
  "credenciales-prueba.txt",
  [
    `Usuarios de prueba de Tramita Capital (generado el ${new Date().toLocaleString("es-AR")}).`,
    "No compartir por canales públicos. Borrar estos usuarios antes de producción.",
    "",
    ...filas.map(({ email, clave }) => `${email.padEnd(34)}${clave}`),
    "",
  ].join("\n"),
)
console.log(`${filas.length} contraseñas nuevas en credenciales-prueba.txt · SQL en supabase/.temp/claves-prueba.sql`)
