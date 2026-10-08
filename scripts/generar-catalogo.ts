// Genera supabase/seeds/01_catalogo.sql a partir de src/lib/semilla/catalogo.ts.
// Uso: npm run catalogo
// El SQL es idempotente: se puede volver a aplicar en un proyecto que ya tiene el catálogo.
import { writeFileSync } from "node:fs"
import { join } from "node:path"
import { AREAS_SEMILLA, CATALOGO_SEMILLA, CODIGOS_RETIRADOS } from "../src/lib/semilla/catalogo"

const txt = (s: string | null | undefined) => (s == null ? "null" : `'${s.replace(/'/g, "''")}'`)
const num = (n: number | null | undefined) => (n == null ? "null" : String(n))
const arr = (a: string[] | undefined) => (a && a.length > 0 ? `array[${a.map(txt).join(", ")}]::text[]` : "'{}'::text[]")
const json = (v: unknown) => `${txt(JSON.stringify(v))}::jsonb`
const lista = (a: string[]) => a.map(txt).join(", ")

// Antes de generar: cada paso apunta a un área existente.
const codigosArea = new Set(AREAS_SEMILLA.map((a) => a.codigo))
for (const t of CATALOGO_SEMILLA) {
  for (const p of t.pasos) if (!codigosArea.has(p.area)) throw new Error(`${t.codigo}: área inexistente ${p.area}`)
  const claves = new Set(t.requisitos.map((r) => r.clave))
  for (const c of t.documentacion_final) if (!claves.has(c)) throw new Error(`${t.codigo}: documentación final sin requisito ${c}`)
}

const codigos = CATALOGO_SEMILLA.map((t) => t.codigo)
const partes: string[] = []

partes.push(`-- =====================================================================
-- Catálogo de Capital Humano: áreas, trámites, circuitos y modelos.
-- GENERADO por scripts/generar-catalogo.ts desde src/lib/semilla/catalogo.ts
-- (npm run catalogo). No editar a mano.
--
-- Bonificaciones y asignaciones: relevamiento del Área Bonificaciones del
-- 07/10/2026 (circuito FINAL DIGITAL corregido). Licencias: provisorio.
-- Idempotente: se puede aplicar sobre un proyecto que ya tiene catálogo.
-- No crea usuarios.
-- =====================================================================`)

partes.push(`-- Áreas
insert into public.areas (codigo, nombre, descripcion) values
${AREAS_SEMILLA.map((a) => `  (${txt(a.codigo)}, ${txt(a.nombre)}, ${txt(a.descripcion)})`).join(",\n")}
on conflict (codigo) do update set nombre = excluded.nombre, descripcion = excluded.descripcion;`)

partes.push(`-- Trámites retirados: se desactivan y, si no tienen expedientes, se borran (con sus pasos y modelos)
update public.tipos_tramite set activo = false where codigo in (${lista(CODIGOS_RETIRADOS)});
delete from public.tipos_tramite t
 where t.codigo in (${lista(CODIGOS_RETIRADOS)})
   and not exists (select 1 from public.expedientes e where e.tipo_tramite_id = t.id);`)

partes.push(`-- Tipos de trámite
insert into public.tipos_tramite
  (codigo, nombre, descripcion, categoria, icono, normativa, requisitos, formulario, plazo_dias, linea_base_dias,
   prioridad_base, reservado, firma_registrada, activo, codigo_relevamiento, oficina, pasos_actuales, documentacion_final)
values
${CATALOGO_SEMILLA.map(
  (t) =>
    `(\n  ${txt(t.codigo)}, ${txt(t.nombre)},\n  ${txt(t.descripcion)},\n  ${txt(t.categoria)}, ${txt(t.icono)},\n  ${txt(t.normativa)},\n  ${json(t.requisitos)},\n  ${json(t.formulario)},\n  ${num(t.plazo_dias)}, ${num(t.linea_base_dias)}, ${txt(t.prioridad_base)}, ${t.reservado}, ${t.firma_registrada ?? false}, true,\n  ${txt(t.relevamiento)}, ${txt(t.oficina)}, ${num(t.pasos_actuales)}, ${arr(t.documentacion_final)}\n)`,
).join(",\n")}
on conflict (codigo) do update set
  nombre = excluded.nombre, descripcion = excluded.descripcion, categoria = excluded.categoria, icono = excluded.icono,
  normativa = excluded.normativa, requisitos = excluded.requisitos, formulario = excluded.formulario,
  plazo_dias = excluded.plazo_dias, linea_base_dias = excluded.linea_base_dias, prioridad_base = excluded.prioridad_base,
  reservado = excluded.reservado, firma_registrada = excluded.firma_registrada, activo = true, codigo_relevamiento = excluded.codigo_relevamiento,
  oficina = excluded.oficina, pasos_actuales = excluded.pasos_actuales, documentacion_final = excluded.documentacion_final;`)

partes.push(`-- Circuitos (se reemplazan completos)
delete from public.pasos_circuito where tipo_tramite_id in (select id from public.tipos_tramite where codigo in (${lista(codigos)}));
insert into public.pasos_circuito
  (tipo_tramite_id, orden, nombre, area_id, accion, plazo_horas, instrucciones, controles, revisa, genera, permite_subsanacion, destino_final)
select t.id, p.orden, p.nombre, a.id, p.accion::public.accion_paso, p.plazo_horas, p.instrucciones, p.controles, p.revisa, p.genera, p.permite_subsanacion, p.destino_final
from (values
${CATALOGO_SEMILLA.flatMap((t) =>
  t.pasos.map(
    (p, i) =>
      `  (${txt(t.codigo)}, ${i + 1}, ${txt(p.nombre)}, ${txt(p.area)}, ${txt(p.accion)}, ${p.plazo_horas}, ${txt(p.instrucciones)},\n   ${arr(p.controles)},\n   ${arr(p.revisa)},\n   ${arr(p.genera)}, ${p.permite_subsanacion ?? true}, ${txt(p.destino_final)})`,
  ),
).join(",\n")}
) as p(codigo, orden, nombre, area, accion, plazo_horas, instrucciones, controles, revisa, genera, permite_subsanacion, destino_final)
join public.tipos_tramite t on t.codigo = p.codigo
join public.areas a on a.codigo = p.area;`)

const plantillas = CATALOGO_SEMILLA.flatMap((t) => t.plantillas.map((pl) => ({ codigo: t.codigo, ...pl })))
partes.push(`-- Modelos (se reemplazan completos)
delete from public.plantillas where tipo_tramite_id in (select id from public.tipos_tramite where codigo in (${lista(codigos)}));
insert into public.plantillas (tipo_tramite_id, tipo_documento, nombre, cuerpo, instrucciones_ia)
select t.id, p.tipo::public.tipo_actuacion, p.nombre, p.cuerpo, p.instrucciones
from (values
${plantillas.map((pl) => `(\n  ${txt(pl.codigo)}, ${txt(pl.tipo)}, ${txt(pl.nombre)},\n  ${txt(pl.cuerpo)},\n  ${txt(pl.instrucciones)}\n)`).join(",\n")}
) as p(codigo, tipo, nombre, cuerpo, instrucciones)
join public.tipos_tramite t on t.codigo = p.codigo;`)

const destino = join(process.cwd(), "supabase", "seeds", "01_catalogo.sql")
writeFileSync(destino, partes.join("\n\n") + "\n", "utf8")
console.log(`Catálogo generado: ${CATALOGO_SEMILLA.length} trámites, ${AREAS_SEMILLA.length} áreas, ${plantillas.length} modelos → ${destino}`)
