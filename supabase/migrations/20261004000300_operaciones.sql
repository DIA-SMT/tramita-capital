-- =====================================================================
-- Operaciones del expediente: numeración, foliado con firma electrónica
-- encadenada por hash, circuito de pases, auditoría y métricas.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Inmutabilidad
-- ---------------------------------------------------------------------
create or replace function public.proteger_actuacion_firmada()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.estado <> 'borrador' then
      raise exception 'La foja % está firmada: no puede eliminarse', old.foja using errcode = '42501';
    end if;
    return old;
  end if;
  if old.estado <> 'borrador' then
    raise exception 'La foja % está firmada: es inmutable', old.foja using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger actuaciones_inmutables
  before update or delete on public.actuaciones
  for each row execute function public.proteger_actuacion_firmada();

create or replace function public.solo_agregar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'La tabla % es de solo agregado', tg_table_name using errcode = '42501';
end;
$$;

create trigger movimientos_solo_agregar before update or delete on public.movimientos
  for each row execute function public.solo_agregar();
create trigger documentos_solo_agregar before update or delete on public.documentos
  for each row execute function public.solo_agregar();
create trigger auditoria_solo_agregar before update or delete on public.auditoria
  for each row execute function public.solo_agregar();

-- ---------------------------------------------------------------------
-- Auditoría
-- ---------------------------------------------------------------------
create or replace function public.auditar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fila jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  insert into public.auditoria (tabla, registro_id, accion, actor_id, datos)
  values (
    tg_table_name,
    nullif(v_fila ->> 'id', '')::uuid,
    lower(tg_op),
    auth.uid(),
    case when tg_op = 'UPDATE'
      then jsonb_build_object('antes', to_jsonb(old), 'despues', to_jsonb(new))
      else v_fila
    end
  );
  return coalesce(new, old);
end;
$$;

create trigger auditar_expedientes after insert or update on public.expedientes
  for each row execute function public.auditar();
create trigger auditar_actuaciones after insert or update or delete on public.actuaciones
  for each row execute function public.auditar();
create trigger auditar_documentos after insert on public.documentos
  for each row execute function public.auditar();
create trigger auditar_miembros_area after insert or update or delete on public.miembros_area
  for each row execute function public.auditar();
create trigger auditar_perfiles after update on public.perfiles
  for each row execute function public.auditar();
create trigger auditar_tipos_tramite after insert or update or delete on public.tipos_tramite
  for each row execute function public.auditar();

-- ---------------------------------------------------------------------
-- Numeración y foliado (internas, no expuestas)
-- ---------------------------------------------------------------------
create or replace function public.siguiente_numero(p_prefijo text)
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
  values (v_anio, p_prefijo, 1)
  on conflict (anio, prefijo) do update set ultimo = c.ultimo + 1
  returning ultimo into v_n;
  return format('%s-%s-%s', p_prefijo, v_anio, lpad(v_n::text, 6, '0'));
end;
$$;

