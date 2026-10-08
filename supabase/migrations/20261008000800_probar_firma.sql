-- =====================================================================
-- Probar la firma: compara un trazo con el patrón registrado de quien
-- la prueba, sin firmar nada. Sirve para entender y calibrar la
-- verificación. Solo contra la firma propia; cada prueba queda auditada.
-- =====================================================================
create or replace function public.probar_firma(p_trazo jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_firma   public.firmas_registradas;
  v_trazo   float8[];
  v_puntaje float8;
  v_dur     boolean;
  v_trz     boolean;
begin
  select * into v_firma from public.firmas_registradas where perfil_id = v_uid and activa;
  if not found or v_firma.muestras is null then
    raise exception 'Primero registrá tu firma' using errcode = '22023';
  end if;
  if not public._patron_valido(p_trazo) then
    raise exception 'Dibujá tu firma completa' using errcode = '22023';
  end if;

  v_trazo := public._patron_vector(p_trazo);
  select min(public._dtw(v_trazo, public._patron_vector(m), 4, 12)) into v_puntaje
    from jsonb_array_elements(v_firma.muestras) m;
  v_dur := (p_trazo ->> 'duracion')::numeric between v_firma.duracion_media / 3.0 and v_firma.duracion_media * 3.0;
  v_trz := abs((p_trazo ->> 'trazos')::numeric - v_firma.trazos_medio) <= greatest(2, v_firma.trazos_medio * 0.6);

  insert into public.auditoria (tabla, registro_id, accion, actor_id, datos)
  values ('firmas_registradas', v_firma.id, 'prueba_firma', v_uid,
          jsonb_build_object('puntaje', round(v_puntaje::numeric, 4), 'coincide', v_puntaje <= v_firma.umbral and v_dur and v_trz));

  return jsonb_build_object(
    'puntaje', round(v_puntaje::numeric, 4),
    'umbral', round(v_firma.umbral, 4),
    'duracion_ok', v_dur,
    'trazos_ok', v_trz,
    'coincide', v_puntaje <= v_firma.umbral and v_dur and v_trz
  );
end;
$$;

revoke execute on function public.probar_firma(jsonb) from public, anon;
grant execute on function public.probar_firma(jsonb) to authenticated;
