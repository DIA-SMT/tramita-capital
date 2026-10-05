-- =====================================================================
-- Tramita Capital — Esquema base del expediente electrónico
-- Capital Humano · Municipalidad de San Miguel de Tucumán
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tipos enumerados
-- ---------------------------------------------------------------------
create type public.estado_expediente as enum (
  'iniciado',     -- presentado por el agente, aún sin recepción
  'en_tramite',   -- circulando por el circuito interno
  'observado',    -- requiere que el agente subsane algo
  'resuelto',     -- resolución firmada
  'archivado',    -- concluido y archivado
  'rechazado'     -- denegado / desistido
);

create type public.prioridad_expediente as enum ('baja', 'normal', 'alta', 'urgente');

create type public.rol_area as enum (
  'operador',      -- tramita, agrega providencias, pasa expedientes
  'dictaminante',  -- además puede firmar dictámenes
  'firmante',      -- además puede firmar resoluciones
  'jefe'           -- todo lo anterior dentro del área
);

create type public.tipo_actuacion as enum (
  'presentacion', 'documento', 'providencia', 'informe', 'dictamen',
  'resolucion', 'notificacion', 'observacion', 'subsanacion', 'pase', 'nota'
);

create type public.estado_actuacion as enum ('borrador', 'firmada', 'anulada');

create type public.accion_paso as enum (
  'recepcion', 'analisis', 'dictamen', 'resolucion', 'firma', 'liquidacion', 'notificacion', 'archivo'
);

create type public.canal_notificacion as enum ('sistema', 'email', 'migue');

-- ---------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------
create or replace function public.tocar_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Estructura organizativa
-- ---------------------------------------------------------------------
create table public.areas (
  id          uuid primary key default gen_random_uuid(),
  codigo      text not null unique,
  nombre      text not null,
  descripcion text,
  activa      boolean not null default true,
  created_at  timestamptz not null default now()
);
comment on table public.areas is 'Áreas internas de Capital Humano por donde circulan los expedientes.';

create table public.perfiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  nombre      text not null default '',
  apellido    text not null default '',
  cuil        text unique,
  legajo      text unique,
  telefono    text,          -- para notificaciones por Migue (WhatsApp)
  reparticion text,          -- repartición donde presta servicio el agente
  es_admin    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.perfiles is 'Agentes municipales y personal interno. 1:1 con auth.users.';

create trigger perfiles_updated_at before update on public.perfiles
  for each row execute function public.tocar_updated_at();

create table public.miembros_area (
  perfil_id     uuid not null references public.perfiles (id) on delete cascade,
  area_id       uuid not null references public.areas (id) on delete cascade,
  rol           public.rol_area not null default 'operador',
  ve_reservados boolean not null default false,
  created_at    timestamptz not null default now(),
  primary key (perfil_id, area_id)
);
create index miembros_area_area_idx on public.miembros_area (area_id);
comment on column public.miembros_area.ve_reservados is 'Puede ver expedientes reservados (salud, discapacidad) aunque no estén en su área.';

-- ---------------------------------------------------------------------
-- Parametrización de trámites
-- ---------------------------------------------------------------------
create table public.tipos_tramite (
  id              uuid primary key default gen_random_uuid(),
  codigo          text not null unique,
  nombre          text not null,
  descripcion     text,
  categoria       text not null default 'General',
  icono           text,                                  -- nombre de ícono lucide
  normativa       text,                                  -- marco normativo aplicable
  requisitos      jsonb not null default '[]'::jsonb,    -- [{clave, nombre, descripcion, obligatorio}]
  formulario      jsonb not null default '[]'::jsonb,    -- [{clave, etiqueta, tipo, obligatorio, opciones?, ayuda?}]
  plazo_dias      integer,                               -- objetivo de resolución (días)
  linea_base_dias numeric(6,1),                          -- demora histórica medida antes del sistema
  prioridad_base  public.prioridad_expediente not null default 'normal',
  reservado       boolean not null default false,        -- datos sensibles
  activo          boolean not null default true,
  version         integer not null default 1,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint requisitos_es_array check (jsonb_typeof(requisitos) = 'array'),
  constraint formulario_es_array check (jsonb_typeof(formulario) = 'array')
);

create trigger tipos_tramite_updated_at before update on public.tipos_tramite
  for each row execute function public.tocar_updated_at();

create table public.pasos_circuito (
  id              uuid primary key default gen_random_uuid(),
  tipo_tramite_id uuid not null references public.tipos_tramite (id) on delete cascade,
  orden           integer not null check (orden > 0),
  nombre          text not null,
  area_id         uuid not null references public.areas (id),
  accion          public.accion_paso not null,
  plazo_horas     integer,
  instrucciones   text,
  unique (tipo_tramite_id, orden)
);
comment on table public.pasos_circuito is 'Cursograma parametrizado: por qué áreas pasa cada tipo de trámite y en qué orden.';

create table public.plantillas (
  id              uuid primary key default gen_random_uuid(),
  tipo_tramite_id uuid not null references public.tipos_tramite (id) on delete cascade,
  tipo_documento  public.tipo_actuacion not null,
  nombre          text not null,
  cuerpo          text not null,       -- modelo con marcadores {{variable}}
  instrucciones_ia text,               -- criterios que la IA debe respetar al redactar
  version         integer not null default 1,
  activa          boolean not null default true,
  created_at      timestamptz not null default now()
);
create index plantillas_tipo_idx on public.plantillas (tipo_tramite_id, tipo_documento) where activa;

-- ---------------------------------------------------------------------
-- Expedientes
-- ---------------------------------------------------------------------
create table public.contadores (
  anio    integer not null,
  prefijo text not null,
  ultimo  integer not null default 0,
  primary key (anio, prefijo)
);

