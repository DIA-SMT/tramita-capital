"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  AlertTriangle,
  Archive,
  ArrowRight,
  Clock,
  Flag,
  Hand,
  Lightbulb,
  Loader2,
  MoreHorizontal,
  PenLine,
  ShieldCheck,
  Sparkles,
  Stamp,
  Trash2,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { DialogoFirma, type Firmante, type FirmaRegistradaVista } from "@/components/expediente/dialogo-firma"
import { SelectorArchivo } from "@/components/expediente/selector-archivo"
import { subirDocumentos } from "@/components/expediente/subir-documentos"
import { TareaDelPaso, type PasoConfigurado } from "@/components/expediente/tarea-paso"
import type { FormaDeGenerar } from "@/lib/relevamiento"
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
  sentido?: "hace_lugar" | "rechaza"
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
  paso: { nombre: string; accion: Enum<"accion_paso"> } | null
  siguientePaso: { nombre: string; area: string } | null
  areas: { id: string; nombre: string }[]
  nombreTramite: string
  iaDisponible: boolean
  borradores: BorradorVista[]
  firmante: Firmante
  /** Firma registrada de quien está usando el sistema. */
  firmaRegistrada?: FirmaRegistradaVista | null
  /** El trámite exige firma registrada para resoluciones. */
  exigeFirmaRegistrada?: boolean
  base?: string
  ultimaNovedad?: string | null
  tarea?: {
    paso: PasoConfigurado
    total: number
    documentos: { requisito_clave: string | null; nombre_archivo: string }[]
    fojas: { tipo: Enum<"tipo_actuacion">; titulo: string; firmada: boolean }[]
    etiquetas: Record<string, string>
  } | null
  demo?: boolean
}

type Dialogo = null | "pasar" | "observar" | "archivar" | "prioridad"
type Sugerencia = { titulo: string; detalle: string; icono: LucideIcon; etiqueta?: string; accion?: () => void; tono?: "espera" }

