-- =====================================================================
-- Firma ológrafa electrónica: biometría dinámica completa
--
-- El navegador envía el trazo CRUDO (x, y, tiempo y presión de cada punto).
-- La base calcula sola el patrón (forma + ritmo), lo compara, y estampa el
-- trazo verificado dentro del sello de la foja: la imagen de la firma no
-- puede diferir de lo que se validó. El trazo crudo queda como evidencia
-- pericial ligada a la foja por su huella SHA-256 (solo auditoría).
--
-- Espejo exacto en TypeScript: src/lib/firma-trazo.ts (calibración en
-- scripts/calibrar-firma.ts). Las firmas registradas con la versión 1
-- se dan de baja: hay que registrarlas de nuevo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Patrón biométrico a partir del trazo crudo
-- ---------------------------------------------------------------------
create or replace function public._r3(x float8) returns float8
language sql immutable set search_path = '' as $$ select floor(x * 1000 + 0.5) / 1000 $$;
create or replace function public._r1(x float8) returns float8
language sql immutable set search_path = '' as $$ select floor(x * 10 + 0.5) / 10 $$;

-- Trazo crudo válido: arreglo de hasta 60 trazos; cada punto [x, y, t, p] numérico y acotado.
create or replace function public._firma_crudo_valido(p_crudo jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
begin
  if coalesce(jsonb_typeof(p_crudo), '') <> 'array' then
    return false;
  end if;
  if jsonb_array_length(p_crudo) = 0 or jsonb_array_length(p_crudo) > 60 then
    return false;
  end if;
  if exists (select 1 from jsonb_array_elements(p_crudo) t where jsonb_typeof(t) <> 'array') then
    return false;
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_crudo) t, jsonb_array_elements(t) p
    where case
      when jsonb_typeof(p) <> 'array' then true
      when jsonb_array_length(p) <> 4 then true
      else jsonb_typeof(p -> 0) <> 'number' or jsonb_typeof(p -> 1) <> 'number'
        or jsonb_typeof(p -> 2) <> 'number' or jsonb_typeof(p -> 3) <> 'number'
    end
  ) then
    return false;
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_crudo) t, jsonb_array_elements(t) p
    where abs((p ->> 0)::float8) > 20000 or abs((p ->> 1)::float8) > 20000
       or (p ->> 2)::float8 < 0 or (p ->> 2)::float8 > 600000
       or (p ->> 3)::float8 < -1 or (p ->> 3)::float8 > 1
  ) then
    return false;
  end if;
  return (select count(*) from jsonb_array_elements(p_crudo) t, jsonb_array_elements(t) p) between 12 and 5000;
end;
$$;

