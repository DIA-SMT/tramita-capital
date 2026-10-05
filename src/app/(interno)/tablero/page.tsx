import type { Metadata } from "next"
import { AlertOctagon, FileStack, Flame, Inbox, Leaf, Sparkles, TrendingDown } from "lucide-react"
import { crearClienteServidor } from "@/lib/supabase/servidor"
import { requerirInterno } from "@/lib/usuario"
import { cn } from "@/lib/utils"
import { SerieDiaria, TiemposPorTipo } from "./graficos"

export const metadata: Metadata = { title: "Tablero de impacto" }

type Resumen = {
  activos: number
  ingresados_hoy: number
  resueltos_30d: number
  vencidos: number
  urgentes: number
  promedio_dias: number | null
  linea_base_dias: number | null
  hojas_evitadas: number
  borradores_ia: number
  borradores_ia_aceptados: number
}

export default async function Tablero() {
  await requerirInterno()
  const supabase = await crearClienteServidor()
  const [{ data: resumenCrudo }, { data: porTipo }, { data: carga }, { data: serie }] = await Promise.all([
    supabase.rpc("metricas_resumen"),
    supabase.rpc("metricas_por_tipo"),
    supabase.rpc("metricas_carga"),
    supabase.rpc("metricas_serie", { p_dias: 30 }),
  ])
  const r = (resumenCrudo ?? {}) as Partial<Resumen>
  const promedio = r.promedio_dias != null ? Number(r.promedio_dias) : null
  const lineaBase = r.linea_base_dias != null ? Number(r.linea_base_dias) : null
  const mejora = promedio != null && lineaBase ? Math.round((1 - promedio / lineaBase) * 100) : null
  const maxAsignados = Math.max(1, ...(carga ?? []).map((c) => Number(c.asignados)))

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tablero de impacto</h1>
        <p className="text-sm text-muted-foreground">Lo que antes no se podía medir: tiempos reales, carga de trabajo y papel evitado.</p>
      </div>

      <section className="relative overflow-hidden rounded-3xl border bg-card p-6 sm:p-8">
        <div className="fondo-marca pointer-events-none absolute inset-0 opacity-60" aria-hidden />
        <div className="relative grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Tiempo promedio de resolución · últimos 90 días</p>
            <p className="mt-2 text-6xl font-semibold tracking-tight tabular sm:text-7xl">
              {promedio != null ? promedio.toLocaleString("es-AR", { maximumFractionDigits: 1 }) : "—"}
              <span className="ml-2 text-2xl font-medium text-muted-foreground">días</span>
            </p>
            {lineaBase != null && (
              <p className="mt-3 text-sm text-muted-foreground">
                Antes del sistema: <span className="font-medium text-foreground">{lineaBase.toLocaleString("es-AR")} días</span> (línea de base medida)
              </p>
            )}
          </div>
          {mejora != null && mejora > 0 && (
            <div className="flex items-center gap-4 rounded-2xl border bg-background/70 p-5 backdrop-blur">
              <span className="grid size-12 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <TrendingDown className="size-6" />
              </span>
              <div>
                <p className="text-3xl font-semibold tabular">−{mejora}%</p>
                <p className="text-sm text-muted-foreground">menos tiempo de espera para el agente</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Tile icono={Inbox} etiqueta="En curso" valor={r.activos ?? 0} detalle={`${r.ingresados_hoy ?? 0} ingresaron hoy`} />
        <Tile icono={FileStack} etiqueta="Resueltos (30 días)" valor={r.resueltos_30d ?? 0} />
        <Tile icono={AlertOctagon} etiqueta="Vencidos" valor={r.vencidos ?? 0} estado={r.vencidos ? "critico" : undefined} detalle={r.vencidos ? "Fuera del plazo objetivo" : "Todo en plazo"} />
        <Tile icono={Flame} etiqueta="Prioridad alta o urgente" valor={r.urgentes ?? 0} />
        <Tile icono={Leaf} etiqueta="Hojas de papel evitadas" valor={r.hojas_evitadas ?? 0} detalle="Fojas y pases digitales" estado="bien" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border bg-card p-5 sm:p-6">
          <h2 className="font-medium">Ingresados y resueltos por día</h2>
          <p className="mb-5 text-sm text-muted-foreground">Últimos 30 días</p>
          <SerieDiaria datos={(serie ?? []).map((d) => ({ dia: d.dia, ingresados: Number(d.ingresados), resueltos: Number(d.resueltos) }))} />
        </section>

        <section className="rounded-2xl border bg-card p-5 sm:p-6">
          <h2 className="font-medium">Demora por tipo de trámite</h2>
          <p className="mb-5 text-sm text-muted-foreground">Promedio real frente a la demora previa y al objetivo</p>
          <TiemposPorTipo
            datos={(porTipo ?? []).map((t) => ({
              codigo: t.codigo,
              nombre: t.nombre,
              promedio: t.promedio_dias != null ? Number(t.promedio_dias) : null,
              lineaBase: t.linea_base_dias != null ? Number(t.linea_base_dias) : null,
              plazo: t.plazo_dias,
              resueltos: Number(t.resueltos),
            }))}
          />
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border bg-card p-5 sm:p-6">
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
                {(carga ?? []).map((c) => (
                  <tr key={c.perfil_id}>
                    <td className="py-2.5 pr-3 font-medium">{c.nombre}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{c.area}</td>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 rounded-full bg-muted/70">
                          <div className="h-full rounded-full" style={{ width: `${(Number(c.asignados) / maxAsignados) * 100}%`, background: "var(--serie-1)" }} />
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

        <section className="rounded-2xl border bg-card p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-medium">
            <Sparkles className="size-4 text-primary" /> IA con humano en el centro
          </h2>
          <p className="mb-5 text-sm text-muted-foreground">Borradores que la IA preparó y personas del área revisaron y firmaron</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-muted/50 p-4">
              <p className="text-3xl font-semibold tabular">{r.borradores_ia ?? 0}</p>
              <p className="text-xs text-muted-foreground">borradores generados</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-4">
              <p className="text-3xl font-semibold tabular">{r.borradores_ia_aceptados ?? 0}</p>
              <p className="text-xs text-muted-foreground">firmados tras revisión</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Cada generación queda registrada con modelo, tokens y duración. Ninguna actuación se incorpora sin la firma de una persona.
          </p>
        </section>
      </div>
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
    <div className={cn("rounded-2xl border bg-card p-4", estado === "critico" && "border-[#d03b3b]/40")}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icono className={cn("size-4", estado === "critico" && "text-[#d03b3b]", estado === "bien" && "text-[#0ca30c]")} />
        {etiqueta}
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight tabular">{valor.toLocaleString("es-AR")}</p>
      {detalle && <p className="mt-0.5 text-xs text-muted-foreground">{detalle}</p>}
    </div>
  )
}
