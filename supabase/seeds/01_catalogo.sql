-- =====================================================================
-- Catálogo de Capital Humano: áreas, trámites, circuitos y modelos.
-- GENERADO por scripts/generar-catalogo.ts desde src/lib/semilla/catalogo.ts
-- (npm run catalogo). No editar a mano.
--
-- Relevamiento de Capital Humano del 16/11/2026 (circuito FINAL DIGITAL).
-- La licencia por examen sigue provisoria.
-- Idempotente: se puede aplicar sobre un proyecto que ya tiene catálogo.
-- No crea usuarios.
-- =====================================================================

-- Áreas
insert into public.areas (codigo, nombre, descripcion) values
  ('MESA', 'Mesa de Entradas', 'Recepción y notificaciones. En el circuito digital de Bonificaciones no interviene.'),
  ('BONIF', 'Área Bonificaciones', 'Adicionales por título, asignaciones familiares y escolaridad: control, proyectos de resolución y novedades a Liquidación'),
  ('LIC', 'Sección Licencias', 'Control de días disponibles de la licencia por examen (provisorio)'),
  ('MEDLAB', 'Departamento de Medicina Laboral', 'Licencias médicas y por maternidad, entrevistas e informes médicos'),
  ('DICT', 'Asesoría Legal', 'Dictámenes jurídicos de la Dirección de Capital Humano'),
  ('DESP', 'Despacho', 'Proyectos de resolución de la licencia por examen (provisorio)'),
  ('DIR', 'Dirección de Capital Humano', 'Control y firma de resoluciones'),
  ('LIQ', 'Liquidación de Haberes', 'Impacto de las novedades en la liquidación'),
  ('HYS', 'Departamento de Higiene y Seguridad', 'Control del recorrido entre el domicilio y el lugar de trabajo (cobertura de accidentes in itinere)')
on conflict (codigo) do update set nombre = excluded.nombre, descripcion = excluded.descripcion;

-- Áreas ajenas a Capital Humano: se borran si no tienen circuitos, expedientes ni fojas (las membresías caen en cascada)
delete from public.areas a
 where a.codigo in ('FISC', 'SGOB')
   and not exists (select 1 from public.pasos_circuito p where p.area_id = a.id)
   and not exists (select 1 from public.expedientes e where e.area_actual_id = a.id)
   and not exists (select 1 from public.movimientos m where m.desde_area_id = a.id or m.hacia_area_id = a.id)
   and not exists (select 1 from public.actuaciones x where x.area_id = a.id);

-- Trámites retirados: se desactivan y, si no tienen expedientes, se borran (con sus pasos y modelos)
update public.tipos_tramite set activo = false where codigo in ('BONIF-TITULO', 'ASIG-FAMILIAR', 'LIC-HIJO-DISC');
delete from public.tipos_tramite t
 where t.codigo in ('BONIF-TITULO', 'ASIG-FAMILIAR', 'LIC-HIJO-DISC')
   and not exists (select 1 from public.expedientes e where e.tipo_tramite_id = t.id);

-- Tipos de trámite
insert into public.tipos_tramite
  (codigo, nombre, descripcion, categoria, icono, normativa, requisitos, formulario, plazo_dias, linea_base_dias,
   prioridad_base, reservado, activo, codigo_relevamiento, oficina, pasos_actuales, documentacion_final, es_recurso, reconsideracion)
