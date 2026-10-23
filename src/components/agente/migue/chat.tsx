"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowUp, Info, Loader2, RotateCcw, Square, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Markdown } from "@/components/markdown"
import { sugerenciasAsistente } from "@/lib/asistente"
import { cn } from "@/lib/utils"
import { AvatarMigue } from "./avatar"
import { useMigue } from "./contexto"

export type TramiteEnfocado = { id: string; numero?: string; tipo?: string }

/**
 * La conversación con Migue. En la pantalla completa el campo para escribir queda fijo
 * abajo; en el panel (burbuja flotante) el hilo se desplaza dentro del panel.
 */
export function ChatMigue({
  enfocado,
  modo,
  pantalla,
  alCerrar,
}: {
  enfocado: TramiteEnfocado | null
  modo: "pagina" | "panel"
  /** Ruta desde la que escribe, sin el prefijo de la vista previa. */
  pantalla?: string
  alCerrar?: () => void
}) {
  const { nombre, mensajes, generando, restantes, disponible, habilitado, demo, base, preguntar, detener, reiniciar } = useMigue()
  const [entrada, setEntrada] = useState("")
  const final = useRef<HTMLDivElement>(null)
  const panel = modo === "panel"

  // Al preguntar y al terminar cada respuesta, deja a la vista lo último.
  const cantidad = mensajes.length
  useEffect(() => {
    if (cantidad) final.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [cantidad, generando])

  const enviar = (texto: string) => {
    if (!texto.trim() || generando || !habilitado) return
    setEntrada("")
    void preguntar(texto, { expedienteId: enfocado?.id ?? null, pantalla })
  }

  return (
    <div className={cn("flex w-full flex-col gap-4", panel ? "h-full min-h-0 p-4 sm:p-5" : "mx-auto max-w-3xl")}>
      {panel && (
        <div className="flex items-start gap-3">
          <AvatarMigue tamano="md" />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold">Migue</h2>
            <p className="text-sm text-muted-foreground">Tu asistente para los trámites de Capital Humano.</p>
          </div>
          {mensajes.length > 0 && (
            <Button variant="ghost" size="sm" onClick={reiniciar} disabled={generando}>
              <RotateCcw /> Empezar de cero
            </Button>
          )}
          {alCerrar && (
            <Button variant="ghost" size="icon-sm" onClick={alCerrar} aria-label="Cerrar Migue">
              <X />
            </Button>
          )}
        </div>
      )}

      <div className="flex items-start gap-2 rounded-xl border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        <span>
          Migue responde con tus trámites y el catálogo de Capital Humano. No inicia trámites ni decide: eso lo hace el área. Puede
          equivocarse: ante la duda, consultá en Capital Humano.
        </span>
      </div>

      {enfocado && (
        <div className="flex items-center gap-2 self-start rounded-full border bg-card py-1 pr-1 pl-3 text-sm">
          <span className="text-muted-foreground">Sobre</span>
          <span className="font-medium">{enfocado.tipo ?? "este trámite"}</span>
          {enfocado.numero && <span className="font-mono text-xs text-muted-foreground tabular">{enfocado.numero}</span>}
          {!panel && (
            <Button asChild size="icon-xs" variant="ghost" aria-label="Preguntar sobre todos mis trámites">
              <Link href={`${base}/migue`}>
                <X />
              </Link>
            </Button>
          )}
        </div>
      )}

      <div className={cn("flex flex-col gap-5", panel && "min-h-0 flex-1 overflow-y-auto pr-1")}>
        {mensajes.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-2 py-6 text-center sm:py-10">
            <AvatarMigue tamano="lg" className="border-[3px]" />
            <h2 className="text-lg font-semibold">
              Hola{nombre ? `, ${nombre}` : ""}. Soy Migue.
            </h2>
            <p className="text-sm text-muted-foreground">Podés arrancar por acá:</p>
            <div className="flex w-full max-w-md flex-col gap-2">
              {sugerenciasAsistente(Boolean(enfocado)).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => enviar(s)}
                  disabled={!habilitado}
                  className="rounded-xl border bg-card px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ol className="flex flex-col gap-4" aria-live="polite">
            {mensajes.map((m, i) =>
              m.rol === "usuario" ? (
                <li key={i} className="max-w-[85%] self-end rounded-2xl rounded-br-md border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm whitespace-pre-wrap">
                  {m.texto}
                </li>
              ) : (
                <li key={i} className="flex max-w-full gap-2.5">
                  <AvatarMigue tamano="xs" className="mt-0.5" />
                  <div className={cn("min-w-0 flex-1 rounded-2xl rounded-tl-md border bg-card px-4 py-3 text-sm", m.error && "text-muted-foreground")}>
                    {m.texto ? (
                      <Markdown className="[&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_ul]:space-y-1">
                        {m.texto + (generando && i === mensajes.length - 1 ? " ▍" : "")}
                      </Markdown>
                    ) : (
                      <p className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" /> Migue está pensando…
                      </p>
                    )}
                  </div>
                </li>
              ),
            )}
          </ol>
        )}
        <div ref={final} aria-hidden className={cn("-mt-5", !panel && "scroll-mb-40 sm:scroll-mb-28")} />
      </div>

      <form
        className={cn(
          "rounded-2xl border bg-background/95 p-2 shadow-lg shadow-primary/5 backdrop-blur",
          !panel && "sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] sm:bottom-4",
          // En la vista previa, por encima de la barra de demo.
          !panel && demo && "bottom-[calc(8.5rem+env(safe-area-inset-bottom))] sm:bottom-16",
        )}
        onSubmit={(e) => {
          e.preventDefault()
          enviar(entrada)
        }}
      >
        <div className="flex items-end gap-2">
          <Textarea
            value={entrada}
            onChange={(e) => setEntrada(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                enviar(entrada)
              }
            }}
            placeholder={habilitado ? "Preguntale a Migue…" : disponible ? "Llegaste al límite de consultas de hoy" : "Migue no está disponible en este momento"}
            aria-label="Pregunta para Migue"
            maxLength={1000}
            rows={1}
            disabled={!habilitado}
            className="max-h-40 min-h-10 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
          />
          {generando && !demo ? (
            <Button type="button" size="icon" variant="outline" onClick={detener} aria-label="Detener">
              <Square />
            </Button>
          ) : (
            <Button type="submit" size="icon" disabled={!entrada.trim() || generando || !habilitado} aria-label="Enviar">
              <ArrowUp />
            </Button>
          )}
        </div>
      </form>

      {!panel && mensajes.length > 0 && (
        <div className="-mt-2 flex justify-center">
          <Button variant="ghost" size="sm" onClick={reiniciar} disabled={generando} className="text-muted-foreground">
            <RotateCcw /> Empezar de cero
          </Button>
        </div>
      )}
      {!demo && disponible && <p className="-mt-3 text-center text-[0.7rem] text-muted-foreground">Te quedan {restantes} consultas hoy.</p>}
    </div>
  )
}
