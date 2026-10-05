-- =====================================================================
-- Datos demo — SOLO DESARROLLO LOCAL (supabase db reset)
-- Nunca cargar en un proyecto remoto: crea usuarios con contraseña conocida.
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