-- Huella de una foja: cualquier cambio posterior rompe la cadena y es detectable.
create or replace function public.hash_actuacion(a public.actuaciones)
returns text
language sql stable
set search_path = ''
as $$
  select encode(
    sha256(convert_to(concat_ws('|',
      a.expediente_id::text,
      a.foja::text,
      a.tipo::text,
      a.titulo,
      coalesce(a.contenido, ''),
      coalesce(a.datos::text, '{}'),
      a.firmada_por::text,
      to_char(a.firmada_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
      coalesce(a.hash_anterior, '')
    ), 'UTF8')),
    'hex'
  );
$$;

-- Firma electrónica interna: asigna foja correlativa, encadena y sella.
create or replace function public._sellar_actuacion(p_actuacion uuid, p_firmante uuid)
returns public.actuaciones
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_act  public.actuaciones;
  v_prev text;
  v_foja integer;
begin
  select * into v_act from public.actuaciones where id = p_actuacion for update;
  if not found then
    raise exception 'Actuación inexistente';
  end if;
  if v_act.estado <> 'borrador' then
    raise exception 'La actuación ya fue firmada';
  end if;

  -- Serializa el foliado del expediente
  perform 1 from public.expedientes where id = v_act.expediente_id for update;

  select coalesce(max(foja), 0) + 1 into v_foja
  from public.actuaciones where expediente_id = v_act.expediente_id and foja is not null;

  select hash into v_prev
  from public.actuaciones where expediente_id = v_act.expediente_id and foja = v_foja - 1;

  v_act.foja          := v_foja;
  v_act.firmada_por   := p_firmante;
  v_act.firmada_at    := now();
  v_act.hash_anterior := v_prev;
  v_act.hash          := public.hash_actuacion(v_act);

  update public.actuaciones
     set foja = v_act.foja,
         firmada_por = v_act.firmada_por,
         firmada_at = v_act.firmada_at,
         hash_anterior = v_act.hash_anterior,
         hash = v_act.hash,
         estado = 'firmada'
   where id = p_actuacion
  returning * into v_act;

  return v_act;
end;
$$;

create or replace function public._incorporar_actuacion(
  p_expediente uuid,
  p_tipo       public.tipo_actuacion,
  p_titulo     text,
  p_contenido  text,
  p_datos      jsonb,
  p_autor      uuid,
  p_area       uuid
)
returns public.actuaciones
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.actuaciones (expediente_id, tipo, titulo, contenido, datos, autor_id, area_id)
  values (p_expediente, p_tipo, p_titulo, p_contenido, coalesce(p_datos, '{}'::jsonb), p_autor, p_area)
  returning id into v_id;
  return public._sellar_actuacion(v_id, p_autor);
end;
$$;

-- ---------------------------------------------------------------------
-- RPC: inicio del trámite por el agente
-- ---------------------------------------------------------------------
create or replace function public.crear_expediente(p_tipo text, p_asunto text, p_datos jsonb)
returns public.expedientes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_tipo  public.tipos_tramite;
  v_paso  public.pasos_circuito;
  v_exp   public.expedientes;
  v_falta text;
  v_texto text;
begin
  if v_uid is null then
    raise exception 'Sesión no válida' using errcode = '28000';
  end if;

  select * into v_tipo from public.tipos_tramite where codigo = p_tipo and activo;
  if not found then
    raise exception 'Tipo de trámite inexistente o inactivo: %', p_tipo using errcode = '22023';
  end if;

  if coalesce(trim(p_asunto), '') = '' then
    raise exception 'El asunto es obligatorio' using errcode = '22023';
  end if;

  select string_agg(c ->> 'etiqueta', ', ') into v_falta
  from jsonb_array_elements(v_tipo.formulario) c
  where coalesce((c ->> 'obligatorio')::boolean, false)
    and nullif(trim(coalesce(p_datos ->> (c ->> 'clave'), '')), '') is null;
  if v_falta is not null then
    raise exception 'Faltan datos obligatorios: %', v_falta using errcode = '22023';
  end if;

  select * into v_paso from public.pasos_circuito
  where tipo_tramite_id = v_tipo.id order by orden limit 1;
  if not found then
    raise exception 'El trámite % no tiene circuito configurado', p_tipo;
  end if;

  insert into public.expedientes (
    numero, tipo_tramite_id, iniciador_id, asunto, datos, estado,
    prioridad, prioridad_motivo, prioridad_origen,
    paso_actual, area_actual_id, reservado, vence_at
  ) values (
    public.siguiente_numero('CH'), v_tipo.id, v_uid, left(trim(p_asunto), 300), coalesce(p_datos, '{}'::jsonb), 'iniciado',
    v_tipo.prioridad_base,
    case when v_tipo.prioridad_base <> 'normal' then 'Prioridad definida para este tipo de trámite' end,
    'regla',
    v_paso.orden, v_paso.area_id, v_tipo.reservado,
    case when v_tipo.plazo_dias is not null then now() + make_interval(days => v_tipo.plazo_dias) end
  )
  returning * into v_exp;

  select string_agg(format('- **%s:** %s', c ->> 'etiqueta', coalesce(nullif(p_datos ->> (c ->> 'clave'), ''), '—')), e'\n' order by ord)
    into v_texto
  from jsonb_array_elements(v_tipo.formulario) with ordinality as t(c, ord);

  perform public._incorporar_actuacion(
    v_exp.id, 'presentacion',
    'Presentación: ' || v_tipo.nombre,
    format(e'**Asunto:** %s\n\n%s', v_exp.asunto, coalesce(v_texto, '')),
    jsonb_build_object('datos', v_exp.datos),
    v_uid, null
  );

  insert into public.movimientos (expediente_id, hacia_area_id, desde_perfil_id, paso_hacia, motivo)
  values (v_exp.id, v_paso.area_id, v_uid, v_paso.orden, 'Ingreso del trámite');

  return v_exp;
end;
$$;

-- ---------------------------------------------------------------------
-- RPC: documentación acompañada (los archivos ya están en Storage;
-- el servidor verificó su existencia y calculó el SHA-256)
-- ---------------------------------------------------------------------
create or replace function public.registrar_documentos(p_expediente uuid, p_documentos jsonb)
returns public.actuaciones
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_doc    jsonb;
  v_lineas text := '';
  v_area   uuid;
  v_id     uuid;
begin
  if not public.puede_subir_documento(p_expediente) then
    raise exception 'Sin permiso para adjuntar documentos a este expediente' using errcode = '42501';
  end if;
  if jsonb_typeof(p_documentos) <> 'array' or jsonb_array_length(p_documentos) = 0 then
    raise exception 'No hay documentos para registrar' using errcode = '22023';
  end if;

  for v_doc in select * from jsonb_array_elements(p_documentos) loop
    if public.carpeta_expediente(v_doc ->> 'storage_path') is distinct from p_expediente then
      raise exception 'Ruta de archivo inválida' using errcode = '22023';
    end if;
    if coalesce(v_doc ->> 'sha256', '') !~ '^[0-9a-f]{64}$' then
      raise exception 'Huella SHA-256 inválida' using errcode = '22023';
    end if;
    v_lineas := v_lineas || format(e'- %s%s · SHA-256 `%s…`\n',
      v_doc ->> 'nombre_archivo',
      coalesce(' (' || nullif(v_doc ->> 'etiqueta', '') || ')', ''),
      left(v_doc ->> 'sha256', 16));
  end loop;

  select case when public.es_miembro_area(e.area_actual_id) then e.area_actual_id end
    into v_area
  from public.expedientes e where e.id = p_expediente;

  insert into public.actuaciones (expediente_id, tipo, titulo, contenido, datos, autor_id, area_id)
  values (p_expediente, 'documento', 'Documentación acompañada', v_lineas,
          jsonb_build_object('documentos', p_documentos), v_uid, v_area)
  returning id into v_id;

  insert into public.documentos (expediente_id, actuacion_id, requisito_clave, nombre_archivo, storage_path, mime_type, tamano_bytes, sha256, subido_por)
  select p_expediente, v_id, nullif(d ->> 'requisito_clave', ''), d ->> 'nombre_archivo', d ->> 'storage_path',
         d ->> 'mime_type', (d ->> 'tamano_bytes')::bigint, d ->> 'sha256', v_uid
  from jsonb_array_elements(p_documentos) d;

  return public._sellar_actuacion(v_id, v_uid);
end;
$$;

-- ---------------------------------------------------------------------
-- RPC: circuito interno
-- ---------------------------------------------------------------------
create or replace function public.tomar_expediente(p_expediente uuid)
returns public.expedientes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_exp public.expedientes;
begin
  select * into v_exp from public.expedientes where id = p_expediente for update;
  if not found then
    raise exception 'Expediente inexistente';
  end if;
  if not (public.es_miembro_area(v_exp.area_actual_id) or public.es_admin()) then
    raise exception 'Solo el área que tiene el expediente puede tomarlo' using errcode = '42501';
  end if;
  if v_exp.estado in ('archivado', 'rechazado') then
    raise exception 'El expediente está cerrado';
  end if;

  insert into public.movimientos (expediente_id, desde_area_id, hacia_area_id, desde_perfil_id, hacia_perfil_id, paso_desde, paso_hacia, motivo)
  values (v_exp.id, v_exp.area_actual_id, v_exp.area_actual_id, v_exp.asignado_a, v_uid, v_exp.paso_actual, v_exp.paso_actual, 'Toma el expediente');

  update public.expedientes
     set asignado_a = v_uid,
         estado = case when estado = 'iniciado' then 'en_tramite'::public.estado_expediente else estado end
   where id = v_exp.id
  returning * into v_exp;
  return v_exp;
end;
$$;

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
    select orden into v_orden from public.pasos_circuito
    where tipo_tramite_id = v_exp.tipo_tramite_id and area_id = p_hacia_area and orden > v_exp.paso_actual
    order by orden limit 1;
    if v_orden is null then
      select orden into v_orden from public.pasos_circuito
      where tipo_tramite_id = v_exp.tipo_tramite_id and area_id = p_hacia_area
      order by orden desc limit 1;
    end if;
    v_orden := coalesce(v_orden, v_exp.paso_actual);
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
         estado = case when estado = 'iniciado' then 'en_tramite'::public.estado_expediente else estado end
   where id = v_exp.id
  returning * into v_exp;

  perform public._incorporar_actuacion(
    v_exp.id, 'pase', 'Pase a ' || v_area_nom,
    coalesce(nullif(trim(p_motivo), ''), 'Se remite para su intervención.'),
    jsonb_build_object('hacia_area_id', v_area, 'hacia_perfil_id', p_hacia_perfil, 'paso', v_orden),
    v_uid, v_area_desde
  );

  return v_exp;
end;
$$;

create or replace function public.firmar_actuacion(p_actuacion uuid)
returns public.actuaciones
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_act public.actuaciones;
  v_exp public.expedientes;
  v_rol public.rol_area;
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

  v_act := public._sellar_actuacion(p_actuacion, v_uid);

  if v_act.tipo = 'resolucion' then
    update public.expedientes set estado = 'resuelto', resuelto_at = now() where id = v_exp.id;
  end if;

  if v_act.ia_generacion_id is not null then
    update public.ia_generaciones set aceptada = true where id = v_act.ia_generacion_id;
  end if;

  return v_act;
end;
$$;

create or replace function public.observar_expediente(p_expediente uuid, p_motivo text)
returns public.expedientes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_exp public.expedientes;
begin
  if coalesce(trim(p_motivo), '') = '' then
    raise exception 'Indicá qué debe subsanar el agente' using errcode = '22023';
  end if;
  select * into v_exp from public.expedientes where id = p_expediente for update;
  if not (public.es_miembro_area(v_exp.area_actual_id) or public.es_admin()) then
    raise exception 'Solo el área que tiene el expediente puede observarlo' using errcode = '42501';
  end if;

  perform public._incorporar_actuacion(v_exp.id, 'observacion', 'Observación al agente', trim(p_motivo), '{}'::jsonb, v_uid, v_exp.area_actual_id);

  update public.expedientes set estado = 'observado' where id = v_exp.id returning * into v_exp;
  return v_exp;
end;
$$;

create or replace function public.subsanar_expediente(p_expediente uuid, p_texto text)
returns public.expedientes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_exp public.expedientes;
begin
  select * into v_exp from public.expedientes where id = p_expediente for update;
  if v_exp.iniciador_id is distinct from v_uid then
    raise exception 'Solo quien inició el trámite puede subsanarlo' using errcode = '42501';
  end if;
  if v_exp.estado <> 'observado' then
    raise exception 'El expediente no tiene observaciones pendientes';
  end if;

  perform public._incorporar_actuacion(v_exp.id, 'subsanacion', 'Respuesta del agente', coalesce(nullif(trim(p_texto), ''), 'Se adjunta la documentación solicitada.'), '{}'::jsonb, v_uid, null);

  update public.expedientes set estado = 'en_tramite' where id = v_exp.id returning * into v_exp;
  return v_exp;
end;
$$;

create or replace function public.archivar_expediente(p_expediente uuid, p_motivo text default null)
returns public.expedientes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_exp public.expedientes;
begin
  select * into v_exp from public.expedientes where id = p_expediente for update;
  if not (public.es_miembro_area(v_exp.area_actual_id) or public.es_admin()) then
    raise exception 'Solo el área que tiene el expediente puede archivarlo' using errcode = '42501';
  end if;
  if v_exp.estado in ('archivado', 'rechazado') then
    raise exception 'El expediente ya está cerrado';
  end if;

  perform public._incorporar_actuacion(v_exp.id, 'nota', 'Archivo del expediente', coalesce(nullif(trim(p_motivo), ''), 'Cumplido, archívese.'), '{}'::jsonb, v_uid, v_exp.area_actual_id);

  update public.expedientes
     set estado = 'archivado', asignado_a = null,
         resuelto_at = coalesce(resuelto_at, now())
   where id = v_exp.id
  returning * into v_exp;
  return v_exp;
end;
$$;

create or replace function public.fijar_prioridad(p_expediente uuid, p_prioridad public.prioridad_expediente, p_motivo text)
returns public.expedientes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_exp public.expedientes;
begin
  if not (public.es_interno() and public.puede_ver_expediente(p_expediente)) then
    raise exception 'Sin permiso para cambiar la prioridad' using errcode = '42501';
  end if;
  update public.expedientes
     set prioridad = p_prioridad, prioridad_motivo = p_motivo, prioridad_origen = 'manual'
   where id = p_expediente
  returning * into v_exp;
  return v_exp;
end;
$$;

-- Verificación de integridad de la cadena de fojas
create or replace function public.verificar_integridad(p_expediente uuid)
returns table (foja integer, hash_ok boolean, cadena_ok boolean)
language sql stable security definer
set search_path = ''
as $$
  select a.foja,
         a.hash = public.hash_actuacion(a) as hash_ok,
         coalesce(a.hash_anterior, '') = coalesce(lag(a.hash) over (order by a.foja), '') as cadena_ok
  from public.actuaciones a
  where a.expediente_id = p_expediente
    and a.estado = 'firmada'
    and public.puede_ver_expediente(p_expediente)
  order by a.foja;
$$;

-- ---------------------------------------------------------------------
-- Métricas (agregados sin datos personales; solo personal interno)
-- ---------------------------------------------------------------------
create or replace function public.metricas_resumen()
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v jsonb;
begin
  if not (public.es_interno() or public.es_admin()) then
    raise exception 'Sin permiso' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'activos',            count(*) filter (where e.estado in ('iniciado', 'en_tramite', 'observado')),
    'ingresados_hoy',     count(*) filter (where e.created_at >= date_trunc('day', now() at time zone 'America/Argentina/Tucuman') at time zone 'America/Argentina/Tucuman'),
    'resueltos_30d',      count(*) filter (where e.resuelto_at >= now() - interval '30 days'),
    'vencidos',           count(*) filter (where e.estado in ('iniciado', 'en_tramite', 'observado') and e.vence_at < now()),
    'urgentes',           count(*) filter (where e.estado in ('iniciado', 'en_tramite', 'observado') and e.prioridad in ('alta', 'urgente')),
    'promedio_dias',      round((avg(extract(epoch from (e.resuelto_at - e.created_at)) / 86400.0) filter (where e.resuelto_at >= now() - interval '90 days'))::numeric, 1),
    'linea_base_dias',    (select round(avg(t.linea_base_dias), 1) from public.tipos_tramite t where t.linea_base_dias is not null),
    'hojas_evitadas',     (select count(*) from public.actuaciones a where a.estado = 'firmada') + (select count(*) from public.movimientos),
    'borradores_ia',      (select count(*) from public.ia_generaciones g where g.tipo in ('dictamen', 'resolucion', 'providencia')),
    'borradores_ia_aceptados', (select count(*) from public.ia_generaciones g where g.aceptada)
  ) into v
  from public.expedientes e;
  return v;
