"use server"

import * as z from "zod"
import { avisarSinFallar, luego } from "@/lib/avisos"
import { periodo } from "@/lib/novedades"
import { clienteAdmin } from "@/lib/supabase/admin"
import { crearClienteServidor } from "@/lib/supabase/servidor"

export type Resultado = { ok: true; cantidad?: number } | { ok: false; error: string }

const Ids = z.array(z.uuid()).min(1, "Elegí al menos una novedad").max(500)

/**
 * Marca como cargadas en Civitas las novedades pendientes elegidas (Bonificaciones y Liquidación)
 * y le avisa a cada agente que su novedad ya está en el sistema de haberes.
 */
export async function marcarCargadas(ids: string[], referencia?: string): Promise<Resultado> {
  const lista = Ids.safeParse(ids)
  if (!lista.success) return { ok: false, error: lista.error.issues[0]?.message ?? "Selección inválida" }
  const supabase = await crearClienteServidor()
  // Para avisar solo por las que se cargan ahora (con margen por la diferencia de reloj con la base).
  const desde = new Date(Date.now() - 60_000).toISOString()
  const { data, error } = await supabase.rpc("marcar_novedades_cargadas", { p_ids: lista.data, p_referencia: referencia?.trim().slice(0, 200) || null })
  if (error) return { ok: false, error: error.message }

  luego(async () => {
    const { data: cargadas } = await clienteAdmin()
      .from("novedades_haberes")
      .select("perfil_id, expediente_id, concepto, vigencia_desde")
      .in("id", lista.data)
      .eq("estado", "cargada")
      .gte("cargada_at", desde)
    await Promise.allSettled(
      (cargadas ?? []).map((n) =>
        avisarSinFallar({
          perfilId: n.perfil_id,
          expedienteId: n.expediente_id,
          titulo: "Tu novedad de haberes ya está cargada",
          cuerpo: `${n.concepto}: Liquidación de Haberes la cargó en Civitas. Rige desde el período ${periodo(n.vigencia_desde)}.`,
          ruta: `/mis-tramites/${n.expediente_id}`,
        }),
      ),
    )
  })
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
