import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { leerFormulario, leerRequisitos } from "@/lib/dominio"
import { crearClienteServidor } from "@/lib/supabase/servidor"
import { VistaFormularioNuevo } from "./vista"

export async function generateMetadata({ params }: PageProps<"/mis-tramites/nuevo/[codigo]">): Promise<Metadata> {
  const { codigo } = await params
  return { title: `Nuevo trámite ${decodeURIComponent(codigo)}` }
}

export default async function FormularioNuevo({ params }: PageProps<"/mis-tramites/nuevo/[codigo]">) {
  const { codigo } = await params
  const supabase = await crearClienteServidor()
  const { data: tipo } = await supabase
    .from("tipos_tramite")
    .select("id, codigo, nombre, descripcion, icono, plazo_dias, reservado, requisitos, formulario")
    .eq("codigo", decodeURIComponent(codigo))
    .eq("activo", true)
    .maybeSingle()
  if (!tipo) notFound()

  const { data: pasos } = await supabase
    .from("pasos_circuito")
    .select("orden, nombre, area:areas!pasos_circuito_area_id_fkey(nombre)")
    .eq("tipo_tramite_id", tipo.id)
    .order("orden")

  return (
    <VistaFormularioNuevo
      tipo={{
        ...tipo,
        campos: leerFormulario(tipo.formulario),
        requisitos: leerRequisitos(tipo.requisitos),
        pasos: (pasos ?? []).map((p) => ({ orden: p.orden, nombre: p.nombre, area: p.area?.nombre ?? "" })),
      }}
    />
  )
}
