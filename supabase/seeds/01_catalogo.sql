-- =====================================================================
-- Catálogo PROVISORIO de Capital Humano: áreas, trámites, circuitos y
-- modelos. Apto para cualquier entorno (no crea usuarios).
-- Se reemplaza cuando Capital Humano entregue el cursograma y los modelos.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Áreas (provisorio)
-- ---------------------------------------------------------------------
insert into public.areas (codigo, nombre, descripcion) values
  ('MESA', 'Mesa de Entradas',               'Recepción, control de requisitos y notificaciones'),
  ('LIC',  'Sección Licencias',              'Control de licencias y días disponibles'),
  ('DICT', 'Asesoría Letrada',               'Dictámenes jurídicos'),
  ('DESP', 'Despacho',                       'Proyectos de resolución'),
  ('DIR',  'Dirección de Capital Humano',    'Firma de resoluciones'),
  ('LIQ',  'Liquidación de Haberes',         'Impacto en liquidación y asignaciones');

-- ---------------------------------------------------------------------
-- Tipos de trámite (provisorio)
-- ---------------------------------------------------------------------
insert into public.tipos_tramite
  (codigo, nombre, descripcion, categoria, icono, normativa, requisitos, formulario, plazo_dias, linea_base_dias, prioridad_base, reservado)
