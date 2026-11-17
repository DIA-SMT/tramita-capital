import Link from "next/link"
import { Download, FileText, FolderLock, Stamp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { InsigniaSentido } from "@/components/insignias"
import { fechaCorta } from "@/lib/dominio"
import type { EntradaLegajo } from "@/lib/vistas"

function tamano(bytes: number | null) {
  if (!bytes) return ""
  return bytes > 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

/** El título sin el número de protocolo, que se muestra aparte. */
const sinNumero = (titulo: string) => titulo.replace(/\s+—\s+Res\. N\.º\s*\S+$/, "")

/**
 * Legajo digital: las resoluciones firmadas (con su copia oficial) y la documentación archivada (con
 * descarga segura). `rutaTramite` arma el enlace al trámite: el portal del agente o el expediente interno.
 */
export function ListaLegajo({
  entradas,
  rutaTramite,
  vacio,
  base = "",
  demo = false,
}: {
  entradas: EntradaLegajo[]
  rutaTramite: "mis-tramites" | "expedientes"
  vacio: string
  base?: string
  demo?: boolean
}) {
  const resoluciones = entradas.filter((e) => e.resolucion)
  // Documentación archivada: los archivos y las presentaciones que el trámite manda al legajo (copia oficial de la foja).
  const documentos = entradas.filter((e) => (e.documento || e.presentacion) && !e.resolucion)

  if (entradas.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed bg-card/50 px-6 py-12 text-center">
        <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
          <FolderLock className="size-5" />
        </span>
        <p className="mt-3 max-w-sm text-sm text-muted-foreground">{vacio}</p>
      </div>
    )
  }

  const tramite = (e: EntradaLegajo) =>
    e.tramite && (
      <span className="text-xs text-muted-foreground">
        {e.tramite.nombre} ·{" "}
        {e.tramite.expedienteId ? (
          <Link href={`${base}/${rutaTramite}/${e.tramite.expedienteId}`} className="font-mono tabular hover:text-primary hover:underline">
            {e.tramite.numero}
          </Link>
        ) : (
          <span className="font-mono tabular">{e.tramite.numero}</span>
        )}
      </span>
    )

  return (
    <div className="space-y-6">
      {resoluciones.length > 0 && (
        <section aria-labelledby="legajo-resoluciones">
          <h3 id="legajo-resoluciones" className="mb-2 flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <Stamp className="size-4" /> Resoluciones <span className="tabular">({resoluciones.length})</span>
          </h3>
          <ul className="divide-y rounded-2xl border bg-card">
            {resoluciones.map((e) => (
              <li key={e.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {e.resolucion?.numero && <span className="font-mono text-sm font-semibold tabular">Res. {e.resolucion.numero}</span>}
                    <InsigniaSentido sentido={e.resolucion?.sentido ?? null} />
                    <span className="text-xs text-muted-foreground tabular">{fechaCorta(e.fecha)}</span>
                  </div>
                  <p className="mt-1 font-medium">{sinNumero(e.titulo)}</p>
                  {tramite(e)}
                </div>
                {e.resolucion?.fojaId && (
                  <Button asChild variant="outline" size="sm" className="shrink-0 self-start sm:self-center">
                    <Link href={`${base}/documento/${e.resolucion.fojaId}`}>
                      <FileText /> Copia oficial
                    </Link>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {documentos.length > 0 && (
        <section aria-labelledby="legajo-documentos">
          <h3 id="legajo-documentos" className="mb-2 flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <FileText className="size-4" /> Documentación archivada <span className="tabular">({documentos.length})</span>
          </h3>
          <ul className="divide-y rounded-2xl border bg-card">
            {documentos.map((e) => (
              <li key={e.id} className="flex items-center gap-3 p-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                  <FileText className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{e.documento?.nombre ?? e.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    {[tamano(e.documento?.bytes ?? null), `archivado el ${fechaCorta(e.fecha)}`].filter(Boolean).join(" · ")}
                  </p>
                  {tramite(e)}
                </div>
                {e.documento && (
                  <Button asChild variant="ghost" size="icon" className="shrink-0 text-muted-foreground">
                    <a href={demo ? "#" : `/api/documentos/${e.documento.id}`} aria-label={`Descargar ${e.documento.nombre}`}>
                      <Download />
                    </a>
                  </Button>
                )}
                {e.presentacion && (
                  <Button asChild variant="outline" size="sm" className="shrink-0">
                    <Link href={`${base}/documento/${e.presentacion.fojaId}`}>
                      <FileText /> Copia oficial
                    </Link>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
