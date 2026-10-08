-- =====================================================================
-- Catálogo de Capital Humano: áreas, trámites, circuitos y modelos.
-- GENERADO por scripts/generar-catalogo.ts desde src/lib/semilla/catalogo.ts
-- (npm run catalogo). No editar a mano.
--
-- Bonificaciones y asignaciones: relevamiento del Área Bonificaciones del
-- 07/10/2026 (circuito FINAL DIGITAL corregido). Licencias: provisorio.
-- Idempotente: se puede aplicar sobre un proyecto que ya tiene catálogo.
-- No crea usuarios.
-- =====================================================================

-- Áreas
insert into public.areas (codigo, nombre, descripcion) values
  ('MESA', 'Mesa de Entradas', 'Recepción y notificaciones. En el circuito digital de Bonificaciones no interviene.'),
  ('BONIF', 'Área Bonificaciones', 'Adicionales por título y asignaciones familiares: control, proyectos de resolución y novedades a Liquidación'),
  ('LIC', 'Sección Licencias', 'Control de licencias y días disponibles (provisorio)'),
  ('MEDLAB', 'Departamento de Medicina Laboral', 'Entrevistas e informes médicos'),
  ('DICT', 'Asesoría Legal', 'Dictámenes jurídicos de la Dirección de Capital Humano'),
  ('DESP', 'Despacho', 'Proyectos de resolución (provisorio, trámites de licencias)'),
  ('DIR', 'Dirección de Capital Humano', 'Control y firma de resoluciones'),
  ('LIQ', 'Liquidación de Haberes', 'Impacto de las novedades en la liquidación')
on conflict (codigo) do update set nombre = excluded.nombre, descripcion = excluded.descripcion;

-- Áreas ajenas a Capital Humano: se borran si no tienen circuitos, expedientes ni fojas (las membresías caen en cascada)
delete from public.areas a
 where a.codigo in ('FISC', 'SGOB')
   and not exists (select 1 from public.pasos_circuito p where p.area_id = a.id)
   and not exists (select 1 from public.expedientes e where e.area_actual_id = a.id)
   and not exists (select 1 from public.movimientos m where m.desde_area_id = a.id or m.hacia_area_id = a.id)
   and not exists (select 1 from public.actuaciones x where x.area_id = a.id);

-- Trámites retirados: se desactivan y, si no tienen expedientes, se borran (con sus pasos y modelos)
update public.tipos_tramite set activo = false where codigo in ('BONIF-TITULO', 'ASIG-FAMILIAR');
delete from public.tipos_tramite t
 where t.codigo in ('BONIF-TITULO', 'ASIG-FAMILIAR')
   and not exists (select 1 from public.expedientes e where e.tipo_tramite_id = t.id);

-- Tipos de trámite
insert into public.tipos_tramite
  (codigo, nombre, descripcion, categoria, icono, normativa, requisitos, formulario, plazo_dias, linea_base_dias,
   prioridad_base, reservado, firma_registrada, activo, codigo_relevamiento, oficina, pasos_actuales, documentacion_final)
