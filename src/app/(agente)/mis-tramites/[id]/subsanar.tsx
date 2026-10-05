"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Reply } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { SelectorArchivo } from "@/components/expediente/selector-archivo"
import { subirDocumentos } from "@/components/expediente/subir-documentos"
import { subsanarTramite } from "../acciones"

export function Subsanar({ expedienteId }: { expedienteId: string }) {
  const router = useRouter()
  const [texto, setTexto] = useState("")
  const [archivo, setArchivo] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar() {
    if (!texto.trim() && !archivo) {
      toast.error("Escribí una respuesta o adjuntá el documento solicitado")
      return
    }
    setEnviando(true)
    try {
      if (archivo) await subirDocumentos(expedienteId, [{ file: archivo, etiqueta: "Subsanación" }])
      const r = await subsanarTramite(expedienteId, texto)
      if (!r.ok) throw new Error(r.error)
      toast.success("Respuesta enviada", { description: "El expediente volvió a Capital Humano." })
      setTexto("")
      setArchivo(null)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo enviar la respuesta")
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <Textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Contanos qué corregiste o agregá una aclaración…"
        rows={3}
        className="bg-background"
        disabled={enviando}
      />
      <SelectorArchivo titulo="Documento corregido" descripcion="PDF o foto, hasta 20 MB" archivo={archivo} alCambiar={(f) => setArchivo(f)} />
      <Button onClick={enviar} disabled={enviando}>
        {enviando ? <Loader2 className="animate-spin" /> : <Reply />} Enviar respuesta
      </Button>
    </div>
  )
}
