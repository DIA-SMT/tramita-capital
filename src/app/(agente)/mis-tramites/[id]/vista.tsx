import Link from "next/link"
import { AlertTriangle, ArrowLeft, CheckCircle2, Hourglass, Inbox, PartyPopper, Route, Stamp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Copiar } from "@/components/copiar"
import { IconoTramite } from "@/components/icono-tramite"
import { InsigniaEstado, InsigniaReservado } from "@/components/insignias"
import { TiempoReal } from "@/components/tiempo-real"
import { Circuito } from "@/components/expediente/circuito"
import { LineaFojas } from "@/components/expediente/linea-fojas"
import { ListaDocumentos } from "@/components/expediente/lista-documentos"
import { ESTADOS_ACTIVOS, estadoVisible, fechaCorta, leerDatos, leerFormulario, leerRequisitos } from "@/lib/dominio"
import type { ExpedienteCompleto } from "@/lib/expedientes"
import { cn } from "@/lib/utils"
import { AdjuntarDocumentacion } from "./adjuntar"
import { Subsanar } from "./subsanar"

function duracion(desde: string, hasta?: string | null) {
  const dias = ((hasta ? new Date(hasta) : new Date()).getTime() - new Date(desde).getTime()) / 86_400_000
  return dias < 1 ? `${Math.max(1, Math.round(dias * 24))} h` : `${dias.toLocaleString("es-AR", { maximumFractionDigits: 1 })} días`
}

