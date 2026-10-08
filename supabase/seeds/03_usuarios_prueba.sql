-- =====================================================================
-- Usuarios de PRUEBA, uno por rol de Capital Humano (etapa de testing).
-- El ingreso definitivo será por CiDiTuc; mientras tanto se entra con
-- email y contraseña. Contraseña de todos: 123456.
--
-- Quedan marcados con app_metadata.prueba = true. Para borrarlos antes de
-- producción (se borran también sus perfiles y membresías):
--   delete from auth.users where raw_app_meta_data ->> 'prueba' = 'true';
--
-- Idempotente: si el email ya existe, no lo duplica.
-- =====================================================================

do $$
declare
  u    record;
  v_id uuid;
begin
  for u in
    select * from (values
      -- email,                            nombre,            apellido,    legajo,  cuil,            repartición / dependencia
      ('agente@smt.gob.ar',               'Agente',          'de Prueba', '90001', '20-90000001-1', 'Secretaría de Obras Públicas'),
      ('bonificaciones@smt.gob.ar',       'Bonificaciones',  'de Prueba', '90002', '20-90000002-1', 'Dirección de Capital Humano'),
      ('jefe.bonificaciones@smt.gob.ar',  'Jefatura Bonif.', 'de Prueba', '90003', '20-90000003-1', 'Dirección de Capital Humano'),
      ('medicina@smt.gob.ar',             'Medicina Laboral','de Prueba', '90004', '20-90000004-1', 'Dirección de Capital Humano'),
      ('asesoria@smt.gob.ar',             'Asesoría Legal',  'de Prueba', '90005', '20-90000005-1', 'Dirección de Capital Humano'),
      ('direccion@smt.gob.ar',            'Dirección',       'de Prueba', '90006', '20-90000006-1', 'Dirección de Capital Humano'),
      ('mesa@smt.gob.ar',                 'Mesa de Entradas','de Prueba', '90007', '20-90000007-1', 'Dirección de Capital Humano'),
      ('licencias@smt.gob.ar',            'Licencias',       'de Prueba', '90008', '20-90000008-1', 'Dirección de Capital Humano'),
      ('despacho@smt.gob.ar',             'Despacho',        'de Prueba', '90009', '20-90000009-1', 'Dirección de Capital Humano'),
      ('liquidacion@smt.gob.ar',          'Liquidación',     'de Prueba', '90010', '20-90000010-1', 'Dirección de Capital Humano'),
      ('admin@smt.gob.ar',                'Administración',  'de Prueba', '90013', '20-90000013-1', 'Dirección de IA')
    ) as t(email, nombre, apellido, legajo, cuil, reparticion)
  loop
    select id into v_id from auth.users where email = u.email;
    if v_id is null then
      v_id := gen_random_uuid();
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, email_change, email_change_token_new, recovery_token
      ) values (
        '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', u.email,
        extensions.crypt('123456', extensions.gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"],"prueba":true}'::jsonb,
        jsonb_build_object('nombre', u.nombre, 'apellido', u.apellido),
        now(), now(), '', '', '', ''
      );
      insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      values (
        gen_random_uuid(), v_id, v_id::text,
        jsonb_build_object('sub', v_id::text, 'email', u.email, 'email_verified', true),
        'email', now(), now(), now()
      );
    end if;

    update public.perfiles
       set nombre = u.nombre, apellido = u.apellido, legajo = u.legajo, cuil = u.cuil,
           reparticion = u.reparticion, dependencia = u.reparticion, categoria = '18'
     where id = v_id;
  end loop;

  update public.perfiles set es_admin = true where email = 'admin@smt.gob.ar';
end $$;

-- Membresías: área y rol de cada usuario interno.
insert into public.miembros_area (perfil_id, area_id, rol, ve_reservados)
select p.id, a.id, m.rol::public.rol_area, m.reservados
from (values
  ('bonificaciones@smt.gob.ar',      'BONIF',  'operador',     false),
  ('jefe.bonificaciones@smt.gob.ar', 'BONIF',  'jefe',         true),
  ('medicina@smt.gob.ar',            'MEDLAB', 'operador',     true),
  ('asesoria@smt.gob.ar',            'DICT',   'dictaminante', true),
  ('direccion@smt.gob.ar',           'DIR',    'firmante',     true),
  ('mesa@smt.gob.ar',                'MESA',   'operador',     false),
  ('licencias@smt.gob.ar',           'LIC',    'operador',     false),
  ('despacho@smt.gob.ar',            'DESP',   'operador',     false),
  ('liquidacion@smt.gob.ar',         'LIQ',    'operador',     false)
) as m(email, area, rol, reservados)
join public.perfiles p on p.email = m.email
join public.areas a on a.codigo = m.area
on conflict (perfil_id, area_id) do update set rol = excluded.rol, ve_reservados = excluded.ve_reservados;
