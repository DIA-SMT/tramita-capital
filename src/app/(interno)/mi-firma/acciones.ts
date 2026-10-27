"use server"

import { revalidatePath } from "next/cache"
import * as z from "zod"
import { crearClienteServidor } from "@/lib/supabase/servidor"
import { CLAVE_FIRMA } from "@/lib/firma"
import { Crudo, Dispositivo, leerEvaluacion, Tinta } from "@/lib/firma-esquema"
import type { Evaluacion, FirmaCruda } from "@/lib/firma-trazo"

export type Resultado = { ok: true } | { ok: false; error: string }

const Registro = z
  .object({
    aclaracion: z.string().trim().min(3, "Completá la aclaración").max(120),
    cargo: z.string().trim().min(3, "Completá el cargo").max(160),
    clave: z.string().regex(CLAVE_FIRMA, "La clave tiene que tener 6 números"),
    confirmacion: z.string(),
    // Para reemplazar una firma anterior (activa o revocada por la persona).
    claveAnterior: z.string().regex(CLAVE_FIRMA, "Tu clave actual tiene 6 números").optional(),
    acepto: z.literal(true, { error: "Tenés que aceptar la declaración" }),
    muestras: z.array(Crudo).length(3, "Dibujá tu firma tres veces para registrarla"),
    dispositivo: Dispositivo,
    tinta: Tinta,
  })
  .refine((d) => d.clave === d.confirmacion, { message: "Las claves no coinciden", path: ["confirmacion"] })

/**
 * Registra la firma ológrafa del funcionario: tres trazos crudos (posición, tiempo y presión).
 * La base calcula el patrón de forma y ritmo, exige que las muestras sean consistentes, fija
 * los umbrales de esa persona y guarda la clave de firma cifrada (bcrypt). Todo por RPC.
 * Para reemplazar una firma anterior pide su clave: si no coincide, cuenta como intento fallido.
 */
export async function registrarFirma(datos: z.input<typeof Registro>): Promise<Resultado> {
  const r = Registro.safeParse(datos)
  if (!r.success) return { ok: false, error: r.error.issues[0]?.message ?? "Revisá los datos" }
  const supabase = await crearClienteServidor()
  const { data, error } = await supabase.rpc("registrar_firma", {
    p_aclaracion: r.data.aclaracion,
    p_cargo: r.data.cargo,
    p_clave: r.data.clave,
    p_muestras: r.data.muestras,
    p_dispositivo: r.data.dispositivo,
    p_tinta: r.data.tinta,
    // Solo viaja si hace falta: así el primer registro funciona también antes de aplicar la migración 001300.
    ...(r.data.claveAnterior ? { p_clave_anterior: r.data.claveAnterior } : {}),
  })
  if (error) return { ok: false, error: error.message }
  if (data && typeof data === "object" && !Array.isArray(data) && data.rechazada === "clave") {
    return { ok: false, error: "Tu clave de firma actual no es correcta. Con 5 intentos fallidos se bloquea 15 minutos." }
  }
  revalidatePath("/mi-firma")
  return { ok: true }
}

/** Compara un trazo con la firma registrada propia, sin firmar nada (la base decide y lo audita). */
export async function probarFirma(crudo: FirmaCruda): Promise<Evaluacion | { error: string }> {
  const trazo = Crudo.safeParse(crudo)
  if (!trazo.success) return { error: "Dibujá tu firma completa" }
  const supabase = await crearClienteServidor()
  const { data, error } = await supabase.rpc("probar_firma", { p_trazo: trazo.data })
  if (error) return { error: error.message }
  return leerEvaluacion(data) ?? { error: "No se pudo comparar" }
}

export async function revocarFirma(): Promise<Resultado> {
  const supabase = await crearClienteServidor()
  const { error } = await supabase.rpc("revocar_firma")
  if (error) return { ok: false, error: "No se pudo revocar la firma" }
  revalidatePath("/mi-firma")
  return { ok: true }
}
