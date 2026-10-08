-- =====================================================================
-- Firma ológrafa electrónica verificada (solo resoluciones)
--
-- Registro: la persona dibuja su firma tres veces; se guarda el patrón
-- normalizado de cada una (forma, orden y dirección del trazo) y un umbral
-- adaptado a su propia variación. Nunca se expone por la API.
--
-- Al firmar una resolución: dibuja la firma en ese momento, la base la
-- compara con el patrón (DTW) y exige además la clave de 6 números.
-- Lo que se estampa es la firma dibujada en ese acto, no una copia.
-- Dictámenes y demás fojas: firma electrónica simple con la sesión.
-- =====================================================================

alter table public.firmas_registradas
  add column if not exists muestras       jsonb,
  add column if not exists umbral         numeric,
  add column if not exists duracion_media integer,
  add column if not exists trazos_medio   numeric;

-- Ya no depende del trámite: toda resolución se firma con firma ológrafa verificada.
alter table public.tipos_tramite drop column if exists firma_registrada;

-- Intentos fallidos de firma (clave o trazo): para el bloqueo y la auditoría.
create table if not exists public.intentos_firma (
  id           bigint generated always as identity primary key,
  perfil_id    uuid not null references public.perfiles (id) on delete cascade,
  actuacion_id uuid references public.actuaciones (id) on delete set null,
  motivo       text not null check (motivo in ('clave', 'trazo')),
  puntaje      numeric,
  created_at   timestamptz not null default now()
);
create index if not exists intentos_firma_perfil_idx on public.intentos_firma (perfil_id, created_at desc);
alter table public.intentos_firma enable row level security;
revoke all on public.intentos_firma from anon, authenticated;
grant select on public.intentos_firma to authenticated;
create policy intentos_firma_lectura on public.intentos_firma
  for select to authenticated
  using (perfil_id = (select auth.uid()) or (select public.es_admin()));

-- ---------------------------------------------------------------------
-- Comparación de trazos (misma fórmula que src/lib/firma-trazo.ts)
-- ---------------------------------------------------------------------
create or replace function public._dtw(a float8[], b float8[], p_dim integer, p_ventana integer)
returns float8
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  n      integer := array_length(a, 1) / p_dim;
  m      integer := array_length(b, 1) / p_dim;
  inf    float8 := 'Infinity';
  previa float8[];
  actual float8[];
  i integer; j integer; k integer;
  d float8; c float8;
begin
  previa := array_fill(inf, array[m + 1]);
  previa[1] := 0;
  for i in 1..n loop
    actual := array_fill(inf, array[m + 1]);
    for j in greatest(1, i - p_ventana)..least(m, i + p_ventana) loop
      d := 0;
      for k in 0..p_dim - 1 loop
        c := a[(i - 1) * p_dim + k + 1] - b[(j - 1) * p_dim + k + 1];
        d := d + c * c;
      end loop;
      actual[j + 1] := sqrt(d) + least(previa[j + 1], actual[j], previa[j]);
    end loop;
    previa := actual;
  end loop;
  return previa[m + 1] / (n + m);
end;
$$;

