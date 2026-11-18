"use client"

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react"
import {
  AlertTriangle,
  ArrowRight,
  ArrowUp,
  Gauge,
  Info,
  Loader2,
  MessageCircleQuestion,
  RotateCcw,
  Scale,
  SearchCheck,
  Sparkles,
  TrendingUp,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { haceCuanto } from "@/lib/dominio"
import { duracionHoras, type ObservacionesTramite } from "@/lib/tablero-datos"
import { PREGUNTAS_SUGERIDAS, type AnalisisIA, type Lectura, type RespuestaTablero } from "@/lib/tablero-ia"
import { cn } from "@/lib/utils"

/** Lo que la vista previa simula en lugar de llamar a la IA. */
export type DemoTableroIA = {
  lectura: AnalisisIA
  observaciones: AnalisisIA | null
  respuestas: { pregunta: string; respuesta: RespuestaTablero }[]
  otra: RespuestaTablero
}

export type PropsTableroIA = {
  disponible: boolean
  puedeCorrer: boolean
  lectura: AnalisisIA | null
  observaciones: AnalisisIA | null
  demo?: DemoTableroIA
}

const HALLAZGO: Record<Lectura["hallazgos"][number]["tipo"], { etiqueta: string; icono: LucideIcon; tono: string }> = {
  cuello: { etiqueta: "Cuello de botella", icono: Gauge, tono: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  tendencia: { etiqueta: "Tendencia", icono: TrendingUp, tono: "bg-primary/10 text-primary" },
  desvio: { etiqueta: "Desvío", icono: Scale, tono: "bg-orange-500/10 text-orange-700 dark:text-orange-300" },
  carga: { etiqueta: "Carga del equipo", icono: Users, tono: "bg-violet-500/10 text-violet-700 dark:text-violet-300" },
  logro: { etiqueta: "Logro", icono: Trophy, tono: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  riesgo: { etiqueta: "Riesgo", icono: AlertTriangle, tono: "bg-rose-500/10 text-rose-700 dark:text-rose-300" },
}

const DONDE = { formulario: "En el formulario", requisitos: "En los requisitos", instrucciones: "En las instrucciones", circuito: "En el circuito", otro: "Otro" }

/** Corre un análisis (lectura u observaciones) con un reloj y pasos de espera; en la demo, lo simula. */
function useAnalisis(accion: "lectura" | "observaciones", inicial: AnalisisIA | null, dias: number, demo: AnalisisIA | null | undefined, pasos: string[]) {
  const [analisis, setAnalisis] = useState(inicial)
  const [corriendo, setCorriendo] = useState(false)
  const [error, setError] = useState("")
  const [segundos, setSegundos] = useState(0)
  const reloj = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => () => {
    if (reloj.current) clearInterval(reloj.current)
  }, [])

  async function correr() {
    setCorriendo(true)
    setError("")
    setSegundos(0)
    const inicio = Date.now()
    reloj.current = setInterval(() => setSegundos(Math.floor((Date.now() - inicio) / 1000)), 500)
    try {
      if (demo !== undefined) {
        await new Promise((r) => setTimeout(r, 4200))
        if (!demo) throw new Error("En la vista previa no hay un ejemplo para esto.")
        setAnalisis({ ...demo, dias, at: new Date().toISOString() })
      } else {
        const r = await fetch("/api/ia/tablero", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accion, dias }) })
        const cuerpo = (await r.json().catch(() => null)) as { analisis?: AnalisisIA; error?: string } | null
        if (!r.ok || !cuerpo?.analisis) throw new Error(cuerpo?.error ?? "No se pudo completar la lectura con IA.")
        setAnalisis(cuerpo.analisis)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar la lectura con IA.")
    } finally {
      if (reloj.current) clearInterval(reloj.current)
      setCorriendo(false)
    }
  }
  const paso = pasos[Math.min(pasos.length - 1, Math.floor(segundos / 4))]
  return { analisis, corriendo, error, segundos, paso, correr }
}

function Esperando({ paso, segundos, nota }: { paso: string; segundos: number; nota: string }) {
  return (
    <div className="space-y-3 py-2" aria-live="polite">
      <p className="flex items-center gap-2 text-sm font-medium">
        <Loader2 className="size-4 animate-spin text-primary" /> {paso}
        <span className="ml-auto text-xs font-normal text-muted-foreground tabular">{segundos} s</span>
      </p>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-1/3 animate-[barrido_1.6s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-marca-2 to-marca-1" />
      </div>
      <p className="text-xs text-muted-foreground">{nota}</p>
    </div>
  )
}

function MarcaIA() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-wide text-primary uppercase">
      <Sparkles className="size-3" /> IA
    </span>
  )
}

