import type { Metadata } from "next"
import { cargarExpediente } from "@/lib/expedientes"
import { colaDeFirmaDe } from "@/lib/firmar"
import { firmaActiva } from "@/lib/firma-servidor"
import { nombreCompleto, ROLES } from "@/lib/dominio"
import { crearClienteServidor } from "@/lib/supabase/servidor"
import { areasDeFirma, requerirInterno } from "@/lib/usuario"
import { VistaFirmar } from "./vista"

export const metadata: Metadata = { title: "Para firmar" }

export default async function Firmar({ searchParams }: PageProps<"/firmar">) {
  const [usuario, sp] = await Promise.all([requerirInterno(), searchParams])
  const areas = await areasDeFirma(usuario)
  const supabase = await crearClienteServidor()
  const [cola, firma] = await Promise.all([colaDeFirmaDe(usuario).then((c) => c ?? []), firmaActiva(supabase, usuario.id)])

  // El pedido por la dirección, o el primero que espera firma.
  const pedido = typeof sp.exp === "string" ? sp.exp : null
  const elegido = cola.find((i) => i.id === pedido) ?? cola.find((i) => !i.firmada) ?? cola[0] ?? null
  const datos = elegido ? await cargarExpediente(elegido.id) : null
  const { data: iniciador } = datos
    ? await supabase.from("perfiles").select("nombre, apellido, legajo, reparticion").eq("id", datos.expediente.iniciador_id).maybeSingle()
    : { data: null }

  // Después de firmar, el próximo que espera firma (sin contar el que se acaba de firmar).
  const proximo = cola.find((i) => !i.firmada && i.id !== elegido?.id)
  const membresia = usuario.membresias.find((m) => areas.includes(m.area_id))

  return (
    <VistaFirmar
      firmaResoluciones={areas.length > 0}
      cola={cola}
      elegido={datos ? { datos, iniciador } : null}
      firmante={{
        nombre: nombreCompleto(usuario.perfil) === "—" ? usuario.perfil.email : nombreCompleto(usuario.perfil),
        cargo: membresia ? `${ROLES[membresia.rol]} de ${membresia.area.nombre}` : "",
      }}
      firmaRegistrada={firma ? { aclaracion: firma.aclaracion, cargo: firma.cargo } : null}
      enlace={(id) => `/firmar?exp=${id}`}
      rutaTrasFirmar={proximo ? `/firmar?exp=${proximo.id}` : "/firmar"}
    />
  )
}
