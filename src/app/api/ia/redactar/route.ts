import Anthropic from "@anthropic-ai/sdk"
import * as z from "zod"
import { crearClienteServidor } from "@/lib/supabase/servidor"
import { entorno } from "@/lib/entorno"
import { BETA_RESPALDO, clienteIA } from "@/lib/ia/cliente"
import { contextoExpediente } from "@/lib/ia/contexto"
import { construirPedido, DOCUMENTOS_REDACTABLES, SISTEMA_REDACCION } from "@/lib/ia/redaccion"

export const maxDuration = 300

const Pedido = z.object({
  expedienteId: z.uuid(),
  tipo: z.enum(DOCUMENTOS_REDACTABLES),
  indicaciones: z.string().max(2000).optional(),
})

/**
 * Redacta un borrador con IA y lo transmite en vivo (texto plano).
 * La persona lo revisa, lo edita y recién después lo firma.
 */
export async function POST(request: Request) {
  const pedido = Pedido.safeParse(await request.json().catch(() => null))
  if (!pedido.success) return Response.json({ error: "Pedido inválido" }, { status: 400 })

  const supabase = await crearClienteServidor()
  const [{ data: claims }, { data: interno }] = await Promise.all([supabase.auth.getClaims(), supabase.rpc("es_interno")])
  const usuarioId = claims?.claims?.sub
  if (!usuarioId || !interno) return Response.json({ error: "Sin permiso" }, { status: 403 })
  if (!entorno.iaHabilitada) {
    return Response.json({ error: "La IA no está configurada en este entorno (falta ANTHROPIC_API_KEY)." }, { status: 503 })
  }

  const ctx = await contextoExpediente(supabase, pedido.data.expedienteId, pedido.data.tipo)
  if (!ctx) return Response.json({ error: "Expediente inexistente o sin permiso" }, { status: 404 })

  const generacionId = crypto.randomUUID()
  const inicio = Date.now()
  const codificador = new TextEncoder()

  const flujo = clienteIA().beta.messages.stream(
    {
      model: entorno.iaModelo,
      max_tokens: 64000,
      thinking: { type: "adaptive" },
      output_config: { effort: entorno.iaEsfuerzo },
      betas: [BETA_RESPALDO],
      fallbacks: "default",
      system: SISTEMA_REDACCION,
      messages: construirPedido(ctx, pedido.data.tipo, pedido.data.indicaciones),
    },
    { signal: request.signal },
  )

  const cuerpo = new ReadableStream<Uint8Array>({
    async start(controlador) {
      flujo.on("text", (delta) => controlador.enqueue(codificador.encode(delta)))
      let texto = ""
      let estado: "ok" | "rechazada" | "error" = "ok"
      let modelo = entorno.iaModelo
      let uso: { input_tokens: number; output_tokens: number } | null = null
      try {
        const final = await flujo.finalMessage()
        modelo = final.model
        uso = final.usage
        texto = final.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("")
        if (final.stop_reason === "refusal") {
          estado = "rechazada"
          controlador.enqueue(codificador.encode("\n\n> La IA no pudo completar este borrador. Redactalo manualmente."))
        } else if (final.stop_reason === "max_tokens") {
          controlador.enqueue(codificador.encode("\n\n> [El borrador quedó incompleto por su extensión: revisá el final.]"))
        }
      } catch (error) {
        estado = "error"
        const mensaje =
          error instanceof Anthropic.RateLimitError
            ? "La IA está saturada en este momento. Probá en un minuto."
            : error instanceof Anthropic.APIError
              ? `Error del servicio de IA (${error.status}).`
              : request.signal.aborted
                ? "Generación cancelada."
                : "No se pudo completar la generación."
        controlador.enqueue(codificador.encode(`\n\n> ${mensaje}`))
      } finally {
        // Registro de auditoría de IA (se inserta antes de cerrar el flujo, para que el
        // borrador pueda referenciarlo apenas termina).
        await supabase.from("ia_generaciones").insert({
          id: generacionId,
          expediente_id: pedido.data.expedienteId,
          tipo: pedido.data.tipo,
          modelo,
          solicitado_por: usuarioId,
          entrada_tokens: uso?.input_tokens ?? null,
          salida_tokens: uso?.output_tokens ?? null,
          duracion_ms: Date.now() - inicio,
          resultado: texto || null,
          estado,
        })
        controlador.close()
      }
    },
    cancel() {
      flujo.abort()
    },
  })

  return new Response(cuerpo, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Generacion-Id": generacionId,
    },
  })
}
