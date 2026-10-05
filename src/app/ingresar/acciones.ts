"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import * as z from "zod"
import { crearClienteServidor } from "@/lib/supabase/servidor"

export type EstadoIngreso = { error?: string; enviado?: string } | undefined

const Email = z.email("Ingresá un email válido").transform((v) => v.trim().toLowerCase())

function rutaSegura(volver: FormDataEntryValue | null) {
  const ruta = typeof volver === "string" ? volver : ""
  return ruta.startsWith("/") && !ruta.startsWith("//") ? ruta : "/"
}

/** Enlace mágico al correo: el modo principal de ingreso. */
export async function enviarEnlace(_: EstadoIngreso, form: FormData): Promise<EstadoIngreso> {
  const email = Email.safeParse(form.get("email"))
  if (!email.success) return { error: email.error.issues[0]?.message }

  const origen = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  const supabase = await crearClienteServidor()
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${origen}/auth/callback?volver=${encodeURIComponent(rutaSegura(form.get("volver")))}`,
    },
  })
  if (error) return { error: "No pudimos enviar el enlace. Probá de nuevo en unos minutos." }
  return { enviado: email.data }
}

/** Ingreso con contraseña (útil en desarrollo y para cuentas de servicio). */
export async function ingresarConClave(_: EstadoIngreso, form: FormData): Promise<EstadoIngreso> {
  const email = Email.safeParse(form.get("email"))
  const clave = String(form.get("clave") ?? "")
  if (!email.success) return { error: email.error.issues[0]?.message }
  if (!clave) return { error: "Ingresá tu contraseña" }

  const supabase = await crearClienteServidor()
  const { error } = await supabase.auth.signInWithPassword({ email: email.data, password: clave })
  if (error) return { error: "Email o contraseña incorrectos" }
  redirect(rutaSegura(form.get("volver")))
}
