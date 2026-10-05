import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Building2, CalendarClock, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { IconoTramite } from "@/components/icono-tramite"
import { InsigniaEstado, InsigniaPrioridad, InsigniaReservado, PuntoSemaforo } from "@/components/insignias"
import { TiempoReal } from "@/components/tiempo-real"
import { Circuito } from "@/components/expediente/circuito"
import { LineaFojas } from "@/components/expediente/linea-fojas"
import { ListaDocumentos } from "@/components/expediente/lista-documentos"
import { cargarExpediente } from "@/lib/expedientes"
import { ESTADOS_ACTIVOS, fechaCorta, fechaHora, haceCuanto, leerDatos, leerFormulario, leerRequisitos } from "@/lib/dominio"
import { entorno } from "@/lib/entorno"
import { crearClienteServidor } from "@/lib/supabase/servidor"
import { requerirInterno } from "@/lib/usuario"
import { PanelAcciones, type BorradorVista } from "./panel-acciones"
import type { TipoDocumento } from "./redactor"

export async function generateMetadata({ params }: PageProps<"/expedientes/[id]">): Promise<Metadata> {
  const { id } = await params
  const datos = await cargarExpediente(id)
  return { title: datos?.expediente.numero ?? "Expediente" }
}

export default async function Expediente({ params }: PageProps<"/expedientes/[id]">) {
  const [{ id }, usuario] = await Promise.all([params, requerirInterno()])
  const datos = await cargarExpediente(id)
  if (!datos) notFound()

  const { expediente: e, tipo, area, pasos, fojas, borradores, documentos, movimientos, areas, nombres } = datos
  const supabase = await crearClienteServidor()
  const { data: iniciador } = await supabase
    .from("perfiles")
    .select("nombre, apellido, legajo, reparticion, email")
    .eq("id", e.iniciador_id)
    .maybeSingle()

  const miRol = usuario.membresias.find((m) => m.area_id === e.area_actual_id)?.rol ?? null
  const pasoActual = pasos.find((p) => p.orden === e.paso_actual)
  const siguiente = pasos.find((p) => p.orden > e.paso_actual)
  const tipoSugerido: TipoDocumento =
    pasoActual?.accion === "dictamen" ? "dictamen" : pasoActual?.accion === "resolucion" || pasoActual?.accion === "firma" ? "resolucion" : "providencia"

  const campos = leerFormulario(tipo.formulario)
  const valores = leerDatos(e.datos)
  const etiquetas = Object.fromEntries(leerRequisitos(tipo.requisitos).map((r) => [r.clave, r.nombre]))
  const vistaBorradores: BorradorVista[] = borradores.map((b) => ({
    id: b.id,
    tipo: b.tipo as TipoDocumento,
    titulo: b.titulo,
    contenido: b.contenido ?? "",
    autor_id: b.autor_id,
    autor: b.autor_id ? (nombres[b.autor_id] ?? "—") : "—",
    updated_at: b.updated_at,
    generada_por_ia: b.generada_por_ia,
  }))
  const diasTranscurridos = ((e.resuelto_at ? new Date(e.resuelto_at) : new Date()).getTime() - new Date(e.created_at).getTime()) / 86_400_000

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <TiempoReal
        canal={`exp-${e.id}`}
        suscripciones={[
          { tabla: "expedientes", filtro: `id=eq.${e.id}` },
          { tabla: "actuaciones", filtro: `expediente_id=eq.${e.id}` },
        ]}
      />

      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link href="/bandeja">
          <ArrowLeft /> Bandeja
        </Link>
      </Button>

      <header className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <IconoTramite icono={tipo.icono} className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground tabular">{e.numero}</span>
            <InsigniaEstado estado={e.estado} />
            <InsigniaPrioridad prioridad={e.prioridad} motivo={e.prioridad_motivo} origen={e.prioridad_origen} />
            {e.reservado && <InsigniaReservado />}
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{e.asunto}</h1>
          <p className="text-muted-foreground">{tipo.nombre}</p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <UserRound className="size-4" />
              {iniciador ? `${iniciador.nombre} ${iniciador.apellido}` : nombres[e.iniciador_id]}
              {iniciador?.legajo && <span className="text-xs">· Leg. {iniciador.legajo}</span>}
              {iniciador?.reparticion && <span className="text-xs">· {iniciador.reparticion}</span>}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="size-4" /> {area?.nombre ?? "—"}
              {e.asignado_a && <span className="text-xs">· a cargo de {nombres[e.asignado_a]}</span>}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <PuntoSemaforo venceAt={e.vence_at} estado={e.estado} />
              <CalendarClock className="size-4" />
              {ESTADOS_ACTIVOS.includes(e.estado) && e.vence_at ? `Vence ${haceCuanto(e.vence_at)}` : `Iniciado el ${fechaCorta(e.created_at)}`}
            </span>
          </div>
        </div>
        <div className="flex gap-3 lg:flex-col lg:items-end">
          <div className="rounded-xl border bg-card px-4 py-2.5 text-right">
            <p className="text-xs text-muted-foreground">{e.resuelto_at ? "Resuelto en" : "Lleva"}</p>
            <p className="text-xl font-semibold tabular">
              {diasTranscurridos < 1 ? `${Math.max(1, Math.round(diasTranscurridos * 24))} h` : `${diasTranscurridos.toFixed(1)} días`}
            </p>
            {tipo.linea_base_dias && <p className="text-xs text-muted-foreground">antes: {tipo.linea_base_dias} días</p>}
          </div>
        </div>
      </header>

      <section className="rounded-2xl border bg-card p-5 sm:p-6">
        <Circuito pasos={pasos} pasoActual={e.paso_actual} estado={e.estado} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section className="min-w-0 rounded-2xl border bg-card p-5 sm:p-6">
          <Tabs defaultValue="fojas">
            <TabsList className="mb-5 flex-wrap">
              <TabsTrigger value="fojas">Fojas ({fojas.length})</TabsTrigger>
              <TabsTrigger value="documentos">Documentos ({documentos.length})</TabsTrigger>
              <TabsTrigger value="ruta">Hoja de ruta ({movimientos.length})</TabsTrigger>
              <TabsTrigger value="datos">Datos</TabsTrigger>
            </TabsList>
            <TabsContent value="fojas">
              <LineaFojas fojas={fojas} firmantes={nombres} />
            </TabsContent>
            <TabsContent value="documentos">
              <ListaDocumentos documentos={documentos} etiquetas={etiquetas} />
            </TabsContent>
            <TabsContent value="ruta">
              <ol className="space-y-3">
                {movimientos.map((m) => (
                  <li key={m.id} className="flex gap-3 rounded-xl border bg-background p-3 text-sm">
                    <span className="w-28 shrink-0 text-xs text-muted-foreground tabular">{fechaHora(m.created_at)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">
                        {m.desde ?? "Agente"} → {m.hacia ?? "—"}
                      </span>
                      {m.hacia_perfil_id && <span className="text-muted-foreground"> · {nombres[m.hacia_perfil_id]}</span>}
                      {m.motivo && <span className="block text-muted-foreground">{m.motivo}</span>}
                    </span>
                  </li>
                ))}
              </ol>
            </TabsContent>
            <TabsContent value="datos">
              <dl className="grid gap-4 sm:grid-cols-2">
                {campos.map((c) => (
                  <div key={c.clave} className="rounded-xl bg-muted/40 p-3">
                    <dt className="text-xs text-muted-foreground">{c.etiqueta}</dt>
                    <dd className="mt-0.5 text-sm font-medium">{valores[c.clave] || "—"}</dd>
                  </div>
                ))}
              </dl>
            </TabsContent>
          </Tabs>
        </section>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <PanelAcciones
            expedienteId={e.id}
            estado={e.estado}
            prioridad={e.prioridad}
            asignadoA={e.asignado_a}
            usuarioId={usuario.id}
            miRol={miRol}
            esAdmin={usuario.esAdmin}
            areaActual={area?.nombre ?? "otra área"}
            siguientePaso={siguiente ? { nombre: siguiente.nombre, area: siguiente.area } : null}
            areas={areas.filter((a) => a.id !== e.area_actual_id)}
            tipoSugerido={tipoSugerido}
            nombreTramite={tipo.nombre}
            iaDisponible={entorno.iaHabilitada}
            borradores={vistaBorradores}
          />
        </aside>
      </div>
    </div>
  )
}
