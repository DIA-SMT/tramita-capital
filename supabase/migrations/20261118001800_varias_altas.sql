-- =====================================================================
-- Varias altas en un expediente (relevamiento del 16/11/2026).
--
-- "En caso de haber presentado por más de un hijo, se incorpora todo a la
-- misma Resolución y Expte." (asignación por hijo/a, por nacimiento y por
-- familia numerosa), y la familia numerosa "debería estar disponible en el
-- mismo trámite de asignación por hijo/a cuando el agente se encuentre
-- declarando al tercer hijo".
--
-- Hasta ahora la novedad de haberes admitía un alta por expediente (índice
-- único por expediente y movimiento). Ahora cada novedad lleva un `item`
-- que la identifica dentro del expediente ('' para la novedad única de
-- siempre; por ejemplo 'hijo:<dni>' o 'familia_numerosa'), y el índice es
-- por expediente, movimiento e item.
--
-- registrar_novedades registra varias líneas con una sola foja firmada. Cada
-- línea lleva el concepto del trámite (o del trámite recurrido, si es un
-- recurso) o de uno de sus "altas adicionales" (tipos_tramite.
-- altas_adicionales: códigos de otros trámites cuya alta se puede pedir en el
-- mismo expediente, como la familia numerosa en la asignación por hijo/a).
-- registrar_novedad (una línea) sigue igual, con item ''.
-- =====================================================================

alter table public.novedades_haberes
  add column if not exists item text not null default '';

