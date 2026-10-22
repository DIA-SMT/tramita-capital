import type { Metadata } from "next"
import { crearClienteServidor } from "@/lib/supabase/servidor"
import { leerDetalle, type FilaNovedad } from "@/lib/novedades"
import { nombreCompleto } from "@/lib/dominio"
import { cargaNovedades, gestionaNovedades, requerirInterno } from "@/lib/usuario"
import { VistaNovedades } from "./vista"

export const metadata: Metadata = { title: "Novedades de haberes" }

export default async function Novedades() {
  const usuario = await requerirInterno()
  if (!gestionaNovedades(usuario)) return <VistaNovedades novedades={[]} puedeCargar={false} sinAcceso />

  const supabase = await crearClienteServidor()
  const { data } = await supabase
    .from("novedades_haberes")
    .select(
      "id, estado, movimiento, concepto, codigo_tramite, vigencia_desde, vigencia_hasta, detalle, observaciones, expediente_id, numero_expediente, resolucion_numero, resolucion_fecha, created_at, cargada_at, referencia_carga, perfil:perfiles!novedades_haberes_perfil_id_fkey(nombre, apellido, legajo, cuil)",
    )
    .order("created_at", { ascending: false })
    .limit(1000)

  const novedades: FilaNovedad[] = (data ?? []).map((n) => ({
    id: n.id,
    estado: n.estado,
    movimiento: n.movimiento,
    concepto: n.concepto,
    codigo: n.codigo_tramite,
    vigenciaDesde: n.vigencia_desde,
    vigenciaHasta: n.vigencia_hasta,
    detalle: leerDetalle(n.detalle),
    observaciones: n.observaciones,
    agente: nombreCompleto(n.perfil),
    legajo: n.perfil?.legajo ?? null,
    cuil: n.perfil?.cuil ?? null,
    expediente: { id: n.expediente_id, numero: n.numero_expediente },
    resolucion: { numero: n.resolucion_numero, fecha: n.resolucion_fecha },
    registradaAt: n.created_at,
    cargadaAt: n.cargada_at,
    referencia: n.referencia_carga,
  }))

  return <VistaNovedades novedades={novedades} puedeCargar={cargaNovedades(usuario)} />
}
