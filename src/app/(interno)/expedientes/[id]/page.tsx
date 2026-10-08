import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { cargarExpediente } from "@/lib/expedientes"
import { entorno } from "@/lib/entorno"
import { nombreCompleto } from "@/lib/dominio"
import { crearClienteServidor } from "@/lib/supabase/servidor"
import { firmaActiva } from "@/lib/firma-servidor"
import { requerirInterno } from "@/lib/usuario"
import { VistaExpediente } from "./vista"

export async function generateMetadata({ params }: PageProps<"/expedientes/[id]">): Promise<Metadata> {
  const { id } = await params
  const datos = await cargarExpediente(id)
  return { title: datos?.expediente.numero ?? "Expediente" }
}

export default async function Expediente({ params }: PageProps<"/expedientes/[id]">) {
  const [{ id }, usuario] = await Promise.all([params, requerirInterno()])
  const datos = await cargarExpediente(id)
  if (!datos) notFound()

  const supabase = await crearClienteServidor()
  const [{ data: iniciador }, firma] = await Promise.all([
    supabase.from("perfiles").select("nombre, apellido, legajo, reparticion, email").eq("id", datos.expediente.iniciador_id).maybeSingle(),
    firmaActiva(supabase, usuario.id),
  ])

  return (
    <VistaExpediente
      datos={datos}
      iniciador={iniciador}
      usuario={{
        id: usuario.id,
        nombre: nombreCompleto(usuario.perfil) === "—" ? usuario.perfil.email : nombreCompleto(usuario.perfil),
        esAdmin: usuario.esAdmin,
        membresias: usuario.membresias.map((m) => ({ area_id: m.area_id, rol: m.rol })),
        firma: firma ? { aclaracion: firma.aclaracion, cargo: firma.cargo, imagenUrl: firma.imagenUrl } : null,
      }}
      iaDisponible={entorno.iaHabilitada}
    />
  )
}
