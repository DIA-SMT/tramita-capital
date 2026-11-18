-- Huecos relevados el 26/10/2026, corregidos en la migración 20261027001300_huecos_base.sql.
-- Cada caso tiene su expediente, para que una regla no contamine otra. Al lado de cada regla hay
-- una prueba de que el circuito normal sigue funcionando.
-- Un hueco nuevo se agrega acá como TODO (todo_start / todo_end) hasta corregirlo.
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
select pruebas.persona('admin@prueba.test', 'Admin', 'Sistema') as admin \gset
update public.perfiles set es_admin = true where id = :'admin';
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

select pruebas.como(:'ana');
select id as exp_resuelto from public.crear_expediente('PRUEBA-PEND', 'Caso resuelto', '{"titulo":"x"}') \gset
select id as exp_archivado from public.crear_expediente('PRUEBA-PEND', 'Caso archivado', '{"titulo":"x"}') \gset
select id as exp_sin_sentido from public.crear_expediente('PRUEBA-PEND', 'Caso sin sentido', '{"titulo":"x"}') \gset
select id as exp_paso from public.crear_expediente('PRUEBA-PEND', 'Caso fuera del paso de firma', '{"titulo":"x"}') \gset
select id as exp_doble from public.crear_expediente('PRUEBA-PEND', 'Caso segunda resolución', '{"titulo":"x"}') \gset
select id as exp_cerrado from public.crear_expediente('PRUEBA-PEND', 'Caso firma sobre archivado', '{"titulo":"x"}') \gset
select id as exp_editado from public.crear_expediente('PRUEBA-PEND', 'Caso borrador editado', '{"titulo":"x"}') \gset
select id as exp_iniciado from public.crear_expediente('PRUEBA-PEND', 'Caso archivo sin resolución', '{"titulo":"x"}') \gset
select id as exp_desiste from public.crear_expediente('PRUEBA-PEND', 'Caso desistimiento', '{"titulo":"x"}') \gset
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

-- ---------------------------------------------------------------------
-- Cierre del expediente
-- ---------------------------------------------------------------------
select pruebas.como(:'bonif');
select throws_ok(format($$select public.observar_expediente(%L, 'observación tardía')$$, :'exp_resuelto'), null, null,
  'Un expediente resuelto no se puede observar');
select throws_ok(format($$select public.observar_expediente(%L, 'observación tardía')$$, :'exp_archivado'), null, null,
  'Un expediente archivado no se puede observar');
select is((select estado::text from public.observar_expediente(:'exp_iniciado', 'Falta la copia certificada')), 'observado',
  'Un expediente en curso se sigue observando');
select throws_ok(format($$select public.archivar_expediente(%L, 'Desiste')$$, :'exp_iniciado'), '42501', null,
  'Un operador no archiva un trámite sin resolución');
select is((select estado::text from public.archivar_expediente(:'exp_resuelto', 'Cumplido, archívese.')), 'archivado',
  'Un operador archiva el trámite con la resolución firmada (cierre del circuito)');

select pruebas.como(:'jefe');
select throws_ok(format('select public.archivar_expediente(%L)', :'exp_desiste'), '22023', null,
  'Sin resolución, archivar pide el motivo');
select is((select estado::text from public.archivar_expediente(:'exp_desiste', 'La agente desiste del trámite.')), 'archivado',
  'El jefe del área archiva sin resolución, con el motivo');

-- ---------------------------------------------------------------------
-- Firma de resoluciones
-- ---------------------------------------------------------------------
select pruebas.como(:'dir1');
select throws_ok(format($$select public.firmar_actuacion(%L, '482915', pruebas.firma('genuina'), 'pen', '#1e3a8a')$$, :'res_sin_sentido'),
  '22023', null, 'Una resolución sin sentido explícito no se firma');
select pruebas.como(:'jefe');
select throws_ok(format($$select public.firmar_actuacion(%L, '482915', pruebas.firma('genuina'), 'pen', '#1e3a8a')$$, :'res_paso'),
  '42501', null, 'La resolución solo se firma en el paso de firma de la Dirección');
select pruebas.como(:'dir2');
select throws_ok(format($$select public.firmar_actuacion(%L, '482915', pruebas.firma('genuina'), 'pen', '#1e3a8a')$$, :'res_doble'),
  'P0001', 'El expediente ya tiene una resolución firmada', 'Un expediente tiene una sola resolución');
select pruebas.como(:'dir3');
select throws_ok(format($$select public.firmar_actuacion(%L, '482915', pruebas.firma('genuina'), 'pen', '#1e3a8a')$$, :'res_cerrado'),
  'P0001', 'El expediente está cerrado: no se firman actuaciones', 'No se firma una resolución en un expediente archivado');
