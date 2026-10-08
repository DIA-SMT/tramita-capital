-- =====================================================================
-- Firma registrada del funcionario (firma electrónica, Ley 25.506 art. 5)
--
-- Cada funcionario registra una sola vez su firma manuscrita (dibujada o
-- escaneada), su aclaración, su cargo y una clave de firma de 6 dígitos.
-- Al firmar dictámenes y resoluciones, el sistema exige la clave y deja
-- en la foja la referencia a la firma registrada y la huella de la imagen;
-- todo eso queda dentro del hash SHA-256 encadenado de la foja.
--
-- La imagen es la representación visible. El valor probatorio está en la
-- autenticación (sesión + clave), el sellado de tiempo, la huella y la
-- trazabilidad, no en el dibujo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Registro
-- ---------------------------------------------------------------------
create table public.firmas_registradas (
  id                uuid primary key default gen_random_uuid(),
  perfil_id         uuid not null references public.perfiles (id) on delete cascade,
  aclaracion        text not null check (char_length(aclaracion) between 3 and 120),
  cargo             text not null check (char_length(cargo) between 3 and 160),
  imagen_path       text not null unique,
  imagen_sha256     text not null check (imagen_sha256 ~ '^[0-9a-f]{64}$'),
  pin_hash          text not null,
  activa            boolean not null default true,
  intentos_fallidos integer not null default 0,
  bloqueada_hasta   timestamptz,
  created_at        timestamptz not null default now(),
  revocada_at       timestamptz
);
create unique index firmas_registradas_una_activa on public.firmas_registradas (perfil_id) where activa;

alter table public.firmas_registradas enable row level security;
revoke all on public.firmas_registradas from anon, authenticated;
-- Nunca se expone pin_hash: solo columnas explícitas.
grant select (id, perfil_id, aclaracion, cargo, imagen_path, imagen_sha256, activa, bloqueada_hasta, created_at, revocada_at)
  on public.firmas_registradas to authenticated;

create policy firmas_registradas_lectura on public.firmas_registradas
  for select to authenticated
  using (perfil_id = (select auth.uid()) or (select public.es_admin()));

-- Firmas usadas en fojas: para mostrar la imagen a quien puede ver el expediente.
create index if not exists actuaciones_firma_registrada_idx
  on public.actuaciones ((datos -> 'firma' ->> 'registro_id'))
  where datos ? 'firma';

-- Por defecto los trámites no exigen firma registrada; el catálogo la activa por tipo.
alter table public.tipos_tramite
  add column if not exists firma_registrada boolean not null default false;

-- ---------------------------------------------------------------------
-- Storage: bucket privado de firmas (una carpeta por persona)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('firmas', 'firmas', false, 524288, array['image/png'])
on conflict (id) do nothing;

create policy "firmas_subir_propia" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'firmas'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.es_interno())
  );

-- La imagen de una firma se ve en las fojas que firmó, para quien puede ver ese expediente.
-- Security definer: la RLS de firmas_registradas solo deja ver la propia.
create or replace function public.puede_ver_firma(p_nombre text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.firmas_registradas f
    join public.actuaciones a on a.datos -> 'firma' ->> 'registro_id' = f.id::text
    where f.imagen_path = p_nombre
      and a.estado = 'firmada'
      and public.puede_ver_expediente(a.expediente_id)
  );
$$;

create policy "firmas_leer" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'firmas'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select public.es_admin())
      or public.puede_ver_firma(name)
    )
  );

-- ---------------------------------------------------------------------
-- Registrar y revocar
-- ---------------------------------------------------------------------
create or replace function public.registrar_firma(
  p_imagen_path   text,
  p_imagen_sha256 text,
  p_aclaracion    text,
  p_cargo         text,
  p_clave         text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  if v_uid is null or not public.es_interno() then
    raise exception 'Solo el personal de Capital Humano registra firma' using errcode = '42501';
  end if;
  if split_part(coalesce(p_imagen_path, ''), '/', 1) <> v_uid::text then
    raise exception 'La imagen de la firma no es tuya' using errcode = '42501';
  end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'firmas' and o.name = p_imagen_path) then
    raise exception 'No se encontró la imagen de la firma' using errcode = '22023';
  end if;
  if coalesce(p_clave, '') !~ '^[0-9]{6}$' then
    raise exception 'La clave de firma tiene que tener 6 números' using errcode = '22023';
  end if;
  if p_clave ~ '^(.)\1{5}$' or p_clave in ('123456', '654321', '012345', '123123') then
    raise exception 'Elegí una clave menos previsible' using errcode = '22023';
  end if;

  update public.firmas_registradas
     set activa = false, revocada_at = now()
   where perfil_id = v_uid and activa;

  insert into public.firmas_registradas (perfil_id, aclaracion, cargo, imagen_path, imagen_sha256, pin_hash)
  values (v_uid, trim(p_aclaracion), trim(p_cargo), p_imagen_path, lower(p_imagen_sha256),
          extensions.crypt(p_clave, extensions.gen_salt('bf', 10)))
  returning id into v_id;

  -- Constancia de registro (sin la clave).
  insert into public.auditoria (tabla, registro_id, accion, actor_id, datos)
  values ('firmas_registradas', v_id, 'registro', v_uid,
          jsonb_build_object('aclaracion', trim(p_aclaracion), 'cargo', trim(p_cargo), 'imagen_sha256', lower(p_imagen_sha256)));

  return jsonb_build_object('id', v_id);
