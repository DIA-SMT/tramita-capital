"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Paperclip } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SelectorArchivo } from "@/components/expediente/selector-archivo"
import { subirDocumentos } from "@/components/expediente/subir-documentos"
import type { Requisito } from "@/lib/dominio"

/** Permite sumar documentación mientras el trámite está en curso (p. ej. el certificado de examen rendido). */
export function AdjuntarDocumentacion({ expedienteId, requisitos }: { expedienteId: string; requisitos: Requisito[] }) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [requisito, setRequisito] = useState(requisitos[0]?.clave ?? "otro")
  const [archivo, setArchivo] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (!abierto) {
    return (
      <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => setAbierto(true)}>
        <Paperclip /> Agregar documentación
      </Button>
    )
  }

  async function enviar() {
    if (!archivo) return
    setEnviando(true)
    try {
      const r = requisitos.find((x) => x.clave === requisito)
      await subirDocumentos(expedienteId, [
        { file: archivo, requisito_clave: r?.clave, etiqueta: r?.nombre ?? "Documentación adicional" },
      ])
      toast.success("Documento agregado al expediente")
      setArchivo(null)
      setAbierto(false)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo adjuntar")
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="mt-3 space-y-3 rounded-xl bg-muted/50 p-3">
      <Select value={requisito} onValueChange={setRequisito}>
        <SelectTrigger className="w-full bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {requisitos.map((r) => (
            <SelectItem key={r.clave} value={r.clave}>
              {r.nombre}
            </SelectItem>
          ))}
          <SelectItem value="otro">Otro documento</SelectItem>
        </SelectContent>
      </Select>
      <SelectorArchivo titulo="Archivo" archivo={archivo} alCambiar={(f) => setArchivo(f)} />
      <div className="flex gap-2">
        <Button size="sm" onClick={enviar} disabled={!archivo || enviando}>
          {enviando && <Loader2 className="animate-spin" />} Adjuntar
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setAbierto(false)} disabled={enviando}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