values
(
  'LIC-EXAMEN', 'Licencia por examen',
  'Licencia para rendir exámenes en carreras de nivel medio, terciario o universitario.',
  'Licencias', 'graduation-cap',
  '[COMPLETAR por Capital Humano: artículo del Estatuto / régimen de licencias aplicable]',
  '[
    {"clave":"constancia_inscripcion","nombre":"Constancia de inscripción al examen","descripcion":"Emitida por la institución educativa","obligatorio":true},
    {"clave":"certificado_rendido","nombre":"Certificado de examen rendido","descripcion":"Podés adjuntarlo después de rendir","obligatorio":false}
  ]',
  '[
    {"clave":"institucion","etiqueta":"Institución educativa","tipo":"texto","obligatorio":true},
    {"clave":"carrera","etiqueta":"Carrera","tipo":"texto","obligatorio":true},
    {"clave":"materia","etiqueta":"Materia / espacio curricular","tipo":"texto","obligatorio":true},
    {"clave":"fecha_examen","etiqueta":"Fecha del examen","tipo":"fecha","obligatorio":true},
    {"clave":"dias_solicitados","etiqueta":"Días de licencia solicitados","tipo":"numero","obligatorio":true,"ayuda":"Incluye el día del examen"}
  ]',
  2, 35, 'normal', false
),
(
  'BONIF-TITULO', 'Bonificación por título',
  'Adicional salarial por título secundario, terciario, universitario o de posgrado.',
  'Bonificaciones', 'award',
  '[COMPLETAR por Capital Humano: norma que regula el adicional por título]',
  '[
    {"clave":"titulo","nombre":"Título (copia certificada)","descripcion":"Anverso y reverso","obligatorio":true},
    {"clave":"analitico","nombre":"Certificado analítico","descripcion":"Opcional, si el título está en trámite","obligatorio":false}
  ]',
  '[
    {"clave":"titulo_obtenido","etiqueta":"Título obtenido","tipo":"texto","obligatorio":true},
    {"clave":"nivel","etiqueta":"Nivel","tipo":"seleccion","obligatorio":true,"opciones":["Secundario","Terciario","Universitario de grado","Posgrado"]},
    {"clave":"institucion","etiqueta":"Institución que lo emite","tipo":"texto","obligatorio":true},
    {"clave":"fecha_egreso","etiqueta":"Fecha de egreso","tipo":"fecha","obligatorio":true}
  ]',
  10, null, 'normal', false
),
(
  'ASIG-FAMILIAR', 'Adicional por asignación familiar',
  'Alta de asignaciones familiares: nacimiento, adopción, matrimonio, hijo/a, escolaridad.',
  'Asignaciones', 'users',
  '[COMPLETAR por Capital Humano: régimen de asignaciones familiares aplicable]',
  '[
    {"clave":"partida","nombre":"Partida o certificado que acredita el vínculo","descripcion":"Nacimiento, matrimonio, adopción o constancia escolar","obligatorio":true},
    {"clave":"cud","nombre":"Certificado Único de Discapacidad (CUD)","descripcion":"Solo para hijo/a con discapacidad","obligatorio":false}
  ]',
  '[
    {"clave":"tipo_asignacion","etiqueta":"Tipo de asignación","tipo":"seleccion","obligatorio":true,"opciones":["Nacimiento","Adopción","Matrimonio","Hijo/a","Hijo/a con discapacidad","Escolaridad"]},
    {"clave":"familiar","etiqueta":"Apellido y nombre del familiar","tipo":"texto","obligatorio":true},
    {"clave":"dni_familiar","etiqueta":"DNI del familiar","tipo":"texto","obligatorio":true}
  ]',
  5, null, 'normal', false
),
(
  'LIC-HIJO-DISC', 'Licencia por atención de hijo/a con discapacidad',
  'Licencia especial para acompañamiento y tratamiento de hijo/a con discapacidad.',
  'Licencias', 'heart-handshake',
  '[COMPLETAR por Capital Humano: norma aplicable; dictámenes en estandarización]',
  '[
    {"clave":"cud","nombre":"Certificado Único de Discapacidad (CUD)","descripcion":"Vigente","obligatorio":true},
    {"clave":"indicacion_medica","nombre":"Indicación médica o de tratamiento","descripcion":"Con período sugerido","obligatorio":true}
  ]',
  '[
    {"clave":"hijo","etiqueta":"Apellido y nombre del hijo/a","tipo":"texto","obligatorio":true},
    {"clave":"dni_hijo","etiqueta":"DNI del hijo/a","tipo":"texto","obligatorio":true},
    {"clave":"desde","etiqueta":"Desde","tipo":"fecha","obligatorio":true},
    {"clave":"hasta","etiqueta":"Hasta","tipo":"fecha","obligatorio":true},
    {"clave":"detalle","etiqueta":"Detalle de la necesidad","tipo":"texto_largo","obligatorio":false}
  ]',
  3, null, 'alta', true
),
(
  'LIC-ENFERMEDAD', 'Licencia por enfermedad',
  'Justificación de inasistencias por razones de salud con certificado médico.',
  'Licencias', 'stethoscope',
  '[COMPLETAR por Capital Humano: régimen de licencias por enfermedad; plazo de 48 h para el certificado]',
  '[
    {"clave":"certificado_medico","nombre":"Certificado médico","descripcion":"Presentar dentro de las 48 horas","obligatorio":true}
  ]',
  '[
    {"clave":"fecha_inicio","etiqueta":"Fecha de inicio","tipo":"fecha","obligatorio":true},
    {"clave":"dias_indicados","etiqueta":"Días indicados por el médico","tipo":"numero","obligatorio":true},
    {"clave":"observaciones","etiqueta":"Observaciones","tipo":"texto_largo","obligatorio":false,"ayuda":"No incluyas diagnóstico: el certificado ya lo contiene"}
  ]',
  2, null, 'normal', true
);

