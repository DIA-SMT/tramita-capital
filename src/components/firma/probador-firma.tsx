"use client"

import { useState } from "react"
import { CheckCircle2, Loader2, ScanSearch, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LienzoFirma } from "@/components/firma/lienzo-firma"
import { patronDeTrazos, type Evaluacion, type PatronFirma } from "@/lib/firma-trazo"
import { cn } from "@/lib/utils"

const numero = (n: number) => n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 3 })

/** Resultado de comparar una firma con el patrón registrado, explicado. */
export function ResultadoComparacion({ ev }: { ev: Evaluacion }) {
  const escala = Math.max(ev.umbral * 2.5, ev.puntaje * 1.1)
  const pos = (n: number) => `${Math.min(100, (n / escala) * 100)}%`
  const controles = [
    { ok: ev.puntaje <= ev.umbral, texto: "Forma, orden y dirección del trazo" },
    { ok: ev.duracionOk, texto: "Tiempo de firma parecido al tuyo" },
    { ok: ev.trazosOk, texto: "Cantidad de trazos parecida" },
  ]
  return (
    <div className={cn("rounded-2xl border p-4", ev.coincide ? "border-emerald-500/30 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/5")}>
      <p className={cn("flex items-center gap-2 font-semibold", ev.coincide ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300")}>
        {ev.coincide ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5" />}
        {ev.coincide ? "Coincide con tu firma registrada" : "No coincide con tu firma registrada"}
      </p>
      <div className="mt-4">
        <div className="relative h-3 rounded-full bg-rose-500/15">
          <div className="absolute inset-y-0 left-0 rounded-full bg-emerald-500/30" style={{ width: pos(ev.umbral) }} />
          <div className="absolute -top-1 h-5 w-0.5 bg-foreground/60" style={{ left: pos(ev.umbral) }} aria-hidden />
          <div
            className={cn("absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background shadow", ev.coincide ? "bg-emerald-600" : "bg-rose-600")}
            style={{ left: pos(ev.puntaje) }}
            aria-hidden
          />
        </div>
        <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
          <span>
            Distancia de esta firma: <strong className="text-foreground tabular">{numero(ev.puntaje)}</strong>
          </span>
          <span>
            Máximo permitido para vos: <strong className="text-foreground tabular">{numero(ev.umbral)}</strong>
          </span>
        </div>
      </div>
      <ul className="mt-3 space-y-1 text-sm">
        {controles.map((c) => (
          <li key={c.texto} className="flex items-center gap-2">
            {c.ok ? <CheckCircle2 className="size-4 text-emerald-600" /> : <XCircle className="size-4 text-rose-600" />}
            {c.texto}
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Probar la firma sin firmar nada: se dibuja, se compara con el patrón registrado
 * y se muestra la distancia frente al máximo permitido.
 */
export function ProbadorFirma({ comparar }: { comparar: (trazo: PatronFirma) => Promise<Evaluacion | { error: string }> }) {
  const [trazo, setTrazo] = useState<PatronFirma | null>(null)
  const [resultado, setResultado] = useState<Evaluacion | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [comparando, setComparando] = useState(false)
  const [lienzo, setLienzo] = useState(0)

  async function probar() {
    if (!trazo) return
    setComparando(true)
    setError(null)
    const r = await comparar(trazo)
    setComparando(false)
    if ("error" in r) return setError(r.error)
    setResultado(r)
  }

  function otra() {
    setTrazo(null)
    setResultado(null)
    setError(null)
    setLienzo((k) => k + 1)
  }

  return (
    <div className="space-y-3">
      <LienzoFirma
        key={lienzo}
        compacto
        deshabilitado={comparando}
        alCambiar={(_png, _vista, trazos) => {
          setResultado(null)
          setTrazo(trazos ? patronDeTrazos(trazos) : null)
        }}
      />
      <div className="flex flex-wrap items-center justify-end gap-2">
        {resultado && (
          <Button size="sm" variant="ghost" onClick={otra}>
            Probar otra vez
          </Button>
        )}
        <Button size="sm" onClick={probar} disabled={!trazo || comparando}>
          {comparando ? <Loader2 className="animate-spin" /> : <ScanSearch />} Comparar con mi firma
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {resultado && <ResultadoComparacion ev={resultado} />}
    </div>
  )
}
