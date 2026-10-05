"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  AlertTriangle,
  Archive,
  ArrowRight,
  Flag,
  Hand,
  Loader2,
  PenLine,
  ShieldCheck,
  Sparkles,
  Stamp,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Enum } from "@/lib/database.types"
import { haceCuanto, PRIORIDADES, TIPOS_ACTUACION } from "@/lib/dominio"
import { cn } from "@/lib/utils"
import {
  archivarExpediente,
  cambiarPrioridad,
  eliminarBorrador,
  firmarActuacion,
  observarExpediente,
  pasarExpediente,
  tomarExpediente,
  verificarIntegridad,
} from "./acciones"
import { Redactor, type BorradorInicial, type TipoDocumento } from "./redactor"

export type BorradorVista = {
  id: string
  tipo: TipoDocumento
  titulo: string
  contenido: string
  autor_id: string | null
  autor: string
  updated_at: string
  generada_por_ia: boolean
}

type Props = {
  expedienteId: string
  estado: Enum<"estado_expediente">
  prioridad: Enum<"prioridad_expediente">
  asignadoA: string | null
  usuarioId: string
  miRol: Enum<"rol_area"> | null
  esAdmin: boolean
  areaActual: string
  siguientePaso: { nombre: string; area: string } | null
  areas: { id: string; nombre: string }[]
  tipoSugerido: TipoDocumento
  nombreTramite: string
  iaDisponible: boolean
  borradores: BorradorVista[]
}

type Dialogo = null | "pasar" | "observar" | "archivar" | "prioridad"

