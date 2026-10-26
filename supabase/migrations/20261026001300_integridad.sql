-- =====================================================================
-- Integridad del expediente y privacidad (huecos relevados el 26/10/2026)
--
-- Cada regla cierra un hueco que confirmaron las pruebas de
-- supabase/tests/07_pendientes.test.sql:
--   1. Un expediente resuelto, archivado o rechazado no se observa (se reabría).
--   2. Archivar sin resolución firmada requiere rol jefe o firmante.
--   3. La resolución se firma solo en el paso de firma del circuito, una sola
--      vez por expediente, con el sentido explícito (antes salía aprobada por
--      defecto) y nunca en un expediente cerrado.
--   4. Lo que se firma es lo que se leyó: el borrador queda atado al área donde
--      se redactó. Cuando el expediente pasa a otra área (por ejemplo, a la
--      Dirección para la firma), su autor ya no lo edita ni lo borra.
--   5. Registrar otra firma o revocarla pide la clave actual; los intentos
--      fallidos cuentan para el bloqueo. Probar la firma tiene un límite.
--   6. Privacidad: el personal interno lee el perfil de quienes tienen un
--      trámite que puede ver (no el de todos los agentes), y lo que redactó la
--      IA respeta la reserva del expediente.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Observar solo expedientes en curso
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
  if v_exp.estado not in ('iniciado', 'en_tramite', 'observado') then
    raise exception 'Solo se observan expedientes en trámite: este ya está resuelto o cerrado';
  end if;

  perform public._incorporar_actuacion(v_exp.id, 'observacion', 'Observación al agente', trim(p_motivo), '{}'::jsonb, v_uid, v_exp.area_actual_id);

  update public.expedientes set estado = 'observado' where id = v_exp.id returning * into v_exp;
  return v_exp;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Archivar sin resolución: solo jefatura o firmante del área
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
  -- Con la resolución firmada, archivar es el cierre normal del circuito. Sin ella
  -- (desistimiento, error de carga) lo decide la jefatura o quien firma en el área.
  if v_exp.estado <> 'resuelto' and not public.es_admin()
     and coalesce(public.rol_en_area(v_exp.area_actual_id)::text, '') not in ('jefe', 'firmante') then
    raise exception 'Archivar un expediente sin resolución requiere rol jefe o firmante' using errcode = '42501';
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
-- 3. Firmar: expediente abierto; la resolución, en su paso, una vez y con sentido
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
  if v_exp.estado in ('archivado', 'rechazado') then
    raise exception 'El expediente está cerrado: no se firman actuaciones';
  end if;
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

  if v_act.tipo = 'resolucion' then
    if (select p.accion from public.pasos_circuito p
         where p.tipo_tramite_id = v_exp.tipo_tramite_id and p.orden = v_exp.paso_actual) is distinct from 'firma' then
      raise exception 'La resolución se firma en el paso de firma del circuito' using errcode = '42501';
    end if;
    if exists (select 1 from public.actuaciones a
                where a.expediente_id = v_exp.id and a.tipo = 'resolucion' and a.estado = 'firmada') then
      raise exception 'El expediente ya tiene su resolución firmada';
    end if;
    if coalesce(v_act.datos ->> 'sentido', '') not in ('hace_lugar', 'rechaza') then
      raise exception 'Indicá si la resolución hace lugar o no a lo solicitado' using errcode = '22023';
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
      perform public._firma_intento_fallido(v_firma.id, v_uid, p_actuacion, v_motivo, (v_ev -> 'forma' ->> 'puntaje')::numeric, p_trazo, p_dispositivo);
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
-- 4. El borrador queda atado al área donde se redacta
-- ---------------------------------------------------------------------
-- La app inserta borradores sin área: se completa con el área que tiene el expediente
-- cuando quien redacta es de esa área o de la administración (las fojas del agente quedan
-- sin área, como antes).
create or replace function public.fijar_area_borrador()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_area uuid;
begin
  if new.estado = 'borrador' and new.area_id is null then
    select e.area_actual_id into v_area from public.expedientes e where e.id = new.expediente_id;
    if public.es_miembro_area(v_area) or public.es_admin() then
      new.area_id := v_area;
    end if;
  end if;
  return new;
end;
$$;

create trigger actuaciones_area_borrador
  before insert on public.actuaciones
  for each row execute function public.fijar_area_borrador();

-- Borradores que ya existían: quedan en el área que tiene hoy el expediente.
update public.actuaciones a
   set area_id = e.area_actual_id
  from public.expedientes e
 where e.id = a.expediente_id and a.estado = 'borrador' and a.area_id is null;

