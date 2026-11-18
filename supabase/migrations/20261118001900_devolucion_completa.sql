-- =====================================================================
-- Devolución, segunda parte (sobre 20261116001500_devolver_al_paso).
--
-- 1. Una consulta que vuelve sigue en su paso. Si el expediente está en
--    consulta en otra área y se pasa al área del paso actual, queda en ese
--    paso. Antes iba al último paso anterior de esa área: con el proyecto
--    (paso 3) en consulta en Mesa de Entradas, al volver a Bonificaciones
--    caía en el control (paso 1).
-- 2. La devolución reabre los pasos: se destildan los controles del paso
--    al que vuelve y de los siguientes. Así la tarea del paso no aparece
--    cumplida y se revisa de nuevo antes de volver a pasar. Lo que se había
--    tildado sigue en la providencia del pase que lo había hecho.
-- 3. La foja de una devolución se titula «Devolución a …», con «Se devuelve
--    para su revisión.» si no lleva providencia, y queda marcada en
--    datos.devolucion.
--
-- El resto de la regla no cambia. Misma firma de la función: se conservan
-- los permisos (grant execute).
-- =====================================================================

create or replace function public.pasar_expediente(
  p_expediente  uuid,
  p_hacia_area  uuid default null,
  p_hacia_perfil uuid default null,
  p_motivo      text default null
)
returns public.expedientes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid        uuid := auth.uid();
  v_exp        public.expedientes;
  v_area       uuid;
  v_orden      integer;
  v_area_nom   text;
  v_area_desde uuid;
  v_devolucion boolean;
  v_controles  jsonb;
begin
  select * into v_exp from public.expedientes where id = p_expediente for update;
  if not found then
    raise exception 'Expediente inexistente';
  end if;
  if not (public.es_miembro_area(v_exp.area_actual_id) or public.es_admin()) then
    raise exception 'Solo el área que tiene el expediente puede pasarlo' using errcode = '42501';
  end if;
  if v_exp.estado in ('archivado', 'rechazado') then
    raise exception 'El expediente está cerrado';
  end if;

  if p_hacia_area is null then
    select area_id, orden into v_area, v_orden
    from public.pasos_circuito
    where tipo_tramite_id = v_exp.tipo_tramite_id and orden > v_exp.paso_actual
    order by orden limit 1;
    if v_area is null then
      raise exception 'Es el último paso del circuito: archivá el expediente o elegí un área de destino';
    end if;
  else
    v_area := p_hacia_area;
    if exists (
      select 1 from public.pasos_circuito
      where tipo_tramite_id = v_exp.tipo_tramite_id and area_id = p_hacia_area and orden = v_exp.paso_actual
    ) then
      -- Vuelve de una consulta al área del paso actual: sigue en ese paso.
      v_orden := v_exp.paso_actual;
    elsif v_exp.estado <> 'resuelto' then
      -- Devolución: el último paso de esa área antes del actual. Con la resolución firmada no se vuelve atrás.
      select orden into v_orden from public.pasos_circuito
      where tipo_tramite_id = v_exp.tipo_tramite_id and area_id = p_hacia_area and orden < v_exp.paso_actual
      order by orden desc limit 1;
    end if;
    -- Si el área no tuvo pasos antes, su próximo paso; si no está en el circuito, el paso no cambia.
    if v_orden is null then
      select orden into v_orden from public.pasos_circuito
      where tipo_tramite_id = v_exp.tipo_tramite_id and area_id = p_hacia_area and orden > v_exp.paso_actual
      order by orden limit 1;
    end if;
    v_orden := coalesce(v_orden, v_exp.paso_actual);
  end if;

  v_devolucion := v_orden < v_exp.paso_actual;
  v_controles := v_exp.controles_hechos;
  if v_devolucion then
    -- Se reabren el paso al que vuelve y los siguientes: quedan solo los controles de los pasos anteriores.
    select coalesce(jsonb_object_agg(c.key, c.value), '{}'::jsonb) into v_controles
    from jsonb_each(coalesce(v_exp.controles_hechos, '{}'::jsonb)) c
    where case when c.key ~ '^[0-9]{1,9}$' then c.key::integer < v_orden else true end;
  end if;

  if p_hacia_perfil is not null and not exists (
    select 1 from public.miembros_area where perfil_id = p_hacia_perfil and area_id = v_area
  ) then
    raise exception 'La persona elegida no pertenece al área de destino';
  end if;

  select nombre into v_area_nom from public.areas where id = v_area;
  v_area_desde := v_exp.area_actual_id;

  insert into public.movimientos (expediente_id, desde_area_id, hacia_area_id, desde_perfil_id, hacia_perfil_id, paso_desde, paso_hacia, motivo)
  values (v_exp.id, v_area_desde, v_area, v_uid, p_hacia_perfil, v_exp.paso_actual, v_orden, p_motivo);

  update public.expedientes
     set area_actual_id = v_area,
         paso_actual = v_orden,
         asignado_a = p_hacia_perfil,
         controles_hechos = v_controles,
         estado = case when estado = 'iniciado' then 'en_tramite'::public.estado_expediente else estado end
   where id = v_exp.id
  returning * into v_exp;

  perform public._incorporar_actuacion(
    v_exp.id, 'pase',
    case when v_devolucion then 'Devolución a ' else 'Pase a ' end || v_area_nom,
    coalesce(
      nullif(trim(p_motivo), ''),
      case when v_devolucion then 'Se devuelve para su revisión.' else 'Se remite para su intervención.' end
    ),
    jsonb_build_object('hacia_area_id', v_area, 'hacia_perfil_id', p_hacia_perfil, 'paso', v_orden, 'devolucion', v_devolucion),
    v_uid, v_area_desde
  );

  return v_exp;
end;
$$;
