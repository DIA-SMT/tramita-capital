-- =====================================================================
-- Feriados para contar días hábiles (plazo de la reconsideración,
-- migración 001700). Idempotente: se puede volver a aplicar.
--
-- Desde noviembre de 2026. Fuentes: calendarios publicados (no se encontró
-- el decreto oficial). 2027 está calculado con la Ley 27.399: los feriados
-- trasladables que caen martes o miércoles pasan al lunes anterior, y los de
-- jueves o viernes, al lunes siguiente. A VALIDAR con Capital Humano:
--   - si la administración municipal trabaja los días no laborables con
--     fines turísticos (acá se cuentan como no hábiles);
--   - si el 24 de septiembre (Batalla de Tucumán) es feriado o no laborable
--     para el municipio (acá, no hábil);
--   - los asuetos municipales (no están: se agregan cuando se decretan);
--   - los días no laborables de 2027, cuando salga el decreto.
-- Ante la duda se cuenta como no hábil: alarga el plazo a favor del agente.
-- Los que caen sábado o domingo no cambian el cálculo; están por claridad.
-- =====================================================================

insert into public.feriados (fecha, motivo) values
  -- 2026
  ('2026-11-23', 'Día de la Soberanía Nacional (trasladado del 20/11)'),
  ('2026-12-07', 'Día no laborable con fines turísticos'),
  ('2026-12-08', 'Inmaculada Concepción de María'),
  ('2026-12-25', 'Navidad'),
  -- 2027
  ('2027-01-01', 'Año Nuevo'),
  ('2027-02-08', 'Carnaval'),
  ('2027-02-09', 'Carnaval'),
  ('2027-03-24', 'Día Nacional de la Memoria por la Verdad y la Justicia'),
  ('2027-03-25', 'Jueves Santo (día no laborable)'),
  ('2027-03-26', 'Viernes Santo'),
  ('2027-04-02', 'Día del Veterano y de los Caídos en la Guerra de Malvinas'),
  ('2027-05-01', 'Día del Trabajador'),
  ('2027-05-25', 'Día de la Revolución de Mayo'),
  ('2027-06-20', 'Paso a la Inmortalidad del General Manuel Belgrano'),
  ('2027-06-21', 'Paso a la Inmortalidad del General Martín Miguel de Güemes (trasladado del 17/6)'),
  ('2027-07-09', 'Día de la Independencia'),
  ('2027-08-16', 'Paso a la Inmortalidad del General José de San Martín (trasladado del 17/8)'),
  ('2027-09-24', 'Batalla de Tucumán (provincial; a validar si es feriado o no laborable)'),
  ('2027-10-11', 'Día del Respeto a la Diversidad Cultural (trasladado del 12/10)'),
  ('2027-11-20', 'Día de la Soberanía Nacional'),
  ('2027-12-08', 'Inmaculada Concepción de María'),
  ('2027-12-25', 'Navidad')
on conflict (fecha) do update set motivo = excluded.motivo;

-- Comprobación: tienen que ser 22.
select count(*) as feriados_cargados from public.feriados where fecha >= '2026-11-01';
