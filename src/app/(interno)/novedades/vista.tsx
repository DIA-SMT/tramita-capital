import { Banknote, Clock, ShieldAlert, CheckCircle2, Timer } from "lucide-react"
import type { FilaNovedad } from "@/lib/novedades"
import { cn } from "@/lib/utils"
import { ListaNovedades } from "./lista"

const DIA = 86_400_000

/** Pendientes, cargadas en 30 días, demora promedio de carga (días) y antigüedad de la pendiente más vieja. */
function indicadores(novedades: FilaNovedad[]) {
  const ahora = Date.now()
  const pendientes = novedades.filter((n) => n.estado === "pendiente")
  const cargadas = novedades.filter((n) => n.estado === "cargada" && n.cargadaAt && ahora - new Date(n.cargadaAt).getTime() <= 30 * DIA)
  const demora = cargadas.length
    ? cargadas.reduce((s, n) => s + (new Date(n.cargadaAt!).getTime() - new Date(n.registradaAt).getTime()), 0) / cargadas.length / DIA
    : null
  const masVieja = pendientes.length ? Math.max(...pendientes.map((n) => (ahora - new Date(n.registradaAt).getTime()) / DIA)) : null
  return { pendientes, cargadas, demora, masVieja }
}

export function VistaNovedades({
  novedades,
  puedeCargar,
  sinAcceso = false,
  base = "",
  demo = false,
}: {
  novedades: FilaNovedad[]
  puedeCargar: boolean
  sinAcceso?: boolean
  base?: string
  demo?: boolean
}) {
  if (sinAcceso) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border bg-card p-6 text-center">
        <ShieldAlert className="mx-auto size-8 text-muted-foreground" />
        <h1 className="mt-3 text-lg font-semibold">Novedades de haberes</h1>
        <p className="mt-1 text-sm text-muted-foreground">Las ven Bonificaciones, Liquidación de Haberes y la Dirección de Capital Humano.</p>
      </div>
    )
  }

  const { pendientes, cargadas, demora, masVieja } = indicadores(novedades)

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Banknote className="size-6 text-primary" /> Novedades de haberes
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Lo que las resoluciones firmadas mandan impactar en la liquidación. Descargá la planilla, cargala en Civitas y marcá las novedades
          como cargadas: sin nota de desglose en papel ni copia a mano.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Indicador icono={Clock} etiqueta="Pendientes de carga" valor={String(pendientes.length)} detalle={masVieja !== null && masVieja >= 1 ? `la más antigua, hace ${Math.floor(masVieja)} días` : undefined} resaltar={pendientes.length > 0} />
        <Indicador icono={CheckCircle2} etiqueta="Cargadas en los últimos 30 días" valor={String(cargadas.length)} />
        <Indicador
          icono={Timer}
          etiqueta="Demora promedio de carga"
          valor={demora === null ? "—" : demora < 1 ? `${Math.max(1, Math.round(demora * 24))} h` : `${demora.toLocaleString("es-AR", { maximumFractionDigits: 1 })} días`}
          detalle="desde que Bonificaciones la registra"
        />
      </div>

      <ListaNovedades novedades={novedades} puedeCargar={puedeCargar} base={base} demo={demo} />
    </div>
  )
}

function Indicador({ icono: Icono, etiqueta, valor, detalle, resaltar }: { icono: typeof Clock; etiqueta: string; valor: string; detalle?: string; resaltar?: boolean }) {
  return (
    <div className={cn("rounded-2xl border bg-card p-4", resaltar && "border-amber-500/40 bg-amber-500/5")}>
      <Icono className={cn("size-4 text-muted-foreground", resaltar && "text-amber-600")} />
      <p className="mt-2 text-2xl font-semibold tabular">{valor}</p>
      <p className="text-xs text-muted-foreground">{etiqueta}</p>
      {detalle && <p className="text-[0.7rem] text-muted-foreground/80">{detalle}</p>}
    </div>
  )
}