values
(
  'BONIF-TIT-SEC', 'Adicional por título secundario',
  'Pago del adicional salarial por título secundario.',
  'Bonificaciones por título', 'school',
  'Decretos N.º 82/77, 23/81, 1320/01 y 143/79 (art. 5º) y Ordenanza N.º 3537/04, según el modelo de resolución del Área Bonificaciones. Porcentaje: 17,5 % de la categoría de revista.',
  '[{"clave":"certificado_analitico","nombre":"Certificado analítico","descripcion":"Copia certificada","obligatorio":true},{"clave":"diploma","nombre":"Diploma autenticado","descripcion":"Copia certificada, anverso y reverso","obligatorio":true}]'::jsonb,
  '[{"clave":"titulo_obtenido","etiqueta":"Título obtenido","tipo":"texto","obligatorio":true,"ayuda":"Tal como figura en el diploma"},{"clave":"institucion","etiqueta":"Institución que lo expide","tipo":"texto","obligatorio":true},{"clave":"fecha_egreso","etiqueta":"Fecha de egreso","tipo":"fecha","obligatorio":true}]'::jsonb,
  10, null, 'normal', false, true, true,
  '001', 'Área Bonificaciones', 8, array['certificado_analitico', 'diploma']::text[]
),
(
  'BONIF-TIT-TER', 'Adicional por título terciario',
  'Pago del adicional salarial por título terciario.',
  'Bonificaciones por título', 'book-open',
  'Decretos N.º 82/77, 23/81, 1320/01 y 143/79 (art. 5º) y Ordenanza N.º 3537/04, según el modelo de resolución del Área Bonificaciones. [COMPLETAR por Capital Humano: confirmar la norma y el porcentaje para el título terciario; solo hay modelo para el secundario].',
  '[{"clave":"certificado_analitico","nombre":"Certificado analítico","descripcion":"Copia certificada","obligatorio":true},{"clave":"diploma","nombre":"Diploma autenticado","descripcion":"Copia certificada, anverso y reverso","obligatorio":true}]'::jsonb,
  '[{"clave":"titulo_obtenido","etiqueta":"Título obtenido","tipo":"texto","obligatorio":true,"ayuda":"Tal como figura en el diploma"},{"clave":"institucion","etiqueta":"Institución que lo expide","tipo":"texto","obligatorio":true},{"clave":"fecha_egreso","etiqueta":"Fecha de egreso","tipo":"fecha","obligatorio":true}]'::jsonb,
  10, null, 'normal', false, true, true,
  '002', 'Área Bonificaciones', 8, array['certificado_analitico', 'diploma']::text[]
),
(
  'BONIF-TIT-UNI', 'Adicional por título universitario',
  'Pago del adicional salarial por título universitario.',
  'Bonificaciones por título', 'graduation-cap',
  'Decretos N.º 82/77, 23/81, 1320/01 y 143/79 (art. 5º) y Ordenanza N.º 3537/04, según el modelo de resolución del Área Bonificaciones. [COMPLETAR por Capital Humano: confirmar la norma y el porcentaje para el título universitario; solo hay modelo para el secundario].',
  '[{"clave":"diploma","nombre":"Diploma autenticado","descripcion":"Copia certificada, anverso y reverso","obligatorio":true}]'::jsonb,
  '[{"clave":"titulo_obtenido","etiqueta":"Título obtenido","tipo":"texto","obligatorio":true,"ayuda":"Tal como figura en el diploma"},{"clave":"institucion","etiqueta":"Institución que lo expide","tipo":"texto","obligatorio":true},{"clave":"fecha_egreso","etiqueta":"Fecha de egreso","tipo":"fecha","obligatorio":true}]'::jsonb,
  10, null, 'normal', false, true, true,
  '003', 'Área Bonificaciones', 8, array['diploma']::text[]
),
(
  'BAJA-DIVORCIO', 'Baja de asignación por cónyuge por divorcio',
  'Cese del pago de la asignación familiar por cónyuge a raíz del divorcio.',
  'Bajas de asignaciones', 'user-minus',
  'Competencia: Decreto N.º 143/G/79, art. 2º (según los modelos de resolución del Área Bonificaciones). [COMPLETAR por Capital Humano: régimen de asignaciones familiares aplicable y montos].',
  '[{"clave":"sentencia_divorcio","nombre":"Sentencia judicial de divorcio","descripcion":"O acta de matrimonio con la anotación del divorcio","obligatorio":true}]'::jsonb,
  '[{"clave":"familiar","etiqueta":"Apellido y nombre del/de la ex cónyuge","tipo":"texto","obligatorio":true},{"clave":"dni_familiar","etiqueta":"DNI del/de la ex cónyuge","tipo":"texto","obligatorio":true},{"clave":"fecha_divorcio","etiqueta":"Fecha de la sentencia de divorcio","tipo":"fecha","obligatorio":true}]'::jsonb,
  5, null, 'normal', false, true, true,
  '004', 'Área Bonificaciones', 8, array['sentencia_divorcio']::text[]
),
(
  'BAJA-FALLECIMIENTO', 'Baja de asignación por fallecimiento',
  'Cese del pago de la asignación familiar por fallecimiento del hijo/a o del cónyuge.',
  'Bajas de asignaciones', 'user-minus',
  'Competencia: Decreto N.º 143/G/79, art. 2º (según los modelos de resolución del Área Bonificaciones). [COMPLETAR por Capital Humano: régimen de asignaciones familiares aplicable y montos].',
  '[{"clave":"acta_defuncion","nombre":"Acta de defunción","obligatorio":true}]'::jsonb,
  '[{"clave":"vinculo","etiqueta":"Vínculo con la persona fallecida","tipo":"seleccion","obligatorio":true,"opciones":["Cónyuge","Hijo/a"]},{"clave":"familiar","etiqueta":"Apellido y nombre del familiar","tipo":"texto","obligatorio":true},{"clave":"dni_familiar","etiqueta":"DNI del familiar","tipo":"texto","obligatorio":true},{"clave":"fecha_fallecimiento","etiqueta":"Fecha de fallecimiento","tipo":"fecha","obligatorio":true}]'::jsonb,
  5, null, 'normal', false, true, true,
  '005', 'Área Bonificaciones', 8, array['acta_defuncion']::text[]
),
(
  'BAJA-ESTUDIOS', 'Baja de asignación por hijo/a por interrupción de estudios',
  'Cese del pago de la asignación familiar por hijo/a cuando deja de estudiar.',
  'Bajas de asignaciones', 'user-minus',
  'Competencia: Decreto N.º 143/G/79, art. 2º (según los modelos de resolución del Área Bonificaciones). [COMPLETAR por Capital Humano: régimen de asignaciones familiares aplicable y montos].',
  '[{"clave":"certificado_estudios","nombre":"Certificado de estudios con fecha hasta","descripcion":"Indica hasta cuándo cursó el hijo/a","obligatorio":true},{"clave":"ddjj_interrupcion","nombre":"Declaración jurada de interrupción de estudios","descripcion":"Formulario 9.1, si no tenés el certificado","obligatorio":false}]'::jsonb,
  '[{"clave":"familiar","etiqueta":"Apellido y nombre del hijo/a","tipo":"texto","obligatorio":true},{"clave":"dni_familiar","etiqueta":"DNI del hijo/a","tipo":"texto","obligatorio":true},{"clave":"fecha_interrupcion","etiqueta":"Fecha de interrupción de los estudios","tipo":"fecha","obligatorio":true}]'::jsonb,
  10, null, 'normal', false, true, true,
  '006', 'Área Bonificaciones', 8, array['certificado_estudios', 'ddjj_interrupcion']::text[]
),
(
  'BAJA-PARTICULAR', 'Baja de asignación por motivos particulares',
  'Pedido del/de la agente para dejar de percibir una asignación familiar.',
  'Bajas de asignaciones', 'user-minus',
  'Competencia: Decreto N.º 143/G/79, art. 2º (según los modelos de resolución del Área Bonificaciones). [COMPLETAR por Capital Humano: régimen de asignaciones familiares aplicable y montos].',
  '[]'::jsonb,
  '[{"clave":"asignacion","etiqueta":"Asignación que querés dar de baja","tipo":"seleccion","obligatorio":true,"opciones":["Por cónyuge","Por hijo/a","Por hijo/a con discapacidad","Prenatal","Otra"]},{"clave":"familiar","etiqueta":"Apellido y nombre del familiar","tipo":"texto","obligatorio":false,"ayuda":"Si la asignación es por un familiar"},{"clave":"dni_familiar","etiqueta":"DNI del familiar","tipo":"texto","obligatorio":false},{"clave":"desde","etiqueta":"A partir de","tipo":"fecha","obligatorio":true},{"clave":"motivo","etiqueta":"Motivo","tipo":"texto_largo","obligatorio":true}]'::jsonb,
  10, null, 'normal', false, true, true,
  '007', 'Área Bonificaciones', 8, '{}'::text[]
),
(
  'ASIG-HIJO', 'Asignación familiar por hijo/a',
  'Pago de la asignación familiar por hijo/a.',
  'Asignaciones familiares', 'users',
  'Competencia: Decreto N.º 143/G/79, art. 2º (según los modelos de resolución del Área Bonificaciones). [COMPLETAR por Capital Humano: régimen de asignaciones familiares aplicable y montos]. [COMPLETAR por Capital Humano: edad máxima, escolaridad exigida y vigencia].',
  '[{"clave":"acta_nacimiento","nombre":"Acta de nacimiento del hijo/a","obligatorio":true},{"clave":"negativa_anses","nombre":"Negativa de ANSES de la madre o del padre","descripcion":"Certifica que el otro progenitor no percibe la asignación","obligatorio":true},{"clave":"certificado_escolaridad","nombre":"Certificado de escolaridad","descripcion":"Cuando el hijo/a está escolarizado","obligatorio":false}]'::jsonb,
  '[{"clave":"familiar","etiqueta":"Apellido y nombre del hijo/a","tipo":"texto","obligatorio":true},{"clave":"dni_familiar","etiqueta":"DNI del hijo/a","tipo":"texto","obligatorio":true},{"clave":"fecha_nacimiento","etiqueta":"Fecha de nacimiento","tipo":"fecha","obligatorio":true}]'::jsonb,
  10, null, 'normal', false, true, true,
  '008', 'Área Bonificaciones', 8, array['acta_nacimiento', 'negativa_anses', 'certificado_escolaridad']::text[]
),
(
  'ASIG-HIJO-DISC', 'Asignación familiar por hijo/a con discapacidad',
  'Alta o renovación de la asignación familiar por hijo/a con discapacidad.',
  'Asignaciones familiares', 'heart-handshake',
  'Competencia: Decreto N.º 143/G/79, art. 2º (según los modelos de resolución del Área Bonificaciones). [COMPLETAR por Capital Humano: régimen de asignaciones familiares aplicable y montos]. Ley 26.378 (Convención sobre los Derechos de las Personas con Discapacidad).',
  '[{"clave":"cud","nombre":"Certificado Único de Discapacidad (CUD)","descripcion":"Vigente","obligatorio":true},{"clave":"acta_nacimiento","nombre":"Acta de nacimiento del hijo/a","obligatorio":true},{"clave":"negativa_anses","nombre":"Negativa de ANSES de la madre o del padre","obligatorio":true},{"clave":"certificado_escolaridad","nombre":"Certificado de escolaridad","descripcion":"Cuando el hijo/a está escolarizado","obligatorio":false},{"clave":"resolucion_anterior","nombre":"Resolución anterior","descripcion":"Solo en la renovación del CUD","obligatorio":false}]'::jsonb,
  '[{"clave":"tipo_solicitud","etiqueta":"Tipo de solicitud","tipo":"seleccion","obligatorio":true,"opciones":["Alta","Renovación del CUD"]},{"clave":"familiar","etiqueta":"Apellido y nombre del hijo/a","tipo":"texto","obligatorio":true},{"clave":"dni_familiar","etiqueta":"DNI del hijo/a","tipo":"texto","obligatorio":true},{"clave":"vencimiento_cud","etiqueta":"Vencimiento del CUD","tipo":"fecha","obligatorio":true,"ayuda":"Sirve para avisarte antes de que venza"}]'::jsonb,
  5, null, 'alta', true, true, true,
  '009', 'Área Bonificaciones', 9, array['cud', 'acta_nacimiento', 'negativa_anses', 'certificado_escolaridad']::text[]
),
(
  'ASIG-MATRIMONIO', 'Asignación familiar por matrimonio',
  'Pago de la asignación familiar por matrimonio del/de la agente.',
  'Asignaciones familiares', 'heart',
  'Competencia: Decreto N.º 143/G/79, art. 2º (según los modelos de resolución del Área Bonificaciones). [COMPLETAR por Capital Humano: régimen de asignaciones familiares aplicable y montos].',
  '[{"clave":"acta_matrimonio","nombre":"Acta de matrimonio","obligatorio":true}]'::jsonb,
  '[{"clave":"familiar","etiqueta":"Apellido y nombre del/de la cónyuge","tipo":"texto","obligatorio":true},{"clave":"dni_familiar","etiqueta":"DNI del/de la cónyuge","tipo":"texto","obligatorio":true},{"clave":"fecha_matrimonio","etiqueta":"Fecha de matrimonio","tipo":"fecha","obligatorio":true}]'::jsonb,
  10, null, 'normal', false, true, true,
  '010', 'Área Bonificaciones', 8, array['acta_matrimonio']::text[]
),
(
  'ASIG-NACIMIENTO', 'Asignación familiar por nacimiento',
  'Pago de la asignación familiar por nacimiento de hijo/a.',
  'Asignaciones familiares', 'baby',
  'Competencia: Decreto N.º 143/G/79, art. 2º (según los modelos de resolución del Área Bonificaciones). [COMPLETAR por Capital Humano: régimen de asignaciones familiares aplicable y montos].',
  '[{"clave":"acta_nacimiento","nombre":"Acta de nacimiento del hijo/a","obligatorio":true},{"clave":"negativa_anses","nombre":"Negativa de ANSES de la madre o del padre","descripcion":"Certifica que el otro progenitor no percibe la asignación","obligatorio":true},{"clave":"no_percepcion_empleador","nombre":"Certificado de no percepción de salario familiar del empleador","descripcion":"Solo si la negativa de ANSES muestra al otro progenitor como trabajador registrado","obligatorio":false},{"clave":"certificado_discapacidad","nombre":"Certificado Único de Discapacidad (CUD)","descripcion":"Solo si el hijo/a tiene discapacidad","obligatorio":false}]'::jsonb,
  '[{"clave":"familiar","etiqueta":"Apellido y nombre del hijo/a","tipo":"texto","obligatorio":true},{"clave":"dni_familiar","etiqueta":"DNI del hijo/a","tipo":"texto","obligatorio":true},{"clave":"fecha_nacimiento","etiqueta":"Fecha de nacimiento","tipo":"fecha","obligatorio":true}]'::jsonb,
  10, null, 'normal', false, true, true,
  '011', 'Área Bonificaciones', 8, array['acta_nacimiento', 'negativa_anses', 'no_percepcion_empleador', 'certificado_discapacidad']::text[]
),
(
  'ASIG-PRENATAL', 'Asignación familiar prenatal',
  'Pago de la asignación prenatal durante el embarazo.',
  'Asignaciones familiares', 'heart-pulse',
  'Competencia: Decreto N.º 143/G/79, art. 2º (según los modelos de resolución del Área Bonificaciones). [COMPLETAR por Capital Humano: régimen de asignaciones familiares aplicable y montos]. [COMPLETAR por Capital Humano: semanas mínimas de gestación y período de pago].',
  '[{"clave":"certificado_medico_fpp","nombre":"Certificado médico con fecha probable de parto","obligatorio":true},{"clave":"ecografia","nombre":"Ecografía","obligatorio":true}]'::jsonb,
  '[{"clave":"fecha_probable_parto","etiqueta":"Fecha probable de parto","tipo":"fecha","obligatorio":true}]'::jsonb,
  10, null, 'normal', true, true, true,
  '012', 'Área Bonificaciones', 10, array['certificado_medico_fpp']::text[]
),
(
  'ASIG-CONYUGE', 'Asignación familiar por cónyuge',
  'Pago de la asignación familiar por cónyuge.',
  'Asignaciones familiares', 'heart',
  'Competencia: Decreto N.º 143/G/79, art. 2º (según los modelos de resolución del Área Bonificaciones). [COMPLETAR por Capital Humano: régimen de asignaciones familiares aplicable y montos].',
  '[{"clave":"acta_matrimonio","nombre":"Acta de matrimonio","obligatorio":true}]'::jsonb,
  '[{"clave":"familiar","etiqueta":"Apellido y nombre del/de la cónyuge","tipo":"texto","obligatorio":true},{"clave":"dni_familiar","etiqueta":"DNI del/de la cónyuge","tipo":"texto","obligatorio":true},{"clave":"fecha_matrimonio","etiqueta":"Fecha de matrimonio","tipo":"fecha","obligatorio":true}]'::jsonb,
  10, null, 'normal', false, true, true,
  '013', 'Área Bonificaciones', 8, array['acta_matrimonio']::text[]
),
(
  'LIC-EXAMEN', 'Licencia por examen',
  'Licencia para rendir exámenes en carreras de nivel medio, terciario o universitario.',
  'Licencias', 'graduation-cap',
  '[COMPLETAR por Capital Humano: artículo del Estatuto / régimen de licencias aplicable]',
  '[{"clave":"constancia_inscripcion","nombre":"Constancia de inscripción al examen","descripcion":"Emitida por la institución educativa","obligatorio":true},{"clave":"certificado_rendido","nombre":"Certificado de examen rendido","descripcion":"Podés adjuntarlo después de rendir","obligatorio":false}]'::jsonb,
  '[{"clave":"institucion","etiqueta":"Institución educativa","tipo":"texto","obligatorio":true},{"clave":"carrera","etiqueta":"Carrera","tipo":"texto","obligatorio":true},{"clave":"materia","etiqueta":"Materia / espacio curricular","tipo":"texto","obligatorio":true},{"clave":"fecha_examen","etiqueta":"Fecha del examen","tipo":"fecha","obligatorio":true},{"clave":"dias_solicitados","etiqueta":"Días de licencia solicitados","tipo":"numero","obligatorio":true,"ayuda":"Incluye el día del examen"}]'::jsonb,
  2, 35, 'normal', false, false, true,
  null, null, null, array['certificado_rendido']::text[]
),
(
  'LIC-HIJO-DISC', 'Licencia por atención de hijo/a con discapacidad',
  'Licencia especial para acompañamiento y tratamiento de hijo/a con discapacidad.',
  'Licencias', 'heart-handshake',
  '[COMPLETAR por Capital Humano: norma aplicable; dictámenes en estandarización]',
  '[{"clave":"cud","nombre":"Certificado Único de Discapacidad (CUD)","descripcion":"Vigente","obligatorio":true},{"clave":"indicacion_medica","nombre":"Indicación médica o de tratamiento","descripcion":"Con período sugerido","obligatorio":true}]'::jsonb,
  '[{"clave":"hijo","etiqueta":"Apellido y nombre del hijo/a","tipo":"texto","obligatorio":true},{"clave":"dni_hijo","etiqueta":"DNI del hijo/a","tipo":"texto","obligatorio":true},{"clave":"desde","etiqueta":"Desde","tipo":"fecha","obligatorio":true},{"clave":"hasta","etiqueta":"Hasta","tipo":"fecha","obligatorio":true},{"clave":"detalle","etiqueta":"Detalle de la necesidad","tipo":"texto_largo","obligatorio":false}]'::jsonb,
  3, null, 'alta', true, false, true,
  null, null, null, array['cud']::text[]
),
(
  'LIC-ENFERMEDAD', 'Licencia por enfermedad',
  'Justificación de inasistencias por razones de salud con certificado médico.',
  'Licencias', 'stethoscope',
  '[COMPLETAR por Capital Humano: régimen de licencias por enfermedad; plazo de 48 h para el certificado]',
  '[{"clave":"certificado_medico","nombre":"Certificado médico","descripcion":"Presentar dentro de las 48 horas","obligatorio":true}]'::jsonb,
  '[{"clave":"fecha_inicio","etiqueta":"Fecha de inicio","tipo":"fecha","obligatorio":true},{"clave":"dias_indicados","etiqueta":"Días indicados por el médico","tipo":"numero","obligatorio":true},{"clave":"observaciones","etiqueta":"Observaciones","tipo":"texto_largo","obligatorio":false,"ayuda":"No incluyas diagnóstico: el certificado ya lo contiene"}]'::jsonb,
  2, null, 'normal', true, false, true,
  null, null, null, '{}'::text[]
)
on conflict (codigo) do update set
  nombre = excluded.nombre, descripcion = excluded.descripcion, categoria = excluded.categoria, icono = excluded.icono,
  normativa = excluded.normativa, requisitos = excluded.requisitos, formulario = excluded.formulario,
  plazo_dias = excluded.plazo_dias, linea_base_dias = excluded.linea_base_dias, prioridad_base = excluded.prioridad_base,
  reservado = excluded.reservado, firma_registrada = excluded.firma_registrada, activo = true, codigo_relevamiento = excluded.codigo_relevamiento,
  oficina = excluded.oficina, pasos_actuales = excluded.pasos_actuales, documentacion_final = excluded.documentacion_final;

