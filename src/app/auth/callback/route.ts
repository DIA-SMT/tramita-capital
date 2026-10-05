import { NextResponse, type NextRequest } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"
import { crearClienteServidor } from "@/lib/supabase/servidor"

/** Destino del enlace mágico: admite el flujo PKCE (code) y el de token_hash. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get("code")
  const tokenHash = searchParams.get("token_hash")
  const tipo = searchParams.get("type") as EmailOtpType | null
  const volver = searchParams.get("volver") ?? "/"
  const destino = volver.startsWith("/") && !volver.startsWith("//") ? volver : "/"

  const supabase = await crearClienteServidor()
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && tipo
      ? await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash })
      : { error: new Error("Enlace incompleto") }

  if (error) return NextResponse.redirect(`${origin}/ingresar?error=enlace`)
  return NextResponse.redirect(`${origin}${destino}`)
}
