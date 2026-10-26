-- Circuito del expediente: inicio, toma, pases, dictamen, observación, subsanación, documentos y archivo.
begin;
\ir ayudantes.inc
select * from no_plan();
select pruebas.compartir_resultados();

select pruebas.persona('ana@prueba.test', 'Ana', 'Agente') as ana \gset
select pruebas.interno('bonif@prueba.test', 'BONIF') as bonif \gset
select pruebas.interno('dict@prueba.test', 'DICT', 'dictaminante') as dict \gset
select pruebas.interno('dictop@prueba.test', 'DICT', 'operador') as dictop \gset
select pruebas.interno('dictjefe@prueba.test', 'DICT', 'jefe') as dictjefe \gset
select pruebas.interno('mesa@prueba.test', 'MESA') as mesa \gset
select pruebas.tramite('PRUEBA-CIRCUITO') as tipo \gset

-- ---------------------------------------------------------------------
-- Inicio del trámite
-- ---------------------------------------------------------------------
select pruebas.como(:'ana');
select throws_ok($$select public.crear_expediente('PRUEBA-CIRCUITO', '   ', '{"titulo":"Abogada"}')$$,
  '22023', null, 'El asunto es obligatorio');
select throws_ok($$select public.crear_expediente('PRUEBA-CIRCUITO', 'Bonificación', '{"nota":"sin título"}')$$,
  '22023', null, 'Faltan los campos obligatorios del formulario');
select throws_ok($$select public.crear_expediente('NO-EXISTE', 'Bonificación', '{}')$$,
  '22023', null, 'No se inicia un tipo de trámite inexistente');

select id as exp from public.crear_expediente('PRUEBA-CIRCUITO', 'Bonificación por título universitario', '{"titulo":"Abogada"}') \gset
reset role;

select matches((select numero from public.expedientes where id = :'exp'), '^CH-[0-9]{4}-[0-9]{6}$', 'El número sigue el formato CH-AAAA-000000');
select is(
  (select array[e.estado::text, e.paso_actual::text, a.codigo] from public.expedientes e join public.areas a on a.id = e.area_actual_id where e.id = :'exp'),
  array['iniciado', '1', 'BONIF'],
  'Entra iniciado, en el primer paso y en Bonificaciones');
select ok((select vence_at between now() + interval '9 days' and now() + interval '11 days' from public.expedientes where id = :'exp'),
  'El vencimiento sale del plazo del trámite');
select is((select array[tipo::text, estado::text] from public.actuaciones where expediente_id = :'exp' and foja = 1),
  array['presentacion', 'firmada'], 'La foja 1 es la presentación firmada');
select ok((select contenido like '%Abogada%' from public.actuaciones where expediente_id = :'exp' and foja = 1),
  'La presentación transcribe lo que cargó la agente');
select is((select count(*)::int from public.movimientos where expediente_id = :'exp'), 1, 'El ingreso queda en la hoja de ruta');

-- ---------------------------------------------------------------------
-- Toma y pase
-- ---------------------------------------------------------------------
select pruebas.como(:'mesa');
select throws_ok(format('select public.tomar_expediente(%L)', :'exp'), '42501', null, 'Otra área no puede tomar el expediente');
select throws_ok(format('select public.pasar_expediente(%L)', :'exp'), '42501', null, 'Otra área no puede pasar el expediente');

select pruebas.como(:'bonif');
select is((select array[estado::text, asignado_a::text] from public.tomar_expediente(:'exp')), array['en_tramite', :'bonif'],
  'Al tomarlo queda en trámite y asignado');
select is(
  (select array[e.paso_actual::text, a.codigo] from public.pasar_expediente(:'exp') e join public.areas a on a.id = e.area_actual_id),
  array['2', 'DICT'], 'El pase sin destino sigue el circuito: dictamen en Asesoría');
select throws_ok(format('select public.pasar_expediente(%L)', :'exp'), '42501', null, 'Después del pase, el área anterior ya no lo mueve');
reset role;
select is((select count(*)::int from public.actuaciones where expediente_id = :'exp' and tipo = 'pase'), 1, 'El pase queda como foja');
select is((select asignado_a from public.expedientes where id = :'exp'), null::uuid, 'Después del pase nadie lo tiene asignado');

-- ---------------------------------------------------------------------
-- Dictamen: solo lo firma quien tiene rol dictaminante o superior
-- ---------------------------------------------------------------------
select pruebas.como(:'dictop');
insert into public.actuaciones (expediente_id, tipo, titulo, contenido, autor_id, area_id)
select :'exp', 'dictamen', 'Dictamen del operador', 'Corresponde hacer lugar.', :'dictop', a.id from public.areas a where a.codigo = 'DICT'
returning id as dictamen_op \gset
select throws_ok(format('select public.firmar_actuacion(%L)', :'dictamen_op'), '42501', null, 'Un operador no firma dictámenes');

