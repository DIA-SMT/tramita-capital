-- Controles del paso: los marca el área que tiene el expediente y quedan guardados por paso.
begin;
\ir ayudantes.inc
select * from no_plan();
select pruebas.compartir_resultados();

select pruebas.persona('ana@prueba.test', 'Ana', 'Agente') as ana \gset
select pruebas.interno('bonif@prueba.test', 'BONIF') as bonif \gset
select pruebas.interno('mesa@prueba.test', 'MESA') as mesa \gset
select pruebas.tramite('PRUEBA-CONTROLES') as tipo \gset
update public.pasos_circuito set controles = array['Controlar la documentación', 'Verificar en Civitas']
 where tipo_tramite_id = :'tipo' and orden = 1;

select pruebas.como(:'ana');
select id as exp from public.crear_expediente('PRUEBA-CONTROLES', 'Caso con controles', '{"titulo":"x"}') \gset
select throws_ok(format('select public.marcar_control(%L, 0, true)', :'exp'), '42501', null, 'La agente no marca controles');

select pruebas.como(:'mesa');
select throws_ok(format('select public.marcar_control(%L, 0, true)', :'exp'), '42501', null, 'Otra área no marca controles');

select pruebas.como(:'bonif');
select ok((public.marcar_control(:'exp', 0, true) -> '0' ->> 'por') = :'bonif', 'El área marca un control y queda quién lo hizo');
select ok((public.marcar_control(:'exp', 1, true) ? '1'), 'Se marca otro control del mismo paso');
select throws_ok(format('select public.marcar_control(%L, 5, true)', :'exp'), '22023', null, 'No se marca un control que el paso no tiene');
select ok(not (public.marcar_control(:'exp', 0, false) ? '0'), 'Se desmarca un control');
reset role;
select is((select controles_hechos -> '1' ->> '1' is not null from public.expedientes where id = :'exp'), true,
  'Los controles quedan guardados en el expediente, por paso');
select is((select (controles_hechos -> '1') ? '0' from public.expedientes where id = :'exp'), false, 'El control desmarcado ya no figura');

-- En un expediente cerrado no se marcan controles.
update public.expedientes set estado = 'archivado' where id = :'exp';
select pruebas.como(:'bonif');
select throws_ok(format('select public.marcar_control(%L, 0, true)', :'exp'), 'P0001', 'El expediente está cerrado', 'En un expediente cerrado no se marcan controles');
reset role;

select * from finish();
rollback;
