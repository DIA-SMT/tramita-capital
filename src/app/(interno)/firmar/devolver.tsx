"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Undo2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { pasarExpediente } from "../expedientes/[id]/acciones"

/** Área a la que se puede devolver el proyecto y el paso al que vuelve (la misma regla que pasar_expediente). */
export type OpcionDevolucion = { id: string; nombre: string; detalle: string }

const MOTIVOS = ["Corregir el período desde el que rige.", "Completar los datos marcados [COMPLETAR].", "Revisar el sentido: el dictamen aconseja lo contrario."]

/**
 * Devolver el proyecto sin firmar, desde «Para firmar»: el expediente vuelve al área elegida (la que hizo el proyecto,
 * salvo que se elija otra) con lo que hay que corregir como providencia del pase (migración 001500: un pase a un área
 * anterior vuelve al último paso de esa área). Después sigue con el próximo de la cola.
 */
export function DevolverProyecto({
  expedienteId,
  opciones,
  rutaTras,
  deshabilitado = false,
  demo = false,
}: {
  expedienteId: string
  /** La primera es la sugerida: el área del paso anterior a la firma. */
  opciones: OpcionDevolucion[]
  rutaTras: string
  deshabilitado?: boolean
  demo?: boolean
}) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [area, setArea] = useState(opciones[0]?.id ?? "")
  const [texto, setTexto] = useState("")
  const [pendiente, setPendiente] = useState(false)
  if (opciones.length === 0) return null
  const elegida = opciones.find((o) => o.id === area) ?? opciones[0]

  async function devolver() {
    setPendiente(true)
    if (demo) {
      await new Promise((r) => setTimeout(r, 500))
      toast.success(`Vista previa: devuelto a ${elegida.nombre}`, { description: "Le avisamos al área y seguís con el próximo." })
      router.push(rutaTras)
      return
    }
    const r = await pasarExpediente({ expedienteId, haciaArea: elegida.id, motivo: `Se devuelve sin firmar. ${texto.trim()}` })
    if (!r.ok) {
      toast.error(r.error ?? "No se pudo devolver el expediente")
      setPendiente(false)
      return
    }
    toast.success(`Devuelto a ${elegida.nombre}`, { description: "Le avisamos al área. Cuando lo corrija, vuelve a «Para firmar»." })
    router.push(rutaTras)
    router.refresh()
  }

  return (
    <>
      <Button variant="outline" size="lg" onClick={() => setAbierto(true)} disabled={deshabilitado}>
        <Undo2 /> Devolver
      </Button>
      <Dialog open={abierto} onOpenChange={(o) => !pendiente && setAbierto(o)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Devolver el proyecto sin firmar</DialogTitle>
            <DialogDescription>El expediente vuelve al área que elijas para que lo corrija. Lo que escribas queda como providencia del pase.</DialogDescription>
          </DialogHeader>

          {opciones.length > 1 && (
            <RadioGroup value={elegida.id} onValueChange={setArea} className="gap-2" aria-label="Área a la que vuelve">
              {opciones.map((o) => (
                <Label
                  key={o.id}
                  htmlFor={`devolver-${o.id}`}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 font-normal has-[[data-state=checked]]:border-primary/40 has-[[data-state=checked]]:bg-primary/[0.04]"
                >
                  <RadioGroupItem id={`devolver-${o.id}`} value={o.id} className="mt-0.5" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{o.nombre}</span>
                    <span className="block text-xs text-muted-foreground first-letter:uppercase">{o.detalle}</span>
                  </span>
                </Label>
              ))}
            </RadioGroup>
          )}
          {opciones.length === 1 && (
            <p className="rounded-xl border bg-muted/40 p-3 text-sm">
              Vuelve a <span className="font-medium">{elegida.nombre}</span>: {elegida.detalle}.
            </p>
          )}

          <div className="grid gap-2">
            <Label htmlFor="devolver-texto">Qué hay que corregir</Label>
            <Textarea id="devolver-texto" value={texto} onChange={(e) => setTexto(e.target.value)} rows={3} maxLength={1800} placeholder="Explicá qué hay que cambiar en el proyecto." />
            <div className="flex flex-wrap gap-1.5">
              {MOTIVOS.map((m) => (
                <button key={m} type="button" onClick={() => setTexto(m)} className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted">
                  {m}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAbierto(false)} disabled={pendiente}>
              Cancelar
            </Button>
            <Button onClick={devolver} disabled={pendiente || texto.trim().length < 10}>
              {pendiente ? <Loader2 className="animate-spin" /> : <Undo2 />} Devolver a {elegida.nombre}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