select pruebas.como(:'dict');
insert into public.actuaciones (expediente_id, tipo, titulo, contenido, autor_id, area_id)
select :'exp', 'dictamen', 'Dictamen', 'Corresponde hacer lugar a lo solicitado.', :'dict', a.id from public.areas a where a.codigo = 'DICT'
returning id as dictamen \gset
select is((select array[estado::text, (datos -> 'firma' ->> 'tipo')] from public.firmar_actuacion(:'dictamen')),
  array['firmada', 'electronica'], 'El dictaminante firma el dictamen con firma electrónica simple');
select throws_ok(format('select public.firmar_actuacion(%L)', :'dictamen'), 'P0001', 'La actuación ya fue firmada', 'Una foja no se firma dos veces');

-- ---------------------------------------------------------------------
-- Observación y subsanación
-- ---------------------------------------------------------------------
select throws_ok(format($$select public.observar_expediente(%L, '  ')$$, :'exp'), '22023', null, 'La observación necesita un motivo');
select is((select estado::text from public.observar_expediente(:'exp', 'Falta el título legalizado')), 'observado', 'Asesoría observa el trámite');

select pruebas.como(:'ana');
select ok((select count(*) = 1 from public.actuaciones where expediente_id = :'exp' and tipo = 'observacion'),
  'La agente ve la observación');
select is((select estado::text from public.subsanar_expediente(:'exp', 'Adjunto el título legalizado')), 'en_tramite',
  'Al subsanar vuelve a estar en trámite');
select throws_ok(format($$select public.subsanar_expediente(%L, 'otra vez')$$, :'exp'), 'P0001', null,
  'No se subsana un trámite sin observaciones pendientes');

-- ---------------------------------------------------------------------
-- Documentos: huella SHA-256 y carpeta del expediente
-- ---------------------------------------------------------------------
select throws_ok(
  format($$select public.registrar_documentos(%L, jsonb_build_array(jsonb_build_object('storage_path', %L, 'nombre_archivo', 'titulo.pdf', 'sha256', 'no-es-un-hash')))$$,
         :'exp', :'exp' || '/titulo.pdf'),
  '22023', null, 'Se rechaza una huella SHA-256 inválida');
select throws_ok(
  format($$select public.registrar_documentos(%L, jsonb_build_array(jsonb_build_object('storage_path', %L, 'nombre_archivo', 'titulo.pdf', 'sha256', repeat('a', 64))))$$,
         :'exp', gen_random_uuid()::text || '/titulo.pdf'),
  '22023', null, 'Se rechaza un archivo de la carpeta de otro expediente');
select is(
  (select tipo::text from public.registrar_documentos(:'exp', jsonb_build_array(jsonb_build_object(
    'storage_path', :'exp' || '/titulo.pdf', 'nombre_archivo', 'titulo.pdf', 'sha256', repeat('a', 64),
    'requisito_clave', 'titulo_pdf', 'mime_type', 'application/pdf', 'tamano_bytes', 1024)))),
  'documento', 'La documentación queda asentada en una foja');
select is((select count(*)::int from public.documentos where expediente_id = :'exp'), 1, 'El documento queda registrado');

-- ---------------------------------------------------------------------
-- Prioridad y archivo
-- ---------------------------------------------------------------------
select pruebas.como(:'mesa');
select is((select array[prioridad::text, prioridad_origen] from public.fijar_prioridad(:'exp', 'alta', 'Corte de asignación')),
  array['alta', 'manual'], 'El personal interno puede subir la prioridad');
select throws_ok(format('select public.archivar_expediente(%L)', :'exp'), '42501', null, 'Otra área no puede archivar');

select pruebas.como(:'dict');
select throws_ok(format('select public.archivar_expediente(%L)', :'exp'), '42501', null,
  'Sin resolución, quien no es jefe ni firmante no archiva');

select pruebas.como(:'dictjefe');
select is((select estado::text from public.archivar_expediente(:'exp', 'Desistido por la agente. Archívese.')), 'archivado',
  'Sin resolución, la jefatura del área archiva');
select throws_ok(format('select public.archivar_expediente(%L)', :'exp'), 'P0001', 'El expediente ya está cerrado', 'No se archiva dos veces');
select throws_ok(format('select public.pasar_expediente(%L)', :'exp'), 'P0001', 'El expediente está cerrado', 'Un archivado no se pasa');
select throws_ok(format('select public.tomar_expediente(%L)', :'exp'), 'P0001', 'El expediente está cerrado', 'Un archivado no se toma');
reset role;
select is((select count(*)::int from public.legajo_documentos where expediente_id = :'exp' and tipo = 'documento'), 1,
  'Al archivar, la documentación final pasa al legajo de la agente');
select ok((select resuelto_at is not null from public.expedientes where id = :'exp'), 'El archivo registra la fecha de cierre');

select * from finish();
rollback;
