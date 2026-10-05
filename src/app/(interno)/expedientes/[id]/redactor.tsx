"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, PenLine, Save, Sparkles, Square, Stamp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Markdown } from "@/components/markdown"
import { firmarActuacion, guardarBorrador } from "./acciones"

export type TipoDocumento = "dictamen" | "resolucion" | "providencia" | "informe" | "nota"

const ETIQUETAS: Record<TipoDocumento, string> = {
  dictamen: "Dictamen",
  resolucion: "Resolución",
  providencia: "Providencia",
  informe: "Informe",
  nota: "Nota",
}

export type BorradorInicial = { id: string; tipo: TipoDocumento; titulo: string; contenido: string }

/**
 * Editor de actuaciones con redacción asistida por IA (streaming).
 * Humano en el centro: la IA propone, la persona edita y decide si firma.
 */
export function Redactor({
  abierto,
  alCerrar,
  expedienteId,
  tipoSugerido,
  nombreTramite,
  puedeFirmar,
  iaDisponible,
  inicial,
}: {
  abierto: boolean
  alCerrar: () => void
  expedienteId: string
  tipoSugerido: TipoDocumento
  nombreTramite: string
  puedeFirmar: (tipo: TipoDocumento) => boolean
  iaDisponible: boolean
  inicial?: BorradorInicial | null
}) {
  const router = useRouter()
  const [tipo, setTipo] = useState<TipoDocumento>(inicial?.tipo ?? tipoSugerido)
  const [titulo, setTitulo] = useState(inicial?.titulo ?? `${ETIQUETAS[tipoSugerido]}: ${nombreTramite}`)
  const [texto, setTexto] = useState(inicial?.contenido ?? "")
  const [indicaciones, setIndicaciones] = useState("")
  const [generando, setGenerando] = useState(false)
  const [generacionId, setGeneracionId] = useState<string | null>(null)
  const [guardando, setGuardando] = useState<"borrador" | "firma" | null>(null)
  const [pestana, setPestana] = useState("editar")
  const cancelador = useRef<AbortController | null>(null)

  async function generar() {
    if (tipo === "nota") return
    setGenerando(true)
    setTexto("")
    setPestana("vista")
    cancelador.current = new AbortController()
    try {
      const r = await fetch("/api/ia/redactar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expedienteId, tipo, indicaciones: indicaciones || undefined }),
        signal: cancelador.current.signal,
      })
      if (!r.ok || !r.body) {
        const e = await r.json().catch(() => ({ error: "No se pudo generar el borrador" }))
        throw new Error(e.error)
      }
      setGeneracionId(r.headers.get("X-Generacion-Id"))
      const lector = r.body.getReader()
      const decodificador = new TextDecoder()
      for (;;) {
        const { done, value } = await lector.read()
        if (done) break
        setTexto((t) => t + decodificador.decode(value, { stream: true }))
      }
      toast.success("Borrador listo para revisar", { description: "Leelo, corregilo y recién después firmalo." })
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        toast.error(e instanceof Error ? e.message : "Error al generar")
      }
    } finally {
      setGenerando(false)
      setPestana("editar")
    }
  }

  async function guardar(firmar: boolean) {
    setGuardando(firmar ? "firma" : "borrador")
    const r = await guardarBorrador({
      id: inicial?.id,
      expedienteId,
      tipo,
      titulo,
      contenido: texto,
      iaGeneracionId: inicial ? undefined : generacionId,
    })
    if (!r.ok || !r.id) {
      setGuardando(null)
      toast.error(r.ok ? "No se pudo guardar" : r.error)
      return
    }
    if (firmar) {
      const f = await firmarActuacion(r.id)
      if (!f.ok) {
        setGuardando(null)
        toast.error(`Se guardó como borrador, pero no se pudo firmar: ${f.error}`)
        router.refresh()
        alCerrar()
        return
      }
      toast.success(`${ETIQUETAS[tipo]} firmada e incorporada al expediente`)
    } else {
      toast.success("Borrador guardado")
    }
    setGuardando(null)
    router.refresh()
    alCerrar()
  }

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && !generando && alCerrar()}>
      <DialogContent className="flex max-h-[92svh] flex-col gap-0 p-0 sm:max-w-4xl">
        <DialogHeader className="border-b p-5">
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="size-4 text-primary" /> {inicial ? "Editar borrador" : "Nueva actuación"}
          </DialogTitle>
          <DialogDescription>
            La IA prepara un borrador con los datos del expediente y los modelos del área. Vos lo revisás y decidís.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-0 overflow-hidden md:grid-cols-[16rem_1fr]">
          <div className="space-y-4 overflow-y-auto border-b p-5 md:border-r md:border-b-0">
            <div className="grid gap-2">
              <Label>Tipo de documento</Label>
              <Select
                value={tipo}
                onValueChange={(v) => {
                  setTipo(v as TipoDocumento)
                  if (!inicial) setTitulo(`${ETIQUETAS[v as TipoDocumento]}: ${nombreTramite}`)
                }}
                disabled={generando}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ETIQUETAS) as TipoDocumento[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {ETIQUETAS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {tipo !== "nota" && (
              <div className="grid gap-2">
                <Label htmlFor="indicaciones">Indicaciones para la IA</Label>
                <Textarea
                  id="indicaciones"
                  value={indicaciones}
                  onChange={(e) => setIndicaciones(e.target.value)}
                  placeholder="Ej.: conceder 2 días a partir del 09/10; mencionar que el certificado se presenta después."
                  rows={5}
                  disabled={generando}
                />
                {generando ? (
                  <Button variant="outline" onClick={() => cancelador.current?.abort()}>
                    <Square /> Detener
                  </Button>
                ) : (
                  <Button onClick={generar} disabled={!iaDisponible} className="bg-gradient-to-r from-marca-1 to-marca-2 text-white hover:opacity-90">
                    <Sparkles /> {texto ? "Volver a generar" : "Redactar con IA"}
                  </Button>
                )}
                {!iaDisponible && <p className="text-xs text-muted-foreground">La IA no está configurada en este entorno.</p>}
              </div>
            )}
          </div>

          <div className="flex min-h-0 flex-col p-5">
            <div className="mb-3 grid gap-2">
              <Label htmlFor="titulo">Título</Label>
              <Input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} disabled={generando} />
            </div>
            <Tabs value={pestana} onValueChange={setPestana} className="flex min-h-0 flex-1 flex-col">
              <TabsList>
                <TabsTrigger value="editar" disabled={generando}>
                  Editar
                </TabsTrigger>
                <TabsTrigger value="vista">Vista previa</TabsTrigger>
              </TabsList>
              <TabsContent value="editar" className="mt-3 min-h-0 flex-1">
                <Textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  className="h-full min-h-72 resize-none font-mono text-[0.82rem] leading-relaxed"
                  placeholder="Escribí el documento o pedile un borrador a la IA. Admite Markdown (**negrita**, listas)."
                />
              </TabsContent>
              <TabsContent value="vista" className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-xl border bg-card p-5">
                {texto ? (
                  <Markdown>{texto + (generando ? " ▍" : "")}</Markdown>
                ) : (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    {generando && <Loader2 className="size-4 animate-spin" />}
                    {generando ? "Analizando el expediente y los modelos del área…" : "Sin contenido todavía."}
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <DialogFooter className="border-t p-4">
          <p className="mr-auto hidden text-xs text-muted-foreground sm:block">
            {texto.includes("[COMPLETAR") ? "⚠ Hay datos marcados [COMPLETAR] para revisar antes de firmar." : "Al firmar, la actuación queda foliada e inmutable."}
          </p>
          <Button variant="outline" onClick={() => guardar(false)} disabled={!texto.trim() || generando || guardando !== null}>
            {guardando === "borrador" ? <Loader2 className="animate-spin" /> : <Save />} Guardar borrador
          </Button>
          {puedeFirmar(tipo) && (
            <Button onClick={() => guardar(true)} disabled={!texto.trim() || generando || guardando !== null || texto.includes("[COMPLETAR")}>
              {guardando === "firma" ? <Loader2 className="animate-spin" /> : <Stamp />} Firmar e incorporar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
