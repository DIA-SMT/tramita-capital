-- Integridad del expediente y privacidad: los huecos relevados el 26/10/2026, ya corregidos
-- (migración 20261026001300_integridad.sql). Hasta esa migración estas pruebas eran TODO.
begin;
\ir ayudantes.inc
select * from no_plan();
select pruebas.compartir_resultados();

select pruebas.persona('ana@prueba.test', 'Ana', 'Agente') as ana \gset
select pruebas.persona('carla@prueba.test', 'Carla', 'Sin Trámites') as carla \gset
select pruebas.interno('bonif@prueba.test', 'BONIF') as bonif \gset
select pruebas.interno('jefe@prueba.test', 'BONIF', 'jefe', true) as jefe \gset
select pruebas.interno('mesa@prueba.test', 'MESA') as mesa \gset
select pruebas.interno('dir1@prueba.test', 'DIR', 'firmante', true) as dir1 \gset
select pruebas.interno('dir2@prueba.test', 'DIR', 'firmante', true) as dir2 \gset
select pruebas.interno('dir3@prueba.test', 'DIR', 'firmante', true) as dir3 \gset
select pruebas.tramite('PRUEBA-INTEG') as tipo \gset
select pruebas.tramite('PRUEBA-INTEG-RES', true) as tipo_res \gset

-- Cada firmante registra la firma sintética (la detección de copias es por persona).
select pruebas.como(:'dir1');
select pruebas.registrar_mi_firma();
select pruebas.como(:'dir2');
select pruebas.registrar_mi_firma();
select pruebas.como(:'dir3');
select pruebas.registrar_mi_firma();
select pruebas.como(:'jefe');
select pruebas.registrar_mi_firma();

-- Un expediente por caso, para que un caso no contamine otro.
select pruebas.como(:'ana');
select id as exp_resuelto from public.crear_expediente('PRUEBA-INTEG', 'Caso resuelto', '{"titulo":"x"}') \gset
select id as exp_archivado from public.crear_expediente('PRUEBA-INTEG', 'Caso archivado', '{"titulo":"x"}') \gset
select id as exp_sin_sentido from public.crear_expediente('PRUEBA-INTEG', 'Caso sin sentido', '{"titulo":"x"}') \gset
select id as exp_paso from public.crear_expediente('PRUEBA-INTEG', 'Caso fuera del paso de firma', '{"titulo":"x"}') \gset
select id as exp_doble from public.crear_expediente('PRUEBA-INTEG', 'Caso segunda resolución', '{"titulo":"x"}') \gset
select id as exp_cerrado from public.crear_expediente('PRUEBA-INTEG', 'Caso firma sobre archivado', '{"titulo":"x"}') \gset
select id as exp_editado from public.crear_expediente('PRUEBA-INTEG', 'Caso borrador editado', '{"titulo":"x"}') \gset
select id as exp_iniciado from public.crear_expediente('PRUEBA-INTEG', 'Caso archivo sin resolución', '{"titulo":"x"}') \gset
select id as exp_reservado from public.crear_expediente('PRUEBA-INTEG-RES', 'Caso reservado', '{"titulo":"x"}') \gset
reset role;

select pruebas.resolver(:'exp_resuelto');
select pruebas.llevar(:'exp_archivado', 1);
update public.expedientes set estado = 'archivado' where id = :'exp_archivado';
select pruebas.llevar(:'exp_sin_sentido', 4);
select pruebas.llevar(:'exp_paso', 3);
select pruebas.resolver(:'exp_doble');
select pruebas.llevar(:'exp_doble', 4);
update public.expedientes set estado = 'resuelto' where id = :'exp_doble';
select pruebas.llevar(:'exp_cerrado', 4);
update public.expedientes set estado = 'archivado' where id = :'exp_cerrado';

