import type { Metadata } from "next"
import type { Enum } from "@/lib/database.types"
import { ESTADOS_ACTIVOS } from "@/lib/dominio"
import { crearClienteServidor } from "@/lib/supabase/servidor"
import { requerirInterno } from "@/lib/usuario"
import { VistaBandeja } from "./vista"

export const metadata: Metadata = { title: "Bandeja" }

const CERRADOS: Enum<"estado_expediente">[] = ["resuelto", "archivado", "rechazado"]
const NINGUNA = ["00000000-0000-0000-0000-000000000000"]

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
      "id, numero, asunto, estado, prioridad, prioridad_motivo, prioridad_origen, vence_at, created_at, reservado, asignado_a, area_actual_id, tipo:tipos_tramite!expedientes_tipo_tramite_id_fkey(nombre, icono), area:areas!expedientes_area_actual_id_fkey(nombre), iniciador:perfiles!expedientes_iniciador_id_fkey(nombre, apellido, legajo), asignado:perfiles!expedientes_asignado_a_fkey(nombre, apellido)",
    )
    .order("prioridad", { ascending: false })
    .order("vence_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .limit(200)

  if (vista === "area") consulta = consulta.in("area_actual_id", misAreas.length ? misAreas : NINGUNA)
  if (vista === "mios") consulta = consulta.eq("asignado_a", usuario.id)
  if (tipoId) consulta = consulta.eq("tipo_tramite_id", tipoId)
  if (estado === "activos") consulta = consulta.in("estado", ESTADOS_ACTIVOS)
  else if (estado === "cerrados") consulta = consulta.in("estado", CERRADOS)
  else if (estado === "observado") consulta = consulta.eq("estado", "observado")

  const contar = (filtro: "area" | "mios" | "todos") => {
    let q = supabase.from("expedientes").select("id", { count: "exact", head: true }).in("estado", ESTADOS_ACTIVOS)
    if (filtro === "area") q = q.in("area_actual_id", misAreas.length ? misAreas : NINGUNA)
    if (filtro === "mios") q = q.eq("asignado_a", usuario.id)
    return q
  }

  const [{ data: expedientes }, cArea, cMios, cTodos] = await Promise.all([consulta, contar("area"), contar("mios"), contar("todos")])

  return (
    <VistaBandeja
      expedientes={expedientes ?? []}
      vistas={[
        { clave: "area", etiqueta: "En mis áreas", cantidad: cArea.count ?? 0 },
        { clave: "mios", etiqueta: "Asignados a mí", cantidad: cMios.count ?? 0 },
        { clave: "todos", etiqueta: "Todo Capital Humano", cantidad: cTodos.count ?? 0 },
      ]}
      tipos={(tipos ?? []).map((t) => ({ codigo: t.codigo, nombre: t.nombre }))}
      usuarioId={usuario.id}
      misAreas={misAreas}
      nombre={usuario.perfil.nombre}
    />
  )
}