create table public.expedientes (
  id               uuid primary key default gen_random_uuid(),
  numero           text not null unique,
  tipo_tramite_id  uuid not null references public.tipos_tramite (id),
  iniciador_id     uuid not null references public.perfiles (id),
  asunto           text not null,
  datos            jsonb not null default '{}'::jsonb,
  estado           public.estado_expediente not null default 'iniciado',
  prioridad        public.prioridad_expediente not null default 'normal',
  prioridad_motivo text,
  prioridad_origen text not null default 'regla' check (prioridad_origen in ('regla', 'ia', 'manual')),
  paso_actual      integer not null default 1,
  area_actual_id   uuid references public.areas (id),
  asignado_a       uuid references public.perfiles (id),
  reservado        boolean not null default false,
  vence_at         timestamptz,
  resuelto_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index expedientes_area_estado_idx on public.expedientes (area_actual_id, estado);
create index expedientes_iniciador_idx on public.expedientes (iniciador_id, created_at desc);
create index expedientes_asignado_idx on public.expedientes (asignado_a) where asignado_a is not null;
create index expedientes_tipo_idx on public.expedientes (tipo_tramite_id, created_at desc);

create trigger expedientes_updated_at before update on public.expedientes
  for each row execute function public.tocar_updated_at();

-- Fojas digitales. Una vez firmadas son inmutables y quedan encadenadas por hash.
create table public.actuaciones (
  id               uuid primary key default gen_random_uuid(),
  expediente_id    uuid not null references public.expedientes (id) on delete restrict,
  foja             integer,
  tipo             public.tipo_actuacion not null,
  titulo           text not null,
  contenido        text,
  datos            jsonb not null default '{}'::jsonb,
  estado           public.estado_actuacion not null default 'borrador',
  autor_id         uuid references public.perfiles (id),
  area_id          uuid references public.areas (id),
  generada_por_ia  boolean not null default false,
  ia_generacion_id uuid,
  firmada_por      uuid references public.perfiles (id),
  firmada_at       timestamptz,
  hash             text,
  hash_anterior    text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (expediente_id, foja),
  constraint firmada_completa check (
    estado <> 'firmada' or (foja is not null and firmada_por is not null and firmada_at is not null and hash is not null)
  )
);
create index actuaciones_expediente_idx on public.actuaciones (expediente_id, created_at);

create trigger actuaciones_updated_at before update on public.actuaciones
  for each row execute function public.tocar_updated_at();

create table public.documentos (
  id             uuid primary key default gen_random_uuid(),
  expediente_id  uuid not null references public.expedientes (id) on delete restrict,
  actuacion_id   uuid references public.actuaciones (id),
  requisito_clave text,
  nombre_archivo text not null,
  storage_path   text not null unique,
  mime_type      text,
  tamano_bytes   bigint,
  sha256         text,
  subido_por     uuid references public.perfiles (id),
  created_at     timestamptz not null default now()
);
create index documentos_expediente_idx on public.documentos (expediente_id);

-- Hoja de ruta digital: cada pase entre áreas o personas.
create table public.movimientos (
  id              uuid primary key default gen_random_uuid(),
  expediente_id   uuid not null references public.expedientes (id) on delete restrict,
  desde_area_id   uuid references public.areas (id),
  hacia_area_id   uuid references public.areas (id),
  desde_perfil_id uuid references public.perfiles (id),
  hacia_perfil_id uuid references public.perfiles (id),
  paso_desde      integer,
  paso_hacia      integer,
  motivo          text,
  created_at      timestamptz not null default now()
);
create index movimientos_expediente_idx on public.movimientos (expediente_id, created_at);

-- ---------------------------------------------------------------------
-- IA, notificaciones y auditoría
-- ---------------------------------------------------------------------
create table public.ia_generaciones (
  id             uuid primary key default gen_random_uuid(),
  expediente_id  uuid references public.expedientes (id) on delete set null,
  tipo           text not null,               -- dictamen | resolucion | providencia | priorizacion | resumen
  modelo         text not null,
  solicitado_por uuid references public.perfiles (id),
  entrada_tokens integer,
  salida_tokens  integer,
  duracion_ms    integer,
  resultado      text,
  estado         text not null default 'ok' check (estado in ('ok', 'rechazada', 'error')),
  aceptada       boolean,
  created_at     timestamptz not null default now()
);
create index ia_generaciones_expediente_idx on public.ia_generaciones (expediente_id, created_at desc);

alter table public.actuaciones
  add constraint actuaciones_ia_generacion_fk
  foreign key (ia_generacion_id) references public.ia_generaciones (id) on delete set null;

create table public.notificaciones (
  id            uuid primary key default gen_random_uuid(),
  perfil_id     uuid not null references public.perfiles (id) on delete cascade,
  expediente_id uuid references public.expedientes (id) on delete cascade,
  titulo        text not null,
  cuerpo        text,
  canal         public.canal_notificacion not null default 'sistema',
  leida_at      timestamptz,
  enviada_at    timestamptz,
  error         text,
  created_at    timestamptz not null default now()
);
create index notificaciones_perfil_idx on public.notificaciones (perfil_id, created_at desc);

create table public.auditoria (
  id          bigint generated always as identity primary key,
  tabla       text not null,
  registro_id uuid,
  accion      text not null,
  actor_id    uuid,
  datos       jsonb,
  created_at  timestamptz not null default now()
);
create index auditoria_registro_idx on public.auditoria (tabla, registro_id);

-- ---------------------------------------------------------------------
-- Alta automática de perfil al registrarse en Auth
-- ---------------------------------------------------------------------
create or replace function public.crear_perfil_desde_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (id, email, nombre, apellido)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'nombre', ''),
    coalesce(new.raw_user_meta_data ->> 'apellido', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil_desde_auth();
