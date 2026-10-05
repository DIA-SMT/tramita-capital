import "server-only"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/lib/database.types"
import { entorno } from "@/lib/entorno"

/** Cliente con la sesión del usuario: todo lo que lee o escribe pasa por RLS. */
export async function crearClienteServidor() {
  const almacen = await cookies()
  return createServerClient<Database>(entorno.supabaseUrl, entorno.supabaseClavePublica, {
    cookies: {
      getAll: () => almacen.getAll(),
      setAll: (lista) => {
        try {
          lista.forEach(({ name, value, options }) => almacen.set(name, value, options))
        } catch {
          // Llamado desde un Server Component: el proxy ya renueva la sesión.
        }
      },
    },
  })
}
