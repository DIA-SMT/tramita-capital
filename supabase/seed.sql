-- =====================================================================
-- Datos de ejemplo — SOLO DESARROLLO LOCAL (supabase db reset)
--
-- ⚠ Las áreas, circuitos, formularios y plantillas son PROVISORIOS:
--   se reemplazan cuando Capital Humano entregue el cursograma y los
--   modelos reales. Nunca cargar los usuarios demo en un proyecto remoto.
--
-- Usuarios demo (contraseña para todos: Tramita2026!)
--   ana.paz@demo.test        Agente (Secretaría de Obras Públicas)
--   jorge.ruiz@demo.test     Agente (Dirección de Tránsito)
--   mesa@demo.test           Mesa de Entradas · operador
--   licencias@demo.test      Sección Licencias · operador
--   dictamenes@demo.test     Asesoría Letrada · dictaminante (ve reservados)
--   despacho@demo.test       Despacho · operador
--   direccion@demo.test      Dirección de Capital Humano · firmante (ve reservados)
--   admin@demo.test          Administración del sistema
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

-- ---------------------------------------------------------------------
-- Usuarios demo (solo local)
-- ---------------------------------------------------------------------
do $$
declare
  u record;
begin
  for u in
    select * from (values
      ('11111111-1111-4111-8111-111111111111'::uuid, 'ana.paz@demo.test',    'Ana',    'Paz',    '27-30111222-4', '10234', 'Secretaría de Obras Públicas'),
      ('22222222-2222-4222-8222-222222222222'::uuid, 'jorge.ruiz@demo.test', 'Jorge',  'Ruiz',   '20-28999111-3', '08812', 'Dirección de Tránsito'),
      ('33333333-3333-4333-8333-333333333333'::uuid, 'mesa@demo.test',       'Lucía',  'Medina', '27-33444555-1', '11001', 'Capital Humano'),
      ('44444444-4444-4444-8444-444444444444'::uuid, 'licencias@demo.test',  'Pablo',  'Díaz',   '20-31222333-9', '11002', 'Capital Humano'),
      ('55555555-5555-4555-8555-555555555555'::uuid, 'dictamenes@demo.test', 'Inés',   'Vidal',  '27-25666777-2', '11003', 'Capital Humano'),
      ('66666666-6666-4666-8666-666666666666'::uuid, 'despacho@demo.test',   'Martín', 'Sosa',   '20-35777888-5', '11004', 'Capital Humano'),
      ('77777777-7777-4777-8777-777777777777'::uuid, 'direccion@demo.test',  'Laura',  'Campos', '27-24888999-0', '11005', 'Capital Humano'),
      ('99999999-9999-4999-8999-999999999999'::uuid, 'admin@demo.test',      'Admin',  'Sistema', null,           null,    'Dirección de IA')
    ) as t(id, email, nombre, apellido, cuil, legajo, reparticion)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
      extensions.crypt('Tramita2026!', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('nombre', u.nombre, 'apellido', u.apellido),
      now(), now(), '', '', '', ''
    );
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), u.id, u.id::text,
      jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
      'email', now(), now(), now()
    );
    update public.perfiles
       set cuil = u.cuil, legajo = u.legajo, reparticion = u.reparticion
     where id = u.id;
  end loop;

  update public.perfiles set es_admin = true where email = 'admin@demo.test';
end $$;

insert into public.miembros_area (perfil_id, area_id, rol, ve_reservados)
select p.id, a.id, m.rol::public.rol_area, m.reservados
from (values
  ('mesa@demo.test',       'MESA', 'operador',     false),
  ('licencias@demo.test',  'LIC',  'operador',     false),
  ('dictamenes@demo.test', 'DICT', 'dictaminante', true),
  ('despacho@demo.test',   'DESP', 'operador',     false),
  ('direccion@demo.test',  'DIR',  'firmante',     true),
  ('direccion@demo.test',  'LIQ',  'jefe',         true)
) as m(email, area, rol, reservados)
join public.perfiles p on p.email = m.email
join public.areas a on a.codigo = m.area;

-- ---------------------------------------------------------------------
-- Expedientes demo, generados con las mismas RPC que usa la aplicación
-- ---------------------------------------------------------------------
do $$
declare
  c_ana   constant uuid := '11111111-1111-4111-8111-111111111111';
  c_jorge constant uuid := '22222222-2222-4222-8222-222222222222';
  c_mesa  constant uuid := '33333333-3333-4333-8333-333333333333';
  c_lic   constant uuid := '44444444-4444-4444-8444-444444444444';
  c_desp  constant uuid := '66666666-6666-4666-8666-666666666666';
  c_dir   constant uuid := '77777777-7777-4777-8777-777777777777';
  v_exp   public.expedientes;
  v_act   uuid;
