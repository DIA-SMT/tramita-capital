import { NextResponse } from "next/server"
import { crearClienteServidor } from "@/lib/supabase/servidor"

/**
 * Imagen de la firma registrada estampada en una foja. Pasa por RLS dos veces:
 * la foja tiene que ser visible para quien pide, y el bucket `firmas` solo entrega
 * la imagen si está en una foja firmada de un expediente que esa persona puede ver.
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/firmas/[id]">) {
  const { id } = await ctx.params
  const supabase = await crearClienteServidor()
  const { data: foja } = await supabase.from("actuaciones").select("datos, estado").eq("id", id).maybeSingle()
  const firma = foja?.estado === "firmada" && foja.datos && typeof foja.datos === "object" && !Array.isArray(foja.datos) ? foja.datos.firma : null
  const ruta = firma && typeof firma === "object" && !Array.isArray(firma) && typeof firma.imagen_path === "string" ? firma.imagen_path : null
  if (!ruta) return NextResponse.json({ error: "Firma inexistente o sin permiso" }, { status: 404 })

  const { data, error } = await supabase.storage.from("firmas").createSignedUrl(ruta, 300)
  if (error || !data) return NextResponse.json({ error: "No se pudo obtener la firma" }, { status: 404 })
  return NextResponse.redirect(data.signedUrl, { headers: { "Cache-Control": "private, max-age=240" } })
}
