-- Firma ológrafa de resoluciones: registro, espejo en TypeScript, rechazos, bloqueo,
-- protocolización, legajo y evidencia. Usa las firmas sintéticas de firmas.inc.
begin;
\ir ayudantes.inc
select * from no_plan();
select pruebas.compartir_resultados();

select pruebas.persona('ana@prueba.test', 'Ana', 'Agente') as ana \gset
select pruebas.interno('bonif@prueba.test', 'BONIF') as bonif \gset
select pruebas.interno('dict@prueba.test', 'DICT', 'dictaminante') as dict \gset
select pruebas.interno('dir@prueba.test', 'DIR', 'firmante', true) as dir \gset
select pruebas.tramite('PRUEBA-FIRMA') as tipo \gset

-- ---------------------------------------------------------------------
-- El patrón que calcula la base es el mismo que el del navegador
-- ---------------------------------------------------------------------
select ok(
  (select bool_and(
      abs((b ->> 'duracion')::float8 - (t ->> 'duracion')::float8) < 0.5
      and (b ->> 'trazos')::int = (t ->> 'trazos')::int
      and abs((b ->> 'largo')::float8 - (t ->> 'largo')::float8) < 0.01
      and (select max(abs(x.v::float8 - y.v::float8)) from jsonb_array_elements_text(b -> 'v') with ordinality x(v, i)
             join jsonb_array_elements_text(t -> 'v') with ordinality y(v, i) using (i)) < 0.002
      and (select max(abs(x.v::float8 - y.v::float8)) from jsonb_array_elements_text(b -> 'r') with ordinality x(v, i)
             join jsonb_array_elements_text(t -> 'r') with ordinality y(v, i) using (i)) < 0.002)
   from (select public._firma_patron(pruebas.firma(n)) as b, pruebas.patron_ts(n) as t
         from unnest(array['muestra1', 'muestra2', 'muestra3', 'genuina', 'genuina2', 'imitacion', 'otra']) n) s),
  'public._firma_patron calcula el mismo patrón que src/lib/firma-trazo.ts');
select is(public._firma_patron('[[[1,2,0,-1],[3,4,10,-1]]]'), null, 'Un trazo demasiado corto no tiene patrón');

-- ---------------------------------------------------------------------
-- Registro de la firma
-- ---------------------------------------------------------------------
select pruebas.como(:'dir');
select throws_ok(
  $$select public.registrar_firma('Persona de Prueba', 'Directora', '123456',
      jsonb_build_array(pruebas.firma('muestra1'), pruebas.firma('muestra2'), pruebas.firma('muestra3')), 'pen', '#1e3a8a')$$,
  '22023', 'Elegí una clave menos previsible', 'Se rechaza una clave previsible');
select throws_ok(
  $$select public.registrar_firma('Persona de Prueba', 'Directora', '482915',
      jsonb_build_array(pruebas.firma('muestra1'), pruebas.firma('muestra2')), 'pen', '#1e3a8a')$$,
  '22023', null, 'Hacen falta tres muestras');
select throws_ok(
  $$select public.registrar_firma('Persona de Prueba', 'Directora', '482915',
      jsonb_build_array(pruebas.firma('muestra1'), pruebas.firma('muestra2'), pruebas.firma('otra')), 'pen', '#1e3a8a')$$,
  '22023', null, 'Se rechazan muestras que no se parecen entre sí');
select throws_ok(
  $$select public.registrar_firma('Persona de Prueba', 'Directora', '482915',
      jsonb_build_array(pruebas.firma('muestra1'), pruebas.firma('muestra2'), pruebas.firma('muestra3')), 'pen', 'red')$$,
  '22023', 'Datos de la firma inválidos', 'Solo se aceptan las tintas previstas');
select ok((pruebas.registrar_mi_firma() ->> 'id') is not null, 'La firmante registra su firma con tres muestras');
reset role;
select is(
  (select array[version::text, activa::text, (pin_hash like '$2%')::text] from public.firmas_registradas where perfil_id = :'dir'),
  array['2', 'true', 'true'], 'La firma queda activa (versión 2) y la clave guardada con bcrypt');

