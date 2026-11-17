-- Certificado de trabajo automático (migración 001900): la Dirección autoriza con su clave la firma automática; el
-- certificado sale al pedirlo si el perfil confirma «Liquida SÍ» con un dato reciente, y si no lo emite Registro.
begin;
\ir ayudantes.inc
select * from no_plan();
select pruebas.compartir_resultados();

select pruebas.persona('ana@prueba.test', 'Ana', 'Agente') as ana \gset
select pruebas.persona('otro@prueba.test', 'Otro', 'Agente') as otro \gset
select pruebas.interno('reg@prueba.test', 'REG') as reg \gset
select pruebas.interno('dir@prueba.test', 'DIR', 'firmante') as dir \gset
update public.perfiles set legajo = '45678', cuil = '27-30111222-4', categoria = '18' where id = :'ana';

insert into public.tipos_tramite (codigo, nombre, categoria, formulario, requisitos, plazo_dias, emision_automatica)
values ('PRUEBA-CERT', 'Certificado de prueba', 'Pruebas',
        '[{"clave":"presentar_ante","etiqueta":"Ante quién","tipo":"texto","obligatorio":false}]', '[]', 1, true)
returning id as cert \gset
insert into public.pasos_circuito (tipo_tramite_id, orden, nombre, area_id, accion)
select :'cert', 1, 'Control en Civitas y emisión', a.id, 'analisis' from public.areas a where a.codigo = 'REG';
insert into public.plantillas (tipo_tramite_id, tipo_documento, nombre, cuerpo)
values (:'cert', 'certificado', 'Certificado de prueba',
        'CERTIFICADO N.º {{numero_certificado}}: {{agente}}, legajo {{legajo}}{{desde_ingreso}}{{situacion_revista}}{{categoria}}, ante {{presentar_ante}}.');

-- 1. Autorización: la da quien firma resoluciones, con su clave.
select pruebas.como(:'reg');
select throws_ok($$select public.autorizar_emision_automatica('PRUEBA-CERT', '482915')$$, '42501', null, 'Un operador no autoriza la firma automática');
reset role;

select pruebas.como(:'dir');
select pruebas.registrar_mi_firma();
select is(public.autorizar_emision_automatica('PRUEBA-CERT', '000000') ->> 'rechazada', 'clave', 'Con la clave incorrecta no se autoriza');
reset role;
select is((select intentos_fallidos from public.firmas_registradas where perfil_id = :'dir' and activa), 1, 'Y cuenta como intento fallido');
select pruebas.como(:'dir');
select ok(public.autorizar_emision_automatica('PRUEBA-CERT', '482915') ? 'autorizacion_id', 'Con su clave, autoriza');
select is(public.emision_automatica_autorizada('PRUEBA-CERT') ->> 'autorizada', 'true', 'La autorización queda vigente');
reset role;

-- 2. Sin el dato de Civitas, el pedido queda en Registro.
select pruebas.como(:'ana');
select id as exp1 from public.crear_expediente('PRUEBA-CERT', 'Certificado de trabajo', '{"presentar_ante":"Banco Ejemplo"}') \gset
select is(public.emitir_certificado(:'exp1') ->> 'motivo', 'liquida', 'Sin «Liquida SÍ» no sale solo');
select throws_ok(format($$update public.perfiles set liquida = true where id = %L$$, :'ana'), '42501', null, 'El agente no carga su propio dato de Civitas');
reset role;
select is((select estado::text from public.expedientes where id = :'exp1'), 'iniciado', 'El pedido sigue en Registro');

select pruebas.como(:'otro');
select throws_ok(format($$select public.emitir_certificado(%L)$$, :'exp1'), '42501', null, 'Otro agente no emite el certificado ajeno');
reset role;

-- 3. Registro controla en Civitas y lo emite.
select pruebas.como(:'reg');
select throws_ok(
  format($$insert into public.actuaciones (expediente_id, tipo, titulo, contenido, autor_id, estado) values (%L, 'certificado', 'Falso', 'x', %L, 'borrador')$$, :'exp1', :'reg'),
  '42501', null, 'Nadie escribe un certificado a mano');
