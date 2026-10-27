import type { Metadata } from "next"
import { nombreCompleto } from "@/lib/dominio"
import { firmaActiva } from "@/lib/firma-servidor"
import { crearClienteServidor } from "@/lib/supabase/servidor"
import { requerirInterno } from "@/lib/usuario"
import { VistaMiFirma } from "./vista"

export const metadata: Metadata = { title: "Mi firma" }

export default async function MiFirma() {
  const usuario = await requerirInterno()
  const supabase = await crearClienteServidor()
  const [firma, { data: requiereClaveAnterior }] = await Promise.all([
    firmaActiva(supabase, usuario.id),
    supabase.rpc("firma_requiere_clave_anterior"),
  ])
  const nombre = nombreCompleto(usuario.perfil)
  return <VistaMiFirma firma={firma} nombre={nombre === "—" ? "" : nombre} requiereClaveAnterior={requiereClaveAnterior === true} />
}
