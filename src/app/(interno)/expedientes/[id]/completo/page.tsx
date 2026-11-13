import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { CopiaExpediente } from "@/components/documento/copia-expediente"
import { nombreCompleto } from "@/lib/dominio"
import { entorno } from "@/lib/entorno"
import { cargarExpediente } from "@/lib/expedientes"
import { crearClienteServidor } from "@/lib/supabase/servidor"
import { requerirInterno } from "@/lib/usuario"

export async function generateMetadata({ params }: PageProps<"/expedientes/[id]/completo">): Promise<Metadata> {
  const { id } = await params
  const datos = await cargarExpediente(id)
  return { title: datos ? `${datos.expediente.numero} · completo` : "Expediente completo", robots: { index: false } }
}

/** Copia completa del expediente (carátula, fojas, hoja de ruta), lista para imprimir o guardar en PDF. */
export default async function ExpedienteCompletoPagina({ params }: PageProps<"/expedientes/[id]/completo">) {
  const [{ id }, usuario] = await Promise.all([params, requerirInterno()])
  const datos = await cargarExpediente(id)
  if (!datos) notFound()

  const supabase = await crearClienteServidor()
  const { data: iniciador } = await supabase
    .from("perfiles")
    .select("nombre, apellido, legajo, reparticion")
    .eq("id", datos.expediente.iniciador_id)
    .maybeSingle()

  return (
    <CopiaExpediente
      datos={datos}
      iniciador={iniciador}
      generada={{ por: nombreCompleto(usuario.perfil) === "—" ? usuario.perfil.email : nombreCompleto(usuario.perfil), at: new Date().toISOString() }}
      urlVerificacion={`${entorno.sitio}/verificar`}
      volver={`/expedientes/${id}`}
    />
  )
}