export function PanelAcciones(p: Props) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [dialogo, setDialogo] = useState<Dialogo>(null)
  const [redactor, setRedactor] = useState<{ abierto: boolean; tipo: TipoDocumento; inicial: BorradorInicial | null; titulo?: string; texto?: string }>({
    abierto: false,
    tipo: "providencia",
    inicial: null,
  })
  const [adjuntar, setAdjuntar] = useState<{ clave: string; etiqueta: string } | null>(null)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [aFirmar, setAFirmar] = useState<BorradorVista | null>(null)
  const [texto, setTexto] = useState("")
  const [areaDestino, setAreaDestino] = useState<string>(p.siguientePaso ? "siguiente" : (p.areas[0]?.id ?? ""))
  const [nuevaPrioridad, setNuevaPrioridad] = useState<Enum<"prioridad_expediente">>(p.prioridad)

  const cerrado = ["archivado", "rechazado"].includes(p.estado)
  const puedeActuar = (p.miRol !== null || p.esAdmin) && !cerrado
  const puedeFirmar = (tipo: TipoDocumento) => {
    if (!puedeActuar) return false
    if (p.esAdmin) return true
    if (tipo === "resolucion") return p.miRol === "firmante" || p.miRol === "jefe"
    if (tipo === "dictamen") return p.miRol === "dictaminante" || p.miRol === "firmante" || p.miRol === "jefe"
    return true
  }

  function ejecutar(accion: () => Promise<{ ok: boolean; error?: string }>, exito: string) {
    iniciar(async () => {
      if (p.demo) {
        await new Promise((r) => setTimeout(r, 400))
        toast.success(`Vista previa: ${exito.charAt(0).toLowerCase()}${exito.slice(1)}`)
        setDialogo(null)
        setTexto("")
        return
      }
      const r = await accion()
      if (!r.ok) return void toast.error(r.error ?? "No se pudo completar la acción")
      toast.success(exito)
      setDialogo(null)
      setTexto("")
      router.refresh()
    })
  }

  const abrirRedactor = (tipo: TipoDocumento, inicial: BorradorInicial | null = null, titulo?: string, texto?: string) =>
    setRedactor({ abierto: true, tipo, inicial, titulo, texto })

  /** Texto base de la novedad a Liquidación: cita la resolución firmada. */
  function textoNovedad() {
    const resolucion = [...(p.tarea?.fojas ?? [])].reverse().find((f) => f.tipo === "resolucion" && f.firmada)
    return [
      `Se comunica a Liquidación de Haberes lo dispuesto por ${resolucion ? `la ${resolucion.titulo.replace(/^Resolución:\s*/, "resolución sobre ")}` : "la resolución firmada en este expediente"} (${p.nombreTramite}).`,
      "",
      "Se solicita su impacto en la liquidación de haberes del/de la agente a partir del período que allí se indica y su registro en Civitas.",
      "",
      "Pase para su conocimiento y efectos.",
    ].join("\n")
  }

  /** Producir un documento que el relevamiento asigna a esta oficina. */
  function generar(nombre: string, forma: FormaDeGenerar) {
    if (forma.tipo === "ia") {
      // Si ya hay un borrador de ese documento, se retoma: firmarlo o seguir editándolo.
      const previo = p.borradores.find((b) => b.tipo === forma.documento)
      if (previo && puedeFirmar(previo.tipo) && !previo.contenido.includes("[COMPLETAR")) return setAFirmar(previo)
      if (previo) return abrirRedactor(previo.tipo, previo)
      return abrirRedactor(forma.documento, null, nombre, /NOVEDAD|DESGLOSE/i.test(nombre) ? textoNovedad() : undefined)
    }
    if (forma.tipo === "adjunto") return setAdjuntar({ clave: forma.clave, etiqueta: nombre })
    if (forma.tipo === "firma") {
      const proyecto = p.borradores.find((b) => b.tipo === "resolucion")
      if (proyecto) return setAFirmar(proyecto)
      return void toast.info("Todavía no hay proyecto de resolución para firmar")
    }
  }

  async function subirAdjunto() {
    if (!adjuntar || !archivo) return
    setSubiendo(true)
    try {
      if (p.demo) {
        await new Promise((r) => setTimeout(r, 600))
        toast.success(`Vista previa: ${adjuntar.etiqueta.toLowerCase()} incorporada al expediente`)
      } else {
        await subirDocumentos(p.expedienteId, [{ file: archivo, requisito_clave: adjuntar.clave, etiqueta: adjuntar.etiqueta }])
        toast.success(`${adjuntar.etiqueta} incorporada al expediente`)
        router.refresh()
      }
      setAdjuntar(null)
      setArchivo(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo adjuntar")
    } finally {
      setSubiendo(false)
    }
  }
  const tomar = () => ejecutar(() => tomarExpediente(p.expedienteId), "Expediente asignado a vos")
  const pasarSiguiente = () => {
    setAreaDestino(p.siguientePaso ? "siguiente" : (p.areas[0]?.id ?? ""))
    setDialogo("pasar")
  }

  // Próximo paso sugerido según el momento del circuito, el rol y los borradores.
  const firmablePendiente = p.borradores.find((b) => puedeFirmar(b.tipo) && !b.contenido.includes("[COMPLETAR"))
  const tieneBorrador = (t: TipoDocumento) => p.borradores.some((b) => b.tipo === t)
  const destino = p.siguientePaso?.area ?? "la siguiente área"

  function sugerencia(): Sugerencia | null {
    if (!puedeActuar) return null
    if (p.estado === "observado")
      return {
        titulo: "Esperando la respuesta del agente",
        detalle: `Le avisamos por email y WhatsApp${p.ultimaNovedad ? ` ${p.ultimaNovedad}` : ""}. Cuando responda, vuelve a tu bandeja.`,
        icono: Clock,
        tono: "espera",
      }
    if (!p.asignadoA) return { titulo: "Tomalo para empezar", detalle: "Así el equipo sabe que lo estás trabajando vos.", icono: Hand, etiqueta: "Tomar el expediente", accion: tomar }
    if (firmablePendiente)
      return {
        titulo: ["resolucion", "providencia", "nota"].includes(firmablePendiente.tipo)
          ? `Hay una ${TIPOS_ACTUACION[firmablePendiente.tipo].toLowerCase()} lista para firmar`
          : `Hay un ${TIPOS_ACTUACION[firmablePendiente.tipo].toLowerCase()} listo para firmar`,
        detalle: firmablePendiente.titulo,
        icono: Stamp,
        etiqueta: "Revisar y firmar",
        accion: () => setAFirmar(firmablePendiente),
      }
    // Con el paso configurado según el relevamiento, la tarjeta “Tarea de este paso” guía el trabajo.
    if (p.tarea) return null
    switch (p.paso?.accion) {
      case "recepcion":
        return {
          titulo: "Controlá la documentación",
          detalle: `Si está completa, pasalo a ${destino}. Si falta algo, observá al agente.`,
          icono: ArrowRight,
          etiqueta: `Pasar a ${destino}`,
          accion: pasarSiguiente,
        }
      case "analisis":
        return {
          titulo: "Dejá constancia del análisis",
          detalle: `Redactá el informe del área y después pasalo a ${destino}.`,
          icono: PenLine,
          etiqueta: tieneBorrador("informe") ? `Pasar a ${destino}` : "Redactar informe con IA",
          accion: tieneBorrador("informe") ? pasarSiguiente : () => abrirRedactor("informe"),
        }
      case "dictamen":
        return tieneBorrador("dictamen")
          ? { titulo: "El dictamen está en preparación", detalle: "Revisalo y firmalo desde Borradores.", icono: PenLine }
          : { titulo: "Redactá el dictamen", detalle: "La IA arma el borrador con el modelo del área.", icono: Sparkles, etiqueta: "Redactar dictamen con IA", accion: () => abrirRedactor("dictamen") }
      case "resolucion":
        return tieneBorrador("resolucion")
          ? { titulo: "Elevá el proyecto a la firma", detalle: `El proyecto está listo. Pasalo a ${destino}.`, icono: ArrowRight, etiqueta: `Pasar a ${destino}`, accion: pasarSiguiente }
          : { titulo: "Prepará el proyecto de resolución", detalle: "La IA lo redacta con el modelo y los datos del expediente.", icono: Sparkles, etiqueta: "Redactar resolución con IA", accion: () => abrirRedactor("resolucion") }
      case "firma":
        return p.estado === "resuelto"
          ? { titulo: "Resolución firmada", detalle: `Pasalo a ${destino} para notificar.`, icono: ArrowRight, etiqueta: `Pasar a ${destino}`, accion: pasarSiguiente }
          : { titulo: "Esperando el proyecto de resolución", detalle: "Cuando Despacho lo cargue, aparece acá para tu firma.", icono: Clock, tono: "espera" }
      case "notificacion":
      case "liquidacion":
      case "archivo":
        return p.siguientePaso
          ? { titulo: "Cumplí y remití", detalle: `Cuando termines, pasalo a ${destino}.`, icono: ArrowRight, etiqueta: `Pasar a ${destino}`, accion: pasarSiguiente }
          : { titulo: "Último paso del circuito", detalle: "Notificá al agente y archivá el expediente.", icono: Archive, etiqueta: "Archivar", accion: () => setDialogo("archivar") }
      default:
        return p.siguientePaso
          ? { titulo: "Continuá el circuito", detalle: `Siguiente paso: ${p.siguientePaso.nombre}.`, icono: ArrowRight, etiqueta: `Pasar a ${destino}`, accion: pasarSiguiente }
          : null
    }
  }
  const s = sugerencia()

  const mostrarTarea = p.tarea && !cerrado && p.estado !== "observado"

  return (
    <div className="contents">
      {s && (
        <section
          className={cn(
            "relative overflow-hidden rounded-2xl border p-4",
            s.tono === "espera" ? "bg-muted/40" : "border-primary/25 bg-gradient-to-br from-primary/[0.07] to-transparent",
          )}
        >
          <p className="flex items-center gap-1.5 text-[0.7rem] font-semibold tracking-wide text-primary uppercase">
            <Lightbulb className="size-3.5" /> Próximo paso
          </p>
          <div className="mt-2 flex gap-3">
            <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", s.tono === "espera" ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary")}>
              <s.icono className="size-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm leading-snug font-medium">{s.titulo}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{s.detalle}</p>
            </div>
          </div>
          {s.accion && s.etiqueta && (
            <Button className="mt-3 w-full" onClick={s.accion} disabled={pendiente}>
              {pendiente ? <Loader2 className="animate-spin" /> : null} {s.etiqueta}
            </Button>
          )}
        </section>
      )}

      {mostrarTarea && p.tarea && (
        <TareaDelPaso
          paso={p.tarea.paso}
          total={p.tarea.total}
          siguiente={p.siguientePaso}
          documentos={p.tarea.documentos}
          fojas={p.tarea.fojas}
          etiquetasRequisitos={p.tarea.etiquetas}
          puedeActuar={puedeActuar && p.asignadoA === p.usuarioId}
          alGenerar={generar}
          alPasar={() => (p.siguientePaso ? pasarSiguiente() : setDialogo("archivar"))}
          alObservar={() => setDialogo("observar")}
        />
      )}
      <section className="rounded-2xl border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium">Acciones</h2>
          {puedeActuar && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Más acciones">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onSelect={() => setDialogo("prioridad")}>
                  <Flag /> Cambiar prioridad
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => abrirRedactor("nota")}>
                  <PenLine /> Agregar nota interna
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setDialogo("archivar")}>
                  <Archive /> Archivar expediente
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {!puedeActuar ? (
          <p className="rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">
            {cerrado ? "El expediente está cerrado." : `El expediente está en ${p.areaActual}. Solo esa área puede actuar; vos podés consultarlo.`}
          </p>
        ) : (
          <div className="grid gap-2">
            {p.asignadoA !== p.usuarioId && s?.etiqueta !== "Tomar el expediente" && (
              <Button variant="outline" className="justify-start" disabled={pendiente} onClick={tomar}>
                <Hand /> Tomar el expediente
              </Button>
            )}
            <Button variant="outline" className="justify-start" onClick={() => abrirRedactor(p.paso?.accion === "dictamen" ? "dictamen" : p.paso?.accion === "resolucion" || p.paso?.accion === "firma" ? "resolucion" : "providencia")}>
              <Sparkles className="text-primary" /> Redactar actuación con IA
            </Button>
            <Button variant="outline" className="justify-start" onClick={pasarSiguiente}>
              <ArrowRight /> {p.siguientePaso ? `Pasar a ${p.siguientePaso.area}` : "Pasar a otra área"}
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => setDialogo("observar")} disabled={p.estado === "observado"}>
              <AlertTriangle /> Observar al agente
            </Button>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full justify-start text-muted-foreground"
          disabled={pendiente}
          onClick={() =>
            iniciar(async () => {
              if (p.demo) return void toast.success("Integridad verificada: cadena de fojas intacta")
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
            {p.borradores.map((b) => {
              const incompleto = b.contenido.includes("[COMPLETAR")
              return (
                <li key={b.id} className="rounded-xl border bg-background p-3">
                  <p className="truncate text-sm font-medium">{b.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    {TIPOS_ACTUACION[b.tipo]} · {b.autor} · {haceCuanto(b.updated_at)}
                    {b.generada_por_ia && " · con IA"}
                  </p>
                  {incompleto && <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-300">Tiene datos [COMPLETAR] pendientes.</p>}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {b.autor_id === p.usuarioId && (
                      <Button size="xs" variant="outline" onClick={() => abrirRedactor(b.tipo, b)}>
                        <PenLine /> Editar
                      </Button>
                    )}
                    {puedeFirmar(b.tipo) && (
                      <Button size="xs" disabled={pendiente || incompleto} onClick={() => setAFirmar(b)}>
                        <Stamp /> Revisar y firmar
                      </Button>
                    )}
                    {b.autor_id === p.usuarioId && (
                      <Button size="xs" variant="ghost" disabled={pendiente} onClick={() => ejecutar(() => eliminarBorrador(b.id), "Borrador eliminado")} aria-label="Eliminar borrador">
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {redactor.abierto && (
        <Redactor
          abierto
          alCerrar={() => setRedactor((r) => ({ ...r, abierto: false, inicial: null }))}
          expedienteId={p.expedienteId}
          tipoInicial={redactor.tipo}
          nombreTramite={p.nombreTramite}
          puedeFirmar={puedeFirmar}
          iaDisponible={p.iaDisponible}
          inicial={redactor.inicial}
          tituloSugerido={redactor.titulo}
          alFirmarConDialogo={(b) =>
            setAFirmar({ ...b, autor_id: p.usuarioId, autor: p.firmante.nombre, updated_at: new Date().toISOString() })
          }
          textoSugerido={redactor.texto}
          firmante={p.firmante}
          demo={p.demo}
        />
      )}

      {/* Documentos que produce la oficina fuera del sistema (p. ej. exportados de Civitas) */}
      <Dialog
        open={!!adjuntar}
        onOpenChange={(o) => {
          if (!o && !subiendo) {
            setAdjuntar(null)
            setArchivo(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Incorporar {adjuntar?.etiqueta.toLowerCase()}</DialogTitle>
            <DialogDescription>Se agrega como foja con su huella SHA-256. Si viene de Civitas, exportala en PDF y subila acá.</DialogDescription>
          </DialogHeader>
          <SelectorArchivo titulo={adjuntar?.etiqueta ?? "Documento"} obligatorio archivo={archivo} alCambiar={(f) => setArchivo(f)} />
          <DialogFooter>
            <Button onClick={subirAdjunto} disabled={!archivo || subiendo}>
              {subiendo && <Loader2 className="animate-spin" />} Incorporar al expediente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DialogoFirma
        abierto={!!aFirmar}
        alCerrar={() => setAFirmar(null)}
        documento={
          aFirmar
            ? {
                tipo: TIPOS_ACTUACION[aFirmar.tipo],
                titulo: aFirmar.titulo,
                contenido: aFirmar.contenido,
                conIA: aFirmar.generada_por_ia,
                deFondo: aFirmar.tipo === "resolucion" || aFirmar.tipo === "dictamen",
              }
            : null
        }
        firmante={p.firmante}
        firmaRegistrada={p.firmaRegistrada}
        exigeFirmaRegistrada={aFirmar?.tipo === "resolucion" && p.exigeFirmaRegistrada}
        rutaMiFirma={`${p.base ?? ""}/mi-firma`}
        alFirmar={async (clave) => {
          if (!aFirmar) return false
          if (p.demo) {
            await new Promise((r) => setTimeout(r, 500))
            toast.success(`Vista previa: ${TIPOS_ACTUACION[aFirmar.tipo].toLowerCase()} firmada y foliada`, {
              description: aFirmar.tipo === "resolucion" ? "Con número y fecha asignados al firmar." : undefined,
            })
            return true
          }
          const r = await firmarActuacion(aFirmar.id, clave)
          if (!r.ok) {
            toast.error(r.error)
            return false
          }
          toast.success(`${TIPOS_ACTUACION[aFirmar.tipo]} firmada e incorporada al expediente`)
          router.refresh()
          return true
        }}
      />

      {/* Pase */}
      <Dialog open={dialogo === "pasar"} onOpenChange={(o) => !o && setDialogo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pasar el expediente</DialogTitle>
            <DialogDescription>El pase queda registrado como foja firmada y avisa a quien lo recibe. Reemplaza la hoja de ruta en papel.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Destino</Label>
              <Select value={areaDestino} onValueChange={setAreaDestino}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Elegí el área" />
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
              <Textarea
                id="motivo-pase"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Ej.: Requisitos completos. Pase a Licencias para su intervención."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={pendiente || !areaDestino}
              onClick={() =>
                ejecutar(
                  () => pasarExpediente({ expedienteId: p.expedienteId, haciaArea: areaDestino === "siguiente" ? null : areaDestino, motivo: texto }),
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
          <div className="flex flex-wrap gap-1.5">
            {["Falta la firma y el sello del profesional.", "El documento adjunto no es legible.", "Falta adjuntar la constancia original."].map((m) => (
              <button key={m} type="button" onClick={() => setTexto(m)} className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted">
                {m}
              </button>
            ))}
          </div>
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
            <DialogDescription>Se agrega la foja de archivo, se avisa al agente y el expediente se cierra. No se puede deshacer.</DialogDescription>
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
                aria-pressed={nuevaPrioridad === k}
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
