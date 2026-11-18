-- =====================================================================
-- Certificado de trabajo automático (relevamiento del 16/11/2026, 022).
--
-- Hoy: el Departamento de Registro controla que el agente esté activo, arma
-- el certificado, la Dirección lo firma y Registro lo entrega. El área pide
-- que, si el agente tiene «Liquida SÍ», el certificado se genere solo, con la
-- firma de la autoridad de la Dirección de Capital Humano, sin nota ni recibo.
--
-- Decisiones del 17/11/2026 (Dirección de IA):
-- - Firma autorizada: la directora autoriza una sola vez, con su clave de
--   firma, la emisión automática de un trámite. Cada certificado lleva su
--   firma registrada (el trazo de su registro), la constancia de la
--   autorización y el código de verificación. Es firma electrónica (Ley
--   25.506, art. 5). Si revoca la firma o registra otra, la autorización deja
--   de valer y hay que darla de nuevo.
-- - «Liquida SÍ» sale del perfil (perfiles.liquida, con la fecha del dato en
--   liquida_al), cargado desde Civitas: por ahora a mano (Registro o
--   Liquidación en la ficha del agente, o Registro al emitir); después, por
--   importación o API. Si el dato confirma que liquida y tiene menos de 31
--   días, el certificado sale al pedirlo. Si no, el pedido queda en Registro,
--   que controla en Civitas y lo emite con un clic (y el dato queda al día).
--
-- Además: el certificado es una foja nueva (tipo 'certificado') que solo crea
-- el sistema; se numera aparte (N/CT/AAAA); los trámites de emisión
-- automática no se cierran "por cumplimiento" sin el certificado.
--
-- 'certificado' se compara como texto en esta migración: un valor nuevo de un
-- enum no se puede usar en la misma transacción en que se agrega.
-- =====================================================================

alter type public.tipo_actuacion add value if not exists 'certificado';

-- ---------------------------------------------------------------------
-- 1. Datos de Civitas en el perfil
-- ---------------------------------------------------------------------
alter table public.perfiles
  add column if not exists liquida           boolean,
  add column if not exists liquida_al        date,
  add column if not exists fecha_ingreso     date,
  add column if not exists situacion_revista text check (situacion_revista is null or char_length(situacion_revista) <= 120);

comment on column public.perfiles.liquida is 'Civitas: «Liquida SÍ» y sin baja (true), no liquida (false) o sin dato (null). Lo cargan Registro o Liquidación.';
comment on column public.perfiles.liquida_al is 'Fecha en que se confirmó el dato de liquida en Civitas.';
comment on column public.perfiles.fecha_ingreso is 'Civitas: fecha de ingreso a la Municipalidad.';
comment on column public.perfiles.situacion_revista is 'Civitas: situación de revista (por ejemplo, planta permanente).';

-- Los agentes solo editan nombre, apellido y teléfono (grant por columna): estas columnas las escribe el sistema.

alter table public.tipos_tramite
  add column if not exists emision_automatica boolean not null default false;

comment on column public.tipos_tramite.emision_automatica is 'El sistema emite el documento del trámite con una firma autorizada (certificado de trabajo).';

-- ---------------------------------------------------------------------
-- 2. Autorizaciones de firma para la emisión automática
-- ---------------------------------------------------------------------
create table if not exists public.autorizaciones_firma (
  id              uuid primary key default gen_random_uuid(),
  perfil_id       uuid not null references public.perfiles (id) on delete cascade,
  registro_id     uuid not null references public.firmas_registradas (id),
  tipo_tramite_id uuid not null references public.tipos_tramite (id) on delete cascade,
  aclaracion      text not null,
  cargo           text not null,
  created_at      timestamptz not null default now(),
  revocada_at     timestamptz,
  revocada_por    uuid references public.perfiles (id),
  motivo          text
);
create unique index if not exists autorizaciones_firma_una_activa on public.autorizaciones_firma (tipo_tramite_id) where revocada_at is null;

alter table public.autorizaciones_firma enable row level security;
revoke all on public.autorizaciones_firma from anon, authenticated;
grant select on public.autorizaciones_firma to authenticated;
drop policy if exists autorizaciones_firma_lectura on public.autorizaciones_firma;
create policy autorizaciones_firma_lectura on public.autorizaciones_firma
  for select to authenticated
  using (perfil_id = (select auth.uid()) or (select public.es_admin()));

comment on table public.autorizaciones_firma is 'Quién autorizó con su firma registrada la emisión automática de un trámite. Una activa por trámite.';

