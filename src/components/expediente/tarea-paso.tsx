"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  Banknote,
  Check,
  CheckCircle2,
  Circle,
  CircleDashed,
  FileCheck2,
  FileWarning,
  Hand,
  Loader2,
  Paperclip,
  PenLine,
  Sparkles,
  Stamp,
  Undo2,
  Wand2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { estadoDocumento, estaPresente, formaDeGenerar, type FormaDeGenerar } from "@/lib/relevamiento"
import type { Enum } from "@/lib/database.types"
import { haceCuanto } from "@/lib/dominio"
import { cn } from "@/lib/utils"

export type PasoConfigurado = {
  orden: number
  nombre: string
  area: string
  controles: string[]
  revisa: string[]
  genera: string[]
  permite_subsanacion: boolean
  destino_final: string | null
  instrucciones?: string | null
}

/** Controles ya tildados en este paso, por índice (se guardan en el expediente). */
export type ControlesHechos = Record<string, { at: string }>

/**
 * Lo que la oficina tiene que hacer en este paso, tal como lo define el relevamiento (FINAL DIGITAL),
 * como una lista guiada: tomar el expediente, controlar, revisar la documentación, producir lo que
 * corresponde y pasarlo. Cada etapa se marca sola cuando está completa; los controles se guardan.
 */
