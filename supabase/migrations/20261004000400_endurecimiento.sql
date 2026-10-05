-- =====================================================================
-- Endurecimiento: Supabase otorga EXECUTE a anon sobre funciones nuevas
-- por privilegios por defecto. Las RPC ya exigen sesión y rol, pero se
-- revoca igual (defensa en profundidad). Índices para FKs consultadas.
-- =====================================================================

revoke execute on all functions in schema public from anon, public;
alter default privileges for role postgres in schema public revoke execute on functions from anon, public;

-- Funciones de trigger: nunca deben invocarse por la API
revoke execute on function public.crear_perfil_desde_auth(), public.tocar_updated_at() from authenticated;

create index if not exists actuaciones_firmada_por_idx on public.actuaciones (firmada_por, firmada_at) where firmada_por is not null;
create index if not exists actuaciones_autor_idx on public.actuaciones (autor_id) where estado = 'borrador';
create index if not exists documentos_actuacion_idx on public.documentos (actuacion_id);
create index if not exists notificaciones_expediente_idx on public.notificaciones (expediente_id);
create index if not exists pasos_circuito_area_idx on public.pasos_circuito (area_id);
create index if not exists ia_generaciones_solicitante_idx on public.ia_generaciones (solicitado_por);