select throws_ok(format($$select public.archivar_expediente(%L, null)$$, :'exp1'), '42501', null, 'No se cierra "por cumplimiento" sin el certificado');
select is(public.emitir_certificado(:'exp1', '2015-03-02', 'planta permanente') ->> 'emitido', 'true', 'Registro lo emite');
reset role;

select is((select estado::text || '/' || resultado from public.expedientes where id = :'exp1'), 'archivado/aprobado', 'El trámite queda cerrado y aprobado');
select ok((select a.estado = 'firmada' and a.firmada_por = :'dir'::uuid and a.datos -> 'firma' ->> 'tipo' = 'automatica'
             from public.actuaciones a where a.expediente_id = :'exp1' and a.tipo = 'certificado'),
  'Firmado con la firma autorizada de la Dirección');
select ok((select a.datos -> 'protocolo' ->> 'numero' ~ '^\d+/CT/\d{4}$' from public.actuaciones a where a.expediente_id = :'exp1' and a.tipo = 'certificado'),
  'Con su número de certificado');
select matches((select contenido from public.actuaciones where expediente_id = :'exp1' and tipo = 'certificado'),
  'Ana Agente, legajo 45678, desde el 02/03/2015, en planta permanente, categoría 18, ante Banco Ejemplo\.', 'El texto sale del perfil y del pedido');
select ok((select liquida and liquida_al = (now() at time zone 'America/Argentina/Tucuman')::date from public.perfiles where id = :'ana'),
  'Y el dato «Liquida SÍ» queda al día');

select pruebas.como(:'ana');
select is(public.emitir_certificado(:'exp1') ->> 'actuacion_id',
  (select id::text from public.actuaciones where expediente_id = :'exp1' and tipo = 'certificado'), 'Pedirlo de nuevo devuelve el mismo certificado');

-- 4. Con el dato al día, el siguiente sale al pedirlo.
select id as exp2 from public.crear_expediente('PRUEBA-CERT', 'Certificado de trabajo', '{}') \gset
select is(public.emitir_certificado(:'exp2') ->> 'emitido', 'true', 'Con «Liquida SÍ» al día, sale solo');
reset role;
select matches((select contenido from public.actuaciones where expediente_id = :'exp2' and tipo = 'certificado'), 'ante quien corresponda\.', 'Sin destino, ante quien corresponda');

-- 5. Un dato viejo no alcanza.
update public.perfiles set liquida_al = current_date - 40 where id = :'ana';
select pruebas.como(:'ana');
select id as exp3 from public.crear_expediente('PRUEBA-CERT', 'Certificado de trabajo', '{}') \gset
select is(public.emitir_certificado(:'exp3') ->> 'motivo', 'liquida', 'Con un dato de más de un mes, pasa por Registro');
reset role;

-- 6. Sin autorización vigente no se emite.
update public.perfiles set liquida_al = current_date where id = :'ana';
select pruebas.como(:'dir');
select lives_ok($$select public.revocar_emision_automatica('PRUEBA-CERT', 'Prueba')$$, 'Quien autorizó la revoca');
reset role;
select pruebas.como(:'ana');
select is(public.emitir_certificado(:'exp3') ->> 'motivo', 'autorizacion', 'Revocada, el pedido espera');
reset role;
select pruebas.como(:'reg');
select throws_ok(format($$select public.emitir_certificado(%L)$$, :'exp3'), '42501', null, 'Y Registro tampoco lo puede emitir');
reset role;

-- 7. Datos de Civitas a mano: Registro sí, un agente no.
select pruebas.como(:'reg');
select is((public.actualizar_datos_civitas(:'otro', true, '2020-01-02', 'contratado')).situacion_revista, 'contratado', 'Registro carga los datos de Civitas');
reset role;
select pruebas.como(:'otro');
select throws_ok(format($$select public.actualizar_datos_civitas(%L, true)$$, :'otro'), '42501', null, 'El agente no');
reset role;

select * from finish();
rollback;
