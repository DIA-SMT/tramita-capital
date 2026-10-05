import { Check } from "lucide-react"
import type { Enum } from "@/lib/database.types"
import { cn } from "@/lib/utils"

export type PasoVista = { orden: number; nombre: string; area: string }

/** Cursograma del trámite con el paso actual resaltado. */
export function Circuito({
  pasos,
  pasoActual,
  estado,
}: {
  pasos: PasoVista[]
  pasoActual: number
  estado: Enum<"estado_expediente">
}) {
  const cerrado = estado === "archivado" || estado === "rechazado"
  return (
    <ol className="grid gap-3 sm:flex sm:gap-0">
      {pasos.map((p, i) => {
        const hecho = cerrado || p.orden < pasoActual
        const actual = !cerrado && p.orden === pasoActual
        return (
          <li key={p.orden} className="relative flex items-start gap-3 sm:flex-1 sm:flex-col sm:items-center sm:gap-2 sm:text-center">
            {i < pasos.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "absolute top-8 left-[0.95rem] h-[calc(100%-1rem)] w-px sm:top-[0.95rem] sm:left-[calc(50%+1.1rem)] sm:h-px sm:w-[calc(100%-2.2rem)]",
                  hecho ? "bg-primary" : "bg-border",
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 grid size-8 shrink-0 place-items-center rounded-full border text-xs font-semibold tabular transition-colors",
                hecho && "border-primary bg-primary text-primary-foreground",
                actual && "border-primary bg-background text-primary ring-4 ring-primary/15",
                !hecho && !actual && "bg-background text-muted-foreground",
              )}
            >
              {hecho ? <Check className="size-4" /> : p.orden}
              {actual && <span className="absolute inset-0 animate-ping rounded-full border border-primary/40" />}
            </span>
            <span className="min-w-0 pt-1 sm:px-2 sm:pt-0">
              <span className={cn("block text-sm leading-tight font-medium", !hecho && !actual && "text-muted-foreground")}>
                {p.nombre}
              </span>
              <span className="block text-xs text-muted-foreground">{p.area}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
