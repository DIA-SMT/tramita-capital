import * as z from "zod"
import { crearClienteServidor } from "@/lib/supabase/servidor"
import { entorno } from "@/lib/entorno"
import { contextoExpediente } from "@/lib/ia/contexto"
import { ErrorIA, generarTexto, modeloActivo, type ResultadoIA } from "@/lib/ia/proveedor"
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
    return Response.json({ error: "La IA no está configurada en este entorno." }, { status: 503 })
  }

  const ctx = await contextoExpediente(supabase, pedido.data.expedienteId, pedido.data.tipo)
  if (!ctx) return Response.json({ error: "Expediente inexistente o sin permiso" }, { status: 404 })

  const generacionId = crypto.randomUUID()
  const inicio = Date.now()
  const codificador = new TextEncoder()
  const mensaje = construirPedido(ctx, pedido.data.tipo, pedido.data.indicaciones)[0].content as string

  const cuerpo = new ReadableStream<Uint8Array>({
    async start(controlador) {
      let resultado: ResultadoIA | null = null
      let estado: "ok" | "rechazada" | "error" = "ok"
      try {
        resultado = await generarTexto(
          { sistema: SISTEMA_REDACCION, usuario: mensaje, maxTokens: 64000, signal: request.signal },
          (delta) => controlador.enqueue(codificador.encode(delta)),
        )
        if (resultado.final === "rechazo") {
          estado = "rechazada"
          controlador.enqueue(codificador.encode("\n\n> La IA no pudo completar este borrador. Redactalo manualmente."))
        } else if (resultado.final === "cortado") {
          controlador.enqueue(codificador.encode("\n\n> [El borrador quedó incompleto por su extensión: revisá el final.]"))
        }
      } catch (error) {
        estado = "error"
        const texto = error instanceof ErrorIA ? error.message : request.signal.aborted ? "Generación cancelada." : "No se pudo completar la generación."
        controlador.enqueue(codificador.encode(`\n\n> ${texto}`))
      } finally {
        // Registro de auditoría de IA: se inserta antes de cerrar el flujo para que el
        // borrador pueda referenciarlo apenas termina.
        await supabase.from("ia_generaciones").insert({
          id: generacionId,
          expediente_id: pedido.data.expedienteId,
          tipo: pedido.data.tipo,
          modelo: resultado?.modelo ?? modeloActivo(),
          solicitado_por: usuarioId,
          entrada_tokens: resultado?.entradaTokens ?? null,
          salida_tokens: resultado?.salidaTokens ?? null,
          duracion_ms: Date.now() - inicio,
          resultado: resultado?.texto || null,
          estado,
        })
        controlador.close()
      }
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
