-- Fojas digitales: foliado correlativo, cadena de hashes, inmutabilidad y verificación pública.
begin;
\ir ayudantes.inc
select * from no_plan();
select pruebas.compartir_resultados();

select pruebas.persona('ana@prueba.test', 'Ana', 'Agente') as ana \gset
select pruebas.interno('bonif@prueba.test', 'BONIF') as bonif \gset
select pruebas.interno('dict@prueba.test', 'DICT', 'dictaminante') as dict \gset
select pruebas.tramite('PRUEBA-FOJAS') as tipo \gset

select pruebas.como(:'ana');
select id as exp from public.crear_expediente('PRUEBA-FOJAS', 'Bonificación por título', '{"titulo":"Abogada"}') \gset
select pruebas.como(:'bonif');
select public.pasar_expediente(:'exp', null, null, 'Para dictamen');
select pruebas.como(:'dict');
select public.observar_expediente(:'exp', 'Falta el título legalizado');
select pruebas.como(:'ana');
select public.subsanar_expediente(:'exp', 'Adjunto el título');
reset role;

select is((select array_agg(foja order by foja) from public.actuaciones where expediente_id = :'exp'), array[1, 2, 3, 4],
  'Las fojas son correlativas, sin saltos');
select is((select array_agg(tipo::text order by foja) from public.actuaciones where expediente_id = :'exp'),
  array['presentacion', 'pase', 'observacion', 'subsanacion'], 'Cada actuación quedó como foja en orden');
select ok((select bool_and(hash ~ '^[0-9a-f]{64}$') from public.actuaciones where expediente_id = :'exp'), 'Cada foja tiene su SHA-256');
select is((select hash_anterior from public.actuaciones where expediente_id = :'exp' and foja = 1), null, 'La foja 1 abre la cadena');
select ok(
  (select bool_and(a.hash_anterior = b.hash) from public.actuaciones a join public.actuaciones b
     on b.expediente_id = a.expediente_id and b.foja = a.foja - 1 where a.expediente_id = :'exp'),
  'Cada foja se encadena con el hash de la anterior');

select pruebas.como(:'bonif');
select ok((select bool_and(hash_ok and cadena_ok) and count(*) = 4 from public.verificar_integridad(:'exp')),
  'La verificación de integridad da todo bien');
reset role;

-- Inmutabilidad: ni siquiera el dueño de la base modifica una foja firmada.
select throws_ok(format($$update public.actuaciones set contenido = 'otro texto' where expediente_id = %L and foja = 2$$, :'exp'),
  '42501', null, 'Una foja firmada no se modifica');
select throws_ok(format($$delete from public.actuaciones where expediente_id = %L and foja = 4$$, :'exp'),
  '42501', null, 'Una foja firmada no se borra');
select throws_ok(format($$delete from public.movimientos where expediente_id = %L$$, :'exp'),
  '42501', null, 'La hoja de ruta es de solo agregado');
select throws_ok('delete from public.auditoria', '42501', null, 'La auditoría es de solo agregado');

-- Verificación pública por código (lo que imprime el QR de la copia oficial).
select left(hash, 20) as codigo_foja1 from public.actuaciones where expediente_id = :'exp' and foja = 1 \gset
select left(hash, 20) as codigo_foja2 from public.actuaciones where expediente_id = :'exp' and foja = 2 \gset
select pruebas.anonimo();
select is((select array[v ->> 'foja', v ->> 'tipo', v ->> 'integra'] from (select public.verificar_foja(:'codigo_foja1') as v) f),
  array['1', 'presentacion', 'true'], 'Sin sesión se verifica una foja por su código');
select ok(not (public.verificar_foja(:'codigo_foja1') ? 'contenido'), 'La verificación pública no muestra el contenido');
select is(public.verificar_foja('ffffffffffffffffffff'), null, 'Un código inexistente no verifica nada');
reset role;

-- Si alguien adultera una foja directamente en la base (salteando el trigger), se detecta.
alter table public.actuaciones disable trigger actuaciones_inmutables;
update public.actuaciones set contenido = 'Texto adulterado' where expediente_id = :'exp' and foja = 2;
alter table public.actuaciones enable trigger actuaciones_inmutables;

select pruebas.como(:'bonif');
select is((select array_agg(foja) from public.verificar_integridad(:'exp') where not hash_ok), array[2],
  'La verificación detecta la foja adulterada');
select pruebas.anonimo();
select is(public.verificar_foja(:'codigo_foja2') ->> 'integra', 'false', 'La verificación pública también la detecta');
reset role;

select * from finish();
rollback;
