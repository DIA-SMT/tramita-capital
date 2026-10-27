-- =====================================================================
-- Controles del paso: lo que la oficina tilda en «Tarea del paso» queda
-- guardado en el expediente, con quién y cuándo, para que se vea al
-- recargar y lo vea el resto del área. Se guardan por paso del circuito:
-- {"<orden del paso>": {"<índice del control>": {"por": "<perfil>", "at": "<fecha>"}}}
-- Solo los marca el área que tiene el expediente, y nunca en uno cerrado.
-- =====================================================================

alter table public.expedientes add column if not exists controles_hechos jsonb not null default '{}'::jsonb;
comment on column public.expedientes.controles_hechos is
  'Controles del circuito marcados por el área, por paso: {"<orden>": {"<índice>": {"por": uuid, "at": timestamptz}}}.';

create or replace function public.marcar_control(p_expediente uuid, p_indice integer, p_hecho boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid       uuid := auth.uid();
  v_exp       public.expedientes;
  v_controles text[];
  v_clave     text;
  v_paso      jsonb;
begin
  select * into v_exp from public.expedientes where id = p_expediente for update;
  if not found then
    raise exception 'Expediente inexistente';
  end if;
  if not (public.es_miembro_area(v_exp.area_actual_id) or public.es_admin()) then
    raise exception 'Solo el área que tiene el expediente marca sus controles' using errcode = '42501';
  end if;
  if v_exp.estado in ('archivado', 'rechazado') then
    raise exception 'El expediente está cerrado';
  end if;

  select p.controles into v_controles
  from public.pasos_circuito p
  where p.tipo_tramite_id = v_exp.tipo_tramite_id and p.orden = v_exp.paso_actual;
  if p_indice is null or p_indice < 0 or p_indice >= coalesce(cardinality(v_controles), 0) then
    raise exception 'Ese control no existe en el paso actual' using errcode = '22023';
  end if;

  v_clave := v_exp.paso_actual::text;
  v_paso := coalesce(v_exp.controles_hechos -> v_clave, '{}'::jsonb);
  if coalesce(p_hecho, false) then
    v_paso := v_paso || jsonb_build_object(p_indice::text, jsonb_build_object('por', v_uid, 'at', now()));
  else
    v_paso := v_paso - p_indice::text;
  end if;

  update public.expedientes
     set controles_hechos = jsonb_set(coalesce(controles_hechos, '{}'::jsonb), array[v_clave], v_paso, true)
   where id = v_exp.id;
  return v_paso;
end;
$$;

revoke execute on function public.marcar_control(uuid, integer, boolean) from public, anon;
grant execute on function public.marcar_control(uuid, integer, boolean) to authenticated;
