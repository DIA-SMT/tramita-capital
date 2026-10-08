import Image from "next/image"
import { BadgeCheck, Fingerprint, Stamp } from "lucide-react"
import { TrazoFirma } from "@/components/firma/trazo-firma"
import { fechaHora } from "@/lib/dominio"
import { codigoLegible, codigoVerificacion, type SelloFirma } from "@/lib/firma"
import { cn } from "@/lib/utils"

/**
 * Bloque de firma de una foja: firma ológrafa estampada (si la hay), aclaración, cargo,
 * fecha y hora, y código de verificación. El trazo es la representación visible; la
 * validez la dan la verificación biométrica, la clave y la huella SHA-256.
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
  /** Solo para fojas firmadas con la versión anterior, que estampaba una imagen. */
  imagenUrl?: string | null
  /** Nombre del firmante cuando el sello no trae aclaración (fojas anteriores al registro). */
  firmante?: string | null
  className?: string
}) {
  const aclaracion = sello?.aclaracion ?? firmante ?? "—"
  const visible = sello?.tipo === "olografa" ? sello.visible : null
  const imagen = sello?.tipo === "olografa" && !visible ? imagenUrl : null
  const olografa = Boolean(visible || imagen)

  return (
    <div className={cn("flex flex-col items-center text-center", className)}>
      {visible ? (
        <TrazoFirma visible={visible} tinta={sello?.tinta} titulo={`Firma de ${aclaracion}`} className="h-20 w-auto max-w-56" />
      ) : imagen ? (
        <Image
          src={imagen}
          alt={`Firma de ${aclaracion}`}
          width={240}
          height={90}
          unoptimized
          className="firma-img h-20 w-auto max-w-56 object-contain dark:brightness-0 dark:invert"
        />
      ) : (
        // Sin firma ológrafa no se simula un trazo: se muestra el sello electrónico.
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
        {olografa ? "Firma ológrafa electrónica verificada y clave" : "Firma electrónica"} · Ley 25.506
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
