import { AlertOctagon, CalendarCheck2, FileStack, Flame, Inbox, Leaf, Sparkles, TrendingDown } from "lucide-react"
import { Marca } from "@/components/marca"
import { fechaCorta } from "@/lib/dominio"
import type { CargaPersona, DiaSerie, MetricaTipo, ResumenMetricas } from "@/lib/vistas"
import { cn } from "@/lib/utils"
import { ControlesTablero } from "./controles"
import { SerieDiaria, TiemposPorTipo } from "./graficos"

export function VistaTablero({
  resumen: r,
  porTipo,
  carga,
  serie,
  dias,
}: {
  resumen: ResumenMetricas
  porTipo: MetricaTipo[]
  carga: CargaPersona[]
  serie: DiaSerie[]
  dias: number
}) {
  // Comparación justa: solo trámites con línea de base medida, ponderados por resueltos.
  const comparables = porTipo.filter((t) => t.lineaBase != null && t.promedio != null && t.resueltos > 0)
  const resueltosComparables = comparables.reduce((s, t) => s + t.resueltos, 0)
  const promedio = resueltosComparables
    ? comparables.reduce((s, t) => s + t.promedio! * t.resueltos, 0) / resueltosComparables
    : r.promedio_dias
  const lineaBase = resueltosComparables
    ? comparables.reduce((s, t) => s + t.lineaBase! * t.resueltos, 0) / resueltosComparables
    : r.linea_base_dias
  const mejora = promedio != null && lineaBase ? Math.round((1 - promedio / lineaBase) * 100) : null
  const diasAhorrados = Math.round(comparables.reduce((s, t) => s + (t.lineaBase! - t.promedio!) * t.resueltos, 0))
  const maxAsignados = Math.max(1, ...carga.map((c) => c.asignados))
  const tasaIA = r.borradores_ia ? Math.round((r.borradores_ia_aceptados / r.borradores_ia) * 100) : null

  return (
    <div className="mx-auto max-w-7xl space-y-6 print:max-w-none print:space-y-4">
      <div className="hidden items-center justify-between border-b pb-3 print:flex">
        <Marca />
        <p className="text-xs text-muted-foreground">Informe de impacto · {fechaCorta(new Date())} · últimos {dias} días</p>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tablero de impacto</h1>
          <p className="text-sm text-muted-foreground">Lo que antes no se podía medir: tiempos reales, carga de trabajo y papel evitado.</p>
        </div>
        <ControlesTablero dias={dias} />
      </div>

      <section className="relative overflow-hidden rounded-3xl border bg-card p-6 sm:p-8 print:break-inside-avoid">
        <div className="fondo-marca pointer-events-none absolute inset-0 opacity-60 print:hidden" aria-hidden />
        <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Tiempo promedio de resolución{resueltosComparables ? " en trámites con línea de base" : ""}
            </p>
            <p className="mt-2 text-6xl font-semibold tracking-tight tabular sm:text-7xl">
              {promedio != null ? promedio.toLocaleString("es-AR", { maximumFractionDigits: 1 }) : "—"}
              <span className="ml-2 text-2xl font-medium text-muted-foreground">días</span>
            </p>
            {lineaBase != null && (
              <p className="mt-3 text-sm text-muted-foreground">
                Antes del sistema: <span className="font-medium text-foreground">{lineaBase.toLocaleString("es-AR", { maximumFractionDigits: 1 })} días</span>{" "}
                (relevamiento de Capital Humano)
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {mejora != null && mejora > 0 && (
              <div className="flex items-center gap-4 rounded-2xl border bg-background/70 p-4 backdrop-blur">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
                  <TrendingDown className="size-5" />
                </span>
                <div>
                  <p className="text-2xl font-semibold tabular">−{mejora}%</p>
                  <p className="text-xs text-muted-foreground">de tiempo de espera</p>
                </div>
              </div>
            )}
            {diasAhorrados > 0 && (
              <div className="flex items-center gap-4 rounded-2xl border bg-background/70 p-4 backdrop-blur">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <CalendarCheck2 className="size-5" />
                </span>
                <div>
                  <p className="text-2xl font-semibold tabular">{diasAhorrados.toLocaleString("es-AR")}</p>
                  <p className="text-xs text-muted-foreground">días de espera ahorrados a los agentes</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Tile icono={Inbox} etiqueta="En curso" valor={r.activos} detalle={`${r.ingresados_hoy} ingresaron hoy`} />
        <Tile icono={FileStack} etiqueta="Resueltos (30 días)" valor={r.resueltos_30d} />
        <Tile
          icono={AlertOctagon}
          etiqueta="Vencidos"
          valor={r.vencidos}
          estado={r.vencidos ? "critico" : undefined}
          detalle={r.vencidos ? "Fuera del plazo objetivo" : "Todo en plazo"}
        />
        <Tile icono={Flame} etiqueta="Prioridad alta o urgente" valor={r.urgentes} />
        <Tile icono={Leaf} etiqueta="Hojas de papel evitadas" valor={r.hojas_evitadas} detalle="Fojas y pases digitales" estado="bien" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr] print:grid-cols-1">
        <section className="rounded-2xl border bg-card p-5 sm:p-6 print:break-inside-avoid">
          <h2 className="font-medium">Ingresados y resueltos por día</h2>
          <p className="mb-5 text-sm text-muted-foreground">Últimos {dias} días</p>
          <SerieDiaria datos={serie} />
        </section>

        <section className="rounded-2xl border bg-card p-5 sm:p-6 print:break-inside-avoid">
          <h2 className="font-medium">Demora por tipo de trámite</h2>
          <p className="mb-5 text-sm text-muted-foreground">Promedio real frente a la demora previa y al objetivo</p>
          <TiemposPorTipo datos={porTipo} />
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr] print:grid-cols-1">
        <section className="rounded-2xl border bg-card p-5 sm:p-6 print:break-inside-avoid">
          <h2 className="font-medium">Carga de trabajo del equipo</h2>
          <p className="mb-4 text-sm text-muted-foreground">Expedientes asignados en curso y fojas firmadas en los últimos 30 días</p>
          <div className="viz overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-3 text-left font-medium">Persona</th>
                  <th className="py-2 pr-3 text-left font-medium">Área</th>
                  <th className="w-40 py-2 pr-3 text-left font-medium">Asignados</th>
                  <th className="py-2 text-right font-medium">Fojas 30 d</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {carga.map((c) => (
                  <tr key={c.perfil_id}>
                    <td className="py-2.5 pr-3 font-medium">{c.nombre}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{c.area}</td>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 rounded-full bg-muted/70">
                          <div className="h-full rounded-full" style={{ width: `${(c.asignados / maxAsignados) * 100}%`, background: "var(--serie-1)" }} />
                        </div>
                        <span className="w-5 text-right tabular">{c.asignados}</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-right tabular">{c.fojas_30d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-5 sm:p-6 print:break-inside-avoid">
          <h2 className="flex items-center gap-2 font-medium">
            <Sparkles className="size-4 text-primary" /> IA con humano en el centro
          </h2>
          <p className="mb-5 text-sm text-muted-foreground">Borradores que la IA preparó y que personas del área revisaron y firmaron</p>
          <div className="grid grid-cols-3 gap-3">
            <Mini valor={r.borradores_ia} etiqueta="borradores" />
            <Mini valor={r.borradores_ia_aceptados} etiqueta="firmados" />
            <Mini valor={tasaIA != null ? `${tasaIA}%` : "—"} etiqueta="aprovechados" />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Cada generación queda registrada con modelo, tokens y duración. Ninguna actuación se incorpora sin la firma de una persona.
          </p>
        </section>
      </div>

      <p className="hidden text-xs text-muted-foreground print:block">
        Fuente: Tramita Capital — Expediente electrónico de Capital Humano. Datos en tiempo real al momento de la impresión.
      </p>
    </div>
  )
}

function Mini({ valor, etiqueta }: { valor: number | string; etiqueta: string }) {
  return (
    <div className="rounded-xl bg-muted/50 p-3">
      <p className="text-2xl font-semibold tabular">{typeof valor === "number" ? valor.toLocaleString("es-AR") : valor}</p>
      <p className="text-xs text-muted-foreground">{etiqueta}</p>
    </div>
  )
}

function Tile({
  icono: Icono,
  etiqueta,
  valor,
  detalle,
  estado,
}: {
  icono: typeof Inbox
  etiqueta: string
  valor: number
  detalle?: string
  estado?: "critico" | "bien"
}) {
  return (
    <div className={cn("rounded-2xl border bg-card p-4 print:break-inside-avoid", estado === "critico" && "border-[#d03b3b]/40")}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icono className={cn("size-4", estado === "critico" && "text-[#d03b3b]", estado === "bien" && "text-[#0ca30c]")} />
        {etiqueta}
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight tabular">{valor.toLocaleString("es-AR")}</p>
      {detalle && <p className="mt-0.5 text-xs text-muted-foreground">{detalle}</p>}
    </div>
  )
}
