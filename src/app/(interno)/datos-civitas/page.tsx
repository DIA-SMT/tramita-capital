import type { Metadata } from "next"
import { nombreCompleto } from "@/lib/dominio"
import { crearClienteServidor } from "@/lib/supabase/servidor"
import { gestionaCivitas, requerirInterno } from "@/lib/usuario"
import { VistaDatosCivitas, type ImportacionVista } from "./vista"

export const metadata: Metadata = { title: "Datos de Civitas" }

export default async function DatosCivitas() {
  const usuario = await requerirInterno()
  if (!gestionaCivitas(usuario)) return <VistaDatosCivitas historial={[]} sinAcceso />

  const supabase = await crearClienteServidor()
  const { data } = await supabase
    .from("importaciones_civitas")
    .select("id, archivo, datos_al, filas, actualizados, sin_coincidencia, created_at, perfil_id")
    .order("created_at", { ascending: false })
    .limit(10)
  const ids = [...new Set((data ?? []).map((i) => i.perfil_id))]
  const { data: personas } = ids.length ? await supabase.rpc("perfiles_basicos", { p_ids: ids }) : { data: [] }
  const nombres = new Map((personas ?? []).map((p) => [p.id, nombreCompleto(p)]))
  const historial: ImportacionVista[] = (data ?? []).map((i) => ({
    id: i.id,
    archivo: i.archivo,
    datosAl: i.datos_al,
    filas: i.filas,
    actualizados: i.actualizados,
    sinCoincidencia: i.sin_coincidencia,
    creadaAt: i.created_at,
    por: nombres.get(i.perfil_id) ?? "—",
  }))
  return <VistaDatosCivitas historial={historial} />
}
