"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import Image from "next/image"
import { Check, KeyRound, Loader2, LockKeyhole, PenLine, RefreshCw, RotateCcw, ShieldCheck, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BloqueFirma } from "@/components/firma/bloque-firma"
import { CampoClave } from "@/components/firma/campo-clave"
import { LienzoFirma } from "@/components/firma/lienzo-firma"
import { ProbadorFirma } from "@/components/firma/probador-firma"
import { compararDemo, guardarFirmaDemo } from "@/lib/firma-demo"
import { Membrete } from "@/components/marca"
import { fechaCorta, fechaHora } from "@/lib/dominio"
import type { FirmaActiva } from "@/lib/firma-servidor"
import { CLAVE_FIRMA } from "@/lib/firma"
import { distancia, patronDeTrazos, type PatronFirma } from "@/lib/firma-trazo"
import { cn } from "@/lib/utils"
import { probarFirma, registrarFirma, revocarFirma } from "./acciones"

const PREVISIBLES = ["123456", "654321", "012345", "123123"]
const MUESTRAS = 3
/** Variación máxima aceptada entre las tres muestras (misma regla que la base). */
const VARIACION_MAXIMA = 0.3

type Muestra = { patron: PatronFirma; png: Blob; vista: string }

export function VistaMiFirma({ firma, nombre, demo = false }: { firma: FirmaActiva | null; nombre: string; demo?: boolean }) {
  const router = useRouter()
  // En la vista previa la firma registrada vive en este navegador.
  const [firmaVista, setFirmaVista] = useState(firma)
  const [editando, setEditando] = useState(!firma)
  const [muestras, setMuestras] = useState<Muestra[]>([])
  const [borrador, setBorrador] = useState<Muestra | null>(null)
  const [lienzo, setLienzo] = useState(0)
  const [aclaracion, setAclaracion] = useState(firma?.aclaracion ?? nombre)
  const [cargo, setCargo] = useState(firma?.cargo ?? "")
  const [clave, setClave] = useState("")
  const [confirmacion, setConfirmacion] = useState("")
  const [acepto, setAcepto] = useState(false)
  const [confirmarRevocar, setConfirmarRevocar] = useState(false)
  const [pendiente, iniciar] = useTransition()

  const claveDebil = clave.length === 6 && (/^(\d)\1{5}$/.test(clave) || PREVISIBLES.includes(clave))
  const noCoinciden = confirmacion.length === 6 && confirmacion !== clave
  const variacion =
    muestras.length === MUESTRAS
      ? Math.max(distancia(muestras[0].patron.v, muestras[1].patron.v), distancia(muestras[0].patron.v, muestras[2].patron.v), distancia(muestras[1].patron.v, muestras[2].patron.v))
      : null
  const consistente = variacion !== null && variacion <= VARIACION_MAXIMA
  const listo =
    consistente && aclaracion.trim().length >= 3 && cargo.trim().length >= 3 && CLAVE_FIRMA.test(clave) && !claveDebil && clave === confirmacion && acepto

  function guardarMuestra() {
    if (!borrador || muestras.length >= MUESTRAS) return
    setMuestras((m) => [...m, borrador])
    setBorrador(null)
    setLienzo((k) => k + 1)
  }
  function reiniciarMuestras() {
    setMuestras([])
    setBorrador(null)
    setLienzo((k) => k + 1)
  }

  function registrar() {
    if (!listo) return
    iniciar(async () => {
      if (demo) {
        await new Promise((r) => setTimeout(r, 700))
        guardarFirmaDemo(muestras.map((m) => m.patron))
        setFirmaVista({
          id: "demo",
          aclaracion,
          cargo,
          imagenUrl: muestras[MUESTRAS - 1].vista,
          registradaAt: new Date().toISOString(),
          bloqueadaHasta: null,
        })
        toast.success("Vista previa: firma registrada en este navegador", { description: "Probala abajo o firmá una resolución: se compara de verdad." })
        setEditando(false)
        return
      }
      const form = new FormData()
      // La última muestra queda como imagen de referencia; las tres forman el patrón.
      form.set("imagen", new File([muestras[MUESTRAS - 1].png], "firma.png", { type: "image/png" }))
      form.set("muestras", JSON.stringify(muestras.map((m) => m.patron)))
      form.set("aclaracion", aclaracion)
      form.set("cargo", cargo)
      form.set("clave", clave)
      form.set("confirmacion", confirmacion)
      form.set("acepto", acepto ? "si" : "")
      const r = await registrarFirma(form)
      if (!r.ok) return void toast.error(r.error)
      toast.success("Firma registrada", { description: "Para firmar resoluciones vas a dibujarla y confirmar con tu clave." })
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

  const imagenVista = editando ? (borrador?.vista ?? muestras.at(-1)?.vista ?? null) : (firmaVista?.imagenUrl ?? null)

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">Firma del funcionario</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Mi firma</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Registrala una sola vez, dibujándola tres veces. Para firmar cada resolución la dibujás de nuevo: el sistema la compara con la
          registrada y la confirma con tu clave personal. En la resolución queda la firma que hiciste en ese momento.
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* Registro o estado */}
        {editando ? (
          <section className="space-y-6 rounded-3xl border bg-card p-5 sm:p-6">
            <Paso numero={1} titulo="Tu firma, tres veces" icono={PenLine}>
              <p className="-mt-1 mb-3 text-sm text-muted-foreground">
                Firmá como lo hacés en papel. Con las tres muestras el sistema aprende tu forma de firmar. Mejor con el dedo o un lápiz en el celular o
                la tablet.
              </p>
              <div className="mb-3 grid grid-cols-3 gap-2">
                {Array.from({ length: MUESTRAS }, (_, i) => {
                  const m = muestras[i]
                  return (
                    <div
                      key={i}
                      className={cn(
                        "relative grid h-16 place-items-center rounded-xl border bg-white",
                        m ? "border-emerald-500/40" : i === muestras.length ? "border-dashed border-primary/50" : "border-dashed",
                      )}
                    >
                      {m ? (
                        <Image src={m.vista} alt={`Muestra ${i + 1}`} width={120} height={50} unoptimized className="h-12 w-auto object-contain" />
                      ) : (
                        <span className="text-xs text-slate-400">Muestra {i + 1}</span>
                      )}
                      {m && (
                        <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-emerald-500 text-white">
                          <Check className="size-3" />
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
              {muestras.length < MUESTRAS ? (
                <>
                  <LienzoFirma
                    key={lienzo}
                    deshabilitado={pendiente}
                    alCambiar={(png, vista, trazos) => {
                      const patron = trazos ? patronDeTrazos(trazos) : null
                      setBorrador(png && vista && patron ? { patron, png, vista } : null)
                    }}
                  />
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">{borrador ? "¿Quedó como siempre? Guardala." : "Dibujá la firma completa."}</p>
                    <Button size="sm" onClick={guardarMuestra} disabled={!borrador || pendiente}>
                      <Check /> Guardar muestra {muestras.length + 1} de {MUESTRAS}
                    </Button>
                  </div>
                </>
              ) : (
                <div
                  className={cn(
                    "flex flex-wrap items-center gap-3 rounded-xl border p-3 text-sm",
                    consistente ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5",
                  )}
                >
                  <p className="flex-1">
                    {consistente
                      ? "Las tres muestras son consistentes: el sistema ya conoce tu firma."
                      : "Las tres muestras son muy distintas entre sí. Volvé a dibujarlas, con calma y del mismo modo."}
                  </p>
                  <Button size="sm" variant="outline" onClick={reiniciarMuestras} disabled={pendiente}>
                    <RotateCcw /> Volver a empezar
                  </Button>
                </div>
              )}
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
                expresa mi voluntad de firmar, con el alcance de la firma electrónica (Ley 25.506, art. 5). Acepto que se guarde el patrón de
                mis trazos solo para verificar mis firmas.
              </Label>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              {firmaVista && (
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
          firmaVista && (
            <section className="space-y-5 rounded-3xl border bg-card p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                  <ShieldCheck className="size-5" />
                </span>
                <div>
                  <h2 className="font-semibold">Tu firma está registrada</h2>
                  <p className="text-sm text-muted-foreground">Desde el {fechaCorta(firmaVista.registradaAt)}. Cada uso queda auditado.</p>
                </div>
              </div>
              {firmaVista.bloqueadaHasta && (
                <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-800 dark:text-amber-300">
                  Bloqueada por intentos fallidos hasta las {fechaHora(firmaVista.bloqueadaHasta).slice(-5)}.
                </p>
              )}
              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">Aclaración</dt>
                  <dd className="font-medium">{firmaVista.aclaracion}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Cargo</dt>
                  <dd className="font-medium">{firmaVista.cargo}</dd>
                </div>
              </dl>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <PenLine className="mt-0.5 size-4 shrink-0 text-primary" /> Para firmar una resolución la dibujás y el sistema la compara con la registrada.
                </li>
                <li className="flex gap-2">
                  <KeyRound className="mt-0.5 size-4 shrink-0 text-primary" /> Además te pedimos tu clave de 6 números.
                </li>
                <li className="flex gap-2">
                  <LockKeyhole className="mt-0.5 size-4 shrink-0 text-primary" /> Con 5 intentos fallidos (clave o firma que no coincide) se bloquea 15 minutos.
                </li>
                <li className="flex gap-2">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" /> Tu firma solo la ve quien puede ver el expediente firmado. El patrón de tus trazos nunca se muestra.
                </li>
              </ul>
              <div className="rounded-2xl border bg-muted/30 p-4">
                <h3 className="font-medium">Probá tu firma</h3>
                <p className="mb-3 text-sm text-muted-foreground">
                  Dibujala como al firmar y mirá cómo la compara el sistema. No firma nada; la prueba queda registrada.
                </p>
                <ProbadorFirma comparar={async (trazo) => (demo ? compararDemo(trazo) : probarFirma(JSON.stringify(trazo)))} />
              </div>
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
                sello={{ tipo: "olografa", aclaracion: aclaracion || "Aclaración", cargo: cargo || "Cargo", registroId: null, imagenSha256: null }}
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
              Las fojas que ya firmaste conservan su firma. Para volver a firmar resoluciones vas a tener que registrar una nueva.
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
