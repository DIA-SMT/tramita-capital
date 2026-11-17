"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Database, Loader2, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { liquidaVigente } from "@/lib/certificado"
import { fechaCorta } from "@/lib/dominio"
import type { FichaAgente } from "@/lib/vistas"
import { cn } from "@/lib/utils"
import { actualizarDatosCivitas } from "./acciones"

type Civitas = NonNullable<FichaAgente["perfil"]>["civitas"]
type Liquida = "si" | "no" | "sin_dato"

const fecha = (iso: string | null) => (iso ? fechaCorta(`${iso}T12:00:00`) : null)

/**
 * Datos de Civitas del agente (migración 001900), hasta que haya importación o API: «Liquida SÍ», fecha de ingreso y
 * situación de revista. Con «Liquida SÍ» de menos de un mes, su certificado de trabajo sale al pedirlo.
 */
export function DatosCivitas({ perfilId, civitas, edita, demo = false }: { perfilId: string; civitas: Civitas; edita: boolean; demo?: boolean }) {
  const router = useRouter()
  const [datos, setDatos] = useState(civitas)
  const [editando, setEditando] = useState(false)
  const [liquida, setLiquida] = useState<Liquida>(civitas.liquida === true ? "si" : civitas.liquida === false ? "no" : "sin_dato")
  const [ingreso, setIngreso] = useState(civitas.fechaIngreso ?? "")
  const [situacion, setSituacion] = useState(civitas.situacionRevista ?? "")
  const [pendiente, iniciar] = useTransition()
  const vigente = liquidaVigente(datos.liquida, datos.liquidaAl)
  const hoy = new Date().toISOString().slice(0, 10)

  function guardar() {
    iniciar(async () => {
      const nuevo = {
        liquida: liquida === "si" ? true : liquida === "no" ? false : null,
        fechaIngreso: ingreso || null,
        situacionRevista: situacion.trim(),
      }
      if (!demo) {
        const r = await actualizarDatosCivitas({ perfilId, ...nuevo })
        if (!r.ok) return void toast.error(r.error)
        router.refresh()
      }
      setDatos({ liquida: nuevo.liquida, liquidaAl: nuevo.liquida === null ? null : hoy, fechaIngreso: nuevo.fechaIngreso, situacionRevista: nuevo.situacionRevista || null })
      toast.success(`${demo ? "Vista previa: d" : "D"}atos de Civitas guardados`)
      setEditando(false)
    })
  }

  return (
    <section aria-labelledby="ficha-civitas" className="rounded-2xl border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <h2 id="ficha-civitas" className="flex flex-1 items-center gap-2 text-sm font-medium text-muted-foreground">
          <Database className="size-4" /> Datos de Civitas
        </h2>
        {edita && !editando && (
          <Button size="sm" variant="ghost" onClick={() => setEditando(true)}>
            <Pencil /> Actualizar
          </Button>
        )}
      </div>
      {editando ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="civitas-liquida">«Liquida SÍ» y sin baja</Label>
              <Select value={liquida} onValueChange={(v) => setLiquida(v as Liquida)}>
                <SelectTrigger id="civitas-liquida" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="si">Sí</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="sin_dato">Sin dato</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="civitas-ingreso">Fecha de ingreso</Label>
              <Input id="civitas-ingreso" type="date" max={hoy} value={ingreso} onChange={(e) => setIngreso(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="civitas-revista">Situación de revista</Label>
              <Input id="civitas-revista" value={situacion} maxLength={120} placeholder="Ej.: planta permanente" onChange={(e) => setSituacion(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Copialos de Civitas: «Liquida SÍ» queda con la fecha de hoy y vale un mes para emitir sin control.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditando(false)} disabled={pendiente}>
              Cancelar
            </Button>
            <Button onClick={guardar} disabled={pendiente || (ingreso !== "" && ingreso > hoy)}>
              {pendiente && <Loader2 className="animate-spin" />} Guardar
            </Button>
          </div>
        </div>
      ) : (
        <dl className="grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">«Liquida SÍ» y sin baja</dt>
            <dd className="mt-0.5 font-medium">
              {datos.liquida === null ? "Sin dato" : datos.liquida ? "Sí" : "No"}
              {datos.liquidaAl && <span className="font-normal text-muted-foreground"> · al {fecha(datos.liquidaAl)}</span>}
            </dd>
            <dd className={cn("mt-1 text-xs", vigente ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground")}>
              {vigente ? "Su certificado de trabajo sale al pedirlo." : "Su certificado de trabajo pasa por Registro."}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Fecha de ingreso</dt>
            <dd className="mt-0.5 font-medium">{fecha(datos.fechaIngreso) ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Situación de revista</dt>
            <dd className="mt-0.5 font-medium">{datos.situacionRevista ?? "—"}</dd>
          </div>
        </dl>
      )}
    </section>
  )
}
