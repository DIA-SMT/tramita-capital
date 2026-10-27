-- =====================================================================
-- Huecos de la base relevados el 26/10/2026 (supabase/tests/07_pendientes)
--
-- 1. Un expediente resuelto o archivado no se observa (hoy se reabre).
-- 2. Sin resolución firmada, un operador no archiva: lo hace un responsable
--    del área (dictaminante, firmante o jefe) y con el motivo.
-- 3. Una resolución se firma solo con sentido explícito, en el paso de firma
--    del circuito, una sola vez por expediente y nunca en uno cerrado.
-- 4. El proyecto no se edita ni se borra cuando el expediente ya no está en
--    el área de su autor: lo que se firma es lo que se leyó.
-- 5. Registrar otra firma pide la clave de la anterior, aunque se haya
--    revocado. Si se olvidó, Administración libera el registro.
-- 6. El personal interno lee el perfil completo de un agente solo si su área
--    tiene, tuvo o liquida un trámite de esa persona.
-- 7. Lo que redactó la IA en un expediente lo lee solo quien puede ver el
--    expediente.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Observar: solo expedientes abiertos
-- ---------------------------------------------------------------------
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
  if not found then
    raise exception 'Expediente inexistente';
  end if;
  if not (public.es_miembro_area(v_exp.area_actual_id) or public.es_admin()) then
    raise exception 'Solo el área que tiene el expediente puede observarlo' using errcode = '42501';
  end if;
  if v_exp.estado in ('resuelto', 'archivado', 'rechazado') then
    raise exception 'El expediente ya está resuelto: no se puede observar';
  end if;

  perform public._incorporar_actuacion(v_exp.id, 'observacion', 'Observación al agente', trim(p_motivo), '{}'::jsonb, v_uid, v_exp.area_actual_id);

  update public.expedientes set estado = 'observado' where id = v_exp.id returning * into v_exp;
  return v_exp;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Archivar: sin resolución, solo un responsable del área y con motivo
