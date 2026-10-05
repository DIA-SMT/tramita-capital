import Link from "next/link"
import { ArrowLeft, Building2, CalendarClock, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Copiar } from "@/components/copiar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { IconoTramite } from "@/components/icono-tramite"
import { InsigniaEstado, InsigniaPrioridad, InsigniaReservado, PuntoSemaforo } from "@/components/insignias"
import { TiempoReal } from "@/components/tiempo-real"
import { Circuito } from "@/components/expediente/circuito"
import { FojasFiltrables } from "@/components/expediente/fojas-filtrables"
import { ListaDocumentos } from "@/components/expediente/lista-documentos"
import { ResumenIA } from "@/components/expediente/resumen-ia"
import type { Enum } from "@/lib/database.types"
import { ESTADOS_ACTIVOS, fechaCorta, fechaHora, haceCuanto, leerDatos, leerFormulario, leerRequisitos, ROLES } from "@/lib/dominio"
import type { ExpedienteCompleto } from "@/lib/expedientes"
import { cn } from "@/lib/utils"
import { PanelAcciones, type BorradorVista } from "./panel-acciones"
import type { TipoDocumento } from "./redactor"

export type DatosVistaExpediente = {
  datos: ExpedienteCompleto
  iniciador: { nombre: string; apellido: string; legajo: string | null; reparticion: string | null; email: string } | null
  usuario: { id: string; nombre: string; esAdmin: boolean; membresias: { area_id: string; rol: Enum<"rol_area"> }[] }
  iaDisponible: boolean
}

function duracion(desde: string, hasta?: string | null) {
  const dias = ((hasta ? new Date(hasta) : new Date()).getTime() - new Date(desde).getTime()) / 86_400_000
  return dias < 1 ? `${Math.max(1, Math.round(dias * 24))} h` : `${dias.toLocaleString("es-AR", { maximumFractionDigits: 1 })} días`
}

