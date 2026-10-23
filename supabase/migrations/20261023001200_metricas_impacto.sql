-- =====================================================================
-- Tablero de impacto: resoluciones firmadas, cierre hacia Civitas
-- (novedades de haberes), consultas a Migue y papel evitado en el año.
-- Solo cantidades y promedios: nunca devuelve las preguntas a Migue ni
-- datos de personas.
-- =====================================================================

create or replace function public.metricas_impacto(p_dias integer default 30)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_desde timestamptz := now() - make_interval(days => least(greatest(coalesce(p_dias, 30), 1), 365));
  v jsonb;
begin
  if not (public.es_interno() or public.es_admin()) then
    raise exception 'Sin permiso' using errcode = '42501';
  end if;

  select jsonb_build_object(
    -- Resoluciones protocolizadas en el período y cuántas con firma ológrafa electrónica
    'resoluciones',            (select count(*) from public.actuaciones a where a.tipo = 'resolucion' and a.estado = 'firmada' and a.firmada_at >= v_desde),
    'resoluciones_olografas',  (select count(*) from public.actuaciones a where a.tipo = 'resolucion' and a.estado = 'firmada' and a.firmada_at >= v_desde and a.datos -> 'firma' ->> 'tipo' = 'olografa'),

    -- Cierre hacia Civitas
    'novedades_registradas',   (select count(*) from public.novedades_haberes n where n.estado <> 'anulada' and n.created_at >= v_desde),
    'novedades_pendientes',    (select count(*) from public.novedades_haberes n where n.estado = 'pendiente'),
    'novedades_cargadas',      (select count(*) from public.novedades_haberes n where n.estado = 'cargada' and n.cargada_at >= v_desde),
    'novedades_demora_carga',  (select round((avg(extract(epoch from (n.cargada_at - n.created_at)) / 86400.0))::numeric, 1)
                                  from public.novedades_haberes n where n.estado = 'cargada' and n.cargada_at >= v_desde),
    'resolucion_a_civitas',    (select round(avg((n.cargada_at at time zone 'America/Argentina/Tucuman')::date - n.resolucion_fecha)::numeric, 1)
                                  from public.novedades_haberes n where n.estado = 'cargada' and n.cargada_at >= v_desde and n.resolucion_fecha is not null),

    -- Migue (consultas de agentes): solo totales
    'consultas_migue',         (select count(*) from public.ia_generaciones g where g.tipo = 'asistente' and g.created_at >= v_desde),
    'personas_migue',          (select count(distinct g.solicitado_por) from public.ia_generaciones g where g.tipo = 'asistente' and g.created_at >= v_desde),
    'consultas_migue_ok',      (select count(*) from public.ia_generaciones g where g.tipo = 'asistente' and g.estado = 'ok' and g.created_at >= v_desde),

    -- Papel: fojas firmadas y pases de los últimos 12 meses (cada uno era al menos una hoja)
    'hojas_anio',              (select count(*) from public.actuaciones a where a.estado = 'firmada' and a.firmada_at >= now() - interval '365 days')
                               + (select count(*) from public.movimientos m where m.created_at >= now() - interval '365 days')
  ) into v;
  return v;
end;
$$;

revoke execute on function public.metricas_impacto(integer) from public, anon;
grant execute on function public.metricas_impacto(integer) to authenticated;
