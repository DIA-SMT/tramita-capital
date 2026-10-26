// Genera supabase/tests/firmas.inc: firmas sintéticas de una persona ficticia para probar la
// firma ológrafa en la base (registro, firma, rechazo de imitaciones y de copias exactas).
// Elige la primera semilla cuyas firmas pasan con margen el espejo en TypeScript, para que la
// prueba no dependa de casos al límite. También guarda el patrón calculado en TypeScript:
// la prueba de base comprueba que public._firma_patron calcula lo mismo.
// Uso: npm run firmas-prueba
import { writeFileSync } from "node:fs"
import { crudoDeTrazos, evaluar, patronDeCrudo, registroDe, variaciones, REGLAS, type FirmaCruda, type PatronFirma } from "../src/lib/firma-trazo"
import { firmar, persona, sembrar } from "./firma-sintetica"

const DESTINO = "supabase/tests/firmas.inc"

type Juego = { semilla: number; crudos: Record<string, FirmaCruda>; patrones: Record<string, PatronFirma> }

const puntos = (c: FirmaCruda) => c.reduce((n, t) => n + t.length, 0)

function juego(semilla: number): Juego | null {
  sembrar(semilla)
  const per = persona()
  const crudos: Record<string, FirmaCruda> = {
    muestra1: crudoDeTrazos(firmar(per, "genuina")),
    muestra2: crudoDeTrazos(firmar(per, "genuina")),
    muestra3: crudoDeTrazos(firmar(per, "genuina")),
    genuina: crudoDeTrazos(firmar(per, "genuina")),
    genuina2: crudoDeTrazos(firmar(per, "genuina")),
    imitacion: crudoDeTrazos(firmar(per, "imitacion")),
    otra: crudoDeTrazos(firmar(persona(), "genuina")),
  }
  if (Object.values(crudos).some((c) => c.length > 60 || puntos(c) < 12 || puntos(c) > 5000)) return null
  const patrones: Record<string, PatronFirma> = {}
  for (const [nombre, c] of Object.entries(crudos)) {
    const p = patronDeCrudo(c)
    if (!p) return null
    patrones[nombre] = p
  }

  const muestras = [patrones.muestra1, patrones.muestra2, patrones.muestra3]
  const v = variaciones(muestras)
  if (v.forma > REGLAS.variacionMaxima.forma * 0.7 || v.ritmo > REGLAS.variacionMaxima.ritmo * 0.7) return null
  const reg = registroDe(muestras)
  const conMargen = (p: PatronFirma) => {
    const e = evaluar(p, reg)
    return e.coincide && e.forma.puntaje <= e.forma.umbral * 0.7 && e.ritmo.puntaje <= e.ritmo.umbral * 0.7
  }
  // Las dos genuinas pasan con margen; la imitación y la de otra persona no pasan por el trazo.
  if (!conMargen(patrones.genuina) || !conMargen(patrones.genuina2)) return null
  for (const ajena of [patrones.imitacion, patrones.otra]) {
    const e = evaluar(ajena, reg)
    if (e.coincide || e.copia || e.forma.puntaje <= e.forma.umbral * 1.3) return null
  }
  // Una muestra registrada, enviada de nuevo, es una copia exacta.
  if (!evaluar(patrones.muestra1, reg).copia) return null
  return { semilla, crudos, patrones }
}

let elegido: Juego | null = null
for (let semilla = 1; semilla < 500 && !elegido; semilla++) elegido = juego(semilla)
if (!elegido) throw new Error("Ninguna semilla dio firmas con margen suficiente")

const casos = (valores: Record<string, unknown>) =>
  Object.entries(valores)
    .map(([nombre, v]) => `    when '${nombre}' then '${JSON.stringify(v)}'::jsonb`)
    .join("\n")

writeFileSync(
  DESTINO,
  `-- Generado por scripts/firmas-prueba.ts (semilla ${elegido.semilla}): no editar a mano.
-- Firmas sintéticas de una persona ficticia: tres muestras para registrar, dos firmas genuinas,
-- una imitación hábil y la firma de otra persona.

create or replace function pruebas.firma(p_nombre text)
returns jsonb
language sql
immutable
as $f$
  select case p_nombre
${casos(elegido.crudos)}
  end
$f$;

-- Patrón calculado por src/lib/firma-trazo.ts (el espejo en TypeScript de public._firma_patron).
create or replace function pruebas.patron_ts(p_nombre text)
returns jsonb
language sql
immutable
as $f$
  select case p_nombre
${casos(elegido.patrones)}
  end
$f$;
`,
)
console.log(`${DESTINO}: semilla ${elegido.semilla}, ${Object.values(elegido.crudos).map(puntos).join("/")} puntos`)