-- ---------------------------------------------------------------------
-- Circuitos (cursograma provisorio)
-- ---------------------------------------------------------------------
insert into public.pasos_circuito (tipo_tramite_id, orden, nombre, area_id, accion, plazo_horas)
select t.id, p.orden, p.nombre, a.id, p.accion::public.accion_paso, p.plazo_horas
from (values
  ('LIC-EXAMEN',     1, 'Recepción y control de requisitos', 'MESA', 'recepcion',    8),
  ('LIC-EXAMEN',     2, 'Control de días disponibles',       'LIC',  'analisis',     8),
  ('LIC-EXAMEN',     3, 'Proyecto de resolución',            'DESP', 'resolucion',   8),
  ('LIC-EXAMEN',     4, 'Firma de la resolución',            'DIR',  'firma',        8),
  ('LIC-EXAMEN',     5, 'Notificación y archivo',            'MESA', 'notificacion', 8),

  ('BONIF-TITULO',   1, 'Recepción y control de requisitos', 'MESA', 'recepcion',   24),
  ('BONIF-TITULO',   2, 'Dictamen de procedencia',           'DICT', 'dictamen',    48),
  ('BONIF-TITULO',   3, 'Proyecto de resolución',            'DESP', 'resolucion',  24),
  ('BONIF-TITULO',   4, 'Firma de la resolución',            'DIR',  'firma',       24),
  ('BONIF-TITULO',   5, 'Alta en liquidación',               'LIQ',  'liquidacion', 72),

  ('ASIG-FAMILIAR',  1, 'Recepción y control de requisitos', 'MESA', 'recepcion',   24),
  ('ASIG-FAMILIAR',  2, 'Análisis de la asignación',         'LIQ',  'analisis',    24),
  ('ASIG-FAMILIAR',  3, 'Proyecto de resolución',            'DESP', 'resolucion',  24),
  ('ASIG-FAMILIAR',  4, 'Firma de la resolución',            'DIR',  'firma',       24),
  ('ASIG-FAMILIAR',  5, 'Alta en liquidación',               'LIQ',  'liquidacion', 24),

  ('LIC-HIJO-DISC',  1, 'Recepción y control de requisitos', 'MESA', 'recepcion',    8),
  ('LIC-HIJO-DISC',  2, 'Dictamen',                          'DICT', 'dictamen',    24),
  ('LIC-HIJO-DISC',  3, 'Proyecto de resolución',            'DESP', 'resolucion',   8),
  ('LIC-HIJO-DISC',  4, 'Firma de la resolución',            'DIR',  'firma',        8),
  ('LIC-HIJO-DISC',  5, 'Notificación y archivo',            'MESA', 'notificacion', 8),

  ('LIC-ENFERMEDAD', 1, 'Recepción del certificado',         'MESA', 'recepcion',    4),
  ('LIC-ENFERMEDAD', 2, 'Control de licencia',               'LIC',  'analisis',     8),
  ('LIC-ENFERMEDAD', 3, 'Proyecto de resolución',            'DESP', 'resolucion',   8),
  ('LIC-ENFERMEDAD', 4, 'Firma de la resolución',            'DIR',  'firma',        8)
) as p(codigo, orden, nombre, area, accion, plazo_horas)
join public.tipos_tramite t on t.codigo = p.codigo
join public.areas a on a.codigo = p.area;

