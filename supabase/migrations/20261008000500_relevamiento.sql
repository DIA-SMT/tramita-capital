-- =====================================================================
-- Relevamiento de Capital Humano (Área Bonificaciones, 07/10/2026)
-- Lleva al modelo lo que pide la especificación funcional:
-- pasos configurables, precarga de datos del agente, resultado de la
-- resolución, protocolización automática, legajo digital y tiempos por etapa.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Datos del agente para precarga (vienen del padrón / Civitas)
-- ---------------------------------------------------------------------
alter table public.perfiles
  add column if not exists categoria   text,
  add column if not exists dependencia text;   -- "dependiente de"; reparticion = "con prestación de servicios en"

-- ---------------------------------------------------------------------
-- Pasos configurables (FINAL DIGITAL): qué controla, qué revisa, qué genera
-- ---------------------------------------------------------------------
alter table public.pasos_circuito
  add column if not exists controles           text[]  not null default '{}',
  add column if not exists revisa              text[]  not null default '{}',
  add column if not exists genera              text[]  not null default '{}',
  add column if not exists permite_subsanacion boolean not null default true,
  add column if not exists destino_final       text;   -- cierre del circuito cuando es el último paso

-- Línea de base del relevamiento y documentación que va al legajo
alter table public.tipos_tramite
  add column if not exists codigo_relevamiento  text,
  add column if not exists oficina              text,
  add column if not exists pasos_actuales       integer,
  add column if not exists documentacion_final  text[] not null default '{}';  -- claves de requisitos que pasan al legajo

-- Resultado de la resolución e instancia (0 = original, 1 y 2 = reconsideraciones)
alter table public.expedientes
  add column if not exists resultado text check (resultado in ('aprobado', 'rechazado')),
  add column if not exists instancia integer not null default 0 check (instancia between 0 and 2);

-- ---------------------------------------------------------------------
-- Legajo digital: documentación final del agente vinculada al expediente
-- ---------------------------------------------------------------------
create table if not exists public.legajo_documentos (
  id            uuid primary key default gen_random_uuid(),
  perfil_id     uuid not null references public.perfiles (id) on delete cascade,
  expediente_id uuid references public.expedientes (id) on delete set null,
  actuacion_id  uuid references public.actuaciones (id) on delete set null,
  documento_id  uuid references public.documentos (id) on delete set null,
  tipo          text not null,
  titulo        text not null,
  created_at    timestamptz not null default now()
);
create index if not exists legajo_documentos_perfil_idx on public.legajo_documentos (perfil_id, created_at desc);
create index if not exists legajo_documentos_expediente_idx on public.legajo_documentos (expediente_id);

alter table public.legajo_documentos enable row level security;
revoke all on public.legajo_documentos from anon, authenticated;
grant select on public.legajo_documentos to authenticated;

create policy legajo_documentos_lectura on public.legajo_documentos
  for select to authenticated
  using (
    perfil_id = (select auth.uid())
    or (select public.es_admin())
    or (expediente_id is not null and public.puede_ver_expediente(expediente_id) and (select public.es_interno()))
  );

create trigger legajo_documentos_solo_agregar before update or delete on public.legajo_documentos
  for each row execute function public.solo_agregar();

-- ---------------------------------------------------------------------
-- Protocolización automática: número y fecha de resolución al firmar
-- ---------------------------------------------------------------------
create or replace function public.siguiente_resolucion()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_anio integer := extract(year from (now() at time zone 'America/Argentina/Tucuman'))::integer;
  v_n    integer;
begin
  insert into public.contadores as c (anio, prefijo, ultimo)
  values (v_anio, 'RES-DCH', 1)
  on conflict (anio, prefijo) do update set ultimo = c.ultimo + 1
  returning ultimo into v_n;
  return format('%s/DCH/%s', v_n, v_anio);
end;
$$;

