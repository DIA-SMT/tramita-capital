import Link from "next/link"
import { ArrowRight, Banknote, CheckCircle2, Clock } from "lucide-react"
import { fechaCorta } from "@/lib/dominio"
import { ESTADOS_NOVEDAD, MOVIMIENTOS, periodo, type NovedadExpediente } from "@/lib/novedades"
import { cn } from "@/lib/utils"

/**
 * Impacto en haberes de un expediente: qué se informó a Liquidación, desde qué período
 * y si ya está cargado en Civitas. El agente lo ve en su trámite; Capital Humano, en el expediente.
 */
export function NovedadHaberes({ novedades, para, base = "" }: { novedades: NovedadExpediente[]; para: "agente" | "interno"; base?: string }) {
  if (novedades.length === 0) return null
  const agente = para === "agente"

  return (
    <section className="rounded-2xl border bg-card p-4 sm:p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
        <Banknote className="size-4 text-primary" /> {agente ? "Impacto en tus haberes" : "Novedad de haberes"}
      </h2>
      <ul className="space-y-3">
        {novedades.map((n) => {
          const cargada = n.estado === "cargada"
          return (
            <li key={n.id} className="flex gap-3">
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-xl",
                  cargada ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                )}
              >
                {cargada ? <CheckCircle2 className="size-4" /> : <Clock className="size-4" />}
              </span>
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-medium">
                  {MOVIMIENTOS[n.movimiento]} de {n.concepto.charAt(0).toLowerCase()}
                  {n.concepto.slice(1)} desde el período {periodo(n.vigencia_desde)}
                  {n.vigencia_hasta && ` hasta ${periodo(n.vigencia_hasta)}`}
                </p>
                {agente ? (
                  <p className="text-muted-foreground">
                    {cargada
                      ? `Liquidación de Haberes ya la cargó en Civitas el ${fechaCorta(n.cargada_at!)}. Si tenés dudas sobre tu recibo, consultá en Liquidación.`
                      : `Se informó a Liquidación de Haberes el ${fechaCorta(n.created_at)}. Falta que la carguen en Civitas: te avisamos cuando esté.`}
                  </p>
                ) : (
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span className={cn("rounded-full px-2 py-0.5 font-medium", ESTADOS_NOVEDAD[n.estado].clase)}>{ESTADOS_NOVEDAD[n.estado].etiqueta}</span>
                    <span>
                      Registrada el {fechaCorta(n.created_at)}
                      {cargada && n.cargada_at && ` · cargada el ${fechaCorta(n.cargada_at)}`}
                    </span>
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      {!agente && (
        <Link href={`${base}/novedades`} className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          Ver en Novedades de haberes <ArrowRight className="size-3" />
        </Link>
      )}
    </section>
  )
}