-- Borradores de resolución para cada caso.
insert into public.actuaciones (expediente_id, tipo, titulo, contenido, datos, autor_id, area_id)
select v.exp, 'resolucion', 'Resolución', 'Hace lugar a lo solicitado.', v.datos::jsonb, v.autor, a.id
from (values
  (:'exp_sin_sentido'::uuid, '{}', :'dir1'::uuid, 'DIR'),
  (:'exp_paso'::uuid, '{"sentido":"hace_lugar"}', :'jefe'::uuid, 'BONIF'),
  (:'exp_doble'::uuid, '{"sentido":"hace_lugar"}', :'dir2'::uuid, 'DIR'),
  (:'exp_cerrado'::uuid, '{"sentido":"hace_lugar"}', :'dir3'::uuid, 'DIR')
) as v(exp, datos, autor, area)
join public.areas a on a.codigo = v.area;
select id as res_sin_sentido from public.actuaciones where expediente_id = :'exp_sin_sentido' and estado = 'borrador' \gset
select id as res_paso from public.actuaciones where expediente_id = :'exp_paso' and estado = 'borrador' \gset
select id as res_doble from public.actuaciones where expediente_id = :'exp_doble' and estado = 'borrador' \gset
select id as res_cerrado from public.actuaciones where expediente_id = :'exp_cerrado' and estado = 'borrador' \gset

-- ---------------------------------------------------------------------
-- Cierre del expediente
-- ---------------------------------------------------------------------
select pruebas.como(:'bonif');
select throws_ok(format($$select public.observar_expediente(%L, 'observación tardía')$$, :'exp_resuelto'), 'P0001', null,
  'Un expediente resuelto no se puede observar');
select throws_ok(format($$select public.observar_expediente(%L, 'observación tardía')$$, :'exp_archivado'), 'P0001', null,
  'Un expediente archivado no se puede observar');
select throws_ok(format($$select public.archivar_expediente(%L)$$, :'exp_iniciado'), '42501', null,
  'Un operador no archiva un trámite sin resolución');
select is((select estado::text from public.archivar_expediente(:'exp_resuelto', 'Notificado. Archívese.')), 'archivado',
  'Con la resolución firmada, el operador archiva (cierre normal)');
select pruebas.como(:'jefe');
select is((select estado::text from public.archivar_expediente(:'exp_iniciado', 'Desistido. Archívese.')), 'archivado',
  'La jefatura archiva un trámite sin resolución');

-- ---------------------------------------------------------------------
-- Firma de resoluciones
-- ---------------------------------------------------------------------
select pruebas.como(:'dir1');
select throws_ok(format($$select public.firmar_actuacion(%L, '482915', pruebas.firma('genuina'), 'pen', '#1e3a8a')$$, :'res_sin_sentido'),
  '22023', 'Indicá si la resolución hace lugar o no a lo solicitado', 'Una resolución sin sentido explícito no se firma');
select pruebas.como(:'jefe');
select throws_ok(format($$select public.firmar_actuacion(%L, '482915', pruebas.firma('genuina'), 'pen', '#1e3a8a')$$, :'res_paso'),
  '42501', 'La resolución se firma en el paso de firma del circuito', 'La resolución solo se firma en el paso de firma de la Dirección');
select pruebas.como(:'dir2');
select throws_ok(format($$select public.firmar_actuacion(%L, '482915', pruebas.firma('genuina'), 'pen', '#1e3a8a')$$, :'res_doble'),
  'P0001', 'El expediente ya tiene su resolución firmada', 'Un expediente tiene una sola resolución');
select pruebas.como(:'dir3');
select throws_ok(format($$select public.firmar_actuacion(%L, '482915', pruebas.firma('genuina'), 'pen', '#1e3a8a')$$, :'res_cerrado'),
  'P0001', 'El expediente está cerrado: no se firman actuaciones', 'No se firma una resolución en un expediente archivado');
reset role;
select is((select count(*)::int from public.intentos_firma where perfil_id in (:'dir1', :'dir2', :'dir3', :'jefe')), 0,
  'Las reglas del expediente se controlan antes de la firma: no cuentan como intentos fallidos');

