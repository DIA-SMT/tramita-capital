import Link from "next/link"
import { BookOpenText, CheckCircle2, FileStack, FolderOpen, Inbox, Sparkles, Stamp, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Copiar } from "@/components/copiar"
import { IconoTramite } from "@/components/icono-tramite"
import { InsigniaPrioridad, InsigniaReservado, InsigniaSentido } from "@/components/insignias"
import { ListaDocumentos } from "@/components/expediente/lista-documentos"
import type { FirmaRegistradaVista } from "@/components/expediente/dialogo-firma"
import type { ControlesHechos } from "@/components/expediente/tarea-paso"
import { Markdown } from "@/components/markdown"
import { Membrete } from "@/components/marca"
import type { Json } from "@/lib/database.types"
import { fechaCorta, haceCuanto, leerDatos, leerRequisitos, TIPOS_ACTUACION } from "@/lib/dominio"
import type { ExpedienteCompleto } from "@/lib/expedientes"
import { cn } from "@/lib/utils"
import type { ItemFirma } from "@/lib/vistas"
import { FirmaEnSerie } from "./firma-en-serie"

export type DatosVistaFirmar = {
  /** Firma resoluciones: rol firmante o jefe en un área con paso de firma. */
  firmaResoluciones: boolean
  cola: ItemFirma[]
  /** El expediente que se está mirando, con todo lo que hace falta para controlarlo. */
  elegido: {
    datos: ExpedienteCompleto
    iniciador: { nombre: string; apellido: string; legajo: string | null; reparticion: string | null } | null
  } | null
  firmante: { nombre: string; cargo: string }
  firmaRegistrada: FirmaRegistradaVista | null
}

/** Controles tildados en un paso: {"<orden>": {"<índice>": {por, at}}}. */
function controlesDelPaso(valor: Json, orden: number): ControlesHechos {
  const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v)
  const paso = esObjeto(valor) ? valor[String(orden)] : null
  if (!esObjeto(paso)) return {}
  return Object.fromEntries(Object.entries(paso).flatMap(([i, x]) => (esObjeto(x) && typeof x.at === "string" ? [[i, { at: x.at }]] : [])))
}

/**
 * Resoluciones para firmar, una tras otra: la cola a un costado y, del expediente elegido, el proyecto
 * tal como va a quedar, el dictamen, la documentación y las fojas para controlar. Al final, la firma.
 * Al firmar, el expediente pasa a la oficina siguiente y se abre el próximo de la cola.
 */
export function VistaFirmar({
  firmaResoluciones,
  cola,
  elegido,
  firmante,
  firmaRegistrada,
  enlace,
  rutaTrasFirmar,
  base = "",
  demo = false,
}: DatosVistaFirmar & {
  /** Enlace a un expediente de la cola. */
  enlace: (id: string) => string
  /** A dónde ir después de firmar el elegido: el próximo de la cola (o la cola vacía). */
  rutaTrasFirmar: string
  base?: string
  demo?: boolean
}) {
  const pendientes = cola.filter((i) => !i.firmada)
  const sinPasar = cola.filter((i) => i.firmada)

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Dirección de Capital Humano</p>
          <h1 className="text-2xl font-semibold tracking-tight">Para firmar</h1>
        </div>
        {firmaResoluciones && cola.length > 0 && (
          <p className="max-w-md text-sm text-muted-foreground">
            {pendientes.length === 1 ? "Una resolución espera" : `${pendientes.length} resoluciones esperan`} tu firma. Firmás de a una, con tu firma y tu
            clave; al firmar, el expediente sigue solo a la oficina siguiente.
          </p>
        )}
      </div>

      {!firmaResoluciones ? (
        <Vacio
          icono={Stamp}
          titulo="Esta sección es para quien firma resoluciones"
          texto="Las resoluciones las firma la Dirección. Lo que tenés que hacer vos está en tu bandeja."
          accion={{ href: `${base}/bandeja`, texto: "Ir a la bandeja", icono: Inbox }}
        />
      ) : cola.length === 0 || !elegido ? (
        <Vacio
          icono={CheckCircle2}
          titulo="Estás al día"
          texto="No hay resoluciones esperando tu firma. Cuando un área eleve un proyecto, aparece acá y te avisamos."
          accion={{ href: `${base}/resoluciones`, texto: "Ver el registro de resoluciones", icono: BookOpenText }}
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[17rem_minmax(0,1fr)]">
          <nav aria-label="Resoluciones para firmar" className="min-w-0 xl:sticky xl:top-20 xl:self-start">
            <Grupo titulo="Para firmar" items={pendientes} elegido={elegido.datos.expediente.id} enlace={enlace} />
            {sinPasar.length > 0 && <Grupo titulo="Firmadas, falta pasarlas" items={sinPasar} elegido={elegido.datos.expediente.id} enlace={enlace} />}
          </nav>
          <Elegido
            {...elegido}
            posicion={cola.findIndex((i) => i.id === elegido.datos.expediente.id) + 1}
            total={cola.length}
            firmante={firmante}
            firmaRegistrada={firmaRegistrada}
            rutaTrasFirmar={rutaTrasFirmar}
            base={base}
            demo={demo}
          />
        </div>
      )}
    </div>
  )
}

