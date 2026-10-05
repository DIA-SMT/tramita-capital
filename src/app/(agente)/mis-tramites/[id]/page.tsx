import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { cargarExpediente } from "@/lib/expedientes"
import { requerirUsuario } from "@/lib/usuario"
import { VistaSeguimiento } from "./vista"

export async function generateMetadata({ params }: PageProps<"/mis-tramites/[id]">): Promise<Metadata> {
  const { id } = await params
  const datos = await cargarExpediente(id)
  return { title: datos ? datos.expediente.numero : "Trámite" }
}

export default async function DetalleTramite({ params, searchParams }: PageProps<"/mis-tramites/[id]">) {
  const [{ id }, { nuevo }, usuario] = await Promise.all([params, searchParams, requerirUsuario()])
  const datos = await cargarExpediente(id)
  if (!datos || datos.expediente.iniciador_id !== usuario.id) notFound()
  return <VistaSeguimiento datos={datos} nuevo={Boolean(nuevo)} />
}
