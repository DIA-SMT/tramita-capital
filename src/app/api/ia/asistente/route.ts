import * as z from "zod"
import { crearClienteServidor } from "@/lib/supabase/servidor"
import { entorno } from "@/lib/entorno"
import { cargarDatosAsistente, consultasRestantes, SISTEMA_ASISTENTE, textoDatos } from "@/lib/ia/asistente"
import { ErrorIA, generarTexto, modeloActivo, type ResultadoIA } from "@/lib/ia/proveedor"

export const maxDuration = 120

// Conversación alternada que empieza y termina con la persona; se usan los últimos turnos.
const Pedido = z.object({
  expedienteId: z.uuid().optional(),
  mensajes: z
    .array(z.object({ rol: z.enum(["usuario", "asistente"]), texto: z.string().trim().min(1).max(6000) }))
    .min(1)
    .max(41)
    .refine((m) => m.length % 2 === 1 && m.every((x, i) => x.rol === (i % 2 === 0 ? "usuario" : "asistente")), "Conversación inválida")
    .refine((m) => m.at(-1)!.texto.length <= 1000, "La pregunta es demasiado larga"),
})

/**
 * Asistente del agente: responde sobre sus propios trámites y el catálogo, en vivo.
 * Lee todo con el cliente del usuario, así que nunca ve trámites ajenos.
 */
export async function POST(request: Request) {
  const pedido = Pedido.safeParse(await request.json().catch(() => null))
  if (!pedido.success) return Response.json({ error: pedido.error.issues[0]?.message ?? "Pedido inválido" }, { status: 400 })

  const supabase = await crearClienteServidor()
  const { data: claims } = await supabase.auth.getClaims()
  const usuarioId = claims?.claims?.sub
  if (!usuarioId) return Response.json({ error: "Iniciá sesión para consultar" }, { status: 401 })
  if (!entorno.iaHabilitada) return Response.json({ error: "La IA no está configurada en este entorno." }, { status: 503 })

  const restantes = await consultasRestantes(supabase, usuarioId)
  if (restantes <= 0) {
    return Response.json({ error: "Llegaste al límite de consultas de hoy. Mañana podés seguir preguntando." }, { status: 429 })
  }

  const { expedienteId, mensajes } = pedido.data
  const datos = await cargarDatosAsistente(supabase, usuarioId, expedienteId)
  const pregunta = mensajes.at(-1)!.texto
  const historial = mensajes.slice(-11, -1)
  const inicio = Date.now()
  const codificador = new TextEncoder()

  const cuerpo = new ReadableStream<Uint8Array>({
    async start(controlador) {
      let resultado: ResultadoIA | null = null
      let estado: "ok" | "rechazada" | "error" = "ok"
      try {
        resultado = await generarTexto(
          {
            sistema: SISTEMA_ASISTENTE,
            historial,
            usuario: `${textoDatos(datos)}\n\n<pregunta>\n${pregunta}\n</pregunta>`,
            maxTokens: 6000,
            esfuerzo: "low",
            signal: request.signal,
          },
          (delta) => controlador.enqueue(codificador.encode(delta)),
        )
        if (resultado.final === "rechazo") {
          estado = "rechazada"
          controlador.enqueue(codificador.encode("No puedo responder eso. Consultalo directamente en Capital Humano."))
        }
      } catch (error) {
        estado = "error"
        const texto = error instanceof ErrorIA ? error.message : request.signal.aborted ? "Consulta cancelada." : "No se pudo responder."
        controlador.enqueue(codificador.encode(`\n\n> ${texto}`))
      } finally {
        await supabase.from("ia_generaciones").insert({
          expediente_id: datos.enfocado,
          tipo: "asistente",
          modelo: resultado?.modelo ?? modeloActivo(),
          solicitado_por: usuarioId,
          consulta: pregunta,
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
      "X-Consultas-Restantes": String(restantes - 1),
    },
  })
}
