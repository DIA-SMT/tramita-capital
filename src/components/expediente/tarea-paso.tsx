"use client"

import { useState } from "react"
import { ArrowRight, CheckCircle2, Circle, CircleDashed, FileCheck2, FileWarning, Paperclip, PenLine, Sparkles, Stamp, Undo2, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { estadoDocumento, estaPresente, formaDeGenerar, type FormaDeGenerar } from "@/lib/relevamiento"
import type { Enum } from "@/lib/database.types"
import { cn } from "@/lib/utils"

export type PasoConfigurado = {
  orden: number
  nombre: string
  area: string
  controles: string[]
  revisa: string[]
  genera: string[]
  permite_subsanacion: boolean
  destino_final: string | null
  instrucciones?: string | null
}

/**
 * Lo que la oficina tiene que hacer en este paso, tal como lo define el relevamiento
 * (FINAL DIGITAL): qué controlar, qué documentación revisar, qué producir y adónde sigue.
 */
export function TareaDelPaso({
  paso,
  siguiente,
  total,
  documentos,
  fojas,
  etiquetasRequisitos,
  puedeActuar,
  alGenerar,
  alPasar,
  alObservar,
}: {
  paso: PasoConfigurado
  siguiente: { nombre: string; area: string } | null
  total: number
  documentos: { requisito_clave: string | null; nombre_archivo: string }[]
  fojas: { tipo: Enum<"tipo_actuacion">; titulo: string; firmada: boolean }[]
  etiquetasRequisitos: Record<string, string>
  puedeActuar: boolean
  alGenerar: (nombre: string, forma: FormaDeGenerar) => void
  alPasar: () => void
  alObservar: () => void
}) {
  const [hechos, setHechos] = useState<Record<number, boolean>>({})
  const presente = { documentos, fojas, etiquetasRequisitos }
  const revisar = paso.revisa.map((r) => ({ nombre: r, ok: estaPresente(r, presente) }))
  const generar = paso.genera.map((g) => {
    const estado = estadoDocumento(g, presente)
    return { nombre: g, estado, ok: estado === "listo", forma: formaDeGenerar(g) }
  })
  const faltanRevisar = revisar.filter((r) => !r.ok).length
  const faltanGenerar = generar.filter((g) => !g.ok && g.forma.tipo !== "automatico").length

  return (
    <section className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.06] to-transparent p-4">
      <p className="text-[0.7rem] font-semibold tracking-wide text-primary uppercase">
        Paso {paso.orden} de {total} · {paso.area}
      </p>
      <h2 className="mt-1 text-sm font-medium">{paso.nombre}</h2>
      {paso.instrucciones && <p className="mt-2 rounded-lg bg-background/70 px-2.5 py-1.5 text-xs text-muted-foreground">{paso.instrucciones}</p>}

      {paso.controles.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Qué controlar</p>
          <ul className="space-y-1.5">
            {paso.controles.map((c, i) => (
              <li key={c} className="flex items-start gap-2">
                <Checkbox
                  id={`control-${i}`}
                  checked={!!hechos[i]}
                  onCheckedChange={(v) => setHechos((h) => ({ ...h, [i]: v === true }))}
                  className="mt-0.5"
                  disabled={!puedeActuar}
                />
                <Label htmlFor={`control-${i}`} className={cn("text-sm leading-snug font-normal", hechos[i] && "text-muted-foreground line-through")}>
                  {c}
                </Label>
              </li>
            ))}
          </ul>
        </div>
      )}

      {revisar.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
            Documentación a revisar
            {faltanRevisar > 0 ? (
              <span className="text-amber-700 dark:text-amber-300">{faltanRevisar} sin cargar</span>
            ) : (
              <span className="text-emerald-700 dark:text-emerald-400">Completa</span>
            )}
          </p>
          <ul className="space-y-1">
            {revisar.map((r) => (
              <li key={r.nombre} className="flex items-center gap-2 text-sm">
                {r.ok ? <FileCheck2 className="size-4 shrink-0 text-emerald-600" /> : <FileWarning className="size-4 shrink-0 text-amber-600" />}
                <span className={cn(!r.ok && "text-muted-foreground")}>{r.nombre}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {generar.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Qué produce esta oficina</p>
          <ul className="space-y-1.5">
            {generar.map((g) => (
              <li key={g.nombre} className="flex items-center gap-2 text-sm">
                {g.ok ? (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                ) : g.estado === "borrador" ? (
                  <CircleDashed className="size-4 shrink-0 text-amber-600" />
                ) : (
                  <Circle className="size-4 shrink-0 text-muted-foreground/50" />
                )}
                <span className="min-w-0 flex-1">
                  {g.nombre}
                  {g.estado === "borrador" && <span className="block text-xs text-amber-700 dark:text-amber-300">Borrador sin firmar</span>}
                  {g.forma.tipo === "adjunto" && !g.ok && <span className="block text-xs text-muted-foreground">Se adjunta desde {g.forma.origen}</span>}
                  {g.forma.tipo === "automatico" && <span className="block text-xs text-muted-foreground">{g.forma.etiqueta}</span>}
                </span>
                {!g.ok && puedeActuar && g.forma.tipo !== "automatico" && (
                  <Button size="xs" variant={g.forma.tipo === "firma" ? "default" : "outline"} onClick={() => alGenerar(g.nombre, g.forma)}>
                    {g.estado === "borrador" || (g.forma.tipo === "ia" && g.forma.documento === "nota") ? <PenLine /> : g.forma.tipo === "ia" ? <Sparkles /> : g.forma.tipo === "firma" ? <Stamp /> : g.forma.tipo === "adjunto" ? <Paperclip /> : <Wand2 />}
                    {g.estado === "borrador" ? "Revisar y firmar" : g.forma.etiqueta}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 border-t pt-3">
        {siguiente ? (
          <p className="text-xs text-muted-foreground">
            Después: <span className="font-medium text-foreground">{siguiente.area}</span> · {siguiente.nombre}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Cierre: <span className="font-medium text-foreground">{paso.destino_final ?? "notificación al agente y archivo"}</span>
          </p>
        )}
        {puedeActuar && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={alPasar} disabled={faltanGenerar > 0} className="flex-1">
              <ArrowRight /> {siguiente ? `Pasar a ${siguiente.area}` : "Notificar y archivar"}
            </Button>
            {paso.permite_subsanacion && (
              <Button size="sm" variant="outline" onClick={alObservar}>
                <Undo2 /> Devolver al agente
              </Button>
            )}
          </div>
        )}
        {puedeActuar && faltanGenerar > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            {siguiente ? "Para pasar" : "Para cerrar"}, primero completá y firmá lo que produce esta oficina.
          </p>
        )}
      </div>
    </section>
  )
}
