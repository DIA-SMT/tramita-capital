import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import { leerVisible } from "@/lib/firma"
import type { FirmaVisible } from "@/lib/firma-trazo"

export type FirmaActiva = {
  id: string
  aclaracion: string
  cargo: string
  /** Trazo de la última muestra registrada (para mostrarla; el patrón nunca sale de la base). */
  visible: FirmaVisible | null
  tinta: string | null
  registradaAt: string
  bloqueadaHasta: string | null
}

/** Firma registrada vigente de quien está usando el sistema (o null). Solo cuenta la versión biométrica. */
export async function firmaActiva(supabase: SupabaseClient<Database>, perfilId: string): Promise<FirmaActiva | null> {
  const { data } = await supabase
    .from("firmas_registradas")
    .select("id, aclaracion, cargo, visible, tinta, created_at, bloqueada_hasta")
    .eq("perfil_id", perfilId)
    .eq("activa", true)
    .gte("version", 2)
    .maybeSingle()
  if (!data) return null
  return {
    id: data.id,
    aclaracion: data.aclaracion,
    cargo: data.cargo,
    visible: leerVisible(data.visible ?? undefined),
    tinta: data.tinta,
    registradaAt: data.created_at,
    bloqueadaHasta: data.bloqueada_hasta && new Date(data.bloqueada_hasta) > new Date() ? data.bloqueada_hasta : null,
  }
}
