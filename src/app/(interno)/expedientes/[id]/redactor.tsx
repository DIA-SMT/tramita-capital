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
import { Markdown, MARCADOR_COMPLETAR } from "@/components/markdown"
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

const MARCADOR = MARCADOR_COMPLETAR

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

/**
 * Lleva el scroll del área de texto hasta un carácter. Mide con una copia invisible del texto,
 * así respeta los renglones largos que se parten en varias líneas.
 */
function desplazarHasta(t: HTMLTextAreaElement, indice: number) {
  const estilo = getComputedStyle(t)
  const espejo = document.createElement("div")
  for (const p of ["font-family", "font-size", "font-weight", "line-height", "letter-spacing", "padding-top", "padding-right", "padding-bottom", "padding-left", "border-top-width", "border-right-width", "border-bottom-width", "border-left-width", "box-sizing", "tab-size"]) {
    espejo.style.setProperty(p, estilo.getPropertyValue(p))
  }
  Object.assign(espejo.style, { position: "absolute", top: "0", left: "-9999px", visibility: "hidden", whiteSpace: "pre-wrap", overflowWrap: "break-word", width: `${t.offsetWidth}px` })
  espejo.textContent = t.value.slice(0, indice)
  const marca = document.createElement("span")
  marca.textContent = "​"
  espejo.appendChild(marca)
  document.body.appendChild(espejo)
  const y = marca.offsetTop
  espejo.remove()
  t.scrollTop = Math.max(0, y - t.clientHeight / 3)
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
  // El editor se dibuja dos veces (lado a lado en pantallas anchas, en pestañas en las angostas): se usa el visible.
  const editores = useRef<(HTMLTextAreaElement | null)[]>([])
  const editorVisible = () => editores.current.find((t) => t && t.offsetParent !== null) ?? null

  const pendientes = useMemo(() => [...texto.matchAll(MARCADOR)].map((m) => ({ texto: m[0], indice: m.index ?? 0 })), [texto])
  const firmable = puedeFirmar(tipo)

  /** Lleva al dato a completar en el texto, seleccionado para escribir encima. */
  function irAMarcador(indice: number, largo: number) {
    setPestana("editar")
    // En pantallas angostas la pestaña "Editar" se monta recién después del cambio: se espera a que aparezca.
    let intentos = 0
    const saltar = () => {
      const t = editorVisible()
      if (!t) {
        if (++intentos < 10) requestAnimationFrame(saltar)
        return
      }
      t.focus({ preventScroll: true })
      t.setSelectionRange(indice, indice + largo)
      desplazarHasta(t, indice)
    }
    requestAnimationFrame(saltar)
  }

  /** El siguiente dato a completar después de donde está el cursor (o el primero). */
  function irAlSiguiente() {
    const desde = editorVisible()?.selectionEnd ?? 0
    const p = pendientes.find((x) => x.indice >= desde) ?? pendientes[0]
    if (p) irAMarcador(p.indice, p.texto.length)
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
        <Markdown
          oficial={tipo === "dictamen" || tipo === "resolucion"}
          alDatoPendiente={(n) => {
            const p = pendientes[n]
            if (p && !generando) irAMarcador(p.indice, p.texto.length)
          }}
        >
          {texto + (generando ? " ▍" : "")}
        </Markdown>
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          {generando && <Loader2 className="size-4 animate-spin" />}
          {generando ? ESPERA[etapaEspera] : "La vista previa aparece acá."}
        </p>
      )}
    </div>
  )

  const areaEdicion = (n: number) => (
    <Textarea
      ref={(t) => {
        editores.current[n] = t
      }}
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
                <p className="mt-1 text-xs text-amber-900/80 dark:text-amber-200/80">Tocá uno para ir al lugar del texto, o el resaltado amarillo de la vista previa.</p>
                <ol className="mt-2 space-y-1">
                  {pendientes.map((p, i) => (
                    <li key={p.indice}>
                      <button
                        type="button"
                        onClick={() => irAMarcador(p.indice, p.texto.length)}
                        className="flex w-full items-start gap-2 rounded-md px-1.5 py-1 text-left text-xs text-amber-900 hover:bg-amber-500/15 dark:text-amber-200"
                        title={p.texto}
                      >
                        <span className="grid size-4 shrink-0 place-items-center rounded-full bg-amber-500 text-[0.62rem] font-semibold text-white tabular">{i + 1}</span>
                        <span className="min-w-0 flex-1 truncate">{p.texto.replace(/^\[COMPLETAR:?\s*/, "").replace(/\]$/, "") || "Dato faltante"}</span>
                      </button>
                    </li>
                  ))}
                </ol>
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
              {areaEdicion(0)}
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
                {areaEdicion(1)}
              </TabsContent>
              <TabsContent value="vista" className="mt-3 min-h-0 flex-1">
                {vistaPrevia}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <DialogFooter className="flex-col gap-3 border-t p-4 sm:flex-row sm:items-center">
          {pendientes.length > 0 && !generando && (
            <Button variant="outline" size="sm" onClick={irAlSiguiente} className="border-amber-500/50 text-amber-800 hover:bg-amber-500/10 dark:text-amber-300">
              <AlertTriangle /> {pendientes.length === 1 ? "Falta 1 dato: ir" : `Faltan ${pendientes.length} datos: ir al siguiente`}
            </Button>
          )}
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
