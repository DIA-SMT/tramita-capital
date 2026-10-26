-- Novedades de haberes: registro en el paso de novedad, quién las ve, carga en Civitas y anulación.
begin;
\ir ayudantes.inc
select * from no_plan();
select pruebas.compartir_resultados();

select pruebas.persona('ana@prueba.test', 'Ana', 'Agente') as ana \gset
select pruebas.persona('beto@prueba.test', 'Beto', 'Agente') as beto \gset
select pruebas.interno('bonif@prueba.test', 'BONIF') as bonif \gset
select pruebas.interno('liq@prueba.test', 'LIQ') as liq \gset
select pruebas.interno('dir@prueba.test', 'DIR', 'firmante', true) as dir \gset
select pruebas.interno('mesa@prueba.test', 'MESA') as mesa \gset
select pruebas.tramite('PRUEBA-NOVEDAD', true) as tipo \gset

select pruebas.como(:'ana');
select id as exp from public.crear_expediente('PRUEBA-NOVEDAD', 'Asignación familiar', '{"titulo":"Partida"}') \gset
select id as exp_rechazado from public.crear_expediente('PRUEBA-NOVEDAD', 'Otra asignación', '{"titulo":"Partida"}') \gset
reset role;

-- Antes de la resolución no hay novedad.
select pruebas.llevar(:'exp', 5);
select pruebas.como(:'bonif');
select throws_ok(format($$select public.registrar_novedad(%L, 'alta', '2026-08-01')$$, :'exp'), 'P0001',
  'La novedad se registra con la resolución firmada que hace lugar', 'Sin resolución firmada no hay novedad');
reset role;

select pruebas.resolver(:'exp_rechazado', 'rechazado');
select pruebas.resolver(:'exp');
select pruebas.llevar(:'exp', 4);
update public.expedientes set estado = 'resuelto' where id = :'exp';

select pruebas.como(:'bonif');
select throws_ok(format($$select public.registrar_novedad(%L, 'alta', '2026-08-01')$$, :'exp_rechazado'), 'P0001',
  'La novedad se registra con la resolución firmada que hace lugar', 'Una resolución que rechaza no genera novedad');

select pruebas.como(:'dir');
select throws_ok(format($$select public.registrar_novedad(%L, 'alta', '2026-08-01')$$, :'exp'), 'P0001',
  'El expediente no está en el paso de novedad a Liquidación', 'Fuera del paso de novedad no se registra');
reset role;
select pruebas.llevar(:'exp', 5);
update public.expedientes set estado = 'resuelto' where id = :'exp';

select pruebas.como(:'mesa');
select throws_ok(format($$select public.registrar_novedad(%L, 'alta', '2026-08-01')$$, :'exp'), '42501', null,
  'Solo el área que tiene el expediente registra la novedad');

select pruebas.como(:'bonif');
select throws_ok(format($$select public.registrar_novedad(%L, 'traslado', '2026-08-01')$$, :'exp'), 'P0001', 'Movimiento inválido',
  'Solo se aceptan alta, baja o modificación');
select id as nov from public.registrar_novedad(:'exp', 'alta', '2026-08-17', null, '{"Hijo/a":"Juan"}', null, null) \gset
select throws_ok(format($$select public.registrar_novedad(%L, 'alta', '2026-09-01')$$, :'exp'), 'P0001',
  'Ya hay una novedad registrada para este expediente', 'No se registra dos veces la misma novedad');
reset role;

select is(
  (select array[n.estado, n.movimiento, n.vigencia_desde::text, n.resolucion_numero, (n.numero_expediente = e.numero)::text]
     from public.novedades_haberes n join public.expedientes e on e.id = n.expediente_id where n.id = :'nov'),
  array['pendiente', 'alta', '2026-08-01', '99/DCH/2026', 'true'],
  'La novedad queda pendiente, desde el primer día del período, con la resolución y el expediente copiados');
select is((select count(*)::int from public.actuaciones where expediente_id = :'exp' and titulo = 'Novedad a Liquidación de Haberes' and estado = 'firmada'), 1,
  'La novedad queda como foja firmada');

-- Quién la ve
select pruebas.como(:'ana');
select is((select count(*)::int from public.novedades_haberes where id = :'nov'), 1, 'La agente ve la novedad de su trámite');
select pruebas.como(:'beto');
select is((select count(*)::int from public.novedades_haberes where id = :'nov'), 0, 'Otra persona no la ve');
select pruebas.como(:'mesa');
select is((select count(*)::int from public.novedades_haberes where id = :'nov'), 0, 'Mesa de Entradas no la ve');
select pruebas.como(:'liq');
select is((select count(*)::int from public.novedades_haberes where id = :'nov'), 1, 'Liquidación la ve');
select is((select count(*)::int from public.expedientes where id = :'exp'), 0,
  'Liquidación ve la novedad aunque no vea el expediente reservado');

-- Carga en Civitas
select pruebas.como(:'dir');
select is((select count(*)::int from public.novedades_haberes where id = :'nov'), 1, 'La Dirección la ve');
select throws_ok(format($$select public.marcar_novedades_cargadas(array[%L]::uuid[])$$, :'nov'), '42501', null,
  'La Dirección no marca cargas en Civitas');
select pruebas.como(:'liq');
select is(public.marcar_novedades_cargadas(array[:'nov']::uuid[], 'Lote 2026-08'), 1, 'Liquidación la marca como cargada');
select is(public.marcar_novedades_cargadas(array[:'nov']::uuid[], 'Lote repetido'), 0, 'Una novedad cargada no se vuelve a marcar');
select is((select array[estado, referencia_carga] from public.novedades_haberes where id = :'nov'), array['cargada', 'Lote 2026-08'],
  'Queda la referencia de la carga');
select throws_ok(format($$select public.anular_novedad(%L, 'error')$$, :'nov'), 'P0001', 'Solo se anulan novedades pendientes de carga',
  'Una novedad ya cargada no se anula');

-- Anulación de una pendiente
reset role;
select pruebas.llevar(:'exp_rechazado', 5);
update public.expedientes set estado = 'resuelto', resultado = 'aprobado' where id = :'exp_rechazado';
select pruebas.como(:'bonif');
select id as nov2 from public.registrar_novedad(:'exp_rechazado', 'baja', '2026-09-01') \gset
select throws_ok(format($$select public.anular_novedad(%L, '  ')$$, :'nov2'), 'P0001', 'Indicá el motivo de la anulación',
  'Para anular hace falta un motivo');
select is((select estado from public.anular_novedad(:'nov2', 'Período equivocado')), 'anulada', 'Bonificaciones anula una novedad pendiente');
select ok((select id is not null from public.registrar_novedad(:'exp_rechazado', 'baja', '2026-10-01')),
  'Anulada la anterior, se puede registrar la correcta');
reset role;

select * from finish();
rollback;
