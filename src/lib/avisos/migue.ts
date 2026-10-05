import "server-only"
import { entorno } from "@/lib/entorno"

/**
 * Envía un aviso al agente a través de Migue, el bot del municipio.
 * El contrato es provisorio: se ajusta cuando el equipo de Migue defina su API.
 *   POST MIGUE_WEBHOOK_URL
 *   Authorization: Bearer MIGUE_WEBHOOK_TOKEN
 *   { "telefono", "mensaje", "expediente": { "numero", "enlace" } }
 */
export async function enviarMigue(
  telefono: string,
  aviso: { titulo: string; cuerpo: string; numero?: string; enlace?: string },
) {
  if (!entorno.migueWebhook) {
    return { ok: false as const, error: "MIGUE_WEBHOOK_URL no configurada" }
  }
  try {
    const respuesta = await fetch(entorno.migueWebhook, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(entorno.migueWebhookToken ? { Authorization: `Bearer ${entorno.migueWebhookToken}` } : {}),
      },
      body: JSON.stringify({
        telefono,
        mensaje: `*${aviso.titulo}*\n${aviso.cuerpo}`,
        expediente: aviso.numero ? { numero: aviso.numero, enlace: aviso.enlace } : undefined,
      }),
      signal: AbortSignal.timeout(8000),
    })
    return respuesta.ok ? { ok: true as const } : { ok: false as const, error: `Migue respondió ${respuesta.status}` }
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Error de red" }
  }
}