/** ¿La persona firma resoluciones (firmante o jefe en un área que tiene paso de firma)? */
create or replace function public._firma_resoluciones(p_perfil uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.miembros_area m
     where m.perfil_id = p_perfil and m.rol in ('firmante', 'jefe')
       and exists (select 1 from public.pasos_circuito p where p.area_id = m.area_id and p.accion = 'firma')
  );
$$;

/**
 * La directora (o quien firme resoluciones) autoriza con su clave la emisión automática de un trámite.
 * Reemplaza la autorización anterior de ese trámite. Clave incorrecta: cuenta como intento fallido y
 * devuelve {rechazada: 'clave'} (no se lanza error, para que el intento quede registrado).
 */
create or replace function public.autorizar_emision_automatica(p_tipo text, p_clave text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_tipo  public.tipos_tramite;
  v_firma public.firmas_registradas;
  v_id    uuid;
begin
  select * into v_tipo from public.tipos_tramite where codigo = p_tipo and activo;
  if not found or not v_tipo.emision_automatica then
    raise exception 'Ese trámite no se emite de forma automática' using errcode = '22023';
  end if;
  if not public._firma_resoluciones(v_uid) then
    raise exception 'La emisión automática la autoriza quien firma resoluciones' using errcode = '42501';
  end if;
  select * into v_firma from public.firmas_registradas where perfil_id = v_uid and activa and version >= 2 for update;
  if not found then
    raise exception 'Primero registrá tu firma en "Mi firma".' using errcode = '42501';
  end if;
  if v_firma.bloqueada_hasta is not null and v_firma.bloqueada_hasta > now() then
    raise exception 'Firma bloqueada por intentos fallidos. Probá de nuevo después de las %.',
      to_char(v_firma.bloqueada_hasta at time zone 'America/Argentina/Tucuman', 'HH24:MI') using errcode = '42501';
  end if;
  if p_clave is null or extensions.crypt(p_clave, v_firma.pin_hash) <> v_firma.pin_hash then
    update public.firmas_registradas
       set intentos_fallidos = case when intentos_fallidos + 1 >= 5 then 0 else intentos_fallidos + 1 end,
           bloqueada_hasta  = case when intentos_fallidos + 1 >= 5 then now() + interval '15 minutes' else bloqueada_hasta end
     where id = v_firma.id;
    insert into public.intentos_firma (perfil_id, motivo) values (v_uid, 'clave');
    insert into public.auditoria (tabla, registro_id, accion, actor_id, datos)
    values ('firmas_registradas', v_firma.id, 'autorizacion_rechazada', v_uid, jsonb_build_object('tramite', p_tipo, 'motivo', 'clave'));
    return jsonb_build_object('rechazada', 'clave');
  end if;
  update public.firmas_registradas set intentos_fallidos = 0, bloqueada_hasta = null where id = v_firma.id;

  update public.autorizaciones_firma
     set revocada_at = now(), revocada_por = v_uid, motivo = 'Reemplazada por una nueva autorización'
   where tipo_tramite_id = v_tipo.id and revocada_at is null;
  insert into public.autorizaciones_firma (perfil_id, registro_id, tipo_tramite_id, aclaracion, cargo)
  values (v_uid, v_firma.id, v_tipo.id, v_firma.aclaracion, v_firma.cargo)
  returning id into v_id;
  insert into public.auditoria (tabla, registro_id, accion, actor_id, datos)
  values ('autorizaciones_firma', v_id, 'emision_automatica_autorizada', v_uid, jsonb_build_object('tramite', p_tipo));
  return jsonb_build_object('autorizacion_id', v_id);
end;
$$;

/** Quien autorizó (o Administración) deja sin efecto la emisión automática de un trámite. */
create or replace function public.revocar_emision_automatica(p_tipo text, p_motivo text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_aut public.autorizaciones_firma;
begin
  select a.* into v_aut
    from public.autorizaciones_firma a
    join public.tipos_tramite t on t.id = a.tipo_tramite_id
   where t.codigo = p_tipo and a.revocada_at is null
   for update of a;
  if not found then
    raise exception 'No hay una autorización vigente para ese trámite';
  end if;
  if v_aut.perfil_id <> v_uid and not public.es_admin() then
    raise exception 'La revoca quien la dio o Administración' using errcode = '42501';
  end if;
  update public.autorizaciones_firma
     set revocada_at = now(), revocada_por = v_uid, motivo = coalesce(nullif(trim(p_motivo), ''), 'Revocada')
   where id = v_aut.id;
  insert into public.auditoria (tabla, registro_id, accion, actor_id, datos)
  values ('autorizaciones_firma', v_aut.id, 'emision_automatica_revocada', v_uid, jsonb_build_object('tramite', p_tipo, 'motivo', p_motivo));
end;
$$;

/** Autorización vigente de un trámite: la ven todos (sin el registro de firma), para avisar si falta. */
create or replace function public.emision_automatica_autorizada(p_tipo text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select jsonb_build_object(
        'autorizada', true, 'aclaracion', a.aclaracion, 'cargo', a.cargo, 'desde', a.created_at,
        'propia', a.perfil_id = auth.uid())
       from public.autorizaciones_firma a
       join public.tipos_tramite t on t.id = a.tipo_tramite_id
       join public.firmas_registradas f on f.id = a.registro_id
      where t.codigo = p_tipo and a.revocada_at is null and f.activa
      limit 1),
    jsonb_build_object('autorizada', false)
  );
$$;

-- ---------------------------------------------------------------------
-- 3. Emisión del certificado
-- ---------------------------------------------------------------------
create or replace function public.siguiente_certificado()
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
  values (v_anio, 'CERT-DCH', 1)
  on conflict (anio, prefijo) do update set ultimo = c.ultimo + 1
  returning ultimo into v_n;
  return format('%s/CT/%s', v_n, v_anio);
end;
$$;

/** Días que vale el dato «Liquida SÍ» cargado desde Civitas para emitir sin control (a validar con el área). */
create or replace function public.vigencia_dato_liquida()
returns integer
language sql
immutable
as $$ select 31 $$;

/**
 * Emite el certificado de un expediente de emisión automática y lo cierra.
 * - El/la agente que lo inició: solo si su perfil confirma «Liquida SÍ» con un dato de menos de
 *   vigencia_dato_liquida() días y hay una autorización de firma vigente. Si no, devuelve
 *   {emitido: false, motivo} y el pedido sigue en Registro.
 * - Una persona del área que tiene el expediente (Registro): después de controlar en Civitas. Deja el dato
 *   «Liquida SÍ» al día en el perfil, y puede completar la fecha de ingreso y la situación de revista.
 * Devuelve {emitido: true, actuacion_id, numero}. Si ya se emitió, devuelve el mismo certificado.
 */
create or replace function public.emitir_certificado(
  p_expediente        uuid,
  p_fecha_ingreso     date default null,
  p_situacion_revista text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_hoy     date := (now() at time zone 'America/Argentina/Tucuman')::date;
  v_exp     public.expedientes;
  v_tipo    public.tipos_tramite;
  v_area    boolean;
  v_aut     public.autorizaciones_firma;
  v_firma   public.firmas_registradas;
  v_perfil  public.perfiles;
  v_modelo  text;
  v_num     text;
  v_fecha   text;
  v_texto   text;
  v_act     public.actuaciones;
  v_previo  public.actuaciones;
begin
  select * into v_exp from public.expedientes where id = p_expediente for update;
  if not found then
    raise exception 'Expediente inexistente';
  end if;
  select * into v_tipo from public.tipos_tramite where id = v_exp.tipo_tramite_id;
  if not v_tipo.emision_automatica then
    raise exception 'Este trámite no emite certificado' using errcode = '22023';
  end if;

  v_area := public.es_miembro_area(v_exp.area_actual_id) or public.es_admin();
  if not v_area and v_exp.iniciador_id is distinct from v_uid then
    raise exception 'Solo el/la agente que lo pidió o el área que tiene el expediente' using errcode = '42501';
  end if;

  select * into v_previo from public.actuaciones
   where expediente_id = v_exp.id and tipo::text = 'certificado' and estado = 'firmada'
   order by foja desc limit 1;
  if found then
    return jsonb_build_object('emitido', true, 'actuacion_id', v_previo.id, 'numero', v_previo.datos -> 'protocolo' ->> 'numero');
  end if;
  if v_exp.estado not in ('iniciado', 'en_tramite') then
    raise exception 'El expediente está cerrado o en otro estado: no se emite el certificado';
  end if;

  -- Firma autorizada vigente (con la firma registrada activa).
  select a.* into v_aut
    from public.autorizaciones_firma a
    join public.firmas_registradas f on f.id = a.registro_id and f.activa
   where a.tipo_tramite_id = v_tipo.id and a.revocada_at is null;
  if not found then
    if v_area then
      raise exception 'La Dirección todavía no autorizó la emisión automática de este certificado (en "Mi firma").' using errcode = '42501';
    end if;
    return jsonb_build_object('emitido', false, 'motivo', 'autorizacion');
  end if;
  select * into v_firma from public.firmas_registradas where id = v_aut.registro_id;

  if v_area then
    -- Registro controló en Civitas: el dato queda al día para el próximo pedido.
    update public.perfiles
       set liquida = true, liquida_al = v_hoy,
           fecha_ingreso = coalesce(p_fecha_ingreso, fecha_ingreso),
           situacion_revista = coalesce(nullif(left(trim(p_situacion_revista), 120), ''), situacion_revista)
     where id = v_exp.iniciador_id;
  end if;
  select * into v_perfil from public.perfiles where id = v_exp.iniciador_id;

  if not v_area then
    if v_perfil.liquida is not true or v_perfil.liquida_al is null or v_perfil.liquida_al < v_hoy - public.vigencia_dato_liquida() then
      return jsonb_build_object('emitido', false, 'motivo', 'liquida');
    end if;
    if nullif(trim(coalesce(v_perfil.legajo, '')), '') is null then
      return jsonb_build_object('emitido', false, 'motivo', 'datos');
    end if;
  end if;

  select cuerpo into v_modelo
    from public.plantillas
   where tipo_tramite_id = v_tipo.id and tipo_documento::text = 'certificado' and activa
   order by version desc limit 1;
  if v_modelo is null then
    raise exception 'El trámite no tiene modelo de certificado en el catálogo';
  end if;

  v_num := public.siguiente_certificado();
  v_fecha := to_char(v_hoy, 'DD/MM/YYYY');
  -- Los marcadores opcionales traen su propia puntuación: si falta el dato, desaparecen.
  v_texto := v_modelo;
  v_texto := replace(v_texto, '{{numero_certificado}}', v_num);
  v_texto := replace(v_texto, '{{fecha_certificado}}', v_fecha);
  v_texto := replace(v_texto, '{{agente}}', coalesce(nullif(trim(concat_ws(' ', v_perfil.nombre, v_perfil.apellido)), ''), '—'));
  v_texto := replace(v_texto, '{{cuil}}', coalesce(nullif(trim(v_perfil.cuil), ''), '—'));
  v_texto := replace(v_texto, '{{legajo}}', coalesce(nullif(trim(v_perfil.legajo), ''), '—'));
  v_texto := replace(v_texto, '{{desde_ingreso}}', coalesce(', desde el ' || to_char(v_perfil.fecha_ingreso, 'DD/MM/YYYY'), ''));
  v_texto := replace(v_texto, '{{situacion_revista}}', coalesce(', en ' || nullif(trim(v_perfil.situacion_revista), ''), ''));
  v_texto := replace(v_texto, '{{categoria}}', coalesce(', categoría ' || nullif(trim(v_perfil.categoria), ''), ''));
  v_texto := replace(v_texto, '{{dependencia}}', coalesce(', dependiente de ' || nullif(trim(v_perfil.dependencia), ''), ''));
  v_texto := replace(v_texto, '{{reparticion}}', coalesce(', con prestación de servicios en ' || nullif(trim(v_perfil.reparticion), ''), ''));
  v_texto := replace(v_texto, '{{presentar_ante}}', coalesce(nullif(left(trim(v_exp.datos ->> 'presentar_ante'), 200), ''), 'quien corresponda'));

  v_act := public._incorporar_actuacion(
    v_exp.id, 'certificado', 'Certificado de trabajo N.º ' || v_num, v_texto,
    jsonb_build_object(
      'firma', jsonb_build_object(
        'tipo', 'automatica',
        'autorizacion_id', v_aut.id,
        'autorizada_at', v_aut.created_at,
        'registro_id', v_aut.registro_id,
        'aclaracion', v_aut.aclaracion,
        'cargo', v_aut.cargo,
        'visible', v_firma.visible,
        'tinta', coalesce(v_firma.tinta, '#1e3a8a')
      ),
      'protocolo', jsonb_build_object('numero', v_num, 'fecha', v_fecha),
      'certificado', jsonb_build_object(
        'emision', case when v_area then 'registro' else 'automatica' end,
        'verificado_por', case when v_area then v_uid end,
        'liquida_al', v_perfil.liquida_al
      )
    ),
    v_aut.perfil_id, v_exp.area_actual_id
  );

  update public.expedientes
     set estado = 'archivado', resultado = 'aprobado', resuelto_at = now(), asignado_a = null
   where id = v_exp.id;
  insert into public.auditoria (tabla, registro_id, accion, actor_id, datos)
  values ('actuaciones', v_act.id, 'certificado_emitido', v_uid,
          jsonb_build_object('expediente', v_exp.id, 'numero', v_num, 'emision', case when v_area then 'registro' else 'automatica' end));

  return jsonb_build_object('emitido', true, 'actuacion_id', v_act.id, 'numero', v_num);
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Datos de Civitas a mano (hasta tener importación o API)
-- ---------------------------------------------------------------------
create or replace function public.actualizar_datos_civitas(
  p_perfil            uuid,
  p_liquida           boolean,
  p_fecha_ingreso     date default null,
  p_situacion_revista text default null
)
returns public.perfiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_perfil public.perfiles;
begin
  if not (public.es_admin() or exists (
    select 1 from public.miembros_area m join public.areas a on a.id = m.area_id
     where m.perfil_id = v_uid and a.codigo in ('REG', 'LIQ')
  )) then
    raise exception 'Los datos de Civitas los cargan Registro, Liquidación o Administración' using errcode = '42501';
  end if;
  if p_fecha_ingreso is not null and p_fecha_ingreso > current_date then
    raise exception 'La fecha de ingreso no puede ser futura' using errcode = '22023';
  end if;
  update public.perfiles
     set liquida = p_liquida,
         liquida_al = case when p_liquida is null then null else (now() at time zone 'America/Argentina/Tucuman')::date end,
         fecha_ingreso = p_fecha_ingreso,
         situacion_revista = nullif(left(trim(p_situacion_revista), 120), '')
   where id = p_perfil
  returning * into v_perfil;
  if not found then
    raise exception 'Perfil inexistente';
  end if;
  insert into public.auditoria (tabla, registro_id, accion, actor_id, datos)
  values ('perfiles', p_perfil, 'datos_civitas', v_uid,
          jsonb_build_object('liquida', p_liquida, 'fecha_ingreso', p_fecha_ingreso, 'situacion_revista', p_situacion_revista));
  return v_perfil;
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Resguardos
-- ---------------------------------------------------------------------
-- El certificado lo crea solo el sistema: nadie escribe un borrador de ese tipo.
drop policy if exists actuaciones_crear_borrador on public.actuaciones;
create policy actuaciones_crear_borrador on public.actuaciones
  for insert to authenticated
  with check (
    (select public.es_interno())
    and autor_id = (select auth.uid())
    and estado = 'borrador'
    and tipo::text <> 'certificado'
    and foja is null and firmada_por is null and firmada_at is null and hash is null
    and public.puede_ver_expediente(expediente_id)
  );

drop policy if exists actuaciones_editar_borrador on public.actuaciones;
create policy actuaciones_editar_borrador on public.actuaciones
  for update to authenticated
  using (autor_id = (select auth.uid()) and estado = 'borrador' and public.expediente_en_mis_areas(expediente_id))
  with check (
    autor_id = (select auth.uid())
    and estado = 'borrador'
    and tipo::text <> 'certificado'
    and foja is null and firmada_por is null and firmada_at is null and hash is null
    and public.expediente_en_mis_areas(expediente_id)
  );

-- Un trámite de emisión automática no se cierra "por cumplimiento": termina con el certificado
-- (emitir_certificado lo cierra) o lo archiva un responsable con motivo. Igual que la 001600, más esa regla.
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
  select * into v_tipo from public.tipos_tramite where id = v_exp.tipo_tramite_id;

  -- Cumplimiento: trámite sin resolución, en el último paso y en el área de ese paso (salvo los de emisión automática).
  v_cumplido := v_exp.estado in ('iniciado', 'en_tramite')
    and not v_tipo.emision_automatica
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

-- ---------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------
revoke all on function public._firma_resoluciones(uuid) from public, anon, authenticated;
revoke all on function public.siguiente_certificado() from public, anon, authenticated;
revoke all on function public.autorizar_emision_automatica(text, text) from public;
revoke all on function public.revocar_emision_automatica(text, text) from public;
revoke all on function public.emision_automatica_autorizada(text) from public;
revoke all on function public.emitir_certificado(uuid, date, text) from public;
revoke all on function public.actualizar_datos_civitas(uuid, boolean, date, text) from public;
grant execute on function public.autorizar_emision_automatica(text, text) to authenticated;
grant execute on function public.revocar_emision_automatica(text, text) to authenticated;
grant execute on function public.emision_automatica_autorizada(text) to authenticated;
grant execute on function public.emitir_certificado(uuid, date, text) to authenticated;
grant execute on function public.actualizar_datos_civitas(uuid, boolean, date, text) to authenticated;
grant execute on function public.vigencia_dato_liquida() to authenticated;