-- ---------------------------------------------------------------------
-- El expediente llega a la Dirección con el proyecto de resolución
-- ---------------------------------------------------------------------
select pruebas.como(:'ana');
select id as exp from public.crear_expediente('PRUEBA-FIRMA', 'Bonificación por título universitario', '{"titulo":"Abogada"}') \gset
select pruebas.como(:'bonif');
select public.pasar_expediente(:'exp');
select pruebas.como(:'dict');
select public.pasar_expediente(:'exp');
select pruebas.como(:'bonif');
insert into public.actuaciones (expediente_id, tipo, titulo, contenido, datos, autor_id, area_id)
select :'exp', 'resolucion', 'Resolución',
       'RESOLUCIÓN N.º {{numero_resolucion}} — San Miguel de Tucumán, {{fecha_resolucion}}. Hace lugar a lo solicitado a partir de agosto de 2026.',
       '{"sentido":"hace_lugar"}', :'bonif', a.id
from public.areas a where a.codigo = 'BONIF'
returning id as res \gset
select is((select a.codigo from public.pasar_expediente(:'exp') e join public.areas a on a.id = e.area_actual_id), 'DIR',
  'El proyecto pasa a la Dirección para la firma');
select throws_ok(format($$select public.firmar_actuacion(%L, '482915')$$, :'res'), '42501', null,
  'Bonificaciones no firma la resolución cuando la tiene la Dirección');

-- ---------------------------------------------------------------------
-- Rechazos: clave, imitación, copia exacta y firma de otra persona
-- ---------------------------------------------------------------------
select pruebas.como(:'dir');
select throws_ok(format($$select public.firmar_actuacion(%L, '482915')$$, :'res'), '22023', null, 'Sin trazo no se firma');
select is((select id from public.firmar_actuacion(:'res', '000000', pruebas.firma('genuina'), 'pen', '#1e3a8a')), null::uuid,
  'Con la clave equivocada no firma');
select is((select id from public.firmar_actuacion(:'res', '482915', pruebas.firma('imitacion'), 'pen', '#1e3a8a')), null::uuid,
  'Una imitación hábil no firma');
select is((select id from public.firmar_actuacion(:'res', '482915', pruebas.firma('muestra1'), 'pen', '#1e3a8a')), null::uuid,
  'Una copia exacta de una muestra no firma');
select is((select id from public.firmar_actuacion(:'res', '482915', pruebas.firma('otra'), 'pen', '#1e3a8a')), null::uuid,
  'La firma de otra persona no firma');
reset role;
select is((select array_agg(motivo order by motivo) from public.intentos_firma where perfil_id = :'dir'),
  array['clave', 'copia', 'trazo', 'trazo'], 'Cada intento fallido queda registrado con su motivo');
select is((select estado::text from public.actuaciones where id = :'res'), 'borrador', 'La resolución sigue en borrador');

-- Quinto intento fallido: bloqueo de 15 minutos.
select pruebas.como(:'dir');
select is((select id from public.firmar_actuacion(:'res', '111222', pruebas.firma('genuina'), 'pen', '#1e3a8a')), null::uuid,
  'Quinto intento fallido');
select throws_ok(format($$select public.firmar_actuacion(%L, '482915', pruebas.firma('genuina'), 'pen', '#1e3a8a')$$, :'res'),
  '42501', null, 'Después de cinco intentos fallidos la firma queda bloqueada');
reset role;
select ok((select bloqueada_hasta > now() + interval '14 minutes' from public.firmas_registradas where perfil_id = :'dir' and activa),
  'El bloqueo dura 15 minutos');
update public.firmas_registradas set bloqueada_hasta = null where perfil_id = :'dir' and activa;

-- ---------------------------------------------------------------------
-- Firma válida: protocolización, resultado, legajo y evidencia
-- ---------------------------------------------------------------------
select pruebas.como(:'dir');
select is((select estado::text from public.firmar_actuacion(:'res', '482915', pruebas.firma('genuina'), 'pen', '#1e3a8a', '{"pantalla":"1280x720"}')),
  'firmada', 'La firmante firma con su firma y su clave');
reset role;
select datos -> 'protocolo' ->> 'numero' as protocolo from public.actuaciones where id = :'res' \gset
select matches(:'protocolo'::text, '^[0-9]+/DCH/[0-9]{4}$', 'La resolución recibe número N/DCH/AAAA al firmar');
select ok((select contenido like '%' || :'protocolo' || '%' and contenido not like '%{{%' from public.actuaciones where id = :'res'),
  'El número y la fecha reemplazan los marcadores del modelo');
select ok((select titulo like '%Res. N.º%' from public.actuaciones where id = :'res'), 'El título lleva el número de resolución');
select is((select datos -> 'firma' ->> 'tipo' from public.actuaciones where id = :'res'), 'olografa', 'El sello es de firma ológrafa');
select is((select array[estado::text, resultado] from public.expedientes where id = :'exp'), array['resuelto', 'aprobado'],
  'El expediente queda resuelto y aprobado');
