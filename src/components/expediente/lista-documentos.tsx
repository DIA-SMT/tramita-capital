"use client"

import { useState } from "react"
import { Download, ExternalLink, Eye, FileImage, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Fila } from "@/lib/database.types"
import { fechaCorta } from "@/lib/dominio"

type Documento = Pick<Fila<"documentos">, "id" | "nombre_archivo" | "mime_type" | "tamano_bytes" | "created_at" | "requisito_clave">

function tamano(bytes: number | null) {
  if (!bytes) return ""
  return bytes > 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

/** Documentos del expediente con visor integrado (PDF e imágenes) y descarga segura. */
export function ListaDocumentos({
  documentos,
  etiquetas = {},
  demo = false,
}: {
  documentos: Documento[]
  etiquetas?: Record<string, string>
  demo?: boolean
}) {
  const [abierto, setAbierto] = useState<Documento | null>(null)

  if (documentos.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Sin documentos adjuntos.</p>
  }

  const esImagen = abierto?.mime_type?.startsWith("image/")
  const url = abierto ? `/api/documentos/${abierto.id}?ver=1` : ""

  return (
    <>
      <ul className="grid grid-cols-1 gap-2">
        {documentos.map((d) => {
          const Icono = d.mime_type?.startsWith("image/") ? FileImage : FileText
          return (
            <li key={d.id} className="group flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 transition-colors hover:border-primary/40">
              <button type="button" onClick={() => setAbierto(d)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                  <Icono className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{d.nombre_archivo}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {[d.requisito_clave ? (etiquetas[d.requisito_clave] ?? d.requisito_clave) : null, tamano(d.tamano_bytes), fechaCorta(d.created_at)]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
              </button>
              <Button variant="ghost" size="icon-sm" onClick={() => setAbierto(d)} aria-label={`Ver ${d.nombre_archivo}`}>
                <Eye />
              </Button>
              <Button variant="ghost" size="icon-sm" asChild>
                <a href={demo ? "#" : `/api/documentos/${d.id}`} aria-label={`Descargar ${d.nombre_archivo}`}>
                  <Download />
                </a>
              </Button>
            </li>
          )
        })}
      </ul>

      <Dialog open={!!abierto} onOpenChange={(o) => !o && setAbierto(null)}>
        <DialogContent className="flex h-[90svh] flex-col gap-0 p-0 sm:max-w-4xl">
          <DialogHeader className="flex-row items-center gap-3 border-b p-4 pr-12">
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-base">{abierto?.nombre_archivo}</DialogTitle>
              <DialogDescription className="truncate">
                {abierto?.requisito_clave ? (etiquetas[abierto.requisito_clave] ?? abierto.requisito_clave) : "Documento adjunto"}
              </DialogDescription>
            </div>
            {!demo && (
              <Button variant="outline" size="sm" asChild>
                <a href={url} target="_blank" rel="noopener">
                  <ExternalLink /> Abrir
                </a>
              </Button>
            )}
          </DialogHeader>
          <div className="min-h-0 flex-1 bg-muted/40">
            {demo ? (
              <div className="grid h-full place-items-center p-8 text-center text-sm text-muted-foreground">
                <div>
                  <FileText className="mx-auto mb-3 size-10 opacity-50" />
                  Vista previa de diseño: acá se muestra el PDF o la imagen del documento.
                </div>
              </div>
            ) : esImagen ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt={abierto?.nombre_archivo ?? ""} className="h-full w-full object-contain p-4" />
            ) : (
              <iframe src={url} title={abierto?.nombre_archivo ?? "Documento"} className="h-full w-full" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
