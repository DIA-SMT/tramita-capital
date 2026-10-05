import { Lock, Sparkles } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { Enum } from "@/lib/database.types"
import { ESTADOS, PRIORIDADES, semaforo, type Semaforo } from "@/lib/dominio"
import { cn } from "@/lib/utils"

export function InsigniaEstado({ estado, className }: { estado: Enum<"estado_expediente">; className?: string }) {
  const e = ESTADOS[estado]
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", e.clase, className)}>
      <span className={cn("size-1.5 rounded-full", e.punto)} />
      {e.etiqueta}
    </span>
  )
}

export function InsigniaPrioridad({
  prioridad,
  motivo,
  origen,
  className,
}: {
  prioridad: Enum<"prioridad_expediente">
  motivo?: string | null
  origen?: string
  className?: string
}) {
  const p = PRIORIDADES[prioridad]
  const insignia = (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium", p.clase, className)}>
      {origen === "ia" && <Sparkles className="size-3" />}
      {p.etiqueta}
    </span>
  )
  if (!motivo) return insignia
  return (
    <Tooltip>
      <TooltipTrigger asChild>{insignia}</TooltipTrigger>
      <TooltipContent className="max-w-xs">
        {origen === "ia" ? "Sugerido por IA: " : ""}
        {motivo}
      </TooltipContent>
    </Tooltip>
  )
}

const SEMAFORO: Record<Semaforo, { clase: string; texto: string }> = {
  verde: { clase: "bg-emerald-500", texto: "En plazo" },
  amarillo: { clase: "bg-amber-500", texto: "Vence en menos de 24 h" },
  rojo: { clase: "bg-rose-500 animate-pulse", texto: "Vencido" },
  sin_plazo: { clase: "bg-zinc-300 dark:bg-zinc-600", texto: "Sin plazo" },
}

export function PuntoSemaforo({ venceAt, estado }: { venceAt: string | null; estado: Enum<"estado_expediente"> }) {
  const s = SEMAFORO[semaforo(venceAt, estado)]
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("inline-block size-2.5 shrink-0 rounded-full", s.clase)} aria-label={s.texto} />
      </TooltipTrigger>
      <TooltipContent>{s.texto}</TooltipContent>
    </Tooltip>
  )
}

export function InsigniaReservado() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1 rounded-md bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-300">
          <Lock className="size-3" /> Reservado
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        Contiene datos sensibles: solo lo ven el agente, el área que lo tiene y el personal autorizado.
      </TooltipContent>
    </Tooltip>
  )
}
