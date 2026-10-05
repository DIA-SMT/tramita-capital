import "server-only"

function requerida(nombre: string): string {
  const valor = process.env[nombre]
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}`)
  return valor
}

export const entorno = {
  get supabaseUrl() {
    return requerida("NEXT_PUBLIC_SUPABASE_URL")
  },
  get supabaseClavePublica() {
    return requerida("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
  },
  get supabaseClaveSecreta() {
    return process.env.SUPABASE_SECRET_KEY
  },
  get sitio() {
    return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  },
  get iaModelo() {
    return process.env.IA_MODELO ?? "claude-opus-5-5"
  },
  get iaEsfuerzo(): "low" | "medium" | "high" | "xhigh" | "max" {
    const valor = process.env.IA_ESFUERZO
    return valor === "low" || valor === "high" || valor === "xhigh" || valor === "max" ? valor : "medium"
  },
  /**
   * Proveedor de IA activo. IA_PROVEEDOR elige explícitamente; si no, se usa Claude directo
   * cuando hay ANTHROPIC_API_KEY y OpenRouter cuando hay OPENROUTER_API_KEY.
   */
  get iaProveedor(): "anthropic" | "openrouter" | null {
    const anthropic = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN)
    const openrouter = Boolean(process.env.OPENROUTER_API_KEY)
    const pedido = process.env.IA_PROVEEDOR
    if (pedido === "openrouter" && openrouter) return "openrouter"
    if (pedido === "anthropic" && anthropic) return "anthropic"
    return anthropic ? "anthropic" : openrouter ? "openrouter" : null
  },
  get iaHabilitada() {
    return this.iaProveedor !== null
  },
  get openrouterClave() {
    return process.env.OPENROUTER_API_KEY
  },
  get iaModeloOpenRouter() {
    return process.env.IA_MODELO_OPENROUTER ?? "anthropic/claude-opus-5.5"
  },
  get resendClave() {
    return process.env.RESEND_API_KEY
  },
  get emailRemitente() {
    return process.env.EMAIL_REMITENTE ?? "Tramita Capital <onboarding@resend.dev>"
  },
  get migueToken() {
    return process.env.MIGUE_API_TOKEN
  },
  get migueWebhook() {
    return process.env.MIGUE_WEBHOOK_URL
  },
  get migueWebhookToken() {
    return process.env.MIGUE_WEBHOOK_TOKEN
  },
}
