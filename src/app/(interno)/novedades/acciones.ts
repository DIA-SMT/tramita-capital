"use server"

import * as z from "zod"
import { crearClienteServidor } from "@/lib/supabase/servidor"

export type Resultado = { ok: true; cantidad?: number } | { ok: false; error: string }

const Ids = z.array(z.uuid()).min(1, "Elegí al menos una novedad").max(500)

/** Marca como cargadas en Civitas las novedades pendientes elegidas (Bonificaciones y Liquidación). */
export async function marcarCargadas(ids: string[], referencia?: string): Promise<Resultado> {
  const lista = Ids.safeParse(ids)
  if (!lista.success) return { ok: false, error: lista.error.issues[0]?.message ?? "Selección inválida" }
  const supabase = await crearClienteServidor()
  const { data, error } = await supabase.rpc("marcar_novedades_cargadas", { p_ids: lista.data, p_referencia: referencia?.trim().slice(0, 200) || null })
  if (error) return { ok: false, error: error.message }
  return { ok: true, cantidad: data ?? 0 }
}

/** Anula una novedad mal registrada, antes de cargarla. Queda el motivo y la auditoría. */
export async function anularNovedad(id: string, motivo: string): Promise<Resultado> {
  const valido = z.uuid().safeParse(id)
  const texto = motivo.trim()
  if (!valido.success) return { ok: false, error: "Novedad inválida" }
  if (texto.length < 5) return { ok: false, error: "Explicá brevemente el motivo" }
  const supabase = await crearClienteServidor()
  const { error } = await supabase.rpc("anular_novedad", { p_id: valido.data, p_motivo: texto.slice(0, 1000) })
  return error ? { ok: false, error: error.message } : { ok: true }
}
