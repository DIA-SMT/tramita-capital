"use client"

import { useEffect, useId, useState } from "react"
import { CheckCircle2, FileText, FileUp, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const ACEPTADOS = "application/pdf,image/jpeg,image/png,image/webp,image/heic"
const TIPOS = ACEPTADOS.split(",")
const MAXIMO = 20 * 1024 * 1024

function validar(f: File): string | undefined {
  if (f.size > MAXIMO) return "El archivo supera los 20 MB"
  if (f.type && !TIPOS.includes(f.type)) return "Formato no admitido: subí un PDF o una foto (JPG, PNG)"
}

/** Selector de un documento: tocar para elegir (o sacar foto) o arrastrar y soltar. Muestra vista previa. */
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
  const [arrastrando, setArrastrando] = useState(false)
  const [miniatura, setMiniatura] = useState<string | null>(null)

  useEffect(() => {
    if (!archivo || !archivo.type.startsWith("image/")) return
    const url = URL.createObjectURL(archivo)
    const t = setTimeout(() => setMiniatura(url), 0)
    return () => {
      clearTimeout(t)
      URL.revokeObjectURL(url)
      setMiniatura(null)
    }
  }, [archivo])

  function elegir(f: File | null) {
    if (!f) return alCambiar(null)
    const e = validar(f)
    alCambiar(e ? null : f, e)
  }

  return (
    <div
      data-error={error ? "true" : undefined}
      tabIndex={error ? -1 : undefined}
      onDragOver={(e) => {
        e.preventDefault()
        setArrastrando(true)
      }}
      onDragLeave={() => setArrastrando(false)}
      onDrop={(e) => {
        e.preventDefault()
        setArrastrando(false)
        elegir(e.dataTransfer.files?.[0] ?? null)
      }}
      className={cn(
        "rounded-xl border border-dashed p-3.5 transition-colors",
        archivo ? "border-solid border-emerald-500/40 bg-emerald-500/5" : "hover:border-primary/50 hover:bg-accent/30",
        arrastrando && "border-primary bg-primary/5 ring-4 ring-primary/10",
        error && "border-destructive/60 bg-destructive/5",
      )}
    >
      <div className="flex items-center gap-3">
        {miniatura && archivo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={miniatura} alt="" className="size-11 shrink-0 rounded-lg object-cover ring-1 ring-border" />
        ) : (
          <span
            className={cn(
              "grid size-11 shrink-0 place-items-center rounded-lg",
              archivo ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground",
            )}
          >
            {archivo ? archivo.type === "application/pdf" ? <FileText className="size-5" /> : <CheckCircle2 className="size-5" /> : <FileUp className="size-5" />}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {titulo}{" "}
            {obligatorio ? <span className="text-destructive">*</span> : <span className="font-normal text-muted-foreground">(opcional)</span>}
          </p>
          {archivo ? (
            <p className="truncate text-xs text-muted-foreground">
              <CheckCircle2 className="mr-1 inline size-3 text-emerald-600" />
              {archivo.name} · {(archivo.size / 1024 / 1024).toFixed(2)} MB
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">{arrastrando ? "Soltá el archivo acá" : (descripcion ?? "PDF o foto, hasta 20 MB")}</p>
          )}
          {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
        </div>
        {archivo ? (
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => alCambiar(null)} aria-label={`Quitar ${archivo.name}`}>
            <X />
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" asChild>
            <label htmlFor={id} className="cursor-pointer">
              Elegir
            </label>
          </Button>
        )}
        <input
          id={id}
          type="file"
          accept={ACEPTADOS}
          className="sr-only"
          onChange={(e) => {
            elegir(e.target.files?.[0] ?? null)
            e.target.value = ""
          }}
        />
      </div>
    </div>
  )
}
