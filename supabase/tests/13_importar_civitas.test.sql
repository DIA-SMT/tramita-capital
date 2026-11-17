-- Importación de los datos de Civitas (migración 002000): actualiza «Liquida SÍ», ingreso y revista por legajo o CUIL,
-- sin borrar lo que la planilla no trae, y deja constancia. Solo Registro, Liquidación o Administración.
begin;
\ir ayudantes.inc
select * from no_plan();
select pruebas.compartir_resultados();

select pruebas.persona('ana@prueba.test', 'Ana', 'Agente') as ana \gset
select pruebas.persona('beto@prueba.test', 'Beto', 'Agente') as beto \gset
select pruebas.interno('reg@prueba.test', 'REG') as reg \gset
select pruebas.interno('liq@prueba.test', 'LIQ') as liq \gset
select pruebas.interno('bonif@prueba.test', 'BONIF') as bonif \gset
update public.perfiles set legajo = '004521', cuil = '27-30111222-4', situacion_revista = 'contratado' where id = :'ana';
update public.perfiles set legajo = null, cuil = '20-29888777-1', fecha_ingreso = '2001-05-02' where id = :'beto';
-- La fecha de Tucumán, como la base (la CI corre en UTC).
select (now() at time zone 'America/Argentina/Tucuman')::date as hoy \gset

-- 1. Quién puede importar.
select pruebas.como(:'bonif');
select throws_ok(format($$select public.importar_datos_civitas('[{"legajo":"1","liquida":true}]', %L, 'x.csv')$$, :'hoy'), '42501', null,
  'Bonificaciones no importa datos de Civitas');
reset role;
select pruebas.como(:'ana');
select throws_ok(format($$select public.importar_datos_civitas('[{"legajo":"1","liquida":true}]', %L, 'x.csv')$$, :'hoy'), '42501', null,
  'Un agente tampoco');
reset role;

-- 2. Controles de la planilla.
select pruebas.como(:'reg');
select throws_ok(format($$select public.importar_datos_civitas('[]', %L, 'x.csv')$$, :'hoy'), '22023', null, 'Sin filas no se importa');
select throws_ok(format($$select public.importar_datos_civitas('[{"legajo":"1","liquida":true}]', %L, 'x.csv')$$, :'hoy'::date + 1), '22023', null,
  'La fecha de los datos no puede ser futura');
select throws_ok(format($$select public.importar_datos_civitas('[{"legajo":"4521","fecha_ingreso":"%s"}]', %L, 'x.csv')$$, :'hoy'::date + 3, :'hoy'),
  '22023', null, 'Ni una fecha de ingreso futura');

-- 3. Importa: Ana por legajo (sin ceros a la izquierda), Beto por CUIL; una fila no cruza con nadie.
select is(
  public.importar_datos_civitas(
    '[{"legajo":"4521","liquida":true,"fecha_ingreso":"2014-03-03"},
      {"cuil":"20298887771","liquida":false,"situacion_revista":"planta permanente"},
      {"legajo":"99999","liquida":true}]',
    :'hoy'::date - 2, 'civitas-noviembre.csv') - 'importacion_id',
  '{"filas": 3, "actualizados": 2, "sin_coincidencia": 1, "no_encontrados": ["99999"]}'::jsonb,
  'Cruza por legajo y por CUIL, y avisa lo que no encontró');
reset role;

select ok((select liquida and liquida_al = :'hoy'::date - 2 and fecha_ingreso = '2014-03-03' and situacion_revista = 'contratado'
             from public.perfiles where id = :'ana'),
  'Ana: «Liquida SÍ» con la fecha de los datos; lo que la planilla no trae (revista) no se borra');
select ok((select liquida = false and situacion_revista = 'planta permanente' and fecha_ingreso = '2001-05-02' from public.perfiles where id = :'beto'),
  'Beto: no liquida, y su fecha de ingreso queda como estaba');

-- 4. Si un agente aparece dos veces, vale la última fila; una fila sin «Liquida» no toca ese dato.
select pruebas.como(:'liq');
select is((public.importar_datos_civitas('[{"legajo":"4521","liquida":false},{"legajo":"04521","liquida":true}]', :'hoy', 'otra.csv') ->> 'actualizados')::int,
  1, 'Liquidación también importa; el mismo agente cuenta una vez');
select lives_ok(format($$select public.importar_datos_civitas('[{"legajo":"4521","situacion_revista":"planta permanente"}]', %L, 'revista.csv')$$, :'hoy'),
  'Una planilla solo con la revista');
reset role;
select ok((select liquida and liquida_al = :'hoy'::date and situacion_revista = 'planta permanente' from public.perfiles where id = :'ana'),
  'Vale la última fila, y la planilla sin «Liquida» no lo cambia');

-- 5. Constancia de cada importación, que ven quienes importan.
select is((select count(*)::int from public.importaciones_civitas where archivo in ('civitas-noviembre.csv', 'otra.csv', 'revista.csv')), 3,
  'Cada importación queda registrada');
select pruebas.como(:'reg');
select ok((select count(*) >= 3 from public.importaciones_civitas), 'Registro ve el historial');
reset role;
select pruebas.como(:'bonif');
select is((select count(*)::int from public.importaciones_civitas), 0, 'Bonificaciones no');
reset role;

select * from finish();
rollback;
