"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AlertTriangle, Loader2, PenLine, Save, Sparkles, Square, Stamp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Markdown } from "@/components/markdown"
import type { Firmante } from "@/components/expediente/dialogo-firma"
import { cn } from "@/lib/utils"
import { firmarActuacion, guardarBorrador } from "./acciones"

export type TipoDocumento = "dictamen" | "resolucion" | "providencia" | "informe" | "nota"

export const ETIQUETAS_DOCUMENTO: Record<TipoDocumento, string> = {
  dictamen: "Dictamen",
  resolucion: "Resolución",
  providencia: "Providencia",
  informe: "Informe",
  nota: "Nota",
}

export type Sentido = "hace_lugar" | "rechaza"
export type BorradorInicial = { id: string; tipo: TipoDocumento; titulo: string; contenido: string; sentido?: Sentido }

const MARCADOR = /\[COMPLETAR[^\]]*\]/g

const ESPERA = [
  "Leyendo las fojas del expediente…",
  "Revisando la documentación presentada…",
  "Aplicando el modelo y los criterios del área…",
  "Verificando datos y normativa…",
  "Empezando a redactar…",
]

const BORRADOR_DEMO = `RESOLUCIÓN N.º [COMPLETAR: número de resolución]
San Miguel de Tucumán, 05/10/2026

**VISTO:**
El Expediente N.º CH-2026-000002, por el cual la agente Ana Paz, Legajo N.º 10234, solicita licencia por examen; y

**CONSIDERANDO:**
Que la agente acredita su inscripción para rendir la materia Derecho Administrativo de la carrera de Abogacía, en la Universidad Nacional de Tucumán, con fecha 09/10/2026;
Que la Sección Licencias informa que la agente cuenta con días disponibles en el período en curso;
Que corresponde hacer lugar a lo solicitado conforme [COMPLETAR: artículo del régimen de licencias];

Por ello,

**LA DIRECCIÓN DE CAPITAL HUMANO**
**RESUELVE:**

**ARTÍCULO 1º.-** CONCEDER a la agente Ana Paz, Legajo N.º 10234, licencia por examen por el término de tres (3) días a partir del 07/10/2026.

**ARTÍCULO 2º.-** La agente deberá presentar el certificado de examen rendido dentro de los cinco (5) días hábiles posteriores.

**ARTÍCULO 3º.-** Comuníquese, notifíquese y archívese.`

/** Resalta los marcadores [COMPLETAR] en la vista previa. */
function resaltar(texto: string) {
  return texto.replace(MARCADOR, (m) => `**⚠ ${m}**`)
}

/**
 * Editor de actuaciones con redacción asistida por IA (streaming).
 * Humano en el centro: la IA propone, la persona edita, revisa y decide si firma.
 */
