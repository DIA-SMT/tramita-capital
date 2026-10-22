-- =====================================================================
-- Novedades de haberes: lo que una resolución firmada manda impactar en
-- la liquidación. Reemplazan la nota de desglose en papel y la carga a mano
-- en Civitas: Bonificaciones las registra en el paso de novedad (queda una
-- foja firmada en el expediente) y Liquidación las descarga en planilla y
-- las marca como cargadas. Con una API de Civitas, la misma tabla alimenta
-- el envío automático.
--
-- Los datos del expediente y de la resolución se copian al registrar: así
-- Liquidación ve la planilla completa aunque el expediente sea reservado.
-- =====================================================================

create table public.novedades_haberes (
  id                uuid primary key default gen_random_uuid(),
  expediente_id     uuid not null references public.expedientes (id) on delete restrict,
  perfil_id         uuid not null references public.perfiles (id),
  resolucion_id     uuid references public.actuaciones (id),
  actuacion_id      uuid references public.actuaciones (id),
  numero_expediente text not null,
  resolucion_numero text,
  resolucion_fecha  date,
  movimiento        text not null check (movimiento in ('alta', 'baja', 'modificacion')),
  concepto          text not null,
  codigo_tramite    text not null,
  vigencia_desde    date not null,
  vigencia_hasta    date,
  detalle           jsonb not null default '{}'::jsonb,
  observaciones     text,
  estado            text not null default 'pendiente' check (estado in ('pendiente', 'cargada', 'anulada')),
  registrada_por    uuid not null references public.perfiles (id),
  created_at        timestamptz not null default now(),
  cargada_por       uuid references public.perfiles (id),
  cargada_at        timestamptz,
  referencia_carga  text,
  check (vigencia_hasta is null or vigencia_hasta >= vigencia_desde)
);

comment on table public.novedades_haberes is 'Novedades para Liquidación de Haberes (planilla para Civitas).';
comment on column public.novedades_haberes.vigencia_desde is 'Primer día del período desde el que rige.';
comment on column public.novedades_haberes.referencia_carga is 'Lote o constancia de la carga en Civitas.';

create index novedades_haberes_estado_idx on public.novedades_haberes (estado, vigencia_desde);
create index novedades_haberes_expediente_idx on public.novedades_haberes (expediente_id);
create index novedades_haberes_perfil_idx on public.novedades_haberes (perfil_id);
create unique index novedades_haberes_unica on public.novedades_haberes (expediente_id, movimiento) where estado <> 'anulada';

create trigger auditar_novedades_haberes after insert or update or delete on public.novedades_haberes
  for each row execute function public.auditar();

-- ---------------------------------------------------------------------
-- Seguridad: lectura directa; altas y cambios solo por RPC.
-- ---------------------------------------------------------------------
alter table public.novedades_haberes enable row level security;
grant select on public.novedades_haberes to authenticated;

-- Quiénes trabajan con novedades: Bonificaciones, Liquidación, Dirección y administración.
create or replace function public.gestiona_novedades()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select public.es_admin() or exists (
    select 1
    from public.miembros_area m
    join public.areas a on a.id = m.area_id
    where m.perfil_id = (select auth.uid()) and a.codigo in ('BONIF', 'LIQ', 'DIR')
  );
$$;

-- Quiénes las cargan en Civitas: Bonificaciones y Liquidación.
create or replace function public.carga_novedades()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select public.es_admin() or exists (
    select 1
    from public.miembros_area m
    join public.areas a on a.id = m.area_id
    where m.perfil_id = (select auth.uid()) and a.codigo in ('BONIF', 'LIQ')
  );
$$;

create policy novedades_haberes_lectura on public.novedades_haberes
  for select to authenticated
  using (perfil_id = (select auth.uid()) or (select public.gestiona_novedades()));

-- ---------------------------------------------------------------------
-- Registrar la novedad (paso "liquidacion" del circuito)
-- ---------------------------------------------------------------------
create or replace function public.registrar_novedad(
  p_expediente     uuid,
  p_movimiento     text,
  p_vigencia_desde date,
  p_vigencia_hasta date default null,
  p_detalle        jsonb default '{}'::jsonb,
  p_observaciones  text default null,
  p_texto          text default null
)
returns public.novedades_haberes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_exp  public.expedientes;
  v_tipo public.tipos_tramite;
  v_paso public.pasos_circuito;
  v_res  public.actuaciones;
  v_act  public.actuaciones;
  v_nov  public.novedades_haberes;
