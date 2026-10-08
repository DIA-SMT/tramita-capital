import Link from "next/link"
import { ArrowLeft, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BloqueFirma } from "@/components/firma/bloque-firma"
import { Markdown } from "@/components/markdown"
import { Membrete } from "@/components/marca"
import { TIPOS_ACTUACION } from "@/lib/dominio"
import { codigoLegible, codigoVerificacion, type SelloFirma } from "@/lib/firma"
import type { Enum } from "@/lib/database.types"
import { BotonImprimir } from "./boton-imprimir"

export type DocumentoOficialDatos = {
  tipo: Enum<"tipo_actuacion">
  titulo: string
  contenido: string | null
  foja: number | null
  firmadaAt: string | null
  hash: string | null
  sello: SelloFirma | null
  firmante: string | null
  numeroExpediente: string
  area: string | null
  reservado: boolean
}

/**
 * Copia oficial de una foja firmada, lista para imprimir o guardar en PDF:
 * membrete del municipio, texto, firma y código de verificación con QR.
 */
export function DocumentoOficial({
  doc,
  qrSvg,
  urlVerificacion,
  volver,
  imagenFirma,
}: {
  doc: DocumentoOficialDatos
  qrSvg: string | null
  urlVerificacion: string
  volver: string
  imagenFirma: string | null
}) {
  const codigo = doc.hash ? codigoVerificacion(doc.hash) : null
  return (
    <div className="min-h-svh bg-muted/50 px-3 py-6 sm:px-6 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-2 print:hidden">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link href={volver}>
            <ArrowLeft /> Volver al expediente
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          {doc.reservado && <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-700 dark:text-violet-300">Reservado</span>}
          <BotonImprimir />
        </div>
      </div>

      <article className="papel mx-auto max-w-[210mm] rounded-xl bg-white px-6 py-8 shadow-2xl shadow-primary/10 sm:px-[18mm] sm:py-[16mm] print:max-w-none print:rounded-none print:px-0 print:py-0 print:shadow-none">
        <Membrete area={doc.area ?? undefined} />
        <p className="mt-6 text-right text-[0.7rem] text-[var(--muted-foreground)]">
          Expte. N.º {doc.numeroExpediente} · Foja {doc.foja ?? "—"} · {TIPOS_ACTUACION[doc.tipo]}
        </p>
        <div className="mt-4">
          <Markdown oficial>{doc.contenido}</Markdown>
        </div>
        <div className="mt-12 flex justify-end break-inside-avoid">
          <BloqueFirma sello={doc.sello} firmadaAt={doc.firmadaAt} hash={doc.hash} imagenUrl={imagenFirma} firmante={doc.firmante} />
        </div>

        <footer className="mt-12 flex break-inside-avoid items-start gap-4 border-t pt-4 text-[0.68rem] leading-relaxed text-[var(--muted-foreground)]">
          {qrSvg && <div className="size-24 shrink-0 [&_svg]:size-full" aria-label="Código QR de verificación" dangerouslySetInnerHTML={{ __html: qrSvg }} />}
          <div className="min-w-0">
            <p className="flex items-center gap-1 font-semibold text-[var(--foreground)]">
              <ShieldCheck className="size-3.5 text-emerald-600" /> Documento firmado electrónicamente (Ley 25.506)
            </p>
            <p>
              Expediente electrónico N.º {doc.numeroExpediente}, foja {doc.foja ?? "—"}. La foja está encadenada con las anteriores mediante una huella
              SHA-256: cualquier alteración posterior es detectable.
            </p>
            {codigo && (
              <p className="mt-1">
                Verificá su autenticidad e integridad en <span className="font-medium break-all text-[var(--foreground)]">{urlVerificacion}</span> con el
                código <span className="font-mono font-semibold text-[var(--foreground)]">{codigoLegible(codigo)}</span>.
              </p>
            )}
            {doc.hash && <p className="mt-1 font-mono break-all opacity-80">SHA-256 {doc.hash}</p>}
          </div>
        </footer>
      </article>
    </div>
  )
}
