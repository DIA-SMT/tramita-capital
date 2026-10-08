import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { DocumentoOficial } from "@/components/documento/documento-oficial"
import { nombreCompleto } from "@/lib/dominio"
import { entorno } from "@/lib/entorno"
import { codigoVerificacion, leerSello, urlImagenFirma } from "@/lib/firma"
import { qrVerificacion } from "@/lib/qr"
import { crearClienteServidor } from "@/lib/supabase/servidor"
import { requerirUsuario } from "@/lib/usuario"

export const metadata: Metadata = { title: "Documento oficial", robots: { index: false } }

export default async function Documento({ params }: PageProps<"/documento/[id]">) {
  const [{ id }, usuario] = await Promise.all([params, requerirUsuario()])
  const supabase = await crearClienteServidor()
  // RLS: si la persona no puede ver el expediente, no ve la foja.
  const { data: f } = await supabase
    .from("actuaciones")
    .select(
      "id, tipo, titulo, contenido, datos, foja, firmada_at, firmada_por, hash, estado, expediente:expedientes!actuaciones_expediente_id_fkey(id, numero, reservado), area:areas!actuaciones_area_id_fkey(nombre)",
    )
    .eq("id", id)
    .maybeSingle()
  if (!f || f.estado !== "firmada" || !f.expediente) notFound()

  const { data: personas } = f.firmada_por ? await supabase.rpc("perfiles_basicos", { p_ids: [f.firmada_por] }) : { data: [] }
  const sello = leerSello(f.datos)
  const url = f.hash ? `${entorno.sitio}/verificar?codigo=${codigoVerificacion(f.hash)}` : `${entorno.sitio}/verificar`

  return (
    <DocumentoOficial
      doc={{
        tipo: f.tipo,
        titulo: f.titulo,
        contenido: f.contenido,
        foja: f.foja,
        firmadaAt: f.firmada_at,
        hash: f.hash,
        sello,
        firmante: personas?.[0] ? nombreCompleto(personas[0]) : null,
        numeroExpediente: f.expediente.numero,
        area: f.area?.nombre ?? null,
        reservado: f.expediente.reservado,
      }}
      qrSvg={f.hash ? await qrVerificacion(url) : null}
      urlVerificacion={`${entorno.sitio}/verificar`}
      volver={usuario.esInterno || usuario.esAdmin ? `/expedientes/${f.expediente.id}` : `/mis-tramites/${f.expediente.id}`}
      imagenFirma={sello?.tipo === "olografa" ? urlImagenFirma(f.id) : null}
    />
  )
}
