"use client"

import { useState } from "react"
import { ScanSearch } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { duracionHoras, type FilaRadiografia } from "@/lib/tablero-datos"
import { cn } from "@/lib/utils"

const VISIBLES = 8

/**
 * Radiografía de los circuitos: una barra por trámite con lo que tarda cada paso (mediana de las estadías cumplidas),
 * en una misma escala de días. El paso más lento se destaca; los que todavía tienen pocos casos van rayados, con su
 * plazo. La raya vertical es el objetivo del trámite.
 */
export function RadiografiaCircuitos({ filas }: { filas: FilaRadiografia[] }) {
  const [todas, setTodas] = useState(false)
  const [tabla, setTabla] = useState(false)
  if (filas.length === 0) {
    return (
      <p className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">
        Todavía no hay trámites con estadías cumplidas suficientes para medir sus pasos. Se completa sola a medida que se resuelven expedientes.
      </p>
    )
  }
  const max = Math.max(...filas.map((f) => Math.max(f.totalHoras, (f.plazoDias ?? 0) * 24)))
  const visibles = todas ? filas : filas.slice(0, VISIBLES)
  const pct = (h: number) => `${(h / max) * 100}%`

  return (
    <div className="viz space-y-4">
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground" aria-label="Referencias">
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm" style={{ background: "var(--serie-2)" }} /> Paso más lento
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm" style={{ background: "var(--serie-1)" }} /> Otros pasos medidos
        </li>
        <li className="flex items-center gap-1.5">
          <span className="rayado h-2.5 w-4 rounded-sm border border-dashed border-muted-foreground/50" /> Pocos casos: su plazo
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-0.5 rounded-full bg-foreground/70" /> Objetivo del trámite
        </li>
      </ul>

      {tabla ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 pr-3 text-left font-medium">Trámite</th>
                <th className="py-2 pr-3 text-left font-medium">Paso</th>
                <th className="py-2 pr-3 text-right font-medium">Mediana</th>
                <th className="py-2 pr-3 text-right font-medium">8 de cada 10, en menos de</th>
                <th className="py-2 text-right font-medium">Casos</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visibles.flatMap((f) =>
                f.pasos.map((p) => (
                  <tr key={`${f.codigo}-${p.orden}`}>
                    <td className="py-2 pr-3 text-muted-foreground">{p.orden === 1 ? f.nombre : ""}</td>
                    <td className={cn("py-2 pr-3", p.orden === f.lento && "font-medium")}>
                      {p.orden}. {p.nombre} <span className="text-xs text-muted-foreground">({p.area})</span>
                    </td>
                    <td className="py-2 pr-3 text-right tabular">{p.medido ? duracionHoras(p.horas) : "—"}</td>
                    <td className="py-2 pr-3 text-right tabular">{p.p80 != null ? duracionHoras(p.p80) : "—"}</td>
                    <td className="py-2 text-right tabular">{p.casos}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <ol className="space-y-4">
          {visibles.map((f) => {
            const lento = f.pasos.find((p) => p.orden === f.lento)!
            const parte = Math.round((lento.horas / f.totalHoras) * 100)
            return (
              <li key={f.codigo}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 line-clamp-2 leading-snug font-medium sm:line-clamp-1">{f.nombre}</span>
                  <span className="shrink-0 text-muted-foreground tabular">
                    {duracionHoras(f.totalHoras)}
                    {f.plazoDias ? <span className="text-xs"> · objetivo {f.plazoDias} d</span> : null}
                  </span>
                </div>
                <div className="relative h-6">
                  <div className="absolute inset-y-0 left-0 flex gap-[2px]" style={{ width: pct(f.totalHoras) }}>
                    {f.pasos.map((p, i) => (
                      <Tooltip key={p.orden}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="group flex h-full min-w-[3px] items-center outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            style={{ flexGrow: p.horas, flexBasis: 0 }}
                            aria-label={`${p.nombre}, ${p.area}: ${p.medido ? `mediana ${duracionHoras(p.horas)}` : `pocos casos, plazo ${duracionHoras(p.horas)}`}`}
                          >
                            <span
                              className={cn(
                                "h-3.5 w-full transition-[filter,height] group-hover:h-5 group-hover:brightness-110",
                                i === 0 && "rounded-l",
                                i === f.pasos.length - 1 && "rounded-r",
                                !p.medido && "rayado border border-dashed border-muted-foreground/50",
                              )}
                              style={p.medido ? { background: p.orden === f.lento ? "var(--serie-2)" : "var(--serie-1)" } : undefined}
                            />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-64">
                          <p className="font-medium">
                            {p.orden}. {p.nombre}
                          </p>
                          <p className="opacity-80">{p.area}</p>
                          {p.medido ? (
                            <p className="mt-1">
                              Mediana {duracionHoras(p.horas)}; 8 de cada 10, en menos de {duracionHoras(p.p80 ?? p.horas)}. {p.casos} casos.
                            </p>
                          ) : (
                            <p className="mt-1">
                              {p.casos ? `Solo ${p.casos} ${p.casos === 1 ? "caso" : "casos"}` : "Sin casos todavía"}: se muestra su plazo ({duracionHoras(p.horas)}).
                            </p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                  {f.plazoDias ? (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 rounded-full bg-foreground/70"
                      style={{ left: pct(f.plazoDias * 24) }}
                    />
                  ) : null}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Más lento: <span className="text-foreground">{lento.nombre}</span> ({lento.area}), {duracionHoras(lento.horas)}
                  {f.pasos.length > 1 && ` · ${parte} % del recorrido`}
                </p>
              </li>
            )
          })}
        </ol>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ScanSearch className="size-3.5" /> Mediana de las estadías cumplidas en el último año. Pasá el mouse por cada tramo.
        </p>
        <div className="flex gap-1">
          {filas.length > VISIBLES && (
            <Button variant="ghost" size="xs" onClick={() => setTodas((t) => !t)}>
              {todas ? "Ver menos" : `Ver los ${filas.length} trámites`}
            </Button>
          )}
          <Button variant="ghost" size="xs" onClick={() => setTabla((t) => !t)}>
            {tabla ? "Ver el gráfico" : "Ver como tabla"}
          </Button>
        </div>
      </div>
    </div>
  )
}