export function VistaExpediente({ datos: d, iniciador, usuario, iaDisponible, base = "", demo = false }: DatosVistaExpediente & { base?: string; demo?: boolean }) {
  const { expediente: e, tipo, area, pasos, fojas, borradores, documentos, movimientos, areas, nombres } = d
  const miRol = usuario.membresias.find((m) => m.area_id === e.area_actual_id)?.rol ?? null
  const pasoActual = pasos.find((p) => p.orden === e.paso_actual)
  const siguiente = pasos.find((p) => p.orden > e.paso_actual)
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
  const ultimaObservacion = [...fojas].reverse().find((f) => f.tipo === "observacion")
  const activo = ESTADOS_ACTIVOS.includes(e.estado)
  const diasLlevados = ((e.resuelto_at ? new Date(e.resuelto_at) : new Date()).getTime() - new Date(e.created_at).getTime()) / 86_400_000
  const proporcion = tipo.linea_base_dias ? Math.min(1, diasLlevados / Number(tipo.linea_base_dias)) : null
  const nombreIniciador = iniciador ? `${iniciador.nombre} ${iniciador.apellido}`.trim() : nombres[e.iniciador_id]

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {!demo && (
        <TiempoReal
          canal={`exp-${e.id}`}
          suscripciones={[
            { tabla: "expedientes", filtro: `id=eq.${e.id}` },
            { tabla: "actuaciones", filtro: `expediente_id=eq.${e.id}` },
          ]}
        />
      )}

      <nav className="flex items-center gap-1 text-sm text-muted-foreground" aria-label="Ubicación">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link href={`${base}/bandeja`}>
            <ArrowLeft /> Bandeja
          </Link>
        </Button>
        <span>/</span>
        <span className="font-mono text-xs tabular">{e.numero}</span>
      </nav>

      <header className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-marca-2 to-marca-1 text-white shadow-lg shadow-primary/20">
          <IconoTramite icono={tipo.icono} className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Copiar texto={e.numero} className="text-sm text-muted-foreground" />
            <InsigniaEstado estado={e.estado} />
            <InsigniaPrioridad prioridad={e.prioridad} motivo={e.prioridad_motivo} origen={e.prioridad_origen} />
            {e.reservado && <InsigniaReservado />}
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-balance">{e.asunto}</h1>
          <p className="text-muted-foreground">{tipo.nombre}</p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <UserRound className="size-4" />
              <span className="text-foreground">{nombreIniciador}</span>
              {iniciador?.legajo && <span className="text-xs">· Leg. {iniciador.legajo}</span>}
              {iniciador?.reparticion && <span className="text-xs">· {iniciador.reparticion}</span>}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="size-4" /> <span className="text-foreground">{area?.nombre ?? "—"}</span>
              {e.asignado_a && <span className="text-xs">· a cargo de {nombres[e.asignado_a]}</span>}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <PuntoSemaforo venceAt={e.vence_at} estado={e.estado} />
              <CalendarClock className="size-4" />
              {activo && e.vence_at ? `Vence ${haceCuanto(e.vence_at)}` : `Iniciado el ${fechaCorta(e.created_at)}`}
            </span>
          </div>
        </div>
        <div className="w-full shrink-0 rounded-2xl border bg-card p-4 lg:w-60">
          <p className="text-xs text-muted-foreground">{e.resuelto_at ? "Resuelto en" : "Tiempo transcurrido"}</p>
          <p className="mt-0.5 text-2xl font-semibold tracking-tight tabular">{duracion(e.created_at, e.resuelto_at)}</p>
          {proporcion !== null && (
            <>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", proporcion < 0.25 ? "bg-emerald-500" : proporcion < 0.75 ? "bg-amber-500" : "bg-rose-500")}
                  style={{ width: `${Math.max(3, proporcion * 100)}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Antes del sistema: {Number(tipo.linea_base_dias).toLocaleString("es-AR")} días · objetivo {tipo.plazo_dias ?? "—"} d
              </p>
            </>
          )}
        </div>
      </header>

      <section className="rounded-2xl border bg-card p-5 sm:p-6">
        <Circuito pasos={pasos} pasoActual={e.paso_actual} estado={e.estado} />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_22rem]">
        <section className="min-w-0 rounded-2xl border bg-card p-5 sm:p-6">
          <Tabs defaultValue="fojas">
            <TabsList className="mb-5 flex-wrap">
              <TabsTrigger value="fojas">Fojas ({fojas.length})</TabsTrigger>
              <TabsTrigger value="documentos">Documentos ({documentos.length})</TabsTrigger>
              <TabsTrigger value="ruta">Hoja de ruta ({movimientos.length})</TabsTrigger>
              <TabsTrigger value="datos">Datos</TabsTrigger>
            </TabsList>
            <TabsContent value="fojas">
              <FojasFiltrables fojas={fojas} firmantes={nombres} />
            </TabsContent>
            <TabsContent value="documentos">
              <ListaDocumentos documentos={documentos} etiquetas={etiquetas} demo={demo} />
            </TabsContent>
            <TabsContent value="ruta">
              <ol className="relative space-y-0">
                {movimientos.map((m, i) => (
                  <li key={m.id} className="relative flex gap-4 pb-5 last:pb-0">
                    {i < movimientos.length - 1 && <span aria-hidden className="absolute top-3 bottom-0 left-[0.3rem] w-px bg-border" />}
                    <span className="relative z-10 mt-1.5 size-2.5 shrink-0 rounded-full border-2 border-primary bg-background" />
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="font-medium">
                        {m.desde ?? "Agente"} <span className="text-muted-foreground">→</span> {m.hacia ?? "—"}
                        {m.hacia_perfil_id && <span className="font-normal text-muted-foreground"> · {nombres[m.hacia_perfil_id]}</span>}
                      </p>
                      {m.motivo && <p className="text-muted-foreground">{m.motivo}</p>}
                      <p className="mt-0.5 text-xs text-muted-foreground tabular">
                        {fechaHora(m.created_at)}
                        {m.desde_perfil_id && ` · ${nombres[m.desde_perfil_id] ?? ""}`}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </TabsContent>
            <TabsContent value="datos">
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {campos.map((c) => (
                  <div key={c.clave} className="rounded-xl bg-muted/40 p-3">
                    <dt className="text-xs text-muted-foreground">{c.etiqueta}</dt>
                    <dd className="mt-0.5 text-sm font-medium">{valores[c.clave] || "—"}</dd>
                  </div>
                ))}
                {iniciador?.email && (
                  <div className="rounded-xl bg-muted/40 p-3">
                    <dt className="text-xs text-muted-foreground">Email del agente</dt>
                    <dd className="mt-0.5 truncate text-sm font-medium">{iniciador.email}</dd>
                  </div>
                )}
              </dl>
            </TabsContent>
          </Tabs>
        </section>

        <aside className="order-first grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:order-none xl:sticky xl:top-20 xl:grid-cols-1 xl:self-start">
          <PanelAcciones
            expedienteId={e.id}
            estado={e.estado}
            prioridad={e.prioridad}
            asignadoA={e.asignado_a}
            usuarioId={usuario.id}
            miRol={miRol}
            esAdmin={usuario.esAdmin}
            areaActual={area?.nombre ?? "otra área"}
            paso={pasoActual ? { nombre: pasoActual.nombre, accion: pasoActual.accion } : null}
            siguientePaso={siguiente ? { nombre: siguiente.nombre, area: siguiente.area } : null}
            areas={areas.filter((a) => a.id !== e.area_actual_id)}
            nombreTramite={tipo.nombre}
            iaDisponible={iaDisponible}
            borradores={vistaBorradores}
            firmante={{ nombre: usuario.nombre, rol: miRol ? ROLES[miRol] : "Administración", area: area?.nombre ?? "" }}
            ultimaNovedad={ultimaObservacion?.firmada_at ? haceCuanto(ultimaObservacion.firmada_at) : null}
            demo={demo}
          />
          <ResumenIA expedienteId={e.id} disponible={iaDisponible} demo={demo} />
        </aside>
      </div>
    </div>
  )
}
