"use client"

import { useState } from "react"
import Link from "next/link"
import { Fingerprint, KeyRound, Loader2, PenLine, ShieldCheck, Stamp, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Markdown } from "@/components/markdown"
import { BloqueFirma } from "@/components/firma/bloque-firma"
import { CampoClave } from "@/components/firma/campo-clave"

export type Firmante = { nombre: string; rol: string; area: string }
export type FirmaRegistradaVista = { aclaracion: string; cargo: string; imagenUrl: string | null }

/**
 * Firma electrónica consciente: la persona ve el texto completo, quién firma y en qué
 * carácter, y confirma expresamente que lo revisó. En dictámenes y resoluciones, si tiene
 * firma registrada, se estampa su firma manuscrita y se confirma con su clave de 6 números.
 */
export function DialogoFirma({
  abierto,
  alCerrar,
  documento,
  firmante,
  firmaRegistrada = null,
  exigeFirmaRegistrada = false,
  rutaMiFirma = "/mi-firma",
  alFirmar,
}: {
  abierto: boolean
  alCerrar: () => void
  documento: { tipo: string; titulo: string; contenido: string; conIA?: boolean; deFondo?: boolean } | null
  firmante: Firmante
  /** Firma registrada de quien firma (si la tiene). */
  firmaRegistrada?: FirmaRegistradaVista | null
  /** El trámite exige firma registrada para resoluciones. */
  exigeFirmaRegistrada?: boolean
  rutaMiFirma?: string
  alFirmar: (clave?: string) => Promise<boolean>
}) {
  const [revisado, setRevisado] = useState(false)
  const [clave, setClave] = useState("")
  const [firmando, setFirmando] = useState(false)

  const deFondo = Boolean(documento?.deFondo)
  const conClave = deFondo && Boolean(firmaRegistrada)
  const bloqueado = deFondo && exigeFirmaRegistrada && !firmaRegistrada

  function cerrar() {
    setRevisado(false)
    setClave("")
    alCerrar()
  }

  async function firmar() {
    setFirmando(true)
    const ok = await alFirmar(conClave ? clave : undefined)
    setFirmando(false)
    if (ok) cerrar()
    else setClave("")
  }

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && !firmando && cerrar()}>
      <DialogContent className="flex max-h-[92svh] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="border-b p-5">
          <DialogTitle className="flex items-center gap-2">
            <Stamp className="size-4 text-primary" /> Firmar {documento?.tipo.toLowerCase()}
          </DialogTitle>
          <DialogDescription>Leé el documento completo. Al firmarlo queda foliado en el expediente y ya no se puede modificar.</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto bg-muted/30 p-5">
          <article className="mx-auto max-w-prose rounded-xl border bg-card p-6 shadow-sm">
            <p className="mb-3 text-sm font-semibold">{documento?.titulo}</p>
            <Markdown oficial>{documento?.contenido}</Markdown>
            {conClave && firmaRegistrada && (
              <div className="mt-6 flex justify-end border-t pt-4">
                <BloqueFirma
                  sello={{ tipo: "registrada", aclaracion: firmaRegistrada.aclaracion, cargo: firmaRegistrada.cargo, registroId: null, imagenSha256: null }}
                  firmadaAt={null}
                  hash={null}
                  imagenUrl={firmaRegistrada.imagenUrl}
                />
              </div>
            )}
          </article>
        </div>

        <div className="space-y-3 border-t p-5">
          {bloqueado ? (
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
              <TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-600" />
              <div className="flex-1">
                <p className="font-medium">Este trámite exige tu firma registrada</p>
                <p className="text-muted-foreground">Registrala una sola vez y después firmás con tu clave de 6 números.</p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href={rutaMiFirma}>
                  <PenLine /> Registrar
                </Link>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl bg-primary/5 p-3 text-sm">
              <Fingerprint className="size-5 shrink-0 text-primary" />
              <p>
                Firmás como <strong>{firmaRegistrada && deFondo ? firmaRegistrada.aclaracion : firmante.nombre}</strong>,{" "}
                {firmaRegistrada && deFondo ? firmaRegistrada.cargo : `${firmante.rol.toLowerCase()} de ${firmante.area}`}. Queda registrada la fecha, la
                hora y una huella SHA-256 encadenada al resto del expediente.
              </p>
            </div>
          )}
          {documento?.conIA && <p className="text-xs text-muted-foreground">Este borrador fue asistido por IA. Con tu firma asumís su contenido como propio.</p>}
          <div className="flex items-start gap-2.5">
            <Checkbox id="revisado" checked={revisado} onCheckedChange={(v) => setRevisado(v === true)} className="mt-0.5" disabled={bloqueado} />
            <Label htmlFor="revisado" className="text-sm leading-snug font-normal">
              Revisé el documento y estoy de acuerdo con su contenido.
            </Label>
          </div>
          {conClave && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border p-3">
              <Label htmlFor="clave-firma" className="flex items-center gap-1.5 text-sm">
                <KeyRound className="size-4 text-primary" /> Tu clave de firma
              </Label>
              <CampoClave id="clave-firma" etiqueta="Clave de firma" valor={clave} alCambiar={setClave} deshabilitado={firmando || !revisado} />
            </div>
          )}
        </div>

        <DialogFooter className="border-t p-4">
          <p className="mr-auto hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
            <ShieldCheck className="size-3.5" /> Firma electrónica · Ley 25.506
          </p>
          <Button variant="outline" onClick={cerrar} disabled={firmando}>
            Cancelar
          </Button>
          <Button onClick={firmar} disabled={!revisado || firmando || bloqueado || (conClave && clave.length !== 6)}>
            {firmando ? <Loader2 className="animate-spin" /> : <Stamp />} Firmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
