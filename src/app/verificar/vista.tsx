import Link from "next/link"
import { BadgeCheck, Fingerprint, SearchX, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Marca } from "@/components/marca"
import { fechaHora, TIPOS_ACTUACION } from "@/lib/dominio"
import { codigoLegible } from "@/lib/firma"
import type { Enum } from "@/lib/database.types"

export type ResultadoVerificacion = {
  tipo: Enum<"tipo_actuacion">
  protocolo: string | null
  foja: number | null
  firmada_at: string | null
  firmante: string | null
  cargo: string | null
  firma_olografa: boolean
  integra: boolean
}

/**
 * Verificación pública de una copia impresa: confirma que la foja existe, quién la firmó
 * y que no fue alterada. Nunca muestra el contenido ni datos del agente.
 */
export function VistaVerificar({ codigo, resultado, accion = "/verificar" }: { codigo: string; resultado: ResultadoVerificacion | null; accion?: string }) {
  const buscado = codigo.length > 0
  return (
    <main className="fondo-marca flex min-h-svh flex-col items-center px-4 py-10">
      <Link href="/" className="mb-8">
        <Marca />
      </Link>
      <div className="w-full max-w-lg rounded-3xl border bg-card p-6 shadow-2xl shadow-primary/10 sm:p-8">
        <h1 className="text-xl font-semibold tracking-tight">Verificar un documento</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ingresá el código de verificación que figura al pie de la copia, o escaneá su código QR.
        </p>
        <form action={accion} className="mt-5 flex gap-2">
          <Input name="codigo" defaultValue={buscado ? codigoLegible(codigo) : ""} placeholder="XXXX-XXXX-XXXX-XXXX-XXXX" className="font-mono uppercase" aria-label="Código de verificación" />
          <Button type="submit">Verificar</Button>
        </form>

        {buscado && !resultado && (
          <div className="mt-6 flex gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4 text-sm">
            <SearchX className="size-5 shrink-0 text-rose-600" />
            <div>
              <p className="font-medium">No encontramos un documento con ese código</p>
              <p className="text-muted-foreground">Revisá que esté completo. Si la copia dice ser oficial y no aparece, no la des por válida.</p>
            </div>
          </div>
        )}

        {resultado && (
          <div className="mt-6 space-y-4">
            {resultado.integra ? (
              <div className="flex gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                <BadgeCheck className="size-6 shrink-0 text-emerald-600" />
                <div>
                  <p className="font-semibold text-emerald-800 dark:text-emerald-300">Documento auténtico e íntegro</p>
                  <p className="text-sm text-muted-foreground">Existe en el expediente electrónico y no fue modificado desde su firma.</p>
                </div>
              </div>
            ) : (
              <div className="flex gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
                <ShieldAlert className="size-6 shrink-0 text-amber-600" />
                <div>
                  <p className="font-semibold">La huella no coincide</p>
                  <p className="text-sm text-muted-foreground">El registro existe pero no supera el control de integridad. Consultá a Capital Humano.</p>
                </div>
              </div>
            )}
            <dl className="grid grid-cols-1 gap-3 rounded-2xl bg-muted/50 p-4 text-sm sm:grid-cols-2">
              <Dato etiqueta="Documento" valor={`${TIPOS_ACTUACION[resultado.tipo]}${resultado.protocolo ? ` N.º ${resultado.protocolo}` : ""}`} />
              <Dato etiqueta="Foja" valor={resultado.foja?.toString() ?? "—"} />
              <Dato etiqueta="Firmó" valor={resultado.firmante ?? "—"} />
              <Dato etiqueta="Cargo" valor={resultado.cargo ?? "—"} />
              <Dato etiqueta="Fecha y hora" valor={resultado.firmada_at ? fechaHora(resultado.firmada_at) : "—"} />
              <Dato etiqueta="Firma" valor={resultado.firma_olografa ? "Ológrafa electrónica verificada, con clave personal" : "Electrónica"} />
            </dl>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Fingerprint className="size-3.5" /> Código {codigoLegible(codigo)} · Ley 25.506
            </p>
          </div>
        )}
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano</p>
    </main>
  )
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="font-medium">{valor}</dd>
    </div>
  )
}
