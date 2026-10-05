"use server"

import { revalidatePath } from "next/cache"
import * as z from "zod"
import { crearClienteServidor } from "@/lib/supabase/servidor"

const Perfil = z.object({
  nombre: z.string().trim().min(1, "Ingresá tu nombre").max(80),
  apellido: z.string().trim().min(1, "Ingresá tu apellido").max(80),
  telefono: z
    .string()
    .trim()
    .max(25)
    .refine((v) => v === "" || v.replace(/\D/g, "").length >= 10, "Ingresá el número con característica, sin 0 ni 15 (ej.: 381 555 1234)"),
})

export type EstadoPerfil = { ok?: boolean; error?: string; campos?: Record<string, string> } | undefined

/** Actualiza nombre, apellido y celular. RLS + permisos por columna impiden tocar otros datos. */
export async function actualizarPerfil(_: EstadoPerfil, form: FormData): Promise<EstadoPerfil> {
  const datos = Perfil.safeParse({ nombre: form.get("nombre"), apellido: form.get("apellido"), telefono: form.get("telefono") ?? "" })
  if (!datos.success) {
    return { error: "Revisá los datos", campos: Object.fromEntries(datos.error.issues.map((i) => [String(i.path[0]), i.message])) }
  }
  const supabase = await crearClienteServidor()
  const { data } = await supabase.auth.getClaims()
  const id = data?.claims?.sub
  if (!id) return { error: "Tu sesión venció" }

  const { error } = await supabase
    .from("perfiles")
    .update({ nombre: datos.data.nombre, apellido: datos.data.apellido, telefono: datos.data.telefono || null })
    .eq("id", id)
  if (error) return { error: "No se pudo guardar. Probá de nuevo." }
  revalidatePath("/", "layout")
  return { ok: true }
}
