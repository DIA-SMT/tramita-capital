"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Eraser, Undo2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  crudoDeTrazos,
  MAXIMO_PUNTOS,
  patronDeCrudo,
  visibleDeCrudo,
  type Dispositivo,
  type FirmaCapturada,
  type Tinta,
  type Trazo,
} from "@/lib/firma-trazo"
import { cn } from "@/lib/utils"

const TINTAS: { valor: Tinta; etiqueta: string }[] = [
  { valor: "#1e3a8a", etiqueta: "Azul" },
  { valor: "#111827", etiqueta: "Negra" },
]

const dispositivoDe = (tipo: string): Dispositivo => (tipo === "pen" || tipo === "touch" || tipo === "mouse" ? tipo : "desconocido")
const contarPuntos = (trazos: Trazo[]) => trazos.reduce((s, t) => s + t.length, 0)

/**
 * Firma ológrafa electrónica: se dibuja con el dedo, un lápiz o el mouse.
 * Captura el trazo crudo de cada punto (posición, tiempo y, con lápiz, presión) y el
 * dispositivo. Eso es lo que viaja: la base calcula el patrón, compara y estampa.
 */
export function LienzoFirma({
  alCambiar,
  deshabilitado,
  compacto = false,
}: {
  alCambiar: (firma: FirmaCapturada | null) => void
  deshabilitado?: boolean
  compacto?: boolean
}) {
  const lienzo = useRef<HTMLCanvasElement>(null)
  const trazos = useRef<Trazo[]>([])
  /** Tipo de puntero de cada trazo (lápiz, dedo o mouse). */
  const tipos = useRef<string[]>([])
  const actual = useRef<Trazo | null>(null)
  const [tinta, setTinta] = useState<Tinta>(TINTAS[0].valor)
  const [cantidad, setCantidad] = useState(0)
  const [excedida, setExcedida] = useState(false)
  // El callback del padre puede cambiar en cada render: se lee siempre el último.
  const avisar = useRef(alCambiar)
  useEffect(() => {
    avisar.current = alCambiar
  })

  const contexto = useCallback(() => {
    const c = lienzo.current
    if (!c) return null
    const ctx = c.getContext("2d")
    if (!ctx) return null
    return { c, ctx }
  }, [])

  // Ajusta el lienzo a la densidad de píxeles de la pantalla.
  const ajustar = useCallback(() => {
    const r = contexto()
    if (!r) return
    const dpr = Math.max(1, window.devicePixelRatio || 1)
    const { width, height } = r.c.getBoundingClientRect()
    r.c.width = Math.round(width * dpr)
    r.c.height = Math.round(height * dpr)
    r.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }, [contexto])

  const dibujarTrazo = useCallback((ctx: CanvasRenderingContext2D, trazo: Trazo, color: string) => {
    if (trazo.length === 0) return
    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    if (trazo.length === 1) {
      ctx.beginPath()
      ctx.arc(trazo[0].x, trazo[0].y, 1.4, 0, Math.PI * 2)
      ctx.fill()
      return
    }
    for (let i = 1; i < trazo.length; i++) {
      const a = trazo[i - 1]
      const b = trazo[i]
      // Con lápiz, el grosor sigue la presión; si no, más rápido es más fino, como una lapicera.
      const v = Math.hypot(b.x - a.x, b.y - a.y) / Math.max(1, b.t - a.t)
      ctx.lineWidth = b.p !== undefined && b.p >= 0 ? 1 + b.p * 2.8 : Math.max(1.3, Math.min(3.4, 3.6 - v * 1.4))
      const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      ctx.beginPath()
      ctx.moveTo(i === 1 ? a.x : (trazo[i - 2].x + a.x) / 2, i === 1 ? a.y : (trazo[i - 2].y + a.y) / 2)
      ctx.quadraticCurveTo(a.x, a.y, m.x, m.y)
      ctx.stroke()
    }
  }, [])

  const redibujar = useCallback(() => {
    const r = contexto()
    if (!r) return
    const { width, height } = r.c.getBoundingClientRect()
    r.ctx.clearRect(0, 0, width, height)
    for (const t of trazos.current) dibujarTrazo(r.ctx, t, tinta)
  }, [contexto, dibujarTrazo, tinta])

  // Entrega el trazo crudo con su patrón y el trazo visible (o null si no alcanza para comparar).
  const exportar = useCallback(() => {
    const validos = trazos.current.filter((t) => t.length > 0)
    if (validos.length === 0 || contarPuntos(validos) > MAXIMO_PUNTOS) return void avisar.current(null)
    const crudo = crudoDeTrazos(validos)
    const patron = patronDeCrudo(crudo)
    const visible = visibleDeCrudo(crudo)
    if (!patron || !visible) return void avisar.current(null)
    // El dispositivo con el que se hizo la mayor parte de la firma.
    const conteo = new Map<string, number>()
    tipos.current.forEach((t, i) => conteo.set(t, (conteo.get(t) ?? 0) + trazos.current[i].length))
    const tipo = [...conteo.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ""
    avisar.current({ crudo, patron, visible, tinta, dispositivo: dispositivoDe(tipo) })
  }, [tinta])

  useEffect(() => {
    ajustar()
    redibujar()
    // Al cambiar la tinta se vuelve a entregar la firma ya dibujada.
    if (trazos.current.length > 0) exportar()
    const alRedimensionar = () => {
      ajustar()
      redibujar()
    }
    window.addEventListener("resize", alRedimensionar)
    return () => window.removeEventListener("resize", alRedimensionar)
  }, [ajustar, redibujar, exportar])

  const punto = (ev: PointerEvent, r: DOMRect) => ({
    x: ev.clientX - r.left,
    y: ev.clientY - r.top,
    t: ev.timeStamp,
    // La presión solo es real con lápiz; con mouse o dedo los navegadores informan un valor fijo.
    p: ev.pointerType === "pen" ? ev.pressure : undefined,
  })

  function empezar(e: React.PointerEvent<HTMLCanvasElement>) {
    if (deshabilitado) return
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Algunos navegadores no permiten capturar el puntero: se sigue dibujando igual.
    }
    actual.current = [punto(e.nativeEvent, e.currentTarget.getBoundingClientRect())]
    trazos.current.push(actual.current)
    tipos.current.push(e.pointerType)
    redibujar()
  }
  function mover(e: React.PointerEvent<HTMLCanvasElement>) {
    const trazo = actual.current
    if (!trazo) return
    // Los eventos agrupados dan trazos más finos; algunos navegadores devuelven la lista vacía.
    const agrupados = e.nativeEvent.getCoalescedEvents?.() ?? []
    const eventos = agrupados.length > 0 ? agrupados : [e.nativeEvent]
    const r = e.currentTarget.getBoundingClientRect()
    for (const ev of eventos) {
      const p = punto(ev, r)
      const u = trazo[trazo.length - 1]
      if (u && u.t === p.t && u.x === p.x && u.y === p.y) continue
      trazo.push(p)
    }
    redibujar()
  }
  function terminar() {
    if (!actual.current) return
    actual.current = null
    setCantidad(trazos.current.length)
    setExcedida(contarPuntos(trazos.current) > MAXIMO_PUNTOS)
    exportar()
  }

  function deshacer() {
    trazos.current.pop()
    tipos.current.pop()
    setCantidad(trazos.current.length)
    setExcedida(contarPuntos(trazos.current) > MAXIMO_PUNTOS)
    redibujar()
    exportar()
  }
  function limpiar() {
    trazos.current = []
    tipos.current = []
    setCantidad(0)
    setExcedida(false)
    redibujar()
    avisar.current(null)
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-primary/25 bg-white">
      <canvas
        ref={lienzo}
        className={cn("block w-full touch-none", compacto ? "h-40" : "h-52 sm:h-56", deshabilitado ? "cursor-not-allowed opacity-60" : "cursor-crosshair")}
        onPointerDown={empezar}
        onPointerMove={mover}
        onPointerUp={terminar}
        onPointerCancel={terminar}
        aria-label="Área para dibujar la firma"
      />
      <span aria-hidden className={cn("pointer-events-none absolute inset-x-8 border-b border-slate-300", compacto ? "bottom-9" : "bottom-12")} />
      <span aria-hidden className={cn("pointer-events-none absolute left-8 text-xs text-slate-400", compacto ? "bottom-3" : "bottom-6")}>
        Firmá sobre la línea
      </span>
      {excedida && (
        <p className="absolute inset-x-3 top-3 mr-28 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800">
          La firma es demasiado larga para compararla. Borrala y hacela de nuevo.
        </p>
      )}
      <div className="absolute top-2 right-2 flex items-center gap-1">
        <div className="mr-1 flex items-center gap-1" role="radiogroup" aria-label="Color de tinta">
          {TINTAS.map((t) => (
            <button
              key={t.valor}
              type="button"
              role="radio"
              aria-checked={tinta === t.valor}
              aria-label={`Tinta ${t.etiqueta.toLowerCase()}`}
              onClick={() => setTinta(t.valor)}
              className={cn("size-5 rounded-full border-2 border-white ring-2 ring-transparent transition", tinta === t.valor && "ring-primary")}
              style={{ background: t.valor }}
            />
          ))}
        </div>
        <Button type="button" size="icon-sm" variant="ghost" onClick={deshacer} disabled={cantidad === 0} aria-label="Deshacer el último trazo" className="text-slate-600 hover:bg-slate-100">
          <Undo2 />
        </Button>
        <Button type="button" size="icon-sm" variant="ghost" onClick={limpiar} disabled={cantidad === 0} aria-label="Borrar la firma" className="text-slate-600 hover:bg-slate-100">
          <Eraser />
        </Button>
      </div>
    </div>
  )
}