create or replace function public._firma_patron(p_crudo jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  xs float8[]; ys float8[]; ts float8[]; ks integer[];
  n integer; k integer;
  minx float8; maxx float8; miny float8; maxy float8; mint float8; maxt float8;
  sx float8 := 0; sy float8 := 0;
  ancho float8; alto float8; cx float8; cy float8; esc float8;
  qx float8[]; qy float8[]; vel float8[]; acum float8[];
  largo float8 := 0; pausas float8 := 0;
  dq float8; d float8;
  total float8; objetivo float8; tramo float8; f float8;
  rx float8[]; ry float8[]; rv float8[];
  i integer; j integer; m integer; a integer; b integer;
  sv float8 := 0; vm float8; dx float8; dy float8; dd float8;
  v float8[]; r float8[];
  duracion float8;
begin
  if not public._firma_crudo_valido(p_crudo) then
    return null;
  end if;

  select array_agg((p ->> 0)::float8 order by tr.ti, y.pi),
         array_agg((p ->> 1)::float8 order by tr.ti, y.pi),
         array_agg((p ->> 2)::float8 order by tr.ti, y.pi),
         array_agg(tr.tk order by tr.ti, y.pi)
    into xs, ys, ts, ks
    from (select x.t, x.ti, dense_rank() over (order by x.ti)::integer as tk
            from jsonb_array_elements(p_crudo) with ordinality as x(t, ti)
           where jsonb_array_length(x.t) > 0) tr,
         jsonb_array_elements(tr.t) with ordinality as y(p, pi);

  n := array_length(xs, 1);
  k := ks[n];
  if n is null or n < 12 or n > 5000 or k > 60 then
    return null;
  end if;

  minx := xs[1]; maxx := xs[1]; miny := ys[1]; maxy := ys[1]; mint := ts[1]; maxt := ts[1];
  for i in 1..n loop
    if xs[i] < minx then minx := xs[i]; end if;
    if xs[i] > maxx then maxx := xs[i]; end if;
    if ys[i] < miny then miny := ys[i]; end if;
    if ys[i] > maxy then maxy := ys[i]; end if;
    if ts[i] < mint then mint := ts[i]; end if;
    if ts[i] > maxt then maxt := ts[i]; end if;
    sx := sx + xs[i];
    sy := sy + ys[i];
  end loop;
  ancho := maxx - minx;
  alto := maxy - miny;
  if greatest(ancho, alto) < 20 then
    return null;
  end if;
  cx := sx / n;
  cy := sy / n;
  esc := case when alto > 0 then alto else ancho end;

  -- Posición normalizada, velocidad en cada punto y largo acumulado del recorrido.
  for i in 1..n loop
    qx[i] := (xs[i] - cx) / esc;
    qy[i] := (ys[i] - cy) / esc;
    if i = 1 then
      vel[1] := 0;
      acum[1] := 0;
      continue;
    end if;
    dq := sqrt((qx[i] - qx[i - 1]) * (qx[i] - qx[i - 1]) + (qy[i] - qy[i - 1]) * (qy[i] - qy[i - 1]));
    acum[i] := acum[i - 1] + dq;
    if ks[i] = ks[i - 1] then
      d := sqrt((xs[i] - xs[i - 1]) * (xs[i] - xs[i - 1]) + (ys[i] - ys[i - 1]) * (ys[i] - ys[i - 1]));
      vel[i] := d / greatest(1, ts[i] - ts[i - 1]);
      largo := largo + dq;
    else
      vel[i] := 0;
      pausas := pausas + (ts[i] - ts[i - 1]);
    end if;
  end loop;

  -- Remuestreo a 64 puntos equidistantes sobre el recorrido.
  total := case when acum[n] > 0 then acum[n] else 1 end;
  j := 2;
  for m in 0..63 loop
    objetivo := (total * m) / 63;
    while j < n and acum[j] < objetivo loop
      j := j + 1;
    end loop;
    tramo := case when acum[j] - acum[j - 1] > 0 then acum[j] - acum[j - 1] else 1 end;
    f := least(1, greatest(0, (objetivo - acum[j - 1]) / tramo));
    rx[m + 1] := qx[j - 1] + (qx[j] - qx[j - 1]) * f;
    ry[m + 1] := qy[j - 1] + (qy[j] - qy[j - 1]) * f;
    rv[m + 1] := vel[j - 1] + (vel[j] - vel[j - 1]) * f;
  end loop;

  for m in 1..64 loop
    sv := sv + rv[m];
  end loop;
  vm := sv / 64;
  for m in 1..64 loop
    a := greatest(1, m - 1);
    b := least(64, m + 1);
    dx := rx[b] - rx[a];
    dy := ry[b] - ry[a];
    dd := case when sqrt(dx * dx + dy * dy) > 0 then sqrt(dx * dx + dy * dy) else 1 end;
    v[(m - 1) * 4 + 1] := public._r3(rx[m]);
    v[(m - 1) * 4 + 2] := public._r3(ry[m]);
    v[(m - 1) * 4 + 3] := public._r3(dx / dd);
    v[(m - 1) * 4 + 4] := public._r3(dy / dd);
    r[m] := public._r3(case when vm > 0 then ln(1 + rv[m] / vm) else 0 end);
  end loop;

  duracion := maxt - mint;
  return jsonb_build_object(
    'v', to_jsonb(v),
    'r', to_jsonb(r),
    'duracion', duracion,
    'trazos', k,
    'largo', public._r3(largo),
    'pausa', public._r3(case when duracion > 0 then pausas / duracion else 0 end),
    'relacion', public._r3(case when alto > 0 then ancho / alto else 10 end)
  );
end;
$$;

-- Trazo para estampar: coordenadas relativas (alto 100), sin tiempos.
create or replace function public._firma_visible(p_crudo jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  minx float8; maxx float8; miny float8; maxy float8; esc float8;
  t jsonb; p jsonb; i integer; largo integer;
  x float8; y float8; ux float8; uy float8;
  salida float8[]; c integer;
  trazos jsonb := '[]';
begin
  if not public._firma_crudo_valido(p_crudo) then
    return null;
  end if;
  select min((e2.pv ->> 0)::float8), max((e2.pv ->> 0)::float8), min((e2.pv ->> 1)::float8), max((e2.pv ->> 1)::float8)
    into minx, maxx, miny, maxy
    from jsonb_array_elements(p_crudo) as e1(tv), jsonb_array_elements(e1.tv) as e2(pv);
  esc := case when maxy - miny > 0 then maxy - miny when maxx - minx > 0 then maxx - minx else 1 end;

  for t in select value from jsonb_array_elements(p_crudo) with ordinality as e(value, o) order by o loop
    largo := jsonb_array_length(t);
    continue when largo = 0;
    salida := '{}';
    c := 0;
    ux := 0;
    uy := 0;
    for i in 0..largo - 1 loop
      p := t -> i;
      x := public._r1(((p ->> 0)::float8 - minx) / esc * 100);
      y := public._r1(((p ->> 1)::float8 - miny) / esc * 100);
      if i = 0 or i = largo - 1 or sqrt((x - ux) * (x - ux) + (y - uy) * (y - uy)) >= 0.6 then
        salida[c + 1] := x;
        salida[c + 2] := y;
        c := c + 2;
        ux := x;
        uy := y;
      end if;
    end loop;
    trazos := trazos || jsonb_build_array(to_jsonb(salida));
  end loop;
  return jsonb_build_object('ancho', public._r1((maxx - minx) / esc * 100), 'trazos', trazos);
end;
$$;

create or replace function public._patron_ritmo(p jsonb)
returns float8[]
language sql
immutable
set search_path = ''
as $$
  select array_agg(e::text::float8 order by o) from jsonb_array_elements(p -> 'r') with ordinality as t(e, o)
$$;

-- ---------------------------------------------------------------------
-- Datos: registro v2, evidencia pericial, intentos con su trazo
-- ---------------------------------------------------------------------
alter table public.firmas_registradas
  add column if not exists version         integer not null default 1,
  add column if not exists visible         jsonb,
  add column if not exists muestras_crudas jsonb,
  add column if not exists umbral_ritmo    numeric,
  add column if not exists largo_medio     numeric,
  add column if not exists dispositivo     text,
  add column if not exists tinta           text;
alter table public.firmas_registradas alter column imagen_path drop not null;
alter table public.firmas_registradas alter column imagen_sha256 drop not null;
grant select (version, visible, dispositivo, tinta) on public.firmas_registradas to authenticated;

-- Las firmas registradas con el algoritmo anterior no tienen ritmo: se registran de nuevo.
update public.firmas_registradas set activa = false, revocada_at = now() where activa and version < 2;

alter table public.intentos_firma
  add column if not exists crudo       jsonb,
  add column if not exists dispositivo text;
alter table public.intentos_firma drop constraint if exists intentos_firma_motivo_check;
alter table public.intentos_firma add constraint intentos_firma_motivo_check check (motivo in ('clave', 'trazo', 'copia'));

create table if not exists public.evidencias_firma (
  id           uuid primary key default gen_random_uuid(),
  actuacion_id uuid not null unique references public.actuaciones (id) on delete restrict,
  perfil_id    uuid not null references public.perfiles (id),
  registro_id  uuid not null references public.firmas_registradas (id),
  crudo        jsonb not null,
  patron       jsonb not null,
  dispositivo  text,
  contexto     jsonb not null default '{}',
  sha256       text not null,
  created_at   timestamptz not null default now()
);
create index if not exists evidencias_firma_perfil_idx on public.evidencias_firma (perfil_id, created_at desc);
alter table public.evidencias_firma enable row level security;
revoke all on public.evidencias_firma from anon, authenticated;
grant select on public.evidencias_firma to authenticated;
-- Evidencia pericial: solo administración / auditoría.
create policy evidencias_firma_auditoria on public.evidencias_firma
  for select to authenticated using ((select public.es_admin()));
create trigger evidencias_firma_solo_agregar before update or delete on public.evidencias_firma
  for each row execute function public.solo_agregar();

-- ---------------------------------------------------------------------
-- Evaluación (la usan firmar y probar)
-- ---------------------------------------------------------------------
create or replace function public._firma_evaluar(p_patron jsonb, p_firma public.firmas_registradas)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_v      float8[] := public._patron_vector(p_patron);
  v_r      float8[] := public._patron_ritmo(p_patron);
  v_forma  float8;
  v_ritmo  float8;
  v_dur    boolean;
  v_trz    boolean;
  v_lar    boolean;
  v_copia  boolean;
begin
  select min(public._dtw(v_v, public._patron_vector(m), 4, 12)), min(public._dtw(v_r, public._patron_ritmo(m), 1, 3))
    into v_forma, v_ritmo
    from jsonb_array_elements(p_firma.muestras) m;
  v_dur := (p_patron ->> 'duracion')::numeric between p_firma.duracion_media / 2.5 and p_firma.duracion_media * 2.5;
  v_trz := abs((p_patron ->> 'trazos')::numeric - p_firma.trazos_medio) <= greatest(2, p_firma.trazos_medio * 0.6);
  v_lar := abs((p_patron ->> 'largo')::numeric - p_firma.largo_medio) <= p_firma.largo_medio * 0.35;
  -- Copia exacta de una muestra o de una firma ya usada: no es una firma nueva.
  select exists (
    select 1 from (
      select m as patron from jsonb_array_elements(p_firma.muestras) m
      union all
      select e.patron from (select patron from public.evidencias_firma where perfil_id = p_firma.perfil_id order by created_at desc limit 20) e
    ) previas
    where public._dtw(v_v, public._patron_vector(previas.patron), 4, 12) < 0.006
      and public._dtw(v_r, public._patron_ritmo(previas.patron), 1, 3) < 0.004
  ) into v_copia;
  return jsonb_build_object(
    'forma', jsonb_build_object('puntaje', round(v_forma::numeric, 4), 'umbral', round(p_firma.umbral, 4)),
    'ritmo', jsonb_build_object('puntaje', round(v_ritmo::numeric, 4), 'umbral', round(p_firma.umbral_ritmo, 4)),
    'duracion_ok', v_dur,
    'trazos_ok', v_trz,
    'largo_ok', v_lar,
    'copia', v_copia,
    'coincide', v_forma <= p_firma.umbral and v_ritmo <= p_firma.umbral_ritmo and v_dur and v_trz and v_lar and not v_copia
  );
end;
$$;

-- ---------------------------------------------------------------------
-- Registro: tres trazos crudos
-- ---------------------------------------------------------------------
drop function if exists public.registrar_firma(text, text, text, text, text, jsonb);

create or replace function public.registrar_firma(
  p_aclaracion  text,
  p_cargo       text,
  p_clave       text,
  p_muestras    jsonb,
  p_dispositivo text,
  p_tinta       text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_id      uuid;
  v_p       jsonb[];
  v_forma   float8 := 0;
  v_ritmo   float8 := 0;
  i integer; j integer;
begin
  if v_uid is null or not public.es_interno() then
    raise exception 'Solo el personal de Capital Humano registra firma' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_aclaracion, ''))) < 3 or char_length(trim(coalesce(p_cargo, ''))) < 3 then
    raise exception 'Completá la aclaración y el cargo' using errcode = '22023';
  end if;
  if coalesce(p_clave, '') !~ '^[0-9]{6}$' then
    raise exception 'La clave de firma tiene que tener 6 números' using errcode = '22023';
  end if;
  if p_clave ~ '^(.)\1{5}$' or p_clave in ('123456', '654321', '012345', '123123') then
    raise exception 'Elegí una clave menos previsible' using errcode = '22023';
  end if;
  if coalesce(p_tinta, '') not in ('#1e3a8a', '#111827') or coalesce(p_dispositivo, '') not in ('pen', 'touch', 'mouse', 'desconocido') then
    raise exception 'Datos de la firma inválidos' using errcode = '22023';
  end if;
  if coalesce(jsonb_typeof(p_muestras), '') <> 'array' then
    raise exception 'Dibujá tu firma tres veces para registrarla' using errcode = '22023';
  end if;
  if jsonb_array_length(p_muestras) <> 3 then
    raise exception 'Dibujá tu firma tres veces para registrarla' using errcode = '22023';
  end if;
  for i in 0..2 loop
    v_p[i + 1] := public._firma_patron(p_muestras -> i);
    if v_p[i + 1] is null then
      raise exception 'La muestra % es demasiado corta o no es válida. Dibujá la firma completa.', i + 1 using errcode = '22023';
    end if;
  end loop;
  for i in 1..3 loop
    for j in i + 1..3 loop
      v_forma := greatest(v_forma, public._dtw(public._patron_vector(v_p[i]), public._patron_vector(v_p[j]), 4, 12));
      v_ritmo := greatest(v_ritmo, public._dtw(public._patron_ritmo(v_p[i]), public._patron_ritmo(v_p[j]), 1, 3));
    end loop;
  end loop;
  if v_forma > 0.30 or v_ritmo > 0.10 then
    raise exception 'Tus tres firmas son muy distintas entre sí (en la forma o en el ritmo). Dibujalas de nuevo, con calma y del mismo modo.' using errcode = '22023';
  end if;

  update public.firmas_registradas set activa = false, revocada_at = now() where perfil_id = v_uid and activa;

  insert into public.firmas_registradas
    (perfil_id, version, aclaracion, cargo, pin_hash, muestras, muestras_crudas, visible,
     umbral, umbral_ritmo, duracion_media, trazos_medio, largo_medio, dispositivo, tinta)
  values (
    v_uid, 2, trim(p_aclaracion), trim(p_cargo), extensions.crypt(p_clave, extensions.gen_salt('bf', 10)),
    to_jsonb(v_p), p_muestras, public._firma_visible(p_muestras -> 2),
    least(0.30, greatest(0.12, v_forma * 1.6)),
    least(0.08, greatest(0.035, v_ritmo * 1.8)),
    round(((v_p[1] ->> 'duracion')::numeric + (v_p[2] ->> 'duracion')::numeric + (v_p[3] ->> 'duracion')::numeric) / 3),
    ((v_p[1] ->> 'trazos')::numeric + (v_p[2] ->> 'trazos')::numeric + (v_p[3] ->> 'trazos')::numeric) / 3,
    ((v_p[1] ->> 'largo')::numeric + (v_p[2] ->> 'largo')::numeric + (v_p[3] ->> 'largo')::numeric) / 3,
    p_dispositivo, p_tinta
  )
  returning id into v_id;

  insert into public.auditoria (tabla, registro_id, accion, actor_id, datos)
  values ('firmas_registradas', v_id, 'registro', v_uid,
          jsonb_build_object('aclaracion', trim(p_aclaracion), 'cargo', trim(p_cargo), 'dispositivo', p_dispositivo,
                             'variacion_forma', round(v_forma::numeric, 4), 'variacion_ritmo', round(v_ritmo::numeric, 4)));
  return jsonb_build_object('id', v_id);
