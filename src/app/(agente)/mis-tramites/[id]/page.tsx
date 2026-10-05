import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { AlertTriangle, ArrowLeft, CalendarClock, PartyPopper } from "lucide-react"
import { Button } from "@/components/ui/button"
import { IconoTramite } from "@/components/icono-tramite"
import { InsigniaEstado, InsigniaReservado } from "@/components/insignias"
import { TiempoReal } from "@/components/tiempo-real"
import { Circuito } from "@/components/expediente/circuito"
import { LineaFojas } from "@/components/expediente/linea-fojas"
import { ListaDocumentos } from "@/components/expediente/lista-documentos"
import { cargarExpediente } from "@/lib/expedientes"
import { ESTADOS_ACTIVOS, fechaCorta, haceCuanto, leerDatos, leerFormulario, leerRequisitos } from "@/lib/dominio"
import { requerirUsuario } from "@/lib/usuario"
import { Subsanar } from "./subsanar"
import { AdjuntarDocumentacion } from "./adjuntar"

export async function generateMetadata({ params }: PageProps<"/mis-tramites/[id]">): Promise<Metadata> {
  const { id } = await params
  const datos = await cargarExpediente(id)
  return { title: datos ? datos.expediente.numero : "Trámite" }
}

export default async function DetalleTramite({ params, searchParams }: PageProps<"/mis-tramites/[id]">) {
  const [{ id }, { nuevo }, usuario] = await Promise.all([params, searchParams, requerirUsuario()])
  const datos = await cargarExpediente(id)
  if (!datos || datos.expediente.iniciador_id !== usuario.id) notFound()

  const { expediente: e, tipo, pasos, fojas, documentos, nombres } = datos
  const campos = leerFormulario(tipo.formulario)
  const valores = leerDatos(e.datos)
  const requisitos = leerRequisitos(tipo.requisitos)
  const etiquetas = Object.fromEntries(requisitos.map((r) => [r.clave, r.nombre]))
  const ultimaObservacion = [...fojas].reverse().find((f) => f.tipo === "observacion")
  const activo = ESTADOS_ACTIVOS.includes(e.estado)

  return (
    <div className="space-y-6">
      <TiempoReal
        canal={`tramite-${e.id}`}
        suscripciones={[
          { tabla: "expedientes", filtro: `id=eq.${e.id}` },
          { tabla: "actuaciones", filtro: `expediente_id=eq.${e.id}` },
        ]}
      />

      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link href="/mis-tramites">
          <ArrowLeft /> Mis trámites
        </Link>
      </Button>

      {nuevo && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 animate-in fade-in slide-in-from-top-2">
          <PartyPopper className="size-5 text-emerald-600" />
          <p className="text-sm">
            <strong>¡Trámite iniciado!</strong> Tu número es <span className="font-mono tabular">{e.numero}</span>. Te avisamos por email cada vez que avance.
          </p>
        </div>
      )}

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <IconoTramite icono={tipo.icono} className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{tipo.nombre}</h1>
            <InsigniaEstado estado={e.estado} />
            {e.reservado && <InsigniaReservado />}
          </div>
          <p className="mt-1 text-muted-foreground">{e.asunto}</p>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="font-mono tabular">{e.numero}</span>
            <span>Iniciado el {fechaCorta(e.created_at)}</span>
            {activo && e.vence_at && (
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="size-3.5" /> Objetivo: {haceCuanto(e.vence_at)}
              </span>
            )}
          </p>
        </div>
      </header>

      {e.estado === "observado" && (
        <section className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
            <div className="min-w-0 flex-1">
              <h2 className="font-medium">Capital Humano necesita que corrijas algo</h2>
              {ultimaObservacion?.contenido && <p className="mt-1 text-sm text-muted-foreground">{ultimaObservacion.contenido}</p>}
              <Subsanar expedienteId={e.id} />
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border bg-card p-5 sm:p-6">
        <h2 className="mb-5 text-sm font-medium text-muted-foreground">Recorrido del trámite</h2>
        <Circuito pasos={pasos} pasoActual={e.paso_actual} estado={e.estado} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section className="rounded-2xl border bg-card p-5 sm:p-6">
          <h2 className="mb-5 font-medium">Novedades del expediente</h2>
          <LineaFojas fojas={fojas} firmantes={nombres} />
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="mb-3 text-sm font-medium">Tus datos</h2>
            <dl className="space-y-2.5 text-sm">
              {campos.map((c) => (
                <div key={c.clave}>
                  <dt className="text-xs text-muted-foreground">{c.etiqueta}</dt>
                  <dd>{valores[c.clave] || "—"}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="mb-3 text-sm font-medium">Documentación</h2>
            <ListaDocumentos documentos={documentos} etiquetas={etiquetas} />
            {activo && e.estado !== "observado" && <AdjuntarDocumentacion expedienteId={e.id} requisitos={requisitos} />}
          </section>
        </div>
      </div>
    </div>
  )
}
