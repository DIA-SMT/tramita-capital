import type { Metadata } from "next"
import Link from "next/link"
import { Inbox, Sparkles } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { IconoTramite } from "@/components/icono-tramite"
import { InsigniaEstado, InsigniaPrioridad, PuntoSemaforo } from "@/components/insignias"
import { TiempoReal } from "@/components/tiempo-real"
import type { Enum } from "@/lib/database.types"
import { ESTADOS_ACTIVOS, haceCuanto, iniciales, nombreCompleto } from "@/lib/dominio"
import { crearClienteServidor } from "@/lib/supabase/servidor"
import { requerirInterno } from "@/lib/usuario"
import { Filtros } from "./filtros"

export const metadata: Metadata = { title: "Bandeja" }

const CERRADOS: Enum<"estado_expediente">[] = ["resuelto", "archivado", "rechazado"]

export default async function Bandeja({ searchParams }: PageProps<"/bandeja">) {
  const usuario = await requerirInterno()
  const sp = await searchParams
  const vista = sp.vista === "mios" || sp.vista === "todos" ? sp.vista : "area"
  const tipo = typeof sp.tipo === "string" ? sp.tipo : null
  const estado = typeof sp.estado === "string" ? sp.estado : "activos"
  const misAreas = usuario.membresias.map((m) => m.area_id)

  const supabase = await crearClienteServidor()
  const { data: tipos } = await supabase.from("tipos_tramite").select("id, codigo, nombre").order("nombre")
  const tipoId = tipo ? tipos?.find((t) => t.codigo === tipo)?.id : null

  let consulta = supabase
    .from("expedientes")
    .select(
      "id, numero, asunto, estado, prioridad, prioridad_motivo, prioridad_origen, vence_at, created_at, updated_at, paso_actual, reservado, asignado_a, tipo:tipos_tramite!expedientes_tipo_tramite_id_fkey(nombre, icono), area:areas!expedientes_area_actual_id_fkey(nombre), iniciador:perfiles!expedientes_iniciador_id_fkey(nombre, apellido, legajo), asignado:perfiles!expedientes_asignado_a_fkey(nombre, apellido)",
    )
    .order("prioridad", { ascending: false })
    .order("vence_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .limit(200)

  if (vista === "area") consulta = consulta.in("area_actual_id", misAreas.length ? misAreas : ["00000000-0000-0000-0000-000000000000"])
  if (vista === "mios") consulta = consulta.eq("asignado_a", usuario.id)
  if (tipoId) consulta = consulta.eq("tipo_tramite_id", tipoId)
  if (estado === "activos") consulta = consulta.in("estado", ESTADOS_ACTIVOS)
  else if (estado === "cerrados") consulta = consulta.in("estado", CERRADOS)
  else if (estado === "observado") consulta = consulta.eq("estado", "observado")

  const contar = (filtro: "area" | "mios" | "todos") => {
    let q = supabase.from("expedientes").select("id", { count: "exact", head: true }).in("estado", ESTADOS_ACTIVOS)
    if (filtro === "area") q = q.in("area_actual_id", misAreas.length ? misAreas : ["00000000-0000-0000-0000-000000000000"])
    if (filtro === "mios") q = q.eq("asignado_a", usuario.id)
    return q
  }

  const [{ data: expedientes }, cArea, cMios, cTodos] = await Promise.all([consulta, contar("area"), contar("mios"), contar("todos")])
  const lista = expedientes ?? []

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <TiempoReal canal={`bandeja-${usuario.id}`} suscripciones={[{ tabla: "expedientes" }]} />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bandeja de trabajo</h1>
        <p className="text-sm text-muted-foreground">
          Ordenada por prioridad y vencimiento. Se actualiza sola cuando entra o se mueve un expediente.
        </p>
      </div>

      <Filtros
        vistas={[
          { clave: "area", etiqueta: "En mis áreas", cantidad: cArea.count ?? 0 },
          { clave: "mios", etiqueta: "Asignados a mí", cantidad: cMios.count ?? 0 },
          { clave: "todos", etiqueta: "Todo Capital Humano", cantidad: cTodos.count ?? 0 },
        ]}
        tipos={(tipos ?? []).map((t) => ({ codigo: t.codigo, nombre: t.nombre }))}
      />

      {lista.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed bg-card/50 px-6 py-20 text-center">
          <Inbox className="size-10 text-muted-foreground/60" />
          <h2 className="mt-4 font-medium">Bandeja al día</h2>
          <p className="mt-1 text-sm text-muted-foreground">No hay expedientes con estos filtros.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card">
          <div className="hidden grid-cols-[1.25rem_minmax(0,2.4fr)_minmax(0,1.3fr)_7rem_minmax(0,1.2fr)_6.5rem] gap-4 border-b bg-muted/40 px-4 py-2.5 text-xs font-medium text-muted-foreground lg:grid">
            <span />
            <span>Expediente</span>
            <span>Agente</span>
            <span>Prioridad</span>
            <span>Dónde está</span>
            <span className="text-right">Ingreso</span>
          </div>
          <ul className="divide-y">
            {lista.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/expedientes/${e.id}`}
                  className="grid grid-cols-[1.25rem_1fr] gap-x-4 gap-y-2 px-4 py-3.5 transition-colors hover:bg-accent/40 lg:grid-cols-[1.25rem_minmax(0,2.4fr)_minmax(0,1.3fr)_7rem_minmax(0,1.2fr)_6.5rem] lg:items-center"
                >
                  <span className="pt-1.5 lg:pt-0">
                    <PuntoSemaforo venceAt={e.vence_at} estado={e.estado} />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <IconoTramite icono={e.tipo?.icono ?? null} className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate font-medium">{e.asunto}</span>
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono tabular">{e.numero}</span>
                      <span>·</span>
                      <span className="truncate">{e.tipo?.nombre}</span>
                      {e.estado !== "en_tramite" && <InsigniaEstado estado={e.estado} className="py-0" />}
                    </span>
                  </span>
                  <span className="col-start-2 min-w-0 text-sm lg:col-start-auto">
                    <span className="block truncate">{e.reservado ? "Reservado" : nombreCompleto(e.iniciador)}</span>
                    {e.iniciador?.legajo && !e.reservado && <span className="text-xs text-muted-foreground">Leg. {e.iniciador.legajo}</span>}
                  </span>
                  <span className="col-start-2 lg:col-start-auto">
                    <InsigniaPrioridad prioridad={e.prioridad} motivo={e.prioridad_motivo} origen={e.prioridad_origen} />
                  </span>
                  <span className="col-start-2 flex min-w-0 items-center gap-2 text-sm lg:col-start-auto">
                    {e.asignado ? (
                      <Avatar className="size-6">
                        <AvatarFallback className="text-[0.6rem]">{iniciales(e.asignado)}</AvatarFallback>
                      </Avatar>
                    ) : (
                      <span className="grid size-6 place-items-center rounded-full border border-dashed text-[0.6rem] text-muted-foreground">—</span>
                    )}
                    <span className="truncate text-muted-foreground">{e.area?.nombre}</span>
                  </span>
                  <span className="col-start-2 text-xs text-muted-foreground lg:col-start-auto lg:text-right">{haceCuanto(e.created_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Sparkles className="size-3.5" /> La prioridad marcada con destello fue sugerida por IA al ingresar el trámite; pasá el mouse para ver el motivo.
      </p>
    </div>
  )
}
