-- Huecos conocidos (relevados el 26/10/2026). Cada prueba describe lo que el sistema DEBERÍA hacer.
-- Están marcadas como TODO: hoy fallan sin romper la corrida, y cuando se corrija cada hueco
-- pg_prove avisa que la prueba "pasó inesperadamente": ahí se saca de este bloque.
begin;
\ir ayudantes.inc
select * from no_plan();
select pruebas.compartir_resultados();

select pruebas.persona('ana@prueba.test', 'Ana', 'Agente') as ana \gset
select pruebas.interno('bonif@prueba.test', 'BONIF') as bonif \gset
select pruebas.interno('jefe@prueba.test', 'BONIF', 'jefe', true) as jefe \gset
select pruebas.interno('mesa@prueba.test', 'MESA') as mesa \gset
select pruebas.interno('dir1@prueba.test', 'DIR', 'firmante', true) as dir1 \gset
select pruebas.interno('dir2@prueba.test', 'DIR', 'firmante', true) as dir2 \gset
select pruebas.interno('dir3@prueba.test', 'DIR', 'firmante', true) as dir3 \gset
select pruebas.tramite('PRUEBA-PEND') as tipo \gset
select pruebas.tramite('PRUEBA-PEND-RES', true) as tipo_res \gset

-- Cada firmante registra la firma sintética (la detección de copias es por persona).
select pruebas.como(:'dir1');
select pruebas.registrar_mi_firma();
select pruebas.como(:'dir2');
select pruebas.registrar_mi_firma();
select pruebas.como(:'dir3');
select pruebas.registrar_mi_firma();
select pruebas.como(:'jefe');
select pruebas.registrar_mi_firma();

-- Un expediente por caso, para que un hueco no contamine otro.
select pruebas.como(:'ana');
select id as exp_resuelto from public.crear_expediente('PRUEBA-PEND', 'Caso resuelto', '{"titulo":"x"}') \gset
select id as exp_archivado from public.crear_expediente('PRUEBA-PEND', 'Caso archivado', '{"titulo":"x"}') \gset
select id as exp_sin_sentido from public.crear_expediente('PRUEBA-PEND', 'Caso sin sentido', '{"titulo":"x"}') \gset
select id as exp_paso from public.crear_expediente('PRUEBA-PEND', 'Caso fuera del paso de firma', '{"titulo":"x"}') \gset
select id as exp_doble from public.crear_expediente('PRUEBA-PEND', 'Caso segunda resolución', '{"titulo":"x"}') \gset
select id as exp_cerrado from public.crear_expediente('PRUEBA-PEND', 'Caso firma sobre archivado', '{"titulo":"x"}') \gset
select id as exp_editado from public.crear_expediente('PRUEBA-PEND', 'Caso borrador editado', '{"titulo":"x"}') \gset
select id as exp_iniciado from public.crear_expediente('PRUEBA-PEND', 'Caso archivo sin resolución', '{"titulo":"x"}') \gset
select id as exp_reservado from public.crear_expediente('PRUEBA-PEND-RES', 'Caso reservado', '{"titulo":"x"}') \gset
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
select pruebas.llevar(:'exp_editado', 3);

-- Borradores de resolución para cada caso.
insert into public.actuaciones (expediente_id, tipo, titulo, contenido, datos, autor_id, area_id)
select v.exp, 'resolucion', 'Resolución', 'Hace lugar a lo solicitado.', v.datos::jsonb, v.autor, a.id
from (values
  (:'exp_sin_sentido'::uuid, '{}', :'dir1'::uuid, 'DIR'),
  (:'exp_paso'::uuid, '{"sentido":"hace_lugar"}', :'jefe'::uuid, 'BONIF'),
  (:'exp_doble'::uuid, '{"sentido":"hace_lugar"}', :'dir2'::uuid, 'DIR'),
  (:'exp_cerrado'::uuid, '{"sentido":"hace_lugar"}', :'dir3'::uuid, 'DIR'),
  (:'exp_editado'::uuid, '{"sentido":"hace_lugar"}', :'bonif'::uuid, 'BONIF')
) as v(exp, datos, autor, area)
join public.areas a on a.codigo = v.area;
select id as res_sin_sentido from public.actuaciones where expediente_id = :'exp_sin_sentido' and estado = 'borrador' \gset
select id as res_paso from public.actuaciones where expediente_id = :'exp_paso' and estado = 'borrador' \gset
select id as res_doble from public.actuaciones where expediente_id = :'exp_doble' and estado = 'borrador' \gset
select id as res_cerrado from public.actuaciones where expediente_id = :'exp_cerrado' and estado = 'borrador' \gset
select id as res_editado from public.actuaciones where expediente_id = :'exp_editado' and estado = 'borrador' \gset

