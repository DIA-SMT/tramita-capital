-- =====================================================================
-- Cuánto tarda cada paso de cada trámite, según las estadías ya
-- cumplidas: mediana y percentil 80, en horas corridas. Alimenta el
-- pronóstico de cada expediente (bandeja, expediente, portal del agente
-- y Migue) y la radiografía de los circuitos del tablero.
--
-- Una estadía empieza cuando el expediente entra a un paso (el inicio,
-- el pase al siguiente o una devolución) y termina con el próximo cambio
-- de paso, o al archivarse. Tomar el expediente o consultar a otra área
-- no cambia de paso y no corta la estadía. Las que siguen abiertas no
-- cuentan.
--
-- Solo devuelve tiempos agregados (ni expedientes ni personas), así que
-- la usa también el agente para ver cuándo sale su trámite, y Migue.
-- =====================================================================

create or replace function public.tiempos_por_paso(p_tipo uuid default null, p_dias integer default 365)
returns table (tipo_tramite_id uuid, orden integer, estadias bigint, mediana_horas numeric, p80_horas numeric)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  -- Con sesión (personal o agente) o desde el servidor (Migue por WhatsApp usa la clave de servicio).
  if auth.uid() is null and coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'Sin permiso' using errcode = '42501';
  end if;
  return query
  with entradas as (
    select e.tipo_tramite_id as tipo, e.estado, e.updated_at, m.paso_hacia, m.created_at,
           lead(m.created_at) over (partition by m.expediente_id order by m.created_at, m.id) as siguiente
    from public.movimientos m
    join public.expedientes e on e.id = m.expediente_id
    where m.paso_hacia is not null
      and m.paso_desde is distinct from m.paso_hacia
      and (p_tipo is null or e.tipo_tramite_id = p_tipo)
  ),
  estadias as (
    select x.tipo, x.paso_hacia as paso,
           extract(epoch from (coalesce(x.siguiente, case when x.estado in ('archivado', 'rechazado') then x.updated_at end) - x.created_at)) / 3600.0 as horas
    from entradas x
    where x.created_at >= now() - make_interval(days => least(greatest(coalesce(p_dias, 365), 1), 730))
  )
  select s.tipo, s.paso, count(*),
         round((percentile_cont(0.5) within group (order by s.horas))::numeric, 1),
         round((percentile_cont(0.8) within group (order by s.horas))::numeric, 1)
  from estadias s
  where s.horas is not null and s.horas >= 0
  group by s.tipo, s.paso;
end;
$$;

revoke execute on function public.tiempos_por_paso(uuid, integer) from public, anon;
grant execute on function public.tiempos_por_paso(uuid, integer) to authenticated;
