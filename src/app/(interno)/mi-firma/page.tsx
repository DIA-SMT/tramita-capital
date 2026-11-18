import type { Metadata } from "next"
import { leerAutorizacion } from "@/lib/certificado"
import { nombreCompleto } from "@/lib/dominio"
import { firmaActiva } from "@/lib/firma-servidor"
import { crearClienteServidor } from "@/lib/supabase/servidor"
import { areasDeFirma, requerirInterno } from "@/lib/usuario"
import { VistaMiFirma } from "./vista"

export const metadata: Metadata = { title: "Mi firma" }

export default async function MiFirma() {
  const usuario = await requerirInterno()
  const supabase = await crearClienteServidor()
  const [firma, { data: requiereClaveAnterior }, firmaResoluciones, { data: automaticos }] = await Promise.all([
    firmaActiva(supabase, usuario.id),
    supabase.rpc("firma_requiere_clave_anterior"),
    areasDeFirma(usuario),
    supabase.from("tipos_tramite").select("codigo, nombre").eq("emision_automatica", true).eq("activo", true).order("nombre"),
  ])
  // Emisión automática (migración 001900): la autoriza quien firma resoluciones, con su firma registrada.
  const tramites =
    firma && firmaResoluciones.length > 0
      ? await Promise.all(
          (automaticos ?? []).map(async (t) => {
            const { data } = await supabase.rpc("emision_automatica_autorizada", { p_tipo: t.codigo })
            return { codigo: t.codigo, nombre: t.nombre, autorizacion: leerAutorizacion(data) }
          }),
        )
      : []
  const nombre = nombreCompleto(usuario.perfil)
  return (
    <VistaMiFirma
      firma={firma}
      nombre={nombre === "—" ? "" : nombre}
      requiereClaveAnterior={requiereClaveAnterior === true}
      emisionAutomatica={tramites}
    />
  )
}
