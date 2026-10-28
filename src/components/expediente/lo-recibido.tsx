import { Inbox } from "lucide-react"
import { Markdown } from "@/components/markdown"
import type { Enum } from "@/lib/database.types"
import { fechaHora, haceCuanto, TIPOS_ACTUACION } from "@/lib/dominio"

export type Recibido = {
  /** Área que hizo el pase. */
  desde: string
  /** Quien firmó el pase. */
  por: string | null
  at: string
  providencia: string
  /** Lo que esa área incorporó en su paso: fojas firmadas y borradores que dejó (por ejemplo, el proyecto a firmar). */
  incorporado: { id: string; foja: number | null; tipo: Enum<"tipo_actuacion">; titulo: string; contenido: string; borrador: boolean }[]
}

const PARA_LEER: Enum<"tipo_actuacion">[] = ["dictamen", "resolucion", "informe"]

/** Lo que mandó el área anterior, para leerlo de un vistazo sin buscar entre las fojas. */
export function LoRecibido({ recibido: r }: { recibido: Recibido }) {
  // Se abre sola la última pieza de fondo (dictamen, resolución o informe).
  const abierta = [...r.incorporado].reverse().find((f) => PARA_LEER.includes(f.tipo))?.id
  return (
    <section className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.05] to-transparent p-5 sm:p-6">
      <p className="flex items-center gap-1.5 text-[0.7rem] font-semibold tracking-wide text-primary uppercase">
        <Inbox className="size-3.5" /> Lo que te mandaron
      </p>
      <h2 className="mt-1 font-medium">
        {r.desde} te lo pasó {haceCuanto(r.at)}
      </h2>
      <p className="text-xs text-muted-foreground tabular">
        {r.por ? `${r.por} · ` : ""}
        {fechaHora(r.at)}
      </p>

      <div className="mt-3 rounded-xl border bg-background/70 p-3">
        <p className="text-xs font-medium text-muted-foreground">Providencia del pase</p>
        <p className="mt-0.5 text-sm whitespace-pre-line">{r.providencia || "Sin providencia."}</p>
      </div>

      {r.incorporado.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-medium text-muted-foreground">Lo que incorporó en su paso</p>
          <ul className="mt-2 grid grid-cols-[minmax(0,1fr)] gap-2">
            {r.incorporado.map((f) => (
              <li key={f.id}>
                <details className="group rounded-xl border bg-card" open={f.id === abierta}>
                  <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm [&::-webkit-details-marker]:hidden">
                    <span className="shrink-0 font-mono text-xs text-muted-foreground tabular">{f.borrador ? "Sin firmar" : `Foja ${f.foja ?? "—"}`}</span>
                    <span className="min-w-0 flex-1 truncate font-medium">{f.titulo}</span>
                    <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">{TIPOS_ACTUACION[f.tipo]}</span>
                    <span className="shrink-0 text-xs font-medium text-primary group-open:hidden">Leer</span>
                    <span className="hidden shrink-0 text-xs text-muted-foreground group-open:inline">Ocultar</span>
                  </summary>
                  <div className="max-h-[28rem] overflow-y-auto border-t bg-muted/20 p-4">
                    {f.borrador && (
                      <p className="mb-3 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-800 dark:text-amber-300">
                        Todavía no está firmado: es el borrador que dejó el área.
                      </p>
                    )}
                    <Markdown oficial={f.tipo === "dictamen" || f.tipo === "resolucion"} className="text-sm">
                      {f.contenido || "Sin texto."}
                    </Markdown>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">En su paso no incorporó fojas: solo hizo el pase.</p>
      )}
    </section>
  )
}