select is((select count(*)::int from public.legajo_documentos where expediente_id = :'exp' and tipo = 'resolucion'), 1,
  'La resolución pasa al legajo digital');
select ok(
  (select e.sha256 = a.datos -> 'firma' ->> 'evidencia_sha256' from public.evidencias_firma e join public.actuaciones a on a.id = e.actuacion_id where a.id = :'res'),
  'La evidencia pericial queda ligada a la foja por su huella');
select is((select intentos_fallidos from public.firmas_registradas where perfil_id = :'dir' and activa), 0,
  'Una firma válida reinicia los intentos fallidos');

select pruebas.como(:'dir');
select is((select count(*)::int from public.evidencias_firma), 0, 'La evidencia pericial no la ve quien firma, solo administración');
select ok((public.probar_firma(pruebas.firma('genuina2')) ->> 'coincide')::boolean, 'Probar la firma reconoce una firma genuina');
select ok(not (public.probar_firma(pruebas.firma('imitacion')) ->> 'coincide')::boolean, 'Probar la firma rechaza una imitación');
select ok((public.probar_firma(pruebas.firma('genuina')) ->> 'copia')::boolean, 'Una firma ya usada se detecta como copia');

select left(hash, 20) as codigo from public.actuaciones where id = :'res' \gset
select pruebas.anonimo();
select is((select array[v ->> 'protocolo', v ->> 'firma_olografa', v ->> 'integra'] from (select public.verificar_foja(:'codigo') as v) f),
  array[:'protocolo', 'true', 'true'], 'La copia oficial se verifica sin sesión con el código del QR');
reset role;

-- ---------------------------------------------------------------------
-- Resolución que rechaza
-- ---------------------------------------------------------------------
select pruebas.como(:'ana');
select id as exp2 from public.crear_expediente('PRUEBA-FIRMA', 'Otra bonificación', '{"titulo":"Técnica"}') \gset
reset role;
select pruebas.llevar(:'exp2', 4);
select pruebas.como(:'dir');
insert into public.actuaciones (expediente_id, tipo, titulo, contenido, datos, autor_id, area_id)
select :'exp2', 'resolucion', 'Resolución', 'No hace lugar a lo solicitado.', '{"sentido":"rechaza"}', :'dir', a.id
from public.areas a where a.codigo = 'DIR'
returning id as res2 \gset
select public.firmar_actuacion(:'res2', '482915', pruebas.firma('genuina2'), 'pen', '#1e3a8a');
reset role;
select is((select array[estado::text, resultado] from public.expedientes where id = :'exp2'), array['resuelto', 'rechazado'],
  'Una resolución que no hace lugar deja el expediente rechazado');

-- ---------------------------------------------------------------------
-- Cambiar o revocar la firma pide la clave actual
-- ---------------------------------------------------------------------
select pruebas.como(:'dir');
select throws_ok('select pruebas.registrar_mi_firma()', '42501', 'Ingresá tu clave de firma actual',
  'Sin la clave actual no se registra otra firma');
select is(
  public.registrar_firma('Persona de Prueba', 'Directora', '615243',
    jsonb_build_array(pruebas.firma('muestra1'), pruebas.firma('muestra2'), pruebas.firma('muestra3')), 'pen', '#1e3a8a', '999999') ->> 'error',
  'La clave de firma actual no es correcta', 'Con una clave actual equivocada no se registra otra firma');
select ok(
  (public.registrar_firma('Persona de Prueba', 'Directora', '615243',
    jsonb_build_array(pruebas.firma('muestra1'), pruebas.firma('muestra2'), pruebas.firma('muestra3')), 'pen', '#1e3a8a', '482915') ->> 'id') is not null,
  'Con la clave actual se registra la nueva firma');
select is(public.revocar_firma('482915'), false, 'Para revocar vale la clave nueva, no la anterior');
reset role;
select is((select array_agg(motivo) from public.intentos_firma where perfil_id = :'dir' and actuacion_id is null), array['clave', 'clave'],
  'Las claves equivocadas al cambiar o revocar cuentan como intentos fallidos');
select is((select count(*)::int from public.firmas_registradas where perfil_id = :'dir' and activa), 1, 'Queda una sola firma activa');

-- Revocada la firma, no se puede seguir usando.
select pruebas.como(:'dir');
select is(public.revocar_firma('615243'), true, 'Con su clave, la firmante revoca su firma');
select throws_ok($$select public.probar_firma(pruebas.firma('genuina2'))$$, '22023', 'Primero registrá tu firma',
  'Una firma revocada no se puede usar');
reset role;

select * from finish();
rollback;
