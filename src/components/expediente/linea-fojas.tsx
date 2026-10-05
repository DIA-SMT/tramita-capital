import {
  AlertTriangle,
  ArrowRightLeft,
  ClipboardList,
  FileInput,
  Fingerprint,
  MessageSquareText,
  Paperclip,
  Reply,
  Scale,
  Send,
  Sparkles,
  Stamp,
  StickyNote,
  type LucideIcon,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Markdown } from "@/components/markdown"
import type { Enum, Fila } from "@/lib/database.types"
import { fechaHora, haceCuanto, TIPOS_ACTUACION } from "@/lib/dominio"
import { cn } from "@/lib/utils"

const ESTILO: Record<Enum<"tipo_actuacion">, { icono: LucideIcon; clase: string }> = {
  presentacion: { icono: FileInput, clase: "bg-sky-500/10 text-sky-600 dark:text-sky-300" },
  documento: { icono: Paperclip, clase: "bg-slate-500/10 text-slate-600 dark:text-slate-300" },
  providencia: { icono: MessageSquareText, clase: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300" },
  informe: { icono: ClipboardList, clase: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300" },
  dictamen: { icono: Scale, clase: "bg-violet-500/10 text-violet-600 dark:text-violet-300" },
  resolucion: { icono: Stamp, clase: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  notificacion: { icono: Send, clase: "bg-teal-500/10 text-teal-700 dark:text-teal-300" },
  observacion: { icono: AlertTriangle, clase: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  subsanacion: { icono: Reply, clase: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  pase: { icono: ArrowRightLeft, clase: "bg-muted text-muted-foreground" },
  nota: { icono: StickyNote, clase: "bg-muted text-muted-foreground" },
}

const DESTACADAS: Enum<"tipo_actuacion">[] = ["dictamen", "resolucion", "observacion"]

export type FojaVista = Pick<
  Fila<"actuaciones">,
  "id" | "foja" | "tipo" | "titulo" | "contenido" | "firmada_at" | "firmada_por" | "hash" | "generada_por_ia"
> & { area?: string | null }

/** Las fojas firmadas del expediente, de la más reciente a la más antigua. */
export function LineaFojas({ fojas, firmantes }: { fojas: FojaVista[]; firmantes: Record<string, string> }) {
  if (fojas.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Todavía no hay fojas incorporadas.</p>
  }
  const ordenadas = [...fojas].sort((a, b) => (b.foja ?? 0) - (a.foja ?? 0))

  return (
    <ol className="relative">
      {ordenadas.map((f, i) => {
        const e = ESTILO[f.tipo]
        const destacada = DESTACADAS.includes(f.tipo)
        return (
          <li key={f.id} className="relative flex gap-4 pb-6 last:pb-0 animate-in fade-in slide-in-from-bottom-1" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
            {i < ordenadas.length - 1 && <span aria-hidden className="absolute top-10 bottom-0 left-[1.1rem] w-px bg-border" />}
            <span className={cn("relative z-10 grid size-9 shrink-0 place-items-center rounded-xl", e.clase)}>
              <e.icono className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                <span className="font-mono font-medium text-foreground tabular">Foja {f.foja}</span>
                <span>·</span>
                <span className="font-medium">{TIPOS_ACTUACION[f.tipo]}</span>
                {f.area && (
                  <>
                    <span>·</span>
                    <span>{f.area}</span>
                  </>
                )}
                {f.firmada_at && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="ml-auto cursor-default">{haceCuanto(f.firmada_at)}</span>
                    </TooltipTrigger>
                    <TooltipContent>{fechaHora(f.firmada_at)}</TooltipContent>
                  </Tooltip>
                )}
              </div>
              <div
                className={cn(
                  "mt-1.5",
                  destacada && "rounded-xl border bg-card p-4 shadow-sm",
                  f.tipo === "observacion" && "border-amber-500/30 bg-amber-500/5",
                )}
              >
                <p className={cn("text-sm font-medium", destacada && "mb-2")}>{f.titulo}</p>
                {f.contenido && <Markdown className={cn(!destacada && "mt-1 text-sm text-muted-foreground")}>{f.contenido}</Markdown>}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {f.firmada_por && <span>Firmó: {firmantes[f.firmada_por] ?? "—"}</span>}
                  {f.generada_por_ia && (
                    <span className="inline-flex items-center gap-1">
                      <Sparkles className="size-3" /> Borrador asistido por IA, revisado y firmado
                    </span>
                  )}
                  {f.hash && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex cursor-default items-center gap-1 font-mono">
                          <Fingerprint className="size-3" />
                          {f.hash.slice(0, 10)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        Huella SHA-256 encadenada con la foja anterior. Si alguien alterara esta foja, la cadena dejaría de validar.
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