reset role;
select is((select count(*)::int from public.intentos_firma where perfil_id in (:'dir1', :'dir2', :'dir3', :'jefe')), 0,
  'Las reglas de la resolución no cuentan como intentos fallidos de firma');
select is((select array[estado::text, resultado] from public.expedientes where id = :'exp_cerrado'), array['archivado', null],
  'El expediente archivado sigue archivado');

-- Lo que se firma es lo que se leyó: el proyecto no se edita cuando ya está en la Dirección.
select pruebas.como(:'bonif');
update public.actuaciones set titulo = 'Proyecto de resolución' where id = :'res_editado';
reset role;
select is((select titulo from public.actuaciones where id = :'res_editado'), 'Proyecto de resolución',
  'Mientras el expediente está en su área, el autor edita el proyecto');
select pruebas.llevar(:'exp_editado', 4);
select pruebas.como(:'bonif');
update public.actuaciones set contenido = 'Texto cambiado después de pasar a la Dirección' where id = :'res_editado';
delete from public.actuaciones where id = :'res_editado';
reset role;
select is((select contenido from public.actuaciones where id = :'res_editado'), 'Hace lugar a lo solicitado.',
  'El autor no cambia ni borra el proyecto cuando ya está en la Dirección para la firma');

-- ---------------------------------------------------------------------
-- Firma registrada: cambiarla pide la clave anterior
-- ---------------------------------------------------------------------
select pruebas.como(:'dir1');
select throws_ok('select pruebas.registrar_mi_firma()', '22023', null,
  'Para registrar otra firma hace falta la clave anterior');
select is(
  (select public.registrar_firma('Persona de Prueba', 'Directora de Capital Humano', '482915',
     jsonb_build_array(pruebas.firma('muestra1'), pruebas.firma('muestra2'), pruebas.firma('muestra3')),
     'pen', '#1e3a8a', '000000') ->> 'rechazada'),
  'clave', 'Con la clave anterior equivocada no se registra');
reset role;
select is((select intentos_fallidos from public.firmas_registradas where perfil_id = :'dir1' and activa), 1,
  'La clave anterior equivocada cuenta como intento fallido');
select pruebas.como(:'dir1');
select ok(
  (public.registrar_firma('Persona de Prueba', 'Directora de Capital Humano', '482915',
     jsonb_build_array(pruebas.firma('muestra1'), pruebas.firma('muestra2'), pruebas.firma('muestra3')),
     'pen', '#1e3a8a', '482915') ->> 'id') is not null,
  'Con la clave anterior correcta se registra la firma nueva');
reset role;
select is((select count(*)::int from public.firmas_registradas where perfil_id = :'dir1' and activa), 1,
  'Queda una sola firma activa');

-- Revocarla no saltea la clave: después de revocar, registrar otra también la pide.
select pruebas.como(:'dir2');
select public.revocar_firma();
select ok(public.firma_requiere_clave_anterior(), 'Después de revocar, la próxima firma pide la clave anterior');
select throws_ok('select pruebas.registrar_mi_firma()', '22023', null,
  'Revocar la firma no permite registrar otra sin la clave anterior');
select throws_ok(format($$select public.liberar_registro_firma(%L, 'Olvidó la clave')$$, :'dir2'), '42501', null,
  'Solo Administración libera el registro de una firma');
select pruebas.como(:'admin');
select public.liberar_registro_firma(:'dir2', 'Olvidó la clave de firma');
select pruebas.como(:'dir2');
select ok(not public.firma_requiere_clave_anterior(), 'Liberado el registro, ya no pide la clave anterior');
select ok((pruebas.registrar_mi_firma() ->> 'id') is not null, 'Con el registro liberado por Administración se registra otra firma');

-- ---------------------------------------------------------------------
-- Privacidad
-- ---------------------------------------------------------------------
select pruebas.como(:'mesa');
select is((select count(*)::int from public.perfiles where id = :'ana'), 0,
  'Un área sin trámites de la agente no lee su perfil completo (CUIL, legajo, teléfono)');
select is((select count(*)::int from public.perfiles_basicos(array[:'ana'::uuid])), 1,
  'El nombre de la agente sigue visible para mostrar autores y firmantes');
select is((select count(*)::int from public.perfiles where id = :'bonif'), 1, 'El personal interno se ve entre sí');
select pruebas.como(:'bonif');
select is((select count(*)::int from public.perfiles where id = :'ana'), 1, 'El área que tiene el trámite lee el perfil de la agente');