export function VistaSeguimiento({
  datos,
  nuevo,
  base = "",
  demo = false,
}: {
  datos: ExpedienteCompleto
  nuevo?: boolean
  base?: string
  demo?: boolean
}) {
  const { expediente: e, tipo, area, pasos, fojas, documentos, nombres } = datos
  const campos = leerFormulario(tipo.formulario)
  const valores = leerDatos(e.datos)
  const requisitos = leerRequisitos(tipo.requisitos)
  const etiquetas = Object.fromEntries(requisitos.map((r) => [r.clave, r.nombre]))
  const ultimaObservacion = [...fojas].reverse().find((f) => f.tipo === "observacion")
  const resolucion = [...fojas].reverse().find((f) => f.tipo === "resolucion")
  const activo = ESTADOS_ACTIVOS.includes(e.estado)
  const pasoActual = pasos.find((p) => p.orden === e.paso_actual)
  const siguiente = pasos.find((p) => p.orden > e.paso_actual)

  const estado = {
    iniciado: { icono: Inbox, titulo: "Recibimos tu trámite", detalle: `${area?.nombre ?? "Capital Humano"} está revisando la documentación.`, tono: "primario" },
    en_tramite: {
      icono: Route,
      titulo: "Tu trámite avanza",
      detalle: `Ahora está en ${area?.nombre ?? "Capital Humano"}${pasoActual ? `: ${pasoActual.nombre.toLowerCase()}` : ""}.`,
      tono: "primario",
    },
    observado: { icono: AlertTriangle, titulo: "Necesitamos que corrijas algo", detalle: "Respondé abajo y el trámite sigue su curso.", tono: "alerta" },
    resuelto:
      e.resultado === "rechazado"
        ? { icono: AlertTriangle, titulo: "No se hizo lugar a tu pedido", detalle: "La resolución explica los motivos. Falta la notificación final.", tono: "alerta" }
        : { icono: Stamp, titulo: "¡Tu trámite fue aprobado!", detalle: "Ya está firmada la resolución. Falta la notificación final.", tono: "exito" },
    archivado:
      e.resultado === "rechazado"
        ? { icono: CheckCircle2, titulo: "Trámite finalizado", detalle: "No se hizo lugar. La resolución y el recorrido quedan disponibles.", tono: "alerta" }
        : { icono: CheckCircle2, titulo: "Trámite finalizado", detalle: "La resolución ya está en tu legajo. Podés consultar el recorrido cuando quieras.", tono: "exito" },
    rechazado: { icono: AlertTriangle, titulo: "No se hizo lugar", detalle: "Revisá la resolución para conocer los motivos.", tono: "alerta" },
  }[e.estado]

  return (
    <div className="space-y-6">
      {!demo && (
        <TiempoReal
          canal={`tramite-${e.id}`}
          suscripciones={[
            { tabla: "expedientes", filtro: `id=eq.${e.id}` },
            { tabla: "actuaciones", filtro: `expediente_id=eq.${e.id}` },
          ]}
        />
      )}

      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link href={`${base}/mis-tramites`}>
          <ArrowLeft /> Mis trámites
        </Link>
      </Button>

      {nuevo && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 animate-in fade-in slide-in-from-top-2">
          <PartyPopper className="size-5 shrink-0 text-emerald-600" />
          <p className="text-sm">
            <strong>¡Listo, tu trámite fue iniciado!</strong> Guardá el número <span className="font-mono tabular">{e.numero}</span>. Te avisamos por email cada vez
            que avance.
          </p>
        </div>
      )}

      <header className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <IconoTramite icono={tipo.icono} className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{tipo.nombre}</h1>
            <InsigniaEstado
              estado={e.estado}
              visible={estadoVisible({ estado: e.estado, resultado: e.resultado, instancia: e.instancia, areaCodigo: area?.codigo, accionPaso: pasoActual?.accion })}
            />
            {e.reservado && <InsigniaReservado />}
          </div>
          <p className="mt-1 text-muted-foreground">{e.asunto}</p>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <Copiar texto={e.numero} />
            <span>Iniciado el {fechaCorta(e.created_at)}</span>
          </p>
        </div>
      </header>

      {/* Estado en lenguaje claro */}
      <section
        className={cn(
          "relative overflow-hidden rounded-3xl border p-5 sm:p-6",
          estado.tono === "primario" && "bg-card",
          estado.tono === "alerta" && "border-amber-500/40 bg-amber-500/5",
          estado.tono === "exito" && "border-emerald-500/30 bg-emerald-500/5",
        )}
      >
        {estado.tono === "primario" && <div className="fondo-marca pointer-events-none absolute inset-0 opacity-70" aria-hidden />}
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <span
            className={cn(
              "grid size-14 shrink-0 place-items-center rounded-2xl",
              estado.tono === "primario" && "bg-gradient-to-br from-marca-2 to-marca-1 text-white shadow-lg shadow-primary/25",
              estado.tono === "alerta" && "bg-amber-500/15 text-amber-700 dark:text-amber-300",
              estado.tono === "exito" && "bg-emerald-500/15 text-emerald-600",
            )}
          >
            <estado.icono className="size-7" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold tracking-tight">{estado.titulo}</h2>
            <p className="text-muted-foreground">{estado.detalle}</p>
            {e.estado === "observado" && ultimaObservacion?.contenido && (
              <blockquote className="mt-3 rounded-xl border-l-4 border-amber-500 bg-background/70 p-3 text-sm">{ultimaObservacion.contenido}</blockquote>
            )}
          </div>
          <dl className="grid shrink-0 grid-cols-3 gap-4 text-center sm:grid-cols-1 sm:text-right">
            <div>
              <dt className="text-xs text-muted-foreground">Paso</dt>
              <dd className="font-semibold tabular">
                {Math.min(e.paso_actual, pasos.length)} de {pasos.length}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{e.resuelto_at ? "Resuelto en" : "Llevamos"}</dt>
              <dd className="font-semibold tabular">{duracion(e.created_at, e.resuelto_at)}</dd>
            </div>
            {tipo.plazo_dias && (
              <div>
                <dt className="text-xs text-muted-foreground">Objetivo</dt>
                <dd className="font-semibold tabular">{tipo.plazo_dias} días</dd>
              </div>
            )}
          </dl>
        </div>
        {activo && siguiente && e.estado !== "observado" && (
          <p className="relative mt-4 flex items-center gap-2 border-t pt-4 text-sm text-muted-foreground">
            <Hourglass className="size-4" /> Después sigue: <span className="font-medium text-foreground">{siguiente.nombre}</span> ({siguiente.area})
          </p>
        )}
        {resolucion && (
          <a href={`#foja-${resolucion.foja}`} className="relative mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            <Stamp className="size-4" /> Ver la resolución (foja {resolucion.foja})
          </a>
        )}
        {e.estado === "observado" && (
          <div className="relative">
            <Subsanar expedienteId={e.id} demo={demo} />
          </div>
        )}
      </section>

      <section className="rounded-2xl border bg-card p-5 sm:p-6">
        <h2 className="mb-5 text-sm font-medium text-muted-foreground">Recorrido del trámite</h2>
        <Circuito pasos={pasos} pasoActual={e.paso_actual} estado={e.estado} />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_20rem]">
        <section className="rounded-2xl border bg-card p-5 sm:p-6">
          <h2 className="mb-5 font-medium">Novedades del expediente</h2>
          <LineaFojas fojas={fojas} firmantes={nombres} base={base} demo={demo} />
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="mb-3 text-sm font-medium">Documentación</h2>
            <ListaDocumentos documentos={documentos} etiquetas={etiquetas} demo={demo} />
            {activo && e.estado !== "observado" && <AdjuntarDocumentacion expedienteId={e.id} requisitos={requisitos} demo={demo} />}
          </section>
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="mb-3 text-sm font-medium">Lo que cargaste</h2>
            <dl className="space-y-2.5 text-sm">
              {campos.map((c) => (
                <div key={c.clave}>
                  <dt className="text-xs text-muted-foreground">{c.etiqueta}</dt>
                  <dd>{valores[c.clave] || "—"}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>
    </div>
  )
}