function Pie({ a, sobre }: { a: AnalisisIA; sobre: ReactNode }) {
  return (
    <p className="mt-4 text-xs text-muted-foreground">
      Lo hizo la IA {haceCuanto(a.at)}
      {a.por ? ` a pedido de ${a.por}` : ""}, {sobre}. Señala lo que conviene mirar: las decisiones son del equipo.
    </p>
  )
}

// ---------------------------------------------------------------------------------------------------------------
// Lectura del tablero y preguntas
// ---------------------------------------------------------------------------------------------------------------

export function LecturaIA({ dias, ia }: { dias: number; ia: PropsTableroIA }) {
  const { analisis, corriendo, error, segundos, paso, correr } = useAnalisis("lectura", ia.lectura, dias, ia.demo ? ia.demo.lectura : undefined, [
    "Juntando los indicadores…",
    "Comparando con el papel y con los objetivos…",
    "Buscando dónde se traba cada trámite…",
    "Mirando el reparto de la carga…",
    "Escribiendo los hallazgos…",
  ])
  const habilitado = ia.puedeCorrer && (ia.disponible || Boolean(ia.demo))
  const lectura = analisis?.tipo === "lectura" ? analisis.lectura : null

  return (
    <section className="relative overflow-clip rounded-3xl border bg-card print:break-inside-avoid">
      <div className="pointer-events-none absolute -top-24 -left-16 size-64 rounded-full bg-gradient-to-br from-marca-2/25 to-marca-1/5 blur-3xl print:hidden" aria-hidden />
      <div className="pointer-events-none absolute -right-20 -bottom-24 size-64 rounded-full bg-gradient-to-tr from-marca-3/15 to-transparent blur-3xl print:hidden" aria-hidden />
      <header className="relative flex flex-wrap items-start gap-3 p-5 sm:p-6">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-marca-2 to-marca-1 text-white shadow-lg shadow-primary/25">
          <Sparkles className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="flex flex-wrap items-center gap-2 font-semibold">
            Lectura del tablero <MarcaIA />
          </h2>
          <p className="text-sm text-muted-foreground">La IA lee todos los indicadores y te dice qué está pasando y qué conviene hacer.</p>
        </div>
        {habilitado && !corriendo && (
          <Button size="sm" variant={lectura ? "ghost" : "default"} onClick={correr} className={cn("shrink-0 print:hidden", lectura && "text-muted-foreground")}>
            {lectura ? (
              <>
                <RotateCcw /> <span className="hidden sm:inline">Actualizar</span>
              </>
            ) : (
              <>
                <Sparkles /> Leer el tablero
              </>
            )}
          </Button>
        )}
      </header>

      <div className="relative border-t px-5 py-5 sm:px-6">
        {corriendo ? (
          <Esperando paso={paso} segundos={segundos} nota="Suele tardar entre 15 y 40 segundos." />
        ) : lectura && analisis ? (
          <>
            {analisis.dias !== dias && (
              <p className="mb-4 flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
                <Info className="size-4 shrink-0" /> Esta lectura es sobre los últimos {analisis.dias} días.
              </p>
            )}
            <p className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">{lectura.titular}</p>
            <ul className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {lectura.hallazgos.map((h, i) => {
                const t = HALLAZGO[h.tipo]
                return (
                  <li
                    key={i}
                    className="flex flex-col rounded-2xl border bg-background/70 p-4 backdrop-blur animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <span className={cn("inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium", t.tono)}>
                      <t.icono className="size-3.5" /> {t.etiqueta}
                    </span>
                    <p className={cn("mt-3 font-semibold tracking-tight tabular", h.cifra.length > 14 ? "text-xl" : "text-3xl")}>{h.cifra}</p>
                    <p className="mt-1 font-medium">{h.titulo}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{h.detalle}</p>
                    <p className="mt-auto flex items-start gap-1.5 pt-3 text-sm">
                      <ArrowRight className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>{h.accion}</span>
                    </p>
                  </li>
                )
              })}
            </ul>
            {lectura.limites.length > 0 && (
              <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
                {lectura.limites.map((l, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <Info className="mt-px size-3.5 shrink-0" /> {l}
                  </li>
                ))}
              </ul>
            )}
            <Pie a={analisis} sobre={`sobre los últimos ${analisis.dias} días`} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {!ia.disponible && !ia.demo
              ? "La IA no está configurada en este entorno."
              : ia.puedeCorrer
                ? "Todavía no hay una lectura de este tablero. Tocá «Leer el tablero»: la IA cruza tiempos, pasos, carga y papel, y escribe los hallazgos."
                : "Todavía no hay una lectura de este tablero. La pueden pedir los jefes, quienes dictaminan y quienes firman."}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 flex items-start gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {error}
          </p>
        )}
        {habilitado && <PreguntaTablero dias={dias} demo={ia.demo} />}
      </div>
    </section>
  )
}

