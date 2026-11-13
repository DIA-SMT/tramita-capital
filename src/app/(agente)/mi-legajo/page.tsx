import type { Metadata } from "next"
import { cargarLegajo } from "@/lib/legajo"
import { crearClienteServidor } from "@/lib/supabase/servidor"
import { requerirUsuario } from "@/lib/usuario"
import { VistaMiLegajo } from "./vista"

export const metadata: Metadata = { title: "Mi legajo" }

export default async function MiLegajo() {
  const usuario = await requerirUsuario()
  const entradas = await cargarLegajo(await crearClienteServidor(), usuario.id)
  return <VistaMiLegajo entradas={entradas} />
}
