import type { CSSProperties } from "react"
import type { FirmaVisible } from "@/lib/firma-trazo"
import { cn } from "@/lib/utils"

const MARGEN = 5

/** Camino suavizado (curvas por los puntos medios), como se dibujó en el lienzo. */
function camino(t: number[]) {
  if (t.length < 2) return ""
  const x = (i: number) => t[i * 2]
  const y = (i: number) => t[i * 2 + 1]
  const n = t.length / 2
  // Un solo punto (el punto de una i): se dibuja como un punto.
  if (n === 1) return `M${x(0)} ${y(0)}l0.01 0`
  let d = `M${x(0)} ${y(0)}`
  for (let i = 1; i < n - 1; i++) d += `Q${x(i)} ${y(i)} ${(x(i) + x(i + 1)) / 2} ${(y(i) + y(i + 1)) / 2}`
  return `${d}L${x(n - 1)} ${y(n - 1)}`
}

/**
 * Firma ológrafa estampada: el trazo verificado por la base, en vectores (nítido al imprimir).
 * En modo oscuro se aclara para leerse, salvo sobre la hoja oficial o un fondo blanco (`fija`).
 */
export function TrazoFirma({
  visible,
  tinta,
  titulo,
  grosor = 2,
  fija = false,
  className,
}: {
  visible: FirmaVisible
  tinta?: string | null
  titulo?: string
  grosor?: number
  fija?: boolean
  className?: string
}) {
  const ancho = Math.max(1, visible.ancho) + MARGEN * 2
  return (
    <svg
      viewBox={`${-MARGEN} ${-MARGEN} ${ancho} ${100 + MARGEN * 2}`}
      className={cn("firma-trazo", fija && "firma-trazo-fija", className)}
      style={{ "--tinta": tinta ?? "#1e3a8a" } as CSSProperties}
      role="img"
      aria-label={titulo}
    >
      {visible.trazos.map((t, i) => (
        <path
          key={i}
          d={camino(t)}
          fill="none"
          stroke="currentColor"
          strokeWidth={grosor}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  )
}