-- Patrón válido: 64 puntos × 4 valores numéricos acotados, duración y trazos razonables.
create or replace function public._patron_valido(p jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
begin
  if coalesce(jsonb_typeof(p), '') <> 'object' or coalesce(jsonb_typeof(p -> 'v'), '') <> 'array' then
    return false;
  end if;
  if jsonb_array_length(p -> 'v') <> 256 then
    return false;
  end if;
  if exists (select 1 from jsonb_array_elements(p -> 'v') e where jsonb_typeof(e) <> 'number') then
    return false;
  end if;
  if exists (select 1 from jsonb_array_elements(p -> 'v') e where abs(e::text::float8) > 50) then
    return false;
  end if;
  if coalesce(jsonb_typeof(p -> 'duracion'), '') <> 'number' or coalesce(jsonb_typeof(p -> 'trazos'), '') <> 'number' then
    return false;
  end if;
  return (p ->> 'duracion')::numeric between 150 and 120000 and (p ->> 'trazos')::numeric between 1 and 60;
end;
$$;

create or replace function public._patron_vector(p jsonb)
returns float8[]
language sql
immutable
set search_path = ''
as $$
  select array_agg(e::text::float8 order by o) from jsonb_array_elements(p -> 'v') with ordinality as t(e, o)
$$;

-- ---------------------------------------------------------------------
-- Registro: tres muestras dibujadas
-- ---------------------------------------------------------------------
drop function if exists public.registrar_firma(text, text, text, text, text);

create or replace function public.registrar_firma(
  p_imagen_path   text,
  p_imagen_sha256 text,
  p_aclaracion    text,
  p_cargo         text,
  p_clave         text,
  p_muestras      jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_id    uuid;
  v_a     float8[];
  v_b     float8[];
  v_c     float8[];
  v_intra float8;
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
  if coalesce(jsonb_typeof(p_muestras), '') <> 'array' then
    raise exception 'Dibujá tu firma tres veces para registrarla' using errcode = '22023';
  end if;
  if jsonb_array_length(p_muestras) <> 3
     or not (public._patron_valido(p_muestras -> 0) and public._patron_valido(p_muestras -> 1) and public._patron_valido(p_muestras -> 2)) then
    raise exception 'Dibujá tu firma tres veces para registrarla' using errcode = '22023';
  end if;

  v_a := public._patron_vector(p_muestras -> 0);
  v_b := public._patron_vector(p_muestras -> 1);
  v_c := public._patron_vector(p_muestras -> 2);
  v_intra := greatest(public._dtw(v_a, v_b, 4, 12), public._dtw(v_a, v_c, 4, 12), public._dtw(v_b, v_c, 4, 12));
  if v_intra > 0.30 then
    raise exception 'Tus tres firmas son muy distintas entre sí. Dibujalas de nuevo, con calma y del mismo modo.' using errcode = '22023';
  end if;

  update public.firmas_registradas
     set activa = false, revocada_at = now()
   where perfil_id = v_uid and activa;

  insert into public.firmas_registradas
    (perfil_id, aclaracion, cargo, imagen_path, imagen_sha256, pin_hash, muestras, umbral, duracion_media, trazos_medio)
  select v_uid, trim(p_aclaracion), trim(p_cargo), p_imagen_path, lower(p_imagen_sha256),
         extensions.crypt(p_clave, extensions.gen_salt('bf', 10)),
         p_muestras,
         least(0.30, greatest(0.12, v_intra * 1.6)),
         round(avg((m ->> 'duracion')::numeric)),
         avg((m ->> 'trazos')::numeric)
    from jsonb_array_elements(p_muestras) m
  returning id into v_id;

  insert into public.auditoria (tabla, registro_id, accion, actor_id, datos)
  values ('firmas_registradas', v_id, 'registro', v_uid,
          jsonb_build_object('aclaracion', trim(p_aclaracion), 'cargo', trim(p_cargo), 'variacion', round(v_intra::numeric, 4)));

  return jsonb_build_object('id', v_id);
end;
$$;

-- ---------------------------------------------------------------------
-- Firmar
--   Resolución: firma registrada vigente + clave + trazo verificado + imagen del acto.
--   Devuelve NULL si la clave o el trazo no coinciden (el intento queda registrado
--   en intentos_firma; una excepción desharía el contador).
--   Otras fojas: firma electrónica simple.
-- ---------------------------------------------------------------------
drop function if exists public.firmar_actuacion(uuid, text);

create or replace function public.firmar_actuacion(
  p_actuacion     uuid,
  p_clave         text default null,
  p_trazo         jsonb default null,
  p_imagen_path   text default null,
  p_imagen_sha256 text default null
)
returns public.actuaciones
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_act     public.actuaciones;
  v_exp     public.expedientes;
  v_rol     public.rol_area;
  v_firma   public.firmas_registradas;
  v_perfil  public.perfiles;
  v_area    text;
  v_num     text;
  v_fecha   text;
  v_sello   jsonb;
  v_trazo   float8[];
  v_puntaje float8;
  v_motivo  text;
begin
  select * into v_act from public.actuaciones where id = p_actuacion;
  if not found then
    raise exception 'Actuación inexistente';
  end if;
  if v_act.estado <> 'borrador' then
    raise exception 'La actuación ya fue firmada';
  end if;

  select * into v_exp from public.expedientes where id = v_act.expediente_id for update;
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

  if v_act.tipo = 'resolucion' then
    select * into v_firma from public.firmas_registradas where perfil_id = v_uid and activa for update;
    if not found or v_firma.muestras is null then
      raise exception 'Para firmar resoluciones registrá tu firma en "Mi firma".' using errcode = '42501';
    end if;
    if v_firma.bloqueada_hasta is not null and v_firma.bloqueada_hasta > now() then
      raise exception 'Firma bloqueada por intentos fallidos. Probá de nuevo después de las %.',
        to_char(v_firma.bloqueada_hasta at time zone 'America/Argentina/Tucuman', 'HH24:MI') using errcode = '42501';
    end if;
    -- Datos incompletos: no cuentan como intento.
    if p_clave is null or p_trazo is null or not public._patron_valido(p_trazo) then
      raise exception 'Para firmar la resolución dibujá tu firma e ingresá tu clave.' using errcode = '22023';
    end if;
    if split_part(coalesce(p_imagen_path, ''), '/', 1) <> v_uid::text
       or not exists (select 1 from storage.objects o where o.bucket_id = 'firmas' and o.name = p_imagen_path) then
      raise exception 'No se encontró la imagen de la firma dibujada' using errcode = '22023';
    end if;

    if extensions.crypt(p_clave, v_firma.pin_hash) <> v_firma.pin_hash then
      v_motivo := 'clave';
    else
      v_trazo := public._patron_vector(p_trazo);
      select min(public._dtw(v_trazo, public._patron_vector(m), 4, 12)) into v_puntaje
        from jsonb_array_elements(v_firma.muestras) m;
      if v_puntaje > v_firma.umbral
         or (p_trazo ->> 'duracion')::numeric not between v_firma.duracion_media / 3.0 and v_firma.duracion_media * 3.0
         or abs((p_trazo ->> 'trazos')::numeric - v_firma.trazos_medio) > greatest(2, v_firma.trazos_medio * 0.6) then
        v_motivo := 'trazo';
      end if;
    end if;

    if v_motivo is not null then
      update public.firmas_registradas
         set intentos_fallidos = case when intentos_fallidos + 1 >= 5 then 0 else intentos_fallidos + 1 end,
             bloqueada_hasta  = case when intentos_fallidos + 1 >= 5 then now() + interval '15 minutes' else bloqueada_hasta end
       where id = v_firma.id;
      insert into public.intentos_firma (perfil_id, actuacion_id, motivo, puntaje)
      values (v_uid, p_actuacion, v_motivo, round(v_puntaje::numeric, 4));
      insert into public.auditoria (tabla, registro_id, accion, actor_id, datos)
      values ('firmas_registradas', v_firma.id, 'firma_rechazada', v_uid,
              jsonb_build_object('actuacion', p_actuacion, 'motivo', v_motivo, 'puntaje', round(v_puntaje::numeric, 4)));
      return null;
    end if;

    update public.firmas_registradas set intentos_fallidos = 0, bloqueada_hasta = null where id = v_firma.id;
    v_sello := jsonb_build_object(
      'tipo', 'olografa',
      'registro_id', v_firma.id,
      'aclaracion', v_firma.aclaracion,
      'cargo', v_firma.cargo,
      'imagen_path', p_imagen_path,
      'imagen_sha256', lower(p_imagen_sha256),
      'puntaje', round(v_puntaje::numeric, 4),
      'umbral', v_firma.umbral
    );
  else
    v_sello := jsonb_build_object(
      'tipo', 'electronica',
      'aclaracion', nullif(trim(concat_ws(' ', v_perfil.nombre, v_perfil.apellido)), ''),
      'cargo', v_area
    );
  end if;

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

-- La imagen estampada es la dibujada en el acto: se ve en la foja que la lleva.
create index if not exists actuaciones_firma_imagen_idx
  on public.actuaciones ((datos -> 'firma' ->> 'imagen_path'))
  where datos ? 'firma';

create or replace function public.puede_ver_firma(p_nombre text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.actuaciones a
    where a.datos -> 'firma' ->> 'imagen_path' = p_nombre
      and a.estado = 'firmada'
      and public.puede_ver_expediente(a.expediente_id)
  );
$$;

create or replace function public.verificar_foja(p_codigo text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_act public.actuaciones;
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
  return jsonb_build_object(
    'tipo', v_act.tipo,
    'protocolo', v_act.datos -> 'protocolo' ->> 'numero',
    'foja', v_act.foja,
    'firmada_at', v_act.firmada_at,
    'firmante', v_act.datos -> 'firma' ->> 'aclaracion',
    'cargo', v_act.datos -> 'firma' ->> 'cargo',
    'firma_olografa', (v_act.datos -> 'firma' ->> 'tipo') = 'olografa',
    'integra', public.hash_actuacion(v_act) = v_act.hash
  );
end;
$$;

-- ---------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------
revoke execute on function public._dtw(float8[], float8[], integer, integer) from public, anon, authenticated;
revoke execute on function public._patron_valido(jsonb) from public, anon, authenticated;
revoke execute on function public._patron_vector(jsonb) from public, anon, authenticated;
revoke execute on function public.registrar_firma(text, text, text, text, text, jsonb) from public, anon;
revoke execute on function public.firmar_actuacion(uuid, text, jsonb, text, text) from public, anon;
grant execute on function public.registrar_firma(text, text, text, text, text, jsonb) to authenticated;
grant execute on function public.firmar_actuacion(uuid, text, jsonb, text, text) to authenticated;
grant execute on function public.verificar_foja(text) to anon, authenticated;
