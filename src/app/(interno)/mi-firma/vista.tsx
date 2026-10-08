"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { KeyRound, Loader2, LockKeyhole, PenLine, RefreshCw, ShieldCheck, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BloqueFirma } from "@/components/firma/bloque-firma"
import { CampoClave } from "@/components/firma/campo-clave"
import { LienzoFirma } from "@/components/firma/lienzo-firma"
import { Membrete } from "@/components/marca"
import { fechaCorta, fechaHora } from "@/lib/dominio"
import type { FirmaActiva } from "@/lib/firma-servidor"
import { CLAVE_FIRMA } from "@/lib/firma"
import { cn } from "@/lib/utils"
import { registrarFirma, revocarFirma } from "./acciones"

const PREVISIBLES = ["123456", "654321", "012345", "123123"]

export function VistaMiFirma({ firma, nombre, demo = false }: { firma: FirmaActiva | null; nombre: string; demo?: boolean }) {
  const router = useRouter()
  const [editando, setEditando] = useState(!firma)
  const [png, setPng] = useState<Blob | null>(null)
  const [vista, setVista] = useState<string | null>(null)
  const [aclaracion, setAclaracion] = useState(firma?.aclaracion ?? nombre)
  const [cargo, setCargo] = useState(firma?.cargo ?? "")
  const [clave, setClave] = useState("")
  const [confirmacion, setConfirmacion] = useState("")
  const [acepto, setAcepto] = useState(false)
  const [confirmarRevocar, setConfirmarRevocar] = useState(false)
  const [pendiente, iniciar] = useTransition()

  const claveDebil = clave.length === 6 && (/^(\d)\1{5}$/.test(clave) || PREVISIBLES.includes(clave))
  const noCoinciden = confirmacion.length === 6 && confirmacion !== clave
  const listo = png && aclaracion.trim().length >= 3 && cargo.trim().length >= 3 && CLAVE_FIRMA.test(clave) && !claveDebil && clave === confirmacion && acepto

  function registrar() {
    if (!listo || !png) return
    iniciar(async () => {
      if (demo) {
        await new Promise((r) => setTimeout(r, 700))
        toast.success("Vista previa: firma registrada")
        setEditando(false)
        return
      }
      const form = new FormData()
      form.set("imagen", new File([png], "firma.png", { type: "image/png" }))
      form.set("aclaracion", aclaracion)
      form.set("cargo", cargo)
      form.set("clave", clave)
      form.set("confirmacion", confirmacion)
      form.set("acepto", acepto ? "si" : "")
      const r = await registrarFirma(form)
      if (!r.ok) return void toast.error(r.error)
      toast.success("Firma registrada", { description: "Desde ahora la usás con tu clave en resoluciones y dictámenes." })
      setClave("")
      setConfirmacion("")
      setEditando(false)
      router.refresh()
    })
  }

  function revocar() {
    iniciar(async () => {
      if (demo) {
        await new Promise((r) => setTimeout(r, 500))
        toast.success("Vista previa: firma revocada")
        setConfirmarRevocar(false)
        return
      }
      const r = await revocarFirma()
      if (!r.ok) return void toast.error(r.error)
      toast.success("Firma revocada")
      setConfirmarRevocar(false)
      setEditando(true)
      router.refresh()
    })
  }

  const imagenVista = editando ? vista : (firma?.imagenUrl ?? null)

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">Firma del funcionario</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Mi firma</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Registrala una sola vez. Cuando firmes una resolución o un dictamen, el sistema estampa tu firma, tu aclaración y tu cargo, y lo
          confirma con tu clave personal.
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* Registro o estado */}
        {editando ? (
          <section className="space-y-6 rounded-3xl border bg-card p-5 sm:p-6">
            <Paso numero={1} titulo="Tu firma" icono={PenLine}>
              <LienzoFirma
                deshabilitado={pendiente}
                alCambiar={(b, v) => {
                  setPng(b)
                  setVista(v)
                }}
              />
            </Paso>

            <Paso numero={2} titulo="Aclaración y cargo" icono={ShieldCheck}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="aclaracion">Aclaración</Label>
                  <Input id="aclaracion" value={aclaracion} onChange={(e) => setAclaracion(e.target.value)} maxLength={120} placeholder="Nombre y apellido" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="cargo">Cargo</Label>
                  <Input id="cargo" value={cargo} onChange={(e) => setCargo(e.target.value)} maxLength={160} placeholder="Ej.: Directora de Capital Humano" />
                </div>
              </div>
            </Paso>

            <Paso numero={3} titulo="Clave de firma" icono={KeyRound}>
              <p className="-mt-1 mb-3 text-sm text-muted-foreground">
                6 números. Te la pedimos cada vez que firmás. Es personal: quien la conoce puede firmar en tu nombre.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="clave">Clave</Label>
                  <CampoClave id="clave" etiqueta="Clave de firma" valor={clave} alCambiar={setClave} error={claveDebil} deshabilitado={pendiente} />
                  {claveDebil && <p className="text-xs text-destructive">Elegí una clave menos previsible.</p>}
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="confirmacion">Repetila</Label>
                  <CampoClave id="confirmacion" etiqueta="Repetir la clave" valor={confirmacion} alCambiar={setConfirmacion} error={noCoinciden} deshabilitado={pendiente} />
                  {noCoinciden && <p className="text-xs text-destructive">No coincide.</p>}
                </div>
              </div>
            </Paso>

            <div className="flex items-start gap-2.5 rounded-2xl bg-muted/50 p-4">
              <Checkbox id="acepto" checked={acepto} onCheckedChange={(v) => setAcepto(v === true)} className="mt-0.5" />
              <Label htmlFor="acepto" className="text-sm leading-relaxed font-normal">
                Declaro que la firma registrada es de mi puño y letra y que la clave es personal e intransferible. Su uso en Tramita Capital
                expresa mi voluntad de firmar, con el alcance de la firma electrónica (Ley 25.506, art. 5).
              </Label>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              {firma && (
                <Button variant="ghost" onClick={() => setEditando(false)} disabled={pendiente}>
                  Cancelar
                </Button>
              )}
              <Button size="lg" onClick={registrar} disabled={!listo || pendiente}>
                {pendiente ? <Loader2 className="animate-spin" /> : <LockKeyhole />} Registrar mi firma
              </Button>
            </div>
          </section>
        ) : (
          firma && (
            <section className="space-y-5 rounded-3xl border bg-card p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                  <ShieldCheck className="size-5" />
                </span>
                <div>
                  <h2 className="font-semibold">Tu firma está registrada</h2>
                  <p className="text-sm text-muted-foreground">Desde el {fechaCorta(firma.registradaAt)}. Cada uso queda auditado.</p>
                </div>
              </div>
              {firma.bloqueadaHasta && (
                <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-800 dark:text-amber-300">
                  Bloqueada por intentos fallidos hasta las {fechaHora(firma.bloqueadaHasta).slice(-5)}.
                </p>
              )}
              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">Aclaración</dt>
                  <dd className="font-medium">{firma.aclaracion}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Cargo</dt>
                  <dd className="font-medium">{firma.cargo}</dd>
                </div>
              </dl>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <KeyRound className="mt-0.5 size-4 shrink-0 text-primary" /> Al firmar resoluciones y dictámenes te pedimos tu clave de 6 números.
                </li>
                <li className="flex gap-2">
                  <LockKeyhole className="mt-0.5 size-4 shrink-0 text-primary" /> Con 5 intentos fallidos la firma se bloquea 15 minutos.
                </li>
                <li className="flex gap-2">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" /> La imagen solo la ve quien puede ver el expediente firmado.
                </li>
              </ul>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setEditando(true)}>
                  <RefreshCw /> Registrar otra firma o cambiar la clave
                </Button>
                <Button variant="ghost" className="text-destructive" onClick={() => setConfirmarRevocar(true)}>
                  <Trash2 /> Revocar
                </Button>
              </div>
            </section>
          )
        )}

        {/* Vista previa en un documento */}
        <aside className="lg:sticky lg:top-20">
          <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Así se ve en tus resoluciones</p>
          <div className="relative overflow-hidden rounded-3xl border bg-white p-6 text-slate-900 shadow-xl shadow-primary/5 sm:p-8">
            <Membrete className="text-slate-900" />
            <div className="mt-6 space-y-2" aria-hidden>
              {[92, 100, 96, 70, 100, 84].map((w, i) => (
                <span key={i} className="block h-2 rounded-full bg-slate-200" style={{ width: `${w}%` }} />
              ))}
            </div>
            <p className="mt-5 text-[0.72rem] font-semibold tracking-[0.25em] text-slate-700">R E S U E L V E</p>
            <div className="mt-2 space-y-2" aria-hidden>
              {[100, 88, 60].map((w, i) => (
                <span key={i} className="block h-2 rounded-full bg-slate-200" style={{ width: `${w}%` }} />
              ))}
            </div>
            <div className={cn("mt-8 flex justify-end transition-opacity", !imagenVista && "opacity-60")}>
              <BloqueFirma
                sello={{ tipo: "registrada", aclaracion: aclaracion || "Aclaración", cargo: cargo || "Cargo", registroId: null, imagenSha256: null }}
                firmadaAt={new Date().toISOString()}
                hash={null}
                imagenUrl={imagenVista}
                className="[&_p]:text-slate-600 [&_p.font-semibold]:text-slate-900"
              />
            </div>
          </div>
        </aside>
      </div>

      <Dialog open={confirmarRevocar} onOpenChange={(o) => !o && !pendiente && setConfirmarRevocar(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Revocar tu firma registrada?</DialogTitle>
            <DialogDescription>
              Las fojas que ya firmaste conservan su firma. Para firmar resoluciones de trámites que la exigen vas a tener que registrar una nueva.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmarRevocar(false)} disabled={pendiente}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={revocar} disabled={pendiente}>
              {pendiente && <Loader2 className="animate-spin" />} Revocar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Paso({ numero, titulo, icono: Icono, children }: { numero: number; titulo: string; icono: typeof PenLine; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2.5 font-medium">
        <span className="grid size-7 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{numero}</span>
        {titulo}
        <Icono className="ml-auto size-4 text-muted-foreground" />
      </h2>
      {children}
    </div>
  )
}
