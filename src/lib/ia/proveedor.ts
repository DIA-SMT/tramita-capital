import "server-only"
import Anthropic from "@anthropic-ai/sdk"
import * as z from "zod/v4"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"
import { entorno } from "@/lib/entorno"
import { BETA_RESPALDO, clienteIA } from "@/lib/ia/cliente"

/**
 * Capa única de IA. Las rutas piden texto (en vivo) o JSON validado sin saber
 * si responde Claude directo (SDK de Anthropic) u OpenRouter.
 */

export type Esfuerzo = "low" | "medium" | "high" | "xhigh" | "max"

export type PedidoIA = {
  sistema: string
  usuario: string
  maxTokens: number
  esfuerzo?: Esfuerzo
  signal?: AbortSignal
}

export type ResultadoIA = {
  texto: string
  modelo: string
  entradaTokens: number | null
  salidaTokens: number | null
  /** ok · rechazo (la IA declinó) · cortado (llegó al máximo de tokens) */
  final: "ok" | "rechazo" | "cortado"
}

/** Error con un mensaje apto para mostrarle a la persona. */
export class ErrorIA extends Error {
  constructor(
    mensaje: string,
    readonly estado?: number,
  ) {
    super(mensaje)
  }
}

function mensajePorEstado(estado: number | undefined) {
  if (estado === 401 || estado === 403) return "La clave del servicio de IA no es válida."
  if (estado === 402) return "El servicio de IA se quedó sin crédito."
  if (estado === 429) return "La IA está saturada en este momento. Probá en un minuto."
  if (estado && estado >= 500) return "El servicio de IA no responde. Probá de nuevo."
  return "No se pudo completar la solicitud a la IA."
}

export function modeloActivo() {
  return entorno.iaProveedor === "openrouter" ? entorno.iaModeloOpenRouter : entorno.iaModelo
}

// ---------------------------------------------------------------------
// Texto en vivo
// ---------------------------------------------------------------------
export async function generarTexto(pedido: PedidoIA, alTexto?: (delta: string) => void): Promise<ResultadoIA> {
  const proveedor = entorno.iaProveedor
  if (!proveedor) throw new ErrorIA("La IA no está configurada en este entorno.")
  return proveedor === "anthropic" ? textoAnthropic(pedido, alTexto) : textoOpenRouter(pedido, alTexto)
}

async function textoAnthropic(p: PedidoIA, alTexto?: (delta: string) => void): Promise<ResultadoIA> {
  const flujo = clienteIA().beta.messages.stream(
    {
      model: entorno.iaModelo,
      max_tokens: p.maxTokens,
      thinking: { type: "adaptive" },
      output_config: { effort: p.esfuerzo ?? entorno.iaEsfuerzo },
      betas: [BETA_RESPALDO],
      fallbacks: "default",
      system: p.sistema,
      messages: [{ role: "user", content: p.usuario }],
    },
    { signal: p.signal },
  )
  if (alTexto) flujo.on("text", alTexto)
  try {
    const final = await flujo.finalMessage()
    return {
      texto: final.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join(""),
      modelo: final.model,
      entradaTokens: final.usage.input_tokens,
      salidaTokens: final.usage.output_tokens,
      final: final.stop_reason === "refusal" ? "rechazo" : final.stop_reason === "max_tokens" ? "cortado" : "ok",
    }
  } catch (error) {
    if (error instanceof Anthropic.APIError) throw new ErrorIA(mensajePorEstado(error.status), error.status)
    throw error
  }
}

const URL_OPENROUTER = "https://openrouter.ai/api/v1/chat/completions"

function cabecerasOpenRouter() {
  return {
    Authorization: `Bearer ${entorno.openrouterClave}`,
    "Content-Type": "application/json",
    "HTTP-Referer": entorno.sitio,
    "X-Title": "Tramita Capital",
  }
}

function razonamiento(esfuerzo: Esfuerzo | undefined) {
  const e = esfuerzo ?? entorno.iaEsfuerzo
  return { effort: e === "xhigh" || e === "max" ? "high" : e }
}

type Fragmento = {
  model?: string
  choices?: { delta?: { content?: string | null }; finish_reason?: string | null }[]
  usage?: { prompt_tokens?: number; completion_tokens?: number }
  error?: { message?: string; code?: number }
}