end;
$$;

-- ---------------------------------------------------------------------
-- Firmar (resoluciones con firma ológrafa; el resto, firma simple)
-- ---------------------------------------------------------------------
drop function if exists public.firmar_actuacion(uuid, text, jsonb, text, text);

create or replace function public.firmar_actuacion(
  p_actuacion   uuid,
  p_clave       text default null,
  p_trazo       jsonb default null,
  p_dispositivo text default null,
  p_tinta       text default null,
  p_contexto    jsonb default '{}'
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
  v_patron  jsonb;
  v_ev      jsonb;
  v_motivo  text;
  v_sha     text;
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
    select * into v_firma from public.firmas_registradas where perfil_id = v_uid and activa and version >= 2 for update;
    if not found then
      raise exception 'Para firmar resoluciones registrá tu firma en "Mi firma".' using errcode = '42501';
    end if;
    if v_firma.bloqueada_hasta is not null and v_firma.bloqueada_hasta > now() then
      raise exception 'Firma bloqueada por intentos fallidos. Probá de nuevo después de las %.',
        to_char(v_firma.bloqueada_hasta at time zone 'America/Argentina/Tucuman', 'HH24:MI') using errcode = '42501';
    end if;
    -- Datos incompletos: no cuentan como intento.
    v_patron := public._firma_patron(p_trazo);
    if p_clave is null or v_patron is null then
      raise exception 'Para firmar la resolución dibujá tu firma completa e ingresá tu clave.' using errcode = '22023';
    end if;
    if coalesce(p_tinta, '') not in ('#1e3a8a', '#111827') or coalesce(p_dispositivo, '') not in ('pen', 'touch', 'mouse', 'desconocido')
       or coalesce(jsonb_typeof(p_contexto), 'object') <> 'object' or char_length(coalesce(p_contexto, '{}')::text) > 2000 then
      raise exception 'Datos de la firma inválidos' using errcode = '22023';
    end if;

    if extensions.crypt(p_clave, v_firma.pin_hash) <> v_firma.pin_hash then
      v_motivo := 'clave';
    else
      v_ev := public._firma_evaluar(v_patron, v_firma);
      if (v_ev ->> 'copia')::boolean then
        v_motivo := 'copia';
      elsif not (v_ev ->> 'coincide')::boolean then
        v_motivo := 'trazo';
      end if;
    end if;

    if v_motivo is not null then
      update public.firmas_registradas
         set intentos_fallidos = case when intentos_fallidos + 1 >= 5 then 0 else intentos_fallidos + 1 end,
             bloqueada_hasta  = case when intentos_fallidos + 1 >= 5 then now() + interval '15 minutes' else bloqueada_hasta end
       where id = v_firma.id;
      insert into public.intentos_firma (perfil_id, actuacion_id, motivo, puntaje, crudo, dispositivo)
      values (v_uid, p_actuacion, v_motivo, (v_ev -> 'forma' ->> 'puntaje')::numeric, p_trazo, p_dispositivo);
      insert into public.auditoria (tabla, registro_id, accion, actor_id, datos)
      values ('firmas_registradas', v_firma.id, 'firma_rechazada', v_uid,
              jsonb_build_object('actuacion', p_actuacion, 'motivo', v_motivo, 'evaluacion', v_ev));
      return null;
    end if;

    update public.firmas_registradas set intentos_fallidos = 0, bloqueada_hasta = null where id = v_firma.id;
    v_sha := encode(sha256(convert_to(p_trazo::text, 'UTF8')), 'hex');
    v_sello := jsonb_build_object(
      'tipo', 'olografa',
      'version', 2,
      'registro_id', v_firma.id,
      'aclaracion', v_firma.aclaracion,
      'cargo', v_firma.cargo,
      'visible', public._firma_visible(p_trazo),
      'tinta', p_tinta,
      'dispositivo', p_dispositivo,
      'forma', v_ev -> 'forma',
      'ritmo', v_ev -> 'ritmo',
      'evidencia_sha256', v_sha
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
    -- Evidencia pericial: trazo crudo, patrón y contexto, ligados a la foja por su huella.
    insert into public.evidencias_firma (actuacion_id, perfil_id, registro_id, crudo, patron, dispositivo, contexto, sha256)
    values (v_act.id, v_uid, v_firma.id, p_trazo, v_patron, p_dispositivo, coalesce(p_contexto, '{}'), v_sha);

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
-- Probar la firma (sin firmar nada)
-- ---------------------------------------------------------------------
create or replace function public.probar_firma(p_trazo jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_firma  public.firmas_registradas;
  v_patron jsonb;
  v_ev     jsonb;
begin
  select * into v_firma from public.firmas_registradas where perfil_id = v_uid and activa and version >= 2;
  if not found then
    raise exception 'Primero registrá tu firma' using errcode = '22023';
  end if;
  v_patron := public._firma_patron(p_trazo);
  if v_patron is null then
    raise exception 'Dibujá tu firma completa' using errcode = '22023';
  end if;
  v_ev := public._firma_evaluar(v_patron, v_firma);
  insert into public.auditoria (tabla, registro_id, accion, actor_id, datos)
  values ('firmas_registradas', v_firma.id, 'prueba_firma', v_uid, v_ev);
  return v_ev;
end;
$$;

-- ---------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------
revoke execute on function public._r3(float8), public._r1(float8), public._firma_crudo_valido(jsonb), public._firma_patron(jsonb),
  public._firma_visible(jsonb), public._patron_ritmo(jsonb), public._firma_evaluar(jsonb, public.firmas_registradas)
  from public, anon, authenticated;
revoke execute on function public.registrar_firma(text, text, text, jsonb, text, text) from public, anon;
revoke execute on function public.firmar_actuacion(uuid, text, jsonb, text, text, jsonb) from public, anon;
grant execute on function public.registrar_firma(text, text, text, jsonb, text, text) to authenticated;
grant execute on function public.firmar_actuacion(uuid, text, jsonb, text, text, jsonb) to authenticated;