reset role;
insert into public.ia_generaciones (expediente_id, tipo, modelo, solicitado_por, resultado)
values (:'exp_reservado', 'dictamen', 'prueba', :'bonif', 'Borrador con datos de salud');
select pruebas.como(:'mesa');
select is((select count(*)::int from public.ia_generaciones where expediente_id = :'exp_reservado'), 0,
  'Un área sin permiso no lee lo que la IA redactó en un expediente reservado');
select pruebas.como(:'jefe');
select is((select count(*)::int from public.ia_generaciones where expediente_id = :'exp_reservado'), 1,
  'Quien puede ver el expediente reservado lee lo que redactó la IA');
reset role;

-- ---------------------------------------------------------------------
-- Hueco relevado el 12/11/2026, corregido en 20261116001500_devolver_al_paso.sql
-- ---------------------------------------------------------------------
-- Devolver a un área anterior: con un área elegida a mano, el expediente vuelve al último paso de esa
-- área antes del actual. Para avanzar está el paso siguiente (sin área).
select pruebas.interno('dict@prueba.test', 'DICT', 'dictaminante') as dict \gset
select pruebas.como(:'ana');
select id as exp_devuelto from public.crear_expediente('PRUEBA-PEND', 'Caso devuelto desde la firma', '{"titulo":"x"}') \gset
select id as exp_a_asesoria from public.crear_expediente('PRUEBA-PEND', 'Caso devuelto a Asesoría', '{"titulo":"x"}') \gset
select id as exp_al_control from public.crear_expediente('PRUEBA-PEND', 'Caso devuelto al control', '{"titulo":"x"}') \gset
select id as exp_firmado from public.crear_expediente('PRUEBA-PEND', 'Caso firmado que sigue', '{"titulo":"x"}') \gset
select id as exp_consulta from public.crear_expediente('PRUEBA-PEND', 'Caso consulta fuera del circuito', '{"titulo":"x"}') \gset
select id as exp_avanza from public.crear_expediente('PRUEBA-PEND', 'Caso que avanza', '{"titulo":"x"}') \gset
reset role;
select pruebas.llevar(:'exp_devuelto', 4);
select pruebas.llevar(:'exp_a_asesoria', 4);
select pruebas.llevar(:'exp_al_control', 2);
select pruebas.llevar(:'exp_firmado', 4);
update public.expedientes set estado = 'resuelto', resultado = 'aprobado', resuelto_at = now() where id = :'exp_firmado';
select pruebas.llevar(:'exp_consulta', 4);
select pruebas.llevar(:'exp_avanza', 2);

select pruebas.como(:'dir1');
select ok((public.pasar_expediente(:'exp_devuelto', (select id from public.areas where codigo = 'BONIF'), null, 'Corregir el artículo 1º.')).id is not null,
  'La Dirección devuelve el proyecto a Bonificaciones');
select ok((public.pasar_expediente(:'exp_a_asesoria', (select id from public.areas where codigo = 'DICT'), null, 'Revisar el dictamen.')).id is not null,
  'La Dirección devuelve el expediente a Asesoría');
select ok((public.pasar_expediente(:'exp_firmado', (select id from public.areas where codigo = 'BONIF'), null, 'Para la novedad.')).id is not null,
  'La Dirección pasa a Bonificaciones un expediente con la resolución firmada');
select ok((public.pasar_expediente(:'exp_consulta', (select id from public.areas where codigo = 'MESA'), null, 'Consulta.')).id is not null,
  'La Dirección consulta a un área fuera del circuito');
select pruebas.como(:'dict');
select ok((public.pasar_expediente(:'exp_al_control', (select id from public.areas where codigo = 'BONIF'), null, 'Falta la foja de servicios.')).id is not null,
  'Asesoría devuelve el expediente a Bonificaciones');
select ok((public.pasar_expediente(:'exp_avanza', null, null, 'Con dictamen favorable.')).id is not null,
  'Asesoría pasa el expediente al paso siguiente');
reset role;

select is((select paso_actual from public.expedientes where id = :'exp_devuelto'), 3,
  'Devuelto desde la firma, vuelve al proyecto de resolución (paso 3) y no a la novedad (paso 5)');
select is((select paso_actual from public.expedientes where id = :'exp_a_asesoria'), 2,
  'Devuelto desde la firma a Asesoría, vuelve al dictamen (paso 2)');
select is((select paso_actual from public.expedientes where id = :'exp_al_control'), 1,
  'Devuelto desde el dictamen a Bonificaciones, vuelve al control (paso 1)');
select is((select paso_actual from public.expedientes where id = :'exp_firmado'), 5,
  'Con la resolución firmada no vuelve antes de la firma: Bonificaciones lo recibe en la novedad (paso 5)');
select is((select paso_actual from public.expedientes where id = :'exp_consulta'), 4,
  'Una consulta a un área fuera del circuito no cambia el paso');
