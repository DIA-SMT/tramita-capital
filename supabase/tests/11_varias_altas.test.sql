-- Varias altas en un expediente (migración 001800): una línea de novedad por hijo/a y la familia numerosa, con una
-- sola foja firmada; el concepto es el del trámite o el de una de sus altas adicionales.
begin;
\ir ayudantes.inc
select * from no_plan();
select pruebas.compartir_resultados();

select pruebas.persona('ana@prueba.test', 'Ana', 'Agente') as ana \gset
select pruebas.interno('bonif@prueba.test', 'BONIF') as bonif \gset

select pruebas.tramite('PRUEBA-HIJO') as hijo \gset
select pruebas.tramite('PRUEBA-FAMNUM') as famnum \gset
select pruebas.tramite('PRUEBA-OTRO') as otro \gset
update public.tipos_tramite set altas_adicionales = array['PRUEBA-FAMNUM'] where id = :'hijo';

select pruebas.como(:'ana');
select id as exp from public.crear_expediente('PRUEBA-HIJO', 'Dos hijos y familia numerosa', '{"titulo":"x"}') \gset
reset role;
select pruebas.resolver(:'exp', 'aprobado');

select pruebas.como(:'bonif');
select throws_ok(format($$select public.registrar_novedades(%L, '[]', 'Texto')$$, :'exp'), '22023', null, 'Sin líneas no hay novedad');
select throws_ok(
  format($$select public.registrar_novedades(%L, '[{"item":"hijo:1","movimiento":"alta","vigencia_desde":"2026-11-01"},{"item":"hijo:1","movimiento":"alta","vigencia_desde":"2026-11-01"}]', 'Texto')$$, :'exp'),
  '22023', null, 'No se repite una línea en el mismo pedido');
select throws_ok(
  format($$select public.registrar_novedades(%L, '[{"item":"x","codigo":"PRUEBA-OTRO","movimiento":"alta","vigencia_desde":"2026-11-01"}]', 'Texto')$$, :'exp'),
  '22023', null, 'El concepto tiene que ser del trámite o de sus altas adicionales');

select is(
  (select count(*)::int from public.registrar_novedades(:'exp',
    '[{"item":"hijo:30111222","movimiento":"alta","vigencia_desde":"2026-11-01","detalle":{"Hijo/a":"Juan"}},
      {"item":"hijo:30111333","movimiento":"alta","vigencia_desde":"2026-11-01","detalle":{"Hijo/a":"Lola"}},
      {"item":"familia_numerosa","codigo":"PRUEBA-FAMNUM","movimiento":"alta","vigencia_desde":"2026-11-15"}]',
    'Se comunica a Liquidación de Haberes el alta de dos hijos y de la familia numerosa.')),
  3, 'Se registran las tres líneas');
reset role;

select is((select count(*)::int from public.actuaciones where expediente_id = :'exp' and titulo = 'Novedad a Liquidación de Haberes'), 1,
  'Con una sola foja firmada');
select is((select count(*)::int from public.novedades_haberes where expediente_id = :'exp' and concepto = 'Trámite de prueba PRUEBA-HIJO'), 2,
  'Una por hijo/a, con el concepto del trámite');
select is((select concepto from public.novedades_haberes where expediente_id = :'exp' and item = 'familia_numerosa'), 'Trámite de prueba PRUEBA-FAMNUM',
  'La familia numerosa, con su propio concepto');
select is((select vigencia_desde from public.novedades_haberes where expediente_id = :'exp' and item = 'familia_numerosa'), '2026-11-01'::date,
  'El período es el mes');

select pruebas.como(:'bonif');
select throws_ok(
  format($$select public.registrar_novedades(%L, '[{"item":"hijo:30111222","movimiento":"alta","vigencia_desde":"2026-12-01"}]', 'Otra vez')$$, :'exp'),
  'P0001', 'Ya hay una novedad registrada para esa línea (hijo:30111222)', 'La misma línea no se registra dos veces');
select ok((select count(*) = 1 from public.registrar_novedades(:'exp', '[{"item":"hijo:30111444","movimiento":"alta","vigencia_desde":"2026-12-01"}]', 'Un hijo más')),
  'Otra línea del mismo expediente sí');
reset role;

select * from finish();
rollback;
