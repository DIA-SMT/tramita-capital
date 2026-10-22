"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Ban, CheckCheck, Download, Loader2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { fechaCorta } from "@/lib/dominio"
import { ESTADOS_NOVEDAD, fechaSimple, MOVIMIENTOS, periodo, periodoLargo, planillaCSV, type EstadoNovedad, type FilaNovedad } from "@/lib/novedades"
import { cn } from "@/lib/utils"
import { anularNovedad, marcarCargadas } from "./acciones"

type Filtro = "pendiente" | "cargada" | "todas"

const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()

function descargar(filas: FilaNovedad[]) {
  const url = URL.createObjectURL(new Blob([planillaCSV(filas)], { type: "text/csv;charset=utf-8" }))
  const a = document.createElement("a")
  a.href = url
  a.download = `novedades-haberes-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function ListaNovedades({ novedades, puedeCargar, base = "", demo = false }: { novedades: FilaNovedad[]; puedeCargar: boolean; base?: string; demo?: boolean }) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [filtro, setFiltro] = useState<Filtro>("pendiente")
  const [mes, setMes] = useState("todos")
  const [busqueda, setBusqueda] = useState("")
  const [elegidas, setElegidas] = useState<Set<string>>(new Set())
  const [dialogo, setDialogo] = useState<null | { tipo: "cargar" } | { tipo: "anular"; fila: FilaNovedad }>(null)
  const [texto, setTexto] = useState("")
  // En la vista previa, lo marcado o anulado se refleja en pantalla sin guardar nada.
  const [cambiosDemo, setCambiosDemo] = useState<Record<string, EstadoNovedad>>({})

  const filas = useMemo(() => novedades.map((n) => (cambiosDemo[n.id] ? { ...n, estado: cambiosDemo[n.id], cargadaAt: cambiosDemo[n.id] === "cargada" ? new Date().toISOString() : n.cargadaAt } : n)), [novedades, cambiosDemo])
  const meses = [...new Set(filas.map((n) => n.vigenciaDesde.slice(0, 7)))].sort().reverse()
  const q = normalizar(busqueda.trim())
  const visibles = filas.filter(
    (n) =>
      (filtro === "todas" ? true : n.estado === filtro) &&
      (mes === "todos" || n.vigenciaDesde.startsWith(mes)) &&
      (!q || normalizar(`${n.agente} ${n.legajo ?? ""} ${n.cuil ?? ""} ${n.expediente.numero} ${n.concepto}`).includes(q)),
  )
  const seleccion = visibles.filter((n) => elegidas.has(n.id))
  const pendientesElegidas = seleccion.filter((n) => n.estado === "pendiente")
  const todasElegidas = visibles.length > 0 && seleccion.length === visibles.length
  const cuenta = (f: Filtro) => (f === "todas" ? filas.length : filas.filter((n) => n.estado === f).length)

  const alternar = (id: string) =>
    setElegidas((s) => {
      const nuevo = new Set(s)
      if (nuevo.has(id)) nuevo.delete(id)
      else nuevo.add(id)
      return nuevo
    })

  function bajarPlanilla() {
    const filasPlanilla = seleccion.length ? seleccion : visibles
    if (filasPlanilla.length === 0) return void toast.info("No hay novedades para descargar con estos filtros")
    descargar(filasPlanilla)
    toast.success(`Planilla descargada: ${filasPlanilla.length} ${filasPlanilla.length === 1 ? "novedad" : "novedades"}`)
  }

  function confirmar() {
    if (!dialogo) return
    iniciar(async () => {
      if (dialogo.tipo === "cargar") {
        const ids = pendientesElegidas.map((n) => n.id)
        if (demo) {
          await new Promise((r) => setTimeout(r, 400))
          setCambiosDemo((c) => ({ ...c, ...Object.fromEntries(ids.map((id) => [id, "cargada" as const])) }))
          toast.success(`Vista previa: ${ids.length} marcadas como cargadas en Civitas`)
        } else {
          const r = await marcarCargadas(ids, texto)
          if (!r.ok) return void toast.error(r.error)
          toast.success(`${r.cantidad ?? ids.length} marcadas como cargadas en Civitas`)
          router.refresh()
        }
      } else {
        if (demo) {
          await new Promise((r) => setTimeout(r, 400))
          setCambiosDemo((c) => ({ ...c, [dialogo.fila.id]: "anulada" }))
          toast.success("Vista previa: novedad anulada")
        } else {
          const r = await anularNovedad(dialogo.fila.id, texto)
          if (!r.ok) return void toast.error(r.error)
          toast.success("Novedad anulada")
          router.refresh()
        }
      }
      setElegidas(new Set())
      setDialogo(null)
      setTexto("")
    })
  }

  return (
    <section className="rounded-2xl border bg-card">
      <div className="flex flex-col gap-3 border-b p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1 rounded-xl bg-muted p-1" role="tablist" aria-label="Estado">
            {(["pendiente", "cargada", "todas"] as const).map((f) => (
              <button
                key={f}
                role="tab"
                aria-selected={filtro === f}
                onClick={() => {
                  setFiltro(f)
                  setElegidas(new Set())
                }}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors",
                  filtro === f && "bg-background text-foreground shadow-sm",
                )}
              >
                {f === "pendiente" ? "Pendientes" : f === "cargada" ? "Cargadas" : "Todas"} <span className="text-xs tabular opacity-70">{cuenta(f)}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={bajarPlanilla}>
              <Download /> {seleccion.length ? `Planilla (${seleccion.length})` : "Planilla para Civitas"}
            </Button>
            {puedeCargar && (
              <Button onClick={() => setDialogo({ tipo: "cargar" })} disabled={pendientesElegidas.length === 0}>
                <CheckCheck /> Marcar cargadas{pendientesElegidas.length ? ` (${pendientesElegidas.length})` : ""}
              </Button>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={mes} onValueChange={setMes}>
            <SelectTrigger className="w-full shrink-0 sm:w-48" aria-label="Período">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los períodos</SelectItem>
              {meses.map((m) => (
                <SelectItem key={m} value={m}>
                  {periodoLargo(m).replace(/^./, (c) => c.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Agente, legajo, CUIL o expediente" className="pl-8" aria-label="Buscar" />
          </div>
        </div>
      </div>

      {visibles.length === 0 ? (
        <p className="px-4 py-14 text-center text-sm text-muted-foreground">
          {filtro === "pendiente" && !q && mes === "todos" ? "No hay novedades pendientes de carga. ¡Al día!" : "No hay novedades con estos filtros."}
        </p>
      ) : (
        <>
          <div className="hidden grid-cols-[2rem_1fr_1.4fr_8rem_9.5rem] gap-3 border-b px-4 py-2 text-xs font-medium text-muted-foreground md:grid">
            <Checkbox
              checked={todasElegidas}
              onCheckedChange={() => setElegidas(todasElegidas ? new Set() : new Set(visibles.map((n) => n.id)))}
              aria-label="Elegir todas"
            />
            <span>Agente</span>
            <span>Concepto</span>
            <span>Rige desde · resolución</span>
            <span>Estado</span>
          </div>
          <ul className="divide-y">
            {visibles.map((n) => (
              <li
                key={n.id}
                className={cn(
                  "grid grid-cols-[2rem_1fr] gap-x-3 gap-y-1.5 px-4 py-3 text-sm md:grid-cols-[2rem_1fr_1.4fr_8rem_9.5rem] md:items-center",
                  elegidas.has(n.id) && "bg-primary/[0.04]",
                  n.estado === "anulada" && "opacity-60",
                )}
              >
                <Checkbox checked={elegidas.has(n.id)} onCheckedChange={() => alternar(n.id)} aria-label={`Elegir la novedad de ${n.agente}`} className="row-span-4 mt-0.5 md:row-span-1 md:mt-0" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{n.agente}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    Legajo {n.legajo ?? "—"}
                    {n.cuil && ` · CUIL ${n.cuil}`}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="line-clamp-2">
                    <span
                      className={cn(
                        "mr-1.5 rounded-md px-1.5 py-0.5 text-[0.7rem] font-semibold",
                        n.movimiento === "baja" ? "bg-rose-500/10 text-rose-700 dark:text-rose-300" : "bg-primary/10 text-primary",
                      )}
                    >
                      {MOVIMIENTOS[n.movimiento]}
                    </span>
                    {n.concepto}
                  </p>
                  {Object.keys(n.detalle).length > 0 && (
                    <p className="truncate text-xs text-muted-foreground" title={Object.entries(n.detalle).map(([k, v]) => `${k}: ${v}`).join(" · ")}>
                      {Object.entries(n.detalle)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(" · ")}
                    </p>
                  )}
                </div>
                <div className="min-w-0 text-xs">
                  <p className="text-sm font-medium tabular">
                    <span className="text-xs font-normal text-muted-foreground md:hidden">Rige desde </span>
                    {periodo(n.vigenciaDesde)}
                    {n.vigenciaHasta && <span className="text-xs font-normal text-muted-foreground"> a {periodo(n.vigenciaHasta)}</span>}
                  </p>
                  <p className="truncate text-muted-foreground" title={n.resolucion.fecha ? `Resolución del ${fechaSimple(n.resolucion.fecha)}` : undefined}>
                    {n.resolucion.numero ? `Res. ${n.resolucion.numero}` : "Resolución firmada"}
                  </p>
                  {n.expediente.id ? (
                    <Link href={`${base}/expedientes/${n.expediente.id}`} className="font-mono text-muted-foreground hover:text-primary hover:underline">
                      {n.expediente.numero}
                    </Link>
                  ) : (
                    <p className="font-mono text-muted-foreground">{n.expediente.numero}</p>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 md:block">
                  <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-medium", ESTADOS_NOVEDAD[n.estado].clase)}>{ESTADOS_NOVEDAD[n.estado].etiqueta}</span>
                  <p className="text-[0.7rem] text-muted-foreground md:mt-0.5">
                    {n.estado === "cargada" && n.cargadaAt ? `el ${fechaCorta(n.cargadaAt)}${n.referencia ? ` · ${n.referencia}` : ""}` : `registrada el ${fechaCorta(n.registradaAt)}`}
                  </p>
                  {puedeCargar && n.estado === "pendiente" && (
                    <Button variant="ghost" size="xs" className="text-muted-foreground md:-ml-2" onClick={() => setDialogo({ tipo: "anular", fila: n })}>
                      <Ban /> Anular
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <Dialog
        open={!!dialogo}
        onOpenChange={(o) => {
          if (!o && !pendiente) {
            setDialogo(null)
            setTexto("")
          }
        }}
      >
        <DialogContent>
          {dialogo?.tipo === "cargar" ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  Marcar {pendientesElegidas.length} {pendientesElegidas.length === 1 ? "novedad" : "novedades"} como cargadas
                </DialogTitle>
                <DialogDescription>Confirmá que ya están cargadas en Civitas. Queda registrado quién y cuándo, y se mide la demora de carga.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-1.5">
                <Label htmlFor="ref-carga">
                  Referencia de la carga <span className="font-normal text-muted-foreground">(opcional)</span>
                </Label>
                <Input id="ref-carga" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ej.: lote Civitas octubre 2026" maxLength={200} />
              </div>
            </>
          ) : dialogo?.tipo === "anular" ? (
            <>
              <DialogHeader>
                <DialogTitle>Anular la novedad</DialogTitle>
                <DialogDescription>
                  {dialogo.fila.agente} · {dialogo.fila.concepto}. Usalo si se registró por error; el expediente conserva la foja y queda el motivo.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-1.5">
                <Label htmlFor="motivo-anulacion">Motivo</Label>
                <Textarea id="motivo-anulacion" value={texto} onChange={(e) => setTexto(e.target.value)} rows={3} maxLength={1000} />
              </div>
            </>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogo(null)} disabled={pendiente}>
              Cancelar
            </Button>
            <Button
              onClick={confirmar}
              disabled={pendiente || (dialogo?.tipo === "anular" && texto.trim().length < 5)}
              variant={dialogo?.tipo === "anular" ? "destructive" : "default"}
            >
              {pendiente && <Loader2 className="animate-spin" />} {dialogo?.tipo === "anular" ? "Anular" : "Confirmar carga"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