-- ---------------------------------------------------------------------
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
  if not found then
    raise exception 'Expediente inexistente';
  end if;
  if not (public.es_miembro_area(v_exp.area_actual_id) or public.es_admin()) then
    raise exception 'Solo el área que tiene el expediente puede archivarlo' using errcode = '42501';
  end if;
  if v_exp.estado in ('archivado', 'rechazado') then
    raise exception 'El expediente ya está cerrado';
  end if;
  -- Con la resolución firmada, archivar es el cierre del circuito. Sin ella, es cerrar el trámite sin decidirlo.
  if v_exp.estado <> 'resuelto' then
    if not (public.es_admin() or coalesce(public.rol_en_area(v_exp.area_actual_id)::text, '') in ('dictaminante', 'firmante', 'jefe')) then
      raise exception 'Un trámite sin resolución lo archiva un responsable del área (jefe, firmante o dictaminante)' using errcode = '42501';
    end if;
    if coalesce(trim(p_motivo), '') = '' then
      raise exception 'Indicá por qué se archiva sin resolución' using errcode = '22023';
    end if;
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
-- 3. Firmar: expediente abierto; la resolución, con sentido, en el paso de
--    firma y una sola vez. Las reglas se controlan antes de verificar la
--    firma, así que no cuentan como intento fallido.
-- ---------------------------------------------------------------------
create or replace function public.firmar_actuacion(
  p_actuacion   uuid,
  p_clave       text default null,
  p_trazo       jsonb default null,
  p_dispositivo text default null,
  p_tinta       text default null,
  p_contexto    jsonb default '{}'
)
returns public.actuaciones
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_act     public.actuaciones;
  v_exp     public.expedientes;
  v_rol     public.rol_area;
  v_firma   public.firmas_registradas;
  v_perfil  public.perfiles;
  v_area    text;
  v_accion  public.accion_paso;
  v_num     text;
  v_fecha   text;
  v_sello   jsonb;
  v_patron  jsonb;
  v_ev      jsonb;
  v_motivo  text;
  v_sha     text;
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
  if v_exp.estado in ('archivado', 'rechazado') then
    raise exception 'El expediente está cerrado: no se firman actuaciones';
  end if;

  if v_act.tipo = 'resolucion' then
    select p.accion into v_accion
    from public.pasos_circuito p
    where p.tipo_tramite_id = v_exp.tipo_tramite_id and p.orden = v_exp.paso_actual;
    if v_accion is distinct from 'firma' then
      raise exception 'La resolución se firma en el paso de firma del circuito' using errcode = '42501';
    end if;
    if exists (
      select 1 from public.actuaciones a
      where a.expediente_id = v_exp.id and a.tipo = 'resolucion' and a.estado = 'firmada'
    ) then
      raise exception 'El expediente ya tiene una resolución firmada';
    end if;
    if coalesce(v_act.datos ->> 'sentido', '') not in ('hace_lugar', 'rechaza') then
      raise exception 'Indicá si la resolución hace lugar o rechaza antes de firmarla' using errcode = '22023';
    end if;
  end if;

  select * into v_perfil from public.perfiles where id = v_uid;
  select nombre into v_area from public.areas where id = v_exp.area_actual_id;

  if v_act.tipo = 'resolucion' then
    select * into v_firma from public.firmas_registradas where perfil_id = v_uid and activa and version >= 2 for update;
    if not found then
      raise exception 'Para firmar resoluciones registrá tu firma en "Mi firma".' using errcode = '42501';
    end if;
    if v_firma.bloqueada_hasta is not null and v_firma.bloqueada_hasta > now() then
      raise exception 'Firma bloqueada por intentos fallidos. Probá de nuevo después de las %.',
        to_char(v_firma.bloqueada_hasta at time zone 'America/Argentina/Tucuman', 'HH24:MI') using errcode = '42501';
    end if;
    -- Datos incompletos: no cuentan como intento.
    v_patron := public._firma_patron(p_trazo);
    if p_clave is null or v_patron is null then
      raise exception 'Para firmar la resolución dibujá tu firma completa e ingresá tu clave.' using errcode = '22023';
    end if;
    if coalesce(p_tinta, '') not in ('#1e3a8a', '#111827') or coalesce(p_dispositivo, '') not in ('pen', 'touch', 'mouse', 'desconocido')
       or coalesce(jsonb_typeof(p_contexto), 'object') <> 'object' or char_length(coalesce(p_contexto, '{}')::text) > 2000 then
      raise exception 'Datos de la firma inválidos' using errcode = '22023';
    end if;

    if extensions.crypt(p_clave, v_firma.pin_hash) <> v_firma.pin_hash then
      v_motivo := 'clave';
    else
      v_ev := public._firma_evaluar(v_patron, v_firma);
      if (v_ev ->> 'copia')::boolean then
        v_motivo := 'copia';
      elsif not (v_ev ->> 'coincide')::boolean then
        v_motivo := 'trazo';
      end if;
    end if;

    if v_motivo is not null then
      update public.firmas_registradas
         set intentos_fallidos = case when intentos_fallidos + 1 >= 5 then 0 else intentos_fallidos + 1 end,
             bloqueada_hasta  = case when intentos_fallidos + 1 >= 5 then now() + interval '15 minutes' else bloqueada_hasta end
       where id = v_firma.id;
      insert into public.intentos_firma (perfil_id, actuacion_id, motivo, puntaje, crudo, dispositivo)
      values (v_uid, p_actuacion, v_motivo, (v_ev -> 'forma' ->> 'puntaje')::numeric, p_trazo, p_dispositivo);
      insert into public.auditoria (tabla, registro_id, accion, actor_id, datos)
      values ('firmas_registradas', v_firma.id, 'firma_rechazada', v_uid,
              jsonb_build_object('actuacion', p_actuacion, 'motivo', v_motivo, 'evaluacion', v_ev));
      return null;
    end if;

    update public.firmas_registradas set intentos_fallidos = 0, bloqueada_hasta = null where id = v_firma.id;
    v_sha := encode(sha256(convert_to(p_trazo::text, 'UTF8')), 'hex');
    v_sello := jsonb_build_object(
      'tipo', 'olografa',
      'version', 2,
      'registro_id', v_firma.id,
      'aclaracion', v_firma.aclaracion,
      'cargo', v_firma.cargo,
      'visible', public._firma_visible(p_trazo),
      'tinta', p_tinta,
      'dispositivo', p_dispositivo,
      'forma', v_ev -> 'forma',
      'ritmo', v_ev -> 'ritmo',
      'evidencia_sha256', v_sha
    );
  else
    v_sello := jsonb_build_object(
      'tipo', 'electronica',
      'aclaracion', nullif(trim(concat_ws(' ', v_perfil.nombre, v_perfil.apellido)), ''),
      'cargo', v_area
    );
  end if;

  -- Firma y protocolo solo los escribe el sistema.
  update public.actuaciones
     set area_id = coalesce(area_id, v_exp.area_actual_id),
         datos   = (datos - 'firma' - 'protocolo') || jsonb_build_object('firma', v_sello)
   where id = v_act.id;

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
    -- Evidencia pericial: trazo crudo, patrón y contexto, ligados a la foja por su huella.
    insert into public.evidencias_firma (actuacion_id, perfil_id, registro_id, crudo, patron, dispositivo, contexto, sha256)
    values (v_act.id, v_uid, v_firma.id, p_trazo, v_patron, p_dispositivo, coalesce(p_contexto, '{}'), v_sha);

    update public.expedientes
       set estado = 'resuelto',
           resuelto_at = now(),
           resultado = case when v_act.datos ->> 'sentido' = 'rechaza' then 'rechazado' else 'aprobado' end
     where id = v_exp.id;
    insert into public.legajo_documentos (perfil_id, expediente_id, actuacion_id, tipo, titulo)
    values (v_exp.iniciador_id, v_exp.id, v_act.id, 'resolucion', v_act.titulo);
  end if;

  if v_act.ia_generacion_id is not null then
    update public.ia_generaciones set aceptada = true where id = v_act.ia_generacion_id;
  end if;

  return v_act;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Borradores: su autor los edita o borra mientras el expediente esté
