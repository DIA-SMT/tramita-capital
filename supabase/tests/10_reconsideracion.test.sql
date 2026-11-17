-- Recurso de reconsideración (migración 001700): lo pide el/la agente desde su trámite resuelto, dentro del plazo,
-- y tramita en un expediente nuevo vinculado al original.
begin;
\ir ayudantes.inc
select * from no_plan();
select pruebas.compartir_resultados();

select pruebas.persona('ana@prueba.test', 'Ana', 'Agente') as ana \gset
select pruebas.persona('beto@prueba.test', 'Beto', 'Agente') as beto \gset
select pruebas.interno('bonif@prueba.test', 'BONIF') as bonif \gset

-- Trámite de recurso (Asesoría → Bonificaciones → Dirección → Bonificaciones) y dos trámites: uno lo admite y otro no.
insert into public.tipos_tramite (codigo, nombre, categoria, formulario, requisitos, plazo_dias, es_recurso)
values ('PRUEBA-RECON', 'Recurso de prueba', 'Pruebas', '[]', '[]', 10, true)
returning id as recon \gset
insert into public.pasos_circuito (tipo_tramite_id, orden, nombre, area_id, accion)
select :'recon', v.orden, v.nombre, a.id, v.accion::public.accion_paso
from (values (1, 'Dictamen', 'DICT', 'dictamen'), (2, 'Proyecto', 'BONIF', 'resolucion'), (3, 'Firma', 'DIR', 'firma'), (4, 'Novedad', 'BONIF', 'liquidacion'))
  as v(orden, nombre, area, accion)
join public.areas a on a.codigo = v.area;

select pruebas.tramite('PRUEBA-ADMITE') as admite \gset
update public.tipos_tramite set reconsideracion = 'PRUEBA-RECON' where id = :'admite';
select pruebas.tramite('PRUEBA-NO-ADMITE') as no_admite \gset

-- Días hábiles: de lunes a viernes, sin feriados.
select is(public.dia_habil('2026-11-13', 8), '2026-11-25'::date, 'El 8.º día hábil después del viernes 13/11 es el miércoles 25/11');
insert into public.feriados (fecha, motivo) values ('2026-11-23', 'Feriado de prueba');
select is(public.dia_habil('2026-11-13', 8), '2026-11-26'::date, 'Un feriado corre el plazo un día');

-- Un trámite de recurso no se inicia desde el catálogo.
select pruebas.como(:'ana');
select throws_ok($$select public.crear_expediente('PRUEBA-RECON', 'Recurso directo', '{}')$$, '22023', null,
  'El recurso no se inicia como un trámite cualquiera');

-- Trámite resuelto (rechazado) que admite reconsideración.
select id as origen from public.crear_expediente('PRUEBA-ADMITE', 'Pedido original', '{"titulo":"x"}') \gset
select throws_ok(format($$select public.interponer_reconsideracion(%L, 'No estoy de acuerdo')$$, :'origen'), 'P0001',
  'Todavía no hay una resolución firmada para recurrir', 'Sin resolución firmada no hay qué recurrir');
reset role;
select pruebas.resolver(:'origen', 'rechazado');
select pruebas.como(:'ana');
select ok((public.plazo_reconsideracion(:'origen') ->> 'vigente')::boolean, 'Recién notificada, el plazo está vigente');

select pruebas.como(:'beto');
select throws_ok(format($$select public.interponer_reconsideracion(%L, 'Ajeno')$$, :'origen'), '42501', null,
  'Otra persona no pide la reconsideración');
select pruebas.como(:'bonif');
select throws_ok(format($$select public.interponer_reconsideracion(%L, 'Del área')$$, :'origen'), '42501', null,
  'El área tampoco: la pide el/la agente');

