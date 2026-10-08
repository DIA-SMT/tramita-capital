"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Eraser, ImageUp, PenLine, Undo2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Punto = { x: number; y: number; t: number }
type Trazo = Punto[]

const TINTAS = [
  { valor: "#1e3a8a", etiqueta: "Azul" },
  { valor: "#111827", etiqueta: "Negra" },
]
const ALTO_EXPORTADO = 240
const MARGEN = 14

/**
 * Registro de la firma manuscrita: se dibuja (dedo, mouse o lápiz) o se sube un escaneo.
 * Devuelve un PNG recortado con fondo transparente, listo para estampar en los documentos.
 */
export function LienzoFirma({ alCambiar, deshabilitado }: { alCambiar: (png: Blob | null, vista: string | null) => void; deshabilitado?: boolean }) {
  const lienzo = useRef<HTMLCanvasElement>(null)
  const trazos = useRef<Trazo[]>([])
  const actual = useRef<Trazo | null>(null)
  const [modo, setModo] = useState<"dibujar" | "subir">("dibujar")
  const [tinta, setTinta] = useState(TINTAS[0].valor)
  const [cantidad, setCantidad] = useState(0)
  const [errorImagen, setErrorImagen] = useState<string | null>(null)
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


  // Exporta el área con tinta, recortada y con fondo transparente.
  const exportar = useCallback(
    (fuente: HTMLCanvasElement) => {
      const ctx = fuente.getContext("2d")
      if (!ctx) return
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
      if (x1 < 0) return void avisar.current(null, null)
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
      salida.toBlob((b) => avisar.current(b, b ? vista : null), "image/png")
    },
    [],
  )

  useEffect(() => {
    ajustar()
    redibujar()
    // Al cambiar la tinta se vuelve a exportar la firma ya dibujada.
    if (trazos.current.length > 0 && lienzo.current) exportar(lienzo.current)
    const alRedimensionar = () => {
      ajustar()
      redibujar()
    }
    window.addEventListener("resize", alRedimensionar)
    return () => window.removeEventListener("resize", alRedimensionar)
  }, [ajustar, redibujar, exportar])

  const posicion = (e: React.PointerEvent<HTMLCanvasElement>): Punto => {
    const r = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top, t: e.timeStamp }
  }

  function empezar(e: React.PointerEvent<HTMLCanvasElement>) {
    if (deshabilitado) return
    e.currentTarget.setPointerCapture(e.pointerId)
    actual.current = [posicion(e)]
    trazos.current.push(actual.current)
    redibujar()
  }
  function mover(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!actual.current) return
    const eventos = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent]
    const r = e.currentTarget.getBoundingClientRect()
    for (const ev of eventos) actual.current.push({ x: ev.clientX - r.left, y: ev.clientY - r.top, t: ev.timeStamp })
    redibujar()
  }
  function terminar() {
    if (!actual.current) return
    actual.current = null
    setCantidad(trazos.current.length)
    if (lienzo.current) exportar(lienzo.current)
  }

  function deshacer() {
    trazos.current.pop()
    setCantidad(trazos.current.length)
    redibujar()
    if (lienzo.current) exportar(lienzo.current)
  }
  function limpiar() {
    trazos.current = []
    setCantidad(0)
    redibujar()
    avisar.current(null, null)
  }

  // Escaneo o foto: el papel se vuelve transparente y el trazo toma la tinta elegida.
  async function subir(archivo: File) {
    setErrorImagen(null)
    if (!["image/png", "image/jpeg", "image/webp"].includes(archivo.type)) return setErrorImagen("Subí una imagen PNG o JPG.")
    if (archivo.size > 8 * 1024 * 1024) return setErrorImagen("La imagen supera los 8 MB.")
    const imagen = await createImageBitmap(archivo)
    const escala = Math.min(1, 1600 / imagen.width)
    const c = document.createElement("canvas")
    c.width = Math.round(imagen.width * escala)
    c.height = Math.round(imagen.height * escala)
    const ctx = c.getContext("2d", { willReadFrequently: true })
    if (!ctx) return
    ctx.drawImage(imagen, 0, 0, c.width, c.height)
    const img = ctx.getImageData(0, 0, c.width, c.height)
    const d = img.data
    const [r0, g0, b0] = [1, 3, 5].map((i) => parseInt(tinta.slice(i, i + 2), 16))
    for (let i = 0; i < d.length; i += 4) {
      const luz = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
      const alfa = luz >= 190 ? 0 : Math.min(255, Math.round(((190 - luz) / 120) * 255))
      d[i] = r0
      d[i + 1] = g0
      d[i + 2] = b0
      d[i + 3] = Math.round((alfa * d[i + 3]) / 255)
    }
    ctx.putImageData(img, 0, 0)
    exportar(c)
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-grid grid-cols-2 gap-1 rounded-lg bg-muted p-1" role="tablist" aria-label="Cómo cargar la firma">
          {(
            [
              ["dibujar", "Dibujar", PenLine],
              ["subir", "Subir escaneo", ImageUp],
            ] as const
          ).map(([v, e, Icono]) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={modo === v}
              onClick={() => {
                setModo(v)
                limpiar()
              }}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors",
                modo === v && "bg-background text-foreground shadow-sm",
              )}
            >
              <Icono className="size-4" /> {e}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Color de tinta">
          {TINTAS.map((t) => (
            <button
              key={t.valor}
              type="button"
              role="radio"
              aria-checked={tinta === t.valor}
              aria-label={`Tinta ${t.etiqueta.toLowerCase()}`}
              onClick={() => setTinta(t.valor)}
              className={cn("size-7 rounded-full border-2 border-background ring-2 ring-transparent transition", tinta === t.valor && "ring-primary")}
              style={{ background: t.valor }}
            />
          ))}
        </div>
      </div>

      {modo === "dibujar" ? (
        <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-primary/25 bg-white">
          <canvas
            ref={lienzo}
            className="block h-52 w-full touch-none cursor-crosshair sm:h-56"
            onPointerDown={empezar}
            onPointerMove={mover}
            onPointerUp={terminar}
            onPointerCancel={terminar}
            aria-label="Área para dibujar la firma"
          />
          <span aria-hidden className="pointer-events-none absolute inset-x-8 bottom-12 border-b border-slate-300" />
          <span aria-hidden className="pointer-events-none absolute bottom-6 left-8 text-xs text-slate-400">
            Firmá sobre la línea
          </span>
          <div className="absolute top-2 right-2 flex gap-1">
            <Button type="button" size="icon-sm" variant="ghost" onClick={deshacer} disabled={cantidad === 0} aria-label="Deshacer el último trazo" className="text-slate-600">
              <Undo2 />
            </Button>
            <Button type="button" size="icon-sm" variant="ghost" onClick={limpiar} disabled={cantidad === 0} aria-label="Borrar la firma" className="text-slate-600">
              <Eraser />
            </Button>
          </div>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/25 bg-muted/30 px-4 py-10 text-center text-sm transition-colors hover:bg-muted/60">
          <ImageUp className="size-6 text-primary" />
          <span className="font-medium">Elegí una foto o escaneo de tu firma</span>
          <span className="text-xs text-muted-foreground">Sobre papel blanco, con buena luz. Se quita el fondo y se recorta sola.</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            disabled={deshabilitado}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void subir(f)
            }}
          />
          {errorImagen && <span className="text-xs text-destructive">{errorImagen}</span>}
        </label>
      )}
    </div>
  )
}