values
(
  'BONIF-TIT-SEC', 'Adicional por título secundario',
  'Pago del adicional salarial por título secundario.',
  'Bonificaciones por título', 'school',
  'Decretos N.º 82/77, 23/81, 1320/01 y 143/79 (art. 5º) y Ordenanza N.º 3537/04, según el modelo de resolución del Área Bonificaciones. Porcentaje: 17,5 % de la categoría de revista.',
  '[{"clave":"certificado_analitico","nombre":"Certificado analítico","descripcion":"Copia certificada","obligatorio":true}]'::jsonb,
  '[{"clave":"titulo_obtenido","etiqueta":"Título obtenido","tipo":"texto","obligatorio":true,"ayuda":"Tal como figura en el diploma"},{"clave":"institucion","etiqueta":"Establecimiento que lo expide","tipo":"texto","obligatorio":true},{"clave":"localidad_institucion","etiqueta":"Localidad del establecimiento","tipo":"texto","obligatorio":true},{"clave":"domicilio_institucion","etiqueta":"Domicilio del establecimiento","tipo":"texto","obligatorio":false},{"clave":"mail_institucion","etiqueta":"Mail del establecimiento","tipo":"texto","obligatorio":false,"ayuda":"Sirve para pedir la verificación del título"},{"clave":"fecha_egreso","etiqueta":"Fecha de egreso","tipo":"fecha","obligatorio":false},{"clave":"observaciones","etiqueta":"Observaciones","tipo":"texto_largo","obligatorio":false}]'::jsonb,
  10, null, 'normal', false, true,
  '001', 'Área Bonificaciones', 8, array['certificado_analitico']::text[],
  false, 'RECON-BONIF'
),
(
  'BONIF-TIT-TER', 'Adicional por título terciario',
  'Pago del adicional salarial por título terciario.',
  'Bonificaciones por título', 'book-open',
  'Decretos N.º 82/77, 23/81, 1320/01 y 143/79 (art. 5º) y Ordenanza N.º 3537/04, según el modelo de resolución del Área Bonificaciones. [COMPLETAR por Capital Humano: porcentaje para el título terciario y si depende de la duración de la carrera].',
  '[{"clave":"certificado_analitico","nombre":"Certificado analítico","descripcion":"Copia certificada","obligatorio":true},{"clave":"diploma","nombre":"Diploma autenticado","descripcion":"Copia certificada, anverso y reverso","obligatorio":true}]'::jsonb,
  '[{"clave":"titulo_obtenido","etiqueta":"Título obtenido","tipo":"texto","obligatorio":true,"ayuda":"Tal como figura en el diploma"},{"clave":"duracion","etiqueta":"Duración de la carrera (años)","tipo":"numero","obligatorio":true,"ayuda":"Según el plan de estudios"},{"clave":"institucion","etiqueta":"Establecimiento que lo expide","tipo":"texto","obligatorio":true},{"clave":"localidad_institucion","etiqueta":"Localidad del establecimiento","tipo":"texto","obligatorio":true},{"clave":"domicilio_institucion","etiqueta":"Domicilio del establecimiento","tipo":"texto","obligatorio":false},{"clave":"mail_institucion","etiqueta":"Mail del establecimiento","tipo":"texto","obligatorio":false,"ayuda":"Sirve para pedir la verificación del título"},{"clave":"fecha_egreso","etiqueta":"Fecha de egreso","tipo":"fecha","obligatorio":false},{"clave":"observaciones","etiqueta":"Observaciones","tipo":"texto_largo","obligatorio":false}]'::jsonb,
  10, null, 'normal', false, true,
  '002', 'Área Bonificaciones', 8, array['certificado_analitico', 'diploma']::text[],
  false, 'RECON-BONIF'
),
(
  'BONIF-TIT-UNI', 'Adicional por título universitario',
  'Pago del adicional salarial por título universitario.',
  'Bonificaciones por título', 'graduation-cap',
  'Decretos N.º 82/77, 23/81, 1320/01 y 143/79 (art. 5º) y Ordenanza N.º 3537/04, según el modelo de resolución del Área Bonificaciones. Porcentaje: 50 % de la categoría de revista para títulos universitarios de grado de 5 años de duración (según el dictamen modelo del área). [COMPLETAR por Capital Humano: porcentaje para carreras de grado de menor duración y de pregrado].',
  '[{"clave":"diploma","nombre":"Diploma autenticado","descripcion":"Copia certificada, anverso y reverso","obligatorio":true}]'::jsonb,
  '[{"clave":"titulo_obtenido","etiqueta":"Título obtenido","tipo":"texto","obligatorio":true,"ayuda":"Tal como figura en el diploma"},{"clave":"duracion","etiqueta":"Duración de la carrera (años)","tipo":"numero","obligatorio":true,"ayuda":"Según el plan de estudios"},{"clave":"institucion","etiqueta":"Establecimiento que lo expide","tipo":"texto","obligatorio":true},{"clave":"localidad_institucion","etiqueta":"Localidad del establecimiento","tipo":"texto","obligatorio":true},{"clave":"domicilio_institucion","etiqueta":"Domicilio del establecimiento","tipo":"texto","obligatorio":false},{"clave":"mail_institucion","etiqueta":"Mail del establecimiento","tipo":"texto","obligatorio":false,"ayuda":"Sirve para pedir la verificación del título"},{"clave":"fecha_egreso","etiqueta":"Fecha de egreso","tipo":"fecha","obligatorio":false},{"clave":"observaciones","etiqueta":"Observaciones","tipo":"texto_largo","obligatorio":false}]'::jsonb,
  10, null, 'normal', false, true,
  '003', 'Área Bonificaciones', 8, array['diploma']::text[],
  false, 'RECON-BONIF'
),
(
  'BAJA-ESTUDIOS', 'Baja de asignación por hijo/a por interrupción de estudios',
  'Cese del pago de la asignación familiar por hijo/a cuando deja de estudiar.',
  'Bajas de asignaciones', 'user-minus',
  'Ordenanza N.º 546/75 de Asignaciones Familiares y su Decreto Reglamentario N.º 584/SEH/75. Competencia: Decreto N.º 143/G/79, art. 2º (según los modelos de resolución del Área Bonificaciones). [COMPLETAR por Capital Humano: montos vigentes]. Declaración jurada de interrupción de estudios: art. 19 del Decreto N.º 584/SEH/75 (falsedad de lo declarado).',
  '[{"clave":"certificado_estudios","nombre":"Certificado de estudios con fecha hasta","descripcion":"Indica hasta cuándo cursó el hijo/a","obligatorio":true},{"clave":"ddjj_interrupcion","nombre":"Declaración jurada de interrupción de estudios (Formulario 9.1)","descripcion":"Obligatoria si tu hijo/a es mayor de 15 años. La firman vos y el encargado de personal de tu repartición","obligatorio":false}]'::jsonb,
  '[{"clave":"familiar","etiqueta":"Apellido y nombre del hijo/a","tipo":"texto","obligatorio":true},{"clave":"dni_familiar","etiqueta":"DNI del hijo/a","tipo":"texto","obligatorio":true},{"clave":"fecha_nacimiento","etiqueta":"Fecha de nacimiento del hijo/a","tipo":"fecha","obligatorio":true},{"clave":"fecha_interrupcion","etiqueta":"Fecha de interrupción de los estudios","tipo":"fecha","obligatorio":true},{"clave":"observaciones","etiqueta":"Observaciones","tipo":"texto_largo","obligatorio":false}]'::jsonb,
  10, null, 'normal', false, true,
  '004', 'Área Bonificaciones', 8, '{}'::text[],
  false, null
),
(
  'BAJA-DIVORCIO', 'Baja de asignación por cónyuge por divorcio',
  'Cese del pago de la asignación familiar por cónyuge a raíz del divorcio.',
  'Bajas de asignaciones', 'user-minus',
  'Ordenanza N.º 546/75 de Asignaciones Familiares y su Decreto Reglamentario N.º 584/SEH/75. Competencia: Decreto N.º 143/G/79, art. 2º (según los modelos de resolución del Área Bonificaciones). [COMPLETAR por Capital Humano: montos vigentes].',
  '[{"clave":"sentencia_divorcio","nombre":"Sentencia judicial de divorcio","descripcion":"O acta de matrimonio con la anotación del divorcio","obligatorio":true}]'::jsonb,
  '[{"clave":"familiar","etiqueta":"Apellido y nombre del/de la ex cónyuge","tipo":"texto","obligatorio":true},{"clave":"dni_familiar","etiqueta":"DNI del/de la ex cónyuge","tipo":"texto","obligatorio":true},{"clave":"fecha_divorcio","etiqueta":"Fecha de la sentencia de divorcio","tipo":"fecha","obligatorio":true},{"clave":"observaciones","etiqueta":"Observaciones","tipo":"texto_largo","obligatorio":false}]'::jsonb,
  5, null, 'normal', false, true,
  '005', 'Área Bonificaciones', 8, array['sentencia_divorcio']::text[],
  false, 'RECON-BONIF'
),
(
  'BAJA-FALLECIMIENTO', 'Baja de asignación por fallecimiento',
  'Cese del pago de la asignación familiar por fallecimiento del hijo/a o del cónyuge.',
  'Bajas de asignaciones', 'user-minus',
  'Ordenanza N.º 546/75 de Asignaciones Familiares y su Decreto Reglamentario N.º 584/SEH/75. Competencia: Decreto N.º 143/G/79, art. 2º (según los modelos de resolución del Área Bonificaciones). [COMPLETAR por Capital Humano: montos vigentes].',
  '[{"clave":"acta_defuncion","nombre":"Acta de defunción","obligatorio":true}]'::jsonb,
  '[{"clave":"vinculo","etiqueta":"Vínculo con la persona fallecida","tipo":"seleccion","obligatorio":true,"opciones":["Cónyuge","Hijo/a"]},{"clave":"familiar","etiqueta":"Apellido y nombre del familiar","tipo":"texto","obligatorio":true},{"clave":"dni_familiar","etiqueta":"DNI del familiar","tipo":"texto","obligatorio":true},{"clave":"fecha_fallecimiento","etiqueta":"Fecha de fallecimiento","tipo":"fecha","obligatorio":true},{"clave":"observaciones","etiqueta":"Observaciones","tipo":"texto_largo","obligatorio":false}]'::jsonb,
  5, null, 'normal', false, true,
  '006', 'Área Bonificaciones', 8, array['acta_defuncion']::text[],
  false, 'RECON-BONIF'
),
(
  'BAJA-PARTICULAR', 'Baja de asignación por hijo/a por motivos particulares',
  'Pedido del/de la agente para dejar de percibir la asignación familiar por un hijo/a.',
  'Bajas de asignaciones', 'user-minus',
  'Ordenanza N.º 546/75 de Asignaciones Familiares y su Decreto Reglamentario N.º 584/SEH/75. Competencia: Decreto N.º 143/G/79, art. 2º (según los modelos de resolución del Área Bonificaciones). [COMPLETAR por Capital Humano: montos vigentes].',
  '[]'::jsonb,
  '[{"clave":"familiar","etiqueta":"Apellido y nombre del hijo/a","tipo":"texto","obligatorio":true},{"clave":"dni_familiar","etiqueta":"DNI del hijo/a","tipo":"texto","obligatorio":true},{"clave":"fecha_nacimiento","etiqueta":"Fecha de nacimiento del hijo/a","tipo":"fecha","obligatorio":true},{"clave":"desde","etiqueta":"A partir de","tipo":"fecha","obligatorio":true},{"clave":"motivo","etiqueta":"Motivo","tipo":"texto_largo","obligatorio":true},{"clave":"observaciones","etiqueta":"Observaciones","tipo":"texto_largo","obligatorio":false}]'::jsonb,
  10, null, 'normal', false, true,
  '007', 'Área Bonificaciones', 5, '{}'::text[],
  false, null
),
(
  'ESC-FIN', 'Certificado de fin de clases',
  'Presentación del certificado de fin de clases en término, para cobrar la asignación por escolaridad. Si ya pasó el plazo, iniciá el de fuera de término.',
  'Escolaridad', 'backpack',
  'Competencia: Anexo III del Decreto N.º 2118/SG/04 y su ampliatorio Decreto N.º 2683/SEH/08 (según los modelos de resolución del Área Bonificaciones). Régimen de asignaciones familiares: Ordenanza N.º 546/75 y Decreto Reglamentario N.º 584/SEH/75. El certificado de inicio de clases se presenta dentro de los 60 días de iniciado el ciclo lectivo, ante el encargado de personal de la repartición. [COMPLETAR por Capital Humano: plazo del certificado de fin de clases y desde qué mes se liquida la escolaridad admitida fuera de término].',
  '[{"clave":"certificado_fin_clases","nombre":"Certificado escolar de fin de clases","descripcion":"Formulario de concurrencia escolar del Portal del Empleado, con sello y firma del establecimiento","obligatorio":true}]'::jsonb,
  '[{"clave":"ciclo_lectivo","etiqueta":"Ciclo lectivo","tipo":"numero","obligatorio":true},{"clave":"hijos","etiqueta":"Hijos/as que incluye el certificado","tipo":"texto_largo","obligatorio":true,"ayuda":"Solo los que te generan asignación por hijo/a. Para cada uno: apellido y nombre, DNI, curso o grado, e institución a la que asiste"},{"clave":"observaciones","etiqueta":"Observaciones","tipo":"texto_largo","obligatorio":false}]'::jsonb,
  5, null, 'normal', false, true,
  '008', 'Área Bonificaciones', 3, array['certificado_fin_clases']::text[],
  false, null
),
(
  'ESC-FIN-EXT', 'Certificado de fin de clases fuera de término',
  'Presentación del certificado de fin de clases fuera de plazo, para cobrar la asignación por escolaridad.',
  'Escolaridad', 'backpack',
  'Competencia: Anexo III del Decreto N.º 2118/SG/04 y su ampliatorio Decreto N.º 2683/SEH/08 (según los modelos de resolución del Área Bonificaciones). Régimen de asignaciones familiares: Ordenanza N.º 546/75 y Decreto Reglamentario N.º 584/SEH/75. El certificado de inicio de clases se presenta dentro de los 60 días de iniciado el ciclo lectivo, ante el encargado de personal de la repartición. [COMPLETAR por Capital Humano: plazo del certificado de fin de clases y desde qué mes se liquida la escolaridad admitida fuera de término].',
  '[{"clave":"certificado_fin_clases","nombre":"Certificado escolar de fin de clases","descripcion":"Formulario de concurrencia escolar del Portal del Empleado, con sello y firma del establecimiento","obligatorio":true}]'::jsonb,
  '[{"clave":"ciclo_lectivo","etiqueta":"Ciclo lectivo","tipo":"numero","obligatorio":true},{"clave":"hijos","etiqueta":"Hijos/as que incluye el certificado","tipo":"texto_largo","obligatorio":true,"ayuda":"Solo los que te generan asignación por hijo/a. Para cada uno: apellido y nombre, DNI, curso o grado, e institución a la que asiste"},{"clave":"motivo","etiqueta":"Motivo de la presentación fuera de término","tipo":"texto_largo","obligatorio":true},{"clave":"observaciones","etiqueta":"Observaciones","tipo":"texto_largo","obligatorio":false}]'::jsonb,
  10, null, 'normal', false, true,
  '009', 'Área Bonificaciones', 8, array['certificado_fin_clases']::text[],
  false, 'RECON-BONIF'
),
(
  'ESC-INICIO', 'Certificado de inicio de clases',
  'Presentación del certificado de inicio de clases dentro de los 60 días del inicio del ciclo lectivo, para cobrar la asignación por escolaridad. Si ya pasó el plazo, iniciá el de fuera de término.',
  'Escolaridad', 'backpack',
  'Competencia: Anexo III del Decreto N.º 2118/SG/04 y su ampliatorio Decreto N.º 2683/SEH/08 (según los modelos de resolución del Área Bonificaciones). Régimen de asignaciones familiares: Ordenanza N.º 546/75 y Decreto Reglamentario N.º 584/SEH/75. El certificado de inicio de clases se presenta dentro de los 60 días de iniciado el ciclo lectivo, ante el encargado de personal de la repartición. [COMPLETAR por Capital Humano: plazo del certificado de fin de clases y desde qué mes se liquida la escolaridad admitida fuera de término].',
  '[{"clave":"certificado_inicio_clases","nombre":"Certificado escolar de inicio de clases","descripcion":"Formulario de concurrencia escolar del Portal del Empleado, con sello y firma del establecimiento","obligatorio":true}]'::jsonb,
  '[{"clave":"ciclo_lectivo","etiqueta":"Ciclo lectivo","tipo":"numero","obligatorio":true},{"clave":"hijos","etiqueta":"Hijos/as que incluye el certificado","tipo":"texto_largo","obligatorio":true,"ayuda":"Solo los que te generan asignación por hijo/a. Para cada uno: apellido y nombre, DNI, curso o grado, e institución a la que asiste"},{"clave":"observaciones","etiqueta":"Observaciones","tipo":"texto_largo","obligatorio":false}]'::jsonb,
  5, null, 'normal', false, true,
  '010', 'Área Bonificaciones', 3, array['certificado_inicio_clases']::text[],
  false, null
),
(
  'ESC-INICIO-EXT', 'Certificado de inicio de clases fuera de término',
  'Presentación del certificado de inicio de clases pasados los 60 días del inicio del ciclo lectivo, para cobrar la asignación por escolaridad.',
  'Escolaridad', 'backpack',
  'Competencia: Anexo III del Decreto N.º 2118/SG/04 y su ampliatorio Decreto N.º 2683/SEH/08 (según los modelos de resolución del Área Bonificaciones). Régimen de asignaciones familiares: Ordenanza N.º 546/75 y Decreto Reglamentario N.º 584/SEH/75. El certificado de inicio de clases se presenta dentro de los 60 días de iniciado el ciclo lectivo, ante el encargado de personal de la repartición. [COMPLETAR por Capital Humano: plazo del certificado de fin de clases y desde qué mes se liquida la escolaridad admitida fuera de término].',
  '[{"clave":"certificado_inicio_clases","nombre":"Certificado escolar de inicio de clases","descripcion":"Formulario de concurrencia escolar del Portal del Empleado, con sello y firma del establecimiento","obligatorio":true}]'::jsonb,
  '[{"clave":"ciclo_lectivo","etiqueta":"Ciclo lectivo","tipo":"numero","obligatorio":true},{"clave":"hijos","etiqueta":"Hijos/as que incluye el certificado","tipo":"texto_largo","obligatorio":true,"ayuda":"Solo los que te generan asignación por hijo/a. Para cada uno: apellido y nombre, DNI, curso o grado, e institución a la que asiste"},{"clave":"motivo","etiqueta":"Motivo de la presentación fuera de término","tipo":"texto_largo","obligatorio":true},{"clave":"observaciones","etiqueta":"Observaciones","tipo":"texto_largo","obligatorio":false}]'::jsonb,
  10, null, 'normal', false, true,
  '011', 'Área Bonificaciones', 8, array['certificado_inicio_clases']::text[],
  false, 'RECON-BONIF'
),
(
  'ASIG-FAM-NUM', 'Asignación familiar por familia numerosa',
  'Pago de la asignación por familia numerosa, desde el tercer hijo/a, en relación a un hijo/a.',
  'Asignaciones familiares', 'users-round',
  'Ordenanza N.º 546/75 de Asignaciones Familiares y su Decreto Reglamentario N.º 584/SEH/75. Competencia: Decreto N.º 143/G/79, art. 2º (según los modelos de resolución del Área Bonificaciones). [COMPLETAR por Capital Humano: montos vigentes]. En el pago por nacimiento y por hijo/a, el dictamen modelo cita la Ordenanza N.º 546/75, arts. 2º, 6º y 8º, y el Decreto Reglamentario N.º 584/75, arts. 3º, 5º, 7º y 15; el art. 6º de la Ordenanza exige una antigüedad y un plazo para solicitar la asignación. [COMPLETAR por Capital Humano: antigüedad mínima y plazo para solicitar]. Familia numerosa (según el área): corresponde al declarar el tercer hijo/a, siempre que ninguno de los tres sea mayor de 21 años y que los mayores de 15 perciban la asignación por escolaridad. Se pide por cada hijo/a.',
  '[{"clave":"acta_nacimiento","nombre":"Acta de nacimiento del hijo/a","obligatorio":true},{"clave":"negativa_anses","nombre":"Negativa de ANSES de la madre o del padre","descripcion":"Certifica que el otro progenitor no percibe la asignación","obligatorio":true},{"clave":"certificado_escolaridad","nombre":"Certificado de escolaridad","descripcion":"Cuando el hijo/a está escolarizado","obligatorio":false}]'::jsonb,
  '[{"clave":"familiar","etiqueta":"Apellido y nombre del hijo/a","tipo":"texto","obligatorio":true},{"clave":"dni_familiar","etiqueta":"DNI del hijo/a","tipo":"texto","obligatorio":true},{"clave":"fecha_nacimiento","etiqueta":"Fecha de nacimiento del hijo/a","tipo":"fecha","obligatorio":true},{"clave":"cantidad_hijos","etiqueta":"Cantidad de hijos/as a tu cargo","tipo":"numero","obligatorio":true},{"clave":"progenitor","etiqueta":"Apellido y nombre del otro progenitor","tipo":"texto","obligatorio":false,"ayuda":"El de la negativa de ANSES"},{"clave":"cuil_progenitor","etiqueta":"CUIL del otro progenitor","tipo":"texto","obligatorio":false},{"clave":"observaciones","etiqueta":"Observaciones","tipo":"texto_largo","obligatorio":false}]'::jsonb,
  10, null, 'normal', false, true,
  '012', 'Área Bonificaciones', 8, array['acta_nacimiento', 'certificado_escolaridad']::text[],
  false, 'RECON-BONIF'
),
(
  'ASIG-HIJO', 'Asignación familiar por hijo/a',
  'Pago de la asignación familiar por hijo/a. Se pide por cada hijo/a.',
  'Asignaciones familiares', 'users',
  'Ordenanza N.º 546/75 de Asignaciones Familiares y su Decreto Reglamentario N.º 584/SEH/75. Competencia: Decreto N.º 143/G/79, art. 2º (según los modelos de resolución del Área Bonificaciones). [COMPLETAR por Capital Humano: montos vigentes]. En el pago por nacimiento y por hijo/a, el dictamen modelo cita la Ordenanza N.º 546/75, arts. 2º, 6º y 8º, y el Decreto Reglamentario N.º 584/75, arts. 3º, 5º, 7º y 15; el art. 6º de la Ordenanza exige una antigüedad y un plazo para solicitar la asignación. [COMPLETAR por Capital Humano: antigüedad mínima y plazo para solicitar]. Según el área: hasta los 15 años se paga sin certificado de escolaridad; cumplidos los 15, para seguir percibiéndola hay que presentar los certificados de inicio y fin de clases.',
  '[{"clave":"acta_nacimiento","nombre":"Acta de nacimiento del hijo/a","obligatorio":true},{"clave":"negativa_anses","nombre":"Negativa de ANSES de la madre o del padre","descripcion":"Certifica que el otro progenitor no percibe la asignación","obligatorio":true},{"clave":"certificado_escolaridad","nombre":"Certificado de escolaridad","descripcion":"Solo si tu hijo/a tiene 15 años o más","obligatorio":false}]'::jsonb,
  '[{"clave":"familiar","etiqueta":"Apellido y nombre del hijo/a","tipo":"texto","obligatorio":true},{"clave":"dni_familiar","etiqueta":"DNI del hijo/a","tipo":"texto","obligatorio":true},{"clave":"fecha_nacimiento","etiqueta":"Fecha de nacimiento del hijo/a","tipo":"fecha","obligatorio":true},{"clave":"progenitor","etiqueta":"Apellido y nombre del otro progenitor","tipo":"texto","obligatorio":false,"ayuda":"El de la negativa de ANSES"},{"clave":"cuil_progenitor","etiqueta":"CUIL del otro progenitor","tipo":"texto","obligatorio":false},{"clave":"observaciones","etiqueta":"Observaciones","tipo":"texto_largo","obligatorio":false}]'::jsonb,
  10, null, 'normal', false, true,
  '013', 'Área Bonificaciones', 8, array['acta_nacimiento', 'certificado_escolaridad']::text[],
  false, 'RECON-BONIF'
),
(
  'ASIG-HIJO-DISC', 'Asignación familiar por hijo/a con discapacidad',
  'Alta o renovación de la asignación familiar por hijo/a con discapacidad.',
  'Asignaciones familiares', 'heart-handshake',
  'Ordenanza N.º 546/75 de Asignaciones Familiares y su Decreto Reglamentario N.º 584/SEH/75. Competencia: Decreto N.º 143/G/79, art. 2º (según los modelos de resolución del Área Bonificaciones). [COMPLETAR por Capital Humano: montos vigentes]. En el pago por nacimiento y por hijo/a, el dictamen modelo cita la Ordenanza N.º 546/75, arts. 2º, 6º y 8º, y el Decreto Reglamentario N.º 584/75, arts. 3º, 5º, 7º y 15; el art. 6º de la Ordenanza exige una antigüedad y un plazo para solicitar la asignación. [COMPLETAR por Capital Humano: antigüedad mínima y plazo para solicitar]. Según el área: se paga sin límite de edad, aun después de los 21 años, mientras el Certificado Único de Discapacidad esté vigente; si vence, se corta la asignación. Se pide por cada hijo/a. Ley 26.378 (Convención sobre los Derechos de las Personas con Discapacidad).',
  '[{"clave":"cud","nombre":"Certificado Único de Discapacidad (CUD)","descripcion":"Vigente","obligatorio":true},{"clave":"acta_nacimiento","nombre":"Acta de nacimiento del hijo/a","descripcion":"Solo la primera vez (en el alta)","obligatorio":false},{"clave":"negativa_anses","nombre":"Negativa de ANSES de la madre o del padre","obligatorio":true}]'::jsonb,
  '[{"clave":"tipo_solicitud","etiqueta":"Tipo de solicitud","tipo":"seleccion","obligatorio":true,"opciones":["Alta","Renovación del CUD"]},{"clave":"familiar","etiqueta":"Apellido y nombre del hijo/a","tipo":"texto","obligatorio":true},{"clave":"dni_familiar","etiqueta":"DNI del hijo/a","tipo":"texto","obligatorio":true},{"clave":"fecha_nacimiento","etiqueta":"Fecha de nacimiento del hijo/a","tipo":"fecha","obligatorio":true},{"clave":"vencimiento_cud","etiqueta":"Vencimiento del CUD","tipo":"fecha","obligatorio":true,"ayuda":"Sirve para avisarte antes de que venza"},{"clave":"progenitor","etiqueta":"Apellido y nombre del otro progenitor","tipo":"texto","obligatorio":false,"ayuda":"El de la negativa de ANSES"},{"clave":"cuil_progenitor","etiqueta":"CUIL del otro progenitor","tipo":"texto","obligatorio":false},{"clave":"observaciones","etiqueta":"Observaciones","tipo":"texto_largo","obligatorio":false,"ayuda":"No incluyas diagnósticos: el CUD ya los contiene"}]'::jsonb,
  5, null, 'alta', true, true,
  '014', 'Área Bonificaciones', 9, '{}'::text[],
  false, 'RECON-BONIF'
),
(
  'ASIG-MATRIMONIO', 'Asignación familiar por matrimonio (pago único)',
  'Pago único de la asignación familiar por matrimonio del/de la agente. Se pide dentro del año de la celebración.',
  'Asignaciones familiares', 'heart',
  'Ordenanza N.º 546/75 de Asignaciones Familiares y su Decreto Reglamentario N.º 584/SEH/75. Competencia: Decreto N.º 143/G/79, art. 2º (según los modelos de resolución del Área Bonificaciones). [COMPLETAR por Capital Humano: montos vigentes]. En el pago por nacimiento y por hijo/a, el dictamen modelo cita la Ordenanza N.º 546/75, arts. 2º, 6º y 8º, y el Decreto Reglamentario N.º 584/75, arts. 3º, 5º, 7º y 15; el art. 6º de la Ordenanza exige una antigüedad y un plazo para solicitar la asignación. [COMPLETAR por Capital Humano: antigüedad mínima y plazo para solicitar]. Según el área: se dispone de un (1) año desde la fecha de celebración del matrimonio para solicitarla.',
  '[{"clave":"acta_matrimonio","nombre":"Acta de matrimonio","obligatorio":true}]'::jsonb,
  '[{"clave":"familiar","etiqueta":"Apellido y nombre del/de la cónyuge","tipo":"texto","obligatorio":true},{"clave":"dni_familiar","etiqueta":"DNI del/de la cónyuge","tipo":"texto","obligatorio":true},{"clave":"fecha_matrimonio","etiqueta":"Fecha de matrimonio","tipo":"fecha","obligatorio":true,"ayuda":"Tenés un año desde la celebración para pedirla"},{"clave":"observaciones","etiqueta":"Observaciones","tipo":"texto_largo","obligatorio":false}]'::jsonb,
  10, null, 'normal', false, true,
  '016', 'Área Bonificaciones', 8, array['acta_matrimonio']::text[],
  false, 'RECON-BONIF'
),
(
  'ASIG-NACIMIENTO', 'Asignación familiar por nacimiento (pago único)',
  'Pago único de la asignación familiar por nacimiento de hijo/a.',
  'Asignaciones familiares', 'baby',
  'Ordenanza N.º 546/75 de Asignaciones Familiares y su Decreto Reglamentario N.º 584/SEH/75. Competencia: Decreto N.º 143/G/79, art. 2º (según los modelos de resolución del Área Bonificaciones). [COMPLETAR por Capital Humano: montos vigentes]. En el pago por nacimiento y por hijo/a, el dictamen modelo cita la Ordenanza N.º 546/75, arts. 2º, 6º y 8º, y el Decreto Reglamentario N.º 584/75, arts. 3º, 5º, 7º y 15; el art. 6º de la Ordenanza exige una antigüedad y un plazo para solicitar la asignación. [COMPLETAR por Capital Humano: antigüedad mínima y plazo para solicitar].',
  '[{"clave":"acta_nacimiento","nombre":"Acta de nacimiento del hijo/a","obligatorio":true},{"clave":"negativa_anses","nombre":"Negativa de ANSES de la madre o del padre","descripcion":"Certifica que el otro progenitor no percibe la asignación","obligatorio":true},{"clave":"no_percepcion_empleador","nombre":"Certificado de no percepción de salario familiar del empleador","descripcion":"Solo si la negativa de ANSES muestra al otro progenitor como trabajador registrado","obligatorio":false},{"clave":"certificado_discapacidad","nombre":"Certificado Único de Discapacidad (CUD)","descripcion":"Solo si el hijo/a tiene discapacidad: se tramita junto con la asignación por hijo/a con discapacidad","obligatorio":false}]'::jsonb,
  '[{"clave":"familiar","etiqueta":"Apellido y nombre del hijo/a","tipo":"texto","obligatorio":true},{"clave":"dni_familiar","etiqueta":"DNI del hijo/a","tipo":"texto","obligatorio":true},{"clave":"fecha_nacimiento","etiqueta":"Fecha de nacimiento del hijo/a","tipo":"fecha","obligatorio":true},{"clave":"progenitor","etiqueta":"Apellido y nombre del otro progenitor","tipo":"texto","obligatorio":false,"ayuda":"El de la negativa de ANSES"},{"clave":"cuil_progenitor","etiqueta":"CUIL del otro progenitor","tipo":"texto","obligatorio":false},{"clave":"observaciones","etiqueta":"Observaciones","tipo":"texto_largo","obligatorio":false}]'::jsonb,
  10, null, 'normal', false, true,
  '017', 'Área Bonificaciones', 8, array['acta_nacimiento', 'certificado_discapacidad']::text[],
  false, 'RECON-BONIF'
),
(
  'ASIG-PRENATAL', 'Asignación familiar prenatal (agente embarazada)',
  'Pago de la asignación prenatal durante el embarazo. La pide la agente embarazada.',
  'Asignaciones familiares', 'heart-pulse',
  'Ordenanza N.º 546/75 de Asignaciones Familiares y su Decreto Reglamentario N.º 584/SEH/75. Competencia: Decreto N.º 143/G/79, art. 2º (según los modelos de resolución del Área Bonificaciones). [COMPLETAR por Capital Humano: montos vigentes]. En el pago por nacimiento y por hijo/a, el dictamen modelo cita la Ordenanza N.º 546/75, arts. 2º, 6º y 8º, y el Decreto Reglamentario N.º 584/75, arts. 3º, 5º, 7º y 15; el art. 6º de la Ordenanza exige una antigüedad y un plazo para solicitar la asignación. [COMPLETAR por Capital Humano: antigüedad mínima y plazo para solicitar]. [COMPLETAR por Capital Humano: semanas mínimas de gestación y período de pago].',
  '[{"clave":"certificado_medico_fpp","nombre":"Certificado médico con fecha probable de parto","obligatorio":true},{"clave":"ecografia","nombre":"Ecografía","obligatorio":true}]'::jsonb,
  '[{"clave":"fecha_probable_parto","etiqueta":"Fecha probable de parto","tipo":"fecha","obligatorio":true}]'::jsonb,
  10, null, 'normal', true, true,
  '018', 'Área Bonificaciones', 10, array['certificado_medico_fpp', 'ecografia']::text[],
  false, 'RECON-BONIF'
),
(
  'ASIG-PRENATAL-VARON', 'Asignación familiar prenatal (cónyuge o conviviente embarazada)',
  'Pago de la asignación prenatal durante el embarazo de tu cónyuge o conviviente.',
  'Asignaciones familiares', 'heart-pulse',
  'Ordenanza N.º 546/75 de Asignaciones Familiares y su Decreto Reglamentario N.º 584/SEH/75. Competencia: Decreto N.º 143/G/79, art. 2º (según los modelos de resolución del Área Bonificaciones). [COMPLETAR por Capital Humano: montos vigentes]. En el pago por nacimiento y por hijo/a, el dictamen modelo cita la Ordenanza N.º 546/75, arts. 2º, 6º y 8º, y el Decreto Reglamentario N.º 584/75, arts. 3º, 5º, 7º y 15; el art. 6º de la Ordenanza exige una antigüedad y un plazo para solicitar la asignación. [COMPLETAR por Capital Humano: antigüedad mínima y plazo para solicitar]. [COMPLETAR por Capital Humano: semanas mínimas de gestación y período de pago].',
  '[{"clave":"certificado_medico_fpp","nombre":"Certificado médico con fecha probable de parto","obligatorio":true},{"clave":"ecografia","nombre":"Ecografía","obligatorio":true},{"clave":"acta_vinculo","nombre":"Acta de matrimonio o de unión convivencial","obligatorio":true},{"clave":"negativa_anses","nombre":"Negativa de ANSES de la madre","descripcion":"Certifica que la madre no percibe la asignación","obligatorio":true}]'::jsonb,
  '[{"clave":"familiar","etiqueta":"Apellido y nombre de tu cónyuge o conviviente","tipo":"texto","obligatorio":true},{"clave":"dni_familiar","etiqueta":"DNI de tu cónyuge o conviviente","tipo":"texto","obligatorio":true},{"clave":"cuil_familiar","etiqueta":"CUIL de tu cónyuge o conviviente","tipo":"texto","obligatorio":false,"ayuda":"El de la negativa de ANSES"},{"clave":"vinculo","etiqueta":"Vínculo","tipo":"seleccion","obligatorio":true,"opciones":["Matrimonio","Unión convivencial"]},{"clave":"fecha_probable_parto","etiqueta":"Fecha probable de parto","tipo":"fecha","obligatorio":true}]'::jsonb,
  10, null, 'normal', true, true,
  '019', 'Área Bonificaciones', 10, array['certificado_medico_fpp', 'ecografia']::text[],
  false, 'RECON-BONIF'
),
(
  'ASIG-CONYUGE', 'Asignación familiar por cónyuge',
  'Pago de la asignación familiar por cónyuge.',
  'Asignaciones familiares', 'heart',
  'Ordenanza N.º 546/75 de Asignaciones Familiares y su Decreto Reglamentario N.º 584/SEH/75. Competencia: Decreto N.º 143/G/79, art. 2º (según los modelos de resolución del Área Bonificaciones). [COMPLETAR por Capital Humano: montos vigentes]. En el pago por nacimiento y por hijo/a, el dictamen modelo cita la Ordenanza N.º 546/75, arts. 2º, 6º y 8º, y el Decreto Reglamentario N.º 584/75, arts. 3º, 5º, 7º y 15; el art. 6º de la Ordenanza exige una antigüedad y un plazo para solicitar la asignación. [COMPLETAR por Capital Humano: antigüedad mínima y plazo para solicitar].',
  '[{"clave":"acta_matrimonio","nombre":"Acta de matrimonio","obligatorio":true},{"clave":"certificado_discapacidad","nombre":"Certificado Único de Discapacidad (CUD) del/de la cónyuge","descripcion":"Solo si tu cónyuge tiene discapacidad","obligatorio":false}]'::jsonb,
  '[{"clave":"familiar","etiqueta":"Apellido y nombre del/de la cónyuge","tipo":"texto","obligatorio":true},{"clave":"dni_familiar","etiqueta":"DNI del/de la cónyuge","tipo":"texto","obligatorio":true},{"clave":"fecha_matrimonio","etiqueta":"Fecha de matrimonio","tipo":"fecha","obligatorio":true},{"clave":"conyuge_discapacidad","etiqueta":"¿Tu cónyuge tiene discapacidad?","tipo":"seleccion","obligatorio":true,"opciones":["No","Sí"]},{"clave":"observaciones","etiqueta":"Observaciones","tipo":"texto_largo","obligatorio":false}]'::jsonb,
  10, null, 'normal', false, true,
  '020', 'Área Bonificaciones', 8, array['acta_matrimonio']::text[],
  false, 'RECON-BONIF'
),
(
  'CAMBIO-DOMICILIO', 'Cambio de domicilio',
  'Actualizá tu domicilio y marcá en el mapa el recorrido hasta tu lugar de trabajo: es el que cubre un accidente en el trayecto.',
  'Datos personales', 'map-pin',
  'Formulario 19 (cambio de domicilio). El recorrido declarado entre el domicilio y el lugar de trabajo es el que se tiene en cuenta ante un accidente en el trayecto (in itinere). [COMPLETAR por Capital Humano: norma aplicable y plazo para informar el cambio].',
  '[]'::jsonb,
  '[{"clave":"domicilio_nuevo","etiqueta":"Nuevo domicilio","tipo":"texto","obligatorio":true,"ayuda":"Calle, número, piso y departamento"},{"clave":"barrio_localidad","etiqueta":"Barrio y localidad","tipo":"texto","obligatorio":true},{"clave":"desde","etiqueta":"Desde cuándo vivís ahí","tipo":"fecha","obligatorio":true},{"clave":"lugar_trabajo","etiqueta":"Dirección de tu lugar de trabajo","tipo":"texto","obligatorio":true,"ayuda":"Donde prestás servicios"},{"clave":"recorrido","etiqueta":"Recorrido de tu casa al trabajo","tipo":"recorrido","obligatorio":true,"ayuda":"Tocá el mapa para marcar tu casa, las esquinas por donde pasás y tu lugar de trabajo, en ese orden"},{"clave":"observaciones","etiqueta":"Observaciones","tipo":"texto_largo","obligatorio":false}]'::jsonb,
  5, null, 'normal', false, true,
  '021', 'Departamento de Higiene y Seguridad', 4, array['presentacion']::text[],
  false, null
),
(
  'LIC-EXAMEN', 'Licencia por examen',
  'Licencia para rendir exámenes en carreras de nivel medio, terciario o universitario.',
  'Licencias', 'graduation-cap',
  '[COMPLETAR por Capital Humano: artículo del Estatuto / régimen de licencias aplicable]',
  '[{"clave":"constancia_inscripcion","nombre":"Constancia de inscripción al examen","descripcion":"Emitida por la institución educativa","obligatorio":true},{"clave":"certificado_rendido","nombre":"Certificado de examen rendido","descripcion":"Podés adjuntarlo después de rendir","obligatorio":false}]'::jsonb,
  '[{"clave":"institucion","etiqueta":"Institución educativa","tipo":"texto","obligatorio":true},{"clave":"carrera","etiqueta":"Carrera","tipo":"texto","obligatorio":true},{"clave":"materia","etiqueta":"Materia / espacio curricular","tipo":"texto","obligatorio":true},{"clave":"fecha_examen","etiqueta":"Fecha del examen","tipo":"fecha","obligatorio":true},{"clave":"dias_solicitados","etiqueta":"Días de licencia solicitados","tipo":"numero","obligatorio":true,"ayuda":"Incluye el día del examen"}]'::jsonb,
  2, 35, 'normal', false, true,
  null, null, null, array['certificado_rendido']::text[],
  false, null
),
(
  'LIC-ENFERMEDAD', 'Licencia por enfermedad',
  'Justificación de inasistencias por enfermedad, con entrevista en Medicina Laboral.',
  'Licencias médicas', 'stethoscope',
  'Decreto N.º 337/EH/77 (régimen de licencias), Ordenanza N.º 936/87 y su Decreto Reglamentario N.º 10/G/88, y Ordenanza N.º 223/84 (según el Formulario 15). Competencia: Decreto N.º 337/77, art. 64. Enfermedad: arts. 18 a 31 del Decreto N.º 337/EH/77 (art. 18: 30 días por año; art. 19: afecciones de largo tratamiento, 6 meses con goce íntegro y 6 meses al 50 %; art. 30: cada certificación por hasta 30 días, con nueva revisación). El aviso se da hasta 2 horas después del horario de ingreso y la entrevista con el certificado original es hasta las 11 h del día hábil siguiente. [COMPLETAR por Capital Humano: confirmar plazos y encuadre].',
  '[{"clave":"certificado_medico","nombre":"Certificado médico","descripcion":"Llevá el original a la entrevista en Medicina Laboral, hasta las 11 h del día hábil siguiente","obligatorio":true}]'::jsonb,
  '[{"clave":"fecha_desde","etiqueta":"Desde qué día","tipo":"fecha","obligatorio":true},{"clave":"domicilio_reposo","etiqueta":"Domicilio donde hacés reposo","tipo":"texto","obligatorio":true,"ayuda":"Para la visita domiciliaria de Medicina Laboral"},{"clave":"turno","etiqueta":"Tu turno de trabajo","tipo":"seleccion","obligatorio":true,"opciones":["Mañana","Tarde","Noche","Rotativo"]},{"clave":"dias_certificado","etiqueta":"Días que indica el certificado","tipo":"numero","obligatorio":false},{"clave":"observaciones","etiqueta":"Observaciones","tipo":"texto_largo","obligatorio":false,"ayuda":"No incluyas diagnósticos: el certificado ya los contiene"}]'::jsonb,
  2, null, 'normal', true, true,
  '027', 'Departamento de Medicina Laboral', 6, '{}'::text[],
  false, 'RECON-MEDLAB'
),
(
  'LIC-ACCIDENTE', 'Licencia por accidente de trabajo',
  'Licencia por accidente en el trabajo, en el trayecto o por enfermedad profesional.',
  'Licencias médicas', 'hard-hat',
  'Decreto N.º 337/EH/77 (régimen de licencias), Ordenanza N.º 936/87 y su Decreto Reglamentario N.º 10/G/88, y Ordenanza N.º 223/84 (según el Formulario 15). Competencia: Decreto N.º 337/77, art. 64. Accidente de trabajo o enfermedad profesional: art. 28 del Decreto N.º 337/EH/77 (salario íntegro); in itinere, art. 29 (denuncia policial dentro de las 24 horas); art. 30 (certificaciones por hasta 30 días). [COMPLETAR por Capital Humano: régimen de riesgos del trabajo vigente y reintegro de la ART].',
  '[{"clave":"certificado_medico","nombre":"Certificado médico","descripcion":"Llevá el original a Medicina Laboral (vos o alguien autorizado); queda en tu ficha médica","obligatorio":true},{"clave":"denuncia_art","nombre":"Denuncia del accidente ante la ART","descripcion":"Si ya la hiciste","obligatorio":false},{"clave":"constancia_policial","nombre":"Denuncia policial","descripcion":"Solo si el accidente fue en el trayecto: dentro de las 24 horas","obligatorio":false}]'::jsonb,
  '[{"clave":"tipo_accidente","etiqueta":"Dónde ocurrió","tipo":"seleccion","obligatorio":true,"opciones":["En el lugar de trabajo","En el trayecto (in itinere)","En ocasión del trabajo","Enfermedad profesional"]},{"clave":"fecha_accidente","etiqueta":"Fecha del accidente","tipo":"fecha","obligatorio":true},{"clave":"circunstancias","etiqueta":"Cómo ocurrió","tipo":"texto_largo","obligatorio":true,"ayuda":"Lo que pasó, sin datos médicos"},{"clave":"fecha_desde","etiqueta":"Desde qué día","tipo":"fecha","obligatorio":true},{"clave":"domicilio_reposo","etiqueta":"Domicilio donde hacés reposo","tipo":"texto","obligatorio":true,"ayuda":"Para la visita domiciliaria de Medicina Laboral"},{"clave":"turno","etiqueta":"Tu turno de trabajo","tipo":"seleccion","obligatorio":true,"opciones":["Mañana","Tarde","Noche","Rotativo"]},{"clave":"dias_certificado","etiqueta":"Días que indica el certificado","tipo":"numero","obligatorio":false},{"clave":"observaciones","etiqueta":"Observaciones","tipo":"texto_largo","obligatorio":false,"ayuda":"No incluyas diagnósticos: el certificado ya los contiene"}]'::jsonb,
  3, null, 'alta', true, true,
  '023', 'Departamento de Medicina Laboral', 6, '{}'::text[],
  false, 'RECON-MEDLAB'
),
(
  'LIC-FAMILIAR-ENFERMO', 'Licencia por atención de familiar enfermo',
  'Licencia con goce de sueldo para atender a un familiar enfermo: hasta 10 días hábiles por año.',
  'Licencias médicas', 'hand-heart',
  'Decreto N.º 337/EH/77 (régimen de licencias), Ordenanza N.º 936/87 y su Decreto Reglamentario N.º 10/G/88, y Ordenanza N.º 223/84 (según el Formulario 15). Competencia: Decreto N.º 337/77, art. 64. Atención de familiar enfermo: art. 50 del Decreto N.º EH-337/77, Ordenanza N.º 936/87 y Decreto Reglamentario N.º 10/88: diez días hábiles por año calendario con percepción íntegra de haberes.',
  '[{"clave":"certificado_medico","nombre":"Certificado médico del familiar","descripcion":"Que indique que requiere tu atención personal","obligatorio":true},{"clave":"ddjj_familiar","nombre":"Declaración jurada de parentesco y grupo familiar","descripcion":"Para la justificación por familiar enfermo","obligatorio":true}]'::jsonb,
  '[{"clave":"familiar","etiqueta":"Apellido y nombre del familiar","tipo":"texto","obligatorio":true},{"clave":"dni_familiar","etiqueta":"DNI del familiar","tipo":"texto","obligatorio":true},{"clave":"parentesco","etiqueta":"Parentesco","tipo":"seleccion","obligatorio":true,"opciones":["Cónyuge o conviviente","Hijo/a","Padre o madre","Otro"]},{"clave":"fecha_desde","etiqueta":"Desde","tipo":"fecha","obligatorio":true},{"clave":"fecha_hasta","etiqueta":"Hasta","tipo":"fecha","obligatorio":true},{"clave":"observaciones","etiqueta":"Observaciones","tipo":"texto_largo","obligatorio":false,"ayuda":"No incluyas diagnósticos: el certificado ya los contiene"}]'::jsonb,
  2, null, 'normal', true, true,
  '028', 'Departamento de Medicina Laboral', 6, array['ddjj_familiar']::text[],
  false, 'RECON-MEDLAB'
),
(
  'LIC-FAMILIAR-DISC', 'Licencia especial por familiar con discapacidad',
  'Licencia o pago especial para acompañar el tratamiento de un hijo/a o cónyuge con discapacidad.',
  'Licencias médicas', 'heart-handshake',
  'Ordenanza N.º 5363/24 (licencia y asignación especial por hijo/a o cónyuge con discapacidad), art. 4º, de aplicación al personal de todas las reparticiones excepto la Dirección de Educación. Según el Formulario 3: licencia especial de 30 a 90 días por tratamiento dentro de la provincia o de 30 a 180 días fuera de la provincia, o pago especial; agotada la licencia con goce de haberes, se otorga sin goce hasta 60 días por tratamiento dentro de la provincia o 120 días fuera. Al terminar, el/la agente presenta en Medicina Laboral los certificados de los tratamientos realizados. [COMPLETAR por Capital Humano: monto del pago especial y vínculos alcanzados]. Ley 26.378 (Convención sobre los Derechos de las Personas con Discapacidad).',
  '[{"clave":"cud","nombre":"Certificado Único de Discapacidad (CUD)","descripcion":"Vigente","obligatorio":true},{"clave":"certificado_medico","nombre":"Certificado médico","descripcion":"Que indique si el tratamiento es dentro o fuera de la provincia, que requiere tu atención personal y permanente, y el tipo de tratamiento","obligatorio":true},{"clave":"plan_terapeutico","nombre":"Historia clínica y plan de tratamiento","descripcion":"Emitidos por los profesionales que atienden a tu familiar; si la discapacidad es neurológica, también la historia clínica del pediatra o neurólogo","obligatorio":true},{"clave":"acta_vinculo","nombre":"Acta de nacimiento o de matrimonio o unión convivencial","descripcion":"La que acredita el parentesco","obligatorio":true},{"clave":"copia_dni_familiar","nombre":"DNI del familiar","descripcion":"Copia","obligatorio":true},{"clave":"ddjj_grupo_familiar","nombre":"Declaración jurada de grupo familiar conviviente (Formulario 22)","obligatorio":false}]'::jsonb,
  '[{"clave":"vinculo","etiqueta":"Vínculo","tipo":"seleccion","obligatorio":true,"opciones":["Hijo/a","Cónyuge o conviviente"]},{"clave":"familiar","etiqueta":"Apellido y nombre del familiar","tipo":"texto","obligatorio":true},{"clave":"dni_familiar","etiqueta":"DNI del familiar","tipo":"texto","obligatorio":true},{"clave":"fecha_nacimiento","etiqueta":"Fecha de nacimiento del familiar","tipo":"fecha","obligatorio":true},{"clave":"convive","etiqueta":"¿Convive con vos?","tipo":"seleccion","obligatorio":true,"opciones":["Sí","No"]},{"clave":"solicita","etiqueta":"Qué pedís","tipo":"seleccion","obligatorio":true,"opciones":["Días de licencia","Pago especial","Días de licencia y pago especial"]},{"clave":"lugar_tratamiento","etiqueta":"Dónde es el tratamiento","tipo":"seleccion","obligatorio":true,"opciones":["Dentro de la provincia","Fuera de la provincia"],"ayuda":"Dentro de la provincia, de 30 a 90 días; fuera, de 30 a 180 días"},{"clave":"goce","etiqueta":"Goce de haberes","tipo":"seleccion","obligatorio":true,"opciones":["Con goce de haberes","Sin goce de haberes"],"ayuda":"Sin goce, solo si ya agotaste la licencia con goce: hasta 60 días dentro de la provincia o 120 fuera"},{"clave":"fecha_desde","etiqueta":"Desde","tipo":"fecha","obligatorio":true},{"clave":"fecha_hasta","etiqueta":"Hasta","tipo":"fecha","obligatorio":true},{"clave":"vencimiento_cud","etiqueta":"Vencimiento del CUD","tipo":"fecha","obligatorio":true},{"clave":"observaciones","etiqueta":"Observaciones","tipo":"texto_largo","obligatorio":false,"ayuda":"No incluyas diagnósticos: el certificado ya los contiene"}]'::jsonb,
  5, null, 'alta', true, true,
  '024', 'Departamento de Medicina Laboral', 9, array['cud']::text[],
  false, 'RECON-MEDLAB'
),
(
  'MAT-PREPARTO', 'Licencia por maternidad (preparto)',
  'Licencia por maternidad antes del parto. Después del parto se pide la licencia postparto.',
  'Licencias médicas', 'heart-pulse',
  'Decreto N.º 337/EH/77 (régimen de licencias), Ordenanza N.º 936/87 y su Decreto Reglamentario N.º 10/G/88, y Ordenanza N.º 223/84 (según el Formulario 15). Competencia: Decreto N.º 337/77, art. 64. Maternidad: Decreto N.º 337/77, arts. 32 a 38, y su modificatoria, Ordenanza N.º 223/84, art. 1º. Requisitos: antigüedad mínima en el municipio superior a un mes y más de seis meses en cualquier actividad en relación de dependencia en los doce meses anteriores a la iniciación del último empleo. [COMPLETAR por Capital Humano: duración del preparto y del postparto, y días de preparto que se pasan al postparto].',
  '[{"clave":"certificado_medico","nombre":"Certificado médico con fecha probable de parto","obligatorio":true}]'::jsonb,
  '[{"clave":"fecha_desde","etiqueta":"Desde qué día","tipo":"fecha","obligatorio":true},{"clave":"fecha_probable_parto","etiqueta":"Fecha probable de parto","tipo":"fecha","obligatorio":true},{"clave":"dias_reduccion","etiqueta":"Días de preparto que pasás al postparto","tipo":"numero","obligatorio":false,"ayuda":"Si optás por reducir el preparto"},{"clave":"observaciones","etiqueta":"Observaciones","tipo":"texto_largo","obligatorio":false,"ayuda":"No incluyas diagnósticos: el certificado ya los contiene"}]'::jsonb,
  3, null, 'alta', true, true,
  '026', 'Departamento de Medicina Laboral', 6, array['certificado_medico']::text[],
  false, 'RECON-MEDLAB'
),
(
  'MAT-POSTPARTO', 'Licencia por maternidad (postparto)',
  'Licencia por maternidad después del parto, con el acta de nacimiento.',
  'Licencias médicas', 'baby',
  'Decreto N.º 337/EH/77 (régimen de licencias), Ordenanza N.º 936/87 y su Decreto Reglamentario N.º 10/G/88, y Ordenanza N.º 223/84 (según el Formulario 15). Competencia: Decreto N.º 337/77, art. 64. Maternidad: Decreto N.º E-H 337/77, art. 32 y siguientes, y su modificatoria, Ordenanza N.º 223/84. [COMPLETAR por Capital Humano: duración del postparto y tratamiento de los días de preparto no gozados].',
  '[{"clave":"certificado_medico","nombre":"Certificado médico","descripcion":"Constancia médica del parto","obligatorio":true},{"clave":"acta_nacimiento","nombre":"Acta de nacimiento del hijo/a","obligatorio":true}]'::jsonb,
  '[{"clave":"familiar","etiqueta":"Apellido y nombre del hijo/a","tipo":"texto","obligatorio":true},{"clave":"dni_familiar","etiqueta":"DNI del hijo/a","tipo":"texto","obligatorio":true},{"clave":"fecha_nacimiento","etiqueta":"Fecha de nacimiento del hijo/a","tipo":"fecha","obligatorio":true},{"clave":"fecha_desde","etiqueta":"Desde qué día","tipo":"fecha","obligatorio":true},{"clave":"resolucion_preparto","etiqueta":"Resolución de la licencia preparto","tipo":"texto","obligatorio":false,"ayuda":"Si la tuviste: número de resolución o de expediente"},{"clave":"solicita_lactancia","etiqueta":"¿Vas a pedir la hora de lactancia?","tipo":"seleccion","obligatorio":true,"opciones":["Sí","No"],"ayuda":"Si la pedís, Medicina Laboral te va a indicar que inicies el permiso de lactancia (va en un trámite aparte)"},{"clave":"observaciones","etiqueta":"Observaciones","tipo":"texto_largo","obligatorio":false,"ayuda":"No incluyas diagnósticos: el certificado ya los contiene"}]'::jsonb,
  3, null, 'alta', true, true,
  '025', 'Departamento de Medicina Laboral', 6, array['certificado_medico', 'acta_nacimiento']::text[],
  false, 'RECON-MEDLAB'
),
(
  'MAT-LACTANCIA', 'Permiso de lactancia',
  'Una hora diaria hasta que tu hijo/a cumpla un año, después de la licencia postparto. Inicialo si lo pediste en la licencia postparto.',
  'Licencias médicas', 'milk',
  'Decreto N.º 337/EH/77 (régimen de licencias), Ordenanza N.º 936/87 y su Decreto Reglamentario N.º 10/G/88, y Ordenanza N.º 223/84 (según el Formulario 15). Competencia: Decreto N.º 337/77, art. 64. Permiso de lactancia: Decreto N.º 337/77, art. 39. [COMPLETAR por Capital Humano: si es un turno de una hora o una hora diaria, y si se puede pedir después].',
  '[]'::jsonb,
  '[{"clave":"familiar","etiqueta":"Apellido y nombre del hijo/a","tipo":"texto","obligatorio":true},{"clave":"dni_familiar","etiqueta":"DNI del hijo/a","tipo":"texto","obligatorio":true},{"clave":"fecha_nacimiento","etiqueta":"Fecha de nacimiento del hijo/a","tipo":"fecha","obligatorio":true},{"clave":"fecha_desde","etiqueta":"Desde qué día","tipo":"fecha","obligatorio":true,"ayuda":"En general, al terminar la licencia postparto"},{"clave":"resoluciones_previas","etiqueta":"Resoluciones de preparto y postparto","tipo":"texto","obligatorio":false,"ayuda":"Número de resolución o de expediente"},{"clave":"observaciones","etiqueta":"Observaciones","tipo":"texto_largo","obligatorio":false}]'::jsonb,
  3, null, 'normal', true, true,
  '025', 'Departamento de Medicina Laboral', null, '{}'::text[],
  false, 'RECON-MEDLAB'
),
(
  'RECON-BONIF', 'Recurso de reconsideración (Área Bonificaciones)',
  'Pedido de reconsideración de una resolución de Capital Humano. Se pide desde el trámite resuelto, dentro de los 8 días hábiles de la notificación.',
  'Recursos', 'scale',
  'Recurso de reconsideración: se interpone dentro de los ocho (8) días hábiles de la notificación de la resolución. Por el plazo extraordinario del art. 25 de la Ordenanza de Procedimiento Administrativo (OPA), se admite para su análisis de fondo incluso en las dos (2) primeras horas del día hábil siguiente. Si se rechaza, procede el recurso jerárquico, que se presenta en papel. [COMPLETAR por Capital Humano: número de la OPA y norma de competencia].',
  '[{"clave":"documentacion_nueva","nombre":"Documentación nueva","descripcion":"Solo si tenés algo que no presentaste antes","obligatorio":false}]'::jsonb,
  '[{"clave":"fundamentos","etiqueta":"Fundamentos","tipo":"texto_largo","obligatorio":true}]'::jsonb,
  10, null, 'normal', false, true,
  null, 'Área Bonificaciones', 7, '{}'::text[],
  true, null
),
(
  'RECON-MEDLAB', 'Recurso de reconsideración (Departamento de Medicina Laboral)',
  'Pedido de reconsideración de una resolución de Capital Humano. Se pide desde el trámite resuelto, dentro de los 8 días hábiles de la notificación.',
  'Recursos', 'scale',
  'Recurso de reconsideración: se interpone dentro de los ocho (8) días hábiles de la notificación de la resolución. Por el plazo extraordinario del art. 25 de la Ordenanza de Procedimiento Administrativo (OPA), se admite para su análisis de fondo incluso en las dos (2) primeras horas del día hábil siguiente. Si se rechaza, procede el recurso jerárquico, que se presenta en papel. [COMPLETAR por Capital Humano: número de la OPA y norma de competencia].',
  '[{"clave":"documentacion_nueva","nombre":"Documentación nueva","descripcion":"Solo si tenés algo que no presentaste antes","obligatorio":false}]'::jsonb,
  '[{"clave":"fundamentos","etiqueta":"Fundamentos","tipo":"texto_largo","obligatorio":true}]'::jsonb,
  10, null, 'normal', false, true,
  null, 'Departamento de Medicina Laboral', null, '{}'::text[],
  true, null
)
on conflict (codigo) do update set
  nombre = excluded.nombre, descripcion = excluded.descripcion, categoria = excluded.categoria, icono = excluded.icono,
  normativa = excluded.normativa, requisitos = excluded.requisitos, formulario = excluded.formulario,
  plazo_dias = excluded.plazo_dias, linea_base_dias = excluded.linea_base_dias, prioridad_base = excluded.prioridad_base,
  reservado = excluded.reservado, activo = true, codigo_relevamiento = excluded.codigo_relevamiento,
  oficina = excluded.oficina, pasos_actuales = excluded.pasos_actuales, documentacion_final = excluded.documentacion_final,
  es_recurso = excluded.es_recurso, reconsideracion = excluded.reconsideracion;

