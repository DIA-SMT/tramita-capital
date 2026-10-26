-- Ayudantes de las pruebas de base. Cada archivo los incluye con \ir dentro de su transacción,
-- así que todo (personas, trámites, expedientes) se deshace al terminar. Las pruebas crean sus
-- propias personas y su propio trámite: solo dependen de las áreas del catálogo.

create extension if not exists pgtap with schema extensions;
create schema if not exists pruebas;
grant usage on schema pruebas to anon, authenticated;

-- Persona nueva: el trigger de Auth le crea el perfil.
create or replace function pruebas.persona(p_email text, p_nombre text default 'Persona', p_apellido text default 'de Prueba')
returns uuid
language plpgsql
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', p_email, '', now(),
          '{"provider":"email","providers":["email"]}', jsonb_build_object('nombre', p_nombre, 'apellido', p_apellido), now(), now());
  return v_id;
end;
$$;

-- Persona del personal interno, con su área y su rol.
create or replace function pruebas.interno(p_email text, p_area text, p_rol public.rol_area default 'operador', p_reservados boolean default false)
returns uuid
language plpgsql
as $$
declare
  v_id uuid := pruebas.persona(p_email, initcap(split_part(p_email, '@', 1)), 'de Prueba');
begin
  insert into public.miembros_area (perfil_id, area_id, rol, ve_reservados)
  select v_id, a.id, p_rol, p_reservados from public.areas a where a.codigo = p_area;
  if not found then
    raise exception 'No existe el área %', p_area;
  end if;
  return v_id;
end;
$$;

-- Actuar como una persona, igual que desde la app (rol authenticated y su id en el JWT).
-- `reset role` vuelve al usuario de la prueba (postgres).
create or replace function pruebas.como(p_perfil uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_perfil, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

create or replace function pruebas.anonimo()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);
end;
$$;

-- Trámite de prueba con el circuito de Bonificaciones:
-- 1 control (BONIF) → 2 dictamen (DICT) → 3 proyecto (BONIF) → 4 firma (DIR) → 5 novedad (BONIF).
create or replace function pruebas.tramite(p_codigo text, p_reservado boolean default false)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  insert into public.tipos_tramite (codigo, nombre, categoria, formulario, requisitos, plazo_dias, reservado, documentacion_final)
  values (
    p_codigo, 'Trámite de prueba ' || p_codigo, 'Pruebas',
    '[{"clave":"titulo","etiqueta":"Título","tipo":"texto","obligatorio":true},{"clave":"nota","etiqueta":"Nota","tipo":"texto","obligatorio":false}]',
    '[{"clave":"titulo_pdf","nombre":"Título","obligatorio":true}]',
    10, p_reservado, '{titulo_pdf}'
  )
  returning id into v_id;
  insert into public.pasos_circuito (tipo_tramite_id, orden, nombre, area_id, accion)
  select v_id, v.orden, v.nombre, a.id, v.accion::public.accion_paso
  from (values
    (1, 'Control', 'BONIF', 'analisis'),
    (2, 'Dictamen', 'DICT', 'dictamen'),
    (3, 'Proyecto de resolución', 'BONIF', 'resolucion'),
    (4, 'Firma', 'DIR', 'firma'),
    (5, 'Novedad a Liquidación', 'BONIF', 'liquidacion')
  ) as v(orden, nombre, area, accion)
  join public.areas a on a.codigo = v.area;
  return v_id;
end;
$$;

-- Lleva el expediente a un paso del circuito sin pasar por las RPC (para preparar un caso).
create or replace function pruebas.llevar(p_expediente uuid, p_orden integer)
returns void
language sql
as $$
  update public.expedientes e
     set paso_actual = p.orden, area_actual_id = p.area_id, estado = 'en_tramite'
    from public.pasos_circuito p
   where e.id = p_expediente and p.tipo_tramite_id = e.tipo_tramite_id and p.orden = p_orden;
$$;

-- Deja el expediente resuelto en el paso de novedad, con una resolución firmada (sin firma ológrafa).
create or replace function pruebas.resolver(p_expediente uuid, p_resultado text default 'aprobado')
returns uuid
language plpgsql
as $$
declare
  v_res public.actuaciones;
begin
  perform pruebas.llevar(p_expediente, 5);
  v_res := public._incorporar_actuacion(
    p_expediente, 'resolucion', 'Resolución — Res. N.º 99/DCH/2026',
    'Hace lugar a lo solicitado a partir de agosto de 2026.',
    '{"protocolo":{"numero":"99/DCH/2026","fecha":"20/10/2026"}}',
    (select iniciador_id from public.expedientes where id = p_expediente), null
  );
  update public.expedientes set estado = 'resuelto', resultado = p_resultado, resuelto_at = now() where id = p_expediente;
  return v_res.id;
end;
$$;

-- Firmas sintéticas (pruebas.firma y pruebas.patron_ts). Van antes de las funciones SQL que
-- las usan: Postgres valida el cuerpo de una función SQL al crearla.
\ir firmas.inc

-- Firma registrada de la persona actual con las muestras sintéticas (clave 482915).
create or replace function pruebas.registrar_mi_firma()
returns jsonb
language sql
as $$
  select public.registrar_firma(
    'Persona de Prueba', 'Directora de Capital Humano', '482915',
    jsonb_build_array(pruebas.firma('muestra1'), pruebas.firma('muestra2'), pruebas.firma('muestra3')),
    'pen', '#1e3a8a'
  );
$$;

grant execute on all functions in schema pruebas to anon, authenticated;

-- pgTAP guarda los resultados en tablas temporales de esta sesión: las pruebas que corren con
-- el rol de la app (authenticated o anon) también tienen que poder escribirlas.
create or replace function pruebas.compartir_resultados()
returns void
language plpgsql
as $$
begin
  execute format('grant all on all tables in schema %I to anon, authenticated', pg_my_temp_schema()::regnamespace);
  execute format('grant all on all sequences in schema %I to anon, authenticated', pg_my_temp_schema()::regnamespace);
end;
$$;
