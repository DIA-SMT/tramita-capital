import "server-only"
import { cache } from "react"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database, Enum } from "@/lib/database.types"
import { leerDatos, nombreCompleto } from "@/lib/dominio"
import { crearClienteServidor } from "@/lib/supabase/servidor"
import { areasDeFirma, type UsuarioActual } from "@/lib/usuario"
import type { ItemFirma } from "@/lib/vistas"

type Cliente = SupabaseClient<Database>

const ORDEN_PRIORIDAD: Record<Enum<"prioridad_expediente">, number> = { urgente: 0, alta: 1, normal: 2, baja: 3 }
const EN_FIRMA: Enum<"estado_expediente">[] = ["en_tramite", "resuelto"]

/**
 * Expedientes que esperan la firma de la resolución en estas áreas: los que están en el paso de firma
 * de su circuito, todavía sin firmar o ya firmados y sin pasar. Primero los urgentes y, dentro de cada
 * prioridad, los que llegaron antes; los firmados que falta pasar, al final. Todo pasa por RLS.
 */
export async function colaDeFirma(supabase: Cliente, areas: string[]): Promise<ItemFirma[]> {
  if (areas.length === 0) return []
  const { data: pasos } = await supabase.from("pasos_circuito").select("tipo_tramite_id, orden").eq("accion", "firma").in("area_id", areas)
  if (!pasos?.length) return []
  const pasoDeFirma = new Set(pasos.map((p) => `${p.tipo_tramite_id}:${p.orden}`))

  const { data } = await supabase
    .from("expedientes")
    .select(
      "id, numero, asunto, estado, prioridad, reservado, vence_at, created_at, iniciador_id, tipo_tramite_id, paso_actual, tipo:tipos_tramite!expedientes_tipo_tramite_id_fkey(nombre, icono)",
    )
    .in("area_actual_id", areas)
    .in("estado", EN_FIRMA)
    .in("tipo_tramite_id", [...new Set(pasos.map((p) => p.tipo_tramite_id))])
  const expedientes = (data ?? []).filter((e) => pasoDeFirma.has(`${e.tipo_tramite_id}:${e.paso_actual}`))
  if (expedientes.length === 0) return []

  const ids = expedientes.map((e) => e.id)
  const [{ data: proyectos }, { data: llegadas }, { data: personas }] = await Promise.all([
    supabase
      .from("actuaciones")
      .select("expediente_id, titulo, contenido, datos, generada_por_ia")
      .in("expediente_id", ids)
      .eq("tipo", "resolucion")
      .eq("estado", "borrador")
      .order("created_at", { ascending: false }),
    supabase.from("movimientos").select("expediente_id, created_at").in("expediente_id", ids).in("hacia_area_id", areas).order("created_at", { ascending: false }),
    supabase.rpc("perfiles_basicos", { p_ids: [...new Set(expedientes.map((e) => e.iniciador_id))] }),
  ])
  const nombre = new Map((personas ?? []).map((p) => [p.id, nombreCompleto(p)]))

  return expedientes
    .map((e): ItemFirma => {
      const p = (proyectos ?? []).find((x) => x.expediente_id === e.id)
      const sentido = p ? leerDatos(p.datos).sentido : undefined
      return {
        id: e.id,
        numero: e.numero,
        asunto: e.asunto,
        prioridad: e.prioridad,
        reservado: e.reservado,
        vence_at: e.vence_at,
        llegoAt: (llegadas ?? []).find((m) => m.expediente_id === e.id)?.created_at ?? e.created_at,
        firmada: e.estado === "resuelto",
        tipo: { nombre: e.tipo?.nombre ?? "Trámite", icono: e.tipo?.icono ?? null },
        agente: nombre.get(e.iniciador_id) ?? "—",
        proyecto: p
          ? {
              titulo: p.titulo,
              sentido: sentido === "hace_lugar" || sentido === "rechaza" ? sentido : null,
              conIA: p.generada_por_ia,
              incompleto: (p.contenido ?? "").includes("[COMPLETAR"),
            }
          : null,
      }
    })
    .sort((a, b) => Number(a.firmada) - Number(b.firmada) || ORDEN_PRIORIDAD[a.prioridad] - ORDEN_PRIORIDAD[b.prioridad] || a.llegoAt.localeCompare(b.llegoAt))
}

/** Cola de firma de la persona (memoizada por request: la usan el menú, la bandeja y /firmar). null si no firma resoluciones. */
export const colaDeFirmaDe = cache(async (usuario: UsuarioActual): Promise<ItemFirma[] | null> => {
  const areas = await areasDeFirma(usuario)
  if (areas.length === 0) return null
  return colaDeFirma(await crearClienteServidor(), areas)
})
