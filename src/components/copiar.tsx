"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { toast } from "sonner"

/** Número de expediente que se copia al portapapeles con un clic. */
export function Copiar({ texto, className }: { texto: string; className?: string }) {
  const [copiado, setCopiado] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto)
          setCopiado(true)
          toast.success(`Copiado: ${texto}`)
          setTimeout(() => setCopiado(false), 1500)
        } catch {
          toast.error("No se pudo copiar")
        }
      }}
      className={`group inline-flex items-center gap-1 rounded font-mono tabular hover:text-foreground ${className ?? ""}`}
      aria-label={`Copiar ${texto}`}
    >
      {texto}
      {copiado ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3 opacity-40 transition-opacity group-hover:opacity-80" />}
    </button>
  )
}