end;
$$;

create or replace function public.metricas_por_tipo()
returns table (
  tipo_id uuid, codigo text, nombre text, total bigint, activos bigint, resueltos bigint,
  promedio_dias numeric, linea_base_dias numeric, plazo_dias integer
)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not (public.es_interno() or public.es_admin()) then
    raise exception 'Sin permiso' using errcode = '42501';
  end if;
  return query
  select t.id, t.codigo, t.nombre,
         count(e.id),
         count(e.id) filter (where e.estado in ('iniciado', 'en_tramite', 'observado')),
         count(e.id) filter (where e.resuelto_at is not null),
         round((avg(extract(epoch from (e.resuelto_at - e.created_at)) / 86400.0) filter (where e.resuelto_at is not null))::numeric, 1),
         t.linea_base_dias, t.plazo_dias
  from public.tipos_tramite t
  left join public.expedientes e on e.tipo_tramite_id = t.id
  where t.activo
  group by t.id
  order by count(e.id) desc, t.nombre;
end;
$$;

create or replace function public.metricas_carga()
returns table (perfil_id uuid, nombre text, area text, asignados bigint, fojas_30d bigint)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not (public.es_interno() or public.es_admin()) then
    raise exception 'Sin permiso' using errcode = '42501';
  end if;
  return query
  select p.id, trim(p.nombre || ' ' || p.apellido),
         string_agg(distinct a.nombre, ', '),
         (select count(*) from public.expedientes e where e.asignado_a = p.id and e.estado in ('iniciado', 'en_tramite', 'observado')),
         (select count(*) from public.actuaciones x where x.firmada_por = p.id and x.firmada_at >= now() - interval '30 days')
  from public.perfiles p
  join public.miembros_area m on m.perfil_id = p.id
  join public.areas a on a.id = m.area_id
  group by p.id
  order by 4 desc, 5 desc;
