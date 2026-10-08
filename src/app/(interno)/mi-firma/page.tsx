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
  const firma = await firmaActiva(supabase, usuario.id)
  const nombre = nombreCompleto(usuario.perfil)
  return <VistaMiFirma firma={firma} nombre={nombre === "—" ? "" : nombre} />
}