function Grupo({ titulo, items, elegido, enlace }: { titulo: string; items: ItemFirma[]; elegido: string; enlace: (id: string) => string }) {
  if (items.length === 0) return null
  return (
    <div className="mb-4 last:mb-0">
      <p className="mb-2 flex items-center justify-between px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {titulo} <span className="tabular">{items.length}</span>
      </p>
      {/* En pantallas angostas, la cola es una tira que se desliza; en anchas, una columna. */}
      <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 xl:flex-col xl:overflow-visible">
        {items.map((i) => {
          const activo = i.id === elegido
          return (
            <li key={i.id} className="w-64 shrink-0 xl:w-auto">
              <Link
                href={enlace(i.id)}
                aria-current={activo ? "true" : undefined}
                className={cn(
                  "block rounded-xl border bg-card p-3 transition-colors hover:border-primary/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  activo && "border-primary/50 bg-primary/[0.05] shadow-sm ring-1 ring-primary/20",
                )}
              >
                <div className="flex items-center gap-2">
                  <IconoTramite icono={i.tipo.icono} className="size-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{i.agente}</span>
                  {(i.prioridad === "urgente" || i.prioridad === "alta") && <InsigniaPrioridad prioridad={i.prioridad} className="px-1.5 text-[0.65rem]" />}
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{i.tipo.nombre}</p>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  {i.firmada ? (
                    <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="size-3.5" /> Firmada
                    </span>
                  ) : !i.proyecto ? (
                    <span className="inline-flex items-center gap-1 font-medium text-amber-700 dark:text-amber-300">
                      <TriangleAlert className="size-3.5" /> Sin proyecto
                    </span>
                  ) : i.proyecto.incompleto ? (
                    <span className="inline-flex items-center gap-1 font-medium text-amber-700 dark:text-amber-300">
                      <TriangleAlert className="size-3.5" /> Falta completar
                    </span>
                  ) : (
                    <InsigniaSentido sentido={i.proyecto.sentido} className="px-2 text-[0.7rem]" />
                  )}
                  <span className="ml-auto truncate text-muted-foreground">llegó {haceCuanto(i.llegoAt)}</span>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Elegido({
  datos: d,
  iniciador,
  posicion,
  total,
  firmante,
  firmaRegistrada,
  rutaTrasFirmar,
  base,
  demo,
}: NonNullable<DatosVistaFirmar["elegido"]> & {
  posicion: number
  total: number
  firmante: DatosVistaFirmar["firmante"]
  firmaRegistrada: FirmaRegistradaVista | null
  rutaTrasFirmar: string
  base: string
  demo: boolean
}) {
  const e = d.expediente
  const proyecto = d.borradores.findLast((b) => b.tipo === "resolucion") ?? null
  const firmadaYa = d.fojas.findLast((f) => f.tipo === "resolucion") ?? null
  const sentidoTexto = leerDatos((proyecto ?? firmadaYa)?.datos ?? {}).sentido
  const sentido = sentidoTexto === "hace_lugar" || sentidoTexto === "rechaza" ? sentidoTexto : null
  const dictamen = d.fojas.findLast((f) => f.tipo === "dictamen") ?? null
  const paso = d.pasos.find((p) => p.orden === e.paso_actual)
  const siguiente = d.pasos.find((p) => p.orden > e.paso_actual)
  const etiquetas = Object.fromEntries(leerRequisitos(d.tipo.requisitos).map((r) => [r.clave, r.nombre]))
  const agente = iniciador ? `${iniciador.nombre} ${iniciador.apellido}`.trim() : (d.nombres[e.iniciador_id] ?? "—")
  const rutaExpediente = `${base}/expedientes/${e.id}`

  return (
    <div className="min-w-0 space-y-5">
      <header className="flex flex-col gap-4 rounded-2xl border bg-card p-5 sm:flex-row sm:items-start">
        <span className="hidden size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-marca-2 to-marca-1 text-white shadow-md shadow-primary/20 sm:grid">
          <IconoTramite icono={d.tipo.icono} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Copiar texto={e.numero} className="text-sm text-muted-foreground" />
            <InsigniaSentido sentido={sentido} />
            {e.prioridad !== "normal" && <InsigniaPrioridad prioridad={e.prioridad} motivo={e.prioridad_motivo} origen={e.prioridad_origen} />}
            {e.reservado && <InsigniaReservado />}
          </div>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">
            <Link href={`${base}/agentes/${e.iniciador_id}`} className="underline-offset-4 hover:text-primary hover:underline" title="Ver la ficha del agente">
              {agente}
            </Link>
          </h2>
          <p className="text-sm text-muted-foreground">
            {d.tipo.nombre}
            {iniciador?.legajo && ` · Leg. ${iniciador.legajo}`}
            {iniciador?.reparticion && ` · ${iniciador.reparticion}`}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          <p className="text-xs text-muted-foreground sm:text-right">
            {posicion} de {total} · iniciado el {fechaCorta(e.created_at)}
          </p>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`${rutaExpediente}/completo`}>
                <FileStack /> Expediente completo
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={rutaExpediente}>
                <FolderOpen /> Abrir
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border bg-card p-4 sm:p-5">
        <Tabs defaultValue="proyecto">
          <TabsList className="mb-4 h-auto flex-wrap">
            <TabsTrigger value="proyecto">{firmadaYa ? "Resolución firmada" : "Proyecto de resolución"}</TabsTrigger>
            {dictamen && <TabsTrigger value="dictamen">Dictamen</TabsTrigger>}
            <TabsTrigger value="documentos">Documentación ({d.documentos.length})</TabsTrigger>
            <TabsTrigger value="fojas">Fojas ({d.fojas.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="proyecto">
            {/* Tal como va a quedar: membrete, texto y el lugar de la firma. */}
            <div className="-mx-4 bg-muted/40 px-3 py-5 sm:-mx-5 sm:px-6">
              <article className="papel mx-auto max-w-[190mm] rounded-xl px-6 py-8 shadow-lg shadow-primary/5 sm:px-12 sm:py-10">
                <Membrete />
                <p className="mt-6 text-right text-[0.7rem] text-[var(--muted-foreground)]">
                  Expte. N.º {e.numero} · {firmadaYa ? `Foja ${firmadaYa.foja}` : "Proyecto"}
                </p>
                <div className="mt-4">
                  <Markdown oficial>{(firmadaYa ?? proyecto)?.contenido ?? "El área anterior no dejó el proyecto de resolución."}</Markdown>
                </div>
                {!firmadaYa && proyecto && (
                  <div className="mt-10 flex justify-end">
                    <div className="w-60 rounded-lg border border-dashed border-[var(--border)] px-4 py-5 text-center text-xs text-[var(--muted-foreground)]">
                      <p className="font-medium text-[var(--foreground)]">Acá va tu firma</p>
                      <p className="mt-0.5">{firmaRegistrada ? `${firmaRegistrada.aclaracion} · ${firmaRegistrada.cargo}` : firmante.nombre}</p>
                    </div>
                  </div>
                )}
              </article>
              {proyecto?.generada_por_ia && !firmadaYa && (
                <p className="mx-auto mt-3 flex max-w-[190mm] items-center gap-1.5 text-xs text-muted-foreground">
                  <Sparkles className="size-3.5" /> Proyecto redactado con asistencia de IA y revisado por {d.nombres[proyecto.autor_id ?? ""] ?? "el área"}.
                </p>
              )}
            </div>
          </TabsContent>

          {dictamen && (
            <TabsContent value="dictamen">
              <p className="mb-3 text-xs text-muted-foreground">
                Foja {dictamen.foja} · firmado por {dictamen.firmada_por ? (d.nombres[dictamen.firmada_por] ?? "—") : "—"}
                {dictamen.firmada_at && ` el ${fechaCorta(dictamen.firmada_at)}`}
                {dictamen.area && ` · ${dictamen.area}`}
              </p>
              <div className="rounded-xl bg-muted/40 p-5">
                <Markdown oficial>{dictamen.contenido}</Markdown>
              </div>
            </TabsContent>
          )}

          <TabsContent value="documentos">
            <ListaDocumentos documentos={d.documentos} etiquetas={etiquetas} demo={demo} />
          </TabsContent>

          <TabsContent value="fojas">
            <ol className="divide-y rounded-xl border">
              {d.fojas.map((f) => (
                <li key={f.id}>
                  <Link
                    href={`${base}/documento/${f.id}`}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-muted/50"
                  >
                    <span className="w-8 shrink-0 text-right font-mono text-xs text-muted-foreground tabular">{f.foja}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{f.titulo}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {TIPOS_ACTUACION[f.tipo]}
                        {f.area && ` · ${f.area}`}
                        {f.firmada_at && ` · ${fechaCorta(f.firmada_at)}`}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </TabsContent>
        </Tabs>
      </section>

      <FirmaEnSerie
        key={e.id}
        expedienteId={e.id}
        firmada={e.estado === "resuelto"}
        proyecto={
          proyecto
            ? { id: proyecto.id, sentido, conIA: proyecto.generada_por_ia, incompleto: (proyecto.contenido ?? "").includes("[COMPLETAR") }
            : null
        }
        controles={paso?.controles ?? []}
        hechos={paso ? controlesDelPaso(e.controles_hechos ?? {}, paso.orden) : {}}
        genera={paso?.genera ?? []}
        siguiente={siguiente ? { nombre: siguiente.nombre, area: siguiente.area } : null}
        firmante={firmante}
        firmaRegistrada={firmaRegistrada}
        rutaMiFirma={`${base}/mi-firma`}
        rutaExpediente={rutaExpediente}
        rutaTras={rutaTrasFirmar}
        demo={demo}
      />
    </div>
  )
}

function Vacio({
  icono: Icono,
  titulo,
  texto,
  accion,
}: {
  icono: typeof Stamp
  titulo: string
  texto: string
  accion: { href: string; texto: string; icono: typeof Stamp }
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed bg-card/50 px-6 py-16 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Icono className="size-6" />
      </span>
      <h2 className="mt-4 text-lg font-semibold">{titulo}</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{texto}</p>
      <Button asChild variant="outline" className="mt-5">
        <Link href={accion.href}>
          <accion.icono /> {accion.texto}
        </Link>
      </Button>
    </div>
  )
}