export function Redactor({
  abierto,
  alCerrar,
  expedienteId,
  tipoInicial,
  nombreTramite,
  puedeFirmar,
  iaDisponible,
  inicial,
  tituloSugerido,
  alFirmarConDialogo,
  textoSugerido,
  firmante,
  demo = false,
}: {
  abierto: boolean
  alCerrar: () => void
  expedienteId: string
  tipoInicial: TipoDocumento
  nombreTramite: string
  puedeFirmar: (tipo: TipoDocumento) => boolean
  iaDisponible: boolean
  inicial?: BorradorInicial | null
  tituloSugerido?: string
  /** Las resoluciones se firman en el diálogo de firma (firma ológrafa dibujada y clave). */
  alFirmarConDialogo?: (b: { id: string; tipo: TipoDocumento; titulo: string; contenido: string; generada_por_ia: boolean; sentido?: Sentido }) => void
  textoSugerido?: string
  firmante: Firmante
  demo?: boolean
}) {
  const router = useRouter()
  const [tipo, setTipo] = useState<TipoDocumento>(inicial?.tipo ?? tipoInicial)
  const [titulo, setTitulo] = useState(inicial?.titulo ?? `${tituloSugerido ?? ETIQUETAS_DOCUMENTO[tipoInicial]}: ${nombreTramite}`)
  const [sentido, setSentido] = useState<Sentido>(inicial?.sentido ?? "hace_lugar")
  const conSentido = tipo === "resolucion" || tipo === "dictamen"
  const [texto, setTexto] = useState(inicial?.contenido ?? textoSugerido ?? "")
  const [indicaciones, setIndicaciones] = useState("")
  const [generando, setGenerando] = useState(false)
  const [generacionId, setGeneracionId] = useState<string | null>(null)
  const [guardando, setGuardando] = useState<"borrador" | "firma" | null>(null)
  const [revisado, setRevisado] = useState(false)
  const [pestana, setPestana] = useState("editar")
  const cancelador = useRef<AbortController | null>(null)
  const [etapaEspera, setEtapaEspera] = useState(0)

  // La IA piensa unos segundos antes de escribir: mostramos qué está haciendo.
  useEffect(() => {
    if (!generando || texto) return
    const t = setInterval(() => setEtapaEspera((e) => Math.min(e + 1, ESPERA.length - 1)), 2800)
    return () => {
      clearInterval(t)
      setEtapaEspera(0)
    }
  }, [generando, texto])
  const editor = useRef<HTMLTextAreaElement>(null)

  const pendientes = useMemo(() => [...texto.matchAll(MARCADOR)].map((m) => ({ texto: m[0], indice: m.index ?? 0 })), [texto])
  const firmable = puedeFirmar(tipo)

  function irAMarcador(indice: number, largo: number) {
    setPestana("editar")
    requestAnimationFrame(() => {
      const t = editor.current
      if (!t) return
      t.focus()
      t.setSelectionRange(indice, indice + largo)
      const linea = texto.slice(0, indice).split("\n").length
      t.scrollTop = Math.max(0, (linea - 3) * 22)
    })
  }

  async function generar() {
    if (tipo === "nota") return
    setGenerando(true)
    setRevisado(false)
    setTexto("")
    setPestana("vista")
    try {
      if (demo) {
        await new Promise((r) => setTimeout(r, 6000)) // la IA real piensa ~10 s antes de escribir
        for (const trozo of BORRADOR_DEMO.match(/[\s\S]{1,6}/g) ?? []) {
          await new Promise((r) => setTimeout(r, 12))
          setTexto((t) => t + trozo)
        }
        setGeneracionId("demo")
      } else {
        cancelador.current = new AbortController()
        const r = await fetch("/api/ia/redactar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expedienteId,
            tipo,
            indicaciones:
              [conSentido ? (sentido === "rechaza" ? "Sentido: NO hacer lugar a lo solicitado." : "Sentido: hacer lugar a lo solicitado.") : "", indicaciones]
                .filter(Boolean)
                .join(" ") || undefined,
          }),
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
      }
      toast.success("Borrador listo para revisar", { description: "Leelo, completá lo marcado y recién después firmalo." })
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
    // Las resoluciones se firman en el diálogo: firma ológrafa dibujada y clave.
    const conDialogo = firmar && Boolean(alFirmarConDialogo) && tipo === "resolucion"
    if (demo && conDialogo) {
      setGuardando(null)
      alCerrar()
      alFirmarConDialogo?.({ id: inicial?.id ?? "demo", tipo, titulo, contenido: texto, generada_por_ia: Boolean(generacionId), sentido })
      return
    }
    if (demo) {
      await new Promise((r) => setTimeout(r, 600))
      toast.success(firmar ? `Vista previa: ${ETIQUETAS_DOCUMENTO[tipo].toLowerCase()} firmada y foliada` : "Vista previa: borrador guardado")
      setGuardando(null)
      alCerrar()
      return
    }
    const r = await guardarBorrador({
      id: inicial?.id,
      expedienteId,
      tipo,
      titulo,
      contenido: texto,
      iaGeneracionId: inicial ? undefined : generacionId,
      sentido: conSentido ? sentido : undefined,
    })
    if (!r.ok || !r.id) {
      setGuardando(null)
      toast.error(r.ok ? "No se pudo guardar" : r.error)
      return
    }
    if (conDialogo) {
      // Se guardó el borrador: la firma (con su clave, si corresponde) se hace en el diálogo.
      setGuardando(null)
      router.refresh()
      alCerrar()
      alFirmarConDialogo?.({ id: r.id, tipo, titulo, contenido: texto, generada_por_ia: Boolean(inicial ? false : generacionId), sentido })
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
      toast.success(`${ETIQUETAS_DOCUMENTO[tipo]} firmada e incorporada al expediente`)
    } else {
      toast.success("Borrador guardado", { description: "Lo ves en “Borradores en preparación”." })
    }
    setGuardando(null)
    router.refresh()
    alCerrar()
  }

  const vistaPrevia = (
    <div className="h-full min-h-72 overflow-y-auto rounded-xl border bg-card p-5">
      {texto ? (
        <Markdown oficial={tipo === "dictamen" || tipo === "resolucion"}>{resaltar(texto) + (generando ? " ▍" : "")}</Markdown>
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          {generando && <Loader2 className="size-4 animate-spin" />}
          {generando ? ESPERA[etapaEspera] : "La vista previa aparece acá."}
        </p>
      )}
    </div>
  )

  const areaEdicion = (
    <Textarea
      ref={editor}
      value={texto}
      onChange={(e) => {
        setTexto(e.target.value)
        setRevisado(false)
      }}
      disabled={generando}
      className="h-full min-h-72 resize-none font-mono text-[0.82rem] leading-relaxed"
      placeholder="Escribí el documento o pedile un borrador a la IA. Admite Markdown (**negrita**, listas)."
    />
  )

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && !generando && !guardando && alCerrar()}>
      <DialogContent className="flex max-h-[94svh] flex-col gap-0 p-0 sm:max-w-[min(72rem,calc(100%-2rem))]">
        <DialogHeader className="border-b p-5">
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="size-4 text-primary" /> {inicial ? "Editar borrador" : "Nueva actuación"}
          </DialogTitle>
          <DialogDescription>La IA usa los datos del expediente y los modelos del área. Vos revisás, corregís y decidís.</DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden md:grid-cols-[17rem_1fr]">
          <div className="space-y-4 overflow-y-auto border-b p-5 md:border-r md:border-b-0">
            <div className="grid gap-2">
              <Label>Tipo de documento</Label>
              <Select
                value={tipo}
                onValueChange={(v) => {
                  setTipo(v as TipoDocumento)
                  if (!inicial) setTitulo(`${ETIQUETAS_DOCUMENTO[v as TipoDocumento]}: ${nombreTramite}`)
                }}
                disabled={generando}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ETIQUETAS_DOCUMENTO) as TipoDocumento[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {ETIQUETAS_DOCUMENTO[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {conSentido && (
              <div className="grid gap-2">
                <Label>Sentido</Label>
                <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1" role="radiogroup" aria-label="Sentido">
                  {([
                    ["hace_lugar", "Hace lugar"],
                    ["rechaza", "No hace lugar"],
                  ] as const).map(([v, e]) => (
                    <button
                      key={v}
                      type="button"
                      role="radio"
                      aria-checked={sentido === v}
                      disabled={generando}
                      onClick={() => setSentido(v)}
                      className={cn(
                        "rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors",
                        sentido === v && (v === "rechaza" ? "bg-background text-rose-700 shadow-sm dark:text-rose-300" : "bg-background text-foreground shadow-sm"),
                      )}
                    >
                      {e}
                    </button>
                  ))}
                </div>
                {tipo === "resolucion" && (
                  <p className="text-xs text-muted-foreground">El número y la fecha se asignan solos al firmar (protocolización automática).</p>
                )}
              </div>
            )}
            {tipo !== "nota" && (
              <div className="grid gap-2">
                <Label htmlFor="indicaciones">Indicaciones para la IA</Label>
                <Textarea
                  id="indicaciones"
                  value={indicaciones}
                  onChange={(e) => setIndicaciones(e.target.value)}
                  placeholder="Ej.: conceder 3 días desde el 07/10; el certificado se presenta después."
                  rows={4}
                  disabled={generando}
                />
                {generando ? (
                  <Button variant="outline" onClick={() => cancelador.current?.abort()} disabled={demo}>
                    <Square /> Detener
                  </Button>
                ) : (
                  <Button
                    onClick={generar}
                    disabled={!iaDisponible && !demo}
                    className="bg-gradient-to-r from-marca-1 to-marca-2 text-white hover:opacity-90"
                  >
                    <Sparkles /> {texto ? "Volver a generar" : "Redactar con IA"}
                  </Button>
                )}
                {!iaDisponible && !demo && <p className="text-xs text-muted-foreground">La IA no está configurada en este entorno.</p>}
              </div>
            )}

            {pendientes.length > 0 && !generando && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                <p className="flex items-center gap-1.5 text-xs font-medium text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="size-3.5" /> {pendientes.length} {pendientes.length === 1 ? "dato por completar" : "datos por completar"}
                </p>
                <ul className="mt-2 space-y-1">
                  {pendientes.map((p) => (
                    <li key={p.indice}>
                      <button
                        type="button"
                        onClick={() => irAMarcador(p.indice, p.texto.length)}
                        className="w-full truncate rounded-md px-1.5 py-1 text-left text-xs text-amber-900 hover:bg-amber-500/10 dark:text-amber-200"
                        title={p.texto}
                      >
                        {p.texto.replace(/^\[COMPLETAR:?\s*/, "").replace(/\]$/, "") || "Dato faltante"}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex min-h-0 flex-col p-5">
            <div className="mb-3 grid gap-2">
              <Label htmlFor="titulo">Título</Label>
              <Input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} disabled={generando} />
            </div>
            {/* Pantallas anchas: edición y vista previa lado a lado */}
            <div className="hidden min-h-0 flex-1 gap-4 xl:grid xl:grid-cols-2">
              {areaEdicion}
              {vistaPrevia}
            </div>
            <Tabs value={pestana} onValueChange={setPestana} className="flex min-h-0 flex-1 flex-col xl:hidden">
              <TabsList>
                <TabsTrigger value="editar" disabled={generando}>
                  Editar
                </TabsTrigger>
                <TabsTrigger value="vista">Vista previa</TabsTrigger>
              </TabsList>
              <TabsContent value="editar" className="mt-3 min-h-0 flex-1">
                {areaEdicion}
              </TabsContent>
              <TabsContent value="vista" className="mt-3 min-h-0 flex-1">
                {vistaPrevia}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <DialogFooter className="flex-col gap-3 border-t p-4 sm:flex-row sm:items-center">
          {firmable && texto.trim() && !generando ? (
            <div className={cn("flex items-start gap-2 sm:mr-auto", pendientes.length > 0 && "opacity-50")}>
              <Checkbox
                id="revision"
                checked={revisado}
                disabled={pendientes.length > 0}
                onCheckedChange={(v) => setRevisado(v === true)}
                className="mt-0.5"
              />
              <Label htmlFor="revision" className="text-xs leading-snug font-normal">
                {pendientes.length > 0
                  ? "Completá los datos marcados para poder firmar."
                  : `Revisé el documento y lo firmo como ${firmante.nombre} (${firmante.rol.toLowerCase()}, ${firmante.area}).`}
              </Label>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground sm:mr-auto">Al firmar, la actuación queda foliada e inmutable.</p>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => guardar(false)} disabled={!texto.trim() || generando || guardando !== null}>
              {guardando === "borrador" ? <Loader2 className="animate-spin" /> : <Save />} Guardar borrador
            </Button>
            {firmable && (
              <Button onClick={() => guardar(true)} disabled={!texto.trim() || generando || guardando !== null || !revisado || pendientes.length > 0}>
                {guardando === "firma" ? <Loader2 className="animate-spin" /> : <Stamp />} Firmar e incorporar
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