async function textoOpenRouter(p: PedidoIA, alTexto?: (delta: string) => void): Promise<ResultadoIA> {
  const respuesta = await fetch(URL_OPENROUTER, {
    method: "POST",
    headers: cabecerasOpenRouter(),
    signal: p.signal,
    body: JSON.stringify({
      model: entorno.iaModeloOpenRouter,
      stream: true,
      max_tokens: p.maxTokens,
      reasoning: razonamiento(p.esfuerzo),
      usage: { include: true },
      messages: [
        { role: "system", content: p.sistema },
        { role: "user", content: p.usuario },
      ],
    }),
  })
  if (!respuesta.ok || !respuesta.body) throw new ErrorIA(mensajePorEstado(respuesta.status), respuesta.status)

  const lector = respuesta.body.getReader()
  const decodificador = new TextDecoder()
  let pendiente = ""
  let texto = ""
  let modelo = entorno.iaModeloOpenRouter
  let motivo: string | null | undefined = null
  let uso: Fragmento["usage"] | undefined

  for (;;) {
    const { done, value } = await lector.read()
    if (done) break
    pendiente += decodificador.decode(value, { stream: true })
    const lineas = pendiente.split("\n")
    pendiente = lineas.pop() ?? ""
    for (const linea of lineas) {
      const l = linea.trim()
      if (!l.startsWith("data:")) continue // comentarios de keep-alive (": OPENROUTER PROCESSING")
      const dato = l.slice(5).trim()
      if (dato === "[DONE]") continue
      let f: Fragmento
      try {
        f = JSON.parse(dato)
      } catch {
        continue
      }
      if (f.error) throw new ErrorIA(mensajePorEstado(f.error.code), f.error.code)
      if (f.model) modelo = f.model
      if (f.usage) uso = f.usage
      const eleccion = f.choices?.[0]
      const delta = eleccion?.delta?.content
      if (delta) {
        texto += delta
        alTexto?.(delta)
      }
      if (eleccion?.finish_reason) motivo = eleccion.finish_reason
    }
  }

  return {
    texto,
    modelo,
    entradaTokens: uso?.prompt_tokens ?? null,
    salidaTokens: uso?.completion_tokens ?? null,
    final: motivo === "content_filter" ? "rechazo" : motivo === "length" ? "cortado" : "ok",
  }
}

// ---------------------------------------------------------------------
// JSON validado (clasificaciones)
// ---------------------------------------------------------------------
export async function generarJSON<T extends z.ZodType>(
  esquema: T,
  nombre: string,
  pedido: PedidoIA,
): Promise<{ datos: z.infer<T> | null; modelo: string; entradaTokens: number | null; salidaTokens: number | null }> {
  const proveedor = entorno.iaProveedor
  if (!proveedor) throw new ErrorIA("La IA no está configurada en este entorno.")

  if (proveedor === "anthropic") {
    try {
      const r = await clienteIA().messages.parse({
        model: entorno.iaModelo,
        max_tokens: pedido.maxTokens,
        output_config: { effort: pedido.esfuerzo ?? "low", format: zodOutputFormat(esquema) },
        system: pedido.sistema,
        messages: [{ role: "user", content: pedido.usuario }],
      })
      return {
        datos: r.stop_reason === "refusal" ? null : (r.parsed_output as z.infer<T> | null),
        modelo: r.model,
        entradaTokens: r.usage.input_tokens,
        salidaTokens: r.usage.output_tokens,
      }
    } catch (error) {
      if (error instanceof Anthropic.APIError) throw new ErrorIA(mensajePorEstado(error.status), error.status)
      throw error
    }
  }

  const respuesta = await fetch(URL_OPENROUTER, {
    method: "POST",
    headers: cabecerasOpenRouter(),
    signal: pedido.signal,
    body: JSON.stringify({
      model: entorno.iaModeloOpenRouter,
      max_tokens: pedido.maxTokens,
      reasoning: razonamiento(pedido.esfuerzo ?? "low"),
      response_format: { type: "json_schema", json_schema: { name: nombre, strict: true, schema: z.toJSONSchema(esquema) } },
      messages: [
        { role: "system", content: pedido.sistema },
        { role: "user", content: pedido.usuario },
      ],
    }),
  })
  if (!respuesta.ok) throw new ErrorIA(mensajePorEstado(respuesta.status), respuesta.status)
  const cuerpo = (await respuesta.json()) as {
    model?: string
    choices?: { message?: { content?: string | null } }[]
    usage?: { prompt_tokens?: number; completion_tokens?: number }
  }
  const contenido = (cuerpo.choices?.[0]?.message?.content ?? "").replace(/^```(?:json)?\s*|\s*```$/g, "")
  let datos: z.infer<T> | null = null
  try {
    const validado = esquema.safeParse(JSON.parse(contenido))
    datos = validado.success ? validado.data : null
  } catch {
    datos = null
  }
  return {
    datos,
    modelo: cuerpo.model ?? entorno.iaModeloOpenRouter,
    entradaTokens: cuerpo.usage?.prompt_tokens ?? null,
    salidaTokens: cuerpo.usage?.completion_tokens ?? null,
  }
}
