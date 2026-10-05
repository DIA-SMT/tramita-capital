import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import type { Database } from "@/lib/database.types"

const RUTAS_PUBLICAS = ["/ingresar", "/auth", "/api/migue"]

/** Renueva la sesión en cada request y redirige a /ingresar si no hay usuario. */
export async function actualizarSesion(request: NextRequest) {
  let respuesta = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (lista) => {
          lista.forEach(({ name, value }) => request.cookies.set(name, value))
          respuesta = NextResponse.next({ request })
          lista.forEach(({ name, value, options }) => respuesta.cookies.set(name, value, options))
        },
      },
    },
  )

  // getClaims valida la firma del JWT; no confiar en getSession() del lado servidor.
  const { data } = await supabase.auth.getClaims()
  const usuario = data?.claims

  const { pathname } = request.nextUrl
  const esPublica = pathname === "/" || RUTAS_PUBLICAS.some((r) => pathname.startsWith(r))

  if (!usuario && !esPublica) {
    const url = request.nextUrl.clone()
    url.pathname = "/ingresar"
    url.searchParams.set("volver", pathname)
    return NextResponse.redirect(url)
  }

  return respuesta
}
