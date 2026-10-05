import type { Metadata } from "next"
import Link from "next/link"
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { IconoTramite } from "@/components/icono-tramite"
import { InsigniaEstado } from "@/components/insignias"
import { TiempoReal } from "@/components/tiempo-real"
import { ESTADOS_ACTIVOS, haceCuanto, nombreCompleto } from "@/lib/dominio"
import { crearClienteServidor } from "@/lib/supabase/servidor"
import { requerirUsuario } from "@/lib/usuario"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Mis trámites" }

export default async function MisTramites() {
  const usuario = await requerirUsuario()
  const supabase = await crearClienteServidor()

  const { data: expedientes } = await supabase
    .from("expedientes")
    .select("id, numero, asunto, estado, paso_actual, tipo_tramite_id, updated_at, created_at, tipo:tipos_tramite!expedientes_tipo_tramite_id_fkey(nombre, icono)")
    .eq("iniciador_id", usuario.id)
    .order("updated_at", { ascending: false })

  const lista = expedientes ?? []
  const tipos = [...new Set(lista.map((e) => e.tipo_tramite_id))]
  const { data: pasos } = tipos.length
    ? await supabase.from("pasos_circuito").select("tipo_tramite_id, orden, nombre").in("tipo_tramite_id", tipos)
    : { data: [] }

  const pasosPorTipo = new Map<string, { orden: number; nombre: string }[]>()
  for (const p of pasos ?? []) {
    pasosPorTipo.set(p.tipo_tramite_id, [...(pasosPorTipo.get(p.tipo_tramite_id) ?? []), p])
  }

  const observados = lista.filter((e) => e.estado === "observado")
  const enCurso = lista.filter((e) => ESTADOS_ACTIVOS.includes(e.estado))
  const terminados = lista.filter((e) => !ESTADOS_ACTIVOS.includes(e.estado))

  return (
    <div className="space-y-8">
      <TiempoReal canal={`mis-${usuario.id}`} suscripciones={[{ tabla: "expedientes", filtro: `iniciador_id=eq.${usuario.id}` }]} />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Hola, {usuario.perfil.nombre || nombreCompleto(usuario.perfil)}</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Mis trámites</h1>
        </div>
        <Button asChild size="lg" className="h-10">
          <Link href="/mis-tramites/nuevo">
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
        <div className="grid place-items-center rounded-2xl border border-dashed bg-card/50 px-6 py-16 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Plus className="size-6" />
          </span>
          <h2 className="mt-4 text-lg font-medium">Todavía no iniciaste ningún trámite</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Licencias, bonificaciones y asignaciones, desde acá y sin papel. Te avisamos cada vez que avanza.
          </p>
          <Button asChild className="mt-6">
            <Link href="/mis-tramites/nuevo">Ver trámites disponibles</Link>
          </Button>
        </div>
      ) : (
        <ul className="grid gap-3">
          {lista.map((e) => {
            const circuito = (pasosPorTipo.get(e.tipo_tramite_id) ?? []).sort((a, b) => a.orden - b.orden)
            const total = circuito.length || 1
            const cerrado = !ESTADOS_ACTIVOS.includes(e.estado) && e.estado !== "resuelto"
            const avance = cerrado ? 100 : Math.round(((e.paso_actual - 1) / total) * 100)
            const pasoActual = circuito.find((p) => p.orden === e.paso_actual)
            return (
              <li key={e.id}>
                <Link
                  href={`/mis-tramites/${e.id}`}
                  className={cn(
                    "group flex flex-col gap-4 rounded-2xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 sm:flex-row sm:items-center sm:p-5",
                    e.estado === "observado" && "border-amber-500/40 bg-amber-500/[0.03]",
                  )}
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <IconoTramite icono={e.tipo?.icono ?? null} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{e.tipo?.nombre}</p>
                      <InsigniaEstado estado={e.estado} />
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      <span className="font-mono text-xs tabular">{e.numero}</span> · {e.asunto}
                    </p>
                    {e.estado === "observado" ? (
                      <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="size-4" /> Capital Humano te pidió una corrección
                      </p>
                    ) : (
                      <div className="mt-3 flex items-center gap-3">
                        <Progress value={avance} className="h-1.5 max-w-xs" />
                        <span className="truncate text-xs text-muted-foreground">
                          {cerrado ? "Finalizado" : e.estado === "resuelto" ? "Resuelto · notificación en curso" : pasoActual?.nombre}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground sm:flex-col sm:items-end">
                    <span>Actualizado {haceCuanto(e.updated_at)}</span>
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
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

function Indicador({
  icono: Icono,
  etiqueta,
  valor,
  resaltar,
}: {
  icono: typeof Clock
  etiqueta: string
  valor: number
  resaltar?: boolean
}) {
  return (
    <div className={cn("rounded-2xl border bg-card p-4", resaltar && "border-amber-500/40 bg-amber-500/5")}>
      <Icono className={cn("size-4 text-muted-foreground", resaltar && "text-amber-600")} />
      <p className="mt-2 text-2xl font-semibold tabular">{valor}</p>
      <p className="text-xs text-muted-foreground">{etiqueta}</p>
    </div>
  )
}
