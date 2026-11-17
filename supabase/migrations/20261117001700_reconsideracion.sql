-- =====================================================================
-- Recurso de reconsideración (relevamiento del 16/11/2026).
--
-- El/la agente que no está de acuerdo con lo resuelto pide la
-- reconsideración desde su trámite, dentro de los 8 días hábiles de la
-- notificación (la firma de la resolución), con el plazo extraordinario del
-- art. 25 de la OPA: se admite hasta las 2 primeras horas del día hábil
-- siguiente. Escribe los fundamentos y puede sumar documentación nueva.
--
-- El recurso tramita en un expediente nuevo, vinculado al original
-- (expedientes.origen_id, instancia 1): tiene su propio circuito (Asesoría
-- Legal → el área del trámite → Dirección → el área del trámite), su dictamen
-- y su resolución protocolizada. Así no cambian las reglas del expediente
-- (una resolución firmada, pases, novedades). En el original queda una foja
-- con la constancia.
--
-- Qué trámite de recurso usa cada trámite: tipos_tramite.reconsideracion
-- (código); null = no admite reconsideración. Los trámites de recurso
-- (es_recurso) no se inician desde el catálogo: solo desde un trámite
-- resuelto. Contra lo resuelto en la reconsideración corresponde el recurso
-- jerárquico, que sigue en papel.
--
-- Días hábiles: de lunes a viernes, sin los feriados de public.feriados
-- (los carga Administración).
-- =====================================================================

-- Feriados, para contar días hábiles.
create table if not exists public.feriados (
  fecha  date primary key,
  motivo text not null
);
alter table public.feriados enable row level security;
revoke all on public.feriados from anon, authenticated;
grant select on public.feriados to authenticated;
drop policy if exists feriados_lectura on public.feriados;
create policy feriados_lectura on public.feriados for select to authenticated using (true);

alter table public.tipos_tramite
  add column if not exists es_recurso boolean not null default false,
  add column if not exists reconsideracion text;

comment on column public.tipos_tramite.es_recurso is 'Trámite de recurso: se inicia solo desde un trámite resuelto (interponer_reconsideracion).';
comment on column public.tipos_tramite.reconsideracion is 'Código del trámite de recurso de reconsideración que usa este trámite; null si no la admite.';

alter table public.expedientes
  add column if not exists origen_id uuid references public.expedientes (id) on delete restrict;
create unique index if not exists expedientes_un_recurso on public.expedientes (origen_id) where origen_id is not null;
create index if not exists expedientes_origen_idx on public.expedientes (origen_id);

comment on column public.expedientes.origen_id is 'Recurso de reconsideración: el expediente cuya resolución se recurre.';

-- Un trámite de recurso solo se inicia con interponer_reconsideracion (con su expediente de origen).
create or replace function public._recurso_con_origen()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.origen_id is null and exists (select 1 from public.tipos_tramite t where t.id = new.tipo_tramite_id and t.es_recurso) then
    raise exception 'La reconsideración se pide desde el trámite resuelto' using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists expedientes_recurso_con_origen on public.expedientes;
create trigger expedientes_recurso_con_origen
  before insert on public.expedientes
  for each row execute function public._recurso_con_origen();

/** El día hábil número p_dias posterior a p_desde (de lunes a viernes, sin feriados). */
create or replace function public.dia_habil(p_desde date, p_dias integer)
returns date
language plpgsql
stable
set search_path = ''
as $$
declare
  v_dia   date := p_desde;
  v_conto integer := 0;
begin
  while v_conto < p_dias loop
    v_dia := v_dia + 1;
    if extract(isodow from v_dia) < 6 and not exists (select 1 from public.feriados f where f.fecha = v_dia) then
      v_conto := v_conto + 1;
    end if;
  end loop;
  return v_dia;
end;
$$;

grant execute on function public.dia_habil(date, integer) to authenticated;

/**
 * Plazo de la reconsideración de un expediente, para quien puede verlo (RLS): null si el trámite no la admite,
 * si es un recurso o si todavía no tiene resolución firmada. El último día es el 8.º hábil desde la notificación;
 * el límite, las 9 (las 2 primeras horas desde las 7) del día hábil siguiente, por el art. 25 de la OPA.
 */
create or replace function public.plazo_reconsideracion(p_expediente uuid)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_exp    public.expedientes;
  v_tipo   public.tipos_tramite;
  v_res    public.actuaciones;
  v_notif  date;
  v_ultimo date;
  v_limite timestamptz;
begin
  select * into v_exp from public.expedientes where id = p_expediente;
  if not found or v_exp.instancia > 0 then
    return null;
  end if;
  select * into v_tipo from public.tipos_tramite where id = v_exp.tipo_tramite_id;
  if v_tipo.reconsideracion is null then
    return null;
  end if;
  select * into v_res from public.actuaciones
   where expediente_id = v_exp.id and tipo = 'resolucion' and estado = 'firmada'
   order by foja desc
   limit 1;
  if not found or v_res.firmada_at is null then
    return null;
  end if;

  v_notif := (v_res.firmada_at at time zone 'America/Argentina/Tucuman')::date;
  v_ultimo := public.dia_habil(v_notif, 8);
  v_limite := (public.dia_habil(v_ultimo, 1) + time '09:00') at time zone 'America/Argentina/Tucuman';

  return jsonb_build_object(
    'notificacion', v_notif,
    'ultimo_dia', v_ultimo,
    'limite', v_limite,
    'vigente', now() <= v_limite,
    'recurso', (
      select jsonb_build_object('id', r.id, 'numero', r.numero, 'estado', r.estado, 'resultado', r.resultado)
        from public.expedientes r
       where r.origen_id = v_exp.id
    )
  );
end;
$$;

