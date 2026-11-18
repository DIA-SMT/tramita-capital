-- =====================================================================
-- Importación de los datos de Civitas (sigue a la 001900).
--
-- Sin API de Civitas, «Liquida SÍ», la fecha de ingreso y la situación de
-- revista se cargaban a mano, agente por agente. Ahora Registro, Liquidación o
-- Administración suben la planilla que exportan de Civitas y se actualizan
-- todos los perfiles de una vez. Con «Liquida SÍ» al día, el certificado de
-- trabajo sale al pedirlo para todos.
--
-- El navegador lee la planilla (columnas provisorias hasta conocer el formato
-- de Civitas) y manda las filas ya normalizadas. La base:
-- - cruza cada fila con el perfil por legajo (sin ceros a la izquierda) o, si la
--   fila no trae legajo, por CUIL (solo dígitos);
-- - escribe solo lo que la planilla trae: una columna vacía no borra el dato;
-- - fecha el dato «Liquida SÍ» con la fecha de los datos que indica quien
--   importa (la del reporte de Civitas), no con la de hoy;
-- - no toca a los agentes que no están en la planilla;
-- - deja constancia en importaciones_civitas (quién, cuándo, qué archivo y
--   cuántos se actualizaron).
-- =====================================================================

create table if not exists public.importaciones_civitas (
  id               uuid primary key default gen_random_uuid(),
  perfil_id        uuid not null references public.perfiles (id),
  archivo          text not null check (char_length(archivo) between 1 and 200),
  datos_al         date not null,
  filas            integer not null,
  actualizados     integer not null,
  sin_coincidencia integer not null,
  created_at       timestamptz not null default now()
);
create index if not exists importaciones_civitas_fecha_idx on public.importaciones_civitas (created_at desc);

/** ¿Carga datos de Civitas? Registro, Liquidación o Administración. */
create or replace function public.gestiona_civitas()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.es_admin() or exists (
    select 1 from public.miembros_area m join public.areas a on a.id = m.area_id
     where m.perfil_id = auth.uid() and a.codigo in ('REG', 'LIQ')
  );
$$;

alter table public.importaciones_civitas enable row level security;
revoke all on public.importaciones_civitas from anon, authenticated;
grant select on public.importaciones_civitas to authenticated;
drop policy if exists importaciones_civitas_lectura on public.importaciones_civitas;
create policy importaciones_civitas_lectura on public.importaciones_civitas
  for select to authenticated
  using ((select public.gestiona_civitas()));

/**
 * Las filas de la planilla, normalizadas: legajo sin ceros a la izquierda, CUIL solo con dígitos. Si un agente
 * aparece dos veces, vale la última fila.
 */
create or replace function public._civitas_filas(p_filas jsonb)
returns table (clave text, legajo_n text, cuil_n text, liquida boolean, fecha_ingreso date, situacion_revista text)
language sql
stable
set search_path = ''
as $$
  select distinct on (x.clave) x.clave, x.legajo_n, x.cuil_n, x.liquida, x.fecha_ingreso, x.situacion_revista
    from (
      select e.ord,
             n.legajo_n,
             n.cuil_n,
             (e.f ->> 'liquida')::boolean as liquida,
             (nullif(e.f ->> 'fecha_ingreso', ''))::date as fecha_ingreso,
             nullif(left(trim(coalesce(e.f ->> 'situacion_revista', '')), 120), '') as situacion_revista,
             coalesce('L:' || n.legajo_n, 'C:' || n.cuil_n) as clave
        from jsonb_array_elements(p_filas) with ordinality as e(f, ord)
        cross join lateral (
          select nullif(ltrim(trim(coalesce(e.f ->> 'legajo', '')), '0'), '') as legajo_n,
                 nullif(regexp_replace(coalesce(e.f ->> 'cuil', ''), '\D', '', 'g'), '') as cuil_n
        ) n
    ) x
   where x.clave is not null
   order by x.clave, x.ord desc;
$$;

/**
 * p_filas: arreglo de {legajo?, cuil?, liquida?: boolean, fecha_ingreso?: 'AAAA-MM-DD', situacion_revista?}.
 * Devuelve {importacion_id, filas, actualizados, sin_coincidencia, no_encontrados: [hasta 50 legajos o CUIL]}.
 */
