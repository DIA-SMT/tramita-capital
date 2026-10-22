-- =====================================================================
-- Asistente del agente (módulo 6): consultas sobre sus propios trámites,
-- los requisitos y la normativa, desde el portal o por Migue.
-- Cada consulta queda en ia_generaciones con tipo 'asistente'.
-- =====================================================================

alter table public.ia_generaciones add column if not exists consulta text;
comment on column public.ia_generaciones.consulta is 'Pregunta de la persona (solo en el asistente).';

-- Las consultas son de la persona que pregunta y pueden traer datos de salud:
-- el personal interno ve las generaciones de trabajo, no las del asistente.
drop policy if exists ia_generaciones_lectura on public.ia_generaciones;
create policy ia_generaciones_lectura on public.ia_generaciones
  for select to authenticated
  using (
    ((select public.es_interno()) and tipo <> 'asistente')
    or solicitado_por = (select auth.uid())
  );

-- Cualquier agente registra sus propias consultas; el resto sigue reservado al personal interno.
drop policy if exists ia_generaciones_registrar on public.ia_generaciones;
create policy ia_generaciones_registrar on public.ia_generaciones
  for insert to authenticated
  with check (
    solicitado_por = (select auth.uid())
    and ((select public.es_interno()) or tipo = 'asistente')
  );

-- Cupo diario de consultas por persona.
create index if not exists ia_generaciones_asistente_idx
  on public.ia_generaciones (solicitado_por, created_at desc)
  where tipo = 'asistente';