-- Circuitos (se reemplazan completos)
delete from public.pasos_circuito where tipo_tramite_id in (select id from public.tipos_tramite where codigo in ('BONIF-TIT-SEC', 'BONIF-TIT-TER', 'BONIF-TIT-UNI', 'BAJA-ESTUDIOS', 'BAJA-DIVORCIO', 'BAJA-FALLECIMIENTO', 'BAJA-PARTICULAR', 'ESC-FIN', 'ESC-FIN-EXT', 'ESC-INICIO', 'ESC-INICIO-EXT', 'ASIG-FAM-NUM', 'ASIG-HIJO', 'ASIG-HIJO-DISC', 'ASIG-MATRIMONIO', 'ASIG-NACIMIENTO', 'ASIG-PRENATAL', 'ASIG-PRENATAL-VARON', 'ASIG-CONYUGE', 'CAMBIO-DOMICILIO', 'LIC-EXAMEN', 'LIC-ENFERMEDAD', 'LIC-ACCIDENTE', 'LIC-FAMILIAR-ENFERMO', 'LIC-FAMILIAR-DISC', 'MAT-PREPARTO', 'MAT-POSTPARTO', 'MAT-LACTANCIA', 'RECON-BONIF', 'RECON-MEDLAB'));
insert into public.pasos_circuito
  (tipo_tramite_id, orden, nombre, area_id, accion, plazo_horas, instrucciones, controles, revisa, genera, permite_subsanacion, destino_final)
