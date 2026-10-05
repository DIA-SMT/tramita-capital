import type { Metadata } from "next"
import { crearClienteServidor } from "@/lib/supabase/servidor"
import { Catalogo } from "./catalogo"
import { EncabezadoCatalogo } from "./encabezado"

export const metadata: Metadata = { title: "Iniciar un trámite" }

export default async function NuevoTramite() {
  const supabase = await crearClienteServidor()
  const { data: tipos } = await supabase
    .from("tipos_tramite")
    .select("codigo, nombre, descripcion, categoria, icono, plazo_dias, requisitos, reservado")
    .eq("activo", true)
    .order("categoria")
    .order("nombre")

  return (
    <div className="space-y-6">
      <EncabezadoCatalogo />
      <Catalogo tipos={tipos ?? []} />
    </div>
  )
}