type Intercambio = { pregunta: string; respuesta: RespuestaTablero | null; error?: string }

function PreguntaTablero({ dias, demo }: { dias: number; demo?: DemoTableroIA }) {
  const [texto, setTexto] = useState("")
  const [historial, setHistorial] = useState<Intercambio[]>([])
  const ocupado = historial.some((h) => !h.respuesta && !h.error)

  async function preguntar(pregunta: string) {
    pregunta = pregunta.trim()
    if (pregunta.length < 3 || ocupado) return
    setTexto("")
    setHistorial((h) => [{ pregunta, respuesta: null }, ...h].slice(0, 4))
    const responder = (cambio: Partial<Intercambio>) => setHistorial((h) => h.map((x) => (x.pregunta === pregunta && !x.respuesta && !x.error ? { ...x, ...cambio } : x)))
    try {
      if (demo) {
        await new Promise((r) => setTimeout(r, 2200))
        responder({ respuesta: demo.respuestas.find((x) => x.pregunta === pregunta)?.respuesta ?? demo.otra })
        return
      }
      const r = await fetch("/api/ia/tablero", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accion: "pregunta", dias, pregunta }) })
      const cuerpo = (await r.json().catch(() => null)) as { respuesta?: RespuestaTablero; error?: string } | null
      if (!r.ok || !cuerpo?.respuesta) throw new Error(cuerpo?.error ?? "No se pudo responder.")
      responder({ respuesta: cuerpo.respuesta })
    } catch (e) {
      responder({ error: e instanceof Error ? e.message : "No se pudo responder." })
    }
  }

  function enviar(ev: FormEvent) {
    ev.preventDefault()
    void preguntar(texto)
  }

  return (
    <div className="mt-6 border-t pt-5 print:hidden">
      <form onSubmit={enviar} className="flex items-center gap-2 rounded-2xl border bg-background p-1.5 pl-3 shadow-sm focus-within:ring-2 focus-within:ring-ring/40">
        <MessageCircleQuestion className="size-4 shrink-0 text-primary" />
        <label htmlFor="pregunta-tablero" className="sr-only">
          Preguntale al tablero
        </label>
        <input
          id="pregunta-tablero"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={500}
          placeholder="Preguntale al tablero, por ejemplo: ¿qué paso demora más la bonificación por título?"
          className="min-w-0 flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground"
        />
        <Button type="submit" size="icon" className="size-8 shrink-0 rounded-xl" disabled={ocupado || texto.trim().length < 3} aria-label="Preguntar">
          {ocupado ? <Loader2 className="animate-spin" /> : <ArrowUp />}
        </Button>
      </form>
      {historial.length === 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {PREGUNTAS_SUGERIDAS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => void preguntar(p)}
              className="rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              {p}
            </button>
          ))}
        </div>
      )}
      <ul className="mt-4 space-y-4" aria-live="polite">
        {historial.map((h, i) => (
          <li key={`${h.pregunta}-${i}`} className="space-y-2 animate-in fade-in slide-in-from-top-1">
            <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3 py-2 text-sm text-primary-foreground">{h.pregunta}</p>
            {h.error ? (
              <p className="flex items-start gap-2 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {h.error}
              </p>
            ) : !h.respuesta ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin text-primary" /> Leyendo los números…
              </p>
            ) : (
              <div className="max-w-[92%] rounded-2xl rounded-bl-md border bg-muted/30 p-3.5">
                <p className="text-sm leading-relaxed">{h.respuesta.respuesta}</p>
                {h.respuesta.cifras.length > 0 && (
                  <dl className="mt-3 flex flex-wrap gap-2">
                    {h.respuesta.cifras.map((c, j) => (
                      <div key={j} className="rounded-xl border bg-background px-3 py-1.5">
                        <dt className="text-[0.7rem] text-muted-foreground">{c.etiqueta}</dt>
                        <dd className="text-sm font-semibold tabular">{c.valor}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {h.respuesta.sin_datos && (
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                    <Info className="mt-px size-3.5 shrink-0" /> {h.respuesta.sin_datos}
                  </p>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ---------------------------------------------------------------------------------------------------------------
// Por qué se observan los trámites
// ---------------------------------------------------------------------------------------------------------------

export function ObservacionesTablero({ dias, estadisticas, ia }: { dias: number; estadisticas: ObservacionesTramite[]; ia: PropsTableroIA }) {
  const { analisis, corriendo, error, segundos, paso, correr } = useAnalisis(
    "observaciones",
    ia.observaciones,
    dias,
    ia.demo ? ia.demo.observaciones : undefined,
    ["Juntando las observaciones…", "Leyendo qué se pidió corregir…", "Agrupando por causa…", "Pensando qué cambiar en cada trámite…"],
  )
  const habilitado = ia.puedeCorrer && (ia.disponible || Boolean(ia.demo))
  const total = estadisticas.reduce((s, o) => s + o.observaciones, 0)
  const resultado = analisis?.tipo === "observaciones" ? analisis.analisis : null
  const maxObs = Math.max(1, ...estadisticas.map((o) => o.observaciones))
  const maxCausa = Math.max(1, ...(resultado?.causas.map((c) => c.cantidad) ?? []))

  return (
    <section className="rounded-2xl border bg-card p-5 sm:p-6 print:break-inside-avoid">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="flex flex-wrap items-center gap-2 font-medium">
            <SearchCheck className="size-4 text-primary" /> Por qué se observan los trámites
          </h2>
          <p className="text-sm text-muted-foreground">
            Lo que se les pidió corregir a los agentes en los últimos {dias} días: cada observación es un trámite que se frenó.
          </p>
        </div>
        {habilitado && !corriendo && total >= 3 && (
          <Button size="sm" variant={resultado ? "ghost" : "outline"} onClick={correr} className={cn("shrink-0 print:hidden", resultado && "text-muted-foreground")}>
            {resultado ? <RotateCcw /> : <Sparkles />} {resultado ? <span className="hidden sm:inline">Volver a buscar</span> : "Buscar las causas"}
          </Button>
        )}
      </div>

      {estadisticas.length === 0 ? (
        <p className="mt-4 rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">No hubo observaciones en el período. Los trámites entraron completos.</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <div className="viz min-w-0">
            <ul className="space-y-3.5">
              {estadisticas.slice(0, 8).map((o) => (
                <li key={o.codigo}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate">{o.nombre}</span>
                    <span className="shrink-0 font-medium tabular">{o.observaciones}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-muted/70">
                    <div className="h-full rounded-full" style={{ width: `${(o.observaciones / maxObs) * 100}%`, background: "var(--serie-1)" }} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {o.expedientes} {o.expedientes === 1 ? "expediente" : "expedientes"}
                    {o.respuestaHoras == null ? " · sin respuestas todavía" : ` · el agente respondió en ${duracionHoras(o.respuestaHoras)} (mediana)`}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">Observaciones por trámite, sin los reservados. La respuesta se mide desde la observación hasta que el agente subsanó.</p>
          </div>

          <div className="relative min-w-0 rounded-2xl border border-dashed bg-muted/20 p-4" aria-live="polite">
            <p className="mb-3 flex items-center gap-2 text-sm font-medium">
              Causas de fondo <MarcaIA />
            </p>
            {corriendo ? (
              <Esperando paso={paso} segundos={segundos} nota="La IA lee cada observación y las agrupa. La cuenta de cada causa la hace el sistema." />
            ) : resultado && analisis ? (
              <>
                <p className="text-sm">{resultado.resumen}</p>
                <ol className="mt-4 space-y-4">
                  {resultado.causas.map((c, i) => (
                    <li key={i} className="animate-in fade-in slide-in-from-bottom-1 fill-mode-both" style={{ animationDelay: `${i * 70}ms` }}>
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="font-medium">{c.causa}</p>
                        <span className="shrink-0 text-sm text-muted-foreground tabular">
                          {c.cantidad} de {resultado.total}
                        </span>
                      </div>
                      <div className="viz mt-1 h-1.5 rounded-full bg-muted/70">
                        <div className="h-full rounded-full" style={{ width: `${(c.cantidad / maxCausa) * 100}%`, background: i === 0 ? "var(--serie-2)" : "var(--serie-1)" }} />
                      </div>
                      <p className="mt-1.5 text-xs text-muted-foreground">{c.tramites.join(" · ")}</p>
                      <p className="mt-1.5 flex items-start gap-1.5 text-sm">
                        <ArrowRight className="mt-0.5 size-4 shrink-0 text-primary" />
                        <span>
                          <span className="font-medium">{DONDE[c.donde]}:</span> {c.mejora}
                        </span>
                      </p>
                    </li>
                  ))}
                </ol>
                <Pie a={analisis} sobre={`sobre ${resultado.total} observaciones de los últimos ${analisis.dias} días`} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {total < 3
                  ? "Con menos de 3 observaciones no hay causas para buscar."
                  : habilitado
                    ? "Tocá «Buscar las causas»: la IA lee lo que se pidió corregir, lo agrupa por causa y propone qué cambiar del formulario o los requisitos para que no vuelva a pasar."
                    : "Todavía nadie buscó las causas. Lo pueden pedir los jefes, quienes dictaminan y quienes firman."}
              </p>
            )}
            {error && (
              <p role="alert" className="mt-3 flex items-start gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {error}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
