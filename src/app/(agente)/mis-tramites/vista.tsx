import Link from "next/link"
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, Plus, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { IconoTramite } from "@/components/icono-tramite"
import { InsigniaEstado } from "@/components/insignias"
import { TiempoReal } from "@/components/tiempo-real"
import { ESTADOS_ACTIVOS, estadoVisible, haceCuanto } from "@/lib/dominio"
import type { TramiteAgente } from "@/lib/vistas"
import { cn } from "@/lib/utils"

const ORDEN_ESTADO = { observado: 0, iniciado: 1, en_tramite: 2, resuelto: 3, archivado: 4, rechazado: 5 } as const

function frase(t: TramiteAgente) {
  const paso = t.pasos.find((p) => p.orden === t.paso_actual)
  switch (t.estado) {
    case "observado":
      return "Capital Humano te pidió una corrección"
    case "iniciado":
      return `Recibido: ${t.area?.nombre ?? "Capital Humano"} lo está revisando`
    case "en_tramite":
      return paso ? `En curso: ${paso.nombre.toLowerCase()}` : "En curso"
    case "resuelto":
      return t.resultado === "rechazado" ? "No se hizo lugar: mirá la resolución" : "¡Aprobado! Falta la notificación final"
    case "archivado":
      return t.resultado === "rechazado" ? "Finalizado: no se hizo lugar" : "Finalizado"
    case "rechazado":
      return "No se hizo lugar"
  }
}

export function VistaMisTramites({
  usuarioId,
  nombre,
  tramites,
  base = "",
  demo = false,
}: {
  usuarioId: string
  nombre: string
  tramites: TramiteAgente[]
  base?: string
  demo?: boolean
}) {
  const lista = [...tramites].sort((a, b) => ORDEN_ESTADO[a.estado] - ORDEN_ESTADO[b.estado] || b.updated_at.localeCompare(a.updated_at))
  const observados = lista.filter((e) => e.estado === "observado")
  const enCurso = lista.filter((e) => ESTADOS_ACTIVOS.includes(e.estado))
  const terminados = lista.filter((e) => !ESTADOS_ACTIVOS.includes(e.estado))

  return (
    <div className="space-y-8">
      {!demo && <TiempoReal canal={`mis-${usuarioId}`} suscripciones={[{ tabla: "expedientes", filtro: `iniciador_id=eq.${usuarioId}` }]} />}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Hola{nombre ? `, ${nombre}` : ""} 👋</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Mis trámites</h1>
        </div>
        <Button asChild size="lg" className="hidden h-10 sm:inline-flex">
          <Link href={`${base}/mis-tramites/nuevo`}>
            <Plus /> Iniciar un trámite
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Indicador icono={Clock} etiqueta="En curso" valor={enCurso.length} />
        <Indicador icono={AlertTriangle} etiqueta="Requieren tu acción" valor={observados.length} resaltar={observados.length > 0} />
        <Indicador icono={CheckCircle2} etiqueta="Finalizados" valor={terminados.length} />
      </div>

      {lista.length === 0 ? (
        <div className="relative overflow-hidden rounded-3xl border bg-card px-6 py-14 text-center">
          <div className="fondo-marca pointer-events-none absolute inset-0 opacity-70" aria-hidden />
          <div className="relative">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-marca-2 to-marca-1 text-white shadow-lg shadow-primary/30">
              <Sparkles className="size-6" />
            </span>
            <h2 className="mt-5 text-lg font-semibold">Tus trámites, sin papel y sin filas</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Licencias, bonificaciones y asignaciones desde el celular. Te avisamos por email y WhatsApp cada vez que avanzan.
            </p>
            <Button asChild className="mt-6">
              <Link href={`${base}/mis-tramites/nuevo`}>
                Ver trámites disponibles <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3">
          {lista.map((e) => {
            const pasos = [...e.pasos].sort((a, b) => a.orden - b.orden)
            const cerrado = !ESTADOS_ACTIVOS.includes(e.estado)
            return (
              <li key={e.id}>
                <Link
                  href={`${base}/mis-tramites/${e.id}`}
                  className={cn(
                    "group flex items-start gap-3.5 rounded-2xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 sm:items-center sm:gap-4 sm:p-5",
                    e.estado === "observado" && "border-amber-500/50 bg-amber-500/[0.04] ring-1 ring-amber-500/20",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-11 shrink-0 place-items-center rounded-xl",
                      e.estado === "observado" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : cerrado ? "bg-emerald-500/10 text-emerald-600" : "bg-primary/10 text-primary",
                    )}
                  >
                    {e.estado === "observado" ? <AlertTriangle className="size-5" /> : <IconoTramite icono={e.tipo?.icono ?? null} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{e.tipo?.nombre}</p>
                      <InsigniaEstado
                        estado={e.estado}
                        visible={estadoVisible({
                          estado: e.estado,
                          resultado: e.resultado,
                          instancia: e.instancia,
                          areaCodigo: e.area?.codigo,
                          accionPaso: pasos.find((p) => p.orden === e.paso_actual)?.accion,
                        })}
                      />
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      <span className="font-mono text-xs tabular">{e.numero}</span> · {e.asunto}
                    </p>
                    <p className={cn("mt-2 text-sm", e.estado === "observado" ? "font-medium text-amber-800 dark:text-amber-300" : "text-foreground/80")}>
                      {frase(e)}
                    </p>
                    {pasos.length > 0 && e.estado !== "observado" && (
                      <div className="mt-2 flex max-w-sm gap-1" aria-label={`Paso ${Math.min(e.paso_actual, pasos.length)} de ${pasos.length}`}>
                        {pasos.map((p) => (
                          <span
                            key={p.orden}
                            className={cn(
                              "h-1.5 flex-1 rounded-full",
                              cerrado || p.orden < e.paso_actual ? "bg-primary" : p.orden === e.paso_actual ? "bg-primary/45" : "bg-muted",
                            )}
                          />
                        ))}
                      </div>
                    )}
                    <p className="mt-2.5 flex items-center justify-between text-xs text-muted-foreground sm:hidden">
                      <span>Actualizado {haceCuanto(e.updated_at)}</span>
                      {e.estado === "observado" && <span className="rounded-full bg-amber-500 px-2.5 py-0.5 font-medium text-white">Responder</span>}
                    </p>
                  </div>
                  <div className="hidden items-end gap-3 text-xs text-muted-foreground sm:flex sm:flex-col">
                    <span>Actualizado {haceCuanto(e.updated_at)}</span>
                    {e.estado === "observado" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-xs font-medium text-white">
                        Responder <ArrowRight className="size-3" />
                      </span>
                    ) : (
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                    )}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function Indicador({ icono: Icono, etiqueta, valor, resaltar }: { icono: typeof Clock; etiqueta: string; valor: number; resaltar?: boolean }) {
  return (
    <div className={cn("rounded-2xl border bg-card p-4", resaltar && "border-amber-500/40 bg-amber-500/5")}>
      <Icono className={cn("size-4 text-muted-foreground", resaltar && "text-amber-600")} />
      <p className="mt-2 text-2xl font-semibold tabular">{valor}</p>
      <p className="text-xs leading-tight text-muted-foreground">{etiqueta}</p>
    </div>
  )
}