begin
  select * into v_exp from public.expedientes where id = p_expediente for update;
  if not found then
    raise exception 'Expediente inexistente';
  end if;
  if not (public.es_miembro_area(v_exp.area_actual_id) or public.es_admin()) then
    raise exception 'Solo el área que tiene el expediente puede registrar la novedad' using errcode = '42501';
  end if;
  if v_exp.estado <> 'resuelto' or v_exp.resultado is distinct from 'aprobado' then
    raise exception 'La novedad se registra con la resolución firmada que hace lugar';
  end if;

  select * into v_paso from public.pasos_circuito where tipo_tramite_id = v_exp.tipo_tramite_id and orden = v_exp.paso_actual;
  if v_paso.accion is distinct from 'liquidacion' then
    raise exception 'El expediente no está en el paso de novedad a Liquidación';
  end if;
  if p_movimiento not in ('alta', 'baja', 'modificacion') then
    raise exception 'Movimiento inválido';
  end if;
  if p_vigencia_desde is null then
    raise exception 'Indicá desde qué período rige';
  end if;
  if exists (select 1 from public.novedades_haberes n where n.expediente_id = v_exp.id and n.movimiento = p_movimiento and n.estado <> 'anulada') then
    raise exception 'Ya hay una novedad registrada para este expediente';
  end if;

  select * into v_tipo from public.tipos_tramite where id = v_exp.tipo_tramite_id;
  select * into v_res from public.actuaciones
   where expediente_id = v_exp.id and tipo = 'resolucion' and estado = 'firmada'
   order by foja desc
   limit 1;

  v_act := public._incorporar_actuacion(
    v_exp.id,
    'nota',
    'Novedad a Liquidación de Haberes',
    coalesce(nullif(trim(p_texto), ''), 'Se comunica la novedad a Liquidación de Haberes para su impacto en la liquidación y su registro en Civitas.'),
    jsonb_build_object('novedad', jsonb_build_object('movimiento', p_movimiento, 'vigencia_desde', p_vigencia_desde, 'vigencia_hasta', p_vigencia_hasta)),
    v_uid,
    v_exp.area_actual_id
  );

  insert into public.novedades_haberes (
    expediente_id, perfil_id, resolucion_id, actuacion_id, numero_expediente, resolucion_numero, resolucion_fecha,
    movimiento, concepto, codigo_tramite, vigencia_desde, vigencia_hasta, detalle, observaciones, registrada_por
  ) values (
    v_exp.id, v_exp.iniciador_id, v_res.id, v_act.id, v_exp.numero,
    v_res.datos -> 'protocolo' ->> 'numero', (v_res.firmada_at at time zone 'America/Argentina/Tucuman')::date,
    p_movimiento, v_tipo.nombre, v_tipo.codigo,
    date_trunc('month', p_vigencia_desde)::date, date_trunc('month', p_vigencia_hasta)::date,
    coalesce(p_detalle, '{}'::jsonb), nullif(trim(p_observaciones), ''), v_uid
  )
  returning * into v_nov;

  return v_nov;
end;
$$;

-- ---------------------------------------------------------------------
-- Marcar como cargadas en Civitas (planilla descargada y cargada)
-- ---------------------------------------------------------------------
create or replace function public.marcar_novedades_cargadas(p_ids uuid[], p_referencia text default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n integer;
begin
  if not public.carga_novedades() then
    raise exception 'Solo Bonificaciones y Liquidación cargan novedades en Civitas' using errcode = '42501';
  end if;
  update public.novedades_haberes
     set estado = 'cargada', cargada_por = auth.uid(), cargada_at = now(), referencia_carga = nullif(trim(p_referencia), '')
   where id = any (p_ids) and estado = 'pendiente';
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- ---------------------------------------------------------------------
-- Anular una novedad mal registrada (antes de cargarla)
-- ---------------------------------------------------------------------
create or replace function public.anular_novedad(p_id uuid, p_motivo text)
returns public.novedades_haberes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nov public.novedades_haberes;
begin
  if not public.carga_novedades() then
    raise exception 'Sin permiso para anular novedades' using errcode = '42501';
  end if;
  if nullif(trim(p_motivo), '') is null then
    raise exception 'Indicá el motivo de la anulación';
  end if;
  update public.novedades_haberes
     set estado = 'anulada',
         observaciones = concat_ws(E'\n', observaciones, 'Anulada: ' || trim(p_motivo))
   where id = p_id and estado = 'pendiente'
  returning * into v_nov;
  if v_nov.id is null then
    raise exception 'Solo se anulan novedades pendientes de carga';
  end if;
  return v_nov;
end;
$$;

revoke execute on function public.gestiona_novedades(), public.carga_novedades() from public, anon;
revoke execute on function public.registrar_novedad(uuid, text, date, date, jsonb, text, text) from public, anon;
revoke execute on function public.marcar_novedades_cargadas(uuid[], text) from public, anon;
revoke execute on function public.anular_novedad(uuid, text) from public, anon;
grant execute on function public.gestiona_novedades(), public.carga_novedades() to authenticated;
grant execute on function public.registrar_novedad(uuid, text, date, date, jsonb, text, text) to authenticated;
grant execute on function public.marcar_novedades_cargadas(uuid[], text) to authenticated;
grant execute on function public.anular_novedad(uuid, text) to authenticated;