end;
$$;

create or replace function public.revocar_firma()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  update public.firmas_registradas
     set activa = false, revocada_at = now()
   where perfil_id = v_uid and activa
  returning id into v_id;
  if v_id is not null then
    insert into public.auditoria (tabla, registro_id, accion, actor_id, datos)
    values ('firmas_registradas', v_id, 'revocacion', v_uid, '{}'::jsonb);
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Firmar: dictámenes y resoluciones con firma registrada y clave
-- Devuelve NULL si la clave es incorrecta (así el intento fallido queda
-- registrado: una excepción desharía el contador).
-- ---------------------------------------------------------------------
drop function if exists public.firmar_actuacion(uuid);

create or replace function public.firmar_actuacion(p_actuacion uuid, p_clave text default null)
returns public.actuaciones
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_act    public.actuaciones;
  v_exp    public.expedientes;
  v_tipo   public.tipos_tramite;
  v_rol    public.rol_area;
  v_firma  public.firmas_registradas;
  v_perfil public.perfiles;
  v_area   text;
  v_num    text;
  v_fecha  text;
  v_sello  jsonb;
begin
  select * into v_act from public.actuaciones where id = p_actuacion;
  if not found then
    raise exception 'Actuación inexistente';
  end if;
  if v_act.estado <> 'borrador' then
    raise exception 'La actuación ya fue firmada';
  end if;

  select * into v_exp from public.expedientes where id = v_act.expediente_id for update;
  select * into v_tipo from public.tipos_tramite where id = v_exp.tipo_tramite_id;
  v_rol := public.rol_en_area(v_exp.area_actual_id);

  if v_rol is null and not public.es_admin() then
    raise exception 'Solo el área que tiene el expediente puede firmar actuaciones' using errcode = '42501';
  end if;
  if v_act.tipo = 'resolucion' and coalesce(v_rol::text, '') not in ('firmante', 'jefe') then
    raise exception 'Firmar resoluciones requiere rol firmante o jefe' using errcode = '42501';
  end if;
  if v_act.tipo = 'dictamen' and coalesce(v_rol::text, '') not in ('dictaminante', 'firmante', 'jefe') then
    raise exception 'Firmar dictámenes requiere rol dictaminante' using errcode = '42501';
  end if;

  select * into v_perfil from public.perfiles where id = v_uid;
  select nombre into v_area from public.areas where id = v_exp.area_actual_id;

  -- Firma registrada: obligatoria para resoluciones de trámites que la exigen;
  -- si la persona la tiene, se usa en todos sus dictámenes y resoluciones.
  if v_act.tipo in ('resolucion', 'dictamen') then
    select * into v_firma from public.firmas_registradas where perfil_id = v_uid and activa for update;
    if not found then
      if v_act.tipo = 'resolucion' and v_tipo.firma_registrada then
        raise exception 'Este trámite requiere firma registrada. Registrala en "Mi firma" antes de firmar.' using errcode = '42501';
      end if;
    else
      if v_firma.bloqueada_hasta is not null and v_firma.bloqueada_hasta > now() then
        raise exception 'Firma bloqueada por intentos fallidos. Probá de nuevo después de las %.',
          to_char(v_firma.bloqueada_hasta at time zone 'America/Argentina/Tucuman', 'HH24:MI') using errcode = '42501';
      end if;
      if p_clave is null or extensions.crypt(p_clave, v_firma.pin_hash) <> v_firma.pin_hash then
        update public.firmas_registradas
           set intentos_fallidos = case when intentos_fallidos + 1 >= 5 then 0 else intentos_fallidos + 1 end,
               bloqueada_hasta  = case when intentos_fallidos + 1 >= 5 then now() + interval '15 minutes' else bloqueada_hasta end
         where id = v_firma.id;
        insert into public.auditoria (tabla, registro_id, accion, actor_id, datos)
        values ('firmas_registradas', v_firma.id, 'clave_incorrecta', v_uid, jsonb_build_object('actuacion', p_actuacion));
        return null;
      end if;
      update public.firmas_registradas set intentos_fallidos = 0, bloqueada_hasta = null where id = v_firma.id;
      v_sello := jsonb_build_object(
        'tipo', 'registrada',
        'registro_id', v_firma.id,
        'aclaracion', v_firma.aclaracion,
        'cargo', v_firma.cargo,
        'imagen_path', v_firma.imagen_path,
        'imagen_sha256', v_firma.imagen_sha256
      );
    end if;
  end if;

  -- Sin firma registrada: firma electrónica simple con los datos de la sesión.
  v_sello := coalesce(v_sello, jsonb_build_object(
    'tipo', 'electronica',
    'aclaracion', nullif(trim(concat_ws(' ', v_perfil.nombre, v_perfil.apellido)), ''),
    'cargo', v_area
  ));

  -- El borrador es editable por el área: firma y protocolo solo los escribe el sistema.
  update public.actuaciones
     set area_id = coalesce(area_id, v_exp.area_actual_id),
         datos   = (datos - 'firma' - 'protocolo') || jsonb_build_object('firma', v_sello)
   where id = v_act.id;

  -- Resoluciones: número y fecha se asignan al firmar (reemplaza la protocolización manual).
  if v_act.tipo = 'resolucion' then
    v_num := public.siguiente_resolucion();
    v_fecha := to_char(now() at time zone 'America/Argentina/Tucuman', 'DD/MM/YYYY');
    update public.actuaciones
       set contenido = replace(replace(coalesce(contenido, ''), '{{numero_resolucion}}', v_num), '{{fecha_resolucion}}', v_fecha),
           titulo    = titulo || ' — Res. N.º ' || v_num,
           datos     = datos || jsonb_build_object('protocolo', jsonb_build_object('numero', v_num, 'fecha', v_fecha))
     where id = v_act.id;
  end if;

  v_act := public._sellar_actuacion(p_actuacion, v_uid);

  if v_act.tipo = 'resolucion' then
    update public.expedientes
       set estado = 'resuelto',
           resuelto_at = now(),
           resultado = case when v_act.datos ->> 'sentido' = 'rechaza' then 'rechazado' else 'aprobado' end
     where id = v_exp.id;
    insert into public.legajo_documentos (perfil_id, expediente_id, actuacion_id, tipo, titulo)
    values (v_exp.iniciador_id, v_exp.id, v_act.id, 'resolucion', v_act.titulo);
  end if;

  if v_act.ia_generacion_id is not null then
    update public.ia_generaciones set aceptada = true where id = v_act.ia_generacion_id;
  end if;

  return v_act;