-- Circuitos (se reemplazan completos)
delete from public.pasos_circuito where tipo_tramite_id in (select id from public.tipos_tramite where codigo in ('BONIF-TIT-SEC', 'BONIF-TIT-TER', 'BONIF-TIT-UNI', 'BAJA-DIVORCIO', 'BAJA-FALLECIMIENTO', 'BAJA-ESTUDIOS', 'BAJA-PARTICULAR', 'ASIG-HIJO', 'ASIG-HIJO-DISC', 'ASIG-MATRIMONIO', 'ASIG-NACIMIENTO', 'ASIG-PRENATAL', 'ASIG-CONYUGE', 'LIC-EXAMEN', 'LIC-HIJO-DISC', 'LIC-ENFERMEDAD'));
insert into public.pasos_circuito
  (tipo_tramite_id, orden, nombre, area_id, accion, plazo_horas, instrucciones, controles, revisa, genera, permite_subsanacion, destino_final)
select t.id, p.orden, p.nombre, a.id, p.accion::public.accion_paso, p.plazo_horas, p.instrucciones, p.controles, p.revisa, p.genera, p.permite_subsanacion, p.destino_final
from (values
  ('BONIF-TIT-SEC', 1, 'Control de documentación y verificación del título', 'BONIF', 'analisis', 48, null,
   array['Controlar la documentación adjunta', 'Verificar la autenticidad del título', 'Verificar en Civitas que no se haya hecho lugar antes a la misma solicitud']::text[],
   array['Formulario', 'Certificado analítico', 'Diploma autenticado']::text[],
   array['Foja de servicios', 'Situación de revista', 'Informe de verificación del título']::text[], true, null),
  ('BONIF-TIT-SEC', 2, 'Dictamen', 'DICT', 'dictamen', 48, null,
   array['Controlar la documentación', 'Dictaminar sobre la procedencia del adicional por título']::text[],
   array['Formulario', 'Certificado analítico', 'Diploma autenticado', 'Foja de servicios', 'Situación de revista', 'Informe de verificación del título']::text[],
   array['Dictamen']::text[], true, null),
  ('BONIF-TIT-SEC', 3, 'Proyecto de resolución', 'BONIF', 'resolucion', 24, null,
   array['Revisar el dictamen', 'Preparar el proyecto de resolución en el sentido del dictamen']::text[],
   array['Dictamen', 'Formulario', 'Certificado analítico', 'Diploma autenticado', 'Foja de servicios', 'Situación de revista', 'Informe de verificación del título']::text[],
   array['Resolución']::text[], true, null),
  ('BONIF-TIT-SEC', 4, 'Control y firma de la resolución', 'DIR', 'firma', 24, null,
   array['Controlar el proyecto y la documentación', 'Firmar la resolución (el número y la fecha se asignan al firmar)']::text[],
   array['Resolución', 'Dictamen', 'Formulario', 'Certificado analítico', 'Diploma autenticado']::text[],
   array['Resolución firmada']::text[], false, null),
  ('BONIF-TIT-SEC', 5, 'Novedad a Liquidación y cierre', 'BONIF', 'liquidacion', 24, null,
   array['Informar la novedad a Liquidación de Haberes', 'Registrar la novedad en Civitas']::text[],
   array['Resolución firmada']::text[],
   array['Novedad a Liquidación de Haberes']::text[], false, 'Notificación electrónica al agente, incorporación al legajo digital y archivo'),
  ('BONIF-TIT-TER', 1, 'Control de documentación y verificación del título', 'BONIF', 'analisis', 48, null,
   array['Controlar la documentación adjunta', 'Verificar la autenticidad del título', 'Verificar en Civitas que no se haya hecho lugar antes a la misma solicitud']::text[],
   array['Formulario', 'Certificado analítico', 'Diploma autenticado']::text[],
   array['Foja de servicios', 'Situación de revista', 'Informe de verificación del título']::text[], true, null),
  ('BONIF-TIT-TER', 2, 'Dictamen', 'DICT', 'dictamen', 48, null,
   array['Controlar la documentación', 'Dictaminar sobre la procedencia del adicional por título']::text[],
   array['Formulario', 'Certificado analítico', 'Diploma autenticado', 'Foja de servicios', 'Situación de revista', 'Informe de verificación del título']::text[],
   array['Dictamen']::text[], true, null),
  ('BONIF-TIT-TER', 3, 'Proyecto de resolución', 'BONIF', 'resolucion', 24, null,
   array['Revisar el dictamen', 'Preparar el proyecto de resolución en el sentido del dictamen']::text[],
   array['Dictamen', 'Formulario', 'Certificado analítico', 'Diploma autenticado', 'Foja de servicios', 'Situación de revista', 'Informe de verificación del título']::text[],
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
   array['Controlar la documentación adjunta', 'Verificar la autenticidad del título', 'Verificar en Civitas que no se haya hecho lugar antes a la misma solicitud']::text[],
   array['Formulario', 'Diploma autenticado']::text[],
   array['Foja de servicios', 'Situación de revista', 'Informe de verificación del título']::text[], true, null),
  ('BONIF-TIT-UNI', 2, 'Dictamen', 'DICT', 'dictamen', 48, null,
   array['Controlar la documentación', 'Dictaminar sobre la procedencia del adicional por título']::text[],
   array['Formulario', 'Diploma autenticado', 'Foja de servicios', 'Situación de revista', 'Informe de verificación del título']::text[],
   array['Dictamen']::text[], true, null),
  ('BONIF-TIT-UNI', 3, 'Proyecto de resolución', 'BONIF', 'resolucion', 24, null,
   array['Revisar el dictamen', 'Preparar el proyecto de resolución en el sentido del dictamen']::text[],
   array['Dictamen', 'Formulario', 'Diploma autenticado', 'Foja de servicios', 'Situación de revista', 'Informe de verificación del título']::text[],
   array['Resolución']::text[], true, null),
  ('BONIF-TIT-UNI', 4, 'Control y firma de la resolución', 'DIR', 'firma', 24, null,
   array['Controlar el proyecto y la documentación', 'Firmar la resolución (el número y la fecha se asignan al firmar)']::text[],
   array['Resolución', 'Dictamen', 'Formulario', 'Diploma autenticado']::text[],
   array['Resolución firmada']::text[], false, null),
  ('BONIF-TIT-UNI', 5, 'Novedad a Liquidación y cierre', 'BONIF', 'liquidacion', 24, null,
   array['Informar la novedad a Liquidación de Haberes', 'Registrar la novedad en Civitas']::text[],
   array['Resolución firmada']::text[],
   array['Novedad a Liquidación de Haberes']::text[], false, 'Notificación electrónica al agente, incorporación al legajo digital y archivo'),
  ('BAJA-DIVORCIO', 1, 'Control de documentación y proyecto de resolución', 'BONIF', 'analisis', 48, null,
   array['Controlar la documentación adjunta', 'Verificar en Civitas que la asignación esté vigente y desde cuándo se liquida', 'Definir desde cuándo cesa la asignación', 'Preparar el proyecto de resolución']::text[],
   array['Formulario', 'Sentencia judicial de divorcio']::text[],
   array['Foja de servicios', 'Situación de revista', 'Resolución']::text[], true, null),
  ('BAJA-DIVORCIO', 2, 'Control y firma de la resolución', 'DIR', 'firma', 24, null,
   array['Controlar el proyecto y la documentación', 'Firmar la resolución (el número y la fecha se asignan al firmar)']::text[],
   array['Resolución', 'Formulario', 'Sentencia judicial de divorcio', 'Foja de servicios', 'Situación de revista']::text[],
   array['Resolución firmada']::text[], false, null),
  ('BAJA-DIVORCIO', 3, 'Novedad a Liquidación y cierre', 'BONIF', 'liquidacion', 24, null,
   array['Informar la novedad a Liquidación de Haberes', 'Registrar la novedad en Civitas']::text[],
   array['Resolución firmada']::text[],
   array['Novedad a Liquidación de Haberes']::text[], false, 'Notificación electrónica al agente, incorporación al legajo digital y archivo'),
  ('BAJA-FALLECIMIENTO', 1, 'Control de documentación', 'BONIF', 'analisis', 48, null,
   array['Controlar la documentación adjunta', 'Verificar en Civitas que la asignación esté vigente y desde cuándo se liquida']::text[],
   array['Formulario', 'Acta de defunción']::text[],
   array['Foja de servicios', 'Situación de revista']::text[], true, null),
  ('BAJA-FALLECIMIENTO', 2, 'Dictamen', 'DICT', 'dictamen', 48, null,
   array['Controlar la documentación', 'Dictaminar sobre la baja y la fecha de cese']::text[],
   array['Formulario', 'Acta de defunción', 'Foja de servicios', 'Situación de revista']::text[],
   array['Dictamen']::text[], true, null),
  ('BAJA-FALLECIMIENTO', 3, 'Proyecto de resolución', 'BONIF', 'resolucion', 24, null,
   array['Revisar el dictamen', 'Preparar el proyecto de resolución en el sentido del dictamen']::text[],
   array['Dictamen', 'Formulario', 'Acta de defunción', 'Foja de servicios', 'Situación de revista']::text[],
   array['Resolución']::text[], true, null),
  ('BAJA-FALLECIMIENTO', 4, 'Control y firma de la resolución', 'DIR', 'firma', 24, null,
   array['Controlar el proyecto y la documentación', 'Firmar la resolución (el número y la fecha se asignan al firmar)']::text[],
   array['Resolución', 'Dictamen', 'Formulario', 'Acta de defunción']::text[],
   array['Resolución firmada']::text[], false, null),
  ('BAJA-FALLECIMIENTO', 5, 'Novedad a Liquidación y cierre', 'BONIF', 'liquidacion', 24, null,
   array['Informar la novedad a Liquidación de Haberes', 'Registrar la novedad en Civitas']::text[],
   array['Resolución firmada']::text[],
   array['Novedad a Liquidación de Haberes']::text[], false, 'Notificación electrónica al agente, incorporación al legajo digital y archivo'),
  ('BAJA-ESTUDIOS', 1, 'Control de documentación', 'BONIF', 'analisis', 48, null,
   array['Controlar la documentación adjunta', 'Verificar en Civitas que la asignación esté vigente y desde cuándo se liquida']::text[],
   array['Formulario', 'Certificado de estudios con fecha hasta']::text[],
   array['Foja de servicios', 'Situación de revista']::text[], true, null),
  ('BAJA-ESTUDIOS', 2, 'Dictamen', 'DICT', 'dictamen', 48, null,
   array['Controlar la documentación', 'Dictaminar sobre la baja, la fecha de cese y si alcanza también a la escolaridad']::text[],
   array['Formulario', 'Certificado de estudios con fecha hasta', 'Foja de servicios', 'Situación de revista']::text[],
   array['Dictamen']::text[], true, null),
  ('BAJA-ESTUDIOS', 3, 'Proyecto de resolución', 'BONIF', 'resolucion', 24, null,
   array['Revisar el dictamen', 'Preparar el proyecto de resolución en el sentido del dictamen']::text[],
   array['Dictamen', 'Formulario', 'Certificado de estudios con fecha hasta', 'Foja de servicios', 'Situación de revista']::text[],
   array['Resolución']::text[], true, null),
  ('BAJA-ESTUDIOS', 4, 'Control y firma de la resolución', 'DIR', 'firma', 24, null,
   array['Controlar el proyecto y la documentación', 'Firmar la resolución (el número y la fecha se asignan al firmar)']::text[],
   array['Resolución', 'Dictamen', 'Formulario', 'Certificado de estudios con fecha hasta']::text[],
   array['Resolución firmada']::text[], false, null),
  ('BAJA-ESTUDIOS', 5, 'Novedad a Liquidación y cierre', 'BONIF', 'liquidacion', 24, null,
   array['Informar la novedad a Liquidación de Haberes', 'Registrar la novedad en Civitas']::text[],
   array['Resolución firmada']::text[],
   array['Novedad a Liquidación de Haberes']::text[], false, 'Notificación electrónica al agente, incorporación al legajo digital y archivo'),
  ('BAJA-PARTICULAR', 1, 'Control de la solicitud', 'BONIF', 'analisis', 48, null,
   array['Controlar la solicitud y el motivo', 'Verificar en Civitas que la asignación esté vigente y desde cuándo se liquida']::text[],
   array['Formulario']::text[],
   array['Foja de servicios', 'Situación de revista']::text[], true, null),
  ('BAJA-PARTICULAR', 2, 'Dictamen', 'DICT', 'dictamen', 48, null,
   array['Controlar la documentación', 'Dictaminar sobre la baja solicitada']::text[],
   array['Formulario', 'Foja de servicios', 'Situación de revista']::text[],
   array['Dictamen']::text[], true, null),
  ('BAJA-PARTICULAR', 3, 'Proyecto de resolución', 'BONIF', 'resolucion', 24, null,
   array['Revisar el dictamen', 'Preparar el proyecto de resolución en el sentido del dictamen']::text[],
   array['Dictamen', 'Formulario', 'Foja de servicios', 'Situación de revista']::text[],
   array['Resolución']::text[], true, null),
  ('BAJA-PARTICULAR', 4, 'Control y firma de la resolución', 'DIR', 'firma', 24, null,
   array['Controlar el proyecto y la documentación', 'Firmar la resolución (el número y la fecha se asignan al firmar)']::text[],
   array['Resolución', 'Dictamen', 'Formulario']::text[],
   array['Resolución firmada']::text[], false, null),
  ('BAJA-PARTICULAR', 5, 'Novedad a Liquidación y cierre', 'BONIF', 'liquidacion', 24, null,
   array['Informar la novedad a Liquidación de Haberes', 'Registrar la novedad en Civitas']::text[],
   array['Resolución firmada']::text[],
   array['Novedad a Liquidación de Haberes']::text[], false, 'Notificación electrónica al agente, incorporación al legajo digital y archivo'),
  ('ASIG-HIJO', 1, 'Control de documentación y grupo familiar', 'BONIF', 'analisis', 48, null,
   array['Controlar la documentación adjunta', 'Controlar la negativa de ANSES del otro progenitor', 'Verificar en Civitas que no se haya hecho lugar antes a la misma solicitud', 'Actualizar el grupo familiar en Civitas']::text[],
   array['Formulario', 'Acta de nacimiento del hijo/a', 'Negativa de ANSES de la madre o del padre']::text[],
   array['Administración de grupo familiar', 'Foja de servicios', 'Situación de revista']::text[], true, null),
  ('ASIG-HIJO', 2, 'Dictamen', 'DICT', 'dictamen', 48, null,
   array['Controlar la documentación', 'Dictaminar sobre la procedencia de la asignación']::text[],
   array['Formulario', 'Acta de nacimiento del hijo/a', 'Negativa de ANSES de la madre o del padre', 'Administración de grupo familiar', 'Foja de servicios', 'Situación de revista']::text[],
   array['Dictamen']::text[], true, null),
  ('ASIG-HIJO', 3, 'Proyecto de resolución', 'BONIF', 'resolucion', 24, null,
   array['Revisar el dictamen', 'Preparar el proyecto de resolución en el sentido del dictamen']::text[],
   array['Dictamen', 'Formulario', 'Acta de nacimiento del hijo/a', 'Negativa de ANSES de la madre o del padre', 'Administración de grupo familiar', 'Foja de servicios', 'Situación de revista']::text[],
   array['Resolución']::text[], true, null),
  ('ASIG-HIJO', 4, 'Control y firma de la resolución', 'DIR', 'firma', 24, null,
   array['Controlar el proyecto y la documentación', 'Firmar la resolución (el número y la fecha se asignan al firmar)']::text[],
   array['Resolución', 'Dictamen', 'Formulario', 'Acta de nacimiento del hijo/a', 'Negativa de ANSES de la madre o del padre']::text[],
   array['Resolución firmada']::text[], false, null),
  ('ASIG-HIJO', 5, 'Novedad a Liquidación y cierre', 'BONIF', 'liquidacion', 24, null,
   array['Informar la novedad a Liquidación de Haberes', 'Registrar la novedad en Civitas']::text[],
   array['Resolución firmada']::text[],
   array['Novedad a Liquidación de Haberes']::text[], false, 'Notificación electrónica al agente, incorporación al legajo digital y archivo'),
  ('ASIG-HIJO-DISC', 1, 'Control del CUD e informe interno', 'MEDLAB', 'analisis', 48, 'En la renovación del CUD Medicina Laboral no interviene: pasar directo al Área Bonificaciones.',
   array['Controlar el Certificado Único de Discapacidad', 'Producir el informe interno']::text[],
   array['Formulario', 'Certificado Único de Discapacidad (CUD)']::text[],
   array['Informe de Medicina Laboral']::text[], true, null),
  ('ASIG-HIJO-DISC', 2, 'Control de documentación y grupo familiar', 'BONIF', 'analisis', 48, null,
   array['Controlar la documentación adjunta', 'Verificar en Civitas el vencimiento del CUD', 'Verificar en Civitas que no se haya hecho lugar antes a la misma solicitud', 'Actualizar el grupo familiar en Civitas']::text[],
   array['Formulario', 'Acta de nacimiento del hijo/a', 'Certificado Único de Discapacidad (CUD)', 'Negativa de ANSES de la madre o del padre', 'Informe de Medicina Laboral']::text[],
   array['Administración de grupo familiar', 'Foja de servicios', 'Situación de revista']::text[], true, null),
  ('ASIG-HIJO-DISC', 3, 'Dictamen', 'DICT', 'dictamen', 48, null,
   array['Controlar la documentación', 'Dictaminar sobre la procedencia de la asignación']::text[],
   array['Formulario', 'Acta de nacimiento del hijo/a', 'Certificado Único de Discapacidad (CUD)', 'Informe de Medicina Laboral', 'Foja de servicios', 'Situación de revista']::text[],
   array['Dictamen']::text[], true, null),
  ('ASIG-HIJO-DISC', 4, 'Proyecto de resolución', 'BONIF', 'resolucion', 24, null,
   array['Revisar el dictamen', 'Preparar el proyecto de resolución en el sentido del dictamen']::text[],
   array['Dictamen', 'Informe de Medicina Laboral', 'Foja de servicios', 'Situación de revista']::text[],
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
   array['Controlar la documentación adjunta', 'Verificar en Civitas que no se haya hecho lugar antes a la misma solicitud']::text[],
   array['Formulario', 'Acta de matrimonio']::text[],
   array['Foja de servicios', 'Situación de revista']::text[], true, null),
  ('ASIG-MATRIMONIO', 2, 'Dictamen', 'DICT', 'dictamen', 48, null,
   array['Controlar la documentación', 'Dictaminar sobre la procedencia de la asignación']::text[],
   array['Formulario', 'Acta de matrimonio', 'Foja de servicios', 'Situación de revista']::text[],
   array['Dictamen']::text[], true, null),
  ('ASIG-MATRIMONIO', 3, 'Proyecto de resolución', 'BONIF', 'resolucion', 24, null,
   array['Revisar el dictamen', 'Preparar el proyecto de resolución en el sentido del dictamen']::text[],
   array['Dictamen', 'Formulario', 'Acta de matrimonio', 'Foja de servicios', 'Situación de revista']::text[],
   array['Resolución']::text[], true, null),
  ('ASIG-MATRIMONIO', 4, 'Control y firma de la resolución', 'DIR', 'firma', 24, null,
   array['Controlar el proyecto y la documentación', 'Firmar la resolución (el número y la fecha se asignan al firmar)']::text[],
   array['Resolución', 'Dictamen', 'Formulario', 'Acta de matrimonio']::text[],
   array['Resolución firmada']::text[], false, null),
  ('ASIG-MATRIMONIO', 5, 'Novedad a Liquidación y cierre', 'BONIF', 'liquidacion', 24, null,
   array['Informar la novedad a Liquidación de Haberes', 'Registrar la novedad en Civitas']::text[],
   array['Resolución firmada']::text[],
   array['Novedad a Liquidación de Haberes']::text[], false, 'Notificación electrónica al agente, incorporación al legajo digital y archivo'),
  ('ASIG-NACIMIENTO', 1, 'Control de documentación y grupo familiar', 'BONIF', 'analisis', 48, null,
   array['Controlar la documentación adjunta', 'Controlar la negativa de ANSES del otro progenitor', 'Verificar en Civitas que no se haya hecho lugar antes a la misma solicitud', 'Actualizar el grupo familiar en Civitas']::text[],
   array['Formulario', 'Acta de nacimiento del hijo/a', 'Negativa de ANSES de la madre o del padre']::text[],
   array['Administración de grupo familiar', 'Foja de servicios', 'Situación de revista']::text[], true, null),
  ('ASIG-NACIMIENTO', 2, 'Dictamen', 'DICT', 'dictamen', 48, null,
   array['Controlar la documentación', 'Dictaminar sobre la procedencia de la asignación']::text[],
   array['Formulario', 'Acta de nacimiento del hijo/a', 'Negativa de ANSES de la madre o del padre', 'Administración de grupo familiar', 'Foja de servicios', 'Situación de revista']::text[],
   array['Dictamen']::text[], true, null),
  ('ASIG-NACIMIENTO', 3, 'Proyecto de resolución', 'BONIF', 'resolucion', 24, null,
   array['Revisar el dictamen', 'Preparar el proyecto de resolución en el sentido del dictamen']::text[],
   array['Dictamen', 'Formulario', 'Acta de nacimiento del hijo/a', 'Negativa de ANSES de la madre o del padre', 'Administración de grupo familiar', 'Foja de servicios', 'Situación de revista']::text[],
   array['Resolución']::text[], true, null),
  ('ASIG-NACIMIENTO', 4, 'Control y firma de la resolución', 'DIR', 'firma', 24, null,
   array['Controlar el proyecto y la documentación', 'Firmar la resolución (el número y la fecha se asignan al firmar)']::text[],
   array['Resolución', 'Dictamen', 'Formulario', 'Acta de nacimiento del hijo/a', 'Negativa de ANSES de la madre o del padre']::text[],
   array['Resolución firmada']::text[], false, null),
  ('ASIG-NACIMIENTO', 5, 'Novedad a Liquidación y cierre', 'BONIF', 'liquidacion', 24, null,
   array['Informar la novedad a Liquidación de Haberes', 'Registrar la novedad en Civitas']::text[],
   array['Resolución firmada']::text[],
   array['Novedad a Liquidación de Haberes']::text[], false, 'Notificación electrónica al agente, incorporación al legajo digital y archivo'),
  ('ASIG-PRENATAL', 1, 'Control de documentación', 'BONIF', 'analisis', 48, null,
   array['Controlar la documentación adjunta', 'Verificar en Civitas que no se haya hecho lugar antes a la misma solicitud']::text[],
   array['Formulario', 'Certificado médico con fecha probable de parto', 'Ecografía']::text[],
   array['Foja de servicios', 'Situación de revista']::text[], true, null),
  ('ASIG-PRENATAL', 2, 'Entrevista e informe médico', 'MEDLAB', 'analisis', 72, null,
   array['Entrevistar a la agente', 'Constatar el embarazo y la fecha probable de parto']::text[],
   array['Certificado médico con fecha probable de parto', 'Ecografía']::text[],
   array['Informe de Medicina Laboral']::text[], true, null),
  ('ASIG-PRENATAL', 3, 'Dictamen', 'DICT', 'dictamen', 48, null,
   array['Controlar la documentación', 'Dictaminar sobre la procedencia de la asignación prenatal']::text[],
   array['Formulario', 'Foja de servicios', 'Situación de revista', 'Informe de Medicina Laboral']::text[],
   array['Dictamen']::text[], true, null),
  ('ASIG-PRENATAL', 4, 'Proyecto de resolución', 'BONIF', 'resolucion', 24, null,
   array['Revisar el dictamen', 'Preparar el proyecto de resolución en el sentido del dictamen']::text[],
   array['Dictamen', 'Informe de Medicina Laboral', 'Foja de servicios', 'Situación de revista']::text[],
   array['Resolución']::text[], true, null),
  ('ASIG-PRENATAL', 5, 'Control y firma de la resolución', 'DIR', 'firma', 24, null,
   array['Controlar el proyecto y la documentación', 'Firmar la resolución (el número y la fecha se asignan al firmar)']::text[],
   array['Resolución', 'Dictamen', 'Informe de Medicina Laboral']::text[],
   array['Resolución firmada']::text[], false, null),
  ('ASIG-PRENATAL', 6, 'Novedad a Liquidación y cierre', 'BONIF', 'liquidacion', 24, null,
   array['Informar la novedad a Liquidación de Haberes', 'Registrar la novedad en Civitas']::text[],
   array['Resolución firmada']::text[],
   array['Novedad a Liquidación de Haberes']::text[], false, 'Notificación electrónica al agente, incorporación al legajo digital y archivo'),
  ('ASIG-CONYUGE', 1, 'Control de documentación', 'BONIF', 'analisis', 48, null,
   array['Controlar la documentación adjunta', 'Verificar en Civitas que no se haya hecho lugar antes a la misma solicitud']::text[],
   array['Formulario', 'Acta de matrimonio']::text[],
   array['Foja de servicios', 'Situación de revista']::text[], true, null),
  ('ASIG-CONYUGE', 2, 'Dictamen', 'DICT', 'dictamen', 48, null,
   array['Controlar la documentación', 'Dictaminar sobre la procedencia de la asignación']::text[],
   array['Formulario', 'Acta de matrimonio', 'Foja de servicios', 'Situación de revista']::text[],
   array['Dictamen']::text[], true, null),
  ('ASIG-CONYUGE', 3, 'Proyecto de resolución', 'BONIF', 'resolucion', 24, null,
   array['Revisar el dictamen', 'Preparar el proyecto de resolución en el sentido del dictamen']::text[],
   array['Dictamen', 'Formulario', 'Acta de matrimonio', 'Foja de servicios', 'Situación de revista']::text[],
   array['Resolución']::text[], true, null),
  ('ASIG-CONYUGE', 4, 'Control y firma de la resolución', 'DIR', 'firma', 24, null,
   array['Controlar el proyecto y la documentación', 'Firmar la resolución (el número y la fecha se asignan al firmar)']::text[],
   array['Resolución', 'Dictamen', 'Formulario', 'Acta de matrimonio']::text[],
   array['Resolución firmada']::text[], false, null),
  ('ASIG-CONYUGE', 5, 'Novedad a Liquidación y cierre', 'BONIF', 'liquidacion', 24, null,
   array['Informar la novedad a Liquidación de Haberes', 'Registrar la novedad en Civitas']::text[],
   array['Resolución firmada']::text[],
   array['Novedad a Liquidación de Haberes']::text[], false, 'Notificación electrónica al agente, incorporación al legajo digital y archivo'),
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
  ('LIC-HIJO-DISC', 1, 'Recepción y control de requisitos', 'MESA', 'recepcion', 8, null,
   '{}'::text[],
   '{}'::text[],
   '{}'::text[], true, null),
  ('LIC-HIJO-DISC', 2, 'Dictamen', 'DICT', 'dictamen', 24, null,
   '{}'::text[],
   '{}'::text[],
   '{}'::text[], true, null),
  ('LIC-HIJO-DISC', 3, 'Proyecto de resolución', 'DESP', 'resolucion', 8, null,
   '{}'::text[],
   '{}'::text[],
   '{}'::text[], true, null),
  ('LIC-HIJO-DISC', 4, 'Firma de la resolución', 'DIR', 'firma', 8, null,
   '{}'::text[],
   '{}'::text[],
   '{}'::text[], true, null),
  ('LIC-HIJO-DISC', 5, 'Notificación y archivo', 'MESA', 'notificacion', 8, null,
   '{}'::text[],
   '{}'::text[],
   '{}'::text[], true, null),
  ('LIC-ENFERMEDAD', 1, 'Recepción del certificado', 'MESA', 'recepcion', 4, null,
   '{}'::text[],
   '{}'::text[],
   '{}'::text[], true, null),
  ('LIC-ENFERMEDAD', 2, 'Control de licencia', 'LIC', 'analisis', 8, null,
   '{}'::text[],
   '{}'::text[],
   '{}'::text[], true, null),
  ('LIC-ENFERMEDAD', 3, 'Proyecto de resolución', 'DESP', 'resolucion', 8, null,
   '{}'::text[],
   '{}'::text[],
   '{}'::text[], true, null),
  ('LIC-ENFERMEDAD', 4, 'Firma de la resolución', 'DIR', 'firma', 8, null,
   '{}'::text[],
   '{}'::text[],
   '{}'::text[], true, null)
) as p(codigo, orden, nombre, area, accion, plazo_horas, instrucciones, controles, revisa, genera, permite_subsanacion, destino_final)
join public.tipos_tramite t on t.codigo = p.codigo
join public.areas a on a.codigo = p.area;