-- ¿El expediente está en el área donde se redactó el borrador?
create or replace function public.borrador_en_su_area(p_expediente uuid, p_area uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.expedientes e where e.id = p_expediente and e.area_actual_id = p_area);
$$;

-- ¿Quien escribe es del área que tiene el expediente?
create or replace function public.expediente_en_mi_area(p_expediente uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.expedientes e
    join public.miembros_area m on m.area_id = e.area_actual_id and m.perfil_id = (select auth.uid())
    where e.id = p_expediente
  );
$$;

drop policy if exists actuaciones_crear_borrador on public.actuaciones;
create policy actuaciones_crear_borrador on public.actuaciones
  for insert to authenticated
  with check (
    autor_id = (select auth.uid())
    and estado = 'borrador'
    and foja is null and firmada_por is null and firmada_at is null and hash is null
    and (public.expediente_en_mi_area(expediente_id) or (select public.es_admin()))
  );

drop policy if exists actuaciones_editar_borrador on public.actuaciones;
create policy actuaciones_editar_borrador on public.actuaciones
  for update to authenticated
  using (autor_id = (select auth.uid()) and estado = 'borrador' and public.borrador_en_su_area(expediente_id, area_id))
  with check (
    autor_id = (select auth.uid())
    and estado = 'borrador'
    and foja is null and firmada_por is null and firmada_at is null and hash is null
    and public.borrador_en_su_area(expediente_id, area_id)
  );

drop policy if exists actuaciones_borrar_borrador on public.actuaciones;
create policy actuaciones_borrar_borrador on public.actuaciones
  for delete to authenticated
  using (autor_id = (select auth.uid()) and estado = 'borrador' and public.borrador_en_su_area(expediente_id, area_id));

-- ---------------------------------------------------------------------
-- 5. Firma registrada: la clave actual para cambiarla o revocarla
-- ---------------------------------------------------------------------
create or replace function public._firma_intento_fallido(
  p_registro    uuid,
  p_perfil      uuid,
  p_actuacion   uuid,
  p_motivo      text,
  p_puntaje     numeric default null,
  p_crudo       jsonb default null,
  p_dispositivo text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.firmas_registradas
     set intentos_fallidos = case when intentos_fallidos + 1 >= 5 then 0 else intentos_fallidos + 1 end,
         bloqueada_hasta  = case when intentos_fallidos + 1 >= 5 then now() + interval '15 minutes' else bloqueada_hasta end
   where id = p_registro;
  insert into public.intentos_firma (perfil_id, actuacion_id, motivo, puntaje, crudo, dispositivo)
  values (p_perfil, p_actuacion, p_motivo, p_puntaje, p_crudo, p_dispositivo);
end;
$$;

-- Comprueba la clave de la firma activa. Una clave equivocada cuenta como intento fallido
-- (por eso devuelve false en vez de lanzar un error, que desharía el contador).
create or replace function public._firma_clave_actual(p_clave text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_firma public.firmas_registradas;
begin
  select * into v_firma from public.firmas_registradas where perfil_id = auth.uid() and activa for update;
  if not found then
    return true;
  end if;
  if v_firma.bloqueada_hasta is not null and v_firma.bloqueada_hasta > now() then
    raise exception 'Firma bloqueada por intentos fallidos. Probá de nuevo después de las %.',
      to_char(v_firma.bloqueada_hasta at time zone 'America/Argentina/Tucuman', 'HH24:MI') using errcode = '42501';
  end if;
  if p_clave is null then
    raise exception 'Ingresá tu clave de firma actual' using errcode = '42501';
  end if;
  if extensions.crypt(p_clave, v_firma.pin_hash) <> v_firma.pin_hash then
    perform public._firma_intento_fallido(v_firma.id, auth.uid(), null, 'clave');
    return false;
  end if;
  return true;
end;
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
  v_p       jsonb[];
  v_forma   float8 := 0;
  v_ritmo   float8 := 0;
  i integer; j integer;
begin
  if v_uid is null or not public.es_interno() then
    raise exception 'Solo el personal de Capital Humano registra firma' using errcode = '42501';
  end if;
  -- Con una firma activa, reemplazarla exige su clave: una sesión robada no alcanza.
  if not public._firma_clave_actual(p_clave_anterior) then
    return jsonb_build_object('error', 'La clave de firma actual no es correcta');
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

  update public.firmas_registradas set activa = false, revocada_at = now() where perfil_id = v_uid and activa;

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
                             'variacion_forma', round(v_forma::numeric, 4), 'variacion_ritmo', round(v_ritmo::numeric, 4)));
  return jsonb_build_object('id', v_id);
