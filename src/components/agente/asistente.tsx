"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowUp, Loader2, Sparkles, Square, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Markdown } from "@/components/markdown"
import { respuestaDemo, sugerenciasAsistente, type DatosAsistente } from "@/lib/asistente"
import { cn } from "@/lib/utils"

type Mensaje = { rol: "usuario" | "asistente"; texto: string; error?: boolean }

/**
 * Chat del asistente. Manda la conversación sin los intercambios fallidos,
 * para que siempre alterne persona → asistente.
 */
function historialValido(mensajes: Mensaje[]) {
  const pares: Mensaje[] = []
  for (let i = 0; i + 1 < mensajes.length; i += 2) {
    if (!mensajes[i + 1].error) pares.push(mensajes[i], mensajes[i + 1])
  }
  return pares.map(({ rol, texto }) => ({ rol, texto }))
}

export function Asistente({
  nombre,
  enfocado,
  restantes: restantesIniciales,
  disponible,
  base = "",
  demo = false,
  datosDemo,
}: {
  nombre: string
  enfocado: { id: string; numero: string; tipo: string } | null
  restantes: number
  disponible: boolean
  base?: string
  demo?: boolean
  datosDemo?: DatosAsistente
}) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [entrada, setEntrada] = useState("")
  const [generando, setGenerando] = useState(false)
  const [restantes, setRestantes] = useState(restantesIniciales)
  const cancelador = useRef<AbortController | null>(null)
  const final = useRef<HTMLDivElement>(null)
  const habilitado = demo || (disponible && restantes > 0)

  // Al preguntar y al terminar cada respuesta, deja a la vista lo último.
  const cantidad = mensajes.length
  useEffect(() => {
    if (cantidad) final.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [cantidad, generando])

  const agregar = (delta: string) =>
    setMensajes((m) => {
      const ultimo = m.at(-1)!
      return [...m.slice(0, -1), { ...ultimo, texto: ultimo.texto + delta }]
    })

  async function preguntar(texto: string) {
    const pregunta = texto.trim()
    if (!pregunta || generando || !habilitado) return
    const previos = historialValido(mensajes)
    setEntrada("")
    setMensajes((m) => [...m, { rol: "usuario", texto: pregunta }, { rol: "asistente", texto: "" }])
    setGenerando(true)

    if (demo && datosDemo) {
      await new Promise((r) => setTimeout(r, 500))
      for (const palabra of respuestaDemo(pregunta, datosDemo, base).split(/(?<=\s)/)) {
        await new Promise((r) => setTimeout(r, 16))
        agregar(palabra)
      }
      return setGenerando(false)
    }

    cancelador.current = new AbortController()
    try {
      const r = await fetch("/api/ia/asistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expedienteId: enfocado?.id, mensajes: [...previos, { rol: "usuario", texto: pregunta }] }),
        signal: cancelador.current.signal,
      })
      if (!r.ok || !r.body) throw new Error((await r.json().catch(() => null))?.error ?? "No se pudo responder")
      const quedan = Number(r.headers.get("X-Consultas-Restantes"))
      if (Number.isFinite(quedan)) setRestantes(quedan)
      const lector = r.body.getReader()
      const decodificador = new TextDecoder()
      for (;;) {
        const { done, value } = await lector.read()
        if (done) break
        agregar(decodificador.decode(value, { stream: true }))
      }
    } catch (e) {
      const cancelado = e instanceof DOMException && e.name === "AbortError"
      setMensajes((m) => [
        ...m.slice(0, -1),
        { rol: "asistente", texto: cancelado ? m.at(-1)!.texto || "Consulta cancelada." : e instanceof Error ? e.message : "No se pudo responder", error: true },
      ])
    } finally {
      setGenerando(false)
    }
  }

  const sugerencias = sugerenciasAsistente(Boolean(enfocado))

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      {enfocado && (
        <div className="flex items-center gap-2 self-start rounded-full border bg-card py-1 pr-1 pl-3 text-sm">
          <span className="text-muted-foreground">Sobre</span>
          <span className="font-medium">{enfocado.tipo}</span>
          <span className="font-mono text-xs text-muted-foreground tabular">{enfocado.numero}</span>
          <Button asChild size="icon-xs" variant="ghost" aria-label="Preguntar sobre todos mis trámites">
            <Link href={`${base}/asistente`}>
              <X />
            </Link>
          </Button>
        </div>
      )}

      {mensajes.length === 0 ? (
        <div className="relative overflow-hidden rounded-3xl border bg-card px-6 py-10 text-center sm:py-12">
          <div className="fondo-marca pointer-events-none absolute inset-0 opacity-70" aria-hidden />
          <div className="relative">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-marca-2 to-marca-1 text-white shadow-lg shadow-primary/30">
              <Sparkles className="size-6" />
            </span>
            <h2 className="mt-5 text-lg font-semibold">Hola{nombre ? `, ${nombre}` : ""}. ¿En qué te ayudo?</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Preguntame en qué están tus trámites, qué te falta presentar o qué pide cada trámite. Respondo con tus datos y el catálogo de
              Capital Humano.
            </p>
            <div className="mx-auto mt-6 flex max-w-lg flex-wrap justify-center gap-2">
              {sugerencias.map((s) => (
                <Button key={s} variant="outline" size="sm" className="h-auto rounded-full bg-background/80 py-1.5 whitespace-normal" onClick={() => preguntar(s)} disabled={!habilitado}>
                  {s}
                </Button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <ol className="flex flex-col gap-5" aria-live="polite">
          {mensajes.map((m, i) =>
            m.rol === "usuario" ? (
              <li key={i} className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm whitespace-pre-wrap text-primary-foreground">
                {m.texto}
              </li>
            ) : (
              <li key={i} className="flex max-w-full gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-marca-2 to-marca-1 text-white">
                  <Sparkles className="size-4" />
                </span>
                <div className={cn("min-w-0 flex-1 pt-1 text-sm", m.error && "text-muted-foreground")}>
                  {m.texto ? (
                    <Markdown className="[&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_ul]:space-y-1">
                      {m.texto + (generando && i === mensajes.length - 1 ? " ▍" : "")}
                    </Markdown>
                  ) : (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" /> Revisando tus trámites…
                    </p>
                  )}
                </div>
              </li>
            ),
          )}
        </ol>
      )}
      <div ref={final} aria-hidden className="-mt-6 scroll-mb-40 sm:scroll-mb-28" />

      <form
        className={cn(
          "sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] rounded-2xl border bg-background/95 p-2 shadow-lg shadow-primary/5 backdrop-blur sm:bottom-4",
          // En la vista previa, por encima de la barra de demo.
          demo && "bottom-[calc(8.5rem+env(safe-area-inset-bottom))] sm:bottom-16",
        )}
        onSubmit={(e) => {
          e.preventDefault()
          preguntar(entrada)
        }}
      >
        <div className="flex items-end gap-2">
          <Textarea
            value={entrada}
            onChange={(e) => setEntrada(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                preguntar(entrada)
              }
            }}
            placeholder={habilitado ? "Escribí tu consulta…" : disponible ? "Llegaste al límite de consultas de hoy" : "El asistente no está disponible en este momento"}
            aria-label="Tu consulta"
            maxLength={1000}
            rows={1}
            disabled={!habilitado}
            className="max-h-40 min-h-10 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
          {generando && !demo ? (
            <Button type="button" size="icon" variant="outline" onClick={() => cancelador.current?.abort()} aria-label="Detener">
              <Square />
            </Button>
          ) : (
            <Button type="submit" size="icon" disabled={!entrada.trim() || generando || !habilitado} aria-label="Enviar">
              <ArrowUp />
            </Button>
          )}
        </div>
      </form>

      <p className="-mt-3 text-center text-[0.7rem] text-muted-foreground">
        Responde con IA a partir de tus trámites y del catálogo. Puede equivocarse: ante la duda, consultá en Capital Humano.
        {!demo && disponible && ` Te quedan ${restantes} consultas hoy.`}
      </p>
    </div>
  )
}
