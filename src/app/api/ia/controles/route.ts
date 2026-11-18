import * as z from "zod"
import { crearClienteServidor } from "@/lib/supabase/servidor"
import { entorno } from "@/lib/entorno"
import { cotejarDocumentacion, ErrorControl, revisarProyecto } from "@/lib/ia/controles"
import { ErrorIA } from "@/lib/ia/proveedor"

export const maxDuration = 120

const Pedido = z.object({ expedienteId: z.uuid(), control: z.enum(["cotejo", "revision"]) })

/** Controles con IA del personal interno: cotejo de la documentación y segunda lectura del proyecto. */
export async function POST(request: Request) {
  const pedido = Pedido.safeParse(await request.json().catch(() => null))
  if (!pedido.success) return Response.json({ error: "Pedido inválido" }, { status: 400 })

  const supabase = await crearClienteServidor()
  const [{ data: claims }, { data: interno }] = await Promise.all([supabase.auth.getClaims(), supabase.rpc("es_interno")])
  const usuarioId = claims?.claims?.sub
  if (!usuarioId || !interno) return Response.json({ error: "Sin permiso" }, { status: 403 })
  if (!entorno.iaHabilitada) return Response.json({ error: "La IA no está configurada en este entorno." }, { status: 503 })

  const { expedienteId, control } = pedido.data
  try {
    const resultado =
      control === "cotejo"
        ? await cotejarDocumentacion(supabase, expedienteId, usuarioId, request.signal)
        : await revisarProyecto(supabase, expedienteId, usuarioId, request.signal)
    return Response.json({ control: resultado })
  } catch (error) {
    if (error instanceof ErrorControl) return Response.json({ error: error.message }, { status: error.estado })
    if (error instanceof ErrorIA) return Response.json({ error: error.message }, { status: 502 })
    console.error(`[controles IA] ${control}`, error)
    return Response.json({ error: "No se pudo completar el control con IA." }, { status: 500 })
  }
}
