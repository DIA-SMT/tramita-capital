// Genera supabase/tests/firmas.inc: firmas sintéticas de una persona ficticia para probar la
// firma ológrafa en la base (registro, firma, rechazo de imitaciones y de copias exactas).
// Elige la primera semilla cuyas firmas pasan con margen el espejo en TypeScript, para que la
// prueba no dependa de casos al límite. También guarda el patrón calculado en TypeScript:
// la prueba de base comprueba que public._firma_patron calcula lo mismo.
// Con las mismas firmas genera supabase/seeds/02b_firma_demo.sql (demo local): la directora
// demo registra su firma y firma la resolución que deja preparada 02_demo_local.sql.
// Uso: npm run firmas-prueba
import { writeFileSync } from "node:fs"
import { crudoDeTrazos, evaluar, patronDeCrudo, registroDe, variaciones, REGLAS, type FirmaCruda, type PatronFirma } from "../src/lib/firma-trazo"
import { firmar, persona, sembrar } from "./firma-sintetica"

const DESTINO = "supabase/tests/firmas.inc"
const SEMILLA_DEMO = "supabase/seeds/02b_firma_demo.sql"

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

const json = (nombre: string) => `'${JSON.stringify(elegido!.crudos[nombre])}'::jsonb`
writeFileSync(
  SEMILLA_DEMO,
  `-- =====================================================================
-- Generado por scripts/firmas-prueba.ts (semilla ${elegido.semilla}): no editar a mano.
-- Datos demo — SOLO DESARROLLO LOCAL (corre después de 02_demo_local.sql).
--
-- La directora demo (direccion@demo.test) registra una firma ológrafa sintética
-- (clave de firma: 482915) y firma con ella la resolución de la licencia por examen
-- de Jorge, que 02_demo_local.sql deja en la Dirección. Así la demo pasa por la misma
-- verificación biométrica que la app. Para firmar con tu propia mano, registrá otra
-- firma en "Mi firma".
-- =====================================================================

do $$
declare
  c_jorge constant uuid := '22222222-2222-4222-8222-222222222222';
  c_mesa  constant uuid := '33333333-3333-4333-8333-333333333333';
  c_dir   constant uuid := '77777777-7777-4777-8777-777777777777';
  v_exp   uuid;
  v_act   uuid;
begin
  select e.id into v_exp from public.expedientes e
   where e.iniciador_id = c_jorge and e.asunto = 'Licencia por examen — Análisis Matemático I';
  select a.id into v_act from public.actuaciones a
   where a.expediente_id = v_exp and a.tipo = 'resolucion' and a.estado = 'borrador';
  if v_act is null then
    raise exception 'No está la resolución que prepara 02_demo_local.sql';
  end if;

  perform set_config('request.jwt.claims', json_build_object('sub', c_dir, 'role', 'authenticated')::text, false);
  perform public.registrar_firma(
    'Laura Campos', 'Directora de Capital Humano', '482915',
    jsonb_build_array(${json("muestra1")}, ${json("muestra2")}, ${json("muestra3")}),
    'pen', '#1e3a8a'
  );
  perform public.firmar_actuacion(v_act, '482915', ${json("genuina")}, 'pen', '#1e3a8a', '{}');
  if (select estado from public.actuaciones where id = v_act) <> 'firmada' then
    raise exception 'La firma sintética de la demo no pasó la verificación';
  end if;
  perform public.pasar_expediente(v_exp, null, null, 'Firmada. Notifíquese.');

  perform set_config('request.jwt.claims', json_build_object('sub', c_mesa, 'role', 'authenticated')::text, false);
  perform public.archivar_expediente(v_exp, 'Notificado el agente por medios electrónicos. Archívese.');
  update public.expedientes set created_at = now() - interval '2 days', resuelto_at = now() - interval '6 hours' where id = v_exp;

  perform set_config('request.jwt.claims', '', false);
end $$;
`,
)
console.log(`${SEMILLA_DEMO}: firma de la directora demo`)