-- Modelos (se reemplazan completos)
delete from public.plantillas where tipo_tramite_id in (select id from public.tipos_tramite where codigo in ('BONIF-TIT-SEC', 'BONIF-TIT-TER', 'BONIF-TIT-UNI', 'BAJA-DIVORCIO', 'BAJA-FALLECIMIENTO', 'BAJA-ESTUDIOS', 'BAJA-PARTICULAR', 'ASIG-HIJO', 'ASIG-HIJO-DISC', 'ASIG-MATRIMONIO', 'ASIG-NACIMIENTO', 'ASIG-PRENATAL', 'ASIG-CONYUGE', 'LIC-EXAMEN', 'LIC-HIJO-DISC', 'LIC-ENFERMEDAD'));
insert into public.plantillas (tipo_tramite_id, tipo_documento, nombre, cuerpo, instrucciones_ia)
select t.id, p.tipo::public.tipo_actuacion, p.nombre, p.cuerpo, p.instrucciones
from (values
(
  'BONIF-TIT-SEC', 'resolucion', 'Resolución de adicional por título secundario',
  'RESOLUCIÓN N.º {{numero_resolucion}}
Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Área Bonificaciones
San Miguel de Tucumán, {{fecha_resolucion}}

**VISTO:**
El Expediente N.º {{numero_expediente}}, de fecha {{fecha_expediente}}, por el cual el/la agente {{agente}}, afiliado/a N.º {{legajo}}, categoría {{categoria}}, dependiente de {{dependencia}}, y con prestación de servicios en {{reparticion}}, solicita el pago del adicional por Título Secundario de {{titulo_obtenido}}; y

**CONSIDERANDO:**
Que a fs. {{fs}}, obra solicitud de pago del adicional por título efectuada por el/la agente;
Que a fs. {{fs}}, obra copia certificada del certificado analítico y del diploma de {{titulo_obtenido}} a favor del/de la agente, expedido por {{institucion}};
Que a fs. {{fs}}, se agrega informe de verificación del título sobre su autenticidad;
Que a fs. {{fs}}, se agregan foja de servicios y situación de revista del/de la agente;
Que a fs. {{fs}}, obra dictamen de la Asesoría Legal de la Dirección de Capital Humano, aconsejando hacer lugar al pago del adicional por Título Secundario;

Por lo expuesto, y en virtud de lo establecido por los Decretos N.º 82/77, 23/81, 1320/01, 143/79, Art. 5º, y Ordenanza N.º 3537/04;

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** Hacer lugar al pedido de pago del adicional por título y otorgar al/a la agente {{agente}}, afiliado/a N.º {{legajo}}, el pago del adicional por Título Secundario de {{titulo_obtenido}}, con porcentaje del 17,5 % de la categoría de revista, a partir de {{mes_anio_efecto}}, por los motivos expresados en los considerandos que anteceden.

**Artículo 2º:** Registrar la presente Resolución en el Registro de Resoluciones de la Dirección de Capital Humano.

**Artículo 3º:** Notificar al/a la agente por medio del sistema de expedientes electrónicos, con constancia de fecha en el expediente. Notificado/a, archívese.',
  'Las referencias "a fs." tomalas de la numeración de fojas del expediente. Si el sentido indicado es NO hacer lugar, el Artículo 1º dice "No hacer lugar al pedido..." con los fundamentos del dictamen, y se omite el porcentaje o la fecha de efecto. Concordá el género (el/la agente) con los datos del agente. El adicional rige a partir del mes de la solicitud salvo que el dictamen diga otra cosa.'
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
Que a fs. {{fs}}, se agrega informe de verificación del título sobre su autenticidad;
Que a fs. {{fs}}, se agregan foja de servicios y situación de revista del/de la agente;
Que a fs. {{fs}}, obra dictamen de la Asesoría Legal de la Dirección de Capital Humano, aconsejando hacer lugar al pago del adicional por Título Terciario;

Por lo expuesto, y en virtud de lo establecido por los Decretos N.º 82/77, 23/81, 1320/01, 143/79, Art. 5º, y Ordenanza N.º 3537/04;

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** Hacer lugar al pedido de pago del adicional por título y otorgar al/a la agente {{agente}}, afiliado/a N.º {{legajo}}, el pago del adicional por Título Terciario de {{titulo_obtenido}}, con porcentaje del {{porcentaje}} de la categoría de revista, a partir de {{mes_anio_efecto}}, por los motivos expresados en los considerandos que anteceden.

**Artículo 2º:** Registrar la presente Resolución en el Registro de Resoluciones de la Dirección de Capital Humano.

**Artículo 3º:** Notificar al/a la agente por medio del sistema de expedientes electrónicos, con constancia de fecha en el expediente. Notificado/a, archívese.',
  'Las referencias "a fs." tomalas de la numeración de fojas del expediente. Si el sentido indicado es NO hacer lugar, el Artículo 1º dice "No hacer lugar al pedido..." con los fundamentos del dictamen, y se omite el porcentaje o la fecha de efecto. Concordá el género (el/la agente) con los datos del agente. El adicional rige a partir del mes de la solicitud salvo que el dictamen diga otra cosa. El porcentaje no está definido en el relevamiento: dejá [COMPLETAR: porcentaje] si no surge de la normativa cargada.'
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
Que a fs. {{fs}}, obra copia certificada del diploma de {{titulo_obtenido}} a favor del/de la agente, expedido por {{institucion}};
Que a fs. {{fs}}, se agrega informe de verificación del título sobre su autenticidad;
Que a fs. {{fs}}, se agregan foja de servicios y situación de revista del/de la agente;
Que a fs. {{fs}}, obra dictamen de la Asesoría Legal de la Dirección de Capital Humano, aconsejando hacer lugar al pago del adicional por Título Universitario;

Por lo expuesto, y en virtud de lo establecido por los Decretos N.º 82/77, 23/81, 1320/01, 143/79, Art. 5º, y Ordenanza N.º 3537/04;

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** Hacer lugar al pedido de pago del adicional por título y otorgar al/a la agente {{agente}}, afiliado/a N.º {{legajo}}, el pago del adicional por Título Universitario de {{titulo_obtenido}}, con porcentaje del {{porcentaje}} de la categoría de revista, a partir de {{mes_anio_efecto}}, por los motivos expresados en los considerandos que anteceden.

**Artículo 2º:** Registrar la presente Resolución en el Registro de Resoluciones de la Dirección de Capital Humano.

**Artículo 3º:** Notificar al/a la agente por medio del sistema de expedientes electrónicos, con constancia de fecha en el expediente. Notificado/a, archívese.',
  'Las referencias "a fs." tomalas de la numeración de fojas del expediente. Si el sentido indicado es NO hacer lugar, el Artículo 1º dice "No hacer lugar al pedido..." con los fundamentos del dictamen, y se omite el porcentaje o la fecha de efecto. Concordá el género (el/la agente) con los datos del agente. El adicional rige a partir del mes de la solicitud salvo que el dictamen diga otra cosa. El porcentaje no está definido en el relevamiento: dejá [COMPLETAR: porcentaje] si no surge de la normativa cargada.'
),
(
  'BAJA-DIVORCIO', 'resolucion', 'Resolución de baja de asignación por cónyuge (divorcio)',
  'RESOLUCIÓN N.º {{numero_resolucion}}
Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Área Bonificaciones
San Miguel de Tucumán, {{fecha_resolucion}}

**VISTO:**
El Expediente N.º {{numero_expediente}}, de fecha {{fecha_expediente}}, por el cual el/la agente {{agente}}, afiliado/a N.º {{legajo}}, categoría {{categoria}}, dependiente de {{dependencia}}, y con prestación de servicios en {{reparticion}}, solicita el cese del pago de la asignación familiar por cónyuge; y

**CONSIDERANDO:**
Que a fs. {{fs}}, obra la solicitud de baja de la asignación familiar del/de la agente;
Que a fs. {{fs}}, obra sentencia judicial de divorcio de fecha {{fecha_divorcio}}, en relación a {{familiar}}, DNI {{dni_familiar}};
Que a fs. {{fs}}, se agregan foja de servicios y situación de revista del/de la agente;

Por lo expuesto y en ejercicio de la competencia que le acuerda el Decreto N.º 143/G/79, artículo 2º;

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** Hacer lugar al pedido y disponer el cese del pago de la asignación familiar por cónyuge en relación a {{familiar}}, DNI {{dni_familiar}}, a partir de {{mes_anio_cese}}, al/a la agente {{agente}}, afiliado/a N.º {{legajo}}, conforme a lo citado en los considerandos que anteceden.

**Artículo 2º:** Registrar la presente Resolución en el Registro de Resoluciones de la Dirección de Capital Humano.

**Artículo 3º:** Notificar al/a la agente por medio del sistema de expedientes electrónicos, con constancia de fecha en el expediente. Notificado/a, archívese.',
  'Las referencias "a fs." tomalas de la numeración de fojas del expediente. Si el sentido indicado es NO hacer lugar, el Artículo 1º dice "No hacer lugar al pedido..." con los fundamentos del dictamen, y se omite el porcentaje o la fecha de efecto. Concordá el género (el/la agente) con los datos del agente. En este circuito no interviene la Asesoría Legal: no menciones dictamen. Si la fecha de cese es anterior al pedido, señalá con [REVISAR: períodos liquidados después del divorcio] para que el área defina el tratamiento.'
),
(
  'BAJA-FALLECIMIENTO', 'resolucion', 'Resolución de baja de asignación por fallecimiento',
  'RESOLUCIÓN N.º {{numero_resolucion}}
Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Área Bonificaciones
San Miguel de Tucumán, {{fecha_resolucion}}

**VISTO:**
El Expediente N.º {{numero_expediente}}, de fecha {{fecha_expediente}}, por el cual el/la agente {{agente}}, afiliado/a N.º {{legajo}}, categoría {{categoria}}, dependiente de {{dependencia}}, y con prestación de servicios en {{reparticion}}, solicita el cese del pago de la asignación familiar por {{vinculo}}; y

**CONSIDERANDO:**
Que a fs. {{fs}}, obra la solicitud de baja de la asignación familiar del/de la agente;
Que a fs. {{fs}}, obra acta de defunción en relación a {{familiar}}, DNI {{dni_familiar}}, fallecido/a el {{fecha_fallecimiento}};
Que a fs. {{fs}}, se agregan foja de servicios y situación de revista del/de la agente;
Que a fs. {{fs}}, obra dictamen de la Asesoría Legal de la Dirección de Capital Humano, aconsejando hacer lugar al pedido de baja de la asignación por {{vinculo}}, a partir de {{mes_anio_cese}};

Por lo expuesto y en ejercicio de la competencia que le acuerda el Decreto N.º 143/G/79, artículo 2º;

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** Hacer lugar al pedido y disponer el cese del pago de la asignación familiar por {{vinculo}} en relación a {{familiar}}, DNI {{dni_familiar}}, a partir de {{mes_anio_cese}}, al/a la agente {{agente}}, afiliado/a N.º {{legajo}}, conforme a lo citado en los considerandos que anteceden.

**Artículo 2º:** Registrar la presente Resolución en el Registro de Resoluciones de la Dirección de Capital Humano.

**Artículo 3º:** Notificar al/a la agente por medio del sistema de expedientes electrónicos, con constancia de fecha en el expediente. Notificado/a, archívese.',
  'Las referencias "a fs." tomalas de la numeración de fojas del expediente. Si el sentido indicado es NO hacer lugar, el Artículo 1º dice "No hacer lugar al pedido..." con los fundamentos del dictamen, y se omite el porcentaje o la fecha de efecto. Concordá el género (el/la agente) con los datos del agente. El vínculo (cónyuge o hijo/a) sale del formulario. No transcribas la causa de muerte aunque figure en el acta.'
),
(
  'BAJA-ESTUDIOS', 'resolucion', 'Resolución de baja de asignación por hijo/a (interrupción de estudios)',
  'RESOLUCIÓN N.º {{numero_resolucion}}
Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Área Bonificaciones
San Miguel de Tucumán, {{fecha_resolucion}}

**VISTO:**
El Expediente N.º {{numero_expediente}}, de fecha {{fecha_expediente}}, por el cual el/la agente {{agente}}, afiliado/a N.º {{legajo}}, categoría {{categoria}}, dependiente de {{dependencia}}, y con prestación de servicios en {{reparticion}}, solicita el cese del pago de la asignación familiar por hijo/a, por interrupción de estudios; y

**CONSIDERANDO:**
Que a fs. {{fs}}, obra la solicitud de baja de la asignación familiar del/de la agente;
Que a fs. {{fs}}, obra certificado de estudios o declaración jurada de interrupción de estudios en relación a {{familiar}}, DNI {{dni_familiar}};
Que a fs. {{fs}}, se agregan foja de servicios y situación de revista del/de la agente;
Que a fs. {{fs}}, obra dictamen de la Asesoría Legal de la Dirección de Capital Humano, aconsejando hacer lugar al pedido de baja de la asignación por hijo/a, por interrupción de estudios, a partir de {{mes_anio_cese}};

Por lo expuesto y en ejercicio de la competencia que le acuerda el Decreto N.º 143/G/79, artículo 2º;

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** Hacer lugar al pedido y disponer el cese del pago de la asignación familiar por hijo/a, por interrupción de estudios en relación a {{familiar}}, DNI {{dni_familiar}}, a partir de {{mes_anio_cese}}, al/a la agente {{agente}}, afiliado/a N.º {{legajo}}, conforme a lo citado en los considerandos que anteceden.

**Artículo 2º:** Registrar la presente Resolución en el Registro de Resoluciones de la Dirección de Capital Humano.

**Artículo 3º:** Notificar al/a la agente por medio del sistema de expedientes electrónicos, con constancia de fecha en el expediente. Notificado/a, archívese.',
  'Las referencias "a fs." tomalas de la numeración de fojas del expediente. Si el sentido indicado es NO hacer lugar, el Artículo 1º dice "No hacer lugar al pedido..." con los fundamentos del dictamen, y se omite el porcentaje o la fecha de efecto. Concordá el género (el/la agente) con los datos del agente. Si el dictamen aconseja también la baja de la asignación por escolaridad, incluila en el Artículo 1º; si no lo dice, marcá [REVISAR: ¿corresponde también la baja por escolaridad?].'
),
(
  'BAJA-PARTICULAR', 'resolucion', 'Resolución de baja de asignación por motivos particulares',
  'RESOLUCIÓN N.º {{numero_resolucion}}
Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Área Bonificaciones
San Miguel de Tucumán, {{fecha_resolucion}}

**VISTO:**
El Expediente N.º {{numero_expediente}}, de fecha {{fecha_expediente}}, por el cual el/la agente {{agente}}, afiliado/a N.º {{legajo}}, categoría {{categoria}}, dependiente de {{dependencia}}, y con prestación de servicios en {{reparticion}}, solicita el cese del pago de la asignación familiar por {{asignacion}}; y

**CONSIDERANDO:**
Que a fs. {{fs}}, obra la solicitud de baja de la asignación familiar del/de la agente;
Que a fs. {{fs}}, obra la manifestación del/de la agente sobre los motivos particulares de la baja;
Que a fs. {{fs}}, se agregan foja de servicios y situación de revista del/de la agente;
Que a fs. {{fs}}, obra dictamen de la Asesoría Legal de la Dirección de Capital Humano, aconsejando hacer lugar al pedido de baja de la asignación por {{asignacion}}, a partir de {{mes_anio_cese}};

Por lo expuesto y en ejercicio de la competencia que le acuerda el Decreto N.º 143/G/79, artículo 2º;

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** Hacer lugar al pedido y disponer el cese del pago de la asignación familiar por {{asignacion}} en relación a {{familiar}}, DNI {{dni_familiar}}, a partir de {{mes_anio_cese}}, al/a la agente {{agente}}, afiliado/a N.º {{legajo}}, conforme a lo citado en los considerandos que anteceden.

**Artículo 2º:** Registrar la presente Resolución en el Registro de Resoluciones de la Dirección de Capital Humano.

**Artículo 3º:** Notificar al/a la agente por medio del sistema de expedientes electrónicos, con constancia de fecha en el expediente. Notificado/a, archívese.',
  'Las referencias "a fs." tomalas de la numeración de fojas del expediente. Si el sentido indicado es NO hacer lugar, el Artículo 1º dice "No hacer lugar al pedido..." con los fundamentos del dictamen, y se omite el porcentaje o la fecha de efecto. Concordá el género (el/la agente) con los datos del agente. La asignación y el motivo salen del formulario. Si no hay familiar, eliminá "en relación a ..., DNI ...". Sin modelo del área: validar.'
),
(
  'ASIG-HIJO', 'resolucion', 'Resolución de asignación por hijo/a',
  'RESOLUCIÓN N.º {{numero_resolucion}}
Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Área Bonificaciones
San Miguel de Tucumán, {{fecha_resolucion}}

**VISTO:**
El Expediente N.º {{numero_expediente}}, de fecha {{fecha_expediente}}, por el cual el/la agente {{agente}}, afiliado/a N.º {{legajo}}, categoría {{categoria}}, dependiente de {{dependencia}}, y con prestación de servicios en {{reparticion}}, solicita el pago de la asignación familiar por hijo/a; y

**CONSIDERANDO:**
Que a fs. {{fs}}, obra la solicitud de pago de la asignación familiar efectuada por el/la agente;
Que a fs. {{fs}}, obra acta de nacimiento de {{familiar}}, DNI {{dni_familiar}}, y negativa de ANSES del otro progenitor;
Que a fs. {{fs}}, se agregan foja de servicios y situación de revista del/de la agente;
Que a fs. {{fs}}, obra dictamen de la Asesoría Legal de la Dirección de Capital Humano, aconsejando hacer lugar al pago de la asignación familiar por hijo/a;

Por lo expuesto y en ejercicio de la competencia que le acuerda el Decreto N.º 143/G/79, artículo 2º;

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** Hacer lugar al pedido y otorgar al/a la agente {{agente}}, afiliado/a N.º {{legajo}}, el pago de la asignación familiar por hijo/a{{en_relacion_a}}, a partir de {{mes_anio_efecto}}, conforme a lo citado en los considerandos que anteceden.

**Artículo 2º:** Registrar la presente Resolución en el Registro de Resoluciones de la Dirección de Capital Humano.

**Artículo 3º:** Notificar al/a la agente por medio del sistema de expedientes electrónicos, con constancia de fecha en el expediente. Notificado/a, archívese.',
  'Las referencias "a fs." tomalas de la numeración de fojas del expediente. Si el sentido indicado es NO hacer lugar, el Artículo 1º dice "No hacer lugar al pedido..." con los fundamentos del dictamen, y se omite el porcentaje o la fecha de efecto. Concordá el género (el/la agente) con los datos del agente. En {{en_relacion_a}} poné ", en relación a [hijo/a], DNI [dni]". Modelo derivado de los de bajas: validar con el área.'
),
(
  'ASIG-HIJO-DISC', 'resolucion', 'Resolución de asignación por hijo/a con discapacidad',
  'RESOLUCIÓN N.º {{numero_resolucion}}
Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Área Bonificaciones
San Miguel de Tucumán, {{fecha_resolucion}}

**VISTO:**
El Expediente N.º {{numero_expediente}}, de fecha {{fecha_expediente}}, por el cual el/la agente {{agente}}, afiliado/a N.º {{legajo}}, categoría {{categoria}}, dependiente de {{dependencia}}, y con prestación de servicios en {{reparticion}}, solicita el pago de la asignación familiar por hijo/a con discapacidad; y

**CONSIDERANDO:**
Que a fs. {{fs}}, obra la solicitud de pago de la asignación familiar efectuada por el/la agente;
Que a fs. {{fs}}, obra Certificado Único de Discapacidad de {{familiar}}, DNI {{dni_familiar}}, con vencimiento el {{vencimiento_cud}}, e informe del Departamento de Medicina Laboral;
Que a fs. {{fs}}, se agregan foja de servicios y situación de revista del/de la agente;
Que a fs. {{fs}}, obra dictamen de la Asesoría Legal de la Dirección de Capital Humano, aconsejando hacer lugar al pago de la asignación familiar por hijo/a con discapacidad;

Por lo expuesto y en ejercicio de la competencia que le acuerda el Decreto N.º 143/G/79, artículo 2º;

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** Hacer lugar al pedido y otorgar al/a la agente {{agente}}, afiliado/a N.º {{legajo}}, el pago de la asignación familiar por hijo/a con discapacidad{{en_relacion_a}}, a partir de {{mes_anio_efecto}}, conforme a lo citado en los considerandos que anteceden.

**Artículo 2º:** Registrar la presente Resolución en el Registro de Resoluciones de la Dirección de Capital Humano.

**Artículo 3º:** Notificar al/a la agente por medio del sistema de expedientes electrónicos, con constancia de fecha en el expediente. Notificado/a, archívese.',
  'Las referencias "a fs." tomalas de la numeración de fojas del expediente. Si el sentido indicado es NO hacer lugar, el Artículo 1º dice "No hacer lugar al pedido..." con los fundamentos del dictamen, y se omite el porcentaje o la fecha de efecto. Concordá el género (el/la agente) con los datos del agente. Expediente RESERVADO: no transcribas diagnósticos; referí a "la documentación médica obrante". Usá "hijo/a con discapacidad", nunca "discapacitado". En {{en_relacion_a}} poné ", en relación a [hijo/a], DNI [dni]". Si es renovación, decilo en el VISTO. Modelo derivado de los de bajas: validar con el área.'
),
(
  'ASIG-MATRIMONIO', 'resolucion', 'Resolución de asignación por matrimonio',
  'RESOLUCIÓN N.º {{numero_resolucion}}
Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Área Bonificaciones
San Miguel de Tucumán, {{fecha_resolucion}}

**VISTO:**
El Expediente N.º {{numero_expediente}}, de fecha {{fecha_expediente}}, por el cual el/la agente {{agente}}, afiliado/a N.º {{legajo}}, categoría {{categoria}}, dependiente de {{dependencia}}, y con prestación de servicios en {{reparticion}}, solicita el pago de la asignación familiar por matrimonio; y

**CONSIDERANDO:**
Que a fs. {{fs}}, obra la solicitud de pago de la asignación familiar efectuada por el/la agente;
Que a fs. {{fs}}, obra acta de matrimonio de fecha {{fecha_matrimonio}} con {{familiar}}, DNI {{dni_familiar}};
Que a fs. {{fs}}, se agregan foja de servicios y situación de revista del/de la agente;
Que a fs. {{fs}}, obra dictamen de la Asesoría Legal de la Dirección de Capital Humano, aconsejando hacer lugar al pago de la asignación familiar por matrimonio;

Por lo expuesto y en ejercicio de la competencia que le acuerda el Decreto N.º 143/G/79, artículo 2º;

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** Hacer lugar al pedido y otorgar al/a la agente {{agente}}, afiliado/a N.º {{legajo}}, el pago de la asignación familiar por matrimonio{{en_relacion_a}}, a partir de {{mes_anio_efecto}}, conforme a lo citado en los considerandos que anteceden.

**Artículo 2º:** Registrar la presente Resolución en el Registro de Resoluciones de la Dirección de Capital Humano.

**Artículo 3º:** Notificar al/a la agente por medio del sistema de expedientes electrónicos, con constancia de fecha en el expediente. Notificado/a, archívese.',
  'Las referencias "a fs." tomalas de la numeración de fojas del expediente. Si el sentido indicado es NO hacer lugar, el Artículo 1º dice "No hacer lugar al pedido..." con los fundamentos del dictamen, y se omite el porcentaje o la fecha de efecto. Concordá el género (el/la agente) con los datos del agente. En {{en_relacion_a}} poné ", en relación a [cónyuge], DNI [dni]". Modelo derivado de los de bajas: validar con el área.'
),
(
  'ASIG-NACIMIENTO', 'resolucion', 'Resolución de asignación por nacimiento',
  'RESOLUCIÓN N.º {{numero_resolucion}}
Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Área Bonificaciones
San Miguel de Tucumán, {{fecha_resolucion}}

**VISTO:**
El Expediente N.º {{numero_expediente}}, de fecha {{fecha_expediente}}, por el cual el/la agente {{agente}}, afiliado/a N.º {{legajo}}, categoría {{categoria}}, dependiente de {{dependencia}}, y con prestación de servicios en {{reparticion}}, solicita el pago de la asignación familiar por nacimiento; y

**CONSIDERANDO:**
Que a fs. {{fs}}, obra la solicitud de pago de la asignación familiar efectuada por el/la agente;
Que a fs. {{fs}}, obra acta de nacimiento de {{familiar}}, DNI {{dni_familiar}}, nacido/a el {{fecha_nacimiento}}, y negativa de ANSES del otro progenitor;
Que a fs. {{fs}}, se agregan foja de servicios y situación de revista del/de la agente;
Que a fs. {{fs}}, obra dictamen de la Asesoría Legal de la Dirección de Capital Humano, aconsejando hacer lugar al pago de la asignación familiar por nacimiento;

Por lo expuesto y en ejercicio de la competencia que le acuerda el Decreto N.º 143/G/79, artículo 2º;

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** Hacer lugar al pedido y otorgar al/a la agente {{agente}}, afiliado/a N.º {{legajo}}, el pago de la asignación familiar por nacimiento{{en_relacion_a}}, a partir de {{mes_anio_efecto}}, conforme a lo citado en los considerandos que anteceden.

**Artículo 2º:** Registrar la presente Resolución en el Registro de Resoluciones de la Dirección de Capital Humano.

**Artículo 3º:** Notificar al/a la agente por medio del sistema de expedientes electrónicos, con constancia de fecha en el expediente. Notificado/a, archívese.',
  'Las referencias "a fs." tomalas de la numeración de fojas del expediente. Si el sentido indicado es NO hacer lugar, el Artículo 1º dice "No hacer lugar al pedido..." con los fundamentos del dictamen, y se omite el porcentaje o la fecha de efecto. Concordá el género (el/la agente) con los datos del agente. En {{en_relacion_a}} poné ", en relación a [hijo/a], DNI [dni]". Si se acompaña CUD, mencionalo sin transcribir diagnóstico. Modelo derivado de los de bajas: validar con el área.'
),
(
  'ASIG-PRENATAL', 'resolucion', 'Resolución de asignación prenatal',
  'RESOLUCIÓN N.º {{numero_resolucion}}
Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Área Bonificaciones
San Miguel de Tucumán, {{fecha_resolucion}}

**VISTO:**
El Expediente N.º {{numero_expediente}}, de fecha {{fecha_expediente}}, por el cual el/la agente {{agente}}, afiliado/a N.º {{legajo}}, categoría {{categoria}}, dependiente de {{dependencia}}, y con prestación de servicios en {{reparticion}}, solicita el pago de la asignación familiar prenatal; y

**CONSIDERANDO:**
Que a fs. {{fs}}, obra la solicitud de pago de la asignación familiar efectuada por el/la agente;
Que a fs. {{fs}}, obra certificado médico con fecha probable de parto {{fecha_probable_parto}} e informe del Departamento de Medicina Laboral;
Que a fs. {{fs}}, se agregan foja de servicios y situación de revista del/de la agente;
Que a fs. {{fs}}, obra dictamen de la Asesoría Legal de la Dirección de Capital Humano, aconsejando hacer lugar al pago de la asignación familiar prenatal;

Por lo expuesto y en ejercicio de la competencia que le acuerda el Decreto N.º 143/G/79, artículo 2º;

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** Hacer lugar al pedido y otorgar al/a la agente {{agente}}, afiliado/a N.º {{legajo}}, el pago de la asignación familiar prenatal{{en_relacion_a}}, a partir de {{mes_anio_efecto}}, conforme a lo citado en los considerandos que anteceden.

**Artículo 2º:** Registrar la presente Resolución en el Registro de Resoluciones de la Dirección de Capital Humano.

**Artículo 3º:** Notificar al/a la agente por medio del sistema de expedientes electrónicos, con constancia de fecha en el expediente. Notificado/a, archívese.',
  'Las referencias "a fs." tomalas de la numeración de fojas del expediente. Si el sentido indicado es NO hacer lugar, el Artículo 1º dice "No hacer lugar al pedido..." con los fundamentos del dictamen, y se omite el porcentaje o la fecha de efecto. Concordá el género (el/la agente) con los datos del agente. Expediente RESERVADO: no transcribas datos de salud; referí a "la documentación médica obrante". En {{en_relacion_a}} no pongas nada. Modelo derivado de los de bajas: validar con el área.'
),
(
  'ASIG-CONYUGE', 'resolucion', 'Resolución de asignación por cónyuge',
  'RESOLUCIÓN N.º {{numero_resolucion}}
Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Área Bonificaciones
San Miguel de Tucumán, {{fecha_resolucion}}

**VISTO:**
El Expediente N.º {{numero_expediente}}, de fecha {{fecha_expediente}}, por el cual el/la agente {{agente}}, afiliado/a N.º {{legajo}}, categoría {{categoria}}, dependiente de {{dependencia}}, y con prestación de servicios en {{reparticion}}, solicita el pago de la asignación familiar por cónyuge; y

**CONSIDERANDO:**
Que a fs. {{fs}}, obra la solicitud de pago de la asignación familiar efectuada por el/la agente;
Que a fs. {{fs}}, obra acta de matrimonio con {{familiar}}, DNI {{dni_familiar}};
Que a fs. {{fs}}, se agregan foja de servicios y situación de revista del/de la agente;
Que a fs. {{fs}}, obra dictamen de la Asesoría Legal de la Dirección de Capital Humano, aconsejando hacer lugar al pago de la asignación familiar por cónyuge;

Por lo expuesto y en ejercicio de la competencia que le acuerda el Decreto N.º 143/G/79, artículo 2º;

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** Hacer lugar al pedido y otorgar al/a la agente {{agente}}, afiliado/a N.º {{legajo}}, el pago de la asignación familiar por cónyuge{{en_relacion_a}}, a partir de {{mes_anio_efecto}}, conforme a lo citado en los considerandos que anteceden.

**Artículo 2º:** Registrar la presente Resolución en el Registro de Resoluciones de la Dirección de Capital Humano.

**Artículo 3º:** Notificar al/a la agente por medio del sistema de expedientes electrónicos, con constancia de fecha en el expediente. Notificado/a, archívese.',
  'Las referencias "a fs." tomalas de la numeración de fojas del expediente. Si el sentido indicado es NO hacer lugar, el Artículo 1º dice "No hacer lugar al pedido..." con los fundamentos del dictamen, y se omite el porcentaje o la fecha de efecto. Concordá el género (el/la agente) con los datos del agente. En {{en_relacion_a}} poné ", en relación a [cónyuge], DNI [dni]". Modelo derivado de los de bajas: validar con el área.'
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
  'LIC-HIJO-DISC', 'dictamen', 'Dictamen sobre licencia por hijo/a con discapacidad',
  '**DICTAMEN N.º {{numero_dictamen}}**
Ref.: Expte. N.º {{numero_expediente}} — Licencia por atención de hijo/a con discapacidad (RESERVADO)

**I. ANTECEDENTES**
{{antecedentes}}

**II. ANÁLISIS**
{{analisis}}

**III. CONCLUSIÓN**
{{conclusion}}',
  'Expediente RESERVADO: no transcribas diagnósticos ni datos de salud más allá de lo imprescindible; referí a "la documentación médica obrante". Priorizá la continuidad del tratamiento.'
)
) as p(codigo, tipo, nombre, cuerpo, instrucciones)
join public.tipos_tramite t on t.codigo = p.codigo;
