import Link from "next/link"
import { FileText, Scale } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ESTADOS } from "@/lib/dominio"
import { fechaDia, type OrigenRecurso, type PlazoReconsideracion } from "@/lib/reconsideracion"
import type { Enum } from "@/lib/database.types"

/**
 * Vínculo del recurso de reconsideración (migración 001700). En el recurso: contra qué resolución y de qué
 * expediente. En el expediente recurrido: dónde tramita el recurso. Para el agente y para el personal.
 */
export function VinculoRecurso({
  origen,
  plazo,
  rutaExpediente,
  base = "",
  resultadoRecurso,
}: {
  origen: OrigenRecurso | null
  plazo: PlazoReconsideracion | null
  rutaExpediente: "mis-tramites" | "expedientes"
  base?: string
  /** En el recurso, cómo terminó: si se rechazó, el agente puede ir al jerárquico (en papel). */
  resultadoRecurso?: "aprobado" | "rechazado" | null
}) {
  if (origen) {
    return (
      <section className="rounded-2xl border border-primary/25 bg-primary/[0.04] p-4 sm:p-5">
        <p className="flex items-center gap-1.5 text-[0.7rem] font-semibold tracking-wide text-primary uppercase">
          <Scale className="size-3.5" /> Recurso de reconsideración
        </p>
        <p className="mt-1.5 text-sm">
          Contra la Resolución <span className="font-mono tabular">N.º {origen.resolucion?.numero ?? "s/n"}</span>
          {origen.resolucion?.sentido === "rechaza" ? ", que no hizo lugar," : ""} del expediente{" "}
          {origen.id ? (
            <Link href={`${base}/${rutaExpediente}/${origen.id}`} className="font-mono font-medium text-primary tabular hover:underline">
              {origen.numero}
            </Link>
          ) : (
            <span className="font-mono tabular">{origen.numero || "de origen"}</span>
          )}
          {origen.tramite ? ` (${origen.tramite})` : ""}.
        </p>
        {origen.resolucion?.fojaId && origen.id && (
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link href={`${base}/documento/${origen.resolucion.fojaId}`}>
              <FileText /> Resolución recurrida
            </Link>
          </Button>
        )}
        {resultadoRecurso === "rechazado" && (
          <p className="mt-3 rounded-lg bg-background/70 p-3 text-xs text-muted-foreground">
            No se hizo lugar a la reconsideración. Lo que sigue es el recurso jerárquico, que se presenta en papel: consultá en Capital Humano cómo
            hacerlo.
          </p>
        )}
      </section>
    )
  }
  if (plazo?.recurso) {
    const r = plazo.recurso
    return (
      <section className="rounded-2xl border bg-card p-4 sm:p-5">
        <p className="flex items-center gap-1.5 text-[0.7rem] font-semibold tracking-wide text-muted-foreground uppercase">
          <Scale className="size-3.5" /> Reconsideración pedida
        </p>
        <p className="mt-1.5 text-sm">
          La reconsideración de esta resolución tramita en el expediente{" "}
          <Link href={`${base}/${rutaExpediente}/${r.id}`} className="font-mono font-medium text-primary tabular hover:underline">
            {r.numero}
          </Link>
          {r.estado in ESTADOS ? ` · ${ESTADOS[r.estado as Enum<"estado_expediente">].etiqueta.toLowerCase()}` : ""}
          {r.resultado ? ` (${r.resultado === "aprobado" ? "se hizo lugar" : "no se hizo lugar"})` : ""}.
        </p>
      </section>
    )
  }
  return null
}

/** Cuándo vence el plazo, en palabras: el 8.º día hábil (el plazo extraordinario se explica aparte). */
export const textoPlazo = (plazo: PlazoReconsideracion) => `hasta el ${fechaDia(plazo.ultimoDia)}`