begin
  -- 1) Licencia por examen ya resuelta en 2 días (el "después" del tablero)
  perform set_config('request.jwt.claims', json_build_object('sub', c_jorge, 'role', 'authenticated')::text, false);
  v_exp := public.crear_expediente('LIC-EXAMEN', 'Licencia por examen — Análisis Matemático I',
    '{"institucion":"UTN Facultad Regional Tucumán","carrera":"Ingeniería Civil","materia":"Análisis Matemático I","fecha_examen":"2026-10-02","dias_solicitados":"2"}');
  perform set_config('request.jwt.claims', json_build_object('sub', c_mesa, 'role', 'authenticated')::text, false);
  perform public.pasar_expediente(v_exp.id, null, null, 'Requisitos completos. Pase a Licencias.');
  perform set_config('request.jwt.claims', json_build_object('sub', c_lic, 'role', 'authenticated')::text, false);
  perform public.pasar_expediente(v_exp.id, null, null, 'El agente registra 4 días disponibles en el período.');
  perform set_config('request.jwt.claims', json_build_object('sub', c_desp, 'role', 'authenticated')::text, false);
  insert into public.actuaciones (expediente_id, tipo, titulo, contenido, autor_id, area_id)
  values (v_exp.id, 'resolucion', 'Resolución: concede licencia por examen',
    e'**LA DIRECCIÓN DE CAPITAL HUMANO RESUELVE:**\n\n**ARTÍCULO 1º.-** CONCEDER al agente Jorge Ruiz, Legajo N.º 08812, licencia por examen por el término de dos (2) días a partir del 01/10/2026.\n\n**ARTÍCULO 2º.-** Comuníquese, notifíquese y archívese.',
    c_desp, (select id from public.areas where codigo = 'DESP'))
  returning id into v_act;
  perform public.pasar_expediente(v_exp.id, null, null, 'Se eleva proyecto de resolución para la firma.');
  perform set_config('request.jwt.claims', json_build_object('sub', c_dir, 'role', 'authenticated')::text, false);
  perform public.firmar_actuacion(v_act);
  perform public.pasar_expediente(v_exp.id, null, null, 'Firmada. Notifíquese.');
  perform set_config('request.jwt.claims', json_build_object('sub', c_mesa, 'role', 'authenticated')::text, false);
  perform public.archivar_expediente(v_exp.id, 'Notificado el agente por medios electrónicos. Archívese.');
  update public.expedientes set created_at = now() - interval '2 days', resuelto_at = now() - interval '6 hours' where id = v_exp.id;

  -- 2) Licencia por examen en Licencias, tomada por Pablo
  perform set_config('request.jwt.claims', json_build_object('sub', c_ana, 'role', 'authenticated')::text, false);
  v_exp := public.crear_expediente('LIC-EXAMEN', 'Licencia por examen — Derecho Administrativo',
    '{"institucion":"Universidad Nacional de Tucumán","carrera":"Abogacía","materia":"Derecho Administrativo","fecha_examen":"2026-10-09","dias_solicitados":"3"}');
  perform set_config('request.jwt.claims', json_build_object('sub', c_mesa, 'role', 'authenticated')::text, false);
  perform public.pasar_expediente(v_exp.id, null, null, 'Constancia de inscripción verificada.');
  perform set_config('request.jwt.claims', json_build_object('sub', c_lic, 'role', 'authenticated')::text, false);
  perform public.tomar_expediente(v_exp.id);
  update public.expedientes set created_at = now() - interval '20 hours' where id = v_exp.id;

  -- 3) Bonificación por título esperando dictamen
  perform set_config('request.jwt.claims', json_build_object('sub', c_jorge, 'role', 'authenticated')::text, false);
  v_exp := public.crear_expediente('BONIF-TITULO', 'Bonificación por título de Técnico Superior en Seguridad Vial',
    '{"titulo_obtenido":"Técnico Superior en Seguridad Vial","nivel":"Terciario","institucion":"Instituto Superior de Educación Vial","fecha_egreso":"2026-07-15"}');
  perform set_config('request.jwt.claims', json_build_object('sub', c_mesa, 'role', 'authenticated')::text, false);
  perform public.pasar_expediente(v_exp.id, null, null, 'Se adjunta copia certificada del título. Pase a Asesoría Letrada para dictamen.');
  update public.expedientes set created_at = now() - interval '3 days' where id = v_exp.id;

  -- 4) Asignación por hijo con discapacidad: prioridad alta, recién ingresada
  perform set_config('request.jwt.claims', json_build_object('sub', c_ana, 'role', 'authenticated')::text, false);
  v_exp := public.crear_expediente('ASIG-FAMILIAR', 'Asignación por hijo con discapacidad',
    '{"tipo_asignacion":"Hijo/a con discapacidad","familiar":"Paz, Tomás","dni_familiar":"55123456"}');
  update public.expedientes
     set prioridad = 'urgente', prioridad_origen = 'regla',
         prioridad_motivo = 'Asignación por hijo/a con discapacidad: un corte impacta directamente en el ingreso familiar.',
         created_at = now() - interval '2 hours'
   where id = v_exp.id;

  -- 5) Licencia por hijo/a con discapacidad (reservado) en Asesoría Letrada
  v_exp := public.crear_expediente('LIC-HIJO-DISC', 'Licencia por tratamiento de hijo',
    '{"hijo":"Paz, Tomás","dni_hijo":"55123456","desde":"2026-10-13","hasta":"2026-10-24","detalle":"Tratamiento intensivo indicado por el equipo interdisciplinario."}');
  perform set_config('request.jwt.claims', json_build_object('sub', c_mesa, 'role', 'authenticated')::text, false);
  perform public.pasar_expediente(v_exp.id, null, null, 'Documentación completa. Reservado.');
  update public.expedientes set created_at = now() - interval '26 hours' where id = v_exp.id;

  -- 6) Licencia por enfermedad observada
  perform set_config('request.jwt.claims', json_build_object('sub', c_jorge, 'role', 'authenticated')::text, false);
  v_exp := public.crear_expediente('LIC-ENFERMEDAD', 'Licencia por enfermedad desde el 30/09',
    '{"fecha_inicio":"2026-09-30","dias_indicados":"3"}');
  perform set_config('request.jwt.claims', json_build_object('sub', c_mesa, 'role', 'authenticated')::text, false);
  perform public.observar_expediente(v_exp.id, 'El certificado adjunto no tiene firma ni sello del profesional. Por favor, adjuntá una copia legible con firma y matrícula.');
  update public.expedientes set created_at = now() - interval '1 day' where id = v_exp.id;

  perform set_config('request.jwt.claims', '', false);
end $$;
