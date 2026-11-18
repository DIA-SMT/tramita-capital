import * as z from "zod"
import { crearClienteServidor } from "@/lib/supabase/servidor"
import { entorno } from "@/lib/entorno"
import { esResponsable, nombreCompleto } from "@/lib/dominio"
import { obtenerUsuario } from "@/lib/usuario"
import { analizarObservaciones, ErrorTablero, leerTablero, preguntarTablero } from "@/lib/ia/tablero"
import { ErrorIA } from "@/lib/ia/proveedor"

export const maxDuration = 120

const Pedido = z.discriminatedUnion("accion", [
  z.object({ accion: z.literal("lectura"), dias: z.number().int().min(1).max(365) }),
  z.object({ accion: z.literal("observaciones"), dias: z.number().int().min(1).max(365) }),
  z.object({ accion: z.literal("pregunta"), dias: z.number().int().min(1).max(365), pregunta: z.string().trim().min(3).max(500) }),
])

/** La IA lee el tablero: lectura con hallazgos, preguntas libres y causas de las observaciones. Solo responsables. */
export async function POST(request: Request) {
  const pedido = Pedido.safeParse(await request.json().catch(() => null))
  if (!pedido.success) return Response.json({ error: "Pedido inválido" }, { status: 400 })

  const usuario = await obtenerUsuario()
  if (!usuario || !(usuario.esInterno || usuario.esAdmin)) return Response.json({ error: "Sin permiso" }, { status: 403 })
  if (!esResponsable({ esAdmin: usuario.esAdmin, areas: usuario.membresias })) {
    return Response.json({ error: "La lectura con IA del tablero es para jefes, dictaminantes y quienes firman." }, { status: 403 })
  }
  if (!entorno.iaHabilitada) return Response.json({ error: "La IA no está configurada en este entorno." }, { status: 503 })

  const supabase = await crearClienteServidor()
  const p = pedido.data
  try {
    if (p.accion === "pregunta") return Response.json({ respuesta: await preguntarTablero(supabase, usuario.id, p.dias, p.pregunta, request.signal) })
    const analisis =
      p.accion === "lectura"
        ? await leerTablero(supabase, usuario.id, p.dias, request.signal)
        : await analizarObservaciones(supabase, usuario.id, p.dias, request.signal)
    return Response.json({ analisis: { ...analisis, por: nombreCompleto(usuario.perfil) } })
  } catch (error) {
    if (error instanceof ErrorTablero) return Response.json({ error: error.message }, { status: error.estado })
    if (error instanceof ErrorIA) return Response.json({ error: error.message }, { status: 502 })
    console.error(`[tablero IA] ${p.accion}`, error)
    return Response.json({ error: "No se pudo completar la lectura con IA." }, { status: 500 })
  }
}