grant execute on function public.plazo_reconsideracion(uuid) to authenticated;

/** El/la agente pide la reconsideración de su trámite resuelto: crea el expediente del recurso, vinculado. */
create or replace function public.interponer_reconsideracion(p_origen uuid, p_fundamentos text)
returns public.expedientes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid         uuid := auth.uid();
  v_origen      public.expedientes;
  v_tipo_origen public.tipos_tramite;
  v_tipo        public.tipos_tramite;
  v_paso        public.pasos_circuito;
  v_res         public.actuaciones;
  v_plazo       jsonb;
  v_numero_res  text;
  v_exp         public.expedientes;
begin
  if v_uid is null then
    raise exception 'Sesión no válida' using errcode = '28000';
  end if;
  select * into v_origen from public.expedientes where id = p_origen for update;
  if not found then
    raise exception 'Expediente inexistente';
  end if;
  if v_origen.iniciador_id <> v_uid then
    raise exception 'La reconsideración la pide el/la agente que inició el trámite' using errcode = '42501';
  end if;
  if coalesce(trim(p_fundamentos), '') = '' then
    raise exception 'Contá por qué no estás de acuerdo con lo resuelto' using errcode = '22023';
  end if;
  if v_origen.instancia > 0 then
    raise exception 'Contra lo resuelto en una reconsideración corresponde el recurso jerárquico, que se presenta en papel';
  end if;

  select * into v_tipo_origen from public.tipos_tramite where id = v_origen.tipo_tramite_id;
  if v_tipo_origen.reconsideracion is null then
    raise exception 'Este trámite no admite recurso de reconsideración';
  end if;
  select * into v_tipo from public.tipos_tramite where codigo = v_tipo_origen.reconsideracion and activo and es_recurso;
  if not found then
    raise exception 'El recurso de reconsideración no está configurado para este trámite';
  end if;
  select * into v_res from public.actuaciones
   where expediente_id = v_origen.id and tipo = 'resolucion' and estado = 'firmada'
   order by foja desc
   limit 1;
  if not found then
    raise exception 'Todavía no hay una resolución firmada para recurrir';
  end if;
  if exists (select 1 from public.expedientes where origen_id = v_origen.id) then
    raise exception 'Ya pediste la reconsideración de este trámite';
  end if;
  v_plazo := public.plazo_reconsideracion(v_origen.id);
  if v_plazo is null or not coalesce((v_plazo ->> 'vigente')::boolean, false) then
    raise exception 'Venció el plazo para pedir la reconsideración (8 días hábiles desde la notificación)';
  end if;

  select * into v_paso from public.pasos_circuito where tipo_tramite_id = v_tipo.id order by orden limit 1;
  if not found then
    raise exception 'El trámite % no tiene circuito configurado', v_tipo.codigo;
  end if;
  v_numero_res := coalesce(v_res.datos -> 'protocolo' ->> 'numero', 's/n');

  insert into public.expedientes (
    numero, tipo_tramite_id, iniciador_id, asunto, datos, estado,
    prioridad, prioridad_motivo, prioridad_origen,
    paso_actual, area_actual_id, reservado, vence_at, origen_id, instancia
  ) values (
    public.siguiente_numero('CH'), v_tipo.id, v_uid, left('Reconsideración: ' || v_origen.asunto, 300),
    jsonb_build_object(
      'fundamentos', trim(p_fundamentos),
      'expediente_origen', v_origen.numero,
      'resolucion_recurrida', v_numero_res,
      'tramite_origen', v_tipo_origen.nombre
    ),
    'iniciado',
    v_origen.prioridad,
    case when v_origen.prioridad <> 'normal' then 'La misma prioridad que el trámite recurrido' end,
    'regla',
    v_paso.orden, v_paso.area_id, v_origen.reservado or v_tipo.reservado,
    case when v_tipo.plazo_dias is not null then now() + make_interval(days => v_tipo.plazo_dias) end,
    v_origen.id, 1
  )
  returning * into v_exp;

  perform public._incorporar_actuacion(
    v_exp.id, 'presentacion', 'Recurso de reconsideración',
    format(
      e'**Asunto:** %s\n\nEl/la agente interpone recurso de reconsideración contra la Resolución N.º %s del expediente %s (%s).\n\n**Fundamentos:**\n%s',
      v_exp.asunto, v_numero_res, v_origen.numero, v_tipo_origen.nombre, trim(p_fundamentos)
    ),
    jsonb_build_object('datos', v_exp.datos, 'origen_id', v_origen.id),
    v_uid, null
  );

  insert into public.movimientos (expediente_id, hacia_area_id, desde_perfil_id, paso_hacia, motivo)
  values (v_exp.id, v_paso.area_id, v_uid, v_paso.orden, 'Ingreso del recurso de reconsideración');

  -- Constancia en el expediente de origen.
  perform public._incorporar_actuacion(
    v_origen.id, 'nota', 'Recurso de reconsideración interpuesto',
    format('El/la agente interpuso recurso de reconsideración contra la Resolución N.º %s. Tramita por el expediente %s.', v_numero_res, v_exp.numero),
    jsonb_build_object('recurso_id', v_exp.id),
    v_uid, null
  );

  return v_exp;
end;
$$;

revoke all on function public.interponer_reconsideracion(uuid, text) from public;
grant execute on function public.interponer_reconsideracion(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- La novedad de un recurso es la del trámite recurrido: concepto y código
-- salen del trámite de origen (no de "Recurso de reconsideración").
-- Igual que en la migración 001100, salvo el tipo.
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

  select t.* into v_tipo
    from public.tipos_tramite t
   where t.id = coalesce((select o.tipo_tramite_id from public.expedientes o where o.id = v_exp.origen_id), v_exp.tipo_tramite_id);
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