-- ---------------------------------------------------------------------
-- Plantillas (modelos provisorios: reemplazar por los reales)
-- ---------------------------------------------------------------------
insert into public.plantillas (tipo_tramite_id, tipo_documento, nombre, cuerpo, instrucciones_ia)
select t.id, p.tipo::public.tipo_actuacion, p.nombre, p.cuerpo, p.instrucciones
from (values
(
  'LIC-EXAMEN', 'resolucion', 'Resolución de licencia por examen',
$md$RESOLUCIÓN N.º {{numero_resolucion}}
San Miguel de Tucumán, {{fecha}}

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

**ARTÍCULO 3º.-** Comuníquese, notifíquese y archívese.$md$,
'Verificá que la fecha del examen y los días solicitados sean coherentes. Si en el expediente ya consta el certificado de examen rendido, eliminá el artículo 2º. No inventes número de resolución ni normativa: dejá el marcador [COMPLETAR].'
),
(
  'BONIF-TITULO', 'dictamen', 'Dictamen sobre bonificación por título',
$md$**DICTAMEN N.º {{numero_dictamen}}**
Ref.: Expte. N.º {{numero_expediente}} — Bonificación por título

**I. ANTECEDENTES**
El/la agente {{agente}}, Legajo N.º {{legajo}}, solicita el reconocimiento del adicional por título de {{titulo_obtenido}} (nivel {{nivel}}), expedido por {{institucion}}, con fecha de egreso {{fecha_egreso}}.

**II. ANÁLISIS**
{{analisis}}

**III. CONCLUSIÓN**
Por lo expuesto, esta Asesoría Letrada entiende que {{conclusion}} hacer lugar a lo solicitado, a partir de {{fecha_efecto}}.

Es todo cuanto cabe dictaminar.$md$,
'El análisis debe verificar: (a) que el título acompañado sea copia certificada, (b) que el nivel declarado coincida con el título, (c) la fecha a partir de la cual corresponde el adicional. Si falta documentación, la conclusión debe ser solicitar que se complete, no denegar.'
),
(
  'BONIF-TITULO', 'resolucion', 'Resolución de bonificación por título',
$md$RESOLUCIÓN N.º {{numero_resolucion}}
San Miguel de Tucumán, {{fecha}}

**VISTO:**
El Expediente N.º {{numero_expediente}}, por el cual el/la agente {{agente}}, Legajo N.º {{legajo}}, solicita el adicional por título; y

**CONSIDERANDO:**
Que obra en autos copia certificada del título de {{titulo_obtenido}};
Que la Asesoría Letrada se expidió mediante Dictamen N.º {{numero_dictamen}} en sentido favorable;
Que corresponde reconocer el adicional conforme {{normativa}};

Por ello,

**LA DIRECCIÓN DE CAPITAL HUMANO**
**RESUELVE:**

**ARTÍCULO 1º.-** RECONOCER al/la agente {{agente}}, Legajo N.º {{legajo}}, el adicional por título de nivel {{nivel}} a partir del {{fecha_efecto}}.

**ARTÍCULO 2º.-** Pase a Liquidación de Haberes para su efectiva liquidación.

**ARTÍCULO 3º.-** Comuníquese, notifíquese y archívese.$md$,
'Tomá la fecha de efecto y el sentido del dictamen firmado que obre en el expediente. Si no hay dictamen firmado, indicá [COMPLETAR: falta dictamen] en lugar de suponerlo.'
),
(
  'LIC-HIJO-DISC', 'dictamen', 'Dictamen sobre licencia por hijo/a con discapacidad',
$md$**DICTAMEN N.º {{numero_dictamen}}**
Ref.: Expte. N.º {{numero_expediente}} — Licencia por atención de hijo/a con discapacidad (RESERVADO)

**I. ANTECEDENTES**
{{antecedentes}}

**II. ANÁLISIS**
{{analisis}}

**III. CONCLUSIÓN**
{{conclusion}}$md$,
'Expediente RESERVADO: no transcribas diagnósticos ni datos de salud más allá de lo imprescindible; referí a "la documentación médica obrante". Priorizá la continuidad de la asignación y del tratamiento.'
),
(
  'ASIG-FAMILIAR', 'resolucion', 'Resolución de asignación familiar',
$md$RESOLUCIÓN N.º {{numero_resolucion}}
San Miguel de Tucumán, {{fecha}}

**VISTO:**
El Expediente N.º {{numero_expediente}}, por el cual el/la agente {{agente}}, Legajo N.º {{legajo}}, solicita el alta de asignación familiar por {{tipo_asignacion}}; y

**CONSIDERANDO:**
Que se acompaña la documentación que acredita el vínculo con {{familiar}}, DNI {{dni_familiar}};
Que Liquidación de Haberes informa que corresponde el alta solicitada;
Que corresponde hacer lugar conforme {{normativa}};

Por ello,

**LA DIRECCIÓN DE CAPITAL HUMANO**
**RESUELVE:**

**ARTÍCULO 1º.-** OTORGAR al/la agente {{agente}} la asignación familiar por {{tipo_asignacion}} respecto de {{familiar}}, a partir del {{fecha_efecto}}.

**ARTÍCULO 2º.-** Pase a Liquidación de Haberes.

**ARTÍCULO 3º.-** Comuníquese, notifíquese y archívese.$md$,
'Si la asignación es por hijo/a con discapacidad, mencioná el CUD sin transcribir diagnóstico.'
)
) as p(codigo, tipo, nombre, cuerpo, instrucciones)
join public.tipos_tramite t on t.codigo = p.codigo;

