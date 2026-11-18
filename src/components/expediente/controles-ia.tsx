"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { AlertTriangle, CheckCircle2, ChevronDown, FileSearch, Loader2, RotateCcw, ScanText, ShieldCheck, Sparkles, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { desactualizado, type ControlGuardado, type ControlIA, type Cotejo, type Revision } from "@/lib/controles-ia"
import { haceCuanto } from "@/lib/dominio"
import { cn } from "@/lib/utils"

type Tipo = ControlIA["tipo"]

const PASOS_CARGA: Record<Tipo, string[]> = {
  cotejo: ["Abriendo los documentos…", "Leyendo cada página…", "Cotejando con el formulario y el perfil…", "Buscando firmas, sellos y fechas…"],
  revision: ["Leyendo el proyecto…", "Comparando con el dictamen y el expediente…", "Verificando fojas citadas y normativa…", "Revisando la redacción…"],
}

/**
 * Un control con IA sobre el expediente: el último resultado guardado (lo ve todo el equipo) y el botón para
 * correrlo de nuevo. En la vista previa (`demo`) se simula con `demoResultado`.
 */
function ControlConIA({
  tipo,
  expedienteId,
  inicial,
  baseActual,
  puedeCorrer,
  disponible,
  demo,
  demoResultado,
  titulo,
  descripcion,
  boton,
  avisoDesactualizado,
  icono,
  render,
}: {
  tipo: Tipo
  expedienteId: string
  inicial: ControlIA | null
  baseActual: string[]
  puedeCorrer: boolean
  disponible: boolean
  demo: boolean
  demoResultado?: ControlGuardado | null
  titulo: string
  descripcion: string
  boton: string
  avisoDesactualizado: string
  icono: ReactNode
  render: (c: ControlIA) => ReactNode
}) {
  const [control, setControl] = useState<ControlIA | null>(inicial)
  const [estado, setEstado] = useState<"quieto" | "corriendo" | "error">("quieto")
  const [error, setError] = useState("")
  const [paso, setPaso] = useState(0)
  const [segundos, setSegundos] = useState(0)
  const reloj = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => {
    if (reloj.current) clearInterval(reloj.current)
  }, [])

  async function correr() {
    setEstado("corriendo")
    setError("")
    setPaso(0)
    setSegundos(0)
    const inicio = Date.now()
    reloj.current = setInterval(() => {
      const s = Math.floor((Date.now() - inicio) / 1000)
      setSegundos(s)
      setPaso(Math.min(PASOS_CARGA[tipo].length - 1, Math.floor(s / 4)))
    }, 500)
    try {
      if (demo) {
        await new Promise((r) => setTimeout(r, 3800))
        if (!demoResultado) throw new Error("En la vista previa no hay un resultado de ejemplo para este expediente.")
        setControl({ ...demoResultado, base: baseActual, at: new Date().toISOString(), por: null })
      } else {
        const r = await fetch("/api/ia/controles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ expedienteId, control: tipo }),
        })
        const cuerpo = (await r.json().catch(() => null)) as { control?: ControlIA; error?: string } | null
        if (!r.ok || !cuerpo?.control) throw new Error(cuerpo?.error ?? "No se pudo completar el control.")
        setControl(cuerpo.control)
      }
      setEstado("quieto")
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar el control.")
      setEstado("error")
    } finally {
      if (reloj.current) clearInterval(reloj.current)
    }
  }

  const viejo = desactualizado(control, baseActual)
  const habilitado = puedeCorrer && (disponible || demo)

  return (
    <section className="relative overflow-clip rounded-2xl border bg-card">
      <div className="pointer-events-none absolute -top-16 -right-10 size-40 rounded-full bg-gradient-to-br from-marca-2/20 to-marca-1/5 blur-2xl" aria-hidden />
      <header className="relative flex items-start gap-3 p-4 sm:p-5">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">{icono}</span>
        <div className="min-w-0 flex-1">
          <h2 className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-medium">
            {titulo}
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-wide text-primary uppercase">
              <Sparkles className="size-3" /> IA
            </span>
          </h2>
          <p className="text-sm text-muted-foreground">{descripcion}</p>
        </div>
        {control && estado !== "corriendo" && habilitado && (
          <Button size="sm" variant="ghost" onClick={correr} className="shrink-0 text-muted-foreground">
            <RotateCcw /> <span className="hidden sm:inline">Volver a correr</span>
          </Button>
        )}
      </header>

      <div className="relative border-t px-4 py-4 sm:px-5" aria-live="polite">
        {estado === "corriendo" ? (
          <div className="space-y-3 py-1">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Loader2 className="size-4 animate-spin text-primary" /> {PASOS_CARGA[tipo][paso]}
              <span className="ml-auto text-xs font-normal text-muted-foreground tabular">{segundos} s</span>
            </p>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-1/3 animate-[barrido_1.6s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-marca-2 to-marca-1" />
            </div>
            <p className="text-xs text-muted-foreground">Suele tardar entre 15 y 30 segundos. Podés seguir trabajando en el expediente.</p>
          </div>
        ) : control ? (
          <>
            {viejo && (
              <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
                <AlertTriangle className="size-4 shrink-0" />
                <span className="min-w-0 flex-1">{avisoDesactualizado}</span>
                {habilitado && (
                  <Button size="xs" variant="outline" onClick={correr}>
                    <RotateCcw /> Volver a correr
                  </Button>
                )}
              </div>
            )}
            {render(control)}
            <p className="mt-4 text-[0.7rem] text-muted-foreground">
              Lo hizo la IA {haceCuanto(control.at)}
              {control.por ? ` a pedido de ${control.por}` : ""}. Señala lo que hay que mirar: la decisión es de una persona.
            </p>
          </>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <p className="flex-1 text-sm text-muted-foreground">
              {habilitado ? "Todavía no se corrió en este expediente." : puedeCorrer ? "La IA no está configurada en este entorno." : "Lo corre el área que tiene el expediente."}
            </p>
            {puedeCorrer && (
              <Button onClick={correr} disabled={!habilitado} className="shrink-0">
                <Sparkles /> {boton}
              </Button>
            )}
          </div>
        )}
        {estado === "error" && <p className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------
// Cotejo de la documentación
// ---------------------------------------------------------------------
const SEMAFORO = {
  verde: { texto: "Todo coincide", clase: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300", punto: "bg-emerald-500", Icono: CheckCircle2 },
  amarillo: { texto: "Hay algo para mirar", clase: "bg-amber-500/10 text-amber-900 dark:text-amber-200", punto: "bg-amber-500", Icono: AlertTriangle },
  rojo: { texto: "Hay diferencias", clase: "bg-rose-500/10 text-rose-800 dark:text-rose-300", punto: "bg-rose-500", Icono: XCircle },
} as const

const RESULTADO_COTEJO = {
  coincide: { texto: "Coincide", clase: "text-emerald-700 dark:text-emerald-400", Icono: CheckCircle2 },
  difiere: { texto: "Difiere", clase: "text-rose-700 dark:text-rose-400", Icono: XCircle },
  no_figura: { texto: "No figura", clase: "text-muted-foreground", Icono: AlertTriangle },
} as const

function estadoDocumento(d: Cotejo["documentos"][number]): keyof typeof SEMAFORO {
  if (d.corresponde === "no" || d.cotejos.some((c) => c.resultado === "difiere")) return "rojo"
  if (d.corresponde === "dudoso" || !d.legible || d.alertas.length > 0) return "amarillo"
  return "verde"
}

function ResultadoCotejo({ cotejo }: { cotejo: Cotejo }) {
  const s = SEMAFORO[cotejo.semaforo]
  const datos = cotejo.documentos.flatMap((d) => d.cotejos)
  const coinciden = datos.filter((c) => c.resultado === "coincide").length
  return (
    <div className="space-y-3">
      <div className={cn("flex items-start gap-3 rounded-xl px-3 py-2.5", s.clase)}>
        <s.Icono className="mt-0.5 size-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{s.texto}</p>
          <p className="text-sm opacity-90">{cotejo.conclusion}</p>
        </div>
        {datos.length > 0 && (
          <p className="hidden shrink-0 text-right text-xs tabular sm:block">
            <span className="block text-lg leading-none font-semibold">
              {coinciden}/{datos.length}
            </span>
            datos coinciden
          </p>
        )}
      </div>
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
        {cotejo.documentos.map((d, i) => {
          const e = SEMAFORO[estadoDocumento(d)]
          return (
            <li key={`${d.documento}-${i}`}>
              <details className="group rounded-xl border bg-background/60" open={estadoDocumento(d) !== "verde" && i < 3}>
                <summary className="flex cursor-pointer list-none items-center gap-2.5 px-3 py-2.5 text-sm [&::-webkit-details-marker]:hidden">
                  <span className={cn("size-2.5 shrink-0 rounded-full", e.punto)} aria-label={e.texto} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{d.documento}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {d.tipo_detectado}
                      {d.requisito && ` · cargado como ${d.requisito}`}
                    </span>
                  </span>
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <div className="space-y-3 border-t px-3 py-3">
                  {(d.corresponde !== "si" || !d.legible) && (
                    <p className="text-xs text-muted-foreground">
                      {d.corresponde === "no" ? "No corresponde al requisito." : d.corresponde === "dudoso" ? "No está claro que corresponda al requisito." : ""}
                      {!d.legible && " No se lee bien."}
                    </p>
                  )}
                  {d.cotejos.length > 0 && (
                    <dl className="grid grid-cols-[minmax(0,1fr)] gap-1.5 text-sm">
                      {d.cotejos.map((c, j) => {
                        const r = RESULTADO_COTEJO[c.resultado]
                        return (
                          <div key={j} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 rounded-lg bg-muted/40 px-2.5 py-1.5 sm:grid-cols-[9rem_minmax(0,1fr)_auto]">
                            <dt className="text-xs font-medium text-muted-foreground sm:pt-0.5">{c.dato}</dt>
                            <dd className="col-start-1 row-start-2 min-w-0 sm:col-start-2 sm:row-start-1">
                              <span className="block truncate" title={c.en_documento}>
                                {c.en_documento || "—"}
                              </span>
                              {c.resultado !== "coincide" && c.declarado && (
                                <span className="block truncate text-xs text-muted-foreground" title={c.declarado}>
                                  Declarado: {c.declarado}
                                </span>
                              )}
                            </dd>
                            <dd className={cn("row-span-2 flex items-center gap-1 text-xs font-medium sm:row-span-1", r.clase)}>
                              <r.Icono className="size-3.5" /> {r.texto}
                            </dd>
                          </div>
                        )
                      })}
                    </dl>
                  )}
                  {d.alertas.length > 0 && (
                    <ul className="space-y-1 text-sm">
                      {d.alertas.map((a, j) => (
                        <li key={j} className="flex gap-2 text-amber-900 dark:text-amber-200">
                          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {a}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </details>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function CotejoIA(props: {
  expedienteId: string
  inicial: ControlIA | null
  /** Ids de los documentos actuales: si cambian, el cotejo quedó viejo. */
  documentos: string[]
  puedeCorrer: boolean
  disponible: boolean
  demo?: boolean
  demoResultado?: ControlGuardado | null
}) {
  return (
    <ControlConIA
      tipo="cotejo"
      expedienteId={props.expedienteId}
      inicial={props.inicial?.tipo === "cotejo" ? props.inicial : null}
      baseActual={props.documentos}
      puedeCorrer={props.puedeCorrer}
      disponible={props.disponible}
      demo={props.demo ?? false}
      demoResultado={props.demoResultado}
      titulo="Cotejo de la documentación"
      descripcion="La IA lee cada adjunto y lo compara con lo que declaró el agente y con su perfil."
      boton="Cotejar documentación"
      avisoDesactualizado="Hay documentos nuevos desde el último cotejo."
      icono={<ScanText className="size-5" />}
      render={(c) => (c.tipo === "cotejo" ? <ResultadoCotejo cotejo={c.cotejo} /> : null)}
    />
  )
}

// ---------------------------------------------------------------------
// Segunda lectura del proyecto
// ---------------------------------------------------------------------
const VEREDICTO = {
  lista: { texto: "Lista para firmar", clase: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300", Icono: ShieldCheck },
  revisar: { texto: "Revisá antes de firmar", clase: "bg-amber-500/10 text-amber-900 dark:text-amber-200", Icono: AlertTriangle },
  corregir: { texto: "Corregir antes de firmar", clase: "bg-rose-500/10 text-rose-800 dark:text-rose-300", Icono: XCircle },
} as const

const CHEQUEO = {
  ok: { clase: "text-emerald-600 dark:text-emerald-400", barra: "bg-emerald-500", Icono: CheckCircle2, texto: "En orden" },
  atencion: { clase: "text-amber-600 dark:text-amber-400", barra: "bg-amber-500", Icono: AlertTriangle, texto: "Para mirar" },
  error: { clase: "text-rose-600 dark:text-rose-400", barra: "bg-rose-500", Icono: XCircle, texto: "Corregir" },
} as const

function ResultadoRevision({ revision }: { revision: Revision }) {
  const v = VEREDICTO[revision.veredicto]
  const enOrden = revision.chequeos.filter((c) => c.resultado === "ok").length
  return (
    <div className="space-y-3">
      <div className={cn("flex items-start gap-3 rounded-xl px-3 py-2.5", v.clase)}>
        <v.Icono className="mt-0.5 size-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{v.texto}</p>
          <p className="text-sm opacity-90">{revision.resumen}</p>
        </div>
        <p className="hidden shrink-0 text-right text-xs tabular sm:block">
          <span className="block text-lg leading-none font-semibold">
            {enOrden}/{revision.chequeos.length}
          </span>
          en orden
        </p>
      </div>
      <div className="flex gap-1" aria-hidden>
        {revision.chequeos.map((c, i) => (
          <span key={i} className={cn("h-1.5 flex-1 rounded-full", CHEQUEO[c.resultado].barra)} title={c.aspecto} />
        ))}
      </div>
      <ul className="divide-y rounded-xl border bg-background/60">
        {revision.chequeos.map((c, i) => {
          const k = CHEQUEO[c.resultado]
          return (
            <li key={i} className="flex gap-2.5 px-3 py-2.5 text-sm">
              <k.Icono className={cn("mt-0.5 size-4 shrink-0", k.clase)} aria-label={k.texto} />
              <div className="min-w-0">
                <p className="font-medium">{c.aspecto}</p>
                <p className={cn("text-muted-foreground", c.resultado !== "ok" && "text-foreground/85")}>{c.detalle}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function RevisionIA(props: {
  expedienteId: string
  inicial: ControlIA | null
  /** Versión del proyecto en preparación (`baseProyecto`): si se edita, la revisión quedó vieja. */
  proyecto: string
  puedeCorrer: boolean
  disponible: boolean
  demo?: boolean
  demoResultado?: ControlGuardado | null
}) {
  return (
    <ControlConIA
      tipo="revision"
      expedienteId={props.expedienteId}
      inicial={props.inicial?.tipo === "revision" ? props.inicial : null}
      baseActual={[props.proyecto]}
      puedeCorrer={props.puedeCorrer}
      disponible={props.disponible}
      demo={props.demo ?? false}
      demoResultado={props.demoResultado}
      titulo="Segunda lectura del proyecto"
      descripcion="Antes de firmar, la IA compara el proyecto con el expediente, el dictamen y el modelo del área."
      boton="Revisar el proyecto"
      avisoDesactualizado="El proyecto cambió desde esta revisión."
      icono={<FileSearch className="size-5" />}
      render={(c) => (c.tipo === "revision" ? <ResultadoRevision revision={c.revision} /> : null)}
    />
  )
}
