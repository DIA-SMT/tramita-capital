"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Eraser, Undo2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Trazo } from "@/lib/firma-trazo"
import { cn } from "@/lib/utils"

const TINTAS = [
  { valor: "#1e3a8a", etiqueta: "Azul" },
  { valor: "#111827", etiqueta: "Negra" },
]
const ALTO_EXPORTADO = 240
const MARGEN = 14

/**
 * Firma ológrafa electrónica: se dibuja con el dedo, un lápiz o el mouse.
 * Entrega el PNG recortado con fondo transparente (lo que se estampa) y los trazos
 * con tiempos (lo que se compara contra la firma registrada).
 */
export function LienzoFirma({
  alCambiar,
  deshabilitado,
  compacto = false,
}: {
  alCambiar: (png: Blob | null, vista: string | null, trazos: Trazo[] | null) => void
  deshabilitado?: boolean
  compacto?: boolean
}) {
  const lienzo = useRef<HTMLCanvasElement>(null)
  const trazos = useRef<Trazo[]>([])
  const actual = useRef<Trazo | null>(null)
  const [tinta, setTinta] = useState(TINTAS[0].valor)
  const [cantidad, setCantidad] = useState(0)
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
      // Más rápido, más fino: imita la tinta de una lapicera.
      const v = Math.hypot(b.x - a.x, b.y - a.y) / Math.max(1, b.t - a.t)
      ctx.lineWidth = Math.max(1.3, Math.min(3.4, 3.6 - v * 1.4))
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

  // Exporta el área con tinta, recortada y con fondo transparente, junto con los trazos.
  const exportar = useCallback(() => {
    const fuente = lienzo.current
    const ctx = fuente?.getContext("2d")
    if (!fuente || !ctx) return
    const { width, height } = fuente
    const datos = ctx.getImageData(0, 0, width, height).data
    let x0 = width
    let y0 = height
    let x1 = -1
    let y1 = -1
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (datos[(y * width + x) * 4 + 3] > 16) {
          if (x < x0) x0 = x
          if (x > x1) x1 = x
          if (y < y0) y0 = y
          if (y > y1) y1 = y
        }
      }
    }
    if (x1 < 0) return void avisar.current(null, null, null)
    const ancho = x1 - x0 + 1
    const alto = y1 - y0 + 1
    const escala = Math.min(1, (ALTO_EXPORTADO - MARGEN * 2) / alto)
    const salida = document.createElement("canvas")
    salida.width = Math.round(ancho * escala + MARGEN * 2)
    salida.height = Math.round(alto * escala + MARGEN * 2)
    const sctx = salida.getContext("2d")
    if (!sctx) return
    sctx.imageSmoothingQuality = "high"
    sctx.drawImage(fuente, x0, y0, ancho, alto, MARGEN, MARGEN, ancho * escala, alto * escala)
    const vista = salida.toDataURL("image/png")
    const copia = trazos.current.map((t) => t.map((p) => ({ ...p })))
    salida.toBlob((b) => avisar.current(b, b ? vista : null, b ? copia : null), "image/png")
  }, [])

  useEffect(() => {
    ajustar()
    redibujar()
    // Al cambiar la tinta se vuelve a exportar la firma ya dibujada.
    if (trazos.current.length > 0) exportar()
    const alRedimensionar = () => {
      ajustar()
      redibujar()
    }
    window.addEventListener("resize", alRedimensionar)
    return () => window.removeEventListener("resize", alRedimensionar)
  }, [ajustar, redibujar, exportar])

  const posicion = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top, t: e.timeStamp }
  }

  function empezar(e: React.PointerEvent<HTMLCanvasElement>) {
    if (deshabilitado) return
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Algunos navegadores no permiten capturar el puntero: se sigue dibujando igual.
    }
    actual.current = [posicion(e)]
    trazos.current.push(actual.current)
    redibujar()
  }
  function mover(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!actual.current) return
    // Los eventos agrupados dan trazos más suaves; algunos navegadores devuelven la lista vacía.
    const agrupados = e.nativeEvent.getCoalescedEvents?.() ?? []
    const eventos = agrupados.length > 0 ? agrupados : [e.nativeEvent]
    const r = e.currentTarget.getBoundingClientRect()
    for (const ev of eventos) actual.current.push({ x: ev.clientX - r.left, y: ev.clientY - r.top, t: ev.timeStamp })
    redibujar()
  }
  function terminar() {
    if (!actual.current) return
    actual.current = null
    setCantidad(trazos.current.length)
    exportar()
  }

  function deshacer() {
    trazos.current.pop()
    setCantidad(trazos.current.length)
    redibujar()
    exportar()
  }
  function limpiar() {
    trazos.current = []
    setCantidad(0)
    redibujar()
    avisar.current(null, null, null)
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
