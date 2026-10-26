-- Seguridad: qué ve cada persona (RLS) y qué no puede tocar por fuera de las RPC.
begin;
\ir ayudantes.inc
select * from no_plan();
select pruebas.compartir_resultados();

select pruebas.persona('ana@prueba.test', 'Ana', 'Agente') as ana \gset
select pruebas.persona('beto@prueba.test', 'Beto', 'Agente') as beto \gset
select pruebas.interno('bonif@prueba.test', 'BONIF') as bonif \gset
select pruebas.interno('mesa@prueba.test', 'MESA') as mesa \gset
select pruebas.interno('medicina@prueba.test', 'MEDLAB', 'operador', true) as medicina \gset
select pruebas.persona('admin@prueba.test', 'Admin', 'Sistema') as admin \gset
update public.perfiles set es_admin = true where id = :'admin';
select pruebas.tramite('PRUEBA-COMUN') as tipo \gset
select pruebas.tramite('PRUEBA-RESERVADO', true) as tipo_res \gset

-- Dos trámites de Ana (uno reservado) y uno de Beto.
select pruebas.como(:'ana');
select id as exp_ana from public.crear_expediente('PRUEBA-COMUN', 'Bonificación por título', '{"titulo":"Abogada"}') \gset
select id as exp_res from public.crear_expediente('PRUEBA-RESERVADO', 'Asignación con datos de salud', '{"titulo":"Certificado"}') \gset
select pruebas.como(:'beto');
select id as exp_beto from public.crear_expediente('PRUEBA-COMUN', 'Bonificación de Beto', '{"titulo":"Contador"}') \gset

-- Un borrador interno en el trámite de Ana.
select pruebas.como(:'bonif');
insert into public.actuaciones (expediente_id, tipo, titulo, contenido, autor_id, area_id)
select :'exp_ana', 'providencia', 'Borrador interno', 'Texto sin firmar', :'bonif', a.id from public.areas a where a.codigo = 'BONIF';

-- ---------------------------------------------------------------------
-- La agente
-- ---------------------------------------------------------------------
select pruebas.como(:'ana');
select is((select count(*)::int from public.expedientes where id in (:'exp_ana', :'exp_res', :'exp_beto')), 2,
  'La agente ve sus dos trámites y no el de otra persona');
select is((select count(*)::int from public.actuaciones where expediente_id = :'exp_ana' and estado = 'borrador'), 0,
  'La agente no ve los borradores internos de su trámite');
select is((select count(*)::int from public.actuaciones where expediente_id = :'exp_ana' and estado = 'firmada'), 1,
  'La agente ve las fojas firmadas de su trámite');
select is((select count(*)::int from public.perfiles), 1, 'La agente ve solo su propio perfil');
select is((select count(*)::int from public.plantillas), 0, 'La agente no ve los modelos de dictamen y resolución');
select is((select count(*)::int from public.auditoria), 0, 'La agente no ve la auditoría');
select ok((select count(*) from public.tipos_tramite where activo) > 0, 'La agente ve el catálogo de trámites');

select throws_ok(
  format($$insert into public.actuaciones (expediente_id, tipo, titulo, autor_id) values (%L, 'nota', 'Foja trucha', %L)$$, :'exp_ana', :'ana'),
  '42501', null, 'La agente no puede agregar fojas por fuera de las RPC');
select throws_ok(format($$update public.expedientes set estado = 'resuelto' where id = %L$$, :'exp_ana'),
  '42501', null, 'La agente no puede cambiar el estado de su trámite');
select throws_ok('update public.perfiles set es_admin = true where id = auth.uid()',
  '42501', null, 'La agente no puede darse permisos de administración');
select lives_ok($$update public.perfiles set telefono = '3815550000' where id = auth.uid()$$,
  'La agente puede actualizar su teléfono');
select throws_ok('select public.metricas_resumen()', '42501', null, 'La agente no accede a las métricas');
select throws_ok(format($$select public.fijar_prioridad(%L, 'urgente', 'quiero que sea urgente')$$, :'exp_ana'),
  '42501', null, 'La agente no puede cambiar la prioridad');
select throws_ok('select pruebas.registrar_mi_firma()', '42501', null, 'La agente no puede registrar firma de funcionario');
select throws_ok(format($$select public.tomar_expediente(%L)$$, :'exp_ana'), '42501', null, 'La agente no puede tomar expedientes');

-- La consulta a Migue es de quien pregunta.
insert into public.ia_generaciones (tipo, modelo, solicitado_por, consulta, resultado)
values ('asistente', 'prueba', :'ana', 'Tengo una consulta sobre mi salud', 'Respuesta');

select pruebas.como(:'beto');
select throws_ok(format($$select public.subsanar_expediente(%L, 'no es mío')$$, :'exp_ana'),
  '42501', null, 'Otra persona no puede subsanar un trámite ajeno');
select is((select count(*)::int from public.actuaciones where expediente_id = :'exp_ana'), 0,
  'Otra persona no ve las fojas de un trámite ajeno');

-- ---------------------------------------------------------------------
-- Personal interno
-- ---------------------------------------------------------------------
select pruebas.como(:'mesa');
select is((select count(*)::int from public.expedientes where id in (:'exp_ana', :'exp_beto')), 2,
  'El personal interno ve los trámites no reservados');
select is((select count(*)::int from public.expedientes where id = :'exp_res'), 0,
  'Un área sin permiso no ve un trámite reservado que no tiene');
select is((select count(*)::int from public.actuaciones where expediente_id = :'exp_ana' and estado = 'borrador'), 1,
  'El personal interno ve los borradores');
select ok((select count(*) from public.plantillas) > 0, 'El personal interno ve los modelos');
select is((select count(*)::int from public.ia_generaciones where tipo = 'asistente'), 0,
  'El personal interno no lee las consultas a Migue');
-- La RLS filtra el borrador ajeno: el update no toca ninguna fila.
update public.actuaciones set contenido = 'Cambio ajeno' where expediente_id = :'exp_ana' and estado = 'borrador';
reset role;
select is((select contenido from public.actuaciones where expediente_id = :'exp_ana' and estado = 'borrador'), 'Texto sin firmar',
  'Nadie edita el borrador de otra persona');

select pruebas.como(:'bonif');
select is((select count(*)::int from public.expedientes where id = :'exp_res'), 1,
  'El área que tiene un trámite reservado lo ve');

select pruebas.como(:'medicina');
select is((select count(*)::int from public.expedientes where id = :'exp_res'), 1,
  'Quien tiene permiso de reservados lo ve');

select pruebas.como(:'admin');
select is((select count(*)::int from public.expedientes where id in (:'exp_ana', :'exp_res', :'exp_beto')), 3,
  'La administración ve todos los trámites');
select ok((select count(*) from public.auditoria where registro_id = :'exp_ana') > 0,
  'La administración ve la auditoría del trámite');

-- ---------------------------------------------------------------------
-- Sin sesión
-- ---------------------------------------------------------------------
select pruebas.anonimo();
select throws_ok('select count(*) from public.expedientes', '42501', null, 'Sin sesión no se leen expedientes');
select throws_ok('select count(*) from public.perfiles', '42501', null, 'Sin sesión no se leen perfiles');
select throws_ok($$select public.crear_expediente('PRUEBA-COMUN', 'x', '{"titulo":"x"}')$$, '42501', null,
  'Sin sesión no se inician trámites');
select is(public.verificar_foja('0000000000000000000z'), null, 'La verificación pública rechaza códigos mal formados');

reset role;
select * from finish();
rollback;
