"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AlertTriangle, CheckCircle2, Database, Download, FileSpreadsheet, Loader2, ShieldAlert, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { VIGENCIA_DATO_LIQUIDA } from "@/lib/certificado"
import {
  decodificar,
  ETIQUETAS_COLUMNA,
  leerPlanillaCivitas,
  PLANILLA_EJEMPLO,
  type LecturaCivitas,
  type ResultadoImportacion,
} from "@/lib/civitas"
import { fechaCorta, fechaHora } from "@/lib/dominio"
import { cn } from "@/lib/utils"
import { importarCivitas } from "./acciones"

export type ImportacionVista = {
  id: string
  archivo: string
  /** AAAA-MM-DD */
  datosAl: string
  filas: number
  actualizados: number
  sinCoincidencia: number
  creadaAt: string
  por: string
}

type Leida = Extract<LecturaCivitas, { ok: true }> & { archivo: string }

const hoy = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Tucuman" })
const dia = (iso: string) => fechaCorta(`${iso}T12:00:00`)
const cuantos = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

/**
 * Datos de Civitas (migración 002000): Registro, Liquidación o Administración suben la planilla que exportan de
 * Civitas y se actualizan «Liquida SÍ», la fecha de ingreso y la situación de revista de todos los agentes. Con el
 * dato al día, el certificado de trabajo sale al pedirlo. La planilla se lee en el navegador y se revisa antes.
 */