export function TareaDelPaso({
  paso,
  siguiente,
  total,
  documentos,
  fojas,
  etiquetasRequisitos,
  hechos = {},
  borradores = [],
  puedeActuar,
  tomado,
  pendiente = false,
  rutaRegistrarFirma,
  alTomar,
  alMarcar,
  alGenerar,
  alPasar,
  alObservar,
}: {
  paso: PasoConfigurado
  siguiente: { nombre: string; area: string } | null
  total: number
  documentos: { requisito_clave: string | null; nombre_archivo: string }[]
  fojas: { tipo: Enum<"tipo_actuacion">; titulo: string; firmada: boolean }[]
  etiquetasRequisitos: Record<string, string>
  hechos?: ControlesHechos
  /** Borradores en preparación de este expediente, para decir si falta completarlos o ya se pueden firmar. */
  borradores?: { tipo: Enum<"tipo_actuacion">; incompleto: boolean }[]
  /** El área que tiene el expediente, abierto (puede tomarlo). */
  puedeActuar: boolean
  /** Lo tiene asignado quien está mirando: recién ahí se trabaja. */
  tomado: boolean
  pendiente?: boolean
  /** Quien mira no registró su firma: a dónde ir a registrarla si este paso firma la resolución. */
  rutaRegistrarFirma?: string
  alTomar: () => void
  /** Guarda un control; devuelve false si no se pudo (y se vuelve a como estaba). */
  alMarcar: (indice: number, hecho: boolean) => Promise<boolean>
  alGenerar: (nombre: string, forma: FormaDeGenerar) => void
  /** Pasa al paso siguiente; recibe un resumen de lo hecho para la providencia del pase. */
  alPasar: (resumen: string) => void
  alObservar: () => void
}) {
  const [marcas, setMarcas] = useState<ControlesHechos>(hechos)
  const [guardando, setGuardando] = useState<number | null>(null)
  const activo = puedeActuar && tomado

  const presente = { documentos, fojas, etiquetasRequisitos }
  const revisar = paso.revisa.map((r) => ({ nombre: r, ok: estaPresente(r, presente) }))
  const generar = paso.genera.map((g) => {
    const estado = estadoDocumento(g, presente)
    const forma = formaDeGenerar(g)
    const borrador = forma.tipo === "ia" ? borradores.find((b) => b.tipo === forma.documento) : undefined
    return { nombre: g, estado, ok: estado === "listo", forma, incompleto: borrador?.incompleto ?? false }
  })

  const controlesHechos = paso.controles.filter((_, i) => marcas[i]).length
  const faltanControles = paso.controles.length - controlesHechos
  const faltanRevisar = revisar.filter((r) => !r.ok)
  const faltanGenerar = generar.filter((g) => !g.ok && g.forma.tipo !== "automatico")
  const listoParaPasar = activo && faltanControles === 0 && faltanGenerar.length === 0
  // Este paso firma la resolución y quien lo trabaja todavía no registró su firma.
  const registrarFirma = puedeActuar && generar.some((g) => g.forma.tipo === "firma" && !g.ok) ? rutaRegistrarFirma : undefined

  // Progreso: cada control y cada documento a producir cuentan como una tarea.
  const tareas = paso.controles.length + generar.filter((g) => g.forma.tipo !== "automatico").length
  const tareasHechas = controlesHechos + (generar.length - faltanGenerar.length - generar.filter((g) => g.forma.tipo === "automatico").length)

  async function marcar(i: number, hecho: boolean) {
    const antes = marcas
    setMarcas((m) => {
      const n = { ...m }
      if (hecho) n[i] = { at: new Date().toISOString() }
      else delete n[i]
      return n
    })
    setGuardando(i)
    const ok = await alMarcar(i, hecho)
    setGuardando(null)
    if (!ok) setMarcas(antes)
  }

  function pasar() {
    const hechosTexto = paso.controles.filter((_, i) => marcas[i])
    const producidos = generar.filter((g) => g.ok && g.forma.tipo !== "automatico").map((g) => g.nombre)
    const resumen = [
      hechosTexto.length ? `Controles realizados: ${hechosTexto.join("; ")}.` : "",
      producidos.length ? `Se incorporó: ${producidos.join("; ")}.` : "",
    ]
      .filter(Boolean)
      .join(" ")
    alPasar(resumen)
  }

  const destino = siguiente ? `Pasá a ${siguiente.area}` : "Notificá y archivá"
  let n = 0

  return (
    <section className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.06] to-transparent p-4">
      <p className="text-[0.7rem] font-semibold tracking-wide text-primary uppercase">
        Paso {paso.orden} de {total} · {paso.area}
      </p>
      <h2 className="mt-1 text-sm font-medium">{paso.nombre}</h2>
      {tareas > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Avance del paso</span>
            <span className="tabular font-medium text-foreground">
              {tareasHechas} de {tareas}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none"
              style={{ width: `${Math.round((tareasHechas / tareas) * 100)}%` }}
            />
          </div>
        </div>
      )}
      {paso.instrucciones && <p className="mt-3 rounded-lg bg-background/70 px-2.5 py-1.5 text-xs text-muted-foreground">{paso.instrucciones}</p>}
      {registrarFirma && (
        <div className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
          <p className="font-medium text-amber-900 dark:text-amber-200">Este paso lleva tu firma y todavía no la registraste</p>
          <p className="mt-0.5 text-muted-foreground">Registrala una sola vez y volvé: después firmás la resolución dibujándola y con tu clave.</p>
          <Button asChild size="sm" variant="outline" className="mt-2">
            <Link href={registrarFirma}>
              <PenLine /> Registrar mi firma
            </Link>
          </Button>
        </div>
      )}

      <ol className="mt-4">
        {puedeActuar && (
          <Etapa numero={++n} titulo={tomado ? "Lo tenés vos" : "Tomá el expediente"} hecha={tomado}>
            {!tomado && (
              <>
                <p className="text-xs text-muted-foreground">Así el equipo sabe que lo estás trabajando vos. Después se habilita el resto.</p>
                <Button size="sm" className="mt-2" onClick={alTomar} disabled={pendiente}>
                  {pendiente ? <Loader2 className="animate-spin" /> : <Hand />} Tomar el expediente
                </Button>
              </>
            )}
          </Etapa>
        )}

        {paso.controles.length > 0 && (
          <Etapa numero={++n} titulo="Controlá" hecha={faltanControles === 0} detalle={`${controlesHechos} de ${paso.controles.length}`}>
            <ul className="space-y-1.5">
              {paso.controles.map((c, i) => (
                <li key={c} className="flex items-start gap-2">
                  <Checkbox
                    id={`control-${i}`}
                    checked={!!marcas[i]}
                    onCheckedChange={(v) => marcar(i, v === true)}
                    className="mt-0.5"
                    disabled={!activo || guardando === i}
                  />
                  <Label htmlFor={`control-${i}`} className="block text-sm leading-snug font-normal">
                    <span className={cn(marcas[i] && "text-muted-foreground")}>{c}</span>
                    {marcas[i] && <span className="block text-xs text-muted-foreground/80">Hecho {haceCuanto(marcas[i].at)}</span>}
                  </Label>
                </li>
              ))}
            </ul>
          </Etapa>
        )}

        {revisar.length > 0 && (
          <Etapa
            numero={++n}
            titulo="Revisá la documentación"
            hecha={faltanRevisar.length === 0}
            detalle={faltanRevisar.length ? `${faltanRevisar.length} sin cargar` : "Completa"}
            aviso={faltanRevisar.length > 0}
          >
            <ul className="space-y-1">
              {revisar.map((r) => (
                <li key={r.nombre} className="flex items-center gap-2 text-sm">
                  {r.ok ? <FileCheck2 className="size-4 shrink-0 text-emerald-600" /> : <FileWarning className="size-4 shrink-0 text-amber-600" />}
                  <span className={cn(!r.ok && "text-muted-foreground")}>{r.nombre}</span>
                </li>
              ))}
            </ul>
          </Etapa>
        )}

        {generar.length > 0 && (
          <Etapa
            numero={++n}
            titulo="Producí"
            hecha={faltanGenerar.length === 0}
            detalle={faltanGenerar.length ? `Faltan ${faltanGenerar.length}` : "Listo"}
          >
            <ul className="space-y-2">
              {generar.map((g) => {
                const accion = !g.ok && activo && g.forma.tipo !== "automatico" ? botonDe(g) : null
                return (
                  <li key={g.nombre} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5">
                      {g.ok ? (
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                      ) : g.estado === "borrador" ? (
                        <CircleDashed className="size-4 shrink-0 text-amber-600" />
                      ) : (
                        <Circle className="size-4 shrink-0 text-muted-foreground/50" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      {g.nombre}
                      {g.estado === "borrador" && (
                        <span className="block text-xs text-amber-700 dark:text-amber-300">
                          {g.incompleto ? "Borrador con datos para completar" : "Borrador listo para firmar"}
                        </span>
                      )}
                      {g.forma.tipo === "adjunto" && !g.ok && <span className="block text-xs text-muted-foreground">Se adjunta desde {g.forma.origen}</span>}
                      {g.forma.tipo === "automatico" && <span className="block text-xs text-muted-foreground">{g.forma.etiqueta}</span>}
                    </span>
                    {accion && (
                      <Button size="xs" variant={accion.principal ? "default" : "outline"} onClick={() => alGenerar(g.nombre, g.forma)} className="shrink-0">
                        <accion.icono /> {accion.etiqueta}
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
          </Etapa>
        )}

        <Etapa numero={++n} titulo={destino} hecha={false} final listo={listoParaPasar}>
          {activo ? (
            <>
              <Button onClick={pasar} disabled={!listoParaPasar || pendiente} className="w-full">
                <ArrowRight /> {siguiente ? `Pasar a ${siguiente.area}` : "Notificar y archivar"}
              </Button>
              {!listoParaPasar && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Te falta:{" "}
                  {[
                    faltanControles > 0 ? `${faltanControles} ${faltanControles === 1 ? "control" : "controles"}` : null,
                    ...faltanGenerar.map((g) => g.nombre.toLowerCase()),
                  ]
                    .filter(Boolean)
                    .join(", ")}
                  .
                </p>
              )}
              {listoParaPasar && siguiente && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Sigue en {siguiente.area}: {siguiente.nombre}.
                </p>
              )}
              {!siguiente && <p className="mt-2 text-xs text-muted-foreground">Cierre: {paso.destino_final ?? "notificación al agente y archivo"}.</p>}
              {paso.permite_subsanacion && (
                <Button size="sm" variant="ghost" onClick={alObservar} className="mt-1 -ml-2 text-muted-foreground">
                  <Undo2 /> Falta algo del agente: devolvérselo
                </Button>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              {puedeActuar ? "Tomá el expediente para trabajarlo." : `Lo trabaja ${paso.area}.`}
              {siguiente ? ` Después sigue en ${siguiente.area}.` : ""}
            </p>
          )}
        </Etapa>
      </ol>
    </section>
  )
}

/** El botón de cada documento a producir, según cómo esté. */
function botonDe(g: { estado: string; forma: FormaDeGenerar; incompleto: boolean }) {
  const f = g.forma
  if (f.tipo === "novedad") return { etiqueta: f.etiqueta, icono: Banknote, principal: true }
  if (f.tipo === "adjunto") return { etiqueta: "Adjuntar", icono: Paperclip, principal: false }
  if (f.tipo === "firma") return { etiqueta: f.etiqueta, icono: Stamp, principal: true }
  if (f.tipo === "ia") {
    if (g.estado === "borrador") return g.incompleto ? { etiqueta: "Completar", icono: PenLine, principal: false } : { etiqueta: "Firmar", icono: Stamp, principal: true }
    return f.documento === "nota" ? { etiqueta: "Redactar", icono: PenLine, principal: false } : { etiqueta: "Redactar con IA", icono: Sparkles, principal: false }
  }
  return { etiqueta: "Hacer", icono: Wand2, principal: false }
}

/** Una etapa de la lista: el número (o el tilde), el título y lo que hay que hacer. */
function Etapa({
  numero,
  titulo,
  hecha,
  detalle,
  aviso = false,
  final = false,
  listo = false,
  children,
}: {
  numero: number
  titulo: string
  hecha: boolean
  detalle?: string
  aviso?: boolean
  final?: boolean
  listo?: boolean
  children?: React.ReactNode
}) {
  return (
    <li className={cn("relative flex gap-3", !final && "pb-4")}>
      {!final && <span aria-hidden className="absolute top-7 bottom-1 left-[0.6875rem] w-px bg-border" />}
      <span
        className={cn(
          "relative grid size-6 shrink-0 place-items-center rounded-full border text-xs font-semibold tabular",
          hecha ? "border-emerald-600 bg-emerald-600 text-white" : listo ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground",
        )}
      >
        {hecha ? <Check className="size-3.5" /> : numero}
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="flex items-baseline justify-between gap-2 text-sm font-medium">
          <span className={cn(hecha && "text-muted-foreground")}>{titulo}</span>
          {detalle && (
            <span className={cn("shrink-0 text-xs font-normal", aviso ? "text-amber-700 dark:text-amber-300" : hecha ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground")}>
              {detalle}
            </span>
          )}
        </p>
        {children && <div className="mt-2">{children}</div>}
      </div>
    </li>
  )
}