create or replace function public.importar_datos_civitas(p_filas jsonb, p_datos_al date, p_archivo text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid          uuid := auth.uid();
  v_hoy          date := (now() at time zone 'America/Argentina/Tucuman')::date;
  v_filas        integer;
  v_por_legajo   integer;
  v_por_cuil     integer;
  v_sin          integer;
  v_faltan       jsonb;
  v_id           uuid;
begin
  if not public.gestiona_civitas() then
    raise exception 'Los datos de Civitas los importan Registro, Liquidación o Administración' using errcode = '42501';
  end if;
  if jsonb_typeof(p_filas) is distinct from 'array' or jsonb_array_length(p_filas) = 0 then
    raise exception 'La planilla no tiene filas' using errcode = '22023';
  end if;
  v_filas := jsonb_array_length(p_filas);
  if v_filas > 6000 then
    raise exception 'La planilla tiene más de 6000 filas: dividila' using errcode = '22023';
  end if;
  if p_datos_al is null or p_datos_al > v_hoy then
    raise exception 'Indicá la fecha de los datos (no puede ser futura)' using errcode = '22023';
  end if;
  if coalesce(trim(p_archivo), '') = '' then
    raise exception 'Falta el nombre del archivo' using errcode = '22023';
  end if;
  if exists (select 1 from public._civitas_filas(p_filas) c where c.fecha_ingreso > v_hoy) then
    raise exception 'Hay fechas de ingreso futuras en la planilla' using errcode = '22023';
  end if;

  -- Dos cruces (por legajo y, sin legajo, por CUIL) en lugar de uno con OR: así la base puede cruzar por igualdad.
  update public.perfiles p
     set liquida           = coalesce(c.liquida, p.liquida),
         liquida_al        = case when c.liquida is null then p.liquida_al else p_datos_al end,
         fecha_ingreso     = coalesce(c.fecha_ingreso, p.fecha_ingreso),
         situacion_revista = coalesce(c.situacion_revista, p.situacion_revista)
    from public._civitas_filas(p_filas) c
   where c.legajo_n is not null and ltrim(trim(coalesce(p.legajo, '')), '0') = c.legajo_n;
  get diagnostics v_por_legajo = row_count;

  update public.perfiles p
     set liquida           = coalesce(c.liquida, p.liquida),
         liquida_al        = case when c.liquida is null then p.liquida_al else p_datos_al end,
         fecha_ingreso     = coalesce(c.fecha_ingreso, p.fecha_ingreso),
         situacion_revista = coalesce(c.situacion_revista, p.situacion_revista)
    from public._civitas_filas(p_filas) c
   where c.legajo_n is null and regexp_replace(coalesce(p.cuil, ''), '\D', '', 'g') = c.cuil_n;
  get diagnostics v_por_cuil = row_count;

  -- Las que no cruzaron con ningún perfil (también por igualdad, contra los legajos y CUIL de los perfiles).
  with legajos as (select distinct ltrim(trim(coalesce(p.legajo, '')), '0') as k from public.perfiles p),
       cuils as (select distinct regexp_replace(coalesce(p.cuil, ''), '\D', '', 'g') as k from public.perfiles p)
  select count(*), coalesce(jsonb_agg(coalesce(c.legajo_n, c.cuil_n) order by c.clave), '[]'::jsonb)
    into v_sin, v_faltan
    from public._civitas_filas(p_filas) c
    left join legajos l on c.legajo_n is not null and l.k = c.legajo_n
    left join cuils u on c.legajo_n is null and u.k = c.cuil_n
   where l.k is null and u.k is null;

  insert into public.importaciones_civitas (perfil_id, archivo, datos_al, filas, actualizados, sin_coincidencia)
  values (v_uid, left(trim(p_archivo), 200), p_datos_al, v_filas, v_por_legajo + v_por_cuil, v_sin)
  returning id into v_id;
  insert into public.auditoria (tabla, registro_id, accion, actor_id, datos)
  values ('importaciones_civitas', v_id, 'datos_civitas_importados', v_uid,
          jsonb_build_object('filas', v_filas, 'actualizados', v_por_legajo + v_por_cuil, 'sin_coincidencia', v_sin, 'datos_al', p_datos_al));

  return jsonb_build_object(
    'importacion_id', v_id,
    'filas', v_filas,
    'actualizados', v_por_legajo + v_por_cuil,
    'sin_coincidencia', v_sin,
    'no_encontrados', (select coalesce(jsonb_agg(e), '[]'::jsonb) from (select e from jsonb_array_elements(v_faltan) e limit 50) s)
  );
end;
$$;

revoke all on function public.gestiona_civitas() from public, anon;
revoke all on function public._civitas_filas(jsonb) from public, anon, authenticated;
revoke all on function public.importar_datos_civitas(jsonb, date, text) from public;
grant execute on function public.gestiona_civitas() to authenticated;
grant execute on function public.importar_datos_civitas(jsonb, date, text) to authenticated;