export function VistaDatosCivitas({ historial, sinAcceso = false, demo = false }: { historial: ImportacionVista[]; sinAcceso?: boolean; demo?: boolean }) {
  const router = useRouter()
  const entrada = useRef<HTMLInputElement>(null)
  const [leida, setLeida] = useState<Leida | null>(null)
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null)
  const [datosAl, setDatosAl] = useState(hoy())
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null)
  const [pendiente, iniciar] = useTransition()

  if (sinAcceso) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border bg-card p-6 text-center">
        <ShieldAlert className="mx-auto size-8 text-muted-foreground" />
        <h1 className="mt-3 text-lg font-semibold">Datos de Civitas</h1>
        <p className="mt-1 text-sm text-muted-foreground">Los importan el Departamento de Registro, Liquidación de Haberes y Administración.</p>
      </div>
    )
  }

  async function elegir(archivo: File | undefined) {
    setResultado(null)
    setLeida(null)
    setErrorArchivo(null)
    if (!archivo) {
      if (entrada.current) entrada.current.value = ""
      return
    }
    if (archivo.size > 5 * 1024 * 1024) return setErrorArchivo("El archivo pesa más de 5 MB. Dividilo en partes.")
    if (/\.xlsx?$/i.test(archivo.name)) return setErrorArchivo("Es un archivo de Excel: abrilo y guardalo como CSV (Archivo → Guardar como → CSV).")
    const r = leerPlanillaCivitas(decodificar(await archivo.arrayBuffer()))
    if (!r.ok) return setErrorArchivo(r.error)
    setLeida({ ...r, archivo: archivo.name })
  }

  function descargarEjemplo() {
    const url = URL.createObjectURL(new Blob(["﻿" + PLANILLA_EJEMPLO], { type: "text/csv;charset=utf-8" }))
    const a = document.createElement("a")
    a.href = url
    a.download = "planilla-civitas-ejemplo.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  function importar() {
    if (!leida) return
    iniciar(async () => {
      if (demo) {
        await new Promise((r) => setTimeout(r, 700))
        const sin = leida.filas.filter((f) => f.legajo && !["10234", "08812", "09455"].includes(f.legajo.replace(/^0+/, "")))
        setResultado({
          filas: leida.filas.length,
          actualizados: leida.filas.length - sin.length,
          sinCoincidencia: sin.length,
          noEncontrados: sin.slice(0, 50).map((f) => f.legajo ?? f.cuil ?? ""),
        })
        toast.success("Vista previa: datos de Civitas importados")
      } else {
        const r = await importarCivitas({ filas: leida.filas, datosAl, archivo: leida.archivo })
        if (!r.ok) return void toast.error(r.error)
        setResultado(r.resultado)
        toast.success(r.resultado.actualizados === 1 ? "Se actualizó 1 agente" : `Se actualizaron ${r.resultado.actualizados} agentes`)
        router.refresh()
      }
      setLeida(null)
      if (entrada.current) entrada.current.value = ""
    })
  }

  const fechaValida = /^\d{4}-\d{2}-\d{2}$/.test(datosAl) && datosAl <= hoy()

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">Registro y Liquidación</p>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          <Database className="size-6 text-primary" /> Datos de Civitas
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Subí la planilla que exportás de Civitas y se actualizan «Liquida SÍ», la fecha de ingreso y la situación de revista de todos los agentes. Con
          el dato al día, su certificado de trabajo sale al pedirlo. Los agentes que no están en la planilla no cambian.
        </p>
      </div>

      <section className="space-y-5 rounded-3xl border bg-card p-5 sm:p-6">
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-3">
            <Label htmlFor="planilla" className="text-sm font-medium">
              Planilla (CSV)
            </Label>
            <Input
              id="planilla"
              ref={entrada}
              type="file"
              accept=".csv,.txt,text/csv"
              onChange={(e) => void elegir(e.target.files?.[0])}
              disabled={pendiente}
            />
            {errorArchivo && (
              <p className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-800 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {errorArchivo}
              </p>
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="datos-al">Fecha de los datos</Label>
              <Input id="datos-al" type="date" value={datosAl} max={hoy()} onChange={(e) => setDatosAl(e.target.value)} className="w-48" aria-invalid={!fechaValida} />
              <p className="text-xs text-muted-foreground">
                La del reporte de Civitas. «Liquida SÍ» vale {VIGENCIA_DATO_LIQUIDA} días desde esa fecha para emitir certificados sin control.
              </p>
            </div>
          </div>
          <div className="rounded-2xl bg-muted/40 p-4 text-sm">
            <p className="flex items-center gap-2 font-medium">
              <FileSpreadsheet className="size-4 text-primary" /> Columnas que se reconocen
            </p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              <li>
                <strong className="font-medium text-foreground">Legajo</strong> o <strong className="font-medium text-foreground">CUIL</strong>: para encontrar al
                agente.
              </li>
              <li>
                <strong className="font-medium text-foreground">Liquida</strong> (SÍ o NO) y <strong className="font-medium text-foreground">Baja</strong>: con una
                baja cargada o en curso, no liquida.
              </li>
              <li>
                <strong className="font-medium text-foreground">Fecha de ingreso</strong> y <strong className="font-medium text-foreground">Situación de revista</strong>.
              </li>
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              En cualquier orden y con punto y coma, coma o tabulación. Si viene de Excel, guardala como CSV. Una celda vacía no borra el dato que ya había.
            </p>
            <Button size="sm" variant="outline" className="mt-3" onClick={descargarEjemplo}>
              <Download /> Planilla de ejemplo
            </Button>
          </div>
        </div>

        {leida && (
          <div className="space-y-4 border-t pt-5">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{leida.archivo}</span>
              <Chip tono="exito">{cuantos(leida.filas.length, "agente", "agentes")} para actualizar</Chip>
              {leida.errores.length > 0 && <Chip tono="alerta">{cuantos(leida.errores.length, "fila con errores", "filas con errores")}</Chip>}
              {leida.repetidas > 0 && <Chip>{cuantos(leida.repetidas, "repetida", "repetidas")} (vale la última)</Chip>}
              {leida.vacias > 0 && <Chip>{cuantos(leida.vacias, "sin datos", "sin datos")}</Chip>}
            </div>
            <p className="text-xs text-muted-foreground">Columnas encontradas: {leida.columnas.map((c) => ETIQUETAS_COLUMNA[c]).join(", ")}.</p>
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Legajo</th>
                    <th className="px-3 py-2 font-medium">CUIL</th>
                    <th className="px-3 py-2 font-medium">Liquida</th>
                    <th className="px-3 py-2 font-medium">Ingreso</th>
                    <th className="px-3 py-2 font-medium">Situación de revista</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {leida.filas.slice(0, 8).map((f, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 font-mono tabular">{f.legajo ?? "—"}</td>
                      <td className="px-3 py-2 font-mono tabular">{f.cuil ?? "—"}</td>
                      <td className="px-3 py-2">{f.liquida === null ? "—" : f.liquida ? "Sí" : "No"}</td>
                      <td className="px-3 py-2 tabular">{f.fecha_ingreso ? dia(f.fecha_ingreso) : "—"}</td>
                      <td className="px-3 py-2">{f.situacion_revista ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {leida.filas.length > 8 && <p className="border-t px-3 py-2 text-xs text-muted-foreground">Y {leida.filas.length - 8} más.</p>}
            </div>
            {leida.errores.length > 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-300">Estas filas no se importan:</p>
                <ul className="mt-1 space-y-0.5 text-muted-foreground">
                  {leida.errores.slice(0, 10).map((e) => (
                    <li key={e.linea}>
                      Línea {e.linea}: {e.motivo}
                    </li>
                  ))}
                  {leida.errores.length > 10 && <li>Y {leida.errores.length - 10} más.</li>}
                </ul>
              </div>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => void elegir(undefined)} disabled={pendiente}>
                Cancelar
              </Button>
              <Button onClick={importar} disabled={pendiente || leida.filas.length === 0 || !fechaValida}>
                {pendiente ? <Loader2 className="animate-spin" /> : <Upload />} Actualizar {cuantos(leida.filas.length, "agente", "agentes")}
              </Button>
            </div>
          </div>
        )}

        {resultado && (
          <div className="flex gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
            <div>
              <p className="font-medium">
                {resultado.actualizados === 1 ? "Se actualizó 1 agente." : `Se actualizaron ${resultado.actualizados} agentes.`}
              </p>
              {resultado.sinCoincidencia > 0 ? (
                <p className="mt-1 text-muted-foreground">
                  {cuantos(resultado.sinCoincidencia, "fila no coincide", "filas no coinciden")} con ningún agente del sistema (todavía no tienen cuenta o el legajo no está cargado):{" "}
                  <span className="font-mono">{resultado.noEncontrados.join(", ")}</span>
                  {resultado.sinCoincidencia > resultado.noEncontrados.length ? " y más." : "."}
                </p>
              ) : (
                <p className="mt-1 text-muted-foreground">Todas las filas coincidieron con un agente.</p>
              )}
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="historial-civitas">
        <h2 id="historial-civitas" className="mb-2 text-sm font-medium text-muted-foreground">
          Últimas importaciones
        </h2>
        {historial.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">Todavía no se importó ninguna planilla.</p>
        ) : (
          <ul className="divide-y rounded-2xl border bg-card">
            {historial.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
                <span className="min-w-0 flex-1 truncate font-medium">{h.archivo}</span>
                <span className="text-muted-foreground">Datos al {dia(h.datosAl)}</span>
                <span className="tabular">
                  {h.actualizados} de {h.filas} agentes
                </span>
                <span className="text-xs text-muted-foreground">
                  {h.por} · {fechaHora(h.creadaAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Chip({ tono, children }: { tono?: "exito" | "alerta"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-medium",
        tono === "exito" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        tono === "alerta" && "bg-amber-500/15 text-amber-800 dark:text-amber-300",
        !tono && "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  )
}
