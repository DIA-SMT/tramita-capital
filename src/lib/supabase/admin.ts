import "server-only"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import { entorno } from "@/lib/entorno"

/**
 * Cliente con clave secreta: SALTEA RLS. Usar solo en el servidor y solo para
 * tareas de sistema (notificaciones, priorización por IA, integración con Migue).
 */
export function clienteAdmin() {
  if (!entorno.supabaseClaveSecreta) {
    throw new Error("Falta SUPABASE_SECRET_KEY")
  }
  return createClient<Database>(entorno.supabaseUrl, entorno.supabaseClaveSecreta, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