select t.id, p.orden, p.nombre, a.id, p.accion::public.accion_paso, p.plazo_horas, p.instrucciones, p.controles, p.revisa, p.genera, p.permite_subsanacion, p.destino_final
from (values
  ('BONIF-TIT-SEC', 1, 'Control de documentación y verificación del título', 'BONIF', 'analisis', 48, null,
   array['Controlar la documentación adjunta', 'Verificar la autenticidad del título', 'Verificar en Civitas que no se haya hecho lugar antes a la misma solicitud', 'Verificar en Civitas que el/la agente no esté cobrando ya el adicional por título secundario', 'Verificar en Civitas que el/la agente tenga «Liquida SÍ» en su legajo y no tenga una baja cargada ni en curso']::text[],
   array['Formulario', 'Certificado analítico']::text[],
   '{}'::text[], true, null),
  ('BONIF-TIT-SEC', 2, 'Dictamen', 'DICT', 'dictamen', 48, null,
   array['Controlar la documentación', 'Consultar en Civitas la situación de revista y la foja de servicios del/de la agente (ya no se adjuntan al expediente)', 'Dictaminar sobre la procedencia del adicional por título']::text[],
   array['Formulario', 'Certificado analítico']::text[],
   array['Dictamen']::text[], true, null),
  ('BONIF-TIT-SEC', 3, 'Proyecto de resolución', 'BONIF', 'resolucion', 24, null,
   array['Revisar el dictamen', 'Preparar el proyecto de resolución en el sentido del dictamen']::text[],
   array['Dictamen', 'Formulario', 'Certificado analítico']::text[],
   array['Resolución']::text[], true, null),
  ('BONIF-TIT-SEC', 4, 'Control y firma de la resolución', 'DIR', 'firma', 24, null,
   array['Controlar el proyecto y la documentación', 'Firmar la resolución (el número y la fecha se asignan al firmar)']::text[],
   array['Resolución', 'Dictamen', 'Formulario', 'Certificado analítico']::text[],
   array['Resolución firmada']::text[], false, null),
  ('BONIF-TIT-SEC', 5, 'Novedad a Liquidación y cierre', 'BONIF', 'liquidacion', 24, null,
   array['Informar la novedad a Liquidación de Haberes', 'Registrar la novedad en Civitas']::text[],
   array['Resolución firmada']::text[],
   array['Novedad a Liquidación de Haberes']::text[], false, 'Notificación electrónica al agente, incorporación al legajo digital y archivo'),
  ('BONIF-TIT-TER', 1, 'Control de documentación y verificación del título', 'BONIF', 'analisis', 48, null,
   array['Controlar la documentación adjunta', 'Verificar la autenticidad del título', 'Verificar en Civitas que no se haya hecho lugar antes a la misma solicitud', 'Verificar en Civitas que el/la agente no esté cobrando ya el adicional por título terciario', 'Verificar en Civitas que el/la agente tenga «Liquida SÍ» en su legajo y no tenga una baja cargada ni en curso']::text[],
   array['Formulario', 'Certificado analítico', 'Diploma autenticado']::text[],
   '{}'::text[], true, null),
  ('BONIF-TIT-TER', 2, 'Dictamen', 'DICT', 'dictamen', 48, null,
   array['Controlar la documentación', 'Consultar en Civitas la situación de revista y la foja de servicios del/de la agente (ya no se adjuntan al expediente)', 'Dictaminar sobre la procedencia del adicional por título']::text[],
   array['Formulario', 'Certificado analítico', 'Diploma autenticado']::text[],
   array['Dictamen']::text[], true, null),
  ('BONIF-TIT-TER', 3, 'Proyecto de resolución', 'BONIF', 'resolucion', 24, null,
   array['Revisar el dictamen', 'Preparar el proyecto de resolución en el sentido del dictamen']::text[],
   array['Dictamen', 'Formulario', 'Certificado analítico', 'Diploma autenticado']::text[],
   array['Resolución']::text[], true, null),
  ('BONIF-TIT-TER', 4, 'Control y firma de la resolución', 'DIR', 'firma', 24, null,
   array['Controlar el proyecto y la documentación', 'Firmar la resolución (el número y la fecha se asignan al firmar)']::text[],
   array['Resolución', 'Dictamen', 'Formulario', 'Certificado analítico', 'Diploma autenticado']::text[],
   array['Resolución firmada']::text[], false, null),
  ('BONIF-TIT-TER', 5, 'Novedad a Liquidación y cierre', 'BONIF', 'liquidacion', 24, null,
   array['Informar la novedad a Liquidación de Haberes', 'Registrar la novedad en Civitas']::text[],
   array['Resolución firmada']::text[],
   array['Novedad a Liquidación de Haberes']::text[], false, 'Notificación electrónica al agente, incorporación al legajo digital y archivo'),
  ('BONIF-TIT-UNI', 1, 'Control de documentación y verificación del título', 'BONIF', 'analisis', 48, null,
   array['Controlar la documentación adjunta', 'Verificar el título online en el Registro Público de Graduados Universitarios (SIU-CIN) o, si es extranjero, en el de convalidaciones', 'Verificar en Civitas que no se haya hecho lugar antes a la misma solicitud', 'Verificar en Civitas que el/la agente no esté cobrando ya el adicional por título universitario', 'Verificar en Civitas que el/la agente tenga «Liquida SÍ» en su legajo y no tenga una baja cargada ni en curso']::text[],
   array['Formulario', 'Diploma autenticado']::text[],
   '{}'::text[], true, null),
  ('BONIF-TIT-UNI', 2, 'Dictamen', 'DICT', 'dictamen', 48, null,
   array['Controlar la documentación', 'Consultar en Civitas la situación de revista y la foja de servicios del/de la agente (ya no se adjuntan al expediente)', 'Dictaminar sobre la procedencia del adicional por título']::text[],
   array['Formulario', 'Diploma autenticado']::text[],
   array['Dictamen']::text[], true, null),
  ('BONIF-TIT-UNI', 3, 'Proyecto de resolución', 'BONIF', 'resolucion', 24, null,
   array['Revisar el dictamen', 'Preparar el proyecto de resolución en el sentido del dictamen']::text[],
   array['Dictamen', 'Formulario', 'Diploma autenticado']::text[],
   array['Resolución']::text[], true, null),
  ('BONIF-TIT-UNI', 4, 'Control y firma de la resolución', 'DIR', 'firma', 24, null,
   array['Controlar el proyecto y la documentación', 'Firmar la resolución (el número y la fecha se asignan al firmar)']::text[],
   array['Resolución', 'Dictamen', 'Formulario', 'Diploma autenticado']::text[],
   array['Resolución firmada']::text[], false, null),
  ('BONIF-TIT-UNI', 5, 'Novedad a Liquidación y cierre', 'BONIF', 'liquidacion', 24, null,
   array['Informar la novedad a Liquidación de Haberes', 'Registrar la novedad en Civitas']::text[],
   array['Resolución firmada']::text[],
   array['Novedad a Liquidación de Haberes']::text[], false, 'Notificación electrónica al agente, incorporación al legajo digital y archivo'),
  ('BAJA-ESTUDIOS', 1, 'Control de documentación', 'BONIF', 'analisis', 48, null,
   array['Controlar la documentación adjunta', 'Verificar en Civitas que el hijo/a esté registrado/a y que el/la agente perciba la asignación por hijo/a por él/ella (requisito excluyente)', 'Verificar en Civitas que la asignación esté vigente y desde cuándo se liquida', 'Verificar en Civitas que el/la agente tenga «Liquida SÍ» en su legajo y no tenga una baja cargada ni en curso']::text[],
   array['Formulario', 'Certificado de estudios con fecha hasta', 'Declaración jurada de interrupción de estudios']::text[],
   '{}'::text[], true, null),
  ('BAJA-ESTUDIOS', 2, 'Dictamen', 'DICT', 'dictamen', 48, null,
   array['Controlar la documentación', 'Consultar en Civitas la situación de revista y la foja de servicios del/de la agente (ya no se adjuntan al expediente)', 'Dictaminar sobre la baja, la fecha de cese y si alcanza también a la escolaridad']::text[],
   array['Formulario', 'Certificado de estudios con fecha hasta', 'Declaración jurada de interrupción de estudios']::text[],
   array['Dictamen']::text[], true, null),
  ('BAJA-ESTUDIOS', 3, 'Proyecto de resolución', 'BONIF', 'resolucion', 24, null,
   array['Revisar el dictamen', 'Preparar el proyecto de resolución en el sentido del dictamen']::text[],
   array['Dictamen', 'Formulario', 'Certificado de estudios con fecha hasta', 'Declaración jurada de interrupción de estudios']::text[],
   array['Resolución']::text[], true, null),
  ('BAJA-ESTUDIOS', 4, 'Control y firma de la resolución', 'DIR', 'firma', 24, null,
   array['Controlar el proyecto y la documentación', 'Firmar la resolución (el número y la fecha se asignan al firmar)']::text[],
   array['Resolución', 'Dictamen', 'Formulario', 'Certificado de estudios con fecha hasta', 'Declaración jurada de interrupción de estudios']::text[],
   array['Resolución firmada']::text[], false, null),
  ('BAJA-ESTUDIOS', 5, 'Novedad a Liquidación y cierre', 'BONIF', 'liquidacion', 24, null,
   array['Informar la novedad a Liquidación de Haberes', 'Registrar la novedad en Civitas']::text[],
   array['Resolución firmada']::text[],
   array['Novedad a Liquidación de Haberes']::text[], false, 'Notificación electrónica al agente, incorporación al legajo digital y archivo'),
  ('BAJA-DIVORCIO', 1, 'Control de documentación', 'BONIF', 'analisis', 48, null,
   array['Controlar la documentación adjunta', 'Verificar en Civitas que el/la cónyuge esté declarado/a en el grupo familiar', 'Verificar en Civitas que no haya una solicitud duplicada', 'Verificar en Civitas que la asignación esté vigente y desde cuándo se liquida', 'Verificar en Civitas que el/la agente tenga «Liquida SÍ» en su legajo y no tenga una baja cargada ni en curso']::text[],
   array['Formulario', 'Sentencia judicial de divorcio']::text[],
   '{}'::text[], true, null),
  ('BAJA-DIVORCIO', 2, 'Dictamen', 'DICT', 'dictamen', 48, null,
   array['Controlar la documentación', 'Consultar en Civitas la situación de revista y la foja de servicios del/de la agente (ya no se adjuntan al expediente)', 'Dictaminar sobre la baja y desde cuándo cesa la asignación']::text[],
   array['Formulario', 'Sentencia judicial de divorcio']::text[],
   array['Dictamen']::text[], true, null),
  ('BAJA-DIVORCIO', 3, 'Proyecto de resolución', 'BONIF', 'resolucion', 24, null,
   array['Revisar el dictamen', 'Preparar el proyecto de resolución en el sentido del dictamen']::text[],
   array['Dictamen', 'Formulario', 'Sentencia judicial de divorcio']::text[],
   array['Resolución']::text[], true, null),
  ('BAJA-DIVORCIO', 4, 'Control y firma de la resolución', 'DIR', 'firma', 24, null,
   array['Controlar el proyecto y la documentación', 'Firmar la resolución (el número y la fecha se asignan al firmar)']::text[],
   array['Resolución', 'Dictamen', 'Formulario', 'Sentencia judicial de divorcio']::text[],
   array['Resolución firmada']::text[], false, null),
  ('BAJA-DIVORCIO', 5, 'Novedad a Liquidación y cierre', 'BONIF', 'liquidacion', 24, null,
   array['Informar la novedad a Liquidación de Haberes', 'Registrar la novedad en Civitas']::text[],
   array['Resolución firmada']::text[],
   array['Novedad a Liquidación de Haberes']::text[], false, 'Notificación electrónica al agente, incorporación al legajo digital y archivo'),
  ('BAJA-FALLECIMIENTO', 1, 'Control de documentación', 'BONIF', 'analisis', 48, null,
   array['Controlar la documentación adjunta', 'Verificar en Civitas que el familiar esté declarado/a en el grupo familiar', 'Verificar en Civitas que la asignación esté vigente y desde cuándo se liquida', 'Verificar en Civitas que el/la agente tenga «Liquida SÍ» en su legajo y no tenga una baja cargada ni en curso']::text[],
   array['Formulario', 'Acta de defunción']::text[],
   '{}'::text[], true, null),
  ('BAJA-FALLECIMIENTO', 2, 'Dictamen', 'DICT', 'dictamen', 48, null,
   array['Controlar la documentación', 'Consultar en Civitas la situación de revista y la foja de servicios del/de la agente (ya no se adjuntan al expediente)', 'Dictaminar sobre la baja y la fecha de cese']::text[],
   array['Formulario', 'Acta de defunción']::text[],
   array['Dictamen']::text[], true, null),
  ('BAJA-FALLECIMIENTO', 3, 'Proyecto de resolución', 'BONIF', 'resolucion', 24, null,
   array['Revisar el dictamen', 'Preparar el proyecto de resolución en el sentido del dictamen']::text[],
   array['Dictamen', 'Formulario', 'Acta de defunción']::text[],
   array['Resolución']::text[], true, null),
  ('BAJA-FALLECIMIENTO', 4, 'Control y firma de la resolución', 'DIR', 'firma', 24, null,
   array['Controlar el proyecto y la documentación', 'Firmar la resolución (el número y la fecha se asignan al firmar)']::text[],
   array['Resolución', 'Dictamen', 'Formulario', 'Acta de defunción']::text[],
   array['Resolución firmada']::text[], false, null),
  ('BAJA-FALLECIMIENTO', 5, 'Novedad a Liquidación y cierre', 'BONIF', 'liquidacion', 24, null,
   array['Informar la novedad a Liquidación de Haberes', 'Registrar la novedad en Civitas']::text[],
   array['Resolución firmada']::text[],
   array['Novedad a Liquidación de Haberes']::text[], false, 'Notificación electrónica al agente, incorporación al legajo digital y archivo'),
  ('BAJA-PARTICULAR', 1, 'Control de la solicitud', 'BONIF', 'analisis', 48, null,
   array['Controlar la solicitud y el motivo', 'Verificar en Civitas que el hijo/a esté registrado/a y que el/la agente perciba la asignación por hijo/a por él/ella (requisito excluyente)', 'Verificar en Civitas que la asignación esté vigente y desde cuándo se liquida', 'Verificar en Civitas que el/la agente tenga «Liquida SÍ» en su legajo y no tenga una baja cargada ni en curso']::text[],
   array['Formulario']::text[],
   '{}'::text[], true, null),
  ('BAJA-PARTICULAR', 2, 'Dictamen', 'DICT', 'dictamen', 48, null,
   array['Controlar la documentación', 'Consultar en Civitas la situación de revista y la foja de servicios del/de la agente (ya no se adjuntan al expediente)', 'Dictaminar sobre la baja solicitada']::text[],
   array['Formulario']::text[],
   array['Dictamen']::text[], true, null),
  ('BAJA-PARTICULAR', 3, 'Proyecto de resolución', 'BONIF', 'resolucion', 24, null,
   array['Revisar el dictamen', 'Preparar el proyecto de resolución en el sentido del dictamen']::text[],
   array['Dictamen', 'Formulario']::text[],
   array['Resolución']::text[], true, null),
  ('BAJA-PARTICULAR', 4, 'Control y firma de la resolución', 'DIR', 'firma', 24, null,
   array['Controlar el proyecto y la documentación', 'Firmar la resolución (el número y la fecha se asignan al firmar)']::text[],
   array['Resolución', 'Dictamen', 'Formulario']::text[],
   array['Resolución firmada']::text[], false, null),
  ('BAJA-PARTICULAR', 5, 'Novedad a Liquidación y cierre', 'BONIF', 'liquidacion', 24, null,
   array['Informar la novedad a Liquidación de Haberes', 'Registrar la novedad en Civitas']::text[],
   array['Resolución firmada']::text[],
   array['Novedad a Liquidación de Haberes']::text[], false, 'Notificación electrónica al agente, incorporación al legajo digital y archivo'),
  ('ESC-FIN', 1, 'Control y carga en el sistema de escolaridad', 'BONIF', 'notificacion', 48, null,
   array['Controlar la documentación adjunta', 'Controlar que el certificado corresponda al ciclo lectivo, esté en término y tenga sello y firma del establecimiento', 'Verificar en Civitas que el hijo/a esté registrado/a y que el/la agente perciba la asignación por hijo/a por él/ella (requisito excluyente)', 'Verificar en Civitas que no se haya hecho lugar antes a la misma solicitud', 'Verificar en Civitas que el/la agente tenga «Liquida SÍ» en su legajo y no tenga una baja cargada ni en curso', 'Cargar el certificado en el sistema de escolaridad', 'Registrar la escolaridad en la foja de servicios']::text[],
   array['Formulario', 'Certificado escolar de fin de clases']::text[],
   '{}'::text[], true, 'Notificación electrónica al agente, incorporación al legajo digital y archivo'),
  ('ESC-FIN-EXT', 1, 'Control de documentación', 'BONIF', 'analisis', 48, null,
   array['Controlar la documentación adjunta', 'Controlar que el certificado corresponda al ciclo lectivo y tenga sello y firma del establecimiento', 'Verificar en Civitas que el hijo/a esté registrado/a y que el/la agente perciba la asignación por hijo/a por él/ella (requisito excluyente)', 'Verificar en Civitas que el/la agente tenga «Liquida SÍ» en su legajo y no tenga una baja cargada ni en curso']::text[],
   array['Formulario', 'Certificado escolar de fin de clases']::text[],
   '{}'::text[], true, null),
  ('ESC-FIN-EXT', 2, 'Dictamen', 'DICT', 'dictamen', 48, null,
   array['Controlar la documentación', 'Consultar en Civitas la situación de revista y la foja de servicios del/de la agente (ya no se adjuntan al expediente)', 'Dictaminar sobre la admisión del certificado presentado fuera de término']::text[],
   array['Formulario', 'Certificado escolar de fin de clases']::text[],
   array['Dictamen']::text[], true, null),
  ('ESC-FIN-EXT', 3, 'Proyecto de resolución', 'BONIF', 'resolucion', 24, null,
   array['Revisar el dictamen', 'Preparar el proyecto de resolución en el sentido del dictamen']::text[],
   array['Dictamen', 'Formulario', 'Certificado escolar de fin de clases']::text[],
   array['Resolución']::text[], true, null),
  ('ESC-FIN-EXT', 4, 'Control y firma de la resolución', 'DIR', 'firma', 24, null,
   array['Controlar el proyecto y la documentación', 'Firmar la resolución (el número y la fecha se asignan al firmar)']::text[],
   array['Resolución', 'Dictamen', 'Formulario', 'Certificado escolar de fin de clases']::text[],
   array['Resolución firmada']::text[], false, null),
  ('ESC-FIN-EXT', 5, 'Carga en el sistema de escolaridad y cierre', 'BONIF', 'notificacion', 24, null,
   array['Cargar el certificado admitido en el sistema de escolaridad', 'Registrar la escolaridad en la foja de servicios']::text[],
   array['Resolución firmada']::text[],
   '{}'::text[], false, 'Notificación electrónica al agente, incorporación al legajo digital y archivo'),
  ('ESC-INICIO', 1, 'Control y carga en el sistema de escolaridad', 'BONIF', 'notificacion', 48, null,
   array['Controlar la documentación adjunta', 'Controlar que el certificado corresponda al ciclo lectivo, esté en término y tenga sello y firma del establecimiento', 'Verificar en Civitas que el hijo/a esté registrado/a y que el/la agente perciba la asignación por hijo/a por él/ella (requisito excluyente)', 'Verificar en Civitas que no se haya hecho lugar antes a la misma solicitud', 'Verificar en Civitas que el/la agente tenga «Liquida SÍ» en su legajo y no tenga una baja cargada ni en curso', 'Cargar el certificado en el sistema de escolaridad', 'Registrar la escolaridad en la foja de servicios']::text[],
   array['Formulario', 'Certificado escolar de inicio de clases']::text[],
   '{}'::text[], true, 'Notificación electrónica al agente, incorporación al legajo digital y archivo'),
  ('ESC-INICIO-EXT', 1, 'Control de documentación', 'BONIF', 'analisis', 48, null,
   array['Controlar la documentación adjunta', 'Controlar que el certificado corresponda al ciclo lectivo y tenga sello y firma del establecimiento', 'Verificar en Civitas que el hijo/a esté registrado/a y que el/la agente perciba la asignación por hijo/a por él/ella (requisito excluyente)', 'Verificar en Civitas que el/la agente tenga «Liquida SÍ» en su legajo y no tenga una baja cargada ni en curso']::text[],
   array['Formulario', 'Certificado escolar de inicio de clases']::text[],
   '{}'::text[], true, null),
  ('ESC-INICIO-EXT', 2, 'Dictamen', 'DICT', 'dictamen', 48, null,
   array['Controlar la documentación', 'Consultar en Civitas la situación de revista y la foja de servicios del/de la agente (ya no se adjuntan al expediente)', 'Dictaminar sobre la admisión del certificado presentado fuera de término']::text[],
   array['Formulario', 'Certificado escolar de inicio de clases']::text[],
   array['Dictamen']::text[], true, null),
  ('ESC-INICIO-EXT', 3, 'Proyecto de resolución', 'BONIF', 'resolucion', 24, null,
   array['Revisar el dictamen', 'Preparar el proyecto de resolución en el sentido del dictamen']::text[],
   array['Dictamen', 'Formulario', 'Certificado escolar de inicio de clases']::text[],
   array['Resolución']::text[], true, null),
  ('ESC-INICIO-EXT', 4, 'Control y firma de la resolución', 'DIR', 'firma', 24, null,
   array['Controlar el proyecto y la documentación', 'Firmar la resolución (el número y la fecha se asignan al firmar)']::text[],
   array['Resolución', 'Dictamen', 'Formulario', 'Certificado escolar de inicio de clases']::text[],
   array['Resolución firmada']::text[], false, null),
  ('ESC-INICIO-EXT', 5, 'Carga en el sistema de escolaridad y cierre', 'BONIF', 'notificacion', 24, null,
   array['Cargar el certificado admitido en el sistema de escolaridad', 'Registrar la escolaridad en la foja de servicios']::text[],
   array['Resolución firmada']::text[],
   '{}'::text[], false, 'Notificación electrónica al agente, incorporación al legajo digital y archivo'),
  ('ASIG-FAM-NUM', 1, 'Control de documentación y grupo familiar', 'BONIF', 'analisis', 48, null,
   array['Controlar la documentación adjunta', 'Consultar en Civitas el grupo familiar: que sea el tercer hijo/a o más, que ninguno de los tres pase los 21 años y que los mayores de 15 perciban escolaridad', 'Verificar en Civitas que no se haya hecho lugar antes a la misma solicitud', 'Actualizar el grupo familiar en Civitas', 'Verificar en Civitas que el/la agente tenga «Liquida SÍ» en su legajo y no tenga una baja cargada ni en curso']::text[],
   array['Formulario', 'Acta de nacimiento del hijo/a', 'Negativa de ANSES de la madre o del padre']::text[],
   '{}'::text[], true, null),
  ('ASIG-FAM-NUM', 2, 'Dictamen', 'DICT', 'dictamen', 48, null,
   array['Controlar la documentación', 'Consultar en Civitas la situación de revista y la foja de servicios del/de la agente (ya no se adjuntan al expediente)', 'Dictaminar sobre la procedencia de la asignación por familia numerosa']::text[],
   array['Formulario', 'Acta de nacimiento del hijo/a', 'Negativa de ANSES de la madre o del padre']::text[],
   array['Dictamen']::text[], true, null),
  ('ASIG-FAM-NUM', 3, 'Proyecto de resolución', 'BONIF', 'resolucion', 24, null,
   array['Revisar el dictamen', 'Preparar el proyecto de resolución en el sentido del dictamen']::text[],
   array['Dictamen', 'Formulario', 'Acta de nacimiento del hijo/a', 'Negativa de ANSES de la madre o del padre']::text[],
   array['Resolución']::text[], true, null),
  ('ASIG-FAM-NUM', 4, 'Control y firma de la resolución', 'DIR', 'firma', 24, null,
   array['Controlar el proyecto y la documentación', 'Firmar la resolución (el número y la fecha se asignan al firmar)']::text[],
   array['Resolución', 'Dictamen', 'Formulario', 'Acta de nacimiento del hijo/a', 'Negativa de ANSES de la madre o del padre']::text[],
   array['Resolución firmada']::text[], false, null),
  ('ASIG-FAM-NUM', 5, 'Novedad a Liquidación y cierre', 'BONIF', 'liquidacion', 24, null,
   array['Informar la novedad a Liquidación de Haberes', 'Registrar la novedad en Civitas']::text[],
   array['Resolución firmada']::text[],
   array['Novedad a Liquidación de Haberes']::text[], false, 'Notificación electrónica al agente, incorporación al legajo digital y archivo'),
  ('ASIG-HIJO', 1, 'Control de documentación y grupo familiar', 'BONIF', 'analisis', 48, null,
   array['Controlar la documentación adjunta', 'Controlar la negativa de ANSES del otro progenitor', 'Si el hijo/a tiene 15 años o más, controlar el certificado de escolaridad', 'Verificar en Civitas que el hijo/a no esté declarado/a en el grupo familiar o, si lo está, que figure en el ítem Asignación con código A (a cargo) o N (no genera asignación); si ya genera asignación, no corresponde el trámite', 'Actualizar el grupo familiar en Civitas', 'Si con este hijo/a el/la agente llega a tres, indicarle que puede pedir la asignación por familia numerosa', 'Verificar en Civitas que el/la agente tenga «Liquida SÍ» en su legajo y no tenga una baja cargada ni en curso']::text[],
   array['Formulario', 'Acta de nacimiento del hijo/a', 'Negativa de ANSES de la madre o del padre', 'Certificado de escolaridad']::text[],
   '{}'::text[], true, null),
  ('ASIG-HIJO', 2, 'Dictamen', 'DICT', 'dictamen', 48, null,
   array['Controlar la documentación', 'Consultar en Civitas la situación de revista y la foja de servicios del/de la agente (ya no se adjuntan al expediente)', 'Dictaminar sobre la procedencia de la asignación']::text[],
   array['Formulario', 'Acta de nacimiento del hijo/a', 'Negativa de ANSES de la madre o del padre', 'Certificado de escolaridad']::text[],
   array['Dictamen']::text[], true, null),
  ('ASIG-HIJO', 3, 'Proyecto de resolución', 'BONIF', 'resolucion', 24, null,
   array['Revisar el dictamen', 'Preparar el proyecto de resolución en el sentido del dictamen']::text[],
   array['Dictamen', 'Formulario', 'Acta de nacimiento del hijo/a', 'Negativa de ANSES de la madre o del padre', 'Certificado de escolaridad']::text[],
   array['Resolución']::text[], true, null),
  ('ASIG-HIJO', 4, 'Control y firma de la resolución', 'DIR', 'firma', 24, null,
   array['Controlar el proyecto y la documentación', 'Firmar la resolución (el número y la fecha se asignan al firmar)']::text[],
   array['Resolución', 'Dictamen', 'Formulario', 'Acta de nacimiento del hijo/a', 'Negativa de ANSES de la madre o del padre', 'Certificado de escolaridad']::text[],
   array['Resolución firmada']::text[], false, null),
  ('ASIG-HIJO', 5, 'Novedad a Liquidación y cierre', 'BONIF', 'liquidacion', 24, null,
   array['Informar la novedad a Liquidación de Haberes', 'Registrar la novedad en Civitas']::text[],
   array['Resolución firmada']::text[],
   array['Novedad a Liquidación de Haberes']::text[], false, 'Notificación electrónica al agente, incorporación al legajo digital y archivo'),
  ('ASIG-HIJO-DISC', 1, 'Control del CUD y de la documentación', 'MEDLAB', 'analisis', 48, 'En la renovación del CUD Medicina Laboral no interviene: pasar directo al Área Bonificaciones.',
   array['Controlar el Certificado Único de Discapacidad y su vigencia', 'Controlar la veracidad de la documentación adjunta']::text[],
   array['Formulario', 'Certificado Único de Discapacidad (CUD)']::text[],
   '{}'::text[], true, null),
  ('ASIG-HIJO-DISC', 2, 'Control de documentación y grupo familiar', 'BONIF', 'analisis', 48, null,
   array['Controlar la documentación adjunta (el acta de nacimiento, solo en el alta)', 'Verificar en Civitas la fecha de vencimiento del CUD, en caso de corresponder', 'Solo en el alta: verificar en Civitas que el hijo/a no genere ya asignación (código A o N en el ítem Asignación) y que no se haya hecho lugar antes a la misma solicitud', 'Actualizar el grupo familiar en Civitas', 'Verificar en Civitas que el/la agente tenga «Liquida SÍ» en su legajo y no tenga una baja cargada ni en curso']::text[],
   array['Formulario', 'Acta de nacimiento del hijo/a', 'Certificado Único de Discapacidad (CUD)', 'Negativa de ANSES de la madre o del padre']::text[],
   '{}'::text[], true, null),
  ('ASIG-HIJO-DISC', 3, 'Dictamen', 'DICT', 'dictamen', 48, null,
   array['Controlar la documentación', 'Consultar en Civitas la situación de revista y la foja de servicios del/de la agente (ya no se adjuntan al expediente)', 'Dictaminar sobre la procedencia de la asignación']::text[],
   array['Formulario', 'Acta de nacimiento del hijo/a', 'Certificado Único de Discapacidad (CUD)']::text[],
   array['Dictamen']::text[], true, null),
  ('ASIG-HIJO-DISC', 4, 'Proyecto de resolución', 'BONIF', 'resolucion', 24, null,
   array['Revisar el dictamen', 'Preparar el proyecto de resolución en el sentido del dictamen']::text[],
   array['Dictamen', 'Certificado Único de Discapacidad (CUD)']::text[],
   array['Resolución']::text[], true, null),
  ('ASIG-HIJO-DISC', 5, 'Control y firma de la resolución', 'DIR', 'firma', 24, null,
   array['Controlar el proyecto y la documentación', 'Firmar la resolución (el número y la fecha se asignan al firmar)']::text[],
   array['Resolución', 'Dictamen', 'Certificado Único de Discapacidad (CUD)']::text[],
   array['Resolución firmada']::text[], false, null),
  ('ASIG-HIJO-DISC', 6, 'Novedad a Liquidación y cierre', 'BONIF', 'liquidacion', 24, null,
   array['Informar la novedad a Liquidación de Haberes', 'Registrar la novedad en Civitas', 'Registrar el vencimiento del CUD para el aviso de renovación']::text[],
   array['Resolución firmada']::text[],
   array['Novedad a Liquidación de Haberes']::text[], false, 'Notificación electrónica al agente, incorporación al legajo digital y archivo'),
  ('ASIG-MATRIMONIO', 1, 'Control de documentación', 'BONIF', 'analisis', 48, null,
   array['Controlar la documentación adjunta', 'Controlar que se pida dentro del año de la celebración del matrimonio', 'Verificar en Civitas que el/la cónyuge no esté declarado/a en el grupo familiar o, si lo está, que figure en el ítem Asignación con código A (a cargo) o N (no genera asignación); si ya genera asignación, no corresponde el trámite', 'Verificar en Civitas que no se haya hecho lugar antes a la misma solicitud', 'Verificar en Civitas que el/la agente tenga «Liquida SÍ» en su legajo y no tenga una baja cargada ni en curso']::text[],
   array['Formulario', 'Acta de matrimonio']::text[],
   '{}'::text[], true, null),
  ('ASIG-MATRIMONIO', 2, 'Dictamen', 'DICT', 'dictamen', 48, null,
   array['Controlar la documentación', 'Consultar en Civitas la situación de revista y la foja de servicios del/de la agente (ya no se adjuntan al expediente)', 'Dictaminar sobre la procedencia de la asignación']::text[],
   array['Formulario', 'Acta de matrimonio']::text[],
   array['Dictamen']::text[], true, null),
  ('ASIG-MATRIMONIO', 3, 'Proyecto de resolución', 'BONIF', 'resolucion', 24, null,
   array['Revisar el dictamen', 'Preparar el proyecto de resolución en el sentido del dictamen']::text[],
   array['Dictamen', 'Formulario', 'Acta de matrimonio']::text[],
   array['Resolución']::text[], true, null),
  ('ASIG-MATRIMONIO', 4, 'Control y firma de la resolución', 'DIR', 'firma', 24, null,
   array['Controlar el proyecto y la documentación', 'Firmar la resolución (el número y la fecha se asignan al firmar)']::text[],
   array['Resolución', 'Dictamen', 'Formulario', 'Acta de matrimonio']::text[],
   array['Resolución firmada']::text[], false, null),
  ('ASIG-MATRIMONIO', 5, 'Novedad a Liquidación y cierre', 'BONIF', 'liquidacion', 24, null,
   array['Informar la novedad a Liquidación de Haberes', 'Registrar la novedad en Civitas', 'Es pago único: registrar la novedad con un solo período (desde y hasta el mismo mes)']::text[],
   array['Resolución firmada']::text[],
   array['Novedad a Liquidación de Haberes']::text[], false, 'Notificación electrónica al agente, incorporación al legajo digital y archivo'),
  ('ASIG-NACIMIENTO', 1, 'Control de documentación y grupo familiar', 'BONIF', 'analisis', 48, null,
   array['Controlar la documentación adjunta', 'Controlar la negativa de ANSES del otro progenitor', 'Verificar en Civitas que no se haya hecho lugar antes a la misma solicitud', 'Actualizar el grupo familiar en Civitas', 'Si se acompaña CUD, indicar al/a la agente que inicie también la asignación por hijo/a con discapacidad', 'Verificar en Civitas que el/la agente tenga «Liquida SÍ» en su legajo y no tenga una baja cargada ni en curso']::text[],
   array['Formulario', 'Acta de nacimiento del hijo/a', 'Negativa de ANSES de la madre o del padre']::text[],
   '{}'::text[], true, null),
  ('ASIG-NACIMIENTO', 2, 'Dictamen', 'DICT', 'dictamen', 48, null,
   array['Controlar la documentación', 'Consultar en Civitas la situación de revista y la foja de servicios del/de la agente (ya no se adjuntan al expediente)', 'Dictaminar sobre la procedencia de la asignación']::text[],
   array['Formulario', 'Acta de nacimiento del hijo/a', 'Negativa de ANSES de la madre o del padre']::text[],
   array['Dictamen']::text[], true, null),
  ('ASIG-NACIMIENTO', 3, 'Proyecto de resolución', 'BONIF', 'resolucion', 24, null,
   array['Revisar el dictamen', 'Preparar el proyecto de resolución en el sentido del dictamen']::text[],
   array['Dictamen', 'Formulario', 'Acta de nacimiento del hijo/a', 'Negativa de ANSES de la madre o del padre']::text[],
   array['Resolución']::text[], true, null),
  ('ASIG-NACIMIENTO', 4, 'Control y firma de la resolución', 'DIR', 'firma', 24, null,
   array['Controlar el proyecto y la documentación', 'Firmar la resolución (el número y la fecha se asignan al firmar)']::text[],
   array['Resolución', 'Dictamen', 'Formulario', 'Acta de nacimiento del hijo/a', 'Negativa de ANSES de la madre o del padre']::text[],
   array['Resolución firmada']::text[], false, null),
  ('ASIG-NACIMIENTO', 5, 'Novedad a Liquidación y cierre', 'BONIF', 'liquidacion', 24, null,
   array['Informar la novedad a Liquidación de Haberes', 'Registrar la novedad en Civitas', 'Es pago único: registrar la novedad con un solo período (desde y hasta el mismo mes)']::text[],
   array['Resolución firmada']::text[],
   array['Novedad a Liquidación de Haberes']::text[], false, 'Notificación electrónica al agente, incorporación al legajo digital y archivo'),
  ('ASIG-PRENATAL', 1, 'Control de documentación', 'BONIF', 'analisis', 48, null,
   array['Controlar la documentación adjunta', 'Verificar en Civitas que no se haya hecho lugar antes a la misma solicitud', 'Verificar en Civitas que el/la agente tenga «Liquida SÍ» en su legajo y no tenga una baja cargada ni en curso']::text[],
   array['Formulario', 'Certificado médico con fecha probable de parto', 'Ecografía']::text[],
   '{}'::text[], true, null),
  ('ASIG-PRENATAL', 2, 'Entrevista e informe médico', 'MEDLAB', 'analisis', 72, null,
   array['Controlar la documentación médica y su veracidad', 'Entrevistar a la agente', 'Constatar el embarazo y la fecha probable de parto']::text[],
   array['Certificado médico con fecha probable de parto', 'Ecografía']::text[],
   array['Informe de Medicina Laboral']::text[], true, null),
  ('ASIG-PRENATAL', 3, 'Dictamen', 'DICT', 'dictamen', 48, null,
   array['Controlar la documentación', 'Consultar en Civitas la situación de revista y la foja de servicios del/de la agente (ya no se adjuntan al expediente)', 'Dictaminar sobre la procedencia de la asignación prenatal']::text[],
   array['Formulario', 'Certificado médico con fecha probable de parto', 'Ecografía', 'Informe de Medicina Laboral']::text[],
   array['Dictamen']::text[], true, null),
  ('ASIG-PRENATAL', 4, 'Proyecto de resolución', 'BONIF', 'resolucion', 24, null,
   array['Revisar el dictamen', 'Preparar el proyecto de resolución en el sentido del dictamen']::text[],
   array['Dictamen', 'Informe de Medicina Laboral']::text[],
   array['Resolución']::text[], true, null),
  ('ASIG-PRENATAL', 5, 'Control y firma de la resolución', 'DIR', 'firma', 24, null,
   array['Controlar el proyecto y la documentación', 'Firmar la resolución (el número y la fecha se asignan al firmar)']::text[],
   array['Resolución', 'Dictamen', 'Informe de Medicina Laboral']::text[],
   array['Resolución firmada']::text[], false, null),
  ('ASIG-PRENATAL', 6, 'Novedad a Liquidación y cierre', 'BONIF', 'liquidacion', 24, null,
   array['Informar la novedad a Liquidación de Haberes', 'Registrar la novedad en Civitas']::text[],
   array['Resolución firmada']::text[],
   array['Novedad a Liquidación de Haberes']::text[], false, 'Notificación electrónica al agente, incorporación al legajo digital y archivo'),
  ('ASIG-PRENATAL-VARON', 1, 'Control de documentación', 'BONIF', 'analisis', 48, null,
   array['Controlar la documentación adjunta', 'Controlar el vínculo con la madre y su negativa de ANSES', 'Verificar en Civitas que no se haya hecho lugar antes a la misma solicitud', 'Verificar en Civitas que el/la agente tenga «Liquida SÍ» en su legajo y no tenga una baja cargada ni en curso']::text[],
   array['Formulario', 'Certificado médico con fecha probable de parto', 'Ecografía', 'Acta de matrimonio o de unión convivencial', 'Negativa de ANSES de la madre']::text[],
   '{}'::text[], true, null),
  ('ASIG-PRENATAL-VARON', 2, 'Entrevista e informe médico', 'MEDLAB', 'analisis', 72, null,
   array['Controlar la documentación médica y su veracidad', 'Entrevistar a la persona embarazada, si corresponde', 'Constatar el embarazo y la fecha probable de parto']::text[],
   array['Certificado médico con fecha probable de parto', 'Ecografía']::text[],
   array['Informe de Medicina Laboral']::text[], true, null),
  ('ASIG-PRENATAL-VARON', 3, 'Dictamen', 'DICT', 'dictamen', 48, null,
   array['Controlar la documentación', 'Consultar en Civitas la situación de revista y la foja de servicios del/de la agente (ya no se adjuntan al expediente)', 'Dictaminar sobre la procedencia de la asignación prenatal']::text[],
   array['Formulario', 'Certificado médico con fecha probable de parto', 'Ecografía', 'Acta de matrimonio o de unión convivencial', 'Negativa de ANSES de la madre', 'Informe de Medicina Laboral']::text[],
   array['Dictamen']::text[], true, null),
  ('ASIG-PRENATAL-VARON', 4, 'Proyecto de resolución', 'BONIF', 'resolucion', 24, null,
   array['Revisar el dictamen', 'Preparar el proyecto de resolución en el sentido del dictamen']::text[],
   array['Dictamen', 'Informe de Medicina Laboral']::text[],
   array['Resolución']::text[], true, null),
  ('ASIG-PRENATAL-VARON', 5, 'Control y firma de la resolución', 'DIR', 'firma', 24, null,
   array['Controlar el proyecto y la documentación', 'Firmar la resolución (el número y la fecha se asignan al firmar)']::text[],
   array['Resolución', 'Dictamen', 'Informe de Medicina Laboral']::text[],
   array['Resolución firmada']::text[], false, null),
  ('ASIG-PRENATAL-VARON', 6, 'Novedad a Liquidación y cierre', 'BONIF', 'liquidacion', 24, null,
   array['Informar la novedad a Liquidación de Haberes', 'Registrar la novedad en Civitas']::text[],
   array['Resolución firmada']::text[],
   array['Novedad a Liquidación de Haberes']::text[], false, 'Notificación electrónica al agente, incorporación al legajo digital y archivo'),
  ('ASIG-CONYUGE', 1, 'Control de documentación', 'BONIF', 'analisis', 48, null,
   array['Controlar la documentación adjunta', 'Verificar en Civitas que el/la cónyuge no esté declarado/a en el grupo familiar o, si lo está, que figure en el ítem Asignación con código A (a cargo) o N (no genera asignación); si ya genera asignación, no corresponde el trámite', 'Verificar en Civitas que el/la agente tenga «Liquida SÍ» en su legajo y no tenga una baja cargada ni en curso']::text[],
   array['Formulario', 'Acta de matrimonio']::text[],
   '{}'::text[], true, null),
  ('ASIG-CONYUGE', 2, 'Dictamen', 'DICT', 'dictamen', 48, null,
   array['Controlar la documentación', 'Consultar en Civitas la situación de revista y la foja de servicios del/de la agente (ya no se adjuntan al expediente)', 'Dictaminar sobre la procedencia de la asignación']::text[],
   array['Formulario', 'Acta de matrimonio']::text[],
   array['Dictamen']::text[], true, null),
  ('ASIG-CONYUGE', 3, 'Proyecto de resolución', 'BONIF', 'resolucion', 24, null,
   array['Revisar el dictamen', 'Preparar el proyecto de resolución en el sentido del dictamen']::text[],
   array['Dictamen', 'Formulario', 'Acta de matrimonio']::text[],
   array['Resolución']::text[], true, null),
  ('ASIG-CONYUGE', 4, 'Control y firma de la resolución', 'DIR', 'firma', 24, null,
   array['Controlar el proyecto y la documentación', 'Firmar la resolución (el número y la fecha se asignan al firmar)']::text[],
   array['Resolución', 'Dictamen', 'Formulario', 'Acta de matrimonio']::text[],
   array['Resolución firmada']::text[], false, null),
  ('ASIG-CONYUGE', 5, 'Novedad a Liquidación y cierre', 'BONIF', 'liquidacion', 24, null,
   array['Informar la novedad a Liquidación de Haberes', 'Registrar la novedad en Civitas']::text[],
   array['Resolución firmada']::text[],
   array['Novedad a Liquidación de Haberes']::text[], false, 'Notificación electrónica al agente, incorporación al legajo digital y archivo'),
  ('CAMBIO-DOMICILIO', 1, 'Control del recorrido y registro', 'HYS', 'notificacion', 48, null,
   array['Controlar el recorrido marcado en el mapa: que una el domicilio con el lugar de trabajo por un camino razonable', 'Registrar el nuevo domicilio y el recorrido en Civitas', 'Verificar en Civitas que el/la agente tenga «Liquida SÍ» en su legajo y no tenga una baja cargada ni en curso']::text[],
   array['Formulario']::text[],
   '{}'::text[], true, 'Notificación electrónica al agente; el formulario con el recorrido va a su legajo digital'),
  ('LIC-EXAMEN', 1, 'Recepción y control de requisitos', 'MESA', 'recepcion', 8, null,
   '{}'::text[],
   '{}'::text[],
   '{}'::text[], true, null),
  ('LIC-EXAMEN', 2, 'Control de días disponibles', 'LIC', 'analisis', 8, null,
   '{}'::text[],
   '{}'::text[],
   '{}'::text[], true, null),
  ('LIC-EXAMEN', 3, 'Proyecto de resolución', 'DESP', 'resolucion', 8, null,
   '{}'::text[],
   '{}'::text[],
   '{}'::text[], true, null),
  ('LIC-EXAMEN', 4, 'Firma de la resolución', 'DIR', 'firma', 8, null,
   '{}'::text[],
   '{}'::text[],
   '{}'::text[], true, null),
  ('LIC-EXAMEN', 5, 'Notificación y archivo', 'MESA', 'notificacion', 8, null,
   '{}'::text[],
   '{}'::text[],
   '{}'::text[], true, null),
  ('LIC-ENFERMEDAD', 1, 'Control médico, licencia y proyecto de resolución', 'MEDLAB', 'resolucion', 24, null,
   array['Controlar que el aviso haya sido en término (hasta 2 horas después del horario de ingreso; hoy lo controla el encargado de personal de la repartición)', 'Entrevistar al/a la agente con el certificado original', 'Verificar en Civitas que el/la agente tenga realizado el examen preocupacional', 'Encuadrar la licencia (arts. 18, 19 o 23) y controlar los días usados en el año', 'Emitir la licencia médica (Formulario 16) en el sistema de licencias médicas', 'Verificar en Civitas que el/la agente tenga «Liquida SÍ» en su legajo y no tenga una baja cargada ni en curso', 'Preparar el proyecto de resolución']::text[],
   array['Formulario', 'Certificado médico']::text[],
   array['Licencia médica (Formulario 16)', 'Resolución']::text[], true, null),
  ('LIC-ENFERMEDAD', 2, 'Control y firma de la resolución', 'DIR', 'firma', 24, null,
   array['Controlar el proyecto y la documentación', 'Firmar la resolución (el número y la fecha se asignan al firmar)']::text[],
   array['Resolución', 'Licencia médica (Formulario 16)', 'Certificado médico']::text[],
   array['Resolución firmada']::text[], false, null),
  ('LIC-ENFERMEDAD', 3, 'Carga en Civitas y cierre', 'MEDLAB', 'notificacion', 24, null,
   array['Cargar la licencia en Civitas y en la foja de servicios']::text[],
   array['Resolución firmada']::text[],
   '{}'::text[], false, 'Notificación electrónica al agente, incorporación al legajo digital y archivo'),
  ('LIC-ACCIDENTE', 1, 'Control médico, licencia y proyecto de resolución', 'MEDLAB', 'resolucion', 24, null,
   array['Recibir el certificado original para la ficha médica', 'Controlar la denuncia a la ART y, si fue en el trayecto, la denuncia policial', 'Encuadrar la licencia (arts. 28 y 29) y emitir la licencia médica (Formulario 16)', 'Verificar en Civitas que el/la agente tenga «Liquida SÍ» en su legajo y no tenga una baja cargada ni en curso', 'Preparar el proyecto de resolución']::text[],
   array['Formulario', 'Certificado médico']::text[],
   array['Licencia médica (Formulario 16)', 'Resolución']::text[], true, null),
  ('LIC-ACCIDENTE', 2, 'Control y firma de la resolución', 'DIR', 'firma', 24, null,
   array['Controlar el proyecto y la documentación', 'Firmar la resolución (el número y la fecha se asignan al firmar)']::text[],
   array['Resolución', 'Licencia médica (Formulario 16)', 'Certificado médico']::text[],
   array['Resolución firmada']::text[], false, null),
  ('LIC-ACCIDENTE', 3, 'Carga en Civitas y cierre', 'MEDLAB', 'notificacion', 24, null,
   array['Cargar la licencia en Civitas y en la foja de servicios']::text[],
   array['Resolución firmada']::text[],
   '{}'::text[], false, 'Notificación electrónica al agente, incorporación al legajo digital y archivo'),
  ('LIC-FAMILIAR-ENFERMO', 1, 'Control médico e informe', 'MEDLAB', 'analisis', 24, null,
   array['Verificar en Civitas que el familiar esté declarado/a en el grupo familiar', 'Verificar en Civitas que el/la agente tenga «Liquida SÍ» en su legajo y no tenga una baja cargada ni en curso', 'Controlar el certificado médico del familiar y la necesidad de atención personal', 'Informar los días usados en el año (hasta 10 días hábiles)', 'Emitir la licencia médica (Formulario 16)']::text[],
   array['Formulario', 'Certificado médico del familiar', 'Declaración jurada de parentesco y grupo familiar']::text[],
   array['Licencia médica (Formulario 16)', 'Informe de Medicina Laboral']::text[], true, null),
  ('LIC-FAMILIAR-ENFERMO', 2, 'Dictamen', 'DICT', 'dictamen', 48, null,
   array['Controlar la documentación', 'Consultar en Civitas la situación de revista y la foja de servicios del/de la agente (ya no se adjuntan al expediente)', 'Dictaminar sobre la procedencia de la licencia y el cupo de días']::text[],
   array['Formulario', 'Certificado médico del familiar', 'Declaración jurada de parentesco y grupo familiar', 'Informe de Medicina Laboral']::text[],
   array['Dictamen']::text[], true, null),
  ('LIC-FAMILIAR-ENFERMO', 3, 'Proyecto de resolución', 'MEDLAB', 'resolucion', 24, null,
   array['Revisar el dictamen', 'Preparar el proyecto de resolución en el sentido del dictamen']::text[],
   array['Dictamen', 'Informe de Medicina Laboral', 'Licencia médica (Formulario 16)']::text[],
   array['Resolución']::text[], true, null),
  ('LIC-FAMILIAR-ENFERMO', 4, 'Control y firma de la resolución', 'DIR', 'firma', 24, null,
   array['Controlar el proyecto y la documentación', 'Firmar la resolución (el número y la fecha se asignan al firmar)']::text[],
   array['Resolución', 'Dictamen', 'Informe de Medicina Laboral']::text[],
   array['Resolución firmada']::text[], false, null),
  ('LIC-FAMILIAR-ENFERMO', 5, 'Carga en Civitas y cierre', 'MEDLAB', 'notificacion', 24, null,
   array['Cargar la licencia en Civitas y en la foja de servicios', 'Tomar conocimiento del número y la fecha de la resolución']::text[],
   array['Resolución firmada']::text[],
   '{}'::text[], false, 'Notificación electrónica al agente, incorporación al legajo digital y archivo'),
  ('LIC-FAMILIAR-DISC', 1, 'Evaluación e informe médico', 'MEDLAB', 'analisis', 48, null,
   array['Verificar en Civitas que el familiar esté declarado/a en el grupo familiar', 'Verificar en Civitas que el/la agente tenga realizado el examen preocupacional', 'Verificar en Civitas que el/la agente tenga «Liquida SÍ» en su legajo y no tenga una baja cargada ni en curso', 'Controlar la documentación que acredita el parentesco', 'Controlar si el/la agente ya usó este beneficio', 'Evaluar al familiar y encuadrar el pedido (art. 4º; dentro o fuera de la provincia, con o sin goce) e informar con recomendación', 'Controlar el CUD y su vencimiento']::text[],
   array['Formulario', 'Certificado Único de Discapacidad (CUD)', 'Certificado médico', 'Historia clínica y plan de tratamiento']::text[],
   array['Informe de Medicina Laboral']::text[], true, null),
  ('LIC-FAMILIAR-DISC', 2, 'Dictamen', 'DICT', 'dictamen', 48, null,
   array['Controlar la documentación', 'Consultar en Civitas la situación de revista y la foja de servicios del/de la agente (ya no se adjuntan al expediente)', 'Dictaminar sobre la procedencia de la licencia especial']::text[],
   array['Formulario', 'Certificado Único de Discapacidad (CUD)', 'Certificado médico', 'Informe de Medicina Laboral']::text[],
   array['Dictamen']::text[], true, null),
  ('LIC-FAMILIAR-DISC', 3, 'Proyecto, control y firma de la resolución', 'DIR', 'firma', 24, null,
   array['Preparar el proyecto de resolución en el sentido del dictamen', 'Controlar y firmar (el número y la fecha se asignan al firmar)']::text[],
   array['Dictamen', 'Informe de Medicina Laboral', 'Certificado Único de Discapacidad (CUD)']::text[],
   array['Resolución', 'Resolución firmada']::text[], false, null),
  ('LIC-FAMILIAR-DISC', 4, 'Carga en Civitas y cierre', 'MEDLAB', 'notificacion', 24, null,
   array['Cargar la licencia en Civitas y en la foja de servicios', 'Registrar en Civitas el código de la licencia (D14 con goce, D16 sin goce)', 'Incorporar al expediente la documentación respaldatoria del tratamiento que presente el/la agente', 'Indicar al/a la agente que, al terminar la licencia, acredite los tratamientos para la constancia de conclusión']::text[],
   array['Resolución firmada']::text[],
   '{}'::text[], false, 'Notificación electrónica al agente, incorporación al legajo digital y archivo'),
  ('MAT-PREPARTO', 1, 'Control médico, licencia y proyecto de resolución', 'MEDLAB', 'resolucion', 24, null,
   array['Constatar el embarazo y la fecha probable de parto', 'Controlar la antigüedad (más de un mes en el municipio y más de seis meses en los doce anteriores al último empleo)', 'Emitir la licencia médica (Formulario 16)', 'Verificar en Civitas que el/la agente tenga «Liquida SÍ» en su legajo y no tenga una baja cargada ni en curso', 'Preparar el proyecto de resolución']::text[],
   array['Formulario', 'Certificado médico con fecha probable de parto']::text[],
   array['Licencia médica (Formulario 16)', 'Resolución']::text[], true, null),
  ('MAT-PREPARTO', 2, 'Control y firma de la resolución', 'DIR', 'firma', 24, null,
   array['Controlar el proyecto y la documentación', 'Firmar la resolución (el número y la fecha se asignan al firmar)']::text[],
   array['Resolución', 'Licencia médica (Formulario 16)', 'Certificado médico con fecha probable de parto']::text[],
   array['Resolución firmada']::text[], false, null),
  ('MAT-PREPARTO', 3, 'Carga en Civitas y cierre', 'MEDLAB', 'notificacion', 24, null,
   array['Cargar la licencia en Civitas y en la foja de servicios']::text[],
   array['Resolución firmada']::text[],
   '{}'::text[], false, 'Notificación electrónica al agente, incorporación al legajo digital y archivo'),
  ('MAT-POSTPARTO', 1, 'Control médico, licencia y proyecto de resolución', 'MEDLAB', 'resolucion', 24, null,
   array['Controlar el certificado médico, el acta de nacimiento y la resolución de preparto, si la hubo', 'Emitir la licencia médica (Formulario 16)', 'Revisar si la agente pidió la hora de lactancia; si la pidió, indicarle que inicie el permiso de lactancia', 'Verificar en Civitas que el/la agente tenga «Liquida SÍ» en su legajo y no tenga una baja cargada ni en curso', 'Preparar el proyecto de resolución']::text[],
   array['Formulario', 'Certificado médico', 'Acta de nacimiento del hijo/a']::text[],
   array['Licencia médica (Formulario 16)', 'Resolución']::text[], true, null),
  ('MAT-POSTPARTO', 2, 'Control y firma de la resolución', 'DIR', 'firma', 24, null,
   array['Controlar el proyecto y la documentación', 'Firmar la resolución (el número y la fecha se asignan al firmar)']::text[],
   array['Resolución', 'Licencia médica (Formulario 16)', 'Certificado médico', 'Acta de nacimiento del hijo/a']::text[],
   array['Resolución firmada']::text[], false, null),
  ('MAT-POSTPARTO', 3, 'Carga en Civitas y cierre', 'MEDLAB', 'notificacion', 24, null,
   array['Cargar la licencia en Civitas y en la foja de servicios']::text[],
   array['Resolución firmada']::text[],
   '{}'::text[], false, 'Notificación electrónica al agente, incorporación al legajo digital y archivo'),
  ('MAT-LACTANCIA', 1, 'Control médico, licencia y proyecto de resolución', 'MEDLAB', 'resolucion', 24, null,
   array['Controlar las resoluciones de preparto y postparto, y que la agente haya pedido la hora de lactancia', 'Verificar en Civitas que el/la agente tenga «Liquida SÍ» en su legajo y no tenga una baja cargada ni en curso', 'Preparar el proyecto de resolución']::text[],
   array['Formulario']::text[],
   array['Resolución']::text[], true, null),
  ('MAT-LACTANCIA', 2, 'Control y firma de la resolución', 'DIR', 'firma', 24, null,
   array['Controlar el proyecto y la documentación', 'Firmar la resolución (el número y la fecha se asignan al firmar)']::text[],
   array['Resolución']::text[],
   array['Resolución firmada']::text[], false, null),
  ('MAT-LACTANCIA', 3, 'Carga en Civitas y cierre', 'MEDLAB', 'notificacion', 24, null,
   array['Cargar la licencia en Civitas y en la foja de servicios', 'Registrar la reducción horaria por lactancia en Civitas']::text[],
   array['Resolución firmada']::text[],
   '{}'::text[], false, 'Notificación electrónica al agente, incorporación al legajo digital y archivo'),
  ('RECON-BONIF', 1, 'Dictamen sobre el recurso', 'DICT', 'dictamen', 48, null,
   array['Controlar que el recurso esté en término: 8 días hábiles desde la notificación (art. 25 de la OPA: hasta las 2 primeras horas del día hábil siguiente)', 'Revisar el dictamen y la resolución recurridos (expediente de origen) y la documentación nueva', 'Analizar el fondo y dictaminar si se hace lugar o no, con el motivo']::text[],
   array['Formulario']::text[],
   array['Dictamen']::text[], true, null),
  ('RECON-BONIF', 2, 'Proyecto de resolución del recurso', 'BONIF', 'resolucion', 24, null,
   array['Revisar el dictamen', 'Preparar el proyecto de resolución del recurso en el sentido del dictamen']::text[],
   array['Dictamen']::text[],
   array['Resolución']::text[], true, null),
  ('RECON-BONIF', 3, 'Control y firma de la resolución', 'DIR', 'firma', 24, null,
   array['Controlar el proyecto y la documentación', 'Firmar la resolución (el número y la fecha se asignan al firmar)']::text[],
   array['Resolución', 'Dictamen']::text[],
   array['Resolución firmada']::text[], false, null),
  ('RECON-BONIF', 4, 'Novedad a Liquidación (si se hace lugar) y cierre', 'BONIF', 'liquidacion', 24, null,
   array['Tomar conocimiento del número y la fecha de la resolución', 'Si se hace lugar, informar la novedad a Liquidación y registrarla en Civitas', 'Si no se hace lugar, no hay novedad: archivar']::text[],
   array['Resolución firmada']::text[],
   array['Novedad a Liquidación de Haberes']::text[], false, 'Notificación electrónica al agente, incorporación al legajo digital y archivo'),
  ('RECON-MEDLAB', 1, 'Dictamen sobre el recurso', 'DICT', 'dictamen', 48, null,
   array['Controlar que el recurso esté en término: 8 días hábiles desde la notificación (art. 25 de la OPA: hasta las 2 primeras horas del día hábil siguiente)', 'Revisar el dictamen y la resolución recurridos (expediente de origen) y la documentación nueva', 'Analizar el fondo y dictaminar si se hace lugar o no, con el motivo']::text[],
   array['Formulario']::text[],
   array['Dictamen']::text[], true, null),
  ('RECON-MEDLAB', 2, 'Proyecto de resolución del recurso', 'MEDLAB', 'resolucion', 24, null,
   array['Revisar el dictamen', 'Preparar el proyecto de resolución del recurso en el sentido del dictamen']::text[],
   array['Dictamen']::text[],
   array['Resolución']::text[], true, null),
  ('RECON-MEDLAB', 3, 'Control y firma de la resolución', 'DIR', 'firma', 24, null,
   array['Controlar el proyecto y la documentación', 'Firmar la resolución (el número y la fecha se asignan al firmar)']::text[],
   array['Resolución', 'Dictamen']::text[],
   array['Resolución firmada']::text[], false, null),
  ('RECON-MEDLAB', 4, 'Carga en Civitas y cierre', 'MEDLAB', 'notificacion', 24, null,
   array['Cargar la licencia en Civitas y en la foja de servicios', 'Tomar conocimiento del número y la fecha de la resolución', 'Si se hace lugar, cargar lo resuelto en Civitas']::text[],
   array['Resolución firmada']::text[],
   '{}'::text[], false, 'Notificación electrónica al agente, incorporación al legajo digital y archivo')
) as p(codigo, orden, nombre, area, accion, plazo_horas, instrucciones, controles, revisa, genera, permite_subsanacion, destino_final)
join public.tipos_tramite t on t.codigo = p.codigo
join public.areas a on a.codigo = p.area;