select todo_start('Hueco conocido: falta corregir en la base');

-- Cierre del expediente
select pruebas.como(:'bonif');
select throws_ok(format($$select public.observar_expediente(%L, 'observación tardía')$$, :'exp_resuelto'), null, null,
  'Un expediente resuelto no se puede observar (hoy se reabre)');
select pruebas.como(:'bonif');
select throws_ok(format($$select public.observar_expediente(%L, 'observación tardía')$$, :'exp_archivado'), null, null,
  'Un expediente archivado no se puede observar (hoy se reabre)');
select throws_ok(format($$select public.archivar_expediente(%L)$$, :'exp_iniciado'), null, null,
  'Un operador no archiva un trámite sin resolución (hoy cualquiera del área lo archiva)');

-- Firma de resoluciones
select pruebas.como(:'dir1');
select throws_ok(format($$select public.firmar_actuacion(%L, '482915', pruebas.firma('genuina'), 'pen', '#1e3a8a')$$, :'res_sin_sentido'),
  null, null, 'Una resolución sin sentido explícito no se firma (hoy queda aprobada por defecto)');
select pruebas.como(:'jefe');
select throws_ok(format($$select public.firmar_actuacion(%L, '482915', pruebas.firma('genuina'), 'pen', '#1e3a8a')$$, :'res_paso'),
  null, null, 'La resolución solo se firma en el paso de firma de la Dirección (hoy la firma un jefe en el paso de proyecto)');
select pruebas.como(:'dir2');
select throws_ok(format($$select public.firmar_actuacion(%L, '482915', pruebas.firma('genuina'), 'pen', '#1e3a8a')$$, :'res_doble'),
  null, null, 'Un expediente tiene una sola resolución (hoy se firma otra y consume otro número)');
select pruebas.como(:'dir3');
select throws_ok(format($$select public.firmar_actuacion(%L, '482915', pruebas.firma('genuina'), 'pen', '#1e3a8a')$$, :'res_cerrado'),
  null, null, 'No se firma una resolución en un expediente archivado (hoy lo vuelve a resuelto)');

-- Lo que se firma es lo que se leyó: el proyecto no se edita cuando ya está en la Dirección.
reset role;
select pruebas.llevar(:'exp_editado', 4);
select pruebas.como(:'bonif');
update public.actuaciones set contenido = 'Texto cambiado después de pasar a la Dirección' where id = :'res_editado';
reset role;
select is((select contenido from public.actuaciones where id = :'res_editado'), 'Hace lugar a lo solicitado.',
  'El autor no cambia el proyecto cuando ya está en la Dirección para la firma');

-- Firma registrada
select pruebas.como(:'dir1');
select throws_ok('select pruebas.registrar_mi_firma()', null, null,
  'Para registrar otra firma hace falta la clave anterior (hoy alcanza con la sesión)');

-- Privacidad
select pruebas.como(:'mesa');
select is((select count(*)::int from public.perfiles where id = :'ana'), 0,
  'Un área sin trámites de la agente no lee su perfil completo (CUIL, legajo, teléfono)');

reset role;
insert into public.ia_generaciones (expediente_id, tipo, modelo, solicitado_por, resultado)
values (:'exp_reservado', 'dictamen', 'prueba', :'bonif', 'Borrador con datos de salud');
select pruebas.como(:'mesa');
select is((select count(*)::int from public.ia_generaciones where expediente_id = :'exp_reservado'), 0,
  'Un área sin permiso no lee lo que la IA redactó en un expediente reservado');

select todo_end();
reset role;

select * from finish();
rollback;
