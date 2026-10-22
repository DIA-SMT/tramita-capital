"use client"

import { useState } from "react"
import { Banknote, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { fechaCorta } from "@/lib/dominio"
import { MOVIMIENTOS, periodoLargo, textoNovedad, type Movimiento, type PropuestaNovedad } from "@/lib/novedades"

export type DatosNovedad = {
  movimiento: Movimiento
  desde: string
  hasta: string | null
  observaciones: string
  texto: string
  detalle: Record<string, string>
}

const PERIODO = /^\d{4}-(0[1-9]|1[0-2])$/

/**
 * Novedad a Liquidación: el sistema propone movimiento y período a partir de la resolución;
 * la persona los confirma y queda una foja firmada más la novedad para cargar en Civitas.
 */
export function DialogoNovedad({
  abierto,
  alCerrar,
  propuesta,
  pendiente,
  alConfirmar,
}: {
  abierto: boolean
  alCerrar: () => void
  propuesta: PropuestaNovedad
  pendiente: boolean
  alConfirmar: (datos: DatosNovedad) => void
}) {
  const [movimiento, setMovimiento] = useState<Movimiento>(propuesta.movimiento)
  const [desde, setDesde] = useState(propuesta.vigencia)
  const [hasta, setHasta] = useState("")
  const [observaciones, setObservaciones] = useState("")
  const [textoEditado, setTextoEditado] = useState<string | null>(null)

  const desdeValido = PERIODO.test(desde)
  const hastaValido = !hasta || (PERIODO.test(hasta) && hasta >= desde)
  // El texto sigue a los campos hasta que la persona lo edita a mano.
  const texto = textoEditado ?? (desdeValido ? textoNovedad(propuesta, movimiento, desde, hastaValido ? hasta || null : null, observaciones) : "")

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && !pendiente && alCerrar()}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Novedad a Liquidación de Haberes</DialogTitle>
          <DialogDescription>
            Queda como foja firmada por vos y como novedad pendiente de carga en Civitas. Liquidación la ve en Novedades de haberes.
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl border bg-muted/40 p-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Agente</dt>
            <dd className="font-medium">
              {propuesta.agente || "—"}
              {propuesta.legajo && <span className="text-muted-foreground"> · legajo {propuesta.legajo}</span>}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Resolución</dt>
            <dd className="font-medium">
              {propuesta.resolucion?.numero ? `N.º ${propuesta.resolucion.numero}` : "Firmada"}
              {propuesta.resolucion?.fecha && <span className="text-muted-foreground"> · {fechaCorta(propuesta.resolucion.fecha)}</span>}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs text-muted-foreground">Concepto</dt>
            <dd className="font-medium">{propuesta.concepto}</dd>
          </div>
        </dl>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <Label htmlFor="nov-movimiento">Movimiento</Label>
            <Select value={movimiento} onValueChange={(v) => setMovimiento(v as Movimiento)}>
              <SelectTrigger id="nov-movimiento" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(MOVIMIENTOS) as Movimiento[]).map((m) => (
                  <SelectItem key={m} value={m}>
                    {MOVIMIENTOS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="nov-desde">Rige desde</Label>
            <Input id="nov-desde" type="month" value={desde} onChange={(e) => setDesde(e.target.value)} aria-invalid={!desdeValido} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="nov-hasta">
              Hasta <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Input id="nov-hasta" type="month" value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)} aria-invalid={!hastaValido} />
          </div>
        </div>
        <p className="-mt-2 text-xs text-muted-foreground">
          {propuesta.vigenciaLeida
            ? `Período leído de la resolución: ${periodoLargo(propuesta.vigencia)}.`
            : "No encontramos el período en la resolución: propusimos el mes de la firma. Revisalo."}
        </p>

        {Object.keys(propuesta.detalle).length > 0 && (
          <div>
            <p className="mb-1.5 text-sm font-medium">Datos que viajan con la novedad</p>
            <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
              {Object.entries(propuesta.detalle).map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="truncate">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <div className="grid gap-1.5">
          <Label htmlFor="nov-obs">
            Observaciones para Liquidación <span className="font-normal text-muted-foreground">(opcional)</span>
          </Label>
          <Textarea id="nov-obs" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} maxLength={2000} rows={2} />
        </div>

        <div className="grid gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="nov-texto">Texto de la foja</Label>
            {textoEditado !== null && (
              <Button type="button" variant="ghost" size="xs" onClick={() => setTextoEditado(null)}>
                Volver al texto automático
              </Button>
            )}
          </div>
          <Textarea id="nov-texto" value={texto} onChange={(e) => setTextoEditado(e.target.value)} rows={7} maxLength={8000} className="text-[0.8rem]" />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={alCerrar} disabled={pendiente}>
            Cancelar
          </Button>
          <Button
            disabled={pendiente || !desdeValido || !hastaValido || texto.trim().length < 10}
            onClick={() => alConfirmar({ movimiento, desde, hasta: hasta || null, observaciones, texto, detalle: propuesta.detalle })}
          >
            {pendiente ? <Loader2 className="animate-spin" /> : <Banknote />} Firmar y enviar a Liquidación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
