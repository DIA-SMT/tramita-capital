-- =====================================================================
-- Seguridad: funciones de autorización, privilegios, RLS y Storage
-- Principio: los datos se LEEN con RLS; las transiciones del expediente
-- se HACEN solo por funciones RPC que validan quién puede qué.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Funciones de autorización (security definer para evitar recursión RLS)
-- ---------------------------------------------------------------------
create or replace function public.es_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce((select p.es_admin from public.perfiles p where p.id = (select auth.uid())), false);
$$;

create or replace function public.es_interno()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.miembros_area m where m.perfil_id = (select auth.uid()));
$$;

create or replace function public.es_miembro_area(p_area uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.miembros_area m
    where m.perfil_id = (select auth.uid()) and m.area_id = p_area
  );
$$;

create or replace function public.rol_en_area(p_area uuid)
returns public.rol_area
language sql stable security definer
set search_path = ''
as $$
  select m.rol from public.miembros_area m
  where m.perfil_id = (select auth.uid()) and m.area_id = p_area;
$$;

create or replace function public.ve_reservados()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.miembros_area m
    where m.perfil_id = (select auth.uid()) and m.ve_reservados
  );
$$;

create or replace function public.puede_ver_expediente(p_expediente uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.expedientes e
    where e.id = p_expediente
      and (
        e.iniciador_id = (select auth.uid())
        or public.es_admin()
        or (
          public.es_interno()
          and (
            not e.reservado
            or e.asignado_a = (select auth.uid())
            or public.ve_reservados()
            or public.es_miembro_area(e.area_actual_id)
          )
        )
      )
  );
$$;

create or replace function public.puede_subir_documento(p_expediente uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.expedientes e
    where e.id = p_expediente
      and (
        (e.iniciador_id = (select auth.uid()) and e.estado in ('iniciado', 'observado', 'en_tramite'))
        or (public.es_interno() and public.puede_ver_expediente(e.id))
      )
  );
$$;

-- Primer segmento de la ruta en Storage → id de expediente (o null si no es uuid)
create or replace function public.carpeta_expediente(p_nombre text)
returns uuid
language plpgsql immutable
set search_path = ''
as $$
begin
  return (storage.foldername(p_nombre))[1]::uuid;
exception when others then
  return null;
end;
$$;

-- Nombres visibles de personas (sin datos personales) para mostrar firmantes y autores
create or replace function public.perfiles_basicos(p_ids uuid[])
returns table (id uuid, nombre text, apellido text)
language sql stable security definer
set search_path = ''
as $$
  select p.id, p.nombre, p.apellido
  from public.perfiles p
  where p.id = any (p_ids)
    and (select auth.uid()) is not null;
$$;

-- ---------------------------------------------------------------------
-- Privilegios: nada para anon; lectura controlada por RLS para authenticated
-- ---------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke execute on functions from public, anon;

grant select on
  public.areas, public.perfiles, public.miembros_area, public.tipos_tramite,
  public.pasos_circuito, public.plantillas, public.expedientes, public.actuaciones,
  public.documentos, public.movimientos, public.ia_generaciones, public.notificaciones,
  public.auditoria
to authenticated;

grant insert, update, delete on public.actuaciones to authenticated;   -- solo borradores (RLS)
grant insert on public.documentos to authenticated;
grant insert on public.ia_generaciones to authenticated;
grant update (aceptada) on public.ia_generaciones to authenticated;
grant update (leida_at) on public.notificaciones to authenticated;
grant update (nombre, apellido, telefono) on public.perfiles to authenticated;

grant execute on function
  public.es_admin(), public.es_interno(), public.es_miembro_area(uuid), public.rol_en_area(uuid),
  public.ve_reservados(), public.puede_ver_expediente(uuid), public.puede_subir_documento(uuid),
  public.carpeta_expediente(text), public.perfiles_basicos(uuid[])
to authenticated;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.areas            enable row level security;
alter table public.perfiles         enable row level security;
alter table public.miembros_area    enable row level security;
alter table public.tipos_tramite    enable row level security;
alter table public.pasos_circuito   enable row level security;
alter table public.plantillas       enable row level security;
alter table public.contadores       enable row level security;
alter table public.expedientes      enable row level security;
alter table public.actuaciones      enable row level security;
alter table public.documentos       enable row level security;
alter table public.movimientos      enable row level security;
alter table public.ia_generaciones  enable row level security;
alter table public.notificaciones   enable row level security;
alter table public.auditoria        enable row level security;

