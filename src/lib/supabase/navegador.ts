import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/lib/database.types"

let cliente: ReturnType<typeof createBrowserClient<Database>> | undefined

export function clienteNavegador() {
  cliente ??= createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )
  return cliente
}