end;
$$;

-- ---------------------------------------------------------------------
-- Verificación pública de una foja impresa (código = primeros 20 hex del hash)
-- Devuelve solo lo necesario para comprobar autenticidad e integridad:
-- nunca el contenido ni datos del agente.
-- ---------------------------------------------------------------------
create or replace function public.verificar_foja(p_codigo text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_act public.actuaciones;
  v_ok  boolean;
begin
  if coalesce(p_codigo, '') !~ '^[0-9a-f]{20}$' then
    return null;
  end if;
  select * into v_act from public.actuaciones
   where estado = 'firmada' and hash like p_codigo || '%'
   limit 1;
  if not found then
    return null;
  end if;
  v_ok := public.hash_actuacion(v_act) = v_act.hash;
  return jsonb_build_object(
    'tipo', v_act.tipo,
    'protocolo', v_act.datos -> 'protocolo' ->> 'numero',
    'foja', v_act.foja,
    'firmada_at', v_act.firmada_at,
    'firmante', v_act.datos -> 'firma' ->> 'aclaracion',
    'cargo', v_act.datos -> 'firma' ->> 'cargo',
    'firma_registrada', (v_act.datos -> 'firma' ->> 'tipo') = 'registrada',
    'integra', v_ok
  );
end;
$$;

create index if not exists actuaciones_hash_prefijo_idx on public.actuaciones (hash text_pattern_ops) where estado = 'firmada';

-- ---------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------
revoke execute on function public.registrar_firma(text, text, text, text, text) from public, anon;
revoke execute on function public.revocar_firma() from public, anon;
revoke execute on function public.puede_ver_firma(text) from public, anon;
grant execute on function public.puede_ver_firma(text) to authenticated;
revoke execute on function public.firmar_actuacion(uuid, text) from public, anon;
grant execute on function public.registrar_firma(text, text, text, text, text) to authenticated;
grant execute on function public.revocar_firma() to authenticated;
grant execute on function public.firmar_actuacion(uuid, text) to authenticated;
-- La verificación es pública (QR de la copia impresa).
grant execute on function public.verificar_foja(text) to anon, authenticated;
