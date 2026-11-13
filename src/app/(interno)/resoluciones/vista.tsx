"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { BookOpenText, FileText, Lock, PenLine, Printer, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { IconoTramite } from "@/components/icono-tramite"
import { InsigniaSentido } from "@/components/insignias"
import { fechaCorta } from "@/lib/dominio"
import { cn } from "@/lib/utils"
import type { FilaResolucion } from "@/lib/vistas"

type Filtro = "todas" | "hace_lugar" | "rechaza"

const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()

/** Número correlativo del protocolo (el N de N/DCH/AAAA), o null. */
const correlativo = (numero: string | null) => {
  const m = numero?.match(/^(\d+)\//)
  return m ? Number(m[1]) : null
}

/** Números que faltan entre el primero y el último visibles: resoluciones que esta persona no puede ver. */
function faltantes(filas: FilaResolucion[]) {
  const nums = new Set(filas.map((f) => correlativo(f.numero)).filter((n): n is number => n !== null))
  if (nums.size < 2) return 0
  return Math.max(...nums) - Math.min(...nums) + 1 - nums.size
}

/**
 * Registro de resoluciones de la Dirección de Capital Humano: el protocolo, con la numeración
 * correlativa que el sistema asigna al firmar. Cada resolución enlaza a su copia oficial (con código
 * de verificación) y a su expediente. Se imprime tal cual.
 */
export function VistaResoluciones({
  filas,
  anio,
  anios,
  veReservados,
  base = "",
}: {
  filas: FilaResolucion[]
  anio: number
  anios: number[]
  /** Ve los expedientes reservados: si no, se le avisa que hay números que no ve. */
  veReservados: boolean
  base?: string
}) {
  const router = useRouter()
  const [filtro, setFiltro] = useState<Filtro>("todas")
  const [busqueda, setBusqueda] = useState("")

  const ordenadas = [...filas].sort((a, b) => (correlativo(b.numero) ?? 0) - (correlativo(a.numero) ?? 0) || b.firmadaAt.localeCompare(a.firmadaAt))
  const q = normalizar(busqueda.trim())
  const visibles = ordenadas.filter(
    (f) =>
      (filtro === "todas" || f.sentido === filtro) &&
      (!q || normalizar(`${f.numero ?? ""} ${f.agente} ${f.tramite.nombre} ${f.expediente.numero} ${f.firmante ?? ""}`).includes(q)),
  )
  const cuenta = (x: Filtro) => (x === "todas" ? filas.length : filas.filter((f) => f.sentido === x).length)
  const sinVer = veReservados ? 0 : faltantes(filas)

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Dirección de Capital Humano</p>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <BookOpenText className="size-6 text-primary print:hidden" /> Registro de resoluciones <span className="hidden print:inline">· {anio}</span>
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Numeración correlativa, asignada por el sistema al firmar. Cada resolución tiene su copia oficial con código de verificación.
          </p>
        </div>
        <Button variant="outline" onClick={() => window.print()} className="print:hidden">
          <Printer /> Imprimir el registro
        </Button>
      </div>

      <section className="rounded-2xl border bg-card print:border-0">
        <div className="flex flex-col gap-3 border-b p-3 sm:p-4 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1 rounded-xl bg-muted p-1" role="tablist" aria-label="Sentido">
              {(["todas", "hace_lugar", "rechaza"] as const).map((f) => (
                <button
                  key={f}
                  role="tab"
                  aria-selected={filtro === f}
                  onClick={() => setFiltro(f)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors",
                    filtro === f && "bg-background text-foreground shadow-sm",
                  )}
                >
                  {f === "todas" ? "Todas" : f === "hace_lugar" ? "Hacen lugar" : "Rechazan"} <span className="text-xs tabular opacity-70">{cuenta(f)}</span>
                </button>
              ))}
            </div>
            <Select value={String(anio)} onValueChange={(v) => router.push(`${base}/resoluciones?anio=${v}`)}>
              <SelectTrigger className="w-32" aria-label="Año">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {anios.map((a) => (
                  <SelectItem key={a} value={String(a)}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Número, agente, trámite o expediente"
              className="pl-8"
              aria-label="Buscar en el registro"
            />
          </div>
          {sinVer > 0 && (
            <p className="flex items-start gap-2 rounded-lg bg-violet-500/5 px-3 py-2 text-xs text-violet-800 dark:text-violet-300">
              <Lock className="mt-0.5 size-3.5 shrink-0" />
              {sinVer === 1 ? "Falta un número" : `Faltan ${sinVer} números`} de la secuencia: son resoluciones de expedientes reservados (salud,
              discapacidad), que tu rol no puede ver.
            </p>
          )}
        </div>

        {visibles.length === 0 ? (
          <p className="px-4 py-14 text-center text-sm text-muted-foreground">
            {filas.length === 0 ? `Todavía no hay resoluciones firmadas en ${anio}.` : "No hay resoluciones con estos filtros."}
          </p>
        ) : (
          <>
            {/* Tabla en pantallas anchas y al imprimir; tarjetas en el celular. */}
            <table className="hidden w-full text-sm md:table print:table">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2.5 pr-3 pl-4 font-medium">N.º</th>
                  <th className="py-2.5 pr-3 font-medium">Fecha</th>
                  <th className="py-2.5 pr-3 font-medium">Agente y trámite</th>
                  <th className="py-2.5 pr-3 font-medium">Sentido</th>
                  <th className="py-2.5 pr-4 font-medium">Expediente</th>
                  <th className="w-10 py-2.5 pr-4 print:hidden">
                    <span className="sr-only">Copia oficial</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {visibles.map((f) => (
                  <tr key={`${f.numero}-${f.expediente.numero}`} className="group transition-colors hover:bg-muted/40">
                    <td className="py-2.5 pr-3 pl-4 font-mono text-sm font-semibold whitespace-nowrap tabular">{f.numero ?? "—"}</td>
                    <td className="py-2.5 pr-3 whitespace-nowrap text-muted-foreground tabular">{fechaCorta(f.firmadaAt)}</td>
                    <td className="py-2.5 pr-3">
                      {f.agenteId ? (
                        <Link href={`${base}/agentes/${f.agenteId}`} className="block font-medium underline-offset-4 hover:text-primary hover:underline">
                          {f.agente}
                        </Link>
                      ) : (
                        <span className="block font-medium">{f.agente}</span>
                      )}
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <IconoTramite icono={f.tramite.icono} className="size-3.5 shrink-0 print:hidden" />
                        {f.tramite.nombre}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3">
                      <InsigniaSentido sentido={f.sentido} className="whitespace-nowrap" />
                    </td>
                    <td className="py-2.5 pr-4 whitespace-nowrap">
                      {f.expediente.id ? (
                        <Link href={`${base}/expedientes/${f.expediente.id}`} className="font-mono text-xs text-primary tabular hover:underline">
                          {f.expediente.numero}
                        </Link>
                      ) : (
                        <span className="font-mono text-xs tabular">{f.expediente.numero}</span>
                      )}
                      {f.expediente.reservado && <Lock className="ml-1 inline size-3 text-violet-600" aria-label="Reservado" />}
                    </td>
                    <td className="py-2.5 pr-4 text-right print:hidden">
                      {f.id && (
                        <Button asChild variant="ghost" size="icon" className="size-8 text-muted-foreground" title="Copia oficial">
                          <Link href={`${base}/documento/${f.id}`} aria-label={`Copia oficial de la resolución ${f.numero ?? ""}`}>
                            <FileText />
                          </Link>
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className="divide-y md:hidden print:hidden">
              {visibles.map((f) => (
                <li key={`${f.numero}-${f.expediente.numero}`} className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold tabular">{f.numero ?? "—"}</span>
                    <InsigniaSentido sentido={f.sentido} />
                    <span className="ml-auto text-xs text-muted-foreground tabular">{fechaCorta(f.firmadaAt)}</span>
                  </div>
                  <p className="mt-1.5 font-medium">
                    {f.agenteId ? (
                      <Link href={`${base}/agentes/${f.agenteId}`} className="hover:text-primary hover:underline">
                        {f.agente}
                      </Link>
                    ) : (
                      f.agente
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">{f.tramite.nombre}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs">
                    <span className="font-mono text-muted-foreground tabular">{f.expediente.numero}</span>
                    {f.olografa && (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <PenLine className="size-3" /> Firma ológrafa
                      </span>
                    )}
                    {f.id && (
                      <Link href={`${base}/documento/${f.id}`} className="ml-auto font-medium text-primary">
                        Copia oficial
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  )
}
