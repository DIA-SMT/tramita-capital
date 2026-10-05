"use server"

import { createHash } from "node:crypto"
import * as z from "zod"
import { crearClienteServidor } from "@/lib/supabase/servidor"

const TIPOS_PERMITIDOS = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic"]
const MAXIMO = 20 * 1024 * 1024

const Archivos = z
  .array(
    z.object({
      storage_path: z.string().min(1),
      nombre_archivo: z.string().min(1).max(200),
      requisito_clave: z.string().max(80).optional(),
      etiqueta: z.string().max(200).optional(),
    }),
  )
  .min(1)
  .max(12)

export type ArchivoSubido = z.infer<typeof Archivos>[number]
export type Resultado = { ok: true } | { ok: false; error: string }

/**
 * Registra en el expediente archivos que el navegador ya subió a Storage.
 * El servidor descarga cada archivo (con los permisos del usuario), verifica tipo y
 * tamaño, calcula el SHA-256 y lo asienta en una foja firmada.
 */
export async function adjuntarDocumentos(expedienteId: string, archivos: ArchivoSubido[]): Promise<Resultado> {
  const id = z.uuid().safeParse(expedienteId)
  const lista = Archivos.safeParse(archivos)
  if (!id.success || !lista.success) return { ok: false, error: "Datos de archivos inválidos" }

  const supabase = await crearClienteServidor()
  const registros = []

  for (const a of lista.data) {
    if (!a.storage_path.startsWith(`${id.data}/`)) return { ok: false, error: "Ruta de archivo inválida" }
    const { data: blob, error } = await supabase.storage.from("expedientes").download(a.storage_path)
    if (error || !blob) return { ok: false, error: `No encontramos el archivo ${a.nombre_archivo}` }
    if (blob.size > MAXIMO) return { ok: false, error: `${a.nombre_archivo} supera los 20 MB` }
    if (blob.type && !TIPOS_PERMITIDOS.includes(blob.type)) return { ok: false, error: `${a.nombre_archivo}: formato no admitido` }

    const sha256 = createHash("sha256").update(Buffer.from(await blob.arrayBuffer())).digest("hex")
    registros.push({ ...a, mime_type: blob.type || null, tamano_bytes: blob.size, sha256 })
  }

  const { error } = await supabase.rpc("registrar_documentos", { p_expediente: id.data, p_documentos: registros })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
