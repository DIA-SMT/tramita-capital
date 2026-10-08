"use client"

import { useState } from "react"
import Link from "next/link"
import { Fingerprint, KeyRound, Loader2, PenLine, ShieldCheck, Stamp, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Markdown } from "@/components/markdown"
import { CampoClave } from "@/components/firma/campo-clave"
import { LienzoFirma } from "@/components/firma/lienzo-firma"
import type { FirmaCapturada } from "@/lib/firma-trazo"

export type Firmante = { nombre: string; rol: string; area: string }
export type FirmaRegistradaVista = { aclaracion: string; cargo: string }
/** Lo que se envía al firmar una resolución: la clave y la firma dibujada en el acto (trazo crudo). */
export type FirmaOlografa = { clave: string; firma: FirmaCapturada }

/**
 * Firma electrónica consciente: la persona ve el texto completo, quién firma y en qué
 * carácter, y confirma expresamente que lo revisó. En resoluciones, además, dibuja su firma
 * (se compara con la registrada) y la confirma con su clave de 6 números.
 */
export function DialogoFirma({
  abierto,
  alCerrar,
  documento,
  firmante,
  firmaRegistrada = null,
  rutaMiFirma = "/mi-firma",
  alFirmar,
}: {
  abierto: boolean
  alCerrar: () => void
  documento: { tipo: string; titulo: string; contenido: string; conIA?: boolean; esResolucion?: boolean } | null
  firmante: Firmante
  /** Firma registrada de quien firma (si la tiene). */
  firmaRegistrada?: FirmaRegistradaVista | null
  rutaMiFirma?: string
  alFirmar: (olografa?: FirmaOlografa) => Promise<boolean>
}) {
  const [revisado, setRevisado] = useState(false)
  const [clave, setClave] = useState("")
  const [dibujo, setDibujo] = useState<FirmaCapturada | null>(null)
  const [lienzo, setLienzo] = useState(0)
  const [firmando, setFirmando] = useState(false)

  const esResolucion = Boolean(documento?.esResolucion)
  const sinRegistro = esResolucion && !firmaRegistrada
  const listo = revisado && !firmando && !sinRegistro && (!esResolucion || (dibujo !== null && clave.length === 6))

  function cerrar() {
    setRevisado(false)
    setClave("")
    setDibujo(null)
    setLienzo((k) => k + 1)
    alCerrar()
  }

  async function firmar() {
    setFirmando(true)
    const ok = await alFirmar(esResolucion && dibujo ? { clave, firma: dibujo } : undefined)
    setFirmando(false)
    if (ok) return cerrar()
    // Si no coincidió, se vuelve a dibujar y a ingresar la clave.
    setClave("")
    setDibujo(null)
    setLienzo((k) => k + 1)
  }

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && !firmando && cerrar()}>
      <DialogContent className="flex max-h-[94svh] flex-col gap-0 p-0 sm:max-w-2xl">
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

        <div className="space-y-3 overflow-y-auto border-t p-5">
          {sinRegistro ? (
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
              <TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-600" />
              <div className="flex-1">
                <p className="font-medium">Para firmar resoluciones necesitás tu firma registrada</p>
                <p className="text-muted-foreground">La registrás una sola vez; después firmás dibujándola y con tu clave de 6 números.</p>
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
                Firmás como <strong>{esResolucion && firmaRegistrada ? firmaRegistrada.aclaracion : firmante.nombre}</strong>,{" "}
                {esResolucion && firmaRegistrada ? firmaRegistrada.cargo : `${firmante.rol.toLowerCase()} de ${firmante.area}`}. Queda registrada la fecha, la
                hora y una huella SHA-256 encadenada al resto del expediente.
              </p>
            </div>
          )}
          {documento?.conIA && <p className="text-xs text-muted-foreground">Este borrador fue asistido por IA. Con tu firma asumís su contenido como propio.</p>}
          <div className="flex items-start gap-2.5">
            <Checkbox id="revisado" checked={revisado} onCheckedChange={(v) => setRevisado(v === true)} className="mt-0.5" disabled={sinRegistro} />
            <Label htmlFor="revisado" className="text-sm leading-snug font-normal">
              Revisé el documento y estoy de acuerdo con su contenido.
            </Label>
          </div>
          {esResolucion && !sinRegistro && (
            <div className="grid gap-3 rounded-xl border p-3">
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                  <PenLine className="size-4 text-primary" /> Firmá la resolución
                </p>
                {/* Mismo tamaño que en el registro: firmar en un recuadro distinto deforma la firma. */}
                <LienzoFirma
                  key={lienzo}
                  deshabilitado={firmando || !revisado}
                  alCambiar={setDibujo}
                />
                <p className="mt-1.5 text-xs text-muted-foreground">Se compara con tu firma registrada, en la forma y en el ritmo. Lo que dibujes es lo que queda estampado en la resolución.</p>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <Label htmlFor="clave-firma" className="flex items-center gap-1.5 text-sm">
                  <KeyRound className="size-4 text-primary" /> Tu clave de firma
                </Label>
                <CampoClave id="clave-firma" etiqueta="Clave de firma" valor={clave} alCambiar={setClave} deshabilitado={firmando || !revisado} />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t p-4">
          <p className="mr-auto hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
            <ShieldCheck className="size-3.5" /> {esResolucion ? "Firma ológrafa electrónica" : "Firma electrónica"} · Ley 25.506
          </p>
          <Button variant="outline" onClick={cerrar} disabled={firmando}>
            Cancelar
          </Button>
          <Button onClick={firmar} disabled={!listo}>
            {firmando ? <Loader2 className="animate-spin" /> : <Stamp />} Firmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