-- Modelos (se reemplazan completos)
delete from public.plantillas where tipo_tramite_id in (select id from public.tipos_tramite where codigo in ('BONIF-TIT-SEC', 'BONIF-TIT-TER', 'BONIF-TIT-UNI', 'BAJA-ESTUDIOS', 'BAJA-DIVORCIO', 'BAJA-FALLECIMIENTO', 'BAJA-PARTICULAR', 'ESC-FIN', 'ESC-FIN-EXT', 'ESC-INICIO', 'ESC-INICIO-EXT', 'ASIG-FAM-NUM', 'ASIG-HIJO', 'ASIG-HIJO-DISC', 'ASIG-MATRIMONIO', 'ASIG-NACIMIENTO', 'ASIG-PRENATAL', 'ASIG-PRENATAL-VARON', 'ASIG-CONYUGE', 'CAMBIO-DOMICILIO', 'LIC-EXAMEN', 'LIC-ENFERMEDAD', 'LIC-ACCIDENTE', 'LIC-FAMILIAR-ENFERMO', 'LIC-FAMILIAR-DISC', 'MAT-PREPARTO', 'MAT-POSTPARTO', 'MAT-LACTANCIA', 'RECON-BONIF', 'RECON-MEDLAB'));
insert into public.plantillas (tipo_tramite_id, tipo_documento, nombre, cuerpo, instrucciones_ia)
select t.id, p.tipo::public.tipo_actuacion, p.nombre, p.cuerpo, p.instrucciones
from (values
(
  'BONIF-TIT-SEC', 'dictamen', 'Dictamen sobre adicional por título secundario',
  'Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Asesoría Legal
San Miguel de Tucumán, {{fecha}}

EXPEDIENTE: {{numero_expediente}}
FECHA: {{fecha_expediente}}
DEPENDENCIA: {{dependencia}}
CAUSANTE: {{agente}}, AF {{legajo}}
ASUNTO: PAGO ADICIONAL POR TÍTULO

A la Dirección de Capital Humano
S/D

**DICTAMEN**

Vienen a dictamen los presentes autos por medio de los cuales el/la agente {{agente}}, AF {{legajo}}, dependiente de {{dependencia}}, solicita el pago del adicional por título secundario de "{{titulo_obtenido}}", expedido por {{institucion}}.

Se acompaña la siguiente documentación:
A fs. {{fs}}, solicitud de pago del adicional por título.
A fs. {{fs}}, copia certificada del certificado analítico de estudios secundarios de {{titulo_obtenido}}.
A fs. {{fs}}, verificación del título realizada por {{verificador}}, en fecha {{fecha_verificacion}}.
Según los antecedentes laborales y la situación de revista del/de la agente consultados en el sistema Civitas, revista con fecha de alta el {{fecha_alta}}, {{vinculo_laboral}}.

Las normas legales vigentes que regulan la materia de títulos y su pago, que resultan aplicables al caso son: Decreto N.º 82/77, Decreto N.º 1320/01, el Decreto N.º 143/79, artículo 5, y art. 1 de la Ordenanza N.º 3537/04.

El/la peticionante ha cumplido con los requisitos legales necesarios para acreditar título secundario.

Por lo expuesto, sugiero DISPONER EL PAGO DEL 17,5 % en concepto de adicional por título secundario de {{titulo_obtenido}}, al/a la agente {{agente}}, AF {{legajo}}, dependiente de {{dependencia}}, a partir de {{mes_anio_efecto}}.

Tal es mi dictamen.',
  'El dictamen no lleva número. {{fecha}} es la fecha de hoy. Las referencias "A fs." tomalas de la numeración de fojas del expediente; la planta, el vínculo y la fecha de alta salen de la consulta de Civitas (si no están en el expediente, [COMPLETAR]). Si la documentación no alcanza para hacer lugar, no lo aconsejes: señalá qué falta. Concordá el género (el/la agente) con los datos del agente. El adicional rige a partir del mes de la solicitud (fecha del expediente). Si se acompaña un título de posgrado, no se paga: indicá que deberá registrarse en los antecedentes laborales del/de la agente y agregarse la copia al legajo. El porcentaje es 17,5 % de la categoría de revista.'
),
(
  'BONIF-TIT-SEC', 'resolucion', 'Resolución de adicional por título secundario',
  'RESOLUCIÓN N.º {{numero_resolucion}}
Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Área Bonificaciones
San Miguel de Tucumán, {{fecha_resolucion}}

**VISTO:**
El Expediente N.º {{numero_expediente}}, de fecha {{fecha_expediente}}, por el cual el/la agente {{agente}}, afiliado/a N.º {{legajo}}, categoría {{categoria}}, dependiente de {{dependencia}}, y con prestación de servicios en {{reparticion}}, solicita el pago del adicional por Título Secundario de {{titulo_obtenido}}; y

**CONSIDERANDO:**
Que a fs. {{fs}}, obra solicitud de pago del adicional por título efectuada por el/la agente;
Que a fs. {{fs}}, obra copia certificada del certificado analítico de estudios secundarios de {{titulo_obtenido}} a favor del/de la agente, expedido por {{institucion}};
Que a fs. {{fs}}, el Área Bonificaciones de esta Dirección deja constancia de la verificación de su autenticidad;
Que se consultaron en el sistema Civitas la foja de servicios y la situación de revista del/de la agente;
Que a fs. {{fs}}, obra dictamen de Asesoría Letrada de la Dirección de Capital Humano, aconsejando hacer lugar al pago del adicional por Título Secundario;

Por lo expuesto, y en virtud de lo establecido por los Decretos N.º 82/77, 23/81, 1320/01, 143/79, Art. 5º, y Ordenanza N.º 3537/04;

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** Hacer lugar al pedido de pago del adicional por título y otorgar al/a la agente {{agente}}, afiliado/a N.º {{legajo}}, el pago del adicional por Título Secundario de {{titulo_obtenido}}, con porcentaje del 17,5 % de la categoría de revista, a partir de {{mes_anio_efecto}}, por los motivos expresados en los considerandos que anteceden.

**Artículo 2º:** Registrar la presente Resolución en el Registro de Resoluciones de la Dirección de Capital Humano.

**Artículo 3º:** Notificar al/a la agente por medio del sistema de expedientes electrónicos, con constancia de fecha en el expediente. Notificado/a, archívese.',
  'Las referencias "a fs." tomalas de la numeración de fojas del expediente. Si el sentido indicado es NO hacer lugar, el Artículo 1º dice "No hacer lugar al pedido..." con los fundamentos del dictamen, y se omite el porcentaje o la fecha de efecto. Concordá el género (el/la agente) con los datos del agente. El adicional rige a partir del mes de la solicitud salvo que el dictamen diga otra cosa. El porcentaje es 17,5 % de la categoría de revista.'
),
(
  'BONIF-TIT-TER', 'dictamen', 'Dictamen sobre adicional por título terciario',
  'Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Asesoría Legal
San Miguel de Tucumán, {{fecha}}

EXPEDIENTE: {{numero_expediente}}
FECHA: {{fecha_expediente}}
DEPENDENCIA: {{dependencia}}
CAUSANTE: {{agente}}, AF {{legajo}}
ASUNTO: PAGO ADICIONAL POR TÍTULO

A la Dirección de Capital Humano
S/D

**DICTAMEN**

Vienen a dictamen los presentes autos por medio de los cuales el/la agente {{agente}}, AF {{legajo}}, dependiente de {{dependencia}}, solicita el pago del adicional por título terciario de "{{titulo_obtenido}}", expedido por {{institucion}}.

Se acompaña la siguiente documentación:
A fs. {{fs}}, solicitud de pago del adicional por título.
A fs. {{fs}}, copia certificada del certificado analítico y del diploma de {{titulo_obtenido}}.
A fs. {{fs}}, verificación del título realizada por {{verificador}}, en fecha {{fecha_verificacion}}.
Según los antecedentes laborales y la situación de revista del/de la agente consultados en el sistema Civitas, revista con fecha de alta el {{fecha_alta}}, {{vinculo_laboral}}.

Las normas legales vigentes que regulan la materia de títulos y su pago, que resultan aplicables al caso son: Decreto N.º 82/77, Decreto N.º 1320/01, el Decreto N.º 143/79, artículo 5, y art. 1 de la Ordenanza N.º 3537/04.

El/la peticionante ha cumplido con los requisitos legales necesarios para acreditar título terciario de {{duracion}} años de duración.

Por lo expuesto, sugiero DISPONER EL PAGO DEL {{porcentaje}} en concepto de adicional por título terciario de {{titulo_obtenido}}, al/a la agente {{agente}}, AF {{legajo}}, dependiente de {{dependencia}}, a partir de {{mes_anio_efecto}}.

Tal es mi dictamen.',
  'El dictamen no lleva número. {{fecha}} es la fecha de hoy. Las referencias "A fs." tomalas de la numeración de fojas del expediente; la planta, el vínculo y la fecha de alta salen de la consulta de Civitas (si no están en el expediente, [COMPLETAR]). Si la documentación no alcanza para hacer lugar, no lo aconsejes: señalá qué falta. Concordá el género (el/la agente) con los datos del agente. El adicional rige a partir del mes de la solicitud (fecha del expediente). Si se acompaña un título de posgrado, no se paga: indicá que deberá registrarse en los antecedentes laborales del/de la agente y agregarse la copia al legajo. El porcentaje del título terciario no está definido: dejá [COMPLETAR: porcentaje] si no surge de la normativa cargada.'
),
(
  'BONIF-TIT-TER', 'resolucion', 'Resolución de adicional por título terciario',
  'RESOLUCIÓN N.º {{numero_resolucion}}
Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Área Bonificaciones
San Miguel de Tucumán, {{fecha_resolucion}}

**VISTO:**
El Expediente N.º {{numero_expediente}}, de fecha {{fecha_expediente}}, por el cual el/la agente {{agente}}, afiliado/a N.º {{legajo}}, categoría {{categoria}}, dependiente de {{dependencia}}, y con prestación de servicios en {{reparticion}}, solicita el pago del adicional por Título Terciario de {{titulo_obtenido}}; y

**CONSIDERANDO:**
Que a fs. {{fs}}, obra solicitud de pago del adicional por título efectuada por el/la agente;
Que a fs. {{fs}}, obra copia certificada del certificado analítico y del diploma de {{titulo_obtenido}} a favor del/de la agente, expedido por {{institucion}};
Que a fs. {{fs}}, el Área Bonificaciones de esta Dirección deja constancia de la verificación de su autenticidad;
Que se consultaron en el sistema Civitas la foja de servicios y la situación de revista del/de la agente;
Que a fs. {{fs}}, obra dictamen de Asesoría Letrada de la Dirección de Capital Humano, aconsejando hacer lugar al pago del adicional por Título Terciario;

Por lo expuesto, y en virtud de lo establecido por los Decretos N.º 82/77, 23/81, 1320/01, 143/79, Art. 5º, y Ordenanza N.º 3537/04;

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** Hacer lugar al pedido de pago del adicional por título y otorgar al/a la agente {{agente}}, afiliado/a N.º {{legajo}}, el pago del adicional por Título Terciario de {{titulo_obtenido}}, con duración de {{duracion}} años, con porcentaje del {{porcentaje}} de la categoría de revista, a partir de {{mes_anio_efecto}}, por los motivos expresados en los considerandos que anteceden.

**Artículo 2º:** Registrar la presente Resolución en el Registro de Resoluciones de la Dirección de Capital Humano.

**Artículo 3º:** Notificar al/a la agente por medio del sistema de expedientes electrónicos, con constancia de fecha en el expediente. Notificado/a, archívese.',
  'Las referencias "a fs." tomalas de la numeración de fojas del expediente. Si el sentido indicado es NO hacer lugar, el Artículo 1º dice "No hacer lugar al pedido..." con los fundamentos del dictamen, y se omite el porcentaje o la fecha de efecto. Concordá el género (el/la agente) con los datos del agente. El adicional rige a partir del mes de la solicitud salvo que el dictamen diga otra cosa. El porcentaje del título terciario no está definido: dejá [COMPLETAR: porcentaje] si no surge de la normativa cargada.'
),
(
  'BONIF-TIT-UNI', 'dictamen', 'Dictamen sobre adicional por título universitario',
  'Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Asesoría Legal
San Miguel de Tucumán, {{fecha}}

EXPEDIENTE: {{numero_expediente}}
FECHA: {{fecha_expediente}}
DEPENDENCIA: {{dependencia}}
CAUSANTE: {{agente}}, AF {{legajo}}
ASUNTO: PAGO ADICIONAL POR TÍTULO

A la Dirección de Capital Humano
S/D

**DICTAMEN**

Vienen a dictamen los presentes autos por medio de los cuales el/la agente {{agente}}, AF {{legajo}}, dependiente de {{dependencia}}, solicita el pago del adicional por título universitario de "{{titulo_obtenido}}", expedido por {{institucion}}.

Se acompaña la siguiente documentación:
A fs. {{fs}}, solicitud de pago del adicional por título.
A fs. {{fs}}, copia certificada del diploma universitario de {{titulo_obtenido}}.
A fs. {{fs}}, verificación del título realizada por {{verificador}}, en fecha {{fecha_verificacion}}.
Según los antecedentes laborales y la situación de revista del/de la agente consultados en el sistema Civitas, revista con fecha de alta el {{fecha_alta}}, {{vinculo_laboral}}.

Las normas legales vigentes que regulan la materia de títulos y su pago, que resultan aplicables al caso son: Decreto N.º 82/77, Decreto N.º 1320/01, el Decreto N.º 143/79, artículo 5, y art. 1 de la Ordenanza N.º 3537/04.

El/la peticionante ha cumplido con los requisitos legales necesarios para acreditar título universitario de {{duracion}} años de duración.

Por lo expuesto, sugiero DISPONER EL PAGO DEL {{porcentaje}} en concepto de adicional por título universitario de {{titulo_obtenido}}, al/a la agente {{agente}}, AF {{legajo}}, dependiente de {{dependencia}}, a partir de {{mes_anio_efecto}}.

Tal es mi dictamen.',
  'El dictamen no lleva número. {{fecha}} es la fecha de hoy. Las referencias "A fs." tomalas de la numeración de fojas del expediente; la planta, el vínculo y la fecha de alta salen de la consulta de Civitas (si no están en el expediente, [COMPLETAR]). Si la documentación no alcanza para hacer lugar, no lo aconsejes: señalá qué falta. Concordá el género (el/la agente) con los datos del agente. El adicional rige a partir del mes de la solicitud (fecha del expediente). Si se acompaña un título de posgrado, no se paga: indicá que deberá registrarse en los antecedentes laborales del/de la agente y agregarse la copia al legajo. El porcentaje es 50 % de la categoría de revista para títulos de grado de 5 años de duración; para otra duración, dejá [COMPLETAR: porcentaje].'
),
(
  'BONIF-TIT-UNI', 'resolucion', 'Resolución de adicional por título universitario',
  'RESOLUCIÓN N.º {{numero_resolucion}}
Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Área Bonificaciones
San Miguel de Tucumán, {{fecha_resolucion}}

**VISTO:**
El Expediente N.º {{numero_expediente}}, de fecha {{fecha_expediente}}, por el cual el/la agente {{agente}}, afiliado/a N.º {{legajo}}, categoría {{categoria}}, dependiente de {{dependencia}}, y con prestación de servicios en {{reparticion}}, solicita el pago del adicional por Título Universitario de {{titulo_obtenido}}; y

**CONSIDERANDO:**
Que a fs. {{fs}}, obra solicitud de pago del adicional por título efectuada por el/la agente;
Que a fs. {{fs}}, obra copia certificada del diploma universitario de {{titulo_obtenido}} a favor del/de la agente, expedido por {{institucion}};
Que a fs. {{fs}}, el Área Bonificaciones de esta Dirección deja constancia de la verificación de su autenticidad;
Que se consultaron en el sistema Civitas la foja de servicios y la situación de revista del/de la agente;
Que a fs. {{fs}}, obra dictamen de Asesoría Letrada de la Dirección de Capital Humano, aconsejando hacer lugar al pago del adicional por Título Universitario;

Por lo expuesto, y en virtud de lo establecido por los Decretos N.º 82/77, 23/81, 1320/01, 143/79, Art. 5º, y Ordenanza N.º 3537/04;

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** Hacer lugar al pedido de pago del adicional por título y otorgar al/a la agente {{agente}}, afiliado/a N.º {{legajo}}, el pago del adicional por Título Universitario de {{titulo_obtenido}}, con duración de {{duracion}} años, con porcentaje del {{porcentaje}} de la categoría de revista, a partir de {{mes_anio_efecto}}, por los motivos expresados en los considerandos que anteceden.

**Artículo 2º:** Registrar la presente Resolución en el Registro de Resoluciones de la Dirección de Capital Humano.

**Artículo 3º:** Notificar al/a la agente por medio del sistema de expedientes electrónicos, con constancia de fecha en el expediente. Notificado/a, archívese.',
  'Las referencias "a fs." tomalas de la numeración de fojas del expediente. Si el sentido indicado es NO hacer lugar, el Artículo 1º dice "No hacer lugar al pedido..." con los fundamentos del dictamen, y se omite el porcentaje o la fecha de efecto. Concordá el género (el/la agente) con los datos del agente. El adicional rige a partir del mes de la solicitud salvo que el dictamen diga otra cosa. El porcentaje es 50 % de la categoría de revista para títulos de grado de 5 años de duración; para otra duración, dejá [COMPLETAR: porcentaje].'
),
(
  'BAJA-ESTUDIOS', 'resolucion', 'Resolución de baja de asignación por hijo/a (interrupción de estudios)',
  'RESOLUCIÓN N.º {{numero_resolucion}}
Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Área Bonificaciones
San Miguel de Tucumán, {{fecha_resolucion}}

**VISTO:**
El Expediente N.º {{numero_expediente}}, de fecha {{fecha_expediente}}, por el cual el/la agente {{agente}}, afiliado/a N.º {{legajo}}, dependiente de {{dependencia}}, y con prestación de servicios en {{reparticion}}, solicita el cese del pago de la asignación familiar por hijo/a, por interrupción de estudios; y

**CONSIDERANDO:**
Que a fs. {{fs}}, obra la solicitud de baja de la asignación familiar del/de la agente;
Que a fs. {{fs}}, obra certificado de estudios y, en su caso, formulario N.º 9.1 de declaración jurada de interrupción de estudios, en relación a {{familiar}}, DNI {{dni_familiar}};
Que se consultaron en el sistema Civitas la foja de servicios y la situación de revista del/de la agente;
Que a fs. {{fs}}, obra dictamen de Asesoría Letrada de la Dirección de Capital Humano, aconsejando hacer lugar al pedido de baja de la asignación por hijo/a, por interrupción de estudios, a partir de {{mes_anio_cese}};

Por lo expuesto y en ejercicio de la competencia que le acuerda el Decreto N.º 143/G/79, artículo 2º;

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** Hacer lugar al pedido y disponer el cese del pago de la asignación familiar por hijo/a, por interrupción de estudios en relación a {{familiar}}, DNI {{dni_familiar}}, a partir de {{mes_anio_cese}}, al/a la agente {{agente}}, afiliado/a N.º {{legajo}}, conforme a lo citado en los considerandos que anteceden.

**Artículo 2º:** Registrar la presente Resolución en el Registro de Resoluciones de la Dirección de Capital Humano.

**Artículo 3º:** Notificar al/a la agente por medio del sistema de expedientes electrónicos, con constancia de fecha en el expediente. Notificado/a, archívese.',
  'Las referencias "a fs." tomalas de la numeración de fojas del expediente. Si el sentido indicado es NO hacer lugar, el Artículo 1º dice "No hacer lugar al pedido..." con los fundamentos del dictamen, y se omite el porcentaje o la fecha de efecto. Concordá el género (el/la agente) con los datos del agente. Si el dictamen aconseja también la baja de la asignación por escolaridad, incluila en el Artículo 1º; si no lo dice, marcá [REVISAR: ¿corresponde también la baja por escolaridad?].'
),
(
  'BAJA-DIVORCIO', 'resolucion', 'Resolución de baja de asignación por cónyuge (divorcio)',
  'RESOLUCIÓN N.º {{numero_resolucion}}
Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Área Bonificaciones
San Miguel de Tucumán, {{fecha_resolucion}}

**VISTO:**
El Expediente N.º {{numero_expediente}}, de fecha {{fecha_expediente}}, por el cual el/la agente {{agente}}, afiliado/a N.º {{legajo}}, dependiente de {{dependencia}}, y con prestación de servicios en {{reparticion}}, solicita el cese del pago de la asignación familiar por cónyuge; y

**CONSIDERANDO:**
Que a fs. {{fs}}, obra la solicitud de baja de la asignación familiar del/de la agente;
Que a fs. {{fs}}, obra acta de matrimonio con la anotación de la sentencia de divorcio, o la sentencia judicial de divorcio, de fecha {{fecha_divorcio}}, en relación a {{familiar}}, DNI {{dni_familiar}};
Que se consultaron en el sistema Civitas la foja de servicios y la situación de revista del/de la agente;
Que a fs. {{fs}}, obra dictamen de Asesoría Letrada de la Dirección de Capital Humano, aconsejando hacer lugar al pedido de baja de la asignación por cónyuge, a partir de {{mes_anio_cese}};

Por lo expuesto y en ejercicio de la competencia que le acuerda el Decreto N.º 143/G/79, artículo 2º;

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** Hacer lugar al pedido y disponer el cese del pago de la asignación familiar por cónyuge en relación a {{familiar}}, DNI {{dni_familiar}}, a partir de {{mes_anio_cese}}, al/a la agente {{agente}}, afiliado/a N.º {{legajo}}, conforme a lo citado en los considerandos que anteceden.

**Artículo 2º:** Registrar la presente Resolución en el Registro de Resoluciones de la Dirección de Capital Humano.

**Artículo 3º:** Notificar al/a la agente por medio del sistema de expedientes electrónicos, con constancia de fecha en el expediente. Notificado/a, archívese.',
  'Las referencias "a fs." tomalas de la numeración de fojas del expediente. Si el sentido indicado es NO hacer lugar, el Artículo 1º dice "No hacer lugar al pedido..." con los fundamentos del dictamen, y se omite el porcentaje o la fecha de efecto. Concordá el género (el/la agente) con los datos del agente. El cese rige desde el mes que indique el dictamen (en general, el de la sentencia de divorcio); si es anterior al pedido, señalá con [REVISAR: períodos liquidados después del divorcio] para que el área defina el tratamiento.'
),
(
  'BAJA-FALLECIMIENTO', 'resolucion', 'Resolución de baja de asignación por fallecimiento',
  'RESOLUCIÓN N.º {{numero_resolucion}}
Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Área Bonificaciones
San Miguel de Tucumán, {{fecha_resolucion}}

**VISTO:**
El Expediente N.º {{numero_expediente}}, de fecha {{fecha_expediente}}, por el cual el/la agente {{agente}}, afiliado/a N.º {{legajo}}, dependiente de {{dependencia}}, y con prestación de servicios en {{reparticion}}, solicita el cese del pago de la asignación familiar por {{vinculo}}; y

**CONSIDERANDO:**
Que a fs. {{fs}}, obra la solicitud de baja de la asignación familiar del/de la agente;
Que a fs. {{fs}}, obra acta de defunción en relación a {{familiar}}, DNI {{dni_familiar}}, fallecido/a el {{fecha_fallecimiento}};
Que se consultaron en el sistema Civitas la foja de servicios y la situación de revista del/de la agente;
Que a fs. {{fs}}, obra dictamen de Asesoría Letrada de la Dirección de Capital Humano, aconsejando hacer lugar al pedido de baja de la asignación por {{vinculo}}, a partir de {{mes_anio_cese}};

Por lo expuesto y en ejercicio de la competencia que le acuerda el Decreto N.º 143/G/79, artículo 2º;

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** Hacer lugar al pedido y disponer el cese del pago de la asignación familiar por {{vinculo}} en relación a {{familiar}}, DNI {{dni_familiar}}, a partir de {{mes_anio_cese}}, al/a la agente {{agente}}, afiliado/a N.º {{legajo}}, conforme a lo citado en los considerandos que anteceden.

**Artículo 2º:** Registrar la presente Resolución en el Registro de Resoluciones de la Dirección de Capital Humano.

**Artículo 3º:** Notificar al/a la agente por medio del sistema de expedientes electrónicos, con constancia de fecha en el expediente. Notificado/a, archívese.',
  'Las referencias "a fs." tomalas de la numeración de fojas del expediente. Si el sentido indicado es NO hacer lugar, el Artículo 1º dice "No hacer lugar al pedido..." con los fundamentos del dictamen, y se omite el porcentaje o la fecha de efecto. Concordá el género (el/la agente) con los datos del agente. El vínculo (cónyuge o hijo/a) sale del formulario. El cese rige desde el mes del fallecimiento: indicá la fecha de fallecimiento en el Artículo 1º. No transcribas la causa de muerte aunque figure en el acta.'
),
(
  'BAJA-PARTICULAR', 'resolucion', 'Resolución de baja de asignación por hijo/a por motivos particulares',
  'RESOLUCIÓN N.º {{numero_resolucion}}
Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Área Bonificaciones
San Miguel de Tucumán, {{fecha_resolucion}}

**VISTO:**
El Expediente N.º {{numero_expediente}}, de fecha {{fecha_expediente}}, por el cual el/la agente {{agente}}, afiliado/a N.º {{legajo}}, dependiente de {{dependencia}}, y con prestación de servicios en {{reparticion}}, solicita el cese del pago de la asignación familiar por hijo/a; y

**CONSIDERANDO:**
Que a fs. {{fs}}, obra la solicitud de baja de la asignación familiar del/de la agente;
Que a fs. {{fs}}, obra la manifestación del/de la agente sobre los motivos particulares de la baja, en relación a {{familiar}}, DNI {{dni_familiar}};
Que se consultaron en el sistema Civitas la foja de servicios y la situación de revista del/de la agente;
Que a fs. {{fs}}, obra dictamen de Asesoría Letrada de la Dirección de Capital Humano, aconsejando hacer lugar al pedido de baja de la asignación por hijo/a, a partir de {{mes_anio_cese}};

Por lo expuesto y en ejercicio de la competencia que le acuerda el Decreto N.º 143/G/79, artículo 2º;

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** Hacer lugar al pedido y disponer el cese del pago de la asignación familiar por hijo/a en relación a {{familiar}}, DNI {{dni_familiar}}, a partir de {{mes_anio_cese}}, al/a la agente {{agente}}, afiliado/a N.º {{legajo}}, conforme a lo citado en los considerandos que anteceden.

**Artículo 2º:** Registrar la presente Resolución en el Registro de Resoluciones de la Dirección de Capital Humano.

**Artículo 3º:** Notificar al/a la agente por medio del sistema de expedientes electrónicos, con constancia de fecha en el expediente. Notificado/a, archívese.',
  'Las referencias "a fs." tomalas de la numeración de fojas del expediente. Si el sentido indicado es NO hacer lugar, el Artículo 1º dice "No hacer lugar al pedido..." con los fundamentos del dictamen, y se omite el porcentaje o la fecha de efecto. Concordá el género (el/la agente) con los datos del agente. El motivo sale del formulario. Sin modelo del área: validar.'
),
(
  'ESC-FIN-EXT', 'resolucion', 'Resolución de certificado de fin de clases fuera de término',
  'RESOLUCIÓN N.º {{numero_resolucion}}
Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Área Bonificaciones
San Miguel de Tucumán, {{fecha_resolucion}}

**VISTO:**
El Expediente N.º {{numero_expediente}}, de fecha {{fecha_expediente}}, por el cual el/la agente {{agente}}, afiliado/a N.º {{legajo}}, dependiente de {{dependencia}}, presenta en forma extemporánea el certificado escolar de finalización de clases del ciclo lectivo {{ciclo_lectivo}}; y

**CONSIDERANDO:**
Que a fs. {{fs}}, obra el pedido del/de la agente, solicitando admitir CFC/{{ciclo_lectivo}};
Que a fs. {{fs}}, obra certificado de finalización de clases correspondiente al ciclo lectivo {{ciclo_lectivo}}, perteneciente a {{hijos}}, hijos/as del/de la agente;
Que se consultó en el sistema Civitas la situación de revista del/de la agente;
Que a fs. {{fs}}, obra dictamen de Asesoría Letrada de la Dirección de Capital Humano, indicando admitir la carga extemporánea del certificado de finalización de clases {{ciclo_lectivo}}, presentado por el/la agente;

Por ello y en uso de las facultades conferidas en el Anexo III del Decreto N.º 2118/SG/04 y su ampliatorio Decreto N.º 2683/SEH/08;

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** Hacer lugar al pedido y admitir el certificado escolar de finalización de clases del ciclo lectivo {{ciclo_lectivo}}, presentado extemporáneamente por el/la agente {{agente}}, afiliado/a N.º {{legajo}}, perteneciente a {{hijos}}, y liquidar a favor del/de la agente la asignación familiar por escolaridad {{nivel_escolaridad}}, en atención a las razones invocadas en los considerandos que anteceden.

**Artículo 2º:** Registrar la presente Resolución en el Registro de Resoluciones de la Dirección de Capital Humano.

**Artículo 3º:** Notificar al/a la agente por medio del sistema de expedientes electrónicos, con constancia de fecha en el expediente. Notificado/a, archívese.',
  'Las referencias "a fs." tomalas de la numeración de fojas del expediente. Si el sentido indicado es NO hacer lugar, el Artículo 1º dice "No hacer lugar al pedido..." con los fundamentos del dictamen, y se omite el porcentaje o la fecha de efecto. Concordá el género (el/la agente) con los datos del agente. En {{hijos}} poné, para cada hijo/a, "[apellido y nombre], DNI [dni], nacido/a el [fecha], con asistencia a [grado o año] [nivel]", unidos con "y". {{nivel_escolaridad}} es "primaria" o "media" según el nivel (si hay de los dos, "primaria y media"). Si el dictamen indica desde qué mes se liquida, agregá "a partir de [mes y año]" al final del Artículo 1º; si no, marcá [REVISAR: desde qué mes se liquida].'
),
(
  'ESC-INICIO-EXT', 'resolucion', 'Resolución de certificado de inicio de clases fuera de término',
  'RESOLUCIÓN N.º {{numero_resolucion}}
Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Área Bonificaciones
San Miguel de Tucumán, {{fecha_resolucion}}

**VISTO:**
El Expediente N.º {{numero_expediente}}, de fecha {{fecha_expediente}}, por el cual el/la agente {{agente}}, afiliado/a N.º {{legajo}}, dependiente de {{dependencia}}, presenta en forma extemporánea el certificado escolar de inicio de clases del ciclo lectivo {{ciclo_lectivo}}; y

**CONSIDERANDO:**
Que a fs. {{fs}}, obra el pedido del/de la agente, solicitando admitir CIC/{{ciclo_lectivo}};
Que a fs. {{fs}}, obra certificado de inicio de clases correspondiente al ciclo lectivo {{ciclo_lectivo}}, perteneciente a {{hijos}}, hijos/as del/de la agente;
Que se consultó en el sistema Civitas la situación de revista del/de la agente;
Que a fs. {{fs}}, obra dictamen de Asesoría Letrada de la Dirección de Capital Humano, indicando admitir la carga extemporánea del certificado de inicio de clases {{ciclo_lectivo}}, presentado por el/la agente;

Por ello y en uso de las facultades conferidas en el Anexo III del Decreto N.º 2118/SG/04 y su ampliatorio Decreto N.º 2683/SEH/08;

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** Hacer lugar al pedido y admitir el certificado escolar de inicio de clases del ciclo lectivo {{ciclo_lectivo}}, presentado extemporáneamente por el/la agente {{agente}}, afiliado/a N.º {{legajo}}, perteneciente a {{hijos}}, y liquidar a favor del/de la agente la asignación familiar por escolaridad {{nivel_escolaridad}}, en atención a las razones invocadas en los considerandos que anteceden.

**Artículo 2º:** Registrar la presente Resolución en el Registro de Resoluciones de la Dirección de Capital Humano.

**Artículo 3º:** Notificar al/a la agente por medio del sistema de expedientes electrónicos, con constancia de fecha en el expediente. Notificado/a, archívese.',
  'Las referencias "a fs." tomalas de la numeración de fojas del expediente. Si el sentido indicado es NO hacer lugar, el Artículo 1º dice "No hacer lugar al pedido..." con los fundamentos del dictamen, y se omite el porcentaje o la fecha de efecto. Concordá el género (el/la agente) con los datos del agente. En {{hijos}} poné, para cada hijo/a, "[apellido y nombre], DNI [dni], nacido/a el [fecha], con asistencia a [grado o año] [nivel]", unidos con "y". {{nivel_escolaridad}} es "primaria" o "media" según el nivel (si hay de los dos, "primaria y media"). Si el dictamen indica desde qué mes se liquida, agregá "a partir de [mes y año]" al final del Artículo 1º; si no, marcá [REVISAR: desde qué mes se liquida].'
),
(
  'ASIG-FAM-NUM', 'dictamen', 'Dictamen sobre asignación por familia numerosa',
  'Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Asesoría Legal
San Miguel de Tucumán, {{fecha}}

EXPEDIENTE: {{numero_expediente}}
FECHA: {{fecha_expediente}}
DEPENDENCIA: {{dependencia}}
CAUSANTE: {{agente}}, AF {{legajo}}
ASUNTO: PAGO DE ASIGNACIÓN FAMILIAR

A la Dirección de Capital Humano
S/D

**DICTAMEN**

Vienen las presentes actuaciones a este servicio jurídico, por medio de las cuales el/la agente {{agente}}, afiliado/a N.º {{legajo}}, dependiente de {{dependencia}}, inicia expediente por pago de asignación familiar por familia numerosa.

Documentación obrante en el expediente y normativa aplicable.-
A fs. {{fs}}, obra la solicitud de pago de asignación familiar;
A fs. {{fs}}, obra consulta del grupo familiar en el sistema Civitas respecto de los hijos/as del/de la agente;
A fs. {{fs}}, obra copia del acta de nacimiento expedida y certificada por el Registro de Estado Civil y Capacidad de las Personas, correspondiente a {{familiar}}, DNI {{dni_familiar}}, nacido/a el {{fecha_nacimiento}};
Según los antecedentes laborales y la situación de revista del/de la agente consultados en el sistema Civitas, revista en planta {{planta}}, con fecha de alta el {{fecha_alta}}, dependiente de {{dependencia}}.

La normativa vigente que regula el caso planteado es, a saber: la Ordenanza N.º 546/75, artículos N.º 2, 6 y 8, y el Decreto Reglamentario N.º 584/75, artículos N.º 3, 5, 7 y 15, respecto del pago de asignación familiar por familia numerosa.

Análisis.-
Entrando a analizar los presentes autos bajo la normativa vigente, resulta que respecto de la asignación por familia numerosa, de la consulta del grupo familiar en Civitas (fs. {{fs}}) surge que el/la agente tiene a su cargo {{cantidad_hijos}} hijos/as, entre ellos/as {{familiar}}, cuyo vínculo acredita con el acta de nacimiento (fs. {{fs}}). La asignación por familia numerosa corresponde desde el tercer hijo/a, siempre que ninguno de los tres sea mayor de 21 años y que los mayores de 15 perciban la asignación por escolaridad.

En consecuencia, de las presentes actuaciones surge que el/la agente acredita los requisitos establecidos por la normativa vigente a fin de poder acceder al pago de la asignación familiar por familia numerosa.

Por ello, y conforme a lo considerado, se aconseja HACER LUGAR al/a la agente {{agente}}, afiliado/a N.º {{legajo}}, dependiente de {{dependencia}}, al PAGO DE LA ASIGNACIÓN FAMILIAR POR FAMILIA NUMEROSA{{en_relacion_a}}. El mismo deberá efectuarse a partir de {{mes_anio_efecto}}.

Tal es mi dictamen.',
  'El dictamen no lleva número. {{fecha}} es la fecha de hoy. Las referencias "A fs." tomalas de la numeración de fojas del expediente; la planta, el vínculo y la fecha de alta salen de la consulta de Civitas (si no están en el expediente, [COMPLETAR]). Si la documentación no alcanza para hacer lugar, no lo aconsejes: señalá qué falta. Concordá el género (el/la agente) con los datos del agente. {{en_relacion_a}}: ", respecto de su hijo/a [apellido y nombre], DNI [dni], nacido/a el [fecha]". Los artículos de la Ordenanza N.º 546/75 y del Decreto N.º 584/75 del modelo corresponden al pago por nacimiento y por hijo/a: para esta asignación escribí [COMPLETAR: artículos aplicables de la Ordenanza N.º 546/75 y del Decreto N.º 584/75]. Sin modelo propio de dictamen.'
),
(
  'ASIG-FAM-NUM', 'resolucion', 'Resolución de asignación por familia numerosa',
  'RESOLUCIÓN N.º {{numero_resolucion}}
Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Área Bonificaciones
San Miguel de Tucumán, {{fecha_resolucion}}

**VISTO:**
El Expediente N.º {{numero_expediente}}, de fecha {{fecha_expediente}}, por el cual el/la agente {{agente}}, afiliado/a N.º {{legajo}}, dependiente de {{dependencia}}, y con prestación de servicios en {{reparticion}}, solicita el pago de la asignación familiar por familia numerosa; y

**CONSIDERANDO:**
Que a fs. {{fs}}, obra solicitud de pago de la asignación familiar por familia numerosa;
Que a fs. {{fs}}, obra la consulta del grupo familiar en el sistema Civitas respecto de los hijos/as del/de la agente;
Que se consultaron en el sistema Civitas la foja de servicios y la situación de revista del/de la agente;
Que a fs. {{fs}}, obra dictamen de Asesoría Letrada de la Dirección de Capital Humano, indicando que corresponde hacer lugar al pedido de pago de la asignación familiar por familia numerosa{{en_relacion_a}}. Dicho pago debe efectuarse desde el mes de {{mes_anio_efecto}};

Por lo expuesto y en ejercicio de la competencia que le acuerda el Decreto N.º 143/G/79, artículo 2º;

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** Hacer lugar al pedido y otorgar el pago de la asignación familiar por familia numerosa al/a la agente {{agente}}, afiliado/a N.º {{legajo}}, dependiente de {{dependencia}}, con prestación de servicios en {{reparticion}}{{en_relacion_a}}, y a partir de {{mes_anio_efecto}}, en atención a las razones invocadas en los considerandos que anteceden.

**Artículo 2º:** Registrar la presente Resolución en el Registro de Resoluciones de la Dirección de Capital Humano.

**Artículo 3º:** Notificar al/a la agente por medio del sistema de expedientes electrónicos, con constancia de fecha en el expediente. Notificado/a, archívese.',
  'Las referencias "a fs." tomalas de la numeración de fojas del expediente. Si el sentido indicado es NO hacer lugar, el Artículo 1º dice "No hacer lugar al pedido..." con los fundamentos del dictamen, y se omite el porcentaje o la fecha de efecto. Concordá el género (el/la agente) con los datos del agente. El pago rige desde el mes de la solicitud (fecha del expediente) salvo que el dictamen diga otra cosa. {{en_relacion_a}}: ", en relación a [hijo/a], DNI [dni], nacido/a el [fecha]". Modelo real del área.'
),
(
  'ASIG-HIJO', 'dictamen', 'Dictamen sobre asignación por hijo/a',
  'Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Asesoría Legal
San Miguel de Tucumán, {{fecha}}

EXPEDIENTE: {{numero_expediente}}
FECHA: {{fecha_expediente}}
DEPENDENCIA: {{dependencia}}
CAUSANTE: {{agente}}, AF {{legajo}}
ASUNTO: PAGO DE ASIGNACIÓN FAMILIAR

A la Dirección de Capital Humano
S/D

**DICTAMEN**

Vienen las presentes actuaciones a este servicio jurídico, por medio de las cuales el/la agente {{agente}}, afiliado/a N.º {{legajo}}, dependiente de {{dependencia}}, inicia expediente por pago de asignación familiar por hijo/a.

Documentación obrante en el expediente y normativa aplicable.-
A fs. {{fs}}, obra la solicitud de pago de asignación familiar;
A fs. {{fs}}, obra copia del acta de nacimiento expedida y certificada por el Registro de Estado Civil y Capacidad de las Personas, correspondiente a {{familiar}}, DNI {{dni_familiar}}, nacido/a el {{fecha_nacimiento}};
A fs. {{fs}}, obra impresión de consulta de certificación negativa, correspondiente a {{progenitor}}, C.U.I.L. N.º {{cuil_progenitor}};
Según los antecedentes laborales y la situación de revista del/de la agente consultados en el sistema Civitas, revista en planta {{planta}}, con fecha de alta el {{fecha_alta}}, dependiente de {{dependencia}}.

La normativa vigente que regula el caso planteado es, a saber: la Ordenanza N.º 546/75, artículos N.º 2, 6 y 8, y el Decreto Reglamentario N.º 584/75, artículos N.º 3, 5, 7 y 15, respecto del pago de asignación familiar por hijo/a.

Análisis.-
Entrando a analizar los presentes autos bajo la normativa vigente, resulta que respecto de la asignación por hijo/a, el/la agente acredita el hecho y el vínculo familiar con {{familiar}} a través del acta de nacimiento (fs. {{fs}}). De la constancia de certificación negativa correspondiente a {{progenitor}} (fs. {{fs}}), surge que no registra liquidación de asignaciones familiares.

En consecuencia, de las presentes actuaciones surge que el/la agente acredita los requisitos establecidos por la normativa vigente a fin de poder acceder al pago de la asignación familiar por hijo/a.

Por ello, y conforme a lo considerado, se aconseja HACER LUGAR al/a la agente {{agente}}, afiliado/a N.º {{legajo}}, dependiente de {{dependencia}}, al PAGO DE LA ASIGNACIÓN FAMILIAR POR HIJO/A{{en_relacion_a}}. El mismo deberá efectuarse a partir de {{mes_anio_efecto}}.

Tal es mi dictamen.',
  'El dictamen no lleva número. {{fecha}} es la fecha de hoy. Las referencias "A fs." tomalas de la numeración de fojas del expediente; la planta, el vínculo y la fecha de alta salen de la consulta de Civitas (si no están en el expediente, [COMPLETAR]). Si la documentación no alcanza para hacer lugar, no lo aconsejes: señalá qué falta. Concordá el género (el/la agente) con los datos del agente. {{en_relacion_a}}: ", respecto de su hijo/a [apellido y nombre], DNI [dni], nacido/a el [fecha]". El pago rige desde el mes de la solicitud (fecha del expediente).'
),
(
  'ASIG-HIJO', 'resolucion', 'Resolución de asignación por hijo/a',
  'RESOLUCIÓN N.º {{numero_resolucion}}
Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Área Bonificaciones
San Miguel de Tucumán, {{fecha_resolucion}}

**VISTO:**
El Expediente N.º {{numero_expediente}}, de fecha {{fecha_expediente}}, por el cual el/la agente {{agente}}, afiliado/a N.º {{legajo}}, dependiente de {{dependencia}}, y con prestación de servicios en {{reparticion}}, solicita el pago de la asignación familiar por hijo/a; y

**CONSIDERANDO:**
Que a fs. {{fs}}, obra solicitud de pago de la asignación familiar por hijo/a;
Que a fs. {{fs}}, obra acta de nacimiento expedida por el Registro de Estado Civil y Capacidad de las Personas, correspondiente a {{familiar}}, DNI {{dni_familiar}}, nacido/a el {{fecha_nacimiento}};
Que a fs. {{fs}}, obra certificación negativa de ANSES de {{progenitor}}, C.U.I.L. N.º {{cuil_progenitor}}, donde consta que no percibe asignaciones familiares;
Que se consultaron en el sistema Civitas la foja de servicios y la situación de revista del/de la agente;
Que a fs. {{fs}}, obra dictamen de Asesoría Letrada de la Dirección de Capital Humano, indicando que corresponde hacer lugar al pedido de pago de la asignación familiar por hijo/a{{en_relacion_a}}. Dicho pago debe efectuarse desde el mes de {{mes_anio_efecto}};

Por lo expuesto y en ejercicio de la competencia que le acuerda el Decreto N.º 143/G/79, artículo 2º;

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** Hacer lugar al pedido y otorgar el pago de la asignación familiar por hijo/a al/a la agente {{agente}}, afiliado/a N.º {{legajo}}, dependiente de {{dependencia}}, con prestación de servicios en {{reparticion}}{{en_relacion_a}}, y a partir de {{mes_anio_efecto}}, en atención a las razones invocadas en los considerandos que anteceden.

**Artículo 2º:** Registrar la presente Resolución en el Registro de Resoluciones de la Dirección de Capital Humano.

**Artículo 3º:** Notificar al/a la agente por medio del sistema de expedientes electrónicos, con constancia de fecha en el expediente. Notificado/a, archívese.',
  'Las referencias "a fs." tomalas de la numeración de fojas del expediente. Si el sentido indicado es NO hacer lugar, el Artículo 1º dice "No hacer lugar al pedido..." con los fundamentos del dictamen, y se omite el porcentaje o la fecha de efecto. Concordá el género (el/la agente) con los datos del agente. El pago rige desde el mes de la solicitud (fecha del expediente) salvo que el dictamen diga otra cosa. {{en_relacion_a}}: ", en relación a [hijo/a], DNI [dni], nacido/a el [fecha]".'
),
(
  'ASIG-HIJO-DISC', 'dictamen', 'Dictamen sobre asignación por hijo/a con discapacidad',
  'Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Asesoría Legal
San Miguel de Tucumán, {{fecha}}

EXPEDIENTE: {{numero_expediente}}
FECHA: {{fecha_expediente}}
DEPENDENCIA: {{dependencia}}
CAUSANTE: {{agente}}, AF {{legajo}}
ASUNTO: PAGO DE ASIGNACIÓN FAMILIAR

A la Dirección de Capital Humano
S/D

**DICTAMEN**

Vienen las presentes actuaciones a este servicio jurídico, por medio de las cuales el/la agente {{agente}}, afiliado/a N.º {{legajo}}, dependiente de {{dependencia}}, inicia expediente por pago de asignación familiar por hijo/a con discapacidad.

Documentación obrante en el expediente y normativa aplicable.-
A fs. {{fs}}, obra la solicitud de pago de asignación familiar;
A fs. {{fs}}, obra copia del acta de nacimiento expedida y certificada por el Registro de Estado Civil y Capacidad de las Personas, correspondiente a {{familiar}}, DNI {{dni_familiar}};
A fs. {{fs}}, obra Certificado Único de Discapacidad correspondiente a {{familiar}}, con vencimiento el {{vencimiento_cud}}, controlado por el Departamento de Medicina Laboral;
A fs. {{fs}}, obra impresión de consulta de certificación negativa, correspondiente a {{progenitor}}, C.U.I.L. N.º {{cuil_progenitor}};
Según los antecedentes laborales y la situación de revista del/de la agente consultados en el sistema Civitas, revista en planta {{planta}}, con fecha de alta el {{fecha_alta}}, dependiente de {{dependencia}}.

La normativa vigente que regula el caso planteado es, a saber: la Ordenanza N.º 546/75, artículos N.º 2, 6 y 8, y el Decreto Reglamentario N.º 584/75, artículos N.º 3, 5, 7 y 15, respecto del pago de asignación familiar por hijo/a con discapacidad.

Análisis.-
Entrando a analizar los presentes autos bajo la normativa vigente, resulta que respecto de la asignación por hijo/a con discapacidad, el/la agente acredita el vínculo familiar con {{familiar}} a través del acta de nacimiento (fs. {{fs}}) y la discapacidad mediante el Certificado Único de Discapacidad vigente (fs. {{fs}}), controlado por el Departamento de Medicina Laboral. La asignación se paga sin límite de edad mientras el certificado esté vigente. De la constancia de certificación negativa correspondiente a {{progenitor}} (fs. {{fs}}), surge que no registra liquidación de asignaciones familiares.

En consecuencia, de las presentes actuaciones surge que el/la agente acredita los requisitos establecidos por la normativa vigente a fin de poder acceder al pago de la asignación familiar por hijo/a con discapacidad.

Por ello, y conforme a lo considerado, se aconseja HACER LUGAR al/a la agente {{agente}}, afiliado/a N.º {{legajo}}, dependiente de {{dependencia}}, al PAGO DE LA ASIGNACIÓN FAMILIAR POR HIJO/A CON DISCAPACIDAD{{en_relacion_a}}. El mismo deberá efectuarse a partir de {{mes_anio_efecto}}.

Tal es mi dictamen.',
  'El dictamen no lleva número. {{fecha}} es la fecha de hoy. Las referencias "A fs." tomalas de la numeración de fojas del expediente; la planta, el vínculo y la fecha de alta salen de la consulta de Civitas (si no están en el expediente, [COMPLETAR]). Si la documentación no alcanza para hacer lugar, no lo aconsejes: señalá qué falta. Concordá el género (el/la agente) con los datos del agente. Expediente RESERVADO: no transcribas diagnósticos; referí a "la documentación médica obrante". Usá "hijo/a con discapacidad", nunca "discapacitado". Si es renovación del CUD, decilo en la apertura: el acta de nacimiento ya obra en el alta y Medicina Laboral no interviene. Los artículos de la Ordenanza N.º 546/75 y del Decreto N.º 584/75 del modelo corresponden al pago por nacimiento y por hijo/a: para esta asignación escribí [COMPLETAR: artículos aplicables de la Ordenanza N.º 546/75 y del Decreto N.º 584/75]. Sin modelo propio: sigue el de nacimiento y por hijo/a.'
),
(
  'ASIG-HIJO-DISC', 'resolucion', 'Resolución de asignación por hijo/a con discapacidad',
  'RESOLUCIÓN N.º {{numero_resolucion}}
Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Área Bonificaciones
San Miguel de Tucumán, {{fecha_resolucion}}

**VISTO:**
El Expediente N.º {{numero_expediente}}, de fecha {{fecha_expediente}}, por el cual el/la agente {{agente}}, afiliado/a N.º {{legajo}}, dependiente de {{dependencia}}, y con prestación de servicios en {{reparticion}}, solicita el pago de la asignación familiar por hijo/a con discapacidad; y

**CONSIDERANDO:**
Que a fs. {{fs}}, obra solicitud de pago de la asignación familiar por hijo/a con discapacidad;
Que a fs. {{fs}}, obra acta de nacimiento expedida por el Registro de Estado Civil y Capacidad de las Personas, correspondiente a {{familiar}}, DNI {{dni_familiar}};
Que a fs. {{fs}}, obra Certificado Único de Discapacidad de {{familiar}}, con vencimiento el {{vencimiento_cud}}, controlado por el Departamento de Medicina Laboral;
Que a fs. {{fs}}, obra certificación negativa de ANSES de {{progenitor}}, C.U.I.L. N.º {{cuil_progenitor}}, donde consta que no percibe asignaciones familiares;
Que se consultaron en el sistema Civitas la foja de servicios y la situación de revista del/de la agente;
Que a fs. {{fs}}, obra dictamen de Asesoría Letrada de la Dirección de Capital Humano, indicando que corresponde hacer lugar al pedido de pago de la asignación familiar por hijo/a con discapacidad{{en_relacion_a}}. Dicho pago debe efectuarse desde el mes de {{mes_anio_efecto}};

Por lo expuesto y en ejercicio de la competencia que le acuerda el Decreto N.º 143/G/79, artículo 2º;

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** Hacer lugar al pedido y otorgar el pago de la asignación familiar por hijo/a con discapacidad al/a la agente {{agente}}, afiliado/a N.º {{legajo}}, dependiente de {{dependencia}}, con prestación de servicios en {{reparticion}}{{en_relacion_a}}, y a partir de {{mes_anio_efecto}}, en atención a las razones invocadas en los considerandos que anteceden.

**Artículo 2º:** Registrar la presente Resolución en el Registro de Resoluciones de la Dirección de Capital Humano.

**Artículo 3º:** Notificar al/a la agente por medio del sistema de expedientes electrónicos, con constancia de fecha en el expediente. Notificado/a, archívese.',
  'Las referencias "a fs." tomalas de la numeración de fojas del expediente. Si el sentido indicado es NO hacer lugar, el Artículo 1º dice "No hacer lugar al pedido..." con los fundamentos del dictamen, y se omite el porcentaje o la fecha de efecto. Concordá el género (el/la agente) con los datos del agente. El pago rige desde el mes de la solicitud (fecha del expediente) salvo que el dictamen diga otra cosa. Expediente RESERVADO: no transcribas diagnósticos; referí a "la documentación médica obrante". Usá "hijo/a con discapacidad", nunca "discapacitado". {{en_relacion_a}}: ", en relación a [hijo/a], DNI [dni]". Si es renovación, decilo en el VISTO. Sin modelo propio: sigue el de nacimiento y por hijo/a; validar con el área.'
),
(
  'ASIG-MATRIMONIO', 'dictamen', 'Dictamen sobre asignación por matrimonio',
  'Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Asesoría Legal
San Miguel de Tucumán, {{fecha}}

EXPEDIENTE: {{numero_expediente}}
FECHA: {{fecha_expediente}}
DEPENDENCIA: {{dependencia}}
CAUSANTE: {{agente}}, AF {{legajo}}
ASUNTO: PAGO DE ASIGNACIÓN FAMILIAR

A la Dirección de Capital Humano
S/D

**DICTAMEN**

Vienen las presentes actuaciones a este servicio jurídico, por medio de las cuales el/la agente {{agente}}, afiliado/a N.º {{legajo}}, dependiente de {{dependencia}}, inicia expediente por pago de asignación familiar por matrimonio.

Documentación obrante en el expediente y normativa aplicable.-
A fs. {{fs}}, obra la solicitud de pago de asignación familiar;
A fs. {{fs}}, obra copia del acta de matrimonio expedida y certificada por el Registro de Estado Civil y Capacidad de las Personas, de fecha {{fecha_matrimonio}}, con {{familiar}}, DNI {{dni_familiar}};
Según los antecedentes laborales y la situación de revista del/de la agente consultados en el sistema Civitas, revista en planta {{planta}}, con fecha de alta el {{fecha_alta}}, dependiente de {{dependencia}}.

La normativa vigente que regula el caso planteado es, a saber: la Ordenanza N.º 546/75, artículos N.º 2, 6 y 8, y el Decreto Reglamentario N.º 584/75, artículos N.º 3, 5, 7 y 15, respecto del pago de asignación familiar por matrimonio.

Análisis.-
Entrando a analizar los presentes autos bajo la normativa vigente, resulta que respecto de la asignación por matrimonio, el/la agente acredita el hecho y el vínculo con {{familiar}} a través del acta de matrimonio (fs. {{fs}}), y la solicita dentro del año de la celebración.

En consecuencia, de las presentes actuaciones surge que el/la agente acredita los requisitos establecidos por la normativa vigente a fin de poder acceder al pago de la asignación familiar por matrimonio.

Por ello, y conforme a lo considerado, se aconseja HACER LUGAR al/a la agente {{agente}}, afiliado/a N.º {{legajo}}, dependiente de {{dependencia}}, al PAGO ÚNICO DE LA ASIGNACIÓN FAMILIAR POR MATRIMONIO{{en_relacion_a}}. El mismo deberá efectuarse a partir de {{mes_anio_efecto}}.

Tal es mi dictamen.',
  'El dictamen no lleva número. {{fecha}} es la fecha de hoy. Las referencias "A fs." tomalas de la numeración de fojas del expediente; la planta, el vínculo y la fecha de alta salen de la consulta de Civitas (si no están en el expediente, [COMPLETAR]). Si la documentación no alcanza para hacer lugar, no lo aconsejes: señalá qué falta. Concordá el género (el/la agente) con los datos del agente. {{en_relacion_a}}: ", respecto de su matrimonio con [cónyuge], DNI [dni]". Si entre la fecha del matrimonio y la del expediente pasó más de un año, no lo aconsejes: señalá [REVISAR: pedido fuera del plazo de un año]. Los artículos de la Ordenanza N.º 546/75 y del Decreto N.º 584/75 del modelo corresponden al pago por nacimiento y por hijo/a: para esta asignación escribí [COMPLETAR: artículos aplicables de la Ordenanza N.º 546/75 y del Decreto N.º 584/75].'
),
(
  'ASIG-MATRIMONIO', 'resolucion', 'Resolución de asignación por matrimonio',
  'RESOLUCIÓN N.º {{numero_resolucion}}
Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Área Bonificaciones
San Miguel de Tucumán, {{fecha_resolucion}}

**VISTO:**
El Expediente N.º {{numero_expediente}}, de fecha {{fecha_expediente}}, por el cual el/la agente {{agente}}, afiliado/a N.º {{legajo}}, dependiente de {{dependencia}}, y con prestación de servicios en {{reparticion}}, solicita el pago de la asignación familiar por matrimonio; y

**CONSIDERANDO:**
Que a fs. {{fs}}, obra solicitud de pago de la asignación familiar por matrimonio;
Que a fs. {{fs}}, obra acta de matrimonio expedida por el Registro de Estado Civil y Capacidad de las Personas, de fecha {{fecha_matrimonio}}, con {{familiar}}, DNI {{dni_familiar}};
Que se consultaron en el sistema Civitas la foja de servicios y la situación de revista del/de la agente;
Que a fs. {{fs}}, obra dictamen de Asesoría Letrada de la Dirección de Capital Humano, indicando que corresponde hacer lugar al pedido de pago único de la asignación familiar por matrimonio{{en_relacion_a}}. Dicho pago debe efectuarse desde el mes de {{mes_anio_efecto}};

Por lo expuesto y en ejercicio de la competencia que le acuerda el Decreto N.º 143/G/79, artículo 2º;

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** Hacer lugar al pedido y otorgar el pago único de la asignación familiar por matrimonio al/a la agente {{agente}}, afiliado/a N.º {{legajo}}, dependiente de {{dependencia}}, con prestación de servicios en {{reparticion}}{{en_relacion_a}}, y a partir de {{mes_anio_efecto}}, en atención a las razones invocadas en los considerandos que anteceden.

**Artículo 2º:** Registrar la presente Resolución en el Registro de Resoluciones de la Dirección de Capital Humano.

**Artículo 3º:** Notificar al/a la agente por medio del sistema de expedientes electrónicos, con constancia de fecha en el expediente. Notificado/a, archívese.',
  'Las referencias "a fs." tomalas de la numeración de fojas del expediente. Si el sentido indicado es NO hacer lugar, el Artículo 1º dice "No hacer lugar al pedido..." con los fundamentos del dictamen, y se omite el porcentaje o la fecha de efecto. Concordá el género (el/la agente) con los datos del agente. El pago rige desde el mes de la solicitud (fecha del expediente) salvo que el dictamen diga otra cosa. Es pago único. {{en_relacion_a}}: ", en relación a [cónyuge], DNI [dni]".'
),
(
  'ASIG-NACIMIENTO', 'dictamen', 'Dictamen sobre asignación por nacimiento',
  'Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Asesoría Legal
San Miguel de Tucumán, {{fecha}}

EXPEDIENTE: {{numero_expediente}}
FECHA: {{fecha_expediente}}
DEPENDENCIA: {{dependencia}}
CAUSANTE: {{agente}}, AF {{legajo}}
ASUNTO: PAGO DE ASIGNACIÓN FAMILIAR

A la Dirección de Capital Humano
S/D

**DICTAMEN**

Vienen las presentes actuaciones a este servicio jurídico, por medio de las cuales el/la agente {{agente}}, afiliado/a N.º {{legajo}}, dependiente de {{dependencia}}, inicia expediente por pago de asignación familiar por nacimiento.

Documentación obrante en el expediente y normativa aplicable.-
A fs. {{fs}}, obra la solicitud de pago de asignación familiar;
A fs. {{fs}}, obra copia del acta de nacimiento expedida y certificada por el Registro de Estado Civil y Capacidad de las Personas, correspondiente a {{familiar}}, DNI {{dni_familiar}}, nacido/a el {{fecha_nacimiento}};
A fs. {{fs}}, obra impresión de consulta de certificación negativa, correspondiente a {{progenitor}}, C.U.I.L. N.º {{cuil_progenitor}};
Según los antecedentes laborales y la situación de revista del/de la agente consultados en el sistema Civitas, revista en planta {{planta}}, con fecha de alta el {{fecha_alta}}, dependiente de {{dependencia}}.

La normativa vigente que regula el caso planteado es, a saber: la Ordenanza N.º 546/75, artículos N.º 2, 6 y 8, y el Decreto Reglamentario N.º 584/75, artículos N.º 3, 5, 7 y 15, respecto del pago de asignación familiar por nacimiento.

Análisis.-
Entrando a analizar los presentes autos bajo la normativa vigente, resulta que respecto de la asignación por nacimiento, el/la agente acredita el hecho y el vínculo familiar con {{familiar}} a través del acta de nacimiento (fs. {{fs}}). Además, cumple con la antigüedad requerida para el pago de la asignación por nacimiento y se encuentra dentro del plazo legal para solicitarla (art. 6º Ord. N.º 546/75). De la constancia de certificación negativa correspondiente a {{progenitor}} (fs. {{fs}}), surge que no registra liquidación de asignaciones familiares.

En consecuencia, de las presentes actuaciones surge que el/la agente acredita los requisitos establecidos por la normativa vigente a fin de poder acceder al pago de la asignación familiar por nacimiento.

Por ello, y conforme a lo considerado, se aconseja HACER LUGAR al/a la agente {{agente}}, afiliado/a N.º {{legajo}}, dependiente de {{dependencia}}, al PAGO ÚNICO DE LA ASIGNACIÓN FAMILIAR POR NACIMIENTO{{en_relacion_a}}. El mismo deberá efectuarse a partir de {{mes_anio_efecto}}.

Tal es mi dictamen.',
  'El dictamen no lleva número. {{fecha}} es la fecha de hoy. Las referencias "A fs." tomalas de la numeración de fojas del expediente; la planta, el vínculo y la fecha de alta salen de la consulta de Civitas (si no están en el expediente, [COMPLETAR]). Si la documentación no alcanza para hacer lugar, no lo aconsejes: señalá qué falta. Concordá el género (el/la agente) con los datos del agente. {{en_relacion_a}}: ", respecto de su hijo/a [apellido y nombre], DNI [dni], nacido/a el [fecha]". Si la antigüedad o el plazo no surgen del expediente, no los afirmes: marcá [REVISAR: antigüedad y plazo del art. 6º Ord. N.º 546/75]. Si se acompaña CUD, mencionalo sin transcribir diagnóstico.'
),
(
  'ASIG-NACIMIENTO', 'resolucion', 'Resolución de asignación por nacimiento',
  'RESOLUCIÓN N.º {{numero_resolucion}}
Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Área Bonificaciones
San Miguel de Tucumán, {{fecha_resolucion}}

**VISTO:**
El Expediente N.º {{numero_expediente}}, de fecha {{fecha_expediente}}, por el cual el/la agente {{agente}}, afiliado/a N.º {{legajo}}, dependiente de {{dependencia}}, y con prestación de servicios en {{reparticion}}, solicita el pago de la asignación familiar por nacimiento; y

**CONSIDERANDO:**
Que a fs. {{fs}}, obra solicitud de pago de la asignación familiar por nacimiento;
Que a fs. {{fs}}, obra acta de nacimiento expedida por el Registro de Estado Civil y Capacidad de las Personas, correspondiente a {{familiar}}, DNI {{dni_familiar}}, nacido/a el {{fecha_nacimiento}};
Que a fs. {{fs}}, obra certificación negativa de ANSES de {{progenitor}}, C.U.I.L. N.º {{cuil_progenitor}}, donde consta que no percibe asignaciones familiares;
Que se consultaron en el sistema Civitas la foja de servicios y la situación de revista del/de la agente;
Que a fs. {{fs}}, obra dictamen de Asesoría Letrada de la Dirección de Capital Humano, indicando que corresponde hacer lugar al pedido de pago único de la asignación familiar por nacimiento{{en_relacion_a}}. Dicho pago debe efectuarse desde el mes de {{mes_anio_efecto}};

Por lo expuesto y en ejercicio de la competencia que le acuerda el Decreto N.º 143/G/79, artículo 2º;

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** Hacer lugar al pedido y otorgar el pago único de la asignación familiar por nacimiento al/a la agente {{agente}}, afiliado/a N.º {{legajo}}, dependiente de {{dependencia}}, con prestación de servicios en {{reparticion}}{{en_relacion_a}}, y a partir de {{mes_anio_efecto}}, en atención a las razones invocadas en los considerandos que anteceden.

**Artículo 2º:** Registrar la presente Resolución en el Registro de Resoluciones de la Dirección de Capital Humano.

**Artículo 3º:** Notificar al/a la agente por medio del sistema de expedientes electrónicos, con constancia de fecha en el expediente. Notificado/a, archívese.',
  'Las referencias "a fs." tomalas de la numeración de fojas del expediente. Si el sentido indicado es NO hacer lugar, el Artículo 1º dice "No hacer lugar al pedido..." con los fundamentos del dictamen, y se omite el porcentaje o la fecha de efecto. Concordá el género (el/la agente) con los datos del agente. El pago rige desde el mes de la solicitud (fecha del expediente) salvo que el dictamen diga otra cosa. Es pago único. {{en_relacion_a}}: ", en relación a [hijo/a], DNI [dni], nacido/a el [fecha]". Si se acompaña CUD, mencionalo sin transcribir diagnóstico.'
),
(
  'ASIG-PRENATAL', 'dictamen', 'Dictamen sobre asignación prenatal',
  'Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Asesoría Legal
San Miguel de Tucumán, {{fecha}}

EXPEDIENTE: {{numero_expediente}}
FECHA: {{fecha_expediente}}
DEPENDENCIA: {{dependencia}}
CAUSANTE: {{agente}}, AF {{legajo}}
ASUNTO: PAGO DE ASIGNACIÓN FAMILIAR

A la Dirección de Capital Humano
S/D

**DICTAMEN**

Vienen las presentes actuaciones a este servicio jurídico, por medio de las cuales el/la agente {{agente}}, afiliado/a N.º {{legajo}}, dependiente de {{dependencia}}, inicia expediente por pago de asignación familiar prenatal.

Documentación obrante en el expediente y normativa aplicable.-
A fs. {{fs}}, obra la solicitud de pago de asignación familiar;
A fs. {{fs}}, obra certificado médico con fecha probable de parto el {{fecha_probable_parto}};
A fs. {{fs}}, obra informe del Departamento de Medicina Laboral;
Según los antecedentes laborales y la situación de revista del/de la agente consultados en el sistema Civitas, revista en planta {{planta}}, con fecha de alta el {{fecha_alta}}, dependiente de {{dependencia}}.

La normativa vigente que regula el caso planteado es, a saber: la Ordenanza N.º 546/75, artículos N.º 2, 6 y 8, y el Decreto Reglamentario N.º 584/75, artículos N.º 3, 5, 7 y 15, respecto del pago de asignación familiar prenatal.

Análisis.-
Entrando a analizar los presentes autos bajo la normativa vigente, resulta que respecto de la asignación prenatal, la agente acredita el embarazo y la fecha probable de parto mediante el certificado médico (fs. {{fs}}) y el informe del Departamento de Medicina Laboral (fs. {{fs}}).

En consecuencia, de las presentes actuaciones surge que el/la agente acredita los requisitos establecidos por la normativa vigente a fin de poder acceder al pago de la asignación familiar prenatal.

Por ello, y conforme a lo considerado, se aconseja HACER LUGAR al/a la agente {{agente}}, afiliado/a N.º {{legajo}}, dependiente de {{dependencia}}, al PAGO DE LA ASIGNACIÓN FAMILIAR PRENATAL{{en_relacion_a}}. El mismo deberá efectuarse a partir de {{mes_anio_efecto}}.

Tal es mi dictamen.',
  'El dictamen no lleva número. {{fecha}} es la fecha de hoy. Las referencias "A fs." tomalas de la numeración de fojas del expediente; la planta, el vínculo y la fecha de alta salen de la consulta de Civitas (si no están en el expediente, [COMPLETAR]). Si la documentación no alcanza para hacer lugar, no lo aconsejes: señalá qué falta. Concordá el género (el/la agente) con los datos del agente. Expediente RESERVADO: no transcribas datos de salud; referí a "la documentación médica obrante". {{en_relacion_a}} queda vacío. Los artículos de la Ordenanza N.º 546/75 y del Decreto N.º 584/75 del modelo corresponden al pago por nacimiento y por hijo/a: para esta asignación escribí [COMPLETAR: artículos aplicables de la Ordenanza N.º 546/75 y del Decreto N.º 584/75].'
),
(
  'ASIG-PRENATAL', 'resolucion', 'Resolución de asignación prenatal',
  'RESOLUCIÓN N.º {{numero_resolucion}}
Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Área Bonificaciones
San Miguel de Tucumán, {{fecha_resolucion}}

**VISTO:**
El Expediente N.º {{numero_expediente}}, de fecha {{fecha_expediente}}, por el cual el/la agente {{agente}}, afiliado/a N.º {{legajo}}, dependiente de {{dependencia}}, y con prestación de servicios en {{reparticion}}, solicita el pago de la asignación familiar prenatal; y

**CONSIDERANDO:**
Que a fs. {{fs}}, obra solicitud de pago de la asignación familiar prenatal;
Que a fs. {{fs}}, obra certificado médico con fecha probable de parto el {{fecha_probable_parto}} de la agente e informe del Departamento de Medicina Laboral;
Que se consultaron en el sistema Civitas la foja de servicios y la situación de revista del/de la agente;
Que a fs. {{fs}}, obra dictamen de Asesoría Letrada de la Dirección de Capital Humano, indicando que corresponde hacer lugar al pedido de pago de la asignación familiar prenatal{{en_relacion_a}}. Dicho pago debe efectuarse desde el mes de {{mes_anio_efecto}};

Por lo expuesto y en ejercicio de la competencia que le acuerda el Decreto N.º 143/G/79, artículo 2º;

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** Hacer lugar al pedido y otorgar el pago de la asignación familiar prenatal al/a la agente {{agente}}, afiliado/a N.º {{legajo}}, dependiente de {{dependencia}}, con prestación de servicios en {{reparticion}}{{en_relacion_a}}, y a partir de {{mes_anio_efecto}}, en atención a las razones invocadas en los considerandos que anteceden.

**Artículo 2º:** Registrar la presente Resolución en el Registro de Resoluciones de la Dirección de Capital Humano.

**Artículo 3º:** Notificar al/a la agente por medio del sistema de expedientes electrónicos, con constancia de fecha en el expediente. Notificado/a, archívese.',
  'Las referencias "a fs." tomalas de la numeración de fojas del expediente. Si el sentido indicado es NO hacer lugar, el Artículo 1º dice "No hacer lugar al pedido..." con los fundamentos del dictamen, y se omite el porcentaje o la fecha de efecto. Concordá el género (el/la agente) con los datos del agente. El pago rige desde el mes de la solicitud (fecha del expediente) salvo que el dictamen diga otra cosa. Expediente RESERVADO: no transcribas datos de salud; referí a "la documentación médica obrante". {{en_relacion_a}} queda vacío.'
),
(
  'ASIG-PRENATAL-VARON', 'dictamen', 'Dictamen sobre asignación prenatal (cónyuge o conviviente)',
  'Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Asesoría Legal
San Miguel de Tucumán, {{fecha}}

EXPEDIENTE: {{numero_expediente}}
FECHA: {{fecha_expediente}}
DEPENDENCIA: {{dependencia}}
CAUSANTE: {{agente}}, AF {{legajo}}
ASUNTO: PAGO DE ASIGNACIÓN FAMILIAR

A la Dirección de Capital Humano
S/D

**DICTAMEN**

Vienen las presentes actuaciones a este servicio jurídico, por medio de las cuales el/la agente {{agente}}, afiliado/a N.º {{legajo}}, dependiente de {{dependencia}}, inicia expediente por pago de asignación familiar prenatal.

Documentación obrante en el expediente y normativa aplicable.-
A fs. {{fs}}, obra la solicitud de pago de asignación familiar;
A fs. {{fs}}, obra certificado médico con fecha probable de parto el {{fecha_probable_parto}};
A fs. {{fs}}, obra copia del acta de {{vinculo_acta}} con {{familiar}}, DNI {{dni_familiar}};
A fs. {{fs}}, obra impresión de consulta de certificación negativa, correspondiente a {{familiar}}, C.U.I.L. N.º {{cuil_familiar}};
A fs. {{fs}}, obra informe del Departamento de Medicina Laboral;
Según los antecedentes laborales y la situación de revista del/de la agente consultados en el sistema Civitas, revista en planta {{planta}}, con fecha de alta el {{fecha_alta}}, dependiente de {{dependencia}}.

La normativa vigente que regula el caso planteado es, a saber: la Ordenanza N.º 546/75, artículos N.º 2, 6 y 8, y el Decreto Reglamentario N.º 584/75, artículos N.º 3, 5, 7 y 15, respecto del pago de asignación familiar prenatal.

Análisis.-
Entrando a analizar los presentes autos bajo la normativa vigente, resulta que respecto de la asignación prenatal, el agente acredita el vínculo con {{familiar}} a través del acta (fs. {{fs}}), y el embarazo y la fecha probable de parto mediante el certificado médico (fs. {{fs}}) y el informe del Departamento de Medicina Laboral (fs. {{fs}}). De la constancia de certificación negativa correspondiente a {{familiar}} (fs. {{fs}}), surge que no registra liquidación de asignaciones familiares.

En consecuencia, de las presentes actuaciones surge que el/la agente acredita los requisitos establecidos por la normativa vigente a fin de poder acceder al pago de la asignación familiar prenatal.

Por ello, y conforme a lo considerado, se aconseja HACER LUGAR al/a la agente {{agente}}, afiliado/a N.º {{legajo}}, dependiente de {{dependencia}}, al PAGO DE LA ASIGNACIÓN FAMILIAR PRENATAL{{en_relacion_a}}. El mismo deberá efectuarse a partir de {{mes_anio_efecto}}.

Tal es mi dictamen.',
  'El dictamen no lleva número. {{fecha}} es la fecha de hoy. Las referencias "A fs." tomalas de la numeración de fojas del expediente; la planta, el vínculo y la fecha de alta salen de la consulta de Civitas (si no están en el expediente, [COMPLETAR]). Si la documentación no alcanza para hacer lugar, no lo aconsejes: señalá qué falta. Concordá el género (el/la agente) con los datos del agente. Expediente RESERVADO: no transcribas datos de salud; referí a "la documentación médica obrante". {{vinculo_acta}} es "matrimonio" o "unión convivencial" según el formulario. {{en_relacion_a}}: ", respecto del embarazo de su cónyuge o conviviente [apellido y nombre], DNI [dni]". Los artículos de la Ordenanza N.º 546/75 y del Decreto N.º 584/75 del modelo corresponden al pago por nacimiento y por hijo/a: para esta asignación escribí [COMPLETAR: artículos aplicables de la Ordenanza N.º 546/75 y del Decreto N.º 584/75].'
),
(
  'ASIG-PRENATAL-VARON', 'resolucion', 'Resolución de asignación prenatal (cónyuge o conviviente)',
  'RESOLUCIÓN N.º {{numero_resolucion}}
Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Área Bonificaciones
San Miguel de Tucumán, {{fecha_resolucion}}

**VISTO:**
El Expediente N.º {{numero_expediente}}, de fecha {{fecha_expediente}}, por el cual el/la agente {{agente}}, afiliado/a N.º {{legajo}}, dependiente de {{dependencia}}, y con prestación de servicios en {{reparticion}}, solicita el pago de la asignación familiar prenatal; y

**CONSIDERANDO:**
Que a fs. {{fs}}, obra solicitud de pago de la asignación familiar prenatal;
Que a fs. {{fs}}, obra certificado médico con fecha probable de parto el {{fecha_probable_parto}} de la madre, su cónyuge o conviviente {{familiar}}, e informe del Departamento de Medicina Laboral;
Que a fs. {{fs}}, obra acta de {{vinculo_acta}} con {{familiar}}, DNI {{dni_familiar}}, y su certificación negativa de ANSES;
Que se consultaron en el sistema Civitas la foja de servicios y la situación de revista del/de la agente;
Que a fs. {{fs}}, obra dictamen de Asesoría Letrada de la Dirección de Capital Humano, indicando que corresponde hacer lugar al pedido de pago de la asignación familiar prenatal{{en_relacion_a}}. Dicho pago debe efectuarse desde el mes de {{mes_anio_efecto}};

Por lo expuesto y en ejercicio de la competencia que le acuerda el Decreto N.º 143/G/79, artículo 2º;

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** Hacer lugar al pedido y otorgar el pago de la asignación familiar prenatal al/a la agente {{agente}}, afiliado/a N.º {{legajo}}, dependiente de {{dependencia}}, con prestación de servicios en {{reparticion}}{{en_relacion_a}}, y a partir de {{mes_anio_efecto}}, en atención a las razones invocadas en los considerandos que anteceden.

**Artículo 2º:** Registrar la presente Resolución en el Registro de Resoluciones de la Dirección de Capital Humano.

**Artículo 3º:** Notificar al/a la agente por medio del sistema de expedientes electrónicos, con constancia de fecha en el expediente. Notificado/a, archívese.',
  'Las referencias "a fs." tomalas de la numeración de fojas del expediente. Si el sentido indicado es NO hacer lugar, el Artículo 1º dice "No hacer lugar al pedido..." con los fundamentos del dictamen, y se omite el porcentaje o la fecha de efecto. Concordá el género (el/la agente) con los datos del agente. El pago rige desde el mes de la solicitud (fecha del expediente) salvo que el dictamen diga otra cosa. Expediente RESERVADO: no transcribas datos de salud; referí a "la documentación médica obrante". {{vinculo_acta}} es "matrimonio" o "unión convivencial". {{en_relacion_a}}: ", en relación al embarazo de [cónyuge o conviviente], DNI [dni]".'
),
(
  'ASIG-CONYUGE', 'dictamen', 'Dictamen sobre asignación por cónyuge',
  'Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Asesoría Legal
San Miguel de Tucumán, {{fecha}}

EXPEDIENTE: {{numero_expediente}}
FECHA: {{fecha_expediente}}
DEPENDENCIA: {{dependencia}}
CAUSANTE: {{agente}}, AF {{legajo}}
ASUNTO: PAGO DE ASIGNACIÓN FAMILIAR

A la Dirección de Capital Humano
S/D

**DICTAMEN**

Vienen las presentes actuaciones a este servicio jurídico, por medio de las cuales el/la agente {{agente}}, afiliado/a N.º {{legajo}}, dependiente de {{dependencia}}, inicia expediente por pago de asignación familiar por cónyuge.

Documentación obrante en el expediente y normativa aplicable.-
A fs. {{fs}}, obra la solicitud de pago de asignación familiar;
A fs. {{fs}}, obra copia del acta de matrimonio expedida y certificada por el Registro de Estado Civil y Capacidad de las Personas, con {{familiar}}, DNI {{dni_familiar}};
Según los antecedentes laborales y la situación de revista del/de la agente consultados en el sistema Civitas, revista en planta {{planta}}, con fecha de alta el {{fecha_alta}}, dependiente de {{dependencia}}.

La normativa vigente que regula el caso planteado es, a saber: la Ordenanza N.º 546/75, artículos N.º 2, 6 y 8, y el Decreto Reglamentario N.º 584/75, artículos N.º 3, 5, 7 y 15, respecto del pago de asignación familiar por cónyuge.

Análisis.-
Entrando a analizar los presentes autos bajo la normativa vigente, resulta que respecto de la asignación por cónyuge, el/la agente acredita el vínculo con {{familiar}} a través del acta de matrimonio (fs. {{fs}}).

En consecuencia, de las presentes actuaciones surge que el/la agente acredita los requisitos establecidos por la normativa vigente a fin de poder acceder al pago de la asignación familiar por cónyuge.

Por ello, y conforme a lo considerado, se aconseja HACER LUGAR al/a la agente {{agente}}, afiliado/a N.º {{legajo}}, dependiente de {{dependencia}}, al PAGO DE LA ASIGNACIÓN FAMILIAR POR CÓNYUGE{{en_relacion_a}}. El mismo deberá efectuarse a partir de {{mes_anio_efecto}}.

Tal es mi dictamen.',
  'El dictamen no lleva número. {{fecha}} es la fecha de hoy. Las referencias "A fs." tomalas de la numeración de fojas del expediente; la planta, el vínculo y la fecha de alta salen de la consulta de Civitas (si no están en el expediente, [COMPLETAR]). Si la documentación no alcanza para hacer lugar, no lo aconsejes: señalá qué falta. Concordá el género (el/la agente) con los datos del agente. {{en_relacion_a}}: ", respecto de su cónyuge [apellido y nombre], DNI [dni]". Si el/la cónyuge tiene discapacidad, mencioná el CUD sin transcribir diagnóstico. Los artículos de la Ordenanza N.º 546/75 y del Decreto N.º 584/75 del modelo corresponden al pago por nacimiento y por hijo/a: para esta asignación escribí [COMPLETAR: artículos aplicables de la Ordenanza N.º 546/75 y del Decreto N.º 584/75].'
),
(
  'ASIG-CONYUGE', 'resolucion', 'Resolución de asignación por cónyuge',
  'RESOLUCIÓN N.º {{numero_resolucion}}
Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Área Bonificaciones
San Miguel de Tucumán, {{fecha_resolucion}}

**VISTO:**
El Expediente N.º {{numero_expediente}}, de fecha {{fecha_expediente}}, por el cual el/la agente {{agente}}, afiliado/a N.º {{legajo}}, dependiente de {{dependencia}}, y con prestación de servicios en {{reparticion}}, solicita el pago de la asignación familiar por cónyuge; y

**CONSIDERANDO:**
Que a fs. {{fs}}, obra solicitud de pago de la asignación familiar por cónyuge;
Que a fs. {{fs}}, obra acta de matrimonio expedida por el Registro de Estado Civil y Capacidad de las Personas, con {{familiar}}, DNI {{dni_familiar}};
Que se consultaron en el sistema Civitas la foja de servicios y la situación de revista del/de la agente;
Que a fs. {{fs}}, obra dictamen de Asesoría Letrada de la Dirección de Capital Humano, indicando que corresponde hacer lugar al pedido de pago de la asignación familiar por cónyuge{{en_relacion_a}}. Dicho pago debe efectuarse desde el mes de {{mes_anio_efecto}};

Por lo expuesto y en ejercicio de la competencia que le acuerda el Decreto N.º 143/G/79, artículo 2º;

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** Hacer lugar al pedido y otorgar el pago de la asignación familiar por cónyuge al/a la agente {{agente}}, afiliado/a N.º {{legajo}}, dependiente de {{dependencia}}, con prestación de servicios en {{reparticion}}{{en_relacion_a}}, y a partir de {{mes_anio_efecto}}, en atención a las razones invocadas en los considerandos que anteceden.

**Artículo 2º:** Registrar la presente Resolución en el Registro de Resoluciones de la Dirección de Capital Humano.

**Artículo 3º:** Notificar al/a la agente por medio del sistema de expedientes electrónicos, con constancia de fecha en el expediente. Notificado/a, archívese.',
  'Las referencias "a fs." tomalas de la numeración de fojas del expediente. Si el sentido indicado es NO hacer lugar, el Artículo 1º dice "No hacer lugar al pedido..." con los fundamentos del dictamen, y se omite el porcentaje o la fecha de efecto. Concordá el género (el/la agente) con los datos del agente. El pago rige desde el mes de la solicitud (fecha del expediente) salvo que el dictamen diga otra cosa. {{en_relacion_a}}: ", en relación a [cónyuge], DNI [dni]". Si el/la cónyuge tiene discapacidad, mencioná el CUD sin transcribir diagnóstico.'
),
(
  'LIC-EXAMEN', 'resolucion', 'Resolución de licencia por examen',
  'RESOLUCIÓN N.º {{numero_resolucion}}
San Miguel de Tucumán, {{fecha_resolucion}}

**VISTO:**
El Expediente N.º {{numero_expediente}}, por el cual el/la agente {{agente}}, Legajo N.º {{legajo}}, solicita licencia por examen; y

**CONSIDERANDO:**
Que el/la agente acredita su inscripción para rendir la materia {{materia}} de la carrera {{carrera}}, en {{institucion}}, con fecha {{fecha_examen}};
Que la Sección Licencias informa que el/la agente cuenta con días disponibles en el período en curso;
Que corresponde hacer lugar a lo solicitado conforme {{normativa}};

Por ello,

**LA DIRECCIÓN DE CAPITAL HUMANO**
**RESUELVE:**

**ARTÍCULO 1º.-** CONCEDER al/la agente {{agente}}, Legajo N.º {{legajo}}, licencia por examen por el término de {{dias}} día(s) a partir del {{fecha_inicio}}.

**ARTÍCULO 2º.-** El/la agente deberá presentar el certificado de examen rendido dentro de los cinco (5) días hábiles posteriores.

**ARTÍCULO 3º.-** Comuníquese, notifíquese y archívese.',
  'Verificá que la fecha del examen y los días solicitados sean coherentes. Si en el expediente ya consta el certificado de examen rendido, eliminá el artículo 2º. No inventes normativa: dejá el marcador [COMPLETAR].'
),
(
  'LIC-ENFERMEDAD', 'resolucion', 'Resolución de licencia por enfermedad',
  'RESOLUCIÓN N.º {{numero_resolucion}}
Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Departamento de Medicina Laboral
San Miguel de Tucumán, {{fecha_resolucion}}

**VISTO:**
El Expediente N.º {{numero_expediente}}, por el cual el/la agente {{agente}}, afiliado/a N.º {{legajo}}, solicita licencia por enfermedad respecto de los días {{fecha_desde}} al {{fecha_hasta}}; y

**CONSIDERANDO:**
Que la petición del/de la agente está reglada por el Decreto N.º EH-337/77, arts. 18 y siguientes, la Ordenanza N.º 936/87 y su Decreto Reglamentario N.º 10/88;
Que de las constancias de las presentes actuaciones surge que se han cumplido todos los recaudos legales exigidos para la procedencia de la licencia solicitada. A saber:
a. Condición de agente municipal (según la situación de revista consultada en el sistema Civitas).
b. Derecho del/de la agente a la licencia por enfermedad, de la que usó {{dias_usados}} días en el año calendario a la fecha del pedido (véase informe del Departamento de Medicina Laboral a fs. {{fs}}).
c. Enfermedad constatada por el médico auditor del Departamento de Medicina Laboral (véase licencia médica a fs. {{fs}}).
d. Solicitud temporánea por parte del/de la agente (véase la fecha y hora de inicio del expediente electrónico).

Por lo expuesto y en ejercicio de la competencia que le acuerda el Decreto N.º 337/77, art. 64;

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** Hacer lugar a la licencia con goce de sueldo por enfermedad respecto de los días {{fecha_desde}} al {{fecha_hasta}} a {{agente}}, afiliado/a N.º {{legajo}}, categoría {{categoria}}, agrupamiento {{agrupamiento}}, dependiente de {{dependencia}}, con prestación de servicios en {{reparticion}}, conforme a los considerandos.

**Artículo 2º:** Registrar la presente Resolución en el Registro de Resoluciones de la Dirección de Capital Humano.

**Artículo 3º:** Notificar al/a la agente por medio del sistema de expedientes electrónicos, con constancia de fecha en el expediente. Notificado/a, archívese.',
  'Las referencias "a fs." tomalas de la numeración de fojas del expediente. Si el sentido indicado es NO hacer lugar, el Artículo 1º dice "No hacer lugar al pedido..." con los fundamentos del dictamen, y se omite el porcentaje o la fecha de efecto. Concordá el género (el/la agente) con los datos del agente. Expediente RESERVADO: no transcribas diagnósticos ni datos de salud; referí a "la documentación médica obrante". Las fechas desde y hasta y la cantidad de días salen de la licencia médica (Formulario 16) que emitió el médico auditor; si no están, [COMPLETAR]. La categoría y el agrupamiento salen de la situación de revista de Civitas; si no están en el expediente, [COMPLETAR]. Si el encuadre es el art. 19 y ya pasaron los primeros 6 meses, la licencia es con el 50 % de los haberes; si el goce no surge del expediente, [REVISAR: goce de haberes]. Sin modelo propio del área: sigue la estructura del de familiar enfermo; validar.'
),
(
  'LIC-ACCIDENTE', 'resolucion', 'Resolución de licencia por accidente de trabajo',
  'RESOLUCIÓN N.º {{numero_resolucion}}
Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Departamento de Medicina Laboral
San Miguel de Tucumán, {{fecha_resolucion}}

**VISTO:**
El Expediente N.º {{numero_expediente}}, por el cual el/la agente {{agente}}, afiliado/a N.º {{legajo}}, solicita licencia por accidente de trabajo respecto de los días {{fecha_desde}} al {{fecha_hasta}}; y

**CONSIDERANDO:**
Que la petición del/de la agente está reglada por el Decreto N.º EH-337/77, arts. 28 y 29, la Ordenanza N.º 936/87 y su Decreto Reglamentario N.º 10/88;
Que de las constancias de las presentes actuaciones surge que se han cumplido todos los recaudos legales exigidos para la procedencia de la licencia solicitada. A saber:
a. Condición de agente municipal (según la situación de revista consultada en el sistema Civitas).
b. Accidente de trabajo denunciado por el/la agente, ocurrido el {{fecha_accidente}} ({{tipo_accidente}}) (véase la presentación a fs. {{fs}} y la denuncia a fs. {{fs}}).
c. Incapacidad laboral constatada por el médico auditor del Departamento de Medicina Laboral (véase licencia médica a fs. {{fs}}).

Por lo expuesto y en ejercicio de la competencia que le acuerda el Decreto N.º 337/77, art. 64;

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** Hacer lugar a la licencia con goce íntegro de sueldo por accidente de trabajo respecto de los días {{fecha_desde}} al {{fecha_hasta}} a {{agente}}, afiliado/a N.º {{legajo}}, categoría {{categoria}}, agrupamiento {{agrupamiento}}, dependiente de {{dependencia}}, con prestación de servicios en {{reparticion}}, conforme a los considerandos.

**Artículo 2º:** Registrar la presente Resolución en el Registro de Resoluciones de la Dirección de Capital Humano.

**Artículo 3º:** Notificar al/a la agente por medio del sistema de expedientes electrónicos, con constancia de fecha en el expediente. Notificado/a, archívese.',
  'Las referencias "a fs." tomalas de la numeración de fojas del expediente. Si el sentido indicado es NO hacer lugar, el Artículo 1º dice "No hacer lugar al pedido..." con los fundamentos del dictamen, y se omite el porcentaje o la fecha de efecto. Concordá el género (el/la agente) con los datos del agente. Expediente RESERVADO: no transcribas diagnósticos ni datos de salud; referí a "la documentación médica obrante". Las fechas desde y hasta y la cantidad de días salen de la licencia médica (Formulario 16) que emitió el médico auditor; si no están, [COMPLETAR]. La categoría y el agrupamiento salen de la situación de revista de Civitas; si no están en el expediente, [COMPLETAR]. Si es in itinere y no consta la denuncia policial, señalalo con [REVISAR: denuncia policial dentro de las 24 h (art. 29)]. Sin modelo propio del área: validar.'
),
(
  'LIC-FAMILIAR-ENFERMO', 'resolucion', 'Resolución de licencia por familiar enfermo',
  'RESOLUCIÓN N.º {{numero_resolucion}}
Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Departamento de Medicina Laboral
San Miguel de Tucumán, {{fecha_resolucion}}

**VISTO:**
El Expediente N.º {{numero_expediente}}, por el cual el/la agente {{agente}}, afiliado/a N.º {{legajo}}, solicita licencia con goce de sueldo por atención de familiar enfermo respecto de los días {{fecha_desde}} al {{fecha_hasta}}; y

**CONSIDERANDO:**
Que la petición del/de la agente está reglada por el Decreto N.º EH-337/77, art. 50, la Ordenanza N.º 936/87 y su Decreto Reglamentario N.º 10/88;
Que de las constancias de las presentes actuaciones surge que se han cumplido todos los recaudos legales exigidos para la procedencia de la licencia solicitada. A saber:
a. Condición de agente municipal (según la situación de revista consultada en el sistema Civitas).
b. Derecho del/de la agente a diez días hábiles por año calendario para gozar de licencia por atención de familiar enfermo con percepción íntegra de haberes, de los cuales usó {{dias_usados}} días a la fecha del pedido que se tramita por el presente expediente, por lo que le restan {{dias_restantes}} días (véase informe del Departamento de Medicina Laboral a fs. {{fs}}).
c. Enfermedad del familiar del/de la agente que requiere su atención personal (véase declaración jurada que acredita el parentesco y la composición del núcleo familiar a fs. {{fs}}, y el informe del Departamento de Medicina Laboral que acredita la enfermedad y la necesidad de asistencia a fs. {{fs}}).
d. Dictamen de Asesoría Letrada de la Dirección de Capital Humano que aconseja hacer lugar a la licencia (véase fs. {{fs}}).
e. Solicitud temporánea por parte del/de la agente (véase la fecha y hora de inicio del expediente electrónico).

Por lo expuesto y en ejercicio de la competencia que le acuerda el Decreto N.º 337/77, art. 64;

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** Hacer lugar a la licencia con goce de sueldo por atención de familiar enfermo respecto de los días {{fecha_desde}} al {{fecha_hasta}} a {{agente}}, afiliado/a N.º {{legajo}}, categoría {{categoria}}, agrupamiento {{agrupamiento}}, dependiente de {{dependencia}}, con prestación de servicios en {{reparticion}}, conforme a los considerandos.

**Artículo 2º:** Registrar la presente Resolución en el Registro de Resoluciones de la Dirección de Capital Humano.

**Artículo 3º:** Notificar al/a la agente por medio del sistema de expedientes electrónicos, con constancia de fecha en el expediente. Notificado/a, archívese.',
  'Las referencias "a fs." tomalas de la numeración de fojas del expediente. Si el sentido indicado es NO hacer lugar, el Artículo 1º dice "No hacer lugar al pedido..." con los fundamentos del dictamen, y se omite el porcentaje o la fecha de efecto. Concordá el género (el/la agente) con los datos del agente. Expediente RESERVADO: no transcribas diagnósticos ni datos de salud; referí a "la documentación médica obrante". Las fechas desde y hasta y la cantidad de días salen de la licencia médica (Formulario 16) que emitió el médico auditor; si no están, [COMPLETAR]. La categoría y el agrupamiento salen de la situación de revista de Civitas; si no están en el expediente, [COMPLETAR]. Si los días pedidos superan los que le restan en el año, señalalo con [REVISAR: cupo de 10 días hábiles]. Modelo real del área; el recaudo del dictamen se agrega porque el circuito digital pasa por la Asesoría, y los artículos de digitalizar, remitir y archivar se reemplazan por el registro y la notificación electrónica.'
),
(
  'LIC-FAMILIAR-DISC', 'informe', 'Informe de Medicina Laboral (familiar con discapacidad)',
  'Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Departamento de Medicina Laboral
San Miguel de Tucumán, {{fecha}}

A: Asesoría Letrada
De: Departamento de Medicina Laboral

REF.: Expte. N.º {{numero_expediente}}.-

Atento al pedido solicitado y evaluado/a {{familiar}}, D.N.I. N.º {{dni_familiar}}, {{vinculo}} del/de la agente {{agente}}, N.º {{legajo}}, dependiente de {{dependencia}}, este Departamento de Medicina Laboral determina que existen las discapacidades descriptas en el certificado médico adjunto a las presentes actuaciones, las cuales son {{caracter_discapacidad}}.
A fs. {{fs}} consta informe (historia clínica, estudios y plan de tratamiento) emitido por los profesionales intervinientes.
Cabe destacar que el presente pedido debe encuadrarse, según nuestro criterio, en las disposiciones del artículo 4º inc. {{inciso}}; el tratamiento se realizará {{lugar_tratamiento}}, y a fs. {{fs}} consta CUD con fecha de actualización {{vencimiento_cud}}.
El/la agente hará uso de los días de licencia según necesidad; serán auditados y autorizados por el Departamento de Medicina Laboral a través del sistema de licencias médicas.
Al finalizar el período de licencia otorgado, el/la agente deberá acreditar ante este Departamento la documentación de las medidas de rehabilitación y prestaciones realizadas que justifiquen su uso para los fines invocados, a fin de emitir la constancia de conclusión del presente expediente.
Atentamente.-',
  'Expediente RESERVADO: no transcribas diagnósticos; el carácter de la discapacidad es "parcial" o "total" y "transitoria" o "permanente", según el certificado. Usá "con discapacidad", nunca "discapacitado". Si el inciso del art. 4º no surge de la evaluación, [COMPLETAR: inciso]. Modelo real del área.'
),
(
  'LIC-FAMILIAR-DISC', 'dictamen', 'Dictamen sobre licencia especial por familiar con discapacidad',
  'Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Asesoría Legal
San Miguel de Tucumán, {{fecha}}

EXPEDIENTE: {{numero_expediente}}
FECHA: {{fecha_expediente}}
DEPENDENCIA: {{dependencia}}
CAUSANTE: {{agente}}, AF {{legajo}}
ASUNTO: LICENCIA ESPECIAL POR FAMILIAR CON DISCAPACIDAD

A la Dirección de Capital Humano
S/D

**DICTAMEN**

Vienen las presentes actuaciones a este servicio jurídico, por medio de las cuales el/la agente {{agente}}, afiliado/a N.º {{legajo}}, dependiente de {{dependencia}}, solicita licencia especial por {{vinculo}} con discapacidad, {{familiar}}, DNI {{dni_familiar}}.

Documentación obrante en el expediente y normativa aplicable.-
A fs. {{fs}}, obra la solicitud del/de la agente;
A fs. {{fs}}, obran el Certificado Único de Discapacidad, el certificado médico y el plan de tratamiento;
A fs. {{fs}}, obra el informe del Departamento de Medicina Laboral;
Se consultó en el sistema Civitas la situación de revista del/de la agente.

La normativa aplicable es la Ordenanza N.º 5363/24, art. 4º.

Análisis.-
{{analisis}}

Por ello, y conforme a lo considerado, se aconseja {{conclusion}}.

Tal es mi dictamen.',
  'El dictamen no lleva número. {{fecha}} es la fecha de hoy. Las referencias "A fs." tomalas de la numeración de fojas del expediente; la planta, el vínculo y la fecha de alta salen de la consulta de Civitas (si no están en el expediente, [COMPLETAR]). Si la documentación no alcanza para hacer lugar, no lo aconsejes: señalá qué falta. Concordá el género (el/la agente) con los datos del agente. Expediente RESERVADO: no transcribas diagnósticos; referí a "la documentación médica obrante". Usá "con discapacidad", nunca "discapacitado". Priorizá la continuidad del tratamiento. Sin modelo del área: los dictámenes de discapacidad están en estandarización; validar.'
),
(
  'LIC-FAMILIAR-DISC', 'resolucion', 'Resolución de licencia especial por familiar con discapacidad',
  'RESOLUCIÓN N.º {{numero_resolucion}}
Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Departamento de Medicina Laboral
San Miguel de Tucumán, {{fecha_resolucion}}

**VISTO:**
El Expediente N.º {{numero_expediente}}, por el cual el/la agente {{agente}}, afiliado/a N.º {{legajo}}, solicita licencia especial por {{vinculo}} con discapacidad, {{familiar}}, DNI {{dni_familiar}}; y

**CONSIDERANDO:**
Que la petición del/de la agente está reglada por la Ordenanza N.º 5363/24, art. 4º;
Que a fs. {{fs}}, obra el informe del Departamento de Medicina Laboral, que encuadra el pedido en el art. 4º inc. {{inciso}}, con tratamiento {{lugar_tratamiento}};
Que a fs. {{fs}}, obra dictamen de Asesoría Letrada de la Dirección de Capital Humano, aconsejando {{sentido_dictamen}};
Que se consultó en el sistema Civitas la situación de revista del/de la agente;

Por lo expuesto y en ejercicio de la competencia que le acuerda el Decreto N.º 337/77, art. 64;

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** Hacer lugar a la licencia especial {{con_sin_goce}} por {{vinculo}} con discapacidad desde el {{fecha_desde}} hasta el {{fecha_hasta}} a {{agente}}, afiliado/a N.º {{legajo}}, categoría {{categoria}}, agrupamiento {{agrupamiento}}, dependiente de {{dependencia}}, con prestación de servicios en {{reparticion}}, conforme a los considerandos.

**Artículo 2º:** Hacer saber al/a la agente que, al finalizar la licencia, deberá acreditar ante el Departamento de Medicina Laboral las prestaciones realizadas.

**Artículo 3º:** Registrar la presente Resolución en el Registro de Resoluciones de la Dirección de Capital Humano.

**Artículo 4º:** Notificar al/a la agente por medio del sistema de expedientes electrónicos, con constancia de fecha en el expediente. Notificado/a, archívese.',
  'Las referencias "a fs." tomalas de la numeración de fojas del expediente. Si el sentido indicado es NO hacer lugar, el Artículo 1º dice "No hacer lugar al pedido..." con los fundamentos del dictamen, y se omite el porcentaje o la fecha de efecto. Concordá el género (el/la agente) con los datos del agente. Expediente RESERVADO: no transcribas diagnósticos ni datos de salud; referí a "la documentación médica obrante". Las fechas desde y hasta y la cantidad de días salen de la licencia médica (Formulario 16) que emitió el médico auditor; si no están, [COMPLETAR]. La categoría y el agrupamiento salen de la situación de revista de Civitas; si no están en el expediente, [COMPLETAR]. Usá "con discapacidad", nunca "discapacitado". {{con_sin_goce}} sale del campo "Goce de haberes" ("con goce de haberes" o "sin goce de haberes"). Controlá que los días estén dentro del rango del lugar del tratamiento (con goce: de 30 a 90 días dentro de la provincia o de 30 a 180 fuera; sin goce: hasta 60 o 120); si no, [REVISAR: rango de días]. Si el pedido es el pago especial, [COMPLETAR: alcance del pago especial]. Sin modelo del área: hoy la resolución la redacta la Secretaría de dependencia; validar competencia.'
),
(
  'MAT-PREPARTO', 'resolucion', 'Resolución de licencia por maternidad (preparto)',
  'RESOLUCIÓN N.º {{numero_resolucion}}
Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Departamento de Medicina Laboral
San Miguel de Tucumán, {{fecha_resolucion}}

**VISTO:**
El Expediente N.º {{numero_expediente}}, por el cual la agente {{agente}}, afiliada N.º {{legajo}}, solicita licencia por maternidad a partir del {{fecha_desde}}{{opcion_reduccion}}; y

**CONSIDERANDO:**
Que la petición de la agente está reglada por el Decreto N.º 337/77, arts. 32 a 38, y su modificatoria, la Ordenanza N.º 223/84, art. 1º;
Que de las constancias de las presentes actuaciones surge que se han cumplido todos los recaudos legales exigidos para la procedencia de la licencia solicitada. A saber:
a. Condición de agente municipal (según la situación de revista consultada en el sistema Civitas).
b. Antigüedad mínima en el municipio superior a un mes (véase informe del Departamento de Medicina Laboral a fs. {{fs}}).
c. Antigüedad mínima en cualquier actividad en relación de dependencia superior a seis meses en el transcurso de los doce meses anteriores a la fecha de iniciación del último empleo (véase informe del Departamento de Medicina Laboral a fs. {{fs}}).
d. Embarazo constatado por la Dirección de Capital Humano (véase informe del Departamento de Medicina Laboral a fs. {{fs}}).

Por lo expuesto y en ejercicio de la competencia que le acuerda el Decreto N.º 337/77, art. 64;

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** Hacer lugar a la licencia por maternidad (preparto) con goce de sueldo a {{agente}}, afiliado/a N.º {{legajo}}, categoría {{categoria}}, agrupamiento {{agrupamiento}}, dependiente de {{dependencia}}, con prestación de servicios en {{reparticion}}, a partir del {{fecha_desde}} hasta el {{fecha_hasta}}, conforme a los considerandos.

**Artículo 2º:** Hacer saber a la agente que, producido el parto, deberá iniciar la licencia por maternidad (postparto) con el acta de nacimiento.

**Artículo 3º:** Registrar la presente Resolución en el Registro de Resoluciones de la Dirección de Capital Humano.

**Artículo 4º:** Notificar al/a la agente por medio del sistema de expedientes electrónicos, con constancia de fecha en el expediente. Notificado/a, archívese.',
  'Las referencias "a fs." tomalas de la numeración de fojas del expediente. Si el sentido indicado es NO hacer lugar, el Artículo 1º dice "No hacer lugar al pedido..." con los fundamentos del dictamen, y se omite el porcentaje o la fecha de efecto. Concordá el género (el/la agente) con los datos del agente. Expediente RESERVADO: no transcribas diagnósticos ni datos de salud; referí a "la documentación médica obrante". Las fechas desde y hasta y la cantidad de días salen de la licencia médica (Formulario 16) que emitió el médico auditor; si no están, [COMPLETAR]. La categoría y el agrupamiento salen de la situación de revista de Civitas; si no están en el expediente, [COMPLETAR]. {{opcion_reduccion}}: si la agente opta por reducir el preparto, ", manifestando que opta por la reducción del período preparto en [N] días a fin de que sean adicionados al período postparto en la misma extensión"; si no, nada. Modelo real del área (lo firmaron la Coordinación de Medicina Laboral y la Directora).'
),
(
  'MAT-POSTPARTO', 'resolucion', 'Resolución de licencia por maternidad (postparto)',
  'RESOLUCIÓN N.º {{numero_resolucion}}
Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Departamento de Medicina Laboral
San Miguel de Tucumán, {{fecha_resolucion}}

**VISTO:**
El Expediente N.º {{numero_expediente}}, por el cual la agente {{agente}}, afiliada N.º {{legajo}}, solicita licencia postparto a partir del {{fecha_desde}} al {{fecha_hasta}}, con goce de sueldo; y

**CONSIDERANDO:**
Que la petición de la agente está reglada por el Decreto N.º E-H 337/77, artículo 32 y subsiguientes, y su modificatoria, la Ordenanza N.º 223/84;
Que la Dirección de Capital Humano emitió la Resolución N.º {{resolucion_preparto}} otorgando licencia por maternidad (preparto) a partir del {{desde_preparto}};
Que la agente adjuntó el acta de nacimiento de {{familiar}}, por lo cual corresponde conceder la licencia por maternidad (postparto) por el tiempo restante;
Que se ha dado cumplimiento a los requisitos de tiempo y forma establecidos por la norma vigente;

Por ello, y de conformidad con las facultades conferidas por el artículo 64 del Decreto N.º E-H 337/77;

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** Hacer lugar a la licencia por maternidad (postparto) con goce de sueldo a {{agente}}, afiliado/a N.º {{legajo}}, categoría {{categoria}}, agrupamiento {{agrupamiento}}, dependiente de {{dependencia}}, con prestación de servicios en {{reparticion}}, a partir del {{fecha_desde}} al {{fecha_hasta}}, por los considerandos que anteceden.

**Artículo 2º:** Registrar la presente Resolución en el Registro de Resoluciones de la Dirección de Capital Humano.

**Artículo 3º:** Notificar al/a la agente por medio del sistema de expedientes electrónicos, con constancia de fecha en el expediente. Notificado/a, archívese.',
  'Las referencias "a fs." tomalas de la numeración de fojas del expediente. Si el sentido indicado es NO hacer lugar, el Artículo 1º dice "No hacer lugar al pedido..." con los fundamentos del dictamen, y se omite el porcentaje o la fecha de efecto. Concordá el género (el/la agente) con los datos del agente. Expediente RESERVADO: no transcribas diagnósticos ni datos de salud; referí a "la documentación médica obrante". Las fechas desde y hasta y la cantidad de días salen de la licencia médica (Formulario 16) que emitió el médico auditor; si no están, [COMPLETAR]. La categoría y el agrupamiento salen de la situación de revista de Civitas; si no están en el expediente, [COMPLETAR]. Si no hubo licencia preparto (parto anticipado), eliminá el considerando de la resolución de preparto. Modelo real del área.'
),
(
  'MAT-LACTANCIA', 'resolucion', 'Resolución de permiso de lactancia',
  'RESOLUCIÓN N.º {{numero_resolucion}}
Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Departamento de Medicina Laboral
San Miguel de Tucumán, {{fecha_resolucion}}

**VISTO:**
El Expediente N.º {{numero_expediente}}, por el cual la agente {{agente}}, afiliada N.º {{legajo}}, solicita permiso por lactancia de una (1) hora diaria a partir del {{fecha_desde}}; y

**CONSIDERANDO:**
Que la petición de la agente está reglada por el Decreto N.º 337/77, art. 39;
Que la Dirección de Capital Humano otorgó licencia por maternidad preparto por Resolución N.º {{resolucion_preparto}} y postparto por Resolución N.º {{resolucion_postparto}};
Que la agente hizo uso de la opción legal de gozar del permiso de lactancia (véase su manifestación a fs. {{fs}});
Que se ha dado cumplimiento en tiempo y forma a los requisitos determinados por la normativa vigente;

Por ello, y en ejercicio de las facultades conferidas por el Decreto N.º E-H 337/77, art. 64;

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** CONCEDER permiso de lactancia de una (1) hora diaria a partir del {{fecha_desde}} hasta que su hijo/a cumpla un año, a la agente {{agente}}, afiliado/a N.º {{legajo}}, categoría {{categoria}}, agrupamiento {{agrupamiento}}, dependiente de {{dependencia}}, con prestación de servicios en {{reparticion}}, por los considerandos que anteceden.

**Artículo 2º:** Registrar la presente Resolución en el Registro de Resoluciones de la Dirección de Capital Humano.

**Artículo 3º:** Notificar al/a la agente por medio del sistema de expedientes electrónicos, con constancia de fecha en el expediente. Notificado/a, archívese.',
  'Las referencias "a fs." tomalas de la numeración de fojas del expediente. Si el sentido indicado es NO hacer lugar, el Artículo 1º dice "No hacer lugar al pedido..." con los fundamentos del dictamen, y se omite el porcentaje o la fecha de efecto. Concordá el género (el/la agente) con los datos del agente. Si no constan las resoluciones de preparto o postparto, eliminá lo que falte o marcá [COMPLETAR]. Modelo real del área.'
),
(
  'RECON-BONIF', 'dictamen', 'Dictamen sobre el recurso de reconsideración',
  'Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Asesoría Legal
San Miguel de Tucumán, {{fecha}}

EXPEDIENTE: {{numero_expediente}}
FECHA: {{fecha_expediente}}
DEPENDENCIA: {{dependencia}}
CAUSANTE: {{agente}}, AF {{legajo}}
ASUNTO: RECURSO DE RECONSIDERACIÓN

A la Dirección de Capital Humano
S/D

**DICTAMEN**

Vienen las presentes actuaciones a este servicio jurídico, por medio de las cuales el/la agente {{agente}}, AF {{legajo}}, dependiente de {{dependencia}}, interpone recurso de reconsideración contra la Resolución N.º {{resolucion_recurrida}}, dictada en el Expediente N.º {{expediente_origen}} ({{tramite_origen}}).

Admisibilidad formal.-
El recurso fue interpuesto el {{fecha_expediente}}, dentro del plazo de ocho (8) días hábiles desde la notificación de la resolución recurrida.

Fundamentos del recurso.-
{{fundamentos}}

Análisis.-
{{analisis}}

Por ello, y conforme a lo considerado, se aconseja {{conclusion}} el recurso de reconsideración interpuesto{{en_consecuencia}}.

Tal es mi dictamen.',
  'El dictamen no lleva número. {{fecha}} es la fecha de hoy. Las referencias "A fs." tomalas de la numeración de fojas del expediente; la planta, el vínculo y la fecha de alta salen de la consulta de Civitas (si no están en el expediente, [COMPLETAR]). Si la documentación no alcanza para hacer lugar, no lo aconsejes: señalá qué falta. Concordá el género (el/la agente) con los datos del agente. Lo recurrido (los datos, el dictamen y la resolución del expediente de origen) está en <expediente_recurrido>; la resolución recurrida, el expediente de origen y el trámite salen de los datos del recurso. Resumí los fundamentos del/de la agente sin agregar nada; si sumó documentación nueva, decí qué aporta. {{conclusion}} es "HACER LUGAR" o "NO HACER LUGAR"; {{hacer_lugar}}, "Hacer lugar" o "No hacer lugar". Si se hace lugar, {{en_consecuencia}} es ", y en consecuencia [lo que se otorga o se corrige, con la fecha de efecto]"; si no, queda vacío. Si no se hace lugar, agregá antes del registro un artículo que haga saber al/a la agente que puede interponer el recurso jerárquico: [COMPLETAR: plazo y ante quién]. No inventes normas: lo que no esté en el expediente va como [COMPLETAR]. Sin modelo del área: validar.'
),
(
  'RECON-BONIF', 'resolucion', 'Resolución del recurso de reconsideración',
  'RESOLUCIÓN N.º {{numero_resolucion}}
Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Área Bonificaciones
San Miguel de Tucumán, {{fecha_resolucion}}

**VISTO:**
El Expediente N.º {{numero_expediente}}, de fecha {{fecha_expediente}}, por el cual el/la agente {{agente}}, afiliado/a N.º {{legajo}}, dependiente de {{dependencia}}, y con prestación de servicios en {{reparticion}}, interpone recurso de reconsideración contra la Resolución N.º {{resolucion_recurrida}}, dictada en el Expediente N.º {{expediente_origen}}; y

**CONSIDERANDO:**
Que a fs. {{fs}}, obra el recurso de reconsideración interpuesto por el/la agente, con sus fundamentos;
Que el recurso fue interpuesto dentro del plazo de ocho (8) días hábiles desde la notificación de la resolución recurrida;
Que a fs. {{fs}}, obra dictamen de Asesoría Letrada de la Dirección de Capital Humano, aconsejando {{sentido_dictamen}};

Por lo expuesto y en ejercicio de la competencia que le acuerda [COMPLETAR: norma de competencia];

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** {{hacer_lugar}} al recurso de reconsideración interpuesto por el/la agente {{agente}}, afiliado/a N.º {{legajo}}, contra la Resolución N.º {{resolucion_recurrida}}{{en_consecuencia}}, conforme a los considerandos que anteceden.

**Artículo 2º:** Registrar la presente Resolución en el Registro de Resoluciones de la Dirección de Capital Humano.

**Artículo 3º:** Notificar al/a la agente por medio del sistema de expedientes electrónicos, con constancia de fecha en el expediente. Notificado/a, archívese.',
  'Las referencias "a fs." tomalas de la numeración de fojas del expediente. Si el sentido indicado es NO hacer lugar, el Artículo 1º dice "No hacer lugar al pedido..." con los fundamentos del dictamen, y se omite el porcentaje o la fecha de efecto. Concordá el género (el/la agente) con los datos del agente. Lo recurrido (los datos, el dictamen y la resolución del expediente de origen) está en <expediente_recurrido>; la resolución recurrida, el expediente de origen y el trámite salen de los datos del recurso. Resumí los fundamentos del/de la agente sin agregar nada; si sumó documentación nueva, decí qué aporta. {{conclusion}} es "HACER LUGAR" o "NO HACER LUGAR"; {{hacer_lugar}}, "Hacer lugar" o "No hacer lugar". Si se hace lugar, {{en_consecuencia}} es ", y en consecuencia [lo que se otorga o se corrige, con la fecha de efecto]"; si no, queda vacío. Si no se hace lugar, agregá antes del registro un artículo que haga saber al/a la agente que puede interponer el recurso jerárquico: [COMPLETAR: plazo y ante quién]. No inventes normas: lo que no esté en el expediente va como [COMPLETAR]. Sin modelo del área: validar.'
),
(
  'RECON-MEDLAB', 'dictamen', 'Dictamen sobre el recurso de reconsideración',
  'Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Asesoría Legal
San Miguel de Tucumán, {{fecha}}

EXPEDIENTE: {{numero_expediente}}
FECHA: {{fecha_expediente}}
DEPENDENCIA: {{dependencia}}
CAUSANTE: {{agente}}, AF {{legajo}}
ASUNTO: RECURSO DE RECONSIDERACIÓN

A la Dirección de Capital Humano
S/D

**DICTAMEN**

Vienen las presentes actuaciones a este servicio jurídico, por medio de las cuales el/la agente {{agente}}, AF {{legajo}}, dependiente de {{dependencia}}, interpone recurso de reconsideración contra la Resolución N.º {{resolucion_recurrida}}, dictada en el Expediente N.º {{expediente_origen}} ({{tramite_origen}}).

Admisibilidad formal.-
El recurso fue interpuesto el {{fecha_expediente}}, dentro del plazo de ocho (8) días hábiles desde la notificación de la resolución recurrida.

Fundamentos del recurso.-
{{fundamentos}}

Análisis.-
{{analisis}}

Por ello, y conforme a lo considerado, se aconseja {{conclusion}} el recurso de reconsideración interpuesto{{en_consecuencia}}.

Tal es mi dictamen.',
  'El dictamen no lleva número. {{fecha}} es la fecha de hoy. Las referencias "A fs." tomalas de la numeración de fojas del expediente; la planta, el vínculo y la fecha de alta salen de la consulta de Civitas (si no están en el expediente, [COMPLETAR]). Si la documentación no alcanza para hacer lugar, no lo aconsejes: señalá qué falta. Concordá el género (el/la agente) con los datos del agente. Lo recurrido (los datos, el dictamen y la resolución del expediente de origen) está en <expediente_recurrido>; la resolución recurrida, el expediente de origen y el trámite salen de los datos del recurso. Resumí los fundamentos del/de la agente sin agregar nada; si sumó documentación nueva, decí qué aporta. {{conclusion}} es "HACER LUGAR" o "NO HACER LUGAR"; {{hacer_lugar}}, "Hacer lugar" o "No hacer lugar". Si se hace lugar, {{en_consecuencia}} es ", y en consecuencia [lo que se otorga o se corrige, con la fecha de efecto]"; si no, queda vacío. Si no se hace lugar, agregá antes del registro un artículo que haga saber al/a la agente que puede interponer el recurso jerárquico: [COMPLETAR: plazo y ante quién]. No inventes normas: lo que no esté en el expediente va como [COMPLETAR]. Sin modelo del área: validar.'
),
(
  'RECON-MEDLAB', 'resolucion', 'Resolución del recurso de reconsideración',
  'RESOLUCIÓN N.º {{numero_resolucion}}
Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Departamento de Medicina Laboral
San Miguel de Tucumán, {{fecha_resolucion}}

**VISTO:**
El Expediente N.º {{numero_expediente}}, de fecha {{fecha_expediente}}, por el cual el/la agente {{agente}}, afiliado/a N.º {{legajo}}, dependiente de {{dependencia}}, y con prestación de servicios en {{reparticion}}, interpone recurso de reconsideración contra la Resolución N.º {{resolucion_recurrida}}, dictada en el Expediente N.º {{expediente_origen}}; y

**CONSIDERANDO:**
Que a fs. {{fs}}, obra el recurso de reconsideración interpuesto por el/la agente, con sus fundamentos;
Que el recurso fue interpuesto dentro del plazo de ocho (8) días hábiles desde la notificación de la resolución recurrida;
Que a fs. {{fs}}, obra dictamen de Asesoría Letrada de la Dirección de Capital Humano, aconsejando {{sentido_dictamen}};

Por lo expuesto y en ejercicio de la competencia que le acuerda [COMPLETAR: norma de competencia];

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** {{hacer_lugar}} al recurso de reconsideración interpuesto por el/la agente {{agente}}, afiliado/a N.º {{legajo}}, contra la Resolución N.º {{resolucion_recurrida}}{{en_consecuencia}}, conforme a los considerandos que anteceden.

**Artículo 2º:** Registrar la presente Resolución en el Registro de Resoluciones de la Dirección de Capital Humano.

**Artículo 3º:** Notificar al/a la agente por medio del sistema de expedientes electrónicos, con constancia de fecha en el expediente. Notificado/a, archívese.',
  'Las referencias "a fs." tomalas de la numeración de fojas del expediente. Si el sentido indicado es NO hacer lugar, el Artículo 1º dice "No hacer lugar al pedido..." con los fundamentos del dictamen, y se omite el porcentaje o la fecha de efecto. Concordá el género (el/la agente) con los datos del agente. Lo recurrido (los datos, el dictamen y la resolución del expediente de origen) está en <expediente_recurrido>; la resolución recurrida, el expediente de origen y el trámite salen de los datos del recurso. Resumí los fundamentos del/de la agente sin agregar nada; si sumó documentación nueva, decí qué aporta. {{conclusion}} es "HACER LUGAR" o "NO HACER LUGAR"; {{hacer_lugar}}, "Hacer lugar" o "No hacer lugar". Si se hace lugar, {{en_consecuencia}} es ", y en consecuencia [lo que se otorga o se corrige, con la fecha de efecto]"; si no, queda vacío. Si no se hace lugar, agregá antes del registro un artículo que haga saber al/a la agente que puede interponer el recurso jerárquico: [COMPLETAR: plazo y ante quién]. No inventes normas: lo que no esté en el expediente va como [COMPLETAR]. Sin modelo del área: validar.'
)
) as p(codigo, tipo, nombre, cuerpo, instrucciones)
join public.tipos_tramite t on t.codigo = p.codigo;
