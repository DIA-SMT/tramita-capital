import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"

export type FirmaActiva = {
  id: string
  aclaracion: string
  cargo: string
  imagenUrl: string | null
  registradaAt: string
  bloqueadaHasta: string | null
}

/** Firma registrada vigente de quien está usando el sistema (o null). */
export async function firmaActiva(supabase: SupabaseClient<Database>, perfilId: string): Promise<FirmaActiva | null> {
  const { data } = await supabase
    .from("firmas_registradas")
    .select("id, aclaracion, cargo, imagen_path, created_at, bloqueada_hasta")
    .eq("perfil_id", perfilId)
    .eq("activa", true)
    .maybeSingle()
  if (!data) return null
  const { data: url } = await supabase.storage.from("firmas").createSignedUrl(data.imagen_path, 600)
  return {
    id: data.id,
    aclaracion: data.aclaracion,
    cargo: data.cargo,
    imagenUrl: url?.signedUrl ?? null,
    registradaAt: data.created_at,
    bloqueadaHasta: data.bloqueada_hasta && new Date(data.bloqueada_hasta) > new Date() ? data.bloqueada_hasta : null,
  }
}
