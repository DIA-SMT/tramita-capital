import type { Metadata } from "next"
import { crearClienteServidor } from "@/lib/supabase/servidor"
import { requerirInterno } from "@/lib/usuario"
import { VistaParametrizacion } from "./vista"

export const metadata: Metadata = { title: "Trámites y circuitos" }

export default async function Parametrizacion() {
  await requerirInterno()
  const supabase = await crearClienteServidor()
  const [{ data: tipos }, { data: pasos }, { data: plantillas }] = await Promise.all([
    supabase.from("tipos_tramite").select("*").order("categoria").order("nombre"),
    supabase
      .from("pasos_circuito")
      .select("tipo_tramite_id, orden, nombre, plazo_horas, controles, revisa, genera, destino_final, area:areas!pasos_circuito_area_id_fkey(nombre)")
      .order("orden"),
    supabase.from("plantillas").select("tipo_tramite_id, tipo_documento, nombre, version").eq("activa", true),
  ])
  return <VistaParametrizacion tipos={tipos ?? []} pasos={pasos ?? []} plantillas={plantillas ?? []} />
}