export function PanelAcciones(p: Props) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [dialogo, setDialogo] = useState<Dialogo>(null)
  const [redactor, setRedactor] = useState<{ abierto: boolean; inicial: BorradorInicial | null }>({ abierto: false, inicial: null })
  const [texto, setTexto] = useState("")
  const [areaDestino, setAreaDestino] = useState<string>("siguiente")
  const [nuevaPrioridad, setNuevaPrioridad] = useState<Enum<"prioridad_expediente">>(p.prioridad)

  const puedeActuar = (p.miRol !== null || p.esAdmin) && !["archivado", "rechazado"].includes(p.estado)
  const puedeFirmar = (tipo: TipoDocumento) => {
    if (!puedeActuar) return false
    if (p.esAdmin) return true
    if (tipo === "resolucion") return p.miRol === "firmante" || p.miRol === "jefe"
    if (tipo === "dictamen") return p.miRol === "dictaminante" || p.miRol === "firmante" || p.miRol === "jefe"
    return true
  }

  function ejecutar(accion: () => Promise<{ ok: boolean; error?: string }>, exito: string) {
    iniciar(async () => {
      const r = await accion()
      if (!r.ok) {
        toast.error(r.error ?? "No se pudo completar la acción")
        return
      }
      toast.success(exito)
      setDialogo(null)
      setTexto("")
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border bg-card p-4">
        <h2 className="mb-3 text-sm font-medium">Acciones</h2>
        {!puedeActuar ? (
          <p className="rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">
            {["archivado", "rechazado"].includes(p.estado)
              ? "El expediente está cerrado."
              : `El expediente está en ${p.areaActual}. Solo esa área puede actuar; vos podés consultarlo.`}
          </p>
        ) : (
          <div className="grid gap-2">
            {p.asignadoA !== p.usuarioId && (
              <Button variant="outline" className="justify-start" disabled={pendiente} onClick={() => ejecutar(() => tomarExpediente(p.expedienteId), "Expediente asignado a vos")}>
                <Hand /> Tomar el expediente
              </Button>
            )}
            <Button
              className="justify-start bg-gradient-to-r from-marca-1 to-marca-2 text-white hover:opacity-90"
              onClick={() => setRedactor({ abierto: true, inicial: null })}
            >
              <Sparkles /> Redactar actuación con IA
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => setDialogo("pasar")}>
              <ArrowRight /> {p.siguientePaso ? `Pasar a ${p.siguientePaso.area}` : "Pasar a otra área"}
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => setDialogo("observar")}>
              <AlertTriangle /> Observar al agente
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="ghost" size="sm" className="justify-start" onClick={() => setDialogo("prioridad")}>
                <Flag /> Prioridad
              </Button>
              <Button variant="ghost" size="sm" className="justify-start text-muted-foreground" onClick={() => setDialogo("archivar")}>
                <Archive /> Archivar
              </Button>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full justify-start text-muted-foreground"
          disabled={pendiente}
          onClick={() =>
            iniciar(async () => {
              const r = await verificarIntegridad(p.expedienteId)
              if (!r.ok) return void toast.error(r.error)
              if (r.fallas.length === 0) toast.success(`Integridad verificada: ${r.fojas} fojas, cadena intacta`)
              else toast.error(`Atención: fallan las fojas ${r.fallas.join(", ")}`)
            })
          }
        >
          <ShieldCheck /> Verificar integridad de fojas
        </Button>
      </section>

      {p.borradores.length > 0 && (
        <section className="rounded-2xl border bg-card p-4">
          <h2 className="mb-3 text-sm font-medium">Borradores en preparación</h2>
          <ul className="space-y-2">
            {p.borradores.map((b) => (
              <li key={b.id} className="rounded-xl border bg-background p-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{b.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {TIPOS_ACTUACION[b.tipo]} · {b.autor} · {haceCuanto(b.updated_at)}
                      {b.generada_por_ia && " · con IA"}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {b.autor_id === p.usuarioId && (
                    <Button size="xs" variant="outline" onClick={() => setRedactor({ abierto: true, inicial: b })}>
                      <PenLine /> Editar
                    </Button>
                  )}
                  {puedeFirmar(b.tipo) && (
                    <Button
                      size="xs"
                      disabled={pendiente || b.contenido.includes("[COMPLETAR")}
                      onClick={() => ejecutar(() => firmarActuacion(b.id), `${TIPOS_ACTUACION[b.tipo]} firmada`)}
                    >
                      <Stamp /> Firmar
                    </Button>
                  )}
                  {b.autor_id === p.usuarioId && (
                    <Button size="xs" variant="ghost" disabled={pendiente} onClick={() => ejecutar(() => eliminarBorrador(b.id), "Borrador eliminado")}>
                      <Trash2 />
                    </Button>
                  )}
                </div>
                {b.contenido.includes("[COMPLETAR") && (
                  <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">Tiene datos [COMPLETAR] pendientes.</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {redactor.abierto && (
        <Redactor
          abierto
          alCerrar={() => setRedactor({ abierto: false, inicial: null })}
          expedienteId={p.expedienteId}
          tipoSugerido={p.tipoSugerido}
          nombreTramite={p.nombreTramite}
          puedeFirmar={puedeFirmar}
          iaDisponible={p.iaDisponible}
          inicial={redactor.inicial}
        />
      )}

      {/* Pase */}
      <Dialog open={dialogo === "pasar"} onOpenChange={(o) => !o && setDialogo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pasar el expediente</DialogTitle>
            <DialogDescription>El pase queda registrado como foja firmada. Reemplaza la hoja de ruta en papel.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Destino</Label>
              <Select value={areaDestino} onValueChange={setAreaDestino}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {p.siguientePaso && (
                    <SelectItem value="siguiente">
                      Siguiente paso: {p.siguientePaso.nombre} ({p.siguientePaso.area})
                    </SelectItem>
                  )}
                  {p.areas.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="motivo-pase">Providencia (opcional)</Label>
              <Textarea id="motivo-pase" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ej.: Requisitos completos. Pase a Licencias para su intervención." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={pendiente || (!p.siguientePaso && areaDestino === "siguiente")}
              onClick={() =>
                ejecutar(
                  () =>
                    pasarExpediente({
                      expedienteId: p.expedienteId,
                      haciaArea: areaDestino === "siguiente" ? null : areaDestino,
                      motivo: texto,
                    }),
                  "Expediente remitido",
                )
              }
            >
              {pendiente && <Loader2 className="animate-spin" />} Confirmar pase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Observación */}
      <Dialog open={dialogo === "observar"} onOpenChange={(o) => !o && setDialogo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Observar al agente</DialogTitle>
            <DialogDescription>Le avisamos al instante por email y por Migue. El expediente queda en espera de su respuesta.</DialogDescription>
          </DialogHeader>
          <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Explicá con claridad qué falta o qué tiene que corregir." rows={4} />
          <DialogFooter>
            <Button disabled={pendiente || !texto.trim()} onClick={() => ejecutar(() => observarExpediente(p.expedienteId, texto), "Observación enviada al agente")}>
              {pendiente && <Loader2 className="animate-spin" />} Enviar observación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archivo */}
      <Dialog open={dialogo === "archivar"} onOpenChange={(o) => !o && setDialogo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archivar el expediente</DialogTitle>
            <DialogDescription>Se agrega la foja de archivo y el expediente se cierra. Esta acción no se puede deshacer.</DialogDescription>
          </DialogHeader>
          <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Cumplido, archívese." rows={2} />
          <DialogFooter>
            <Button variant="destructive" disabled={pendiente} onClick={() => ejecutar(() => archivarExpediente(p.expedienteId, texto), "Expediente archivado")}>
              {pendiente && <Loader2 className="animate-spin" />} Archivar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Prioridad */}
      <Dialog open={dialogo === "prioridad"} onOpenChange={(o) => !o && setDialogo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar prioridad</DialogTitle>
            <DialogDescription>Ordena la bandeja de todas las áreas. Indicá el motivo para que quede registrado.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(PRIORIDADES) as Enum<"prioridad_expediente">[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setNuevaPrioridad(k)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                  nuevaPrioridad === k ? "border-primary bg-primary/10 font-medium text-primary" : "hover:bg-muted",
                )}
              >
                {PRIORIDADES[k].etiqueta}
              </button>
            ))}
          </div>
          <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Motivo del cambio" rows={2} />
          <DialogFooter>
            <Button disabled={pendiente} onClick={() => ejecutar(() => cambiarPrioridad(p.expedienteId, nuevaPrioridad, texto), "Prioridad actualizada")}>
              {pendiente && <Loader2 className="animate-spin" />} Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
