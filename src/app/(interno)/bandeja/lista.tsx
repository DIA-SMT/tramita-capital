"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AlarmClock, Flame, Hand, Inbox, Loader2, TimerOff, UserRoundX } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { IconoTramite } from "@/components/icono-tramite"
import { InsigniaEstado, InsigniaPrioridad, PuntoSemaforo } from "@/components/insignias"
import { haceCuanto, iniciales, nombreCompleto, PRIORIDADES, semaforo } from "@/lib/dominio"
import type { FilaBandeja } from "@/lib/vistas"
import { cn } from "@/lib/utils"
import { tomarExpediente } from "../expedientes/[id]/acciones"

type Foco = "todos" | "vencidos" | "hoy" | "urgentes" | "sin_asignar"

const NUEVO_HORAS = 3

export function ListaBandeja({
  expedientes,
  misAreas,
  usuarioId,
  base = "",
  demo = false,
}: {
  expedientes: FilaBandeja[]
  misAreas: string[]
  usuarioId: string
  base?: string
  demo?: boolean
}) {
  const router = useRouter()
  const [foco, setFoco] = useState<Foco>("todos")
  const [ahora] = useState(() => Date.now())
  const [seleccion, setSeleccion] = useState(0)
  const [pendiente, iniciar] = useTransition()
  const [tomando, setTomando] = useState<string | null>(null)
  const filas = useRef<(HTMLAnchorElement | null)[]>([])

  const conteos = useMemo(() => {
    const c = { vencidos: 0, hoy: 0, urgentes: 0, sin_asignar: 0 }
    for (const e of expedientes) {
      const s = semaforo(e.vence_at, e.estado)
      if (s === "rojo") c.vencidos++
      if (s === "amarillo") c.hoy++
      if (PRIORIDADES[e.prioridad].orden <= PRIORIDADES.alta.orden) c.urgentes++
      if (!e.asignado_a) c.sin_asignar++
    }
    return c
  }, [expedientes])

  const visibles = useMemo(() => {
    return expedientes.filter((e) => {
      if (foco === "vencidos") return semaforo(e.vence_at, e.estado) === "rojo"
      if (foco === "hoy") return semaforo(e.vence_at, e.estado) === "amarillo"
      if (foco === "urgentes") return PRIORIDADES[e.prioridad].orden <= PRIORIDADES.alta.orden
      if (foco === "sin_asignar") return !e.asignado_a
      return true
    })
  }, [expedientes, foco])

  // Atajos: j/k o flechas para moverse, Enter para abrir.
  useEffect(() => {
    const alTeclear = (ev: KeyboardEvent) => {
      const destino = ev.target as HTMLElement
      if (destino.closest("input, textarea, [role=dialog], [role=combobox], [contenteditable]")) return
      if (ev.key === "j" || ev.key === "ArrowDown") {
        ev.preventDefault()
        setSeleccion((s) => Math.min(s + 1, visibles.length - 1))
      } else if (ev.key === "k" || ev.key === "ArrowUp") {
        ev.preventDefault()
        setSeleccion((s) => Math.max(s - 1, 0))
      } else if (ev.key === "Enter" && visibles[seleccion]) {
        router.push(`${base}/expedientes/${visibles[seleccion].id}`)
      }
    }
    window.addEventListener("keydown", alTeclear)
    return () => window.removeEventListener("keydown", alTeclear)
  }, [visibles, seleccion, router, base])

  useEffect(() => {
    filas.current[seleccion]?.scrollIntoView({ block: "nearest" })
  }, [seleccion])

  function tomar(id: string) {
    setTomando(id)
    iniciar(async () => {
      if (demo) {
        toast.success("Vista previa: el expediente quedaría asignado a vos")
        setTomando(null)
        return
      }
      const r = await tomarExpediente(id)
      setTomando(null)
      if (!r.ok) return void toast.error(r.error)
      toast.success("Expediente asignado a vos")
      router.refresh()
    })
  }

  const chips: { clave: Foco; etiqueta: string; icono: typeof Flame; cantidad: number; tono: string }[] = [
    { clave: "vencidos", etiqueta: "Vencidos", icono: TimerOff, cantidad: conteos.vencidos, tono: "text-rose-600 dark:text-rose-400" },
    { clave: "hoy", etiqueta: "Vencen hoy", icono: AlarmClock, cantidad: conteos.hoy, tono: "text-amber-600 dark:text-amber-400" },
    { clave: "urgentes", etiqueta: "Prioridad alta", icono: Flame, cantidad: conteos.urgentes, tono: "text-orange-600 dark:text-orange-400" },
    { clave: "sin_asignar", etiqueta: "Sin asignar", icono: UserRoundX, cantidad: conteos.sin_asignar, tono: "text-muted-foreground" },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {chips.map((c) => (
          <button
            key={c.clave}
            type="button"
            onClick={() => {
              setFoco((f) => (f === c.clave ? "todos" : c.clave))
              setSeleccion(0)
            }}
            aria-pressed={foco === c.clave}
            className={cn(
              "flex items-center gap-3 rounded-xl border bg-card px-3.5 py-2.5 text-left transition-all hover:border-primary/30",
              foco === c.clave && "border-primary/50 bg-primary/5 ring-2 ring-primary/15",
              c.cantidad === 0 && foco !== c.clave && "opacity-60",
            )}
          >
            <c.icono className={cn("size-4 shrink-0", c.tono)} />
            <span className="flex-1 text-sm">{c.etiqueta}</span>
            <span className="text-lg font-semibold tabular">{c.cantidad}</span>
          </button>
        ))}
      </div>

      {visibles.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed bg-card/50 px-6 py-20 text-center">
          <Inbox className="size-10 text-muted-foreground/60" />
          <h2 className="mt-4 font-medium">{foco === "todos" ? "Bandeja al día" : "Nada por acá"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {foco === "todos" ? "No hay expedientes con estos filtros." : "No hay expedientes en este grupo. ¡Buen trabajo!"}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card">
          <div className="hidden grid-cols-[1rem_minmax(0,2.6fr)_minmax(0,1.2fr)_6.5rem_minmax(0,1.3fr)_5.5rem] gap-4 border-b bg-muted/40 px-4 py-2.5 text-xs font-medium text-muted-foreground xl:grid">
            <span />
            <span>Expediente</span>
            <span>Agente</span>
            <span>Prioridad</span>
            <span>Dónde está</span>
            <span />
          </div>
          <ul className="divide-y" aria-label="Expedientes">
            {visibles.map((e, i) => {
              const esNuevo = !e.asignado_a && ahora - new Date(e.created_at).getTime() < NUEVO_HORAS * 3_600_000
              const puedeTomar = Boolean(e.area_actual_id && misAreas.includes(e.area_actual_id) && e.asignado_a !== usuarioId)
              const agente = e.reservado ? "Reservado" : nombreCompleto(e.iniciador)
              return (
                <li
                  key={e.id}
                  className={cn("group relative transition-colors", i === seleccion ? "bg-accent/50" : "hover:bg-accent/30")}
                  onMouseEnter={() => setSeleccion(i)}
                >
                  <div className="grid grid-cols-[1rem_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2 px-4 py-3.5 xl:grid-cols-[1rem_minmax(0,2.6fr)_minmax(0,1.2fr)_6.5rem_minmax(0,1.3fr)_5.5rem] xl:items-center xl:gap-x-4">
                    <span className="pt-1.5 xl:pt-0">
                      <PuntoSemaforo venceAt={e.vence_at} estado={e.estado} />
                    </span>

                    <span className="min-w-0">
                      <Link
                        ref={(el) => {
                          filas.current[i] = el
                        }}
                        href={`${base}/expedientes/${e.id}`}
                        className="flex items-center gap-2 rounded outline-none after:absolute after:inset-0 focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <IconoTramite icono={e.tipo?.icono ?? null} className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate font-medium">{e.asunto}</span>
                        {esNuevo && (
                          <span className="shrink-0 rounded-full bg-primary px-1.5 py-px text-[0.65rem] font-semibold text-primary-foreground uppercase">
                            Nuevo
                          </span>
                        )}
                      </Link>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <span className="font-mono tabular">{e.numero}</span>
                        <span aria-hidden>·</span>
                        <span className="truncate">{e.tipo?.nombre}</span>
                        <span aria-hidden>·</span>
                        <span>{haceCuanto(e.created_at)}</span>
                        {e.estado !== "en_tramite" && <InsigniaEstado estado={e.estado} className="py-0" />}
                      </span>
                      {/* Pantallas medianas: el resto de los datos en una línea */}
                      <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground xl:hidden">
                        <InsigniaPrioridad prioridad={e.prioridad} motivo={e.prioridad_motivo} origen={e.prioridad_origen} className="relative z-10" />
                        <span className="truncate">{agente}</span>
                        <span aria-hidden>·</span>
                        <span className="truncate">{e.area?.nombre}</span>
                        {e.asignado && <span className="truncate">· a cargo de {e.asignado.nombre}</span>}
                      </span>
                    </span>

                    <span className="hidden min-w-0 text-sm xl:block">
                      <span className="block truncate">{agente}</span>
                      {e.iniciador?.legajo && !e.reservado && <span className="text-xs text-muted-foreground">Leg. {e.iniciador.legajo}</span>}
                    </span>
                    <span className="relative z-10 hidden xl:block">
                      <InsigniaPrioridad prioridad={e.prioridad} motivo={e.prioridad_motivo} origen={e.prioridad_origen} />
                    </span>
                    <span className="hidden min-w-0 items-center gap-2 text-sm xl:flex">
                      {e.asignado ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Avatar className="relative z-10 size-6">
                              <AvatarFallback className="text-[0.6rem]">{iniciales(e.asignado)}</AvatarFallback>
                            </Avatar>
                          </TooltipTrigger>
                          <TooltipContent>A cargo de {nombreCompleto(e.asignado)}</TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="grid size-6 shrink-0 place-items-center rounded-full border border-dashed text-[0.6rem] text-muted-foreground">—</span>
                      )}
                      <span className="truncate text-muted-foreground">{e.area?.nombre}</span>
                    </span>

                    <span className="flex justify-end">
                      {puedeTomar && (
                        <Button
                          size="xs"
                          variant="outline"
                          disabled={pendiente}
                          onClick={() => tomar(e.id)}
                          className={cn(
                            "relative z-10 bg-background shadow-sm transition-opacity",
                            i === seleccion ? "opacity-100" : "opacity-100 xl:opacity-0 xl:group-hover:opacity-100 xl:group-focus-within:opacity-100",
                          )}
                        >
                          {tomando === e.id ? <Loader2 className="animate-spin" /> : <Hand />} Tomar
                        </Button>
                      )}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <p className="hidden items-center gap-3 text-xs text-muted-foreground lg:flex">
        <span>
          <kbd className="rounded border bg-muted px-1 font-mono">j</kbd> <kbd className="rounded border bg-muted px-1 font-mono">k</kbd> para moverte
        </span>
        <span>
          <kbd className="rounded border bg-muted px-1 font-mono">Enter</kbd> para abrir
        </span>
        <span>
          <kbd className="rounded border bg-muted px-1 font-mono">Ctrl K</kbd> para buscar
        </span>
        <span className="ml-auto">La prioridad con destello fue sugerida por IA al ingresar el trámite.</span>
      </p>
    </div>
  )
}
