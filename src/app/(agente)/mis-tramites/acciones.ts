"use server"

import { after } from "next/server"
import * as z from "zod"
import { crearClienteServidor } from "@/lib/supabase/servidor"
import { avisarArea, avisarSinFallar } from "@/lib/avisos"
import { priorizarExpediente } from "@/lib/ia/priorizacion"
import { entorno } from "@/lib/entorno"

const Inicio = z.object({
  codigo: z.string().min(1).max(40),
  asunto: z.string().trim().max(300),
  datos: z.record(z.string(), z.string().max(4000)),
})

export type ResultadoInicio = { ok: true; id: string; numero: string } | { ok: false; error: string }

export async function iniciarTramite(entrada: z.input<typeof Inicio>): Promise<ResultadoInicio> {
  const datos = Inicio.safeParse(entrada)
  if (!datos.success) return { ok: false, error: "Revisá los datos del formulario" }

  const supabase = await crearClienteServidor()
  const { data: claims } = await supabase.auth.getClaims()
  const perfilId = claims?.claims?.sub
  if (!perfilId) return { ok: false, error: "Tu sesión venció. Volvé a ingresar." }

  const { data: exp, error } = await supabase.rpc("crear_expediente", {
    p_tipo: datos.data.codigo,
    p_asunto: datos.data.asunto,
    p_datos: datos.data.datos,
  })
  if (error || !exp) return { ok: false, error: error?.message ?? "No se pudo iniciar el trámite" }

  after(async () => {
    if (entorno.supabaseClaveSecreta) {
      await priorizarExpediente(exp.id).catch((e) => console.error("[priorización]", e))
      await avisarSinFallar({
        perfilId,
        expedienteId: exp.id,
        titulo: `Recibimos tu trámite ${exp.numero}`,
        cuerpo: "Ya está en Mesa de Entradas. Te vamos a avisar cada vez que avance.",
        ruta: `/mis-tramites/${exp.id}`,
      })
      if (exp.area_actual_id) {
        await avisarArea(exp.area_actual_id, {
          expedienteId: exp.id,
          titulo: `Nuevo trámite ${exp.numero}`,
          cuerpo: exp.asunto,
          ruta: `/expedientes/${exp.id}`,
        })
      }
    }
  })

  return { ok: true, id: exp.id, numero: exp.numero }
}

export async function subsanarTramite(expedienteId: string, texto: string) {
  const id = z.uuid().safeParse(expedienteId)
  if (!id.success) return { ok: false as const, error: "Expediente inválido" }

  const supabase = await crearClienteServidor()
  const { data: exp, error } = await supabase.rpc("subsanar_expediente", { p_expediente: id.data, p_texto: texto.slice(0, 4000) })
  if (error || !exp) return { ok: false as const, error: error?.message ?? "No se pudo enviar la respuesta" }

  after(async () => {
    if (entorno.supabaseClaveSecreta && exp.area_actual_id) {
      await avisarArea(exp.area_actual_id, {
        expedienteId: exp.id,
        titulo: `${exp.numero}: el agente respondió la observación`,
        cuerpo: "El expediente volvió a tu bandeja.",
        ruta: `/expedientes/${exp.id}`,
      })
    }
  })
  return { ok: true as const }
}