create or replace function public.firmar_actuacion(p_actuacion uuid)
returns public.actuaciones
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_act   public.actuaciones;
  v_exp   public.expedientes;
  v_rol   public.rol_area;
  v_num   text;
  v_fecha text;
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

  if v_act.area_id is null then
    update public.actuaciones set area_id = v_exp.area_actual_id where id = v_act.id;
  end if;

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
    -- La resolución firmada pasa al legajo digital del agente.
    insert into public.legajo_documentos (perfil_id, expediente_id, actuacion_id, tipo, titulo)
    values (v_exp.iniciador_id, v_exp.id, v_act.id, 'resolucion', v_act.titulo);
  end if;

  if v_act.ia_generacion_id is not null then
    update public.ia_generaciones set aceptada = true where id = v_act.ia_generacion_id;
  end if;

  return v_act;
end;
$$;

-- Al archivar, la documentación definida como final se incorpora al legajo.
create or replace function public.archivar_expediente(p_expediente uuid, p_motivo text default null)
returns public.expedientes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_exp  public.expedientes;
  v_tipo public.tipos_tramite;
begin
  select * into v_exp from public.expedientes where id = p_expediente for update;
  if not (public.es_miembro_area(v_exp.area_actual_id) or public.es_admin()) then
    raise exception 'Solo el área que tiene el expediente puede archivarlo' using errcode = '42501';
  end if;
  if v_exp.estado in ('archivado', 'rechazado') then
    raise exception 'El expediente ya está cerrado';
  end if;

  perform public._incorporar_actuacion(v_exp.id, 'nota', 'Archivo del expediente', coalesce(nullif(trim(p_motivo), ''), 'Cumplido, archívese.'), '{}'::jsonb, v_uid, v_exp.area_actual_id);

  select * into v_tipo from public.tipos_tramite where id = v_exp.tipo_tramite_id;
  insert into public.legajo_documentos (perfil_id, expediente_id, documento_id, tipo, titulo)
  select v_exp.iniciador_id, v_exp.id, d.id, 'documento', d.nombre_archivo
  from public.documentos d
  where d.expediente_id = v_exp.id
    and d.requisito_clave = any (v_tipo.documentacion_final)
    and not exists (select 1 from public.legajo_documentos l where l.documento_id = d.id);

  update public.expedientes
     set estado = 'archivado', asignado_a = null,
         resuelto_at = coalesce(resuelto_at, now())
   where id = v_exp.id
  returning * into v_exp;
  return v_exp;
end;
$$;

-- ---------------------------------------------------------------------
-- Tiempo de permanencia por oficina (lo pide el informe ejecutivo)
-- ---------------------------------------------------------------------
create or replace function public.metricas_por_etapa(p_dias integer default 90)
returns table (area text, estadias bigint, horas_promedio numeric, horas_maximo numeric)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not (public.es_interno() or public.es_admin()) then
    raise exception 'Sin permiso' using errcode = '42501';
  end if;
  return query
  with pases as (
    -- Solo cambios de oficina: tomar el expediente no corta la estadía.
    select m.expediente_id, m.hacia_area_id, m.created_at
    from public.movimientos m
    where m.hacia_area_id is not null
      and m.desde_area_id is distinct from m.hacia_area_id
      and m.created_at >= now() - make_interval(days => least(greatest(p_dias, 1), 730))
  ),
  estadias as (
    select p.hacia_area_id,
           p.created_at as entrada,
           coalesce(lead(p.created_at) over (partition by p.expediente_id order by p.created_at),
                    case when e.estado in ('archivado', 'rechazado') then e.updated_at end,
                    now()) as salida
    from pases p
    join public.expedientes e on e.id = p.expediente_id
  )
  select a.nombre,
         count(*),
         round((avg(extract(epoch from (s.salida - s.entrada))) / 3600.0)::numeric, 1),
         round((max(extract(epoch from (s.salida - s.entrada))) / 3600.0)::numeric, 1)
  from estadias s
  join public.areas a on a.id = s.hacia_area_id
  group by a.nombre
  order by 3 desc;
end;
$$;

revoke execute on function public.siguiente_resolucion() from public, anon, authenticated;
grant execute on function public.metricas_por_etapa(integer) to authenticated;
revoke execute on function public.metricas_por_etapa(integer) from anon, public;

alter publication supabase_realtime add table public.legajo_documentos;
