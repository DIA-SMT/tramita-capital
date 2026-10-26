-- Tablero de impacto: las métricas responden al personal interno y no a los agentes.
begin;
\ir ayudantes.inc
select * from no_plan();
select pruebas.compartir_resultados();

select pruebas.persona('ana@prueba.test', 'Ana', 'Agente') as ana \gset
select pruebas.interno('bonif@prueba.test', 'BONIF') as bonif \gset
select pruebas.tramite('PRUEBA-METRICAS') as tipo \gset
update public.tipos_tramite set linea_base_dias = 35 where id = :'tipo';

select pruebas.como(:'ana');
select id as exp from public.crear_expediente('PRUEBA-METRICAS', 'Bonificación', '{"titulo":"Abogada"}') \gset
reset role;
select pruebas.resolver(:'exp');

select pruebas.como(:'bonif');
select ok(public.metricas_resumen() ?& array['activos', 'resueltos_30d', 'vencidos', 'promedio_dias', 'linea_base_dias', 'hojas_evitadas'],
  'El resumen trae los indicadores del tablero');
select ok((public.metricas_resumen() ->> 'resueltos_30d')::int >= 1, 'El resumen cuenta el expediente resuelto');
select is((select array[total::int, resueltos::int, linea_base_dias::int] from public.metricas_por_tipo() where codigo = 'PRUEBA-METRICAS'),
  array[1, 1, 35], 'Por tipo de trámite: total, resueltos y línea de base');
select is((select count(*)::int from public.metricas_serie(7)), 7, 'La serie trae un día por fila');
select ok((select count(*) > 0 from public.metricas_carga()), 'La carga por persona responde');
select lives_ok('select * from public.metricas_por_etapa(30)', 'Los tiempos por oficina responden');
select ok(public.metricas_impacto(30) ?& array['resoluciones', 'novedades_registradas', 'novedades_pendientes'],
  'El impacto trae resoluciones y novedades');

select pruebas.como(:'ana');
select throws_ok('select public.metricas_resumen()', '42501', null, 'Una agente no ve el resumen');
select throws_ok('select * from public.metricas_por_tipo()', '42501', null, 'Una agente no ve las métricas por tipo');
select throws_ok('select * from public.metricas_carga()', '42501', null, 'Una agente no ve la carga por persona');
select throws_ok('select * from public.metricas_serie(7)', '42501', null, 'Una agente no ve la serie');
select throws_ok('select * from public.metricas_por_etapa(30)', '42501', null, 'Una agente no ve los tiempos por oficina');
select throws_ok('select public.metricas_impacto(30)', '42501', null, 'Una agente no ve el impacto');
reset role;

select * from finish();
rollback;