--    abierto y en un área suya. Al pasar a la Dirección, el proyecto queda fijo.
-- ---------------------------------------------------------------------
create or replace function public.expediente_en_mis_areas(p_expediente uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.expedientes e
    where e.id = p_expediente
      and e.estado not in ('archivado', 'rechazado')
      and (public.es_miembro_area(e.area_actual_id) or public.es_admin())
  );
$$;

drop policy if exists actuaciones_editar_borrador on public.actuaciones;
create policy actuaciones_editar_borrador on public.actuaciones
  for update to authenticated
  using (autor_id = (select auth.uid()) and estado = 'borrador' and public.expediente_en_mis_areas(expediente_id))
  with check (
    autor_id = (select auth.uid())
    and estado = 'borrador'
    and foja is null and firmada_por is null and firmada_at is null and hash is null
    and public.expediente_en_mis_areas(expediente_id)
  );

drop policy if exists actuaciones_borrar_borrador on public.actuaciones;
create policy actuaciones_borrar_borrador on public.actuaciones
  for delete to authenticated
  using (autor_id = (select auth.uid()) and estado = 'borrador' and public.expediente_en_mis_areas(expediente_id));

-- ---------------------------------------------------------------------
-- 5. Firma registrada: cambiarla pide la clave de la anterior
-- ---------------------------------------------------------------------
-- Quién revocó cada firma: la persona (hace falta su clave para registrar otra) o Administración (libera el registro).
alter table public.firmas_registradas add column if not exists revocada_por uuid references public.perfiles (id);

-- Última firma de la persona que todavía exige su clave para registrar otra (null si no hay).
create or replace function public._firma_anterior(p_perfil uuid)
returns public.firmas_registradas
language sql stable security definer
set search_path = ''
as $$
  select f.*
  from public.firmas_registradas f
  where f.id = (
    select u.id from public.firmas_registradas u
    where u.perfil_id = p_perfil and u.version >= 2
    order by u.created_at desc
    limit 1
  )
    and (f.activa or f.revocada_por is null or f.revocada_por = f.perfil_id);
$$;

create or replace function public.firma_requiere_clave_anterior()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select (public._firma_anterior((select auth.uid()))).id is not null;
$$;

drop function if exists public.registrar_firma(text, text, text, jsonb, text, text);

