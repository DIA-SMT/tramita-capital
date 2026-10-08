import Image from "next/image"
import { BadgeCheck, Fingerprint, Stamp } from "lucide-react"
import { fechaHora } from "@/lib/dominio"
import { codigoLegible, codigoVerificacion, type SelloFirma } from "@/lib/firma"
import { cn } from "@/lib/utils"

/**
 * Bloque de firma de una foja: firma manuscrita registrada (si la hay), aclaración, cargo,
 * fecha y hora, y código de verificación. La imagen es la representación visible; la
 * validez la dan la autenticación, la clave y la huella SHA-256.
 */
export function BloqueFirma({
  sello,
  firmadaAt,
  hash,
  imagenUrl,
  firmante,
  className,
}: {
  sello: SelloFirma | null
  firmadaAt: string | null
  hash: string | null
  imagenUrl?: string | null
  /** Nombre del firmante cuando el sello no trae aclaración (fojas anteriores al registro). */
  firmante?: string | null
  className?: string
}) {
  const aclaracion = sello?.aclaracion ?? firmante ?? "—"
  const registrada = sello?.tipo === "registrada" && imagenUrl

  return (
    <div className={cn("flex flex-col items-center text-center", className)}>
      {registrada ? (
        <Image
          src={imagenUrl}
          alt={`Firma de ${aclaracion}`}
          width={240}
          height={90}
          unoptimized
          className="firma-img h-20 w-auto max-w-56 object-contain dark:brightness-0 dark:invert"
        />
      ) : (
        // Sin firma registrada no se simula un trazo: se muestra el sello electrónico.
        <span className="grid h-20 place-items-center" aria-hidden>
          <span className="grid size-14 place-items-center rounded-full border-2 border-dashed border-primary/40 text-primary">
            <Stamp className="size-6" />
          </span>
        </span>
      )}
      <span className="h-px w-56 bg-foreground/30" />
      <p className="mt-1.5 text-sm font-semibold">{aclaracion}</p>
      {sello?.cargo && <p className="text-xs text-muted-foreground">{sello.cargo}</p>}
      <p className="mt-2 inline-flex items-center gap-1 text-[0.7rem] text-muted-foreground">
        <BadgeCheck className="size-3.5 text-emerald-600" />
        {registrada ? "Firma electrónica con firma registrada y clave" : "Firma electrónica"} · Ley 25.506
        {firmadaAt ? ` · ${fechaHora(firmadaAt)}` : ""}
      </p>
      {hash && (
        <p className="mt-0.5 inline-flex items-center gap-1 font-mono text-[0.68rem] text-muted-foreground">
          <Fingerprint className="size-3" /> {codigoLegible(codigoVerificacion(hash))}
        </p>
      )}
    </div>
  )
}