-- Catálogos: lectura para cualquier usuario autenticado. Escritura solo por service role.
create policy areas_lectura on public.areas
  for select to authenticated using (true);
create policy tipos_tramite_lectura on public.tipos_tramite
  for select to authenticated using (activo or (select public.es_interno()));
create policy pasos_circuito_lectura on public.pasos_circuito
  for select to authenticated using (true);
create policy plantillas_lectura on public.plantillas
  for select to authenticated using ((select public.es_interno()));

-- Perfiles
create policy perfiles_lectura on public.perfiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.es_interno()) or (select public.es_admin()));
create policy perfiles_editar_propio on public.perfiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Membresías
create policy miembros_area_lectura on public.miembros_area
  for select to authenticated
  using (perfil_id = (select auth.uid()) or (select public.es_interno()));

-- Expedientes: solo lectura directa; las altas y cambios van por RPC.
create policy expedientes_lectura on public.expedientes
  for select to authenticated
  using (
    iniciador_id = (select auth.uid())
    or (select public.es_admin())
    or (
      (select public.es_interno())
      and (
        not reservado
        or asignado_a = (select auth.uid())
        or (select public.ve_reservados())
        or public.es_miembro_area(area_actual_id)
      )
    )
  );

-- Actuaciones: el agente ve las fojas firmadas de sus expedientes; el personal interno
-- también ve borradores. Los borradores los edita solo su autor.
create policy actuaciones_lectura on public.actuaciones
  for select to authenticated
  using (
    public.puede_ver_expediente(expediente_id)
    and (estado = 'firmada' or (select public.es_interno()))
  );
create policy actuaciones_crear_borrador on public.actuaciones
  for insert to authenticated
  with check (
    (select public.es_interno())
    and autor_id = (select auth.uid())
    and estado = 'borrador'
    and foja is null and firmada_por is null and firmada_at is null and hash is null
    and public.puede_ver_expediente(expediente_id)
  );
create policy actuaciones_editar_borrador on public.actuaciones
  for update to authenticated
  using (autor_id = (select auth.uid()) and estado = 'borrador')
  with check (
    autor_id = (select auth.uid())
    and estado = 'borrador'
    and foja is null and firmada_por is null and firmada_at is null and hash is null
  );
create policy actuaciones_borrar_borrador on public.actuaciones
  for delete to authenticated
  using (autor_id = (select auth.uid()) and estado = 'borrador');

-- Documentos
create policy documentos_lectura on public.documentos
  for select to authenticated
  using (public.puede_ver_expediente(expediente_id));
create policy documentos_subir on public.documentos
  for insert to authenticated
  with check (subido_por = (select auth.uid()) and public.puede_subir_documento(expediente_id));

-- Movimientos (hoja de ruta digital)
create policy movimientos_lectura on public.movimientos
  for select to authenticated
  using (public.puede_ver_expediente(expediente_id));

-- IA
create policy ia_generaciones_lectura on public.ia_generaciones
  for select to authenticated using ((select public.es_interno()));
create policy ia_generaciones_registrar on public.ia_generaciones
  for insert to authenticated
  with check ((select public.es_interno()) and solicitado_por = (select auth.uid()));
create policy ia_generaciones_aceptar on public.ia_generaciones
  for update to authenticated
  using (solicitado_por = (select auth.uid()))
  with check (solicitado_por = (select auth.uid()));

-- Notificaciones
create policy notificaciones_propias on public.notificaciones
  for select to authenticated using (perfil_id = (select auth.uid()));
create policy notificaciones_marcar_leida on public.notificaciones
  for update to authenticated
  using (perfil_id = (select auth.uid()))
  with check (perfil_id = (select auth.uid()));

-- Auditoría
create policy auditoria_admin on public.auditoria
  for select to authenticated using ((select public.es_admin()));

-- ---------------------------------------------------------------------
-- Storage: bucket privado, una carpeta por expediente
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'expedientes', 'expedientes', false, 20971520,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

create policy "expedientes_leer_archivos" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'expedientes'
    and public.puede_ver_expediente(public.carpeta_expediente(name))
  );

create policy "expedientes_subir_archivos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'expedientes'
    and public.puede_subir_documento(public.carpeta_expediente(name))
  );
