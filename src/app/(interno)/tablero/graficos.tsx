"use client"

import { useState } from "react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { Table2, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Dia = { dia: string; ingresados: number; resueltos: number }

const SERIES = [
  { clave: "ingresados", etiqueta: "Ingresados", color: "var(--serie-1)" },
  { clave: "resueltos", etiqueta: "Resueltos", color: "var(--serie-2)" },
] as const

function escalaEntera(maximo: number) {
  const tope = Math.max(2, Math.ceil(maximo / 2) * 2)
  return { tope, marcas: [0, tope / 2, tope] }
}

/** Columnas agrupadas por día: ingresados vs resueltos. Una sola escala. */
export function SerieDiaria({ datos }: { datos: Dia[] }) {
  const [tabla, setTabla] = useState(false)
  const [activo, setActivo] = useState<number | null>(null)
  const { tope, marcas } = escalaEntera(Math.max(...datos.map((d) => Math.max(d.ingresados, d.resueltos)), 0))
  const alto = 180
  const totalIngresados = datos.reduce((s, d) => s + d.ingresados, 0)
  const totalResueltos = datos.reduce((s, d) => s + d.resueltos, 0)
  const paso = Math.max(1, Math.ceil(datos.length / 6))

  return (
    <div className="viz">
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        {SERIES.map((s) => (
          <span key={s.clave} className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <span className="size-2.5 rounded-[3px]" style={{ background: s.color }} />
            {s.etiqueta}
            <span className="font-medium text-foreground tabular">{s.clave === "ingresados" ? totalIngresados : totalResueltos}</span>
          </span>
        ))}
        <Button variant="ghost" size="xs" className="ml-auto text-muted-foreground" onClick={() => setTabla((t) => !t)}>
          {tabla ? <BarChart3 /> : <Table2 />} {tabla ? "Ver gráfico" : "Ver tabla"}
        </Button>
      </div>

      {tabla ? (
        <div className="max-h-64 overflow-y-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Día</th>
                <th className="px-3 py-2 text-right font-medium">Ingresados</th>
                <th className="px-3 py-2 text-right font-medium">Resueltos</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[...datos].reverse().map((d) => (
                <tr key={d.dia}>
                  <td className="px-3 py-1.5">{format(parseISO(d.dia), "EEE dd/MM", { locale: es })}</td>
                  <td className="px-3 py-1.5 text-right tabular">{d.ingresados}</td>
                  <td className="px-3 py-1.5 text-right tabular">{d.resueltos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative pl-7">
          {/* grilla y eje */}
          <div className="absolute inset-y-0 left-0 right-0" style={{ height: alto }} aria-hidden>
            {marcas.map((m) => (
              <div key={m} className="absolute right-0 left-7 border-t" style={{ bottom: (m / tope) * alto, borderColor: "var(--grilla)" }}>
                <span className="absolute -top-2 -left-7 w-5 text-right text-[0.68rem] text-muted-foreground tabular">{m}</span>
              </div>
            ))}
          </div>
          <div className="relative flex items-end" style={{ height: alto }} role="img" aria-label="Expedientes ingresados y resueltos por día, últimos 30 días">
            {datos.map((d, i) => (
              <div
                key={d.dia}
                className="relative flex h-full flex-1 items-end justify-center gap-[2px]"
                onMouseEnter={() => setActivo(i)}
                onMouseLeave={() => setActivo(null)}
              >
                {activo === i && <div className="absolute inset-0 rounded-md bg-foreground/[0.04]" />}
                {SERIES.map((s) => {
                  const v = d[s.clave]
                  return (
                    <div
                      key={s.clave}
                      className="relative w-full max-w-2.5 rounded-t-[4px] transition-[height] duration-500"
                      style={{ height: v === 0 ? 0 : Math.max(3, (v / tope) * alto), background: s.color }}
                    />
                  )
                })}
                {activo === i && (
                  <div
                    className={cn(
                      "pointer-events-none absolute bottom-full z-20 mb-2 w-max rounded-lg border bg-popover px-3 py-2 text-xs shadow-lg",
                      i > datos.length * 0.7 ? "right-0" : i < datos.length * 0.3 ? "left-0" : "left-1/2 -translate-x-1/2",
                    )}
                  >
                    <p className="mb-1 font-medium">{format(parseISO(d.dia), "EEEE d 'de' MMMM", { locale: es })}</p>
                    {SERIES.map((s) => (
                      <p key={s.clave} className="flex items-center gap-2 text-muted-foreground">
                        <span className="size-2 rounded-[2px]" style={{ background: s.color }} />
                        {s.etiqueta}
                        <span className="ml-auto pl-3 font-medium text-foreground tabular">{d[s.clave]}</span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 flex text-[0.68rem] text-muted-foreground">
            {datos.map((d, i) => (
              <span key={d.dia} className="flex-1 text-center">
                {i % paso === 0 || i === datos.length - 1 ? format(parseISO(d.dia), "dd/MM") : ""}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

type TiempoTipo = { codigo: string; nombre: string; promedio: number | null; lineaBase: number | null; plazo: number | null; resueltos: number }

/** Barras horizontales: demora promedio actual, con la línea de base histórica como referencia. */
export function TiemposPorTipo({ datos }: { datos: TiempoTipo[] }) {
  const [activo, setActivo] = useState<string | null>(null)
  const maximo = Math.max(1, ...datos.flatMap((d) => [d.promedio ?? 0, d.lineaBase ?? 0, d.plazo ?? 0]))

  return (
    <div className="viz space-y-4">
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-4 rounded-[3px]" style={{ background: "var(--serie-1)" }} /> Promedio actual (días)
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 border-l-2 border-dashed border-foreground/60" /> Antes del sistema
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 border-l-2 border-emerald-600" /> Objetivo
        </span>
      </div>
      <ul className="space-y-3">
        {datos.map((d) => (
          <li
            key={d.codigo}
            className="relative"
            onMouseEnter={() => setActivo(d.codigo)}
            onMouseLeave={() => setActivo(null)}
          >
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate">{d.nombre}</span>
              <span className="shrink-0 text-muted-foreground tabular">
                {d.promedio != null ? (
                  <>
                    <span className="font-medium text-foreground">{d.promedio.toLocaleString("es-AR")}</span> días
                  </>
                ) : (
                  "sin resueltos aún"
                )}
              </span>
            </div>
            <div className="relative h-3 rounded-full bg-muted/70">
              {d.promedio != null && (
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700"
                  style={{ width: `${Math.max(1.5, (d.promedio / maximo) * 100)}%`, background: "var(--serie-1)" }}
                />
              )}
              {d.lineaBase != null && (
                <div className="absolute -inset-y-1 border-l-2 border-dashed border-foreground/60" style={{ left: `${(d.lineaBase / maximo) * 100}%` }} />
              )}
              {d.plazo != null && <div className="absolute -inset-y-1 border-l-2 border-emerald-600" style={{ left: `${(d.plazo / maximo) * 100}%` }} />}
            </div>
            {activo === d.codigo && (
              <div className="pointer-events-none absolute top-full right-0 z-20 mt-1 w-max rounded-lg border bg-popover px-3 py-2 text-xs shadow-lg">
                <p className="mb-1 font-medium">{d.nombre}</p>
                <p className="text-muted-foreground">Promedio actual: <span className="text-foreground tabular">{d.promedio ?? "—"} días</span></p>
                <p className="text-muted-foreground">Antes del sistema: <span className="text-foreground tabular">{d.lineaBase ?? "sin medir"}{d.lineaBase != null && " días"}</span></p>
                <p className="text-muted-foreground">Objetivo: <span className="text-foreground tabular">{d.plazo ?? "—"} días</span></p>
                <p className="text-muted-foreground">Resueltos: <span className="text-foreground tabular">{d.resueltos}</span></p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