comment on column public.novedades_haberes.item is 'Qué línea de la novedad es dentro del expediente: '''' si es la única; por ejemplo hijo:<dni> o familia_numerosa.';

drop index if exists public.novedades_haberes_unica;
create unique index novedades_haberes_unica on public.novedades_haberes (expediente_id, movimiento, item) where estado <> 'anulada';

alter table public.tipos_tramite
  add column if not exists altas_adicionales text[] not null default '{}';

comment on column public.tipos_tramite.altas_adicionales is 'Códigos de otros trámites cuya alta se puede pedir y registrar en el mismo expediente (por ejemplo, la familia numerosa en la asignación por hijo/a).';

/**
 * Varias líneas de novedad con una sola foja firmada. p_lineas: arreglo de
 * {codigo, item, movimiento, vigencia_desde, vigencia_hasta, detalle, observaciones}.
 */
create or replace function public.registrar_novedades(p_expediente uuid, p_lineas jsonb, p_texto text)
returns setof public.novedades_haberes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_exp    public.expedientes;
  v_base   public.tipos_tramite;
  v_tipo   public.tipos_tramite;
  v_paso   public.pasos_circuito;
  v_res    public.actuaciones;
  v_act    public.actuaciones;
  v_linea  jsonb;
  v_mov    text;
  v_item   text;
  v_desde  date;
  v_hasta  date;
  v_nov    public.novedades_haberes;
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
  if jsonb_typeof(p_lineas) <> 'array' or jsonb_array_length(p_lineas) = 0 then
    raise exception 'Indicá al menos una línea de novedad' using errcode = '22023';
  end if;
  if jsonb_array_length(p_lineas) > 20 then
    raise exception 'Demasiadas líneas de novedad en un expediente' using errcode = '22023';
  end if;
  if (select count(distinct coalesce(l ->> 'movimiento', '') || '|' || coalesce(l ->> 'item', '')) from jsonb_array_elements(p_lineas) l) <> jsonb_array_length(p_lineas) then
    raise exception 'Hay líneas repetidas en la novedad' using errcode = '22023';
  end if;
  if coalesce(trim(p_texto), '') = '' then
    raise exception 'Falta el texto de la foja' using errcode = '22023';
  end if;

  -- El trámite del que sale el concepto: el del expediente, o el recurrido si es un recurso.
  select t.* into v_base
    from public.tipos_tramite t
   where t.id = coalesce((select o.tipo_tramite_id from public.expedientes o where o.id = v_exp.origen_id), v_exp.tipo_tramite_id);

  select * into v_res from public.actuaciones
   where expediente_id = v_exp.id and tipo = 'resolucion' and estado = 'firmada'
   order by foja desc
   limit 1;

  -- Controles de todas las líneas antes de escribir.
  for v_linea in select * from jsonb_array_elements(p_lineas) loop
    v_mov := v_linea ->> 'movimiento';
    v_item := left(coalesce(v_linea ->> 'item', ''), 80);
    if v_mov is null or v_mov not in ('alta', 'baja', 'modificacion') then
      raise exception 'Movimiento inválido';
    end if;
    if nullif(v_linea ->> 'vigencia_desde', '') is null then
      raise exception 'Indicá desde qué período rige';
    end if;
    if coalesce(v_linea ->> 'codigo', v_base.codigo) <> v_base.codigo
       and not (v_linea ->> 'codigo') = any (v_base.altas_adicionales) then
      raise exception 'El concepto % no corresponde a este trámite', v_linea ->> 'codigo' using errcode = '22023';
    end if;
    if exists (
      select 1 from public.novedades_haberes n
       where n.expediente_id = v_exp.id and n.movimiento = v_mov and n.item = v_item and n.estado <> 'anulada'
    ) then
      if v_item = '' then
        raise exception 'Ya hay una novedad registrada para este expediente';
      end if;
      raise exception 'Ya hay una novedad registrada para esa línea (%)', v_item;
    end if;
  end loop;

  v_act := public._incorporar_actuacion(
    v_exp.id, 'nota', 'Novedad a Liquidación de Haberes', trim(p_texto),
    jsonb_build_object('novedades', p_lineas),
    v_uid, v_exp.area_actual_id
  );

  for v_linea in select * from jsonb_array_elements(p_lineas) loop
    select * into v_tipo from public.tipos_tramite where codigo = coalesce(v_linea ->> 'codigo', v_base.codigo);
    v_desde := (v_linea ->> 'vigencia_desde')::date;
    v_hasta := nullif(v_linea ->> 'vigencia_hasta', '')::date;
    insert into public.novedades_haberes (
      expediente_id, perfil_id, resolucion_id, actuacion_id, numero_expediente, resolucion_numero, resolucion_fecha,
      movimiento, concepto, codigo_tramite, vigencia_desde, vigencia_hasta, detalle, observaciones, registrada_por, item
    ) values (
      v_exp.id, v_exp.iniciador_id, v_res.id, v_act.id, v_exp.numero,
      v_res.datos -> 'protocolo' ->> 'numero', (v_res.firmada_at at time zone 'America/Argentina/Tucuman')::date,
      v_linea ->> 'movimiento', v_tipo.nombre, v_tipo.codigo,
      date_trunc('month', v_desde)::date, date_trunc('month', v_hasta)::date,
      coalesce(case when jsonb_typeof(v_linea -> 'detalle') = 'object' then v_linea -> 'detalle' end, '{}'::jsonb),
      nullif(trim(v_linea ->> 'observaciones'), ''), v_uid, left(coalesce(v_linea ->> 'item', ''), 80)
    )
    returning * into v_nov;
    return next v_nov;
  end loop;
  return;
end;
$$;

revoke all on function public.registrar_novedades(uuid, jsonb, text) from public;
grant execute on function public.registrar_novedades(uuid, jsonb, text) to authenticated;

-- registrar_novedad (una línea): igual que en la migración 001700, con item '' en el control y en el alta.
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
language sql
security definer
set search_path = ''
as $$
  select * from public.registrar_novedades(
    p_expediente,
    jsonb_build_array(jsonb_build_object(
      'item', '',
      'movimiento', p_movimiento,
      'vigencia_desde', p_vigencia_desde,
      'vigencia_hasta', p_vigencia_hasta,
      'detalle', coalesce(p_detalle, '{}'::jsonb),
      'observaciones', p_observaciones
    )),
    coalesce(nullif(trim(p_texto), ''), 'Se comunica la novedad a Liquidación de Haberes para su impacto en la liquidación y su registro en Civitas.')
  )
  limit 1;
$$;
