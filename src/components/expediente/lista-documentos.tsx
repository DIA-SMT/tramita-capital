import { Download, FileImage, FileText } from "lucide-react"
import type { Fila } from "@/lib/database.types"
import { fechaCorta } from "@/lib/dominio"

type Documento = Pick<Fila<"documentos">, "id" | "nombre_archivo" | "mime_type" | "tamano_bytes" | "created_at" | "requisito_clave">

function tamano(bytes: number | null) {
  if (!bytes) return ""
  return bytes > 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export function ListaDocumentos({ documentos, etiquetas = {} }: { documentos: Documento[]; etiquetas?: Record<string, string> }) {
  if (documentos.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Sin documentos adjuntos.</p>
  }
  return (
    <ul className="grid gap-2">
      {documentos.map((d) => {
        const Icono = d.mime_type?.startsWith("image/") ? FileImage : FileText
        return (
          <li key={d.id}>
            <a
              href={`/api/documentos/${d.id}`}
              target="_blank"
              rel="noopener"
              className="group flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-accent/40"
            >
              <span className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground">
                <Icono className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{d.nombre_archivo}</span>
                <span className="block text-xs text-muted-foreground">
                  {[d.requisito_clave ? (etiquetas[d.requisito_clave] ?? d.requisito_clave) : null, tamano(d.tamano_bytes), fechaCorta(d.created_at)]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
              <Download className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
            </a>
          </li>
        )
      })}
    </ul>
  )
}
