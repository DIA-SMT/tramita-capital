"use client"

import { useState } from "react"
import { CheckCircle2, Copy, Loader2, ScanSearch, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LienzoFirma } from "@/components/firma/lienzo-firma"
import type { Evaluacion, FirmaCapturada } from "@/lib/firma-trazo"
import { cn } from "@/lib/utils"

const numero = (n: number) => n.toLocaleString("es-AR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })

/** Distancia de una medida frente al máximo permitido para esa persona. */
function Medidor({ titulo, detalle, puntaje, umbral }: { titulo: string; detalle: string; puntaje: number; umbral: number }) {
  const ok = puntaje <= umbral
  const escala = Math.max(umbral * 2.5, puntaje * 1.1)
  const pos = (n: number) => `${Math.min(100, (n / escala) * 100)}%`
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium">
          {titulo} <span className="font-normal text-muted-foreground">· {detalle}</span>
        </p>
        <p className={cn("shrink-0 text-xs tabular", ok ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300")}>
          {numero(puntaje)} <span className="text-muted-foreground">/ máx. {numero(umbral)}</span>
        </p>
      </div>
      <div className="relative h-2.5 rounded-full bg-rose-500/15">
        <div className="absolute inset-y-0 left-0 rounded-full bg-emerald-500/30" style={{ width: pos(umbral) }} />
        <div className="absolute -top-1 h-4.5 w-0.5 bg-foreground/60" style={{ left: pos(umbral) }} aria-hidden />
        <div
          className={cn("absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background shadow", ok ? "bg-emerald-600" : "bg-rose-600")}
          style={{ left: pos(puntaje) }}
          aria-hidden
        />
      </div>
    </div>
  )
}

/** Resultado de comparar una firma con la registrada, explicado medida por medida. */
export function ResultadoComparacion({ ev }: { ev: Evaluacion }) {
  const controles = [
    { ok: ev.duracionOk, texto: "Tiempo de firma parecido al tuyo" },
    { ok: ev.trazosOk, texto: "Cantidad de trazos parecida" },
    { ok: ev.largoOk, texto: "Largo de la tinta parecido" },
    { ok: !ev.copia, texto: "Es una firma nueva, no una copia de otra anterior" },
  ]
  return (
    <div className={cn("rounded-2xl border p-4", ev.coincide ? "border-emerald-500/30 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/5")}>
      <p className={cn("flex items-center gap-2 font-semibold", ev.coincide ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300")}>
        {ev.coincide ? <CheckCircle2 className="size-5" /> : ev.copia ? <Copy className="size-5" /> : <XCircle className="size-5" />}
        {ev.coincide ? "Coincide con tu firma registrada" : ev.copia ? "Es idéntica a una firma anterior: se rechaza como copia" : "No coincide con tu firma registrada"}
      </p>
      <div className="mt-4 space-y-3.5">
        <Medidor titulo="Forma" detalle="dibujo, orden y dirección del trazo" puntaje={ev.forma.puntaje} umbral={ev.forma.umbral} />
        <Medidor titulo="Ritmo" detalle="dónde acelerás y frenás la mano" puntaje={ev.ritmo.puntaje} umbral={ev.ritmo.umbral} />
      </div>
      <ul className="mt-4 grid gap-1 text-sm sm:grid-cols-2">
        {controles.map((c) => (
          <li key={c.texto} className="flex items-start gap-2">
            {c.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-rose-600" />}
            {c.texto}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">
        Distancias: 0 es idéntica. El máximo se calcula con tus tres muestras: cuanto más parejas, más exigente.
      </p>
    </div>
  )
}

/**
 * Probar la firma sin firmar nada: se dibuja, se compara con la registrada
 * y se muestra cada medida frente al máximo permitido.
 */
export function ProbadorFirma({ comparar }: { comparar: (firma: FirmaCapturada) => Promise<Evaluacion | { error: string }> }) {
  const [firma, setFirma] = useState<FirmaCapturada | null>(null)
  const [resultado, setResultado] = useState<Evaluacion | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [comparando, setComparando] = useState(false)
  const [lienzo, setLienzo] = useState(0)

  async function probar() {
    if (!firma) return
    setComparando(true)
    setError(null)
    const r = await comparar(firma)
    setComparando(false)
    if ("error" in r) return setError(r.error)
    setResultado(r)
  }

  function otra() {
    setFirma(null)
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
        alCambiar={(f) => {
          setResultado(null)
          setFirma(f)
        }}
      />
      <div className="flex flex-wrap items-center justify-end gap-2">
        {resultado && (
          <Button size="sm" variant="ghost" onClick={otra}>
            Probar otra vez
          </Button>
        )}
        <Button size="sm" onClick={probar} disabled={!firma || comparando}>
          {comparando ? <Loader2 className="animate-spin" /> : <ScanSearch />} Comparar con mi firma
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {resultado && <ResultadoComparacion ev={resultado} />}
    </div>
  )
}