create or replace function public.registrar_firma(
  p_aclaracion     text,
  p_cargo          text,
  p_clave          text,
  p_muestras       jsonb,
  p_dispositivo    text,
  p_tinta          text,
  p_clave_anterior text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_id      uuid;
  v_ant     public.firmas_registradas;
  v_p       jsonb[];
  v_forma   float8 := 0;
  v_ritmo   float8 := 0;
  i integer; j integer;
begin
  if v_uid is null or not public.es_interno() then
    raise exception 'Solo el personal de Capital Humano registra firma' using errcode = '42501';
  end if;

  -- Con una firma anterior (activa o revocada por la persona), cambiarla pide su clave.
  v_ant := public._firma_anterior(v_uid);
  if v_ant.id is not null then
    if v_ant.bloqueada_hasta is not null and v_ant.bloqueada_hasta > now() then
      raise exception 'Firma bloqueada por intentos fallidos. Probá de nuevo después de las %.',
        to_char(v_ant.bloqueada_hasta at time zone 'America/Argentina/Tucuman', 'HH24:MI') using errcode = '42501';
    end if;
    if coalesce(p_clave_anterior, '') = '' then
      raise exception 'Para registrar otra firma ingresá tu clave de firma actual. Si no la recordás, pedile a Administración que libere el registro.' using errcode = '22023';
    end if;
    -- Clave equivocada: cuenta como intento fallido y se devuelve en lugar de lanzar un error (que desharía el contador).
    if extensions.crypt(p_clave_anterior, v_ant.pin_hash) <> v_ant.pin_hash then
      update public.firmas_registradas
         set intentos_fallidos = case when intentos_fallidos + 1 >= 5 then 0 else intentos_fallidos + 1 end,
             bloqueada_hasta  = case when intentos_fallidos + 1 >= 5 then now() + interval '15 minutes' else bloqueada_hasta end
       where id = v_ant.id;
      insert into public.intentos_firma (perfil_id, actuacion_id, motivo, dispositivo)
      values (v_uid, null, 'clave', p_dispositivo);
      insert into public.auditoria (tabla, registro_id, accion, actor_id, datos)
      values ('firmas_registradas', v_ant.id, 'registro_rechazado', v_uid, jsonb_build_object('motivo', 'clave'));
      return jsonb_build_object('rechazada', 'clave');
    end if;
  end if;

  if char_length(trim(coalesce(p_aclaracion, ''))) < 3 or char_length(trim(coalesce(p_cargo, ''))) < 3 then
    raise exception 'Completá la aclaración y el cargo' using errcode = '22023';
  end if;
  if coalesce(p_clave, '') !~ '^[0-9]{6}$' then
    raise exception 'La clave de firma tiene que tener 6 números' using errcode = '22023';
  end if;
  if p_clave ~ '^(.)\1{5}$' or p_clave in ('123456', '654321', '012345', '123123') then
    raise exception 'Elegí una clave menos previsible' using errcode = '22023';
  end if;
  if coalesce(p_tinta, '') not in ('#1e3a8a', '#111827') or coalesce(p_dispositivo, '') not in ('pen', 'touch', 'mouse', 'desconocido') then
    raise exception 'Datos de la firma inválidos' using errcode = '22023';
  end if;
  if coalesce(jsonb_typeof(p_muestras), '') <> 'array' then
    raise exception 'Dibujá tu firma tres veces para registrarla' using errcode = '22023';
  end if;
  if jsonb_array_length(p_muestras) <> 3 then
    raise exception 'Dibujá tu firma tres veces para registrarla' using errcode = '22023';
  end if;
  for i in 0..2 loop
    v_p[i + 1] := public._firma_patron(p_muestras -> i);
    if v_p[i + 1] is null then
      raise exception 'La muestra % es demasiado corta o no es válida. Dibujá la firma completa.', i + 1 using errcode = '22023';
    end if;
  end loop;
  for i in 1..3 loop
    for j in i + 1..3 loop
      v_forma := greatest(v_forma, public._dtw(public._patron_vector(v_p[i]), public._patron_vector(v_p[j]), 4, 12));
      v_ritmo := greatest(v_ritmo, public._dtw(public._patron_ritmo(v_p[i]), public._patron_ritmo(v_p[j]), 1, 3));
    end loop;
  end loop;
  if v_forma > 0.30 or v_ritmo > 0.10 then
    raise exception 'Tus tres firmas son muy distintas entre sí (en la forma o en el ritmo). Dibujalas de nuevo, con calma y del mismo modo.' using errcode = '22023';
  end if;

  update public.firmas_registradas set activa = false, revocada_at = now(), revocada_por = v_uid where perfil_id = v_uid and activa;

  insert into public.firmas_registradas
    (perfil_id, version, aclaracion, cargo, pin_hash, muestras, muestras_crudas, visible,
     umbral, umbral_ritmo, duracion_media, trazos_medio, largo_medio, dispositivo, tinta)
  values (
    v_uid, 2, trim(p_aclaracion), trim(p_cargo), extensions.crypt(p_clave, extensions.gen_salt('bf', 10)),
    to_jsonb(v_p), p_muestras, public._firma_visible(p_muestras -> 2),
    least(0.30, greatest(0.12, v_forma * 1.6)),
    least(0.08, greatest(0.035, v_ritmo * 1.8)),
    round(((v_p[1] ->> 'duracion')::numeric + (v_p[2] ->> 'duracion')::numeric + (v_p[3] ->> 'duracion')::numeric) / 3),
    ((v_p[1] ->> 'trazos')::numeric + (v_p[2] ->> 'trazos')::numeric + (v_p[3] ->> 'trazos')::numeric) / 3,
    ((v_p[1] ->> 'largo')::numeric + (v_p[2] ->> 'largo')::numeric + (v_p[3] ->> 'largo')::numeric) / 3,
    p_dispositivo, p_tinta
  )
  returning id into v_id;

  insert into public.auditoria (tabla, registro_id, accion, actor_id, datos)
  values ('firmas_registradas', v_id, 'registro', v_uid,
          jsonb_build_object('aclaracion', trim(p_aclaracion), 'cargo', trim(p_cargo), 'dispositivo', p_dispositivo,
                             'reemplaza', v_ant.id,
                             'variacion_forma', round(v_forma::numeric, 4), 'variacion_ritmo', round(v_ritmo::numeric, 4)));
  return jsonb_build_object('id', v_id);
end;
$$;

create or replace function public.revocar_firma()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  update public.firmas_registradas
     set activa = false, revocada_at = now(), revocada_por = v_uid
   where perfil_id = v_uid and activa
  returning id into v_id;
  if v_id is not null then
    insert into public.auditoria (tabla, registro_id, accion, actor_id, datos)
    values ('firmas_registradas', v_id, 'revocacion', v_uid, '{}'::jsonb);
  end if;
end;
$$;

-- Administración libera el registro de quien olvidó su clave: revoca su última firma y
-- la persona puede registrar otra sin la clave anterior.
create or replace function public.liberar_registro_firma(p_perfil uuid, p_motivo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_ant public.firmas_registradas;
begin
  if not public.es_admin() then
    raise exception 'Solo Administración libera el registro de una firma' using errcode = '42501';
  end if;
  if coalesce(trim(p_motivo), '') = '' then
    raise exception 'Indicá el motivo' using errcode = '22023';
  end if;
  v_ant := public._firma_anterior(p_perfil);
  if v_ant.id is null then
    return;
  end if;
  update public.firmas_registradas
     set activa = false, revocada_at = coalesce(revocada_at, now()), revocada_por = v_uid
   where id = v_ant.id;
  insert into public.auditoria (tabla, registro_id, accion, actor_id, datos)
  values ('firmas_registradas', v_ant.id, 'registro_liberado', v_uid, jsonb_build_object('perfil', p_perfil, 'motivo', trim(p_motivo)));
end;
$$;

-- ---------------------------------------------------------------------
-- 6. Perfiles: el agente, para las áreas que tienen, tuvieron o liquidan sus trámites
-- ---------------------------------------------------------------------
create or replace function public.puede_ver_perfil(p_perfil uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select p_perfil = (select auth.uid())
    or public.es_admin()
    or (
      public.es_interno()
      and (
        -- Personal de Capital Humano entre sí (pases y asignaciones).
        exists (select 1 from public.miembros_area m where m.perfil_id = p_perfil)
        or exists (
          select 1 from public.expedientes e
          where e.iniciador_id = p_perfil
            and public.puede_ver_expediente(e.id)
            and (
              e.asignado_a = (select auth.uid())
              or public.es_miembro_area(e.area_actual_id)
              or exists (
                select 1
                from public.movimientos mv
                join public.miembros_area ma on ma.perfil_id = (select auth.uid()) and ma.area_id in (mv.desde_area_id, mv.hacia_area_id)
                where mv.expediente_id = e.id
              )
            )
        )
        -- Liquidación (y quienes gestionan novedades) ven los datos de la planilla para Civitas.
        or (public.gestiona_novedades() and exists (select 1 from public.novedades_haberes n where n.perfil_id = p_perfil))
      )
    );
$$;

drop policy if exists perfiles_lectura on public.perfiles;
create policy perfiles_lectura on public.perfiles
  for select to authenticated
  using (public.puede_ver_perfil(id));

-- ---------------------------------------------------------------------
-- 7. IA: lo redactado en un expediente, solo para quien puede verlo
-- ---------------------------------------------------------------------
drop policy if exists ia_generaciones_lectura on public.ia_generaciones;
create policy ia_generaciones_lectura on public.ia_generaciones
  for select to authenticated
  using (
    (
      (select public.es_interno())
      and tipo <> 'asistente'
      and (expediente_id is null or public.puede_ver_expediente(expediente_id))
    )
    or solicitado_por = (select auth.uid())
  );

-- ---------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------
revoke execute on function public._firma_anterior(uuid) from public, anon, authenticated;
revoke execute on function
  public.expediente_en_mis_areas(uuid), public.firma_requiere_clave_anterior(), public.puede_ver_perfil(uuid),
  public.registrar_firma(text, text, text, jsonb, text, text, text), public.liberar_registro_firma(uuid, text)
  from public, anon;
grant execute on function
  public.expediente_en_mis_areas(uuid), public.firma_requiere_clave_anterior(), public.puede_ver_perfil(uuid),
  public.registrar_firma(text, text, text, jsonb, text, text, text), public.liberar_registro_firma(uuid, text)
  to authenticated;
