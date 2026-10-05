"use client"

import { useState } from "react"
import { Fingerprint, Loader2, ShieldCheck, Stamp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Markdown } from "@/components/markdown"

export type Firmante = { nombre: string; rol: string; area: string }

/**
 * Firma electrónica consciente: la persona ve el texto completo, quién firma y en qué
 * carácter, y confirma expresamente que lo revisó. La firma es su manifestación de voluntad.
 */
export function DialogoFirma({
  abierto,
  alCerrar,
  documento,
  firmante,
  alFirmar,
}: {
  abierto: boolean
  alCerrar: () => void
  documento: { tipo: string; titulo: string; contenido: string; conIA?: boolean } | null
  firmante: Firmante
  alFirmar: () => Promise<boolean>
}) {
  const [revisado, setRevisado] = useState(false)
  const [firmando, setFirmando] = useState(false)

  async function firmar() {
    setFirmando(true)
    const ok = await alFirmar()
    setFirmando(false)
    if (ok) {
      setRevisado(false)
      alCerrar()
    }
  }

  return (
    <Dialog
      open={abierto}
      onOpenChange={(o) => {
        if (!o && !firmando) {
          setRevisado(false)
          alCerrar()
        }
      }}
    >
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
          </article>
        </div>

        <div className="space-y-3 border-t p-5">
          <div className="flex items-center gap-3 rounded-xl bg-primary/5 p-3 text-sm">
            <Fingerprint className="size-5 shrink-0 text-primary" />
            <p>
              Firmás como <strong>{firmante.nombre}</strong>, {firmante.rol.toLowerCase()} de {firmante.area}. Queda registrada la fecha, la hora
              y una huella SHA-256 encadenada al resto del expediente.
            </p>
          </div>
          {documento?.conIA && (
            <p className="text-xs text-muted-foreground">
              Este borrador fue asistido por IA. Con tu firma asumís su contenido como propio.
            </p>
          )}
          <div className="flex items-start gap-2.5">
            <Checkbox id="revisado" checked={revisado} onCheckedChange={(v) => setRevisado(v === true)} className="mt-0.5" />
            <Label htmlFor="revisado" className="text-sm leading-snug font-normal">
              Revisé el documento y estoy de acuerdo con su contenido.
            </Label>
          </div>
        </div>

        <DialogFooter className="border-t p-4">
          <p className="mr-auto hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
            <ShieldCheck className="size-3.5" /> Firma electrónica · Ley 25.506
          </p>
          <Button variant="outline" onClick={alCerrar} disabled={firmando}>
            Cancelar
          </Button>
          <Button onClick={firmar} disabled={!revisado || firmando}>
            {firmando ? <Loader2 className="animate-spin" /> : <Stamp />} Firmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
