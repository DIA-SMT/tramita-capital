import { timingSafeEqual } from "node:crypto"
import * as z from "zod"
import { clienteAdmin } from "@/lib/supabase/admin"
import { entorno } from "@/lib/entorno"
import { ESTADOS, leerRequisitos } from "@/lib/dominio"

/**
 * API para Migue, el bot del municipio (WhatsApp / Telegram).
 * Migue autentica al vecino-agente por su teléfono; nosotros además exigimos el CUIL,
 * y solo devolvemos datos si teléfono y CUIL coinciden con el mismo perfil.
 *
 * POST /api/migue
 * Authorization: Bearer <MIGUE_API_TOKEN>
 * { "accion": "catalogo" }
 * { "accion": "requisitos", "codigo": "LIC-EXAMEN" }
 * { "accion": "mis_tramites", "telefono": "+54381...", "cuil": "20-..." }
 * { "accion": "estado", "numero": "CH-2026-000001", "telefono": "...", "cuil": "..." }
 */

const Pedido = z.discriminatedUnion("accion", [
  z.object({ accion: z.literal("catalogo") }),
  z.object({ accion: z.literal("requisitos"), codigo: z.string().max(40) }),
  z.object({ accion: z.literal("mis_tramites"), telefono: z.string().max(30), cuil: z.string().max(20) }),
  z.object({ accion: z.literal("estado"), numero: z.string().max(30), telefono: z.string().max(30), cuil: z.string().max(20) }),
])

function autorizado(request: Request) {
  const esperado = entorno.migueToken
  const recibido = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? ""
  if (!esperado || recibido.length !== esperado.length) return false
  return timingSafeEqual(Buffer.from(recibido), Buffer.from(esperado))
}

const soloDigitos = (v: string) => v.replace(/\D/g, "")

async function identificar(telefono: string, cuil: string) {
  const d = soloDigitos(cuil)
  const tel = soloDigitos(telefono).slice(-10)
  if (d.length !== 11 || tel.length < 8) return null
  const { data } = await clienteAdmin()
    .from("perfiles")
    .select("id, nombre, telefono")
    .in("cuil", [d, `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`])
  return data?.find((p) => p.telefono && soloDigitos(p.telefono).endsWith(tel)) ?? null
}

export async function POST(request: Request) {
  if (!autorizado(request)) return Response.json({ error: "No autorizado" }, { status: 401 })
  const pedido = Pedido.safeParse(await request.json().catch(() => null))
  if (!pedido.success) return Response.json({ error: "Pedido inválido" }, { status: 400 })

  const admin = clienteAdmin()
  const p = pedido.data

  if (p.accion === "catalogo") {
    const { data } = await admin.from("tipos_tramite").select("codigo, nombre, descripcion, plazo_dias").eq("activo", true).order("nombre")
    return Response.json({
      tramites: data ?? [],
      enlace: new URL("/mis-tramites/nuevo", entorno.sitio).toString(),
    })
  }

  if (p.accion === "requisitos") {
    const { data } = await admin.from("tipos_tramite").select("nombre, requisitos, plazo_dias").eq("codigo", p.codigo).eq("activo", true).maybeSingle()
    if (!data) return Response.json({ error: "Trámite inexistente" }, { status: 404 })
    return Response.json({
      tramite: data.nombre,
      plazo_dias: data.plazo_dias,
      requisitos: leerRequisitos(data.requisitos).map((r) => ({ nombre: r.nombre, obligatorio: r.obligatorio })),
      enlace: new URL(`/mis-tramites/nuevo/${p.codigo}`, entorno.sitio).toString(),
    })
  }

  const persona = await identificar(p.telefono, p.cuil)
  if (!persona) return Response.json({ error: "No encontramos un agente con ese teléfono y CUIL" }, { status: 404 })

  let consulta = admin
    .from("expedientes")
    .select("id, numero, asunto, estado, updated_at, tipo:tipos_tramite!expedientes_tipo_tramite_id_fkey(nombre), area:areas!expedientes_area_actual_id_fkey(nombre)")
    .eq("iniciador_id", persona.id)
    .order("updated_at", { ascending: false })
    .limit(10)
  if (p.accion === "estado") consulta = consulta.eq("numero", p.numero.trim().toUpperCase())

  const { data } = await consulta
  const tramites = (data ?? []).map((e) => ({
    numero: e.numero,
    tramite: e.tipo?.nombre,
    asunto: e.asunto,
    estado: ESTADOS[e.estado].etiqueta,
    donde_esta: e.area?.nombre,
    actualizado: e.updated_at,
    enlace: new URL(`/mis-tramites/${e.id}`, entorno.sitio).toString(),
  }))

  if (p.accion === "estado" && tramites.length === 0) return Response.json({ error: "Expediente inexistente" }, { status: 404 })
  return Response.json({ agente: persona.nombre, tramites })
}
