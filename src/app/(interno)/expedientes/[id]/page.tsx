import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { cargarExpediente } from "@/lib/expedientes"
import { entorno } from "@/lib/entorno"
import { leerDatos, nombreCompleto } from "@/lib/dominio"
import { leerAutorizacion, type DatosCertificado } from "@/lib/certificado"
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
  const emite = datos.tipo.emision_automatica
  const [{ data: iniciador }, firma, { data: autorizacion }] = await Promise.all([
    supabase
      .from("perfiles")
      .select("nombre, apellido, legajo, reparticion, email, cuil, dependencia, categoria, fecha_ingreso, situacion_revista, liquida, liquida_al")
      .eq("id", datos.expediente.iniciador_id)
      .maybeSingle(),
    firmaActiva(supabase, usuario.id),
    // Certificado de trabajo (migración 001900): si la Dirección autorizó la firma automática.
    emite ? supabase.rpc("emision_automatica_autorizada", { p_tipo: datos.tipo.codigo }) : Promise.resolve({ data: null }),
  ])
  const certificado: DatosCertificado | null =
    emite && iniciador
      ? {
          agente: nombreCompleto(iniciador),
          legajo: iniciador.legajo,
          cuil: iniciador.cuil,
          dependencia: iniciador.dependencia,
          reparticion: iniciador.reparticion,
          categoria: iniciador.categoria,
          fechaIngreso: iniciador.fecha_ingreso,
          situacionRevista: iniciador.situacion_revista,
          liquida: iniciador.liquida,
          liquidaAl: iniciador.liquida_al,
          presentarAnte: leerDatos(datos.expediente.datos).presentar_ante ?? null,
          autorizacion: leerAutorizacion(autorizacion),
        }
      : null

  return (
    <VistaExpediente
      datos={datos}
      iniciador={iniciador}
      certificado={certificado}
      usuario={{
        id: usuario.id,
        nombre: nombreCompleto(usuario.perfil) === "—" ? usuario.perfil.email : nombreCompleto(usuario.perfil),
        esAdmin: usuario.esAdmin,
        membresias: usuario.membresias.map((m) => ({ area_id: m.area_id, rol: m.rol })),
        firma: firma ? { aclaracion: firma.aclaracion, cargo: firma.cargo } : null,
      }}
      iaDisponible={entorno.iaHabilitada}
    />
  )
}
