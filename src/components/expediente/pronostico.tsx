import { CalendarClock, Radar } from "lucide-react"
import { fechaBreve, rangoFechas, RIESGOS, textoBase, type Pronostico } from "@/lib/pronostico"
import { cn } from "@/lib/utils"

const TONO = {
  en_plazo: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  justo: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  fuera: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
} as const

/** Para Capital Humano: fecha estimada, rango y si llega antes del vencimiento. Va debajo del tiempo transcurrido. */
export function PronosticoInterno({ pronostico: p, venceAt }: { pronostico: Pronostico; venceAt: string | null }) {
  return (
    <div className="mt-3 border-t pt-3">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Radar className="size-3.5 text-primary" />
        {p.meta === "resolucion" ? "Resolución estimada" : "Cierre estimado"}
      </p>
      <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
        <span className="text-lg font-semibold tabular">≈ {fechaBreve(p.fecha)}</span>
        {p.riesgo && (
          <span className={cn("rounded-full px-1.5 py-px text-[0.7rem] font-medium", TONO[p.riesgo])} title={RIESGOS[p.riesgo].detalle}>
            {RIESGOS[p.riesgo].etiqueta}
          </span>
        )}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {rangoFechas(p.fecha, p.tarde).replace(/^./, (c) => c.toUpperCase())}
        {p.riesgo && venceAt ? ` · vence el ${fechaBreve(venceAt)}` : ""}
        {p.esperaAgente ? " · si el agente responde hoy" : ""}.
      </p>
      <p className="mt-1 text-[0.7rem] leading-snug text-muted-foreground/80">{textoBase(p)}</p>
    </div>
  )
}

/** Para el agente: cuándo saldría, en lenguaje claro y aclarando que no es un plazo. */
export function PronosticoAgente({ pronostico: p }: { pronostico: Pronostico }) {
  const que = p.meta === "resolucion" ? "la resolución sale" : "el trámite termina"
  return (
    <p className="relative mt-4 flex items-start gap-2 border-t pt-4 text-sm text-muted-foreground">
      <CalendarClock className="mt-0.5 size-4 shrink-0 text-primary" />
      <span>
        {p.esperaAgente ? (
          <>
            Si respondés hoy, estimamos que {que} <span className="font-medium text-foreground">{rangoFechas(p.fecha, p.tarde)}</span>.
          </>
        ) : (
          <>
            Estimamos que {que} <span className="font-medium text-foreground">{rangoFechas(p.fecha, p.tarde)}</span>.
          </>
        )}{" "}
        <span className="text-xs">
          {p.base === "plazos" ? "Lo calculamos con los plazos de cada paso" : "Lo calculamos con lo que tardaron trámites iguales"}: es una referencia, no un plazo.
        </span>
      </span>
    </p>
  )
}