select is((select area_actual_id from public.expedientes where id = :'exp_consulta'), (select id from public.areas where codigo = 'MESA'),
  'La consulta queda en el área consultada');
select is((select paso_actual from public.expedientes where id = :'exp_avanza'), 3,
  'Sin área, el pase sigue al paso siguiente del circuito (del dictamen al proyecto)');

-- ---------------------------------------------------------------------
-- Segunda parte, en 20261118001900_devolucion_completa.sql
-- ---------------------------------------------------------------------
-- La consulta que vuelve al área del paso actual sigue en ese paso; la devolución destilda los
-- controles de los pasos que reabre y su foja se titula «Devolución a …».
select pruebas.como(:'ana');
select id as exp_reabre from public.crear_expediente('PRUEBA-PEND', 'Caso devuelto con controles tildados', '{"titulo":"x"}') \gset
select id as exp_vuelve from public.crear_expediente('PRUEBA-PEND', 'Caso que vuelve de una consulta', '{"titulo":"x"}') \gset
reset role;
select pruebas.llevar(:'exp_reabre', 4);
update public.expedientes
   set controles_hechos = '{"1": {"0": {"at": "2026-11-17"}}, "3": {"0": {"at": "2026-11-17"}}, "4": {"0": {"at": "2026-11-17"}}}'
 where id = :'exp_reabre';
select pruebas.llevar(:'exp_vuelve', 3);
update public.expedientes set controles_hechos = '{"3": {"0": {"at": "2026-11-17"}}}' where id = :'exp_vuelve';

select pruebas.como(:'dir1');
select ok((public.pasar_expediente(:'exp_reabre', (select id from public.areas where codigo = 'BONIF'))).id is not null,
  'La Dirección devuelve el proyecto sin escribir providencia');
select pruebas.como(:'bonif');
select ok((public.pasar_expediente(:'exp_vuelve', (select id from public.areas where codigo = 'MESA'), null, 'Consulta.')).id is not null,
  'Bonificaciones consulta a Mesa de Entradas desde el proyecto');
select pruebas.como(:'mesa');
select ok((public.pasar_expediente(:'exp_vuelve', (select id from public.areas where codigo = 'BONIF'), null, 'Respondida.')).id is not null,
  'Mesa de Entradas se lo vuelve a pasar a Bonificaciones');
reset role;

select is((select paso_actual from public.expedientes where id = :'exp_vuelve'), 3,
  'La consulta que vuelve al área del paso actual sigue en ese paso (el proyecto) y no va al control');
select is((select controles_hechos from public.expedientes where id = :'exp_vuelve'), '{"3": {"0": {"at": "2026-11-17"}}}'::jsonb,
  'Volver de una consulta no destilda controles');
select is((select titulo from public.actuaciones where expediente_id = :'exp_vuelve' and tipo = 'pase' order by foja desc limit 1),
  'Pase a ' || (select nombre from public.areas where codigo = 'BONIF'),
  'Volver de una consulta es un pase, no una devolución');

select is((select paso_actual from public.expedientes where id = :'exp_reabre'), 3,
  'Devuelto desde la firma, vuelve al proyecto');
select is((select controles_hechos from public.expedientes where id = :'exp_reabre'), '{"1": {"0": {"at": "2026-11-17"}}}'::jsonb,
  'La devolución destilda los controles del proyecto y de la firma; los del control quedan');
select is((select titulo from public.actuaciones where expediente_id = :'exp_reabre' and tipo = 'pase' order by foja desc limit 1),
  'Devolución a ' || (select nombre from public.areas where codigo = 'BONIF'),
  'La foja de la devolución se titula «Devolución a …»');
select is((select contenido from public.actuaciones where expediente_id = :'exp_reabre' and tipo = 'pase' order by foja desc limit 1),
  'Se devuelve para su revisión.', 'Sin providencia, la devolución dice «Se devuelve para su revisión.»');
select is((select (datos ->> 'devolucion')::boolean from public.actuaciones where expediente_id = :'exp_reabre' and tipo = 'pase' order by foja desc limit 1),
  true, 'La foja queda marcada como devolución');

select pruebas.como(:'bonif');
select ok((public.pasar_expediente(:'exp_reabre')).id is not null, 'Corregido, Bonificaciones lo eleva de nuevo a la firma');
reset role;
select is((select paso_actual from public.expedientes where id = :'exp_reabre'), 4, 'Vuelve a la firma');
select is((select (datos ->> 'devolucion')::boolean from public.actuaciones where expediente_id = :'exp_reabre' and tipo = 'pase' order by foja desc limit 1),
  false, 'El pase hacia adelante no es una devolución');

select * from finish();
rollback;
