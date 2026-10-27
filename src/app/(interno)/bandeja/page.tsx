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
  const vista = sp.vista === "mios" || sp.vista === "todos" || sp.vista === "pasados" ? sp.vista : "area"
  const tipo = typeof sp.tipo === "string" ? sp.tipo : null
  const estado = typeof sp.estado === "string" ? sp.estado : "activos"
  const misAreas = usuario.membresias.map((m) => m.area_id)

  const supabase = await crearClienteServidor()
  const { data: tipos } = await supabase.from("tipos_tramite").select("id, codigo, nombre").order("nombre")
  const tipoId = tipo ? tipos?.find((t) => t.codigo === tipo)?.id : null

  // "Pasados por mi área": los expedientes que el área pasó a otra oficina (tomar uno no cuenta) y que hoy no tiene.
  const { data: pases } = misAreas.length
    ? await supabase
        .from("movimientos")
        .select("expediente_id, desde_area_id, hacia_area_id")
        .in("desde_area_id", misAreas)
        .order("created_at", { ascending: false })
        .limit(500)
    : { data: [] }
  const pasados = [...new Set((pases ?? []).filter((m) => m.hacia_area_id && m.hacia_area_id !== m.desde_area_id).map((m) => m.expediente_id))]
  const enOtraArea = `(${(misAreas.length ? misAreas : NINGUNA).join(",")})`

  let consulta = supabase
    .from("expedientes")
    .select(
      "id, numero, asunto, estado, iniciador_id, prioridad, prioridad_motivo, prioridad_origen, vence_at, created_at, reservado, asignado_a, area_actual_id, tipo:tipos_tramite!expedientes_tipo_tramite_id_fkey(nombre, icono), area:areas!expedientes_area_actual_id_fkey(nombre), iniciador:perfiles!expedientes_iniciador_id_fkey(nombre, apellido, legajo), asignado:perfiles!expedientes_asignado_a_fkey(nombre, apellido)",
    )
    .order("prioridad", { ascending: false })
    .order("vence_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .limit(200)

  if (vista === "area") consulta = consulta.in("area_actual_id", misAreas.length ? misAreas : NINGUNA)
  if (vista === "mios") consulta = consulta.eq("asignado_a", usuario.id)
  if (vista === "pasados") consulta = consulta.in("id", pasados.length ? pasados : NINGUNA).not("area_actual_id", "in", enOtraArea)
  if (tipoId) consulta = consulta.eq("tipo_tramite_id", tipoId)
  if (estado === "activos") consulta = consulta.in("estado", ESTADOS_ACTIVOS)
  else if (estado === "cerrados") consulta = consulta.in("estado", CERRADOS)
  else if (estado === "observado") consulta = consulta.eq("estado", "observado")

  const contar = (filtro: "area" | "mios" | "todos" | "pasados") => {
    let q = supabase.from("expedientes").select("id", { count: "exact", head: true }).in("estado", ESTADOS_ACTIVOS)
    if (filtro === "area") q = q.in("area_actual_id", misAreas.length ? misAreas : NINGUNA)
    if (filtro === "mios") q = q.eq("asignado_a", usuario.id)
    if (filtro === "pasados") q = q.in("id", pasados.length ? pasados : NINGUNA).not("area_actual_id", "in", enOtraArea)
    return q
  }

  const [{ data: expedientes }, cArea, cMios, cPasados, cTodos] = await Promise.all([
    consulta,
    contar("area"),
    contar("mios"),
    contar("pasados"),
    contar("todos"),
  ])

  // Dónde está ahora y desde cuándo: el último pase que lo llevó a su oficina actual, y cuándo lo pasó el área.
  const ids = vista === "pasados" ? (expedientes ?? []).map((e) => e.id) : []
  const { data: recorrido } = ids.length
    ? await supabase
        .from("movimientos")
        .select("expediente_id, desde_area_id, hacia_area_id, created_at")
        .in("expediente_id", ids)
        .order("created_at", { ascending: false })
    : { data: [] }
  const seguimiento = new Map(
    (expedientes ?? []).map((e) => {
      const suyos = (recorrido ?? []).filter((m) => m.expediente_id === e.id && m.hacia_area_id !== m.desde_area_id)
      return [
        e.id,
        {
          enAreaDesde: suyos.find((m) => m.hacia_area_id === e.area_actual_id)?.created_at ?? null,
          pasadoAt: suyos.find((m) => m.desde_area_id && misAreas.includes(m.desde_area_id))?.created_at ?? null,
        },
      ]
    }),
  )

  // El perfil completo de un agente solo lo leen las áreas que tienen o tuvieron su trámite: en
  // "Todo Capital Humano" el resto ve solo el nombre.
  const sinPerfil = [...new Set((expedientes ?? []).filter((e) => !e.iniciador).map((e) => e.iniciador_id))]
  const { data: nombres } = sinPerfil.length ? await supabase.rpc("perfiles_basicos", { p_ids: sinPerfil }) : { data: [] }
  const porId = new Map((nombres ?? []).map((n) => [n.id, n]))
  const lista = (expedientes ?? []).map((e) => {
    const n = e.iniciador ? null : porId.get(e.iniciador_id)
    const fila = n ? { ...e, iniciador: { nombre: n.nombre, apellido: n.apellido, legajo: null } } : e
    return vista === "pasados" ? { ...fila, seguimiento: seguimiento.get(e.id) } : fila
  })

  return (
    <VistaBandeja
      expedientes={lista}
      vistas={[
        { clave: "area", etiqueta: "En mis áreas", cantidad: cArea.count ?? 0 },
        { clave: "mios", etiqueta: "Asignados a mí", cantidad: cMios.count ?? 0 },
        { clave: "pasados", etiqueta: "Pasados por mi área", cantidad: cPasados.count ?? 0 },
        { clave: "todos", etiqueta: "Todo Capital Humano", cantidad: cTodos.count ?? 0 },
      ]}
      tipos={(tipos ?? []).map((t) => ({ codigo: t.codigo, nombre: t.nombre }))}
      usuarioId={usuario.id}
      misAreas={misAreas}
      nombre={usuario.perfil.nombre}
      vista={vista}
    />
  )
}