select pruebas.como(:'ana');
select throws_ok(format($$select public.interponer_reconsideracion(%L, '  ')$$, :'origen'), '22023', null, 'Sin fundamentos no se pide');
select id as recurso from public.interponer_reconsideracion(:'origen', 'Presenté el título completo y no se tuvo en cuenta.') \gset
reset role;
select is((select origen_id from public.expedientes where id = :'recurso'), :'origen'::uuid, 'El recurso queda vinculado al original');
select is((select instancia from public.expedientes where id = :'recurso'), 1, 'Es la primera instancia de reconsideración');
select is((select a.codigo from public.expedientes e join public.areas a on a.id = e.area_actual_id where e.id = :'recurso'), 'DICT',
  'Empieza en Asesoría Legal');
select is((select count(*)::int from public.actuaciones where expediente_id = :'recurso' and tipo = 'presentacion' and estado = 'firmada'), 1,
  'El recurso tiene su presentación firmada, con los fundamentos');
select is((select count(*)::int from public.actuaciones where expediente_id = :'origen' and titulo = 'Recurso de reconsideración interpuesto'), 1,
  'En el original queda la constancia');
select is((public.plazo_reconsideracion(:'origen') -> 'recurso' ->> 'id')::uuid, :'recurso'::uuid, 'El plazo del original informa el recurso');

select pruebas.como(:'ana');
select throws_ok(format($$select public.interponer_reconsideracion(%L, 'Otra vez')$$, :'origen'), 'P0001',
  'Ya pediste la reconsideración de este trámite', 'Se pide una sola vez');
select throws_ok(format($$select public.interponer_reconsideracion(%L, 'Del recurso')$$, :'recurso'), 'P0001', null,
  'Contra el recurso no se pide otra reconsideración (corresponde el jerárquico, en papel)');

-- Un trámite que no la admite.
select id as otro from public.crear_expediente('PRUEBA-NO-ADMITE', 'Sin reconsideración', '{"titulo":"x"}') \gset
reset role;
select pruebas.resolver(:'otro', 'rechazado');
select pruebas.como(:'ana');
select throws_ok(format($$select public.interponer_reconsideracion(%L, 'Quiero recurrir')$$, :'otro'), 'P0001',
  'Este trámite no admite recurso de reconsideración', 'Si el trámite no la admite, no se pide');
select ok(public.plazo_reconsideracion(:'otro') is null, 'Y no tiene plazo de reconsideración');

-- Plazo vencido: la resolución se firmó hace un mes.
select id as viejo from public.crear_expediente('PRUEBA-ADMITE', 'Pedido viejo', '{"titulo":"x"}') \gset
reset role;
select pruebas.resolver(:'viejo', 'rechazado');
alter table public.actuaciones disable trigger actuaciones_inmutables;
update public.actuaciones set firmada_at = now() - interval '30 days' where expediente_id = :'viejo' and tipo = 'resolucion';
alter table public.actuaciones enable trigger actuaciones_inmutables;
select pruebas.como(:'ana');
select is((public.plazo_reconsideracion(:'viejo') ->> 'vigente')::boolean, false, 'A un mes de la firma, el plazo venció');
select throws_ok(format($$select public.interponer_reconsideracion(%L, 'Tarde')$$, :'viejo'), 'P0001', null, 'Fuera de plazo no se pide');

-- La novedad del recurso lleva el concepto del trámite recurrido.
reset role;
update public.expedientes e set paso_actual = 4, area_actual_id = a.id, estado = 'resuelto', resultado = 'aprobado'
  from public.areas a where a.codigo = 'BONIF' and e.id = :'recurso';
select public._incorporar_actuacion(:'recurso', 'resolucion', 'Resolución del recurso', 'Hace lugar.',
  '{"protocolo":{"numero":"100/DCH/2026","fecha":"17/11/2026"}}', :'ana', null);
select pruebas.como(:'bonif');
select is((select concepto from public.registrar_novedad(:'recurso', 'alta', '2026-11-01')), 'Trámite de prueba PRUEBA-ADMITE',
  'La novedad del recurso es la del trámite recurrido');
reset role;

select * from finish();
rollback;
