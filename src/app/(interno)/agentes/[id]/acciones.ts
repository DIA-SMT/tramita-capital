"use server"

import { revalidatePath } from "next/cache"
import * as z from "zod"
import { crearClienteServidor } from "@/lib/supabase/servidor"

export type Resultado = { ok: true } | { ok: false; error: string }

const Civitas = z.object({
  perfilId: z.uuid(),
  liquida: z.boolean().nullable(),
  fechaIngreso: z.iso.date().nullable(),
  situacionRevista: z.string().trim().max(120),
})

/**
 * Datos de Civitas del agente, cargados a mano por Registro, Liquidación o Administración hasta que haya importación
 * o API (migración 001900). Con «Liquida SÍ» al día, su próximo certificado de trabajo sale al pedirlo.
 */
export async function actualizarDatosCivitas(entrada: z.input<typeof Civitas>): Promise<Resultado> {
  const d = Civitas.safeParse(entrada)
  if (!d.success) return { ok: false, error: d.error.issues[0]?.message ?? "Revisá los datos" }
  const supabase = await crearClienteServidor()
  const { error } = await supabase.rpc("actualizar_datos_civitas", {
    p_perfil: d.data.perfilId,
    p_liquida: d.data.liquida,
    p_fecha_ingreso: d.data.fechaIngreso,
    p_situacion_revista: d.data.situacionRevista || null,
  })
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/agentes/${d.data.perfilId}`)
  return { ok: true }
}
