"use client"

import { useRef, useState } from "react"
import { Loader2, RotateCcw, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Markdown } from "@/components/markdown"

const RESUMEN_DEMO = `- **Qué pide:** licencia por examen de 3 días para rendir Derecho Administrativo el 09/10.
- **Qué se hizo:** Mesa de Entradas verificó la constancia de inscripción y lo pasó a Licencias.
- **Qué falta:** que Licencias confirme los días disponibles y lo pase a Despacho para el proyecto de resolución.
- **Alertas:** el certificado de examen rendido se presenta después del examen. Vence hoy el plazo objetivo de 2 días.`

/** Resumen del expediente con IA, a demanda y en vivo. */
export function ResumenIA({ expedienteId, disponible, demo = false }: { expedienteId: string; disponible: boolean; demo?: boolean }) {
  const [texto, setTexto] = useState("")
  const [estado, setEstado] = useState<"inicial" | "generando" | "listo" | "error">("inicial")
  const cancelador = useRef<AbortController | null>(null)

  async function generar() {
    setTexto("")
    setEstado("generando")
    if (demo) {
      for (const palabra of RESUMEN_DEMO.split(/(?<=\s)/)) {
        await new Promise((r) => setTimeout(r, 18))
        setTexto((t) => t + palabra)
      }
      setEstado("listo")
      return
    }
    cancelador.current = new AbortController()
    try {
      const r = await fetch("/api/ia/resumir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expedienteId }),
        signal: cancelador.current.signal,
      })
      if (!r.ok || !r.body) throw new Error((await r.json().catch(() => null))?.error ?? "No se pudo resumir")
      const lector = r.body.getReader()
      const decodificador = new TextDecoder()
      for (;;) {
        const { done, value } = await lector.read()
        if (done) break
        setTexto((t) => t + decodificador.decode(value, { stream: true }))
      }
      setEstado("listo")
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return setEstado("inicial")
      setTexto(e instanceof Error ? e.message : "No se pudo resumir")
      setEstado("error")
    }
  }

  return (
    <section className="relative overflow-hidden rounded-2xl border bg-card p-4">
      <div className="pointer-events-none absolute -top-12 -right-12 size-32 rounded-full bg-gradient-to-br from-marca-2/25 to-marca-1/10 blur-2xl" aria-hidden />
      <div className="relative flex items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        <h2 className="flex-1 text-sm font-medium">Resumen con IA</h2>
        {estado === "listo" && (
          <Button size="icon-xs" variant="ghost" onClick={generar} aria-label="Volver a resumir">
            <RotateCcw />
          </Button>
        )}
      </div>
      {estado === "inicial" ? (
        <div className="relative mt-2">
          <p className="text-sm text-muted-foreground">Qué pide, qué se hizo, qué falta y las alertas, en segundos.</p>
          <Button size="sm" variant="outline" className="mt-3 w-full" onClick={generar} disabled={!disponible && !demo}>
            <Sparkles /> Resumir expediente
          </Button>
          {!disponible && !demo && <p className="mt-2 text-xs text-muted-foreground">La IA no está configurada en este entorno.</p>}
        </div>
      ) : (
        <div className="relative mt-3 text-sm" aria-live="polite">
          {texto ? (
            <Markdown className="text-[0.85rem] [&_ul]:space-y-1.5">{texto + (estado === "generando" ? " ▍" : "")}</Markdown>
          ) : (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Leyendo el expediente…
            </p>
          )}
          {estado === "listo" && <p className="mt-3 text-[0.7rem] text-muted-foreground">Generado por IA a partir de las fojas. Verificá antes de decidir.</p>}
        </div>
      )}
    </section>
  )
}
