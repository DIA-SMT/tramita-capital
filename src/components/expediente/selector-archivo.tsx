"use client"

import { useId } from "react"
import { CheckCircle2, FileUp, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const ACEPTADOS = "application/pdf,image/jpeg,image/png,image/webp,image/heic"
const MAXIMO = 20 * 1024 * 1024

export function SelectorArchivo({
  titulo,
  descripcion,
  obligatorio,
  archivo,
  alCambiar,
  error,
}: {
  titulo: string
  descripcion?: string
  obligatorio?: boolean
  archivo: File | null
  alCambiar: (f: File | null, error?: string) => void
  error?: string
}) {
  const id = useId()
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed p-3.5 transition-colors",
        archivo ? "border-solid border-emerald-500/40 bg-emerald-500/5" : "hover:border-primary/50 hover:bg-accent/30",
        error && "border-destructive/60 bg-destructive/5",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-lg",
            archivo ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground",
          )}
        >
          {archivo ? <CheckCircle2 className="size-4" /> : <FileUp className="size-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {titulo} {obligatorio ? <span className="text-destructive">*</span> : <span className="font-normal text-muted-foreground">(opcional)</span>}
          </p>
          {archivo ? (
            <p className="truncate text-xs text-muted-foreground">
              {archivo.name} · {(archivo.size / 1024 / 1024).toFixed(2)} MB
            </p>
          ) : (
            descripcion && <p className="text-xs text-muted-foreground">{descripcion}</p>
          )}
          {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
        </div>
        {archivo ? (
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => alCambiar(null)} aria-label="Quitar archivo">
            <X />
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" asChild>
            <label htmlFor={id}>Elegir</label>
          </Button>
        )}
        <input
          id={id}
          type="file"
          accept={ACEPTADOS}
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null
            e.target.value = ""
            if (f && f.size > MAXIMO) return alCambiar(null, "El archivo supera los 20 MB")
            alCambiar(f)
          }}
        />
      </div>
    </div>
  )
}