-- ---------------------------------------------------------------------
-- Lo que se firma es lo que se leyó
-- ---------------------------------------------------------------------
select pruebas.llevar(:'exp_editado', 3);
select pruebas.como(:'bonif');
insert into public.actuaciones (expediente_id, tipo, titulo, contenido, datos, autor_id)
values (:'exp_editado', 'resolucion', 'Resolución', 'Hace lugar a lo solicitado.', '{"sentido":"hace_lugar"}', :'bonif')
returning id as res_editado \gset
reset role;
select is((select a.codigo from public.actuaciones x join public.areas a on a.id = x.area_id where x.id = :'res_editado'), 'BONIF',
  'El borrador queda atado al área donde se redactó');

select pruebas.como(:'bonif');
update public.actuaciones set contenido = 'Hace lugar. Corregido antes del pase.' where id = :'res_editado';
reset role;
select is((select contenido from public.actuaciones where id = :'res_editado'), 'Hace lugar. Corregido antes del pase.',
  'Mientras el expediente está en su área, el autor corrige el proyecto');

select pruebas.llevar(:'exp_editado', 4);
select pruebas.como(:'bonif');
update public.actuaciones set contenido = 'Texto cambiado después de pasar a la Dirección' where id = :'res_editado';
delete from public.actuaciones where id = :'res_editado';
reset role;
select is((select contenido from public.actuaciones where id = :'res_editado'), 'Hace lugar. Corregido antes del pase.',
  'Cuando el proyecto está en la Dirección, su autor no lo cambia ni lo borra');

select pruebas.como(:'mesa');
select throws_ok(
  format($$insert into public.actuaciones (expediente_id, tipo, titulo, contenido, autor_id) values (%L, 'providencia', 'x', 'x', %L)$$, :'exp_iniciado', :'mesa'),
  '42501', null, 'Otra área no redacta borradores en un expediente que no tiene');

-- La administración redacta sin pertenecer al área: su borrador también queda atado al área.
reset role;
select pruebas.persona('admin@prueba.test', 'Admin', 'Sistema') as admin \gset
update public.perfiles set es_admin = true where id = :'admin';
select pruebas.como(:'admin');
insert into public.actuaciones (expediente_id, tipo, titulo, contenido, autor_id)
values (:'exp_paso', 'providencia', 'Providencia de la administración', 'Texto inicial', :'admin')
returning id as prov_admin \gset
update public.actuaciones set contenido = 'Texto corregido' where id = :'prov_admin';
reset role;
select is((select array[a.codigo, x.contenido] from public.actuaciones x join public.areas a on a.id = x.area_id where x.id = :'prov_admin'),
  array['BONIF', 'Texto corregido'], 'El borrador de la administración queda en el área del expediente y se puede corregir');

-- ---------------------------------------------------------------------
-- Firma registrada
-- ---------------------------------------------------------------------
select pruebas.como(:'dir1');
select throws_ok('select pruebas.registrar_mi_firma()', '42501', 'Ingresá tu clave de firma actual',
  'Para registrar otra firma hace falta la clave actual');
select throws_ok($$select public.revocar_firma(null)$$, '42501', 'Ingresá tu clave de firma actual',
  'Para revocar la firma hace falta la clave actual');

-- ---------------------------------------------------------------------
-- Privacidad
-- ---------------------------------------------------------------------
select pruebas.como(:'mesa');
select is((select count(*)::int from public.perfiles where id = :'carla'), 0,
  'El personal interno no lee el perfil de un agente sin trámites a la vista');
select is((select count(*)::int from public.perfiles where id = :'ana'), 1,
  'El personal interno lee el perfil de quien tiene un trámite que puede ver');
select is((select count(*)::int from public.perfiles where id = :'bonif'), 1, 'El personal interno se ve entre sí');

reset role;
insert into public.ia_generaciones (expediente_id, tipo, modelo, solicitado_por, resultado)
values (:'exp_reservado', 'dictamen', 'prueba', :'bonif', 'Borrador con datos de salud');
select pruebas.como(:'mesa');
select is((select count(*)::int from public.ia_generaciones where expediente_id = :'exp_reservado'), 0,
  'Un área sin permiso no lee lo que la IA redactó en un expediente reservado');
select pruebas.como(:'bonif');
select is((select count(*)::int from public.ia_generaciones where expediente_id = :'exp_reservado'), 1,
  'El área que tiene el expediente reservado sí lo lee');
reset role;

select * from finish();
rollback;
