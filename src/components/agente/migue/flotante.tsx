"use client"

import { useRef, useState, useSyncExternalStore, type PointerEvent as EventoPuntero } from "react"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { ChatMigue } from "./chat"

const TAMANO = 64
const MARGEN = 12
const CLAVE = "tramita_migue_posicion"

type Posicion = { x: number; y: number }

function limitar(p: Posicion): Posicion {
  return {
    x: Math.min(Math.max(MARGEN, p.x), Math.max(MARGEN, window.innerWidth - TAMANO - MARGEN)),
    y: Math.min(Math.max(MARGEN, p.y), Math.max(MARGEN, window.innerHeight - TAMANO - MARGEN)),
  }
}

// La posición elegida se recuerda en el navegador (si lo permite); si no, queda abajo a la derecha.
function leerGuardada() {
  try {
    return localStorage.getItem(CLAVE)
  } catch {
    return null
  }
}
function interpretar(valor: string | null): Posicion | null {
  try {
    const p = JSON.parse(valor ?? "null")
    return p && Number.isFinite(p.x) && Number.isFinite(p.y) ? limitar(p) : null
  } catch {
    return null
  }
}
const suscribirAlmacen = (aviso: () => void) => {
  window.addEventListener("storage", aviso)
  return () => window.removeEventListener("storage", aviso)
}
const suscribirAncho = (aviso: () => void) => {
  const mq = window.matchMedia("(max-width: 767px)")
  mq.addEventListener("change", aviso)
  return () => mq.removeEventListener("change", aviso)
}

/** Migue siempre a mano en el portal del agente, como en EstudIA. Se puede arrastrar. */
export function MigueFlotante({ base = "", demo = false }: { base?: string; demo?: boolean }) {
  const ruta = usePathname()
  const [abierto, setAbierto] = useState(false)
  const [movida, setMovida] = useState<Posicion | null>(null)
  const guardada = useSyncExternalStore(suscribirAlmacen, leerGuardada, () => null)
  const celular = useSyncExternalStore(suscribirAncho, () => window.matchMedia("(max-width: 767px)").matches, () => false)
  const arrastre = useRef<{ id: number; x: number; y: number; origen: Posicion; movido: boolean } | null>(null)
  const ignorarClic = useRef(false)

  // En la pantalla de Migue no hace falta un segundo acceso.
  if (ruta === `${base}/migue`) return null

  const posicion = movida ?? interpretar(guardada)
  const pantalla = ruta.slice(base.length) || "/"
  const id = pantalla.match(/^\/mis-tramites\/([^/]+)$/)?.[1]
  const enfocado = id && id !== "nuevo" ? { id } : null

  const empezar = (e: EventoPuntero<HTMLButtonElement>) => {
    if (e.button !== 0) return
    const r = e.currentTarget.getBoundingClientRect()
    arrastre.current = { id: e.pointerId, x: e.clientX, y: e.clientY, origen: { x: r.left, y: r.top }, movido: false }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const mover = (e: EventoPuntero<HTMLButtonElement>) => {
    const a = arrastre.current
    if (!a || a.id !== e.pointerId) return
    const dx = e.clientX - a.x
    const dy = e.clientY - a.y
    if (!a.movido && Math.hypot(dx, dy) < 5) return
    a.movido = true
    setMovida(limitar({ x: a.origen.x + dx, y: a.origen.y + dy }))
  }
  const soltar = (e: EventoPuntero<HTMLButtonElement>) => {
    const a = arrastre.current
    if (!a || a.id !== e.pointerId) return
    if (a.movido) {
      ignorarClic.current = true
      const final = limitar({ x: a.origen.x + e.clientX - a.x, y: a.origen.y + e.clientY - a.y })
      setMovida(final)
      try {
        localStorage.setItem(CLAVE, JSON.stringify(final))
      } catch {
        /* Sin almacenamiento, igual se puede mover. */
      }
    }
    arrastre.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
  }

  return (
    <>
      <button
        type="button"
        aria-label="Abrir Migue, el asistente de tus trámites. Podés arrastrarlo para moverlo."
        title="Migue · Arrastrá para mover"
        onPointerDown={empezar}
        onPointerMove={mover}
        onPointerUp={soltar}
        onPointerCancel={soltar}
        onClick={() => {
          // Soltar después de arrastrar no abre el panel.
          if (ignorarClic.current) {
            ignorarClic.current = false
            return
          }
          setAbierto(true)
        }}
        style={posicion ? { left: posicion.x, top: posicion.y } : undefined}
        className={cn(
          "fixed z-40 size-16 cursor-grab touch-none rounded-full border-[3px] border-white bg-white shadow-[0_10px_30px_rgba(0,60,140,0.28)] ring-2 ring-primary transition-[box-shadow,transform] select-none hover:-translate-y-0.5 hover:ring-[3px] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-primary active:cursor-grabbing print:hidden",
          !posicion && "right-4 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] sm:right-6 sm:bottom-6",
          !posicion && demo && "bottom-[calc(9.5rem+env(safe-area-inset-bottom))] sm:bottom-20",
        )}
      >
        <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
          <Image src="/migue.jpeg" alt="" fill sizes="64px" draggable={false} className="origin-[50%_25%] scale-[1.95] object-cover" />
        </span>
        <span className="absolute -top-1.5 -right-1 grid h-5 min-w-6 place-items-center rounded-full border-2 border-white bg-primary px-1 text-[9px] font-black tracking-wide text-white">
          IA
        </span>
        <span aria-hidden className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 text-[11px] leading-none tracking-[2px] text-muted-foreground">
          •••
        </span>
      </button>

      <Sheet open={abierto} onOpenChange={setAbierto}>
        <SheetContent
          side={celular ? "bottom" : "right"}
          showCloseButton={false}
          className="gap-0 p-0 data-[side=bottom]:h-[86dvh] data-[side=bottom]:rounded-t-3xl data-[side=right]:w-full data-[side=right]:sm:max-w-[500px] data-[side=right]:rounded-l-3xl"
        >
          <SheetTitle className="sr-only">Migue</SheetTitle>
          <ChatMigue modo="panel" enfocado={enfocado} pantalla={pantalla} alCerrar={() => setAbierto(false)} />
        </SheetContent>
      </Sheet>
    </>
  )
}