end;
$$;

-- Revocar también pide la clave (si no, revocar y registrar otra salteaba la regla de arriba).
-- Si la persona olvidó su clave, la revoca la administración.
drop function if exists public.revocar_firma();

create or replace function public.revocar_firma(p_clave text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  if not public._firma_clave_actual(p_clave) then
    return false;
  end if;
  update public.firmas_registradas
     set activa = false, revocada_at = now()
   where perfil_id = v_uid and activa
  returning id into v_id;
  if v_id is not null then
    insert into public.auditoria (tabla, registro_id, accion, actor_id, datos)
    values ('firmas_registradas', v_id, 'revocacion', v_uid, '{}'::jsonb);
  end if;
  return true;
end;
$$;

-- Probar la firma: hasta 10 pruebas cada 10 minutos (devuelve puntaje y umbral; sin límite
-- servía para calibrar una imitación).
create or replace function public.probar_firma(p_trazo jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_firma  public.firmas_registradas;
  v_patron jsonb;
  v_ev     jsonb;
begin
  select * into v_firma from public.firmas_registradas where perfil_id = v_uid and activa and version >= 2;
  if not found then
    raise exception 'Primero registrá tu firma' using errcode = '22023';
  end if;
  if (select count(*) from public.auditoria a
       where a.actor_id = v_uid and a.accion = 'prueba_firma' and a.created_at > now() - interval '10 minutes') >= 10 then
    raise exception 'Probaste tu firma muchas veces seguidas. Esperá unos minutos.' using errcode = '42501';
  end if;
  v_patron := public._firma_patron(p_trazo);
  if v_patron is null then
    raise exception 'Dibujá tu firma completa' using errcode = '22023';
  end if;
  v_ev := public._firma_evaluar(v_patron, v_firma);
  insert into public.auditoria (tabla, registro_id, accion, actor_id, datos)
  values ('firmas_registradas', v_firma.id, 'prueba_firma', v_uid, v_ev);
  return v_ev;
end;
$$;

-- ---------------------------------------------------------------------
-- 6. Privacidad
-- ---------------------------------------------------------------------
-- Perfiles: el propio; el personal interno ve al resto del personal y a quienes tienen un
-- trámite que puede ver (la subconsulta pasa por la RLS de expedientes). Bonificaciones,
-- Liquidación y Dirección ven además a quienes tienen novedades de haberes (la planilla para
-- Civitas lleva legajo y CUIL, también de trámites reservados).
drop policy if exists perfiles_lectura on public.perfiles;
create policy perfiles_lectura on public.perfiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or (select public.es_admin())
    or (
      (select public.es_interno())
      and (
        exists (select 1 from public.miembros_area m where m.perfil_id = perfiles.id)
        or exists (select 1 from public.expedientes e where e.iniciador_id = perfiles.id)
      )
    )
    or ((select public.gestiona_novedades()) and exists (select 1 from public.novedades_haberes n where n.perfil_id = perfiles.id))
  );

-- Lo que redactó la IA se ve solo si se puede ver el expediente (reservados incluidos).
drop policy if exists ia_generaciones_lectura on public.ia_generaciones;
create policy ia_generaciones_lectura on public.ia_generaciones
  for select to authenticated
  using (
    ((select public.es_interno()) and tipo <> 'asistente' and (expediente_id is null or public.puede_ver_expediente(expediente_id)))
    or solicitado_por = (select auth.uid())
  );

-- ---------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------
revoke execute on function public.fijar_area_borrador() from public, anon, authenticated;
revoke execute on function public._firma_intento_fallido(uuid, uuid, uuid, text, numeric, jsonb, text) from public, anon, authenticated;
revoke execute on function public._firma_clave_actual(text) from public, anon, authenticated;
revoke execute on function public.borrador_en_su_area(uuid, uuid), public.expediente_en_mi_area(uuid) from public, anon;
grant execute on function public.borrador_en_su_area(uuid, uuid), public.expediente_en_mi_area(uuid) to authenticated;
revoke execute on function public.registrar_firma(text, text, text, jsonb, text, text, text) from public, anon;
grant execute on function public.registrar_firma(text, text, text, jsonb, text, text, text) to authenticated;
revoke execute on function public.revocar_firma(text) from public, anon;
grant execute on function public.revocar_firma(text) to authenticated;
