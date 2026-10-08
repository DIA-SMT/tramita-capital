"use server"

import { createHash, randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"
import * as z from "zod"
import { crearClienteServidor } from "@/lib/supabase/servidor"
import { CLAVE_FIRMA } from "@/lib/firma"
import { leerPatron, Patron } from "@/lib/firma-esquema"
import type { Evaluacion } from "@/lib/firma-trazo"

export type Resultado = { ok: true } | { ok: false; error: string }

const Registro = z
  .object({
    aclaracion: z.string().trim().min(3, "Completá la aclaración").max(120),
    cargo: z.string().trim().min(3, "Completá el cargo").max(160),
    clave: z.string().regex(CLAVE_FIRMA, "La clave tiene que tener 6 números"),
    confirmacion: z.string(),
    acepto: z.literal("si", { error: "Tenés que aceptar la declaración" }),
  })
  .refine((d) => d.clave === d.confirmacion, { message: "Las claves no coinciden", path: ["confirmacion"] })

const Muestras = z.array(Patron).length(3)

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const MAXIMO = 512 * 1024

/**
 * Registra la firma ológrafa del funcionario: tres muestras dibujadas (el patrón que se
 * compara al firmar), la imagen de referencia en el bucket privado `firmas` (con la sesión
 * de la persona: solo escribe en su carpeta) y la clave de firma cifrada (bcrypt), por RPC.
 */
export async function registrarFirma(form: FormData): Promise<Resultado> {
  const datos = Registro.safeParse({
    aclaracion: form.get("aclaracion"),
    cargo: form.get("cargo"),
    clave: form.get("clave"),
    confirmacion: form.get("confirmacion"),
    acepto: form.get("acepto"),
  })
  if (!datos.success) return { ok: false, error: datos.error.issues[0]?.message ?? "Revisá los datos" }
  let muestras: z.infer<typeof Muestras>
  try {
    const leidas = Muestras.safeParse(JSON.parse(String(form.get("muestras") ?? "")))
    if (!leidas.success) return { ok: false, error: "Dibujá tu firma tres veces para registrarla" }
    muestras = leidas.data
  } catch {
    return { ok: false, error: "Dibujá tu firma tres veces para registrarla" }
  }

  const imagen = form.get("imagen")
  if (!(imagen instanceof File) || imagen.size === 0) return { ok: false, error: "Falta la imagen de la firma" }
  if (imagen.size > MAXIMO) return { ok: false, error: "La imagen de la firma es demasiado grande" }
  const bytes = new Uint8Array(await imagen.arrayBuffer())
  if (!PNG.every((b, i) => bytes[i] === b)) return { ok: false, error: "La firma tiene que ser una imagen PNG" }

  const supabase = await crearClienteServidor()
  const { data: claims } = await supabase.auth.getClaims()
  const uid = claims?.claims?.sub
  if (!uid) return { ok: false, error: "Sesión vencida" }

  const ruta = `${uid}/${randomUUID()}.png`
  const huella = createHash("sha256").update(bytes).digest("hex")
  const { error: errorSubida } = await supabase.storage.from("firmas").upload(ruta, bytes, { contentType: "image/png", upsert: false })
  if (errorSubida) return { ok: false, error: "No se pudo guardar la imagen de la firma" }

  const { error } = await supabase.rpc("registrar_firma", {
    p_imagen_path: ruta,
    p_imagen_sha256: huella,
    p_aclaracion: datos.data.aclaracion,
    p_cargo: datos.data.cargo,
    p_clave: datos.data.clave,
    p_muestras: muestras,
  })
  if (error) return { ok: false, error: error.message }

  revalidatePath("/mi-firma")
  return { ok: true }
}

/** Compara un trazo con la firma registrada propia, sin firmar nada (la base decide y lo audita). */
export async function probarFirma(trazo: string): Promise<Evaluacion | { error: string }> {
  const patron = leerPatron(trazo)
  if (!patron) return { error: "Dibujá tu firma completa" }
  const supabase = await crearClienteServidor()
  const { data, error } = await supabase.rpc("probar_firma", { p_trazo: patron })
  if (error || !data || typeof data !== "object" || Array.isArray(data)) return { error: error?.message ?? "No se pudo comparar" }
  return {
    puntaje: Number(data.puntaje),
    umbral: Number(data.umbral),
    duracionOk: data.duracion_ok === true,
    trazosOk: data.trazos_ok === true,
    coincide: data.coincide === true,
  }
}

export async function revocarFirma(): Promise<Resultado> {
  const supabase = await crearClienteServidor()
  const { error } = await supabase.rpc("revocar_firma")
  if (error) return { ok: false, error: "No se pudo revocar la firma" }
  revalidatePath("/mi-firma")
  return { ok: true }
}
