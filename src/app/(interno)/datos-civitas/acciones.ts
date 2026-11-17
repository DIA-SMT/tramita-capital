"use server"

import { revalidatePath } from "next/cache"
import * as z from "zod"
import { leerResultadoImportacion, MAX_FILAS_CIVITAS, type ResultadoImportacion } from "@/lib/civitas"
import { crearClienteServidor } from "@/lib/supabase/servidor"

const Fila = z.object({
  legajo: z.string().trim().max(30).nullable(),
  cuil: z.string().trim().max(20).nullable(),
  liquida: z.boolean().nullable(),
  fecha_ingreso: z.iso.date().nullable(),
  situacion_revista: z.string().trim().max(120).nullable(),
})

const Importacion = z.object({
  filas: z.array(Fila).min(1, "La planilla no tiene filas para importar").max(MAX_FILAS_CIVITAS),
  datosAl: z.iso.date("Indicá la fecha de los datos"),
  archivo: z.string().trim().min(1).max(200),
})

/**
 * Importa la planilla de Civitas ya leída en el navegador (migración 002000): actualiza «Liquida SÍ», la fecha de
 * ingreso y la situación de revista de los agentes que encuentra por legajo o CUIL. Lo controla todo la base.
 */
export async function importarCivitas(entrada: z.input<typeof Importacion>): Promise<{ ok: true; resultado: ResultadoImportacion } | { ok: false; error: string }> {
  const d = Importacion.safeParse(entrada)
  if (!d.success) return { ok: false, error: d.error.issues[0]?.message ?? "Revisá la planilla" }
  // Solo viajan los datos que trae cada fila: el pedido queda más liviano.
  const filas = d.data.filas.map((f) => Object.fromEntries(Object.entries(f).filter(([, v]) => v !== null && v !== "")))
  const supabase = await crearClienteServidor()
  const { data, error } = await supabase.rpc("importar_datos_civitas", { p_filas: filas, p_datos_al: d.data.datosAl, p_archivo: d.data.archivo })
  if (error) return { ok: false, error: error.message }
  const resultado = leerResultadoImportacion(data)
  if (!resultado) return { ok: false, error: "No se pudo leer el resultado de la importación" }
  revalidatePath("/datos-civitas")
  return { ok: true, resultado }
}
