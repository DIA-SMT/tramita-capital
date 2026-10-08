"use client"

import { useRef } from "react"
import { cn } from "@/lib/utils"

const LARGO = 6

/** Clave de firma de 6 números: un solo input real (accesible y compatible con autocompletar) y 6 casillas visuales. */
export function CampoClave({
  id,
  valor,
  alCambiar,
  etiqueta,
  autoFocus,
  deshabilitado,
  error,
}: {
  id: string
  valor: string
  alCambiar: (v: string) => void
  etiqueta: string
  autoFocus?: boolean
  deshabilitado?: boolean
  error?: boolean
}) {
  const entrada = useRef<HTMLInputElement>(null)
  return (
    <div className="group relative w-fit" onClick={() => entrada.current?.focus()}>
      <input
        ref={entrada}
        id={id}
        aria-label={etiqueta}
        inputMode="numeric"
        autoComplete="off"
        pattern="\d*"
        maxLength={LARGO}
        autoFocus={autoFocus}
        disabled={deshabilitado}
        value={valor}
        onChange={(e) => alCambiar(e.target.value.replace(/\D/g, "").slice(0, LARGO))}
        className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
      />
      <div className="flex gap-2" aria-hidden>
        {Array.from({ length: LARGO }, (_, i) => {
          const lleno = i < valor.length
          const activo = i === Math.min(valor.length, LARGO - 1)
          return (
            <span
              key={i}
              className={cn(
                "grid size-11 place-items-center rounded-xl border-2 bg-background text-lg font-semibold transition-colors",
                lleno ? "border-primary/50" : "border-border",
                activo && "group-focus-within:border-primary",
                error && "border-destructive/60",
              )}
            >
              {lleno ? "•" : ""}
            </span>
          )
        })}
      </div>
    </div>
  )
}
