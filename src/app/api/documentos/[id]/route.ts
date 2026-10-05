import { NextResponse, type NextRequest } from "next/server"
import { crearClienteServidor } from "@/lib/supabase/servidor"

/** Descarga segura: verifica permisos con RLS y redirige a una URL firmada de 60 s. */
export async function GET(_: NextRequest, ctx: RouteContext<"/api/documentos/[id]">) {
  const { id } = await ctx.params
  const supabase = await crearClienteServidor()
  const { data: doc } = await supabase.from("documentos").select("storage_path, nombre_archivo").eq("id", id).maybeSingle()
  if (!doc) return NextResponse.json({ error: "Documento inexistente o sin permiso" }, { status: 404 })

  const { data, error } = await supabase.storage
    .from("expedientes")
    .createSignedUrl(doc.storage_path, 60, { download: doc.nombre_archivo })
  if (error || !data) return NextResponse.json({ error: "No se pudo generar el enlace" }, { status: 500 })

  return NextResponse.redirect(data.signedUrl)
}
