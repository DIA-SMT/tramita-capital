-- Cierre sin resolución (migración 001600): un trámite cuyo circuito no tiene paso de firma se cierra en su
-- último paso, por cualquier persona del área de ese paso, con resultado aprobado. El resto sigue como antes.
begin;
\ir ayudantes.inc
select * from no_plan();
select pruebas.compartir_resultados();

select pruebas.persona('ana@prueba.test', 'Ana', 'Agente') as ana \gset
select pruebas.interno('bonif@prueba.test', 'BONIF') as bonif \gset
select pruebas.interno('mesa@prueba.test', 'MESA') as mesa \gset

-- Trámite de un paso, sin firma, que manda la presentación al legajo (como el cambio de domicilio).
insert into public.tipos_tramite (codigo, nombre, categoria, formulario, requisitos, plazo_dias, documentacion_final)
values ('PRUEBA-UN-PASO', 'Trámite sin resolución de un paso', 'Pruebas',
        '[{"clave":"dato","etiqueta":"Dato","tipo":"texto","obligatorio":true}]', '[]', 5, '{presentacion}')
returning id as un_paso \gset
insert into public.pasos_circuito (tipo_tramite_id, orden, nombre, area_id, accion)
select :'un_paso', 1, 'Control y carga', id, 'notificacion' from public.areas where codigo = 'BONIF';

-- Trámite de dos pasos, sin firma: Bonificaciones y después Mesa de Entradas.
insert into public.tipos_tramite (codigo, nombre, categoria, formulario, requisitos, plazo_dias)
values ('PRUEBA-DOS-PASOS', 'Trámite sin resolución de dos pasos', 'Pruebas', '[]', '[]', 5)
returning id as dos_pasos \gset
insert into public.pasos_circuito (tipo_tramite_id, orden, nombre, area_id, accion)
select :'dos_pasos', v.orden, v.nombre, a.id, v.accion::public.accion_paso
from (values (1, 'Control', 'BONIF', 'analisis'), (2, 'Registro', 'MESA', 'notificacion')) as v(orden, nombre, area, accion)
join public.areas a on a.codigo = v.area;

select pruebas.tramite('PRUEBA-CON-FIRMA') as con_firma \gset

select is(public.tramite_sin_resolucion(:'un_paso'), true, 'Un circuito sin paso de firma termina sin resolución');
select is(public.tramite_sin_resolucion(:'con_firma'), false, 'Un circuito con paso de firma termina con resolución');

-- 1) Un paso: lo cierra un operador del área, sin motivo, y queda aprobado.
select pruebas.como(:'ana');
select id as exp1 from public.crear_expediente('PRUEBA-UN-PASO', 'Caso de un paso', '{"dato":"x"}') \gset
select pruebas.como(:'mesa');
select throws_ok(format('select public.archivar_expediente(%L)', :'exp1'), '42501', null, 'Otra área no lo cierra');
select pruebas.como(:'bonif');
select is((select estado::text from public.archivar_expediente(:'exp1')), 'archivado', 'Un operador del área lo cierra sin motivo');
reset role;
select is((select resultado from public.expedientes where id = :'exp1'), 'aprobado', 'El cumplimiento deja el resultado aprobado');
select is((select titulo from public.actuaciones where expediente_id = :'exp1' and tipo = 'nota' order by foja desc limit 1),
  'Cumplimiento y archivo', 'Queda la foja de cumplimiento');
select is((select contenido from public.actuaciones where expediente_id = :'exp1' and tipo = 'nota' order by foja desc limit 1),
  'Cumplido, archívese.', 'Sin constancia, la foja dice "Cumplido, archívese."');
select is((select count(*)::int from public.legajo_documentos l
            join public.actuaciones a on a.id = l.actuacion_id
           where l.expediente_id = :'exp1' and l.tipo = 'presentacion' and a.tipo = 'presentacion' and l.perfil_id = :'ana'),
  1, 'La presentación del agente pasa a su legajo');

-- 2) Dos pasos: en el primero no es cumplimiento (sigue la regla de siempre); en el último, sí.
select pruebas.como(:'ana');
select id as exp2 from public.crear_expediente('PRUEBA-DOS-PASOS', 'Caso de dos pasos', '{}') \gset
select pruebas.como(:'bonif');
select throws_ok(format($$select public.archivar_expediente(%L, 'Cargado')$$, :'exp2'), '42501', null,
  'Antes del último paso, un operador no lo cierra');
select ok((select paso_actual from public.pasar_expediente(:'exp2')) = 2, 'Pasa al último paso');
select pruebas.como(:'mesa');
select is((select estado::text from public.archivar_expediente(:'exp2', 'Registrado en Civitas.')), 'archivado', 'En el último paso, el área lo cierra');
reset role;
select is((select contenido from public.actuaciones where expediente_id = :'exp2' and tipo = 'nota' order by foja desc limit 1),
  'Registrado en Civitas.', 'La constancia queda en la foja de cumplimiento');
select is((select count(*)::int from public.legajo_documentos where expediente_id = :'exp2' and tipo = 'presentacion'), 0,
  'Sin "presentacion" en la documentación final, la presentación no va al legajo');

-- 3) Observado: esperando al agente no se cierra como cumplido.
select pruebas.como(:'ana');
select id as exp3 from public.crear_expediente('PRUEBA-UN-PASO', 'Caso observado', '{"dato":"x"}') \gset
select pruebas.como(:'bonif');
select ok((select estado::text from public.observar_expediente(:'exp3', 'Falta el certificado.')) = 'observado', 'Se observa al agente');
select throws_ok(format('select public.archivar_expediente(%L)', :'exp3'), '42501', null, 'Observado, un operador no lo cierra');

-- 4) Fuera del circuito: si otra área lo tiene en consulta, esa área no lo cierra como cumplido.
select pruebas.como(:'ana');
select id as exp4 from public.crear_expediente('PRUEBA-UN-PASO', 'Caso en consulta', '{"dato":"x"}') \gset
select pruebas.como(:'bonif');
select ok((select area_actual_id from public.pasar_expediente(:'exp4', (select id from public.areas where codigo = 'MESA'))) is not null,
  'Se pasa en consulta a Mesa de Entradas');
select pruebas.como(:'mesa');
select throws_ok(format('select public.archivar_expediente(%L)', :'exp4'), '42501', null, 'El área de la consulta no lo cierra');

-- 5) Con resolución en el circuito, sin resolución firmada sigue siendo cosa de un responsable y con motivo.
select pruebas.como(:'ana');
select id as exp5 from public.crear_expediente('PRUEBA-CON-FIRMA', 'Caso con firma', '{"titulo":"x"}') \gset
reset role;
select pruebas.llevar(:'exp5', 5);
select pruebas.como(:'bonif');
select throws_ok(format($$select public.archivar_expediente(%L, 'Desiste')$$, :'exp5'), '42501', null,
  'Un trámite con resolución no se cierra como cumplido');
reset role;
select is((select resultado from public.expedientes where id = :'exp5'), null, 'Y no queda aprobado');

select * from finish();
rollback;
