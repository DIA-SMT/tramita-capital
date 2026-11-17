"use client"

import { useState } from "react"
import { AlertTriangle, BadgeCheck, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { fechaCorta } from "@/lib/dominio"
import type { DatosCertificado } from "@/lib/certificado"

export type DatosEmision = { fechaIngreso: string | null; situacionRevista: string }

/**
 * Registro emite el certificado de trabajo después de controlar en Civitas (migración 001900). Lo firma el sistema
 * con la firma que autorizó la Dirección; lo que se complete acá queda en el perfil para los próximos pedidos.
 */
export function DialogoCertificado({
  abierto,
  alCerrar,
  datos,
  pendiente,
  alConfirmar,
}: {
  abierto: boolean
  alCerrar: () => void
  datos: DatosCertificado
  pendiente: boolean
  alConfirmar: (d: DatosEmision) => void
}) {
  const [fechaIngreso, setFechaIngreso] = useState(datos.fechaIngreso ?? "")
  const [situacion, setSituacion] = useState(datos.situacionRevista ?? "")
  const hoy = new Date().toISOString().slice(0, 10)
  const fechaValida = !fechaIngreso || (/^\d{4}-\d{2}-\d{2}$/.test(fechaIngreso) && fechaIngreso <= hoy)
  const { autorizacion } = datos

  const filas: [string, string | null][] = [
    ["Agente", datos.agente],
    ["Legajo", datos.legajo],
    ["CUIL", datos.cuil],
    ["Categoría", datos.categoria],
    ["Dependencia", datos.dependencia],
    ["Repartición", datos.reparticion],
    ["Para presentar ante", datos.presentarAnte || "quien corresponda"],
  ]

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && !pendiente && alCerrar()}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Emitir el certificado de trabajo</DialogTitle>
          <DialogDescription>
            {autorizacion.autorizada
              ? `Lo firma ${autorizacion.aclaracion} (${autorizacion.cargo}) con la firma autorizada para estos certificados. El trámite se cierra y el agente lo recibe con su copia oficial.`
              : "Lo firma el sistema con la firma que autoriza la Dirección para estos certificados."}
          </DialogDescription>
        </DialogHeader>

        {!autorizacion.autorizada && (
          <p className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-800 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            La Dirección todavía no autorizó la emisión automática (se hace en «Mi firma»). Hasta entonces no se puede emitir.
          </p>
        )}

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl border bg-muted/40 p-3 text-sm">
          {filas.map(([k, v]) => (
            <div key={k} className={k === "Agente" || k === "Para presentar ante" ? "col-span-2" : undefined}>
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="font-medium">{v || "—"}</dd>
            </div>
          ))}
        </dl>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="cert-ingreso">
              Fecha de ingreso <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Input id="cert-ingreso" type="date" max={hoy} value={fechaIngreso} onChange={(e) => setFechaIngreso(e.target.value)} aria-invalid={!fechaValida} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cert-revista">
              Situación de revista <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Input id="cert-revista" value={situacion} maxLength={120} placeholder="Ej.: planta permanente" onChange={(e) => setSituacion(e.target.value)} />
          </div>
        </div>
        <p className="-mt-2 text-xs text-muted-foreground">
          Copialos de Civitas. Quedan en el perfil del agente, junto con «Liquida SÍ» al día de hoy
          {datos.liquidaAl ? ` (el dato anterior era del ${fechaCorta(`${datos.liquidaAl}T12:00:00`)})` : ""}: el próximo certificado sale solo.
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={alCerrar} disabled={pendiente}>
            Cancelar
          </Button>
          <Button
            disabled={pendiente || !autorizacion.autorizada || !fechaValida}
            onClick={() => alConfirmar({ fechaIngreso: fechaIngreso || null, situacionRevista: situacion.trim() })}
          >
            {pendiente ? <Loader2 className="animate-spin" /> : <BadgeCheck />} Emitir certificado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
