"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowRight, Fingerprint, FolderOpen, KeyRound, Loader2, PenLine, ShieldCheck, Stamp, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { CampoClave } from "@/components/firma/campo-clave"
import { LienzoFirma } from "@/components/firma/lienzo-firma"
import type { FirmaRegistradaVista } from "@/components/expediente/dialogo-firma"
import type { ControlesHechos } from "@/components/expediente/tarea-paso"
import { compararDemo, registrarUsoDemo } from "@/lib/firma-demo"
import type { FirmaCapturada } from "@/lib/firma-trazo"
import { cn } from "@/lib/utils"
import { firmarResolucion, marcarControl, pasarExpediente } from "../expedientes/[id]/acciones"

/** El control "Firmar la resolución…" del paso se cumple al firmar: no se tilda antes. */
const esDeFirma = (control: string) => /^firmar\b/i.test(control.trim())

/**
 * Firma de una resolución dentro de la cola: los controles del paso, la confirmación de lectura, la
 * firma dibujada y la clave, en un solo bloque al final del proyecto. Firma con la misma RPC que el
 * expediente (firma ológrafa electrónica) y después lo pasa a la oficina siguiente del circuito, con
 * la providencia de lo hecho, y sigue con el próximo de la cola.
 */
export function FirmaEnSerie({
  expedienteId,
  firmada,
  proyecto,
  controles,
  hechos,
  genera,
  siguiente,
  firmante,
  firmaRegistrada,
  rutaMiFirma,
  rutaExpediente,
  rutaTras,
  demo = false,
}: {
  expedienteId: string
  /** La resolución ya está firmada: solo falta pasar el expediente. */
  firmada: boolean
  proyecto: { id: string; sentido: "hace_lugar" | "rechaza" | null; conIA: boolean; incompleto: boolean } | null
  controles: string[]
  hechos: ControlesHechos
  genera: string[]
  siguiente: { nombre: string; area: string } | null
  firmante: { nombre: string; cargo: string }
  firmaRegistrada: FirmaRegistradaVista | null
  rutaMiFirma: string
  rutaExpediente: string
  /** A dónde ir después de firmar y pasar: el próximo de la cola. */
  rutaTras: string
  demo?: boolean
}) {
  const router = useRouter()
  const [marcas, setMarcas] = useState<ControlesHechos>(hechos)
  const [revisado, setRevisado] = useState(false)
  const [dibujo, setDibujo] = useState<FirmaCapturada | null>(null)
  const [clave, setClave] = useState("")
  const [lienzo, setLienzo] = useState(0)
  const [estado, setEstado] = useState<"libre" | "firmando" | "pasando">("libre")
  const ocupado = estado !== "libre"

  const previos = controles.map((c, i) => ({ c, i })).filter(({ c }) => !esDeFirma(c))
  const deFirma = controles.map((c, i) => ({ c, i })).filter(({ c }) => esDeFirma(c))
  const faltanControles = previos.filter(({ i }) => !marcas[i]).length
  const destino = siguiente ? `pasar a ${siguiente.area}` : null

  // Lo que impide firmar, dicho en una línea.
  const bloqueo = !proyecto
    ? "El área anterior no dejó el proyecto de resolución."
    : proyecto.incompleto
      ? "El proyecto tiene datos [COMPLETAR] sin resolver."
      : !proyecto.sentido
        ? "El proyecto no dice si hace lugar o rechaza."
        : null
  const falta = !firmaRegistrada
    ? null
    : faltanControles > 0
      ? "Marcá los controles del paso."
      : !revisado
        ? "Confirmá que leíste la resolución."
        : !dibujo || clave.length < 6
          ? "Dibujá tu firma y poné tu clave de 6 números."
          : null
  const listo = !bloqueo && !!firmaRegistrada && !falta && !ocupado

  async function marcar(i: number, hecho: boolean) {
    const antes = marcas
    setMarcas((m) => {
      const n = { ...m }
      if (hecho) n[i] = { at: new Date().toISOString() }
      else delete n[i]
      return n
    })
    if (demo) return
    const r = await marcarControl(expedienteId, i, hecho)
    if (!r.ok) {
      toast.error(r.error ?? "No se pudo guardar el control")
      setMarcas(antes)
    }
  }

  function volverAFirmar() {
    setDibujo(null)
    setClave("")
    setLienzo((k) => k + 1)
  }

  /** Providencia del pase, igual que la tarea del paso: los controles hechos y lo que se incorporó. */
  function providencia() {
    const hechosTexto = controles.filter((c, i) => marcas[i] || esDeFirma(c))
    return [hechosTexto.length ? `Controles realizados: ${hechosTexto.join("; ")}.` : "", genera.length ? `Se incorporó: ${genera.join("; ")}.` : ""]
      .filter(Boolean)
      .join(" ")
  }

  async function pasar() {
    if (!siguiente) {
      toast.success("Resolución firmada", { description: "Es el último paso del circuito: archivá el expediente desde su pantalla." })
      router.push(rutaExpediente)
      return
    }
    setEstado("pasando")
    if (demo) {
      await new Promise((r) => setTimeout(r, 500))
      toast.success(`Vista previa: firmada y pasada a ${siguiente.area}`, { description: "Número y fecha se asignan al firmar." })
      router.push(rutaTras)
      return
    }
    const r = await pasarExpediente({ expedienteId, haciaArea: null, motivo: providencia() })
    if (!r.ok) {
      toast.error("La resolución quedó firmada, pero no se pudo pasar el expediente", { description: r.error })
      setEstado("libre")
      router.refresh()
      return
    }
    toast.success(`Firmada y pasada a ${siguiente.area}`, { description: "Quedó foliada, con número y fecha, y ya le avisamos al área." })
    router.push(rutaTras)
    router.refresh()
  }

  async function firmar() {
    if (!listo || !proyecto || !dibujo) return
    setEstado("firmando")
    if (demo) {
      await new Promise((r) => setTimeout(r, 700))
      // En la vista previa también se compara de verdad, contra la firma registrada en este navegador.
      const ev = compararDemo(dibujo.patron)
      if ("error" in ev) {
        toast.info(ev.error)
        setEstado("libre")
        return volverAFirmar()
      }
      if (!ev.coincide) {
        toast.error(ev.copia ? "Es idéntica a una firma anterior: se rechaza como copia" : "La firma no coincide con la registrada", {
          description: "Vista previa: no se firmó. Dibujala de nuevo, como siempre.",
        })
        setEstado("libre")
        return volverAFirmar()
      }
      registrarUsoDemo(dibujo.patron)
      return pasar()
    }
    const r = await firmarResolucion({
      actuacionId: proyecto.id,
      clave,
      trazo: dibujo.crudo,
      dispositivo: dibujo.dispositivo,
      tinta: dibujo.tinta,
      // Contexto para la evidencia pericial (el servidor agrega navegador e IP).
      entorno: {
        pantalla: `${screen.width}x${screen.height}@${window.devicePixelRatio}`,
        zona: Intl.DateTimeFormat().resolvedOptions().timeZone,
        idioma: navigator.language,
      },
    })
    if (!r.ok) {
      toast.error(r.error)
      setEstado("libre")
      return volverAFirmar()
    }
    // El control "Firmar la resolución" se cumplió al firmar.
    await Promise.all(deFirma.filter(({ i }) => !marcas[i]).map(({ i }) => marcarControl(expedienteId, i, true)))
    await pasar()
  }

  // Ya firmada (por ejemplo, si falló el pase): solo falta pasarla.
  if (firmada) {
    return (
      <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
        <p className="flex items-center gap-2 font-medium">
          <ShieldCheck className="size-5 text-emerald-600" /> La resolución ya está firmada
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {siguiente ? `Falta pasar el expediente a ${siguiente.area} para «${siguiente.nombre}».` : "Es el último paso: archivá el expediente desde su pantalla."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {siguiente && (
            <Button onClick={pasar} disabled={ocupado}>
              {estado === "pasando" ? <Loader2 className="animate-spin" /> : <ArrowRight />} Pasar a {siguiente.area}
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href={rutaExpediente}>
              <FolderOpen /> Abrir el expediente
            </Link>
          </Button>
        </div>
      </section>
    )
  }

  if (bloqueo) {
    return (
      <section className="flex flex-col gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 sm:flex-row sm:items-center">
        <TriangleAlert className="size-5 shrink-0 text-amber-600" />
        <div className="flex-1 text-sm">
          <p className="font-medium">Todavía no se puede firmar</p>
          <p className="text-muted-foreground">{bloqueo} Abrí el expediente para ver qué falta.</p>
        </div>
        <Button asChild variant="outline">
          <Link href={rutaExpediente}>
            <FolderOpen /> Abrir el expediente
          </Link>
        </Button>
      </section>
    )
  }

  if (!firmaRegistrada) {
    return (
      <section className="flex flex-col gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 sm:flex-row sm:items-center">
        <PenLine className="size-5 shrink-0 text-amber-600" />
        <div className="flex-1 text-sm">
          <p className="font-medium">Para firmar resoluciones necesitás tu firma registrada</p>
          <p className="text-muted-foreground">La registrás una sola vez; después firmás dibujándola y con tu clave de 6 números.</p>
        </div>
        <Button asChild>
          <Link href={rutaMiFirma}>
            <PenLine /> Registrar mi firma
          </Link>
        </Button>
      </section>
    )
  }

  return (
    <section className="overflow-hidden rounded-2xl border bg-card" aria-labelledby="titulo-firma">
      <div className="flex items-center gap-3 border-b bg-primary/[0.04] px-5 py-3.5">
        <Fingerprint className="size-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <h2 id="titulo-firma" className="text-sm font-semibold">
            Firmar la resolución
          </h2>
          <p className="truncate text-xs text-muted-foreground">
            Firmás como <span className="font-medium text-foreground">{firmaRegistrada.aclaracion}</span>, {firmaRegistrada.cargo || firmante.cargo}
          </p>
        </div>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-2">
        <div className="space-y-2.5">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Antes de firmar</p>
          {previos.map(({ c, i }) => (
            <label
              key={i}
              className={cn(
                "flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-sm transition-colors",
                marcas[i] ? "border-emerald-500/30 bg-emerald-500/5" : "hover:bg-muted/50",
              )}
            >
              <Checkbox checked={!!marcas[i]} onCheckedChange={(v) => marcar(i, v === true)} disabled={ocupado} className="mt-0.5" />
              <span className="leading-snug">{c}</span>
            </label>
          ))}
          <label
            className={cn(
              "flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-sm transition-colors",
              revisado ? "border-emerald-500/30 bg-emerald-500/5" : "border-primary/40 bg-primary/5",
            )}
          >
            <Checkbox checked={revisado} onCheckedChange={(v) => setRevisado(v === true)} disabled={ocupado} className="mt-0.5" />
            <span className="leading-snug font-medium">Leí la resolución y estoy de acuerdo con su contenido.</span>
          </label>
          {proyecto?.conIA && <p className="px-1 text-xs text-muted-foreground">El proyecto fue asistido por IA. Con tu firma asumís su contenido como propio.</p>}
          <p className="flex items-start gap-1.5 px-1 pt-1 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
            Firma ológrafa electrónica (Ley 25.506). Al firmar se asignan el número y la fecha, queda foliada y ya no se puede modificar.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="mb-2 flex items-center gap-1.5 text-sm">
              <PenLine className="size-4 text-primary" /> Tu firma
            </Label>
            {/* Mismo tamaño que en el registro: firmar en un recuadro distinto deforma la firma. */}
            <LienzoFirma key={lienzo} deshabilitado={ocupado || !revisado || faltanControles > 0} alCambiar={setDibujo} />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Label htmlFor="clave-serie" className="flex items-center gap-1.5 text-sm">
              <KeyRound className="size-4 text-primary" /> Clave de firma
            </Label>
            <CampoClave
              id="clave-serie"
              etiqueta="Clave de firma"
              valor={clave}
              alCambiar={setClave}
              deshabilitado={ocupado || !revisado || faltanControles > 0}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t bg-muted/30 px-5 py-4 sm:flex-row sm:items-center">
        <p className="flex-1 text-sm text-muted-foreground">
          {falta ?? (destino ? `Listo. Al firmar, el expediente va a ${siguiente?.area} y seguís con el próximo.` : "Listo para firmar.")}
        </p>
        <Button size="lg" onClick={firmar} disabled={!listo} className="sm:min-w-56">
          {ocupado ? <Loader2 className="animate-spin" /> : <Stamp />}
          {estado === "firmando" ? "Firmando…" : estado === "pasando" ? "Pasando…" : destino ? `Firmar y ${destino}` : "Firmar"}
        </Button>
      </div>
    </section>
  )
}
