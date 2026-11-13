import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { CopiaExpediente } from "@/components/documento/copia-expediente"
import { nombreCompleto } from "@/lib/dominio"
import { entorno } from "@/lib/entorno"
import { cargarExpediente } from "@/lib/expedientes"
import { requerirUsuario } from "@/lib/usuario"

export const metadata: Metadata = { title: "Mi expediente completo", robots: { index: false } }

/** El agente descarga su propio expediente completo: lo mismo que ve, como copia para imprimir o guardar en PDF. */
export default async function MiExpedienteCompleto({ params }: PageProps<"/mis-tramites/[id]/completo">) {
  const [{ id }, usuario] = await Promise.all([params, requerirUsuario()])
  const datos = await cargarExpediente(id)
  if (!datos || datos.expediente.iniciador_id !== usuario.id) notFound()
  const p = usuario.perfil

  return (
    <CopiaExpediente
      datos={datos}
      iniciador={{ nombre: p.nombre, apellido: p.apellido, legajo: p.legajo, reparticion: p.reparticion }}
      generada={{ por: nombreCompleto(p) === "—" ? p.email : nombreCompleto(p), at: new Date().toISOString() }}
      urlVerificacion={`${entorno.sitio}/verificar`}
      volver={`/mis-tramites/${id}`}
      etiquetaVolver="Volver al trámite"
    />
  )
}
