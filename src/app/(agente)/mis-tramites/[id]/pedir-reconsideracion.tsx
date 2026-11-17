"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Scale } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SelectorArchivo } from "@/components/expediente/selector-archivo"
import { subirDocumentos } from "@/components/expediente/subir-documentos"
import { fechaDia, type PlazoReconsideracion } from "@/lib/reconsideracion"
import { pedirReconsideracion } from "../acciones"

/**
 * El/la agente pide la reconsideración de lo resuelto, dentro del plazo (migración 001700). Se crea un expediente
 * nuevo, vinculado, con los fundamentos y la documentación nueva, si hay.
 */
export function PedirReconsideracion({
  expedienteId,
  plazo,
  base = "",
  demo = false,
}: {
  expedienteId: string
  plazo: PlazoReconsideracion
  base?: string
  demo?: boolean
}) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [fundamentos, setFundamentos] = useState("")
  const [archivo, setArchivo] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (plazo.recurso) return null
  if (!plazo.vigente) {
    return (
      <p className="rounded-2xl border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
        El plazo para pedir la reconsideración venció el {fechaDia(plazo.ultimoDia)} (8 días hábiles desde la notificación).
      </p>
    )
  }

  async function enviar() {
    if (!fundamentos.trim()) return void toast.error("Contá por qué no estás de acuerdo con lo resuelto")
    setEnviando(true)
    try {
      if (demo) {
        await new Promise((r) => setTimeout(r, 600))
        toast.success("Vista previa: pedido de reconsideración enviado")
        setAbierto(false)
        return
      }
      const r = await pedirReconsideracion(expedienteId, fundamentos)
      if (!r.ok) return void toast.error(r.error)
      if (archivo) {
        try {
          await subirDocumentos(r.id, [{ file: archivo, requisito_clave: "documentacion_nueva", etiqueta: "Documentación nueva" }])
        } catch {
          toast.error("El pedido se envió, pero no se pudo subir el archivo: agregalo desde el trámite nuevo")
        }
      }
      toast.success(`Pediste la reconsideración: expediente ${r.numero}`)
      router.push(`${base}/mis-tramites/${r.id}?nuevo=1`)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className="rounded-2xl border bg-card p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Scale className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-medium">¿No estás de acuerdo con lo resuelto?</h2>
          <p className="text-xs text-muted-foreground">
            Podés pedir la reconsideración hasta el {fechaDia(plazo.ultimoDia)}: son 8 días hábiles desde que se firmó la resolución. La analiza Asesoría
            Legal y la resuelve la Dirección de Capital Humano.
          </p>
        </div>
        <Button variant="outline" onClick={() => setAbierto(true)} className="shrink-0">
          Pedir reconsideración
        </Button>
      </div>

      <Dialog open={abierto} onOpenChange={(o) => !enviando && setAbierto(o)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Pedir reconsideración</DialogTitle>
            <DialogDescription>
              Se abre un expediente nuevo, vinculado a este, con tus fundamentos. Asesoría Legal revisa lo resuelto y lo que nos digas; la Dirección
              firma la resolución del pedido y te avisamos.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="fundamentos">Por qué no estás de acuerdo</Label>
              <Textarea
                id="fundamentos"
                value={fundamentos}
                onChange={(e) => setFundamentos(e.target.value)}
                maxLength={4000}
                rows={6}
                placeholder="Contá qué no se tuvo en cuenta o qué está mal en la resolución"
              />
            </div>
            <SelectorArchivo
              titulo="Documentación nueva"
              descripcion="Solo si tenés algo que no presentaste antes"
              archivo={archivo}
              alCambiar={(f, error) => {
                if (error) toast.error(error)
                setArchivo(f)
              }}
            />
          </div>
          <DialogFooter>
            <Button onClick={enviar} disabled={enviando || !fundamentos.trim()}>
              {enviando && <Loader2 className="animate-spin" />} Enviar el pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
