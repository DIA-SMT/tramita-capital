"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { BadgeCheck, KeyRound, Loader2, ShieldOff, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { CampoClave } from "@/components/firma/campo-clave"
import { fechaCorta } from "@/lib/dominio"
import { CLAVE_FIRMA } from "@/lib/firma"
import type { AutorizacionEmision } from "@/lib/certificado"
import { autorizarEmision, revocarEmision } from "./acciones"

export type TramiteAutomatico = { codigo: string; nombre: string; autorizacion: AutorizacionEmision }

/**
 * Emisión automática (migración 001900): quien firma resoluciones autoriza con su clave que el sistema emita los
 * documentos de un trámite (el certificado de trabajo) con su firma registrada. Se revoca cuando quiera; si revoca la
 * firma o registra otra, la autorización deja de valer.
 */
export function EmisionAutomatica({ tramites, demo = false }: { tramites: TramiteAutomatico[]; demo?: boolean }) {
  const router = useRouter()
  const [estado, setEstado] = useState(tramites)
  const [autorizando, setAutorizando] = useState<TramiteAutomatico | null>(null)
  const [revocando, setRevocando] = useState<TramiteAutomatico | null>(null)
  const [clave, setClave] = useState("")
  const [pendiente, iniciar] = useTransition()

  const actualizar = (codigo: string, autorizacion: AutorizacionEmision) =>
    setEstado((e) => e.map((t) => (t.codigo === codigo ? { ...t, autorizacion } : t)))

  function autorizar() {
    const t = autorizando
    if (!t || !CLAVE_FIRMA.test(clave)) return
    iniciar(async () => {
      if (demo) {
        await new Promise((r) => setTimeout(r, 500))
        actualizar(t.codigo, { autorizada: true, aclaracion: "Laura Campos", cargo: "Directora de Capital Humano", desde: new Date().toISOString(), propia: true })
        toast.success("Vista previa: emisión automática autorizada")
      } else {
        const r = await autorizarEmision(t.codigo, clave)
        if (!r.ok) {
          setClave("")
          return void toast.error(r.error)
        }
        toast.success("Emisión automática autorizada", { description: `${t.nombre}: sale firmado al pedirlo.` })
        router.refresh()
      }
      setClave("")
      setAutorizando(null)
    })
  }

  function revocar() {
    const t = revocando
    if (!t) return
    iniciar(async () => {
      if (demo) {
        await new Promise((r) => setTimeout(r, 400))
        actualizar(t.codigo, { autorizada: false })
        toast.success("Vista previa: autorización revocada")
      } else {
        const r = await revocarEmision(t.codigo)
        if (!r.ok) return void toast.error(r.error)
        toast.success("Autorización revocada", { description: "Los pedidos nuevos quedan en Registro hasta que vuelvas a autorizar." })
        router.refresh()
      }
      setRevocando(null)
    })
  }

  if (estado.length === 0) return null

  return (
    <section className="rounded-3xl border bg-card p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Zap className="size-5" />
        </span>
        <div>
          <h2 className="font-semibold">Emisión automática</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Autorizás una sola vez, con tu clave, que el sistema emita estos documentos con tu firma registrada, sin que pasen por tu bandeja. Cada uno
            dice que fue emitido con firma autorizada y lleva su código de verificación. Si revocás tu firma o registrás otra, hay que volver a autorizar.
          </p>
        </div>
      </div>
      <ul className="mt-4 divide-y rounded-2xl border">
        {estado.map((t) => (
          <li key={t.codigo} className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{t.nombre}</p>
              <p className="text-sm text-muted-foreground">
                {t.autorizacion.autorizada
                  ? `Autorizada por ${t.autorizacion.propia ? "vos" : t.autorizacion.aclaracion}${t.autorizacion.desde ? ` el ${fechaCorta(t.autorizacion.desde)}` : ""}: sale firmado al pedirlo.`
                  : "Sin autorizar: los pedidos esperan en el Departamento de Registro."}
              </p>
            </div>
            {t.autorizacion.autorizada && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                <BadgeCheck className="size-3.5" /> Activa
              </span>
            )}
            {t.autorizacion.autorizada && t.autorizacion.propia ? (
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setRevocando(t)}>
                <ShieldOff /> Revocar
              </Button>
            ) : (
              <Button size="sm" variant={t.autorizacion.autorizada ? "outline" : "default"} onClick={() => setAutorizando(t)}>
                <KeyRound /> {t.autorizacion.autorizada ? "Autorizar con mi firma" : "Autorizar"}
              </Button>
            )}
          </li>
        ))}
      </ul>

      <Dialog open={autorizando !== null} onOpenChange={(o) => !o && !pendiente && (setAutorizando(null), setClave(""))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Autorizar la emisión automática</DialogTitle>
            <DialogDescription>
              {autorizando?.nombre}: el sistema lo va a emitir con tu firma registrada cada vez que un agente activo lo pida.
              {autorizando?.autorizacion.autorizada ? ` Reemplaza la autorización de ${autorizando.autorizacion.aclaracion}.` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="clave-autorizacion">Tu clave de firma</Label>
            <CampoClave id="clave-autorizacion" etiqueta="Clave de firma" valor={clave} alCambiar={setClave} autoFocus deshabilitado={pendiente} />
            <p className="text-xs text-muted-foreground">Con 5 intentos fallidos tu firma se bloquea 15 minutos.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => (setAutorizando(null), setClave(""))} disabled={pendiente}>
              Cancelar
            </Button>
            <Button onClick={autorizar} disabled={pendiente || !CLAVE_FIRMA.test(clave)}>
              {pendiente ? <Loader2 className="animate-spin" /> : <KeyRound />} Autorizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={revocando !== null} onOpenChange={(o) => !o && !pendiente && setRevocando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Revocar la emisión automática?</DialogTitle>
            <DialogDescription>
              {revocando?.nombre}: los certificados ya emitidos siguen valiendo. Los pedidos nuevos quedan en el Departamento de Registro, que no los puede
              emitir hasta que alguien vuelva a autorizar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevocando(null)} disabled={pendiente}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={revocar} disabled={pendiente}>
              {pendiente && <Loader2 className="animate-spin" />} Revocar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
