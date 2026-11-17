-- =====================================================================
-- Cierre sin resolución (relevamiento del 16/11/2026).
--
-- Algunos trámites terminan sin resolución de Capital Humano: el área
-- controla, carga y cierra (certificados escolares dentro de término,
-- cambio de domicilio). Su circuito no tiene paso de firma.
--
-- Hasta ahora, archivar sin resolución firmada era cerrar el trámite sin
-- decidirlo (desistimiento): solo un responsable del área y con motivo.
-- Eso sigue igual, salvo un caso nuevo, el cumplimiento:
--   - el circuito del trámite no tiene paso de firma,
--   - el expediente está en el último paso, en el área de ese paso,
--   - y está iniciado o en trámite (no observado).
-- Entonces cualquier persona del área lo cierra: la foja "Cumplimiento y
-- archivo" deja constancia de lo hecho y el resultado queda "aprobado".
--
-- Además, al archivar, el legajo recibe la presentación del agente si el
-- trámite la pide en su documentación final (clave "presentacion"): por
-- ejemplo, el formulario del cambio de domicilio.
--
-- Misma firma de archivar_expediente: se conservan los permisos.
-- =====================================================================

/** ¿El circuito del trámite termina sin resolución (no tiene paso de firma)? */
create or replace function public.tramite_sin_resolucion(p_tipo uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.pasos_circuito where tipo_tramite_id = p_tipo)
     and not exists (select 1 from public.pasos_circuito where tipo_tramite_id = p_tipo and accion = 'firma');
$$;

revoke all on function public.tramite_sin_resolucion(uuid) from public;
grant execute on function public.tramite_sin_resolucion(uuid) to authenticated;

create or replace function public.archivar_expediente(p_expediente uuid, p_motivo text default null)
returns public.expedientes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid       uuid := auth.uid();
  v_exp       public.expedientes;
  v_tipo      public.tipos_tramite;
  v_cumplido  boolean;
begin
  select * into v_exp from public.expedientes where id = p_expediente for update;
  if not found then
    raise exception 'Expediente inexistente';
  end if;
  if not (public.es_miembro_area(v_exp.area_actual_id) or public.es_admin()) then
    raise exception 'Solo el área que tiene el expediente puede archivarlo' using errcode = '42501';
  end if;
  if v_exp.estado in ('archivado', 'rechazado') then
    raise exception 'El expediente ya está cerrado';
  end if;

  -- Cumplimiento: trámite sin resolución, en el último paso y en el área de ese paso.
  v_cumplido := v_exp.estado in ('iniciado', 'en_tramite')
    and public.tramite_sin_resolucion(v_exp.tipo_tramite_id)
    and not exists (
      select 1 from public.pasos_circuito
       where tipo_tramite_id = v_exp.tipo_tramite_id and orden > v_exp.paso_actual
    )
    and exists (
      select 1 from public.pasos_circuito
       where tipo_tramite_id = v_exp.tipo_tramite_id and orden = v_exp.paso_actual and area_id = v_exp.area_actual_id
    );

  -- Con la resolución firmada, archivar es el cierre del circuito. Sin ella (y sin cumplimiento), es cerrar el trámite sin decidirlo.
  if v_exp.estado <> 'resuelto' and not v_cumplido then
    if not (public.es_admin() or coalesce(public.rol_en_area(v_exp.area_actual_id)::text, '') in ('dictaminante', 'firmante', 'jefe')) then
      raise exception 'Un trámite sin resolución lo archiva un responsable del área (jefe, firmante o dictaminante)' using errcode = '42501';
    end if;
    if coalesce(trim(p_motivo), '') = '' then
      raise exception 'Indicá por qué se archiva sin resolución' using errcode = '22023';
    end if;
  end if;

  perform public._incorporar_actuacion(
    v_exp.id, 'nota',
    case when v_cumplido then 'Cumplimiento y archivo' else 'Archivo del expediente' end,
    coalesce(nullif(trim(p_motivo), ''), 'Cumplido, archívese.'),
    case when v_cumplido then '{"cumplimiento":true}'::jsonb else '{}'::jsonb end,
    v_uid, v_exp.area_actual_id
  );

  select * into v_tipo from public.tipos_tramite where id = v_exp.tipo_tramite_id;
  insert into public.legajo_documentos (perfil_id, expediente_id, documento_id, tipo, titulo)
  select v_exp.iniciador_id, v_exp.id, d.id, 'documento', d.nombre_archivo
  from public.documentos d
  where d.expediente_id = v_exp.id
    and d.requisito_clave = any (v_tipo.documentacion_final)
    and not exists (select 1 from public.legajo_documentos l where l.documento_id = d.id);

  -- La presentación del agente (el formulario completado), si el trámite la manda al legajo.
  if 'presentacion' = any (v_tipo.documentacion_final) then
    insert into public.legajo_documentos (perfil_id, expediente_id, actuacion_id, tipo, titulo)
    select v_exp.iniciador_id, v_exp.id, a.id, 'presentacion', a.titulo
    from public.actuaciones a
    where a.expediente_id = v_exp.id and a.tipo = 'presentacion' and a.estado = 'firmada'
      and not exists (select 1 from public.legajo_documentos l where l.actuacion_id = a.id)
    order by a.foja
    limit 1;
  end if;

  update public.expedientes
     set estado = 'archivado', asignado_a = null,
         resultado = case when v_cumplido then 'aprobado' else resultado end,
         resuelto_at = coalesce(resuelto_at, now())
   where id = v_exp.id
  returning * into v_exp;
  return v_exp;
end;
$$;