end;
$$;

create or replace function public.metricas_serie(p_dias integer default 30)
returns table (dia date, ingresados bigint, resueltos bigint)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not (public.es_interno() or public.es_admin()) then
    raise exception 'Sin permiso' using errcode = '42501';
  end if;
  return query
  with dias as (
    select generate_series(
      (now() at time zone 'America/Argentina/Tucuman')::date - (least(greatest(p_dias, 1), 365) - 1),
      (now() at time zone 'America/Argentina/Tucuman')::date,
      interval '1 day'
    )::date as dia
  )
  select d.dia,
         (select count(*) from public.expedientes e where (e.created_at at time zone 'America/Argentina/Tucuman')::date = d.dia),
         (select count(*) from public.expedientes e where (e.resuelto_at at time zone 'America/Argentina/Tucuman')::date = d.dia)
  from dias d
  order by d.dia;
end;
$$;

-- ---------------------------------------------------------------------
-- Privilegios de ejecución
-- ---------------------------------------------------------------------
revoke execute on function
  public.siguiente_numero(text), public.hash_actuacion(public.actuaciones),
  public._sellar_actuacion(uuid, uuid),
  public._incorporar_actuacion(uuid, public.tipo_actuacion, text, text, jsonb, uuid, uuid),
  public.auditar(), public.proteger_actuacion_firmada(), public.solo_agregar()
from public, anon, authenticated;

grant execute on function
  public.crear_expediente(text, text, jsonb),
  public.registrar_documentos(uuid, jsonb),
  public.tomar_expediente(uuid),
  public.pasar_expediente(uuid, uuid, uuid, text),
  public.firmar_actuacion(uuid),
  public.observar_expediente(uuid, text),
  public.subsanar_expediente(uuid, text),
  public.archivar_expediente(uuid, text),
  public.fijar_prioridad(uuid, public.prioridad_expediente, text),
  public.verificar_integridad(uuid),
  public.metricas_resumen(),
  public.metricas_por_tipo(),
  public.metricas_carga(),
  public.metricas_serie(integer)
to authenticated;

-- ---------------------------------------------------------------------
-- Tiempo real: bandejas y seguimiento se actualizan solos
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table
  public.expedientes, public.actuaciones, public.movimientos, public.notificaciones;
