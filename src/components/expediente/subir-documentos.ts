"use client"

import { clienteNavegador } from "@/lib/supabase/navegador"
import { adjuntarDocumentos, type ArchivoSubido } from "@/lib/acciones/documentos"

export type ArchivoPendiente = { file: File; requisito_clave?: string; etiqueta?: string }

/**
 * Sube los archivos directo a Supabase Storage (sin pasar por el servidor de la app,
 * así no hay límite de tamaño de request) y después los registra en el expediente.
 */
export async function subirDocumentos(
  expedienteId: string,
  archivos: ArchivoPendiente[],
  alAvanzar?: (hechos: number, total: number) => void,
) {
  if (archivos.length === 0) return
  const supabase = clienteNavegador()
  const subidos: ArchivoSubido[] = []

  for (const [i, a] of archivos.entries()) {
    const extension = (a.file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "") || "bin"
    const ruta = `${expedienteId}/${crypto.randomUUID()}.${extension}`
    const { error } = await supabase.storage
      .from("expedientes")
      .upload(ruta, a.file, { contentType: a.file.type || undefined, upsert: false })
    if (error) throw new Error(`No se pudo subir ${a.file.name}: ${error.message}`)
    subidos.push({ storage_path: ruta, nombre_archivo: a.file.name, requisito_clave: a.requisito_clave, etiqueta: a.etiqueta })
    alAvanzar?.(i + 1, archivos.length)
  }

  const resultado = await adjuntarDocumentos(expedienteId, subidos)
  if (!resultado.ok) throw new Error(resultado.error)
}
