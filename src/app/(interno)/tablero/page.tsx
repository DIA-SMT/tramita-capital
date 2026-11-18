import type { Metadata } from "next"
import { crearClienteServidor } from "@/lib/supabase/servidor"
import { esResponsable, nombreCompleto } from "@/lib/dominio"
import { entorno } from "@/lib/entorno"
import { requerirInterno } from "@/lib/usuario"
import { cargarTablero } from "@/lib/tablero"
import { leerAnalisisGuardado, type AnalisisIA } from "@/lib/tablero-ia"
import { VistaTablero } from "./vista"

export const metadata: Metadata = { title: "Tablero de impacto" }

export default async function Tablero({ searchParams }: PageProps<"/tablero">) {
  const usuario = await requerirInterno()
  const { dias: diasParam } = await searchParams
  const dias = [7, 30, 90].includes(Number(diasParam)) ? Number(diasParam) : 30

  const supabase = await crearClienteServidor()
  const [datos, { data: analisis }] = await Promise.all([
    cargarTablero(supabase, dias),
    // La última lectura con IA y el último análisis de observaciones: los ve todo el personal interno.
    supabase
      .from("ia_generaciones")
      .select("tipo, resultado, created_at, solicitado_por")
      .in("tipo", ["tablero", "observaciones"])
      .eq("estado", "ok")
      .is("expediente_id", null)
      .order("created_at", { ascending: false })
      .limit(10),
  ])
  const ultimos = (["lectura", "observaciones"] as const).map((tipo) => {
    const fila = (analisis ?? []).find((a) => leerAnalisisGuardado(a.resultado)?.tipo === tipo)
    const guardado = leerAnalisisGuardado(fila?.resultado)
    return fila && guardado ? { ...guardado, at: fila.created_at, por: fila.solicitado_por } : null
  })
  const ids = ultimos.flatMap((u) => (u?.por ? [u.por] : []))
  const { data: personas } = ids.length ? await supabase.rpc("perfiles_basicos", { p_ids: ids }) : { data: [] }
  const nombre = (id: string | null) => {
    const p = id ? (personas ?? []).find((x) => x.id === id) : null
    return p ? nombreCompleto(p) : null
  }
  const [lectura, observaciones] = ultimos.map((u): AnalisisIA | null => (u ? { ...u, por: nombre(u.por) } : null))

  return (
    <VistaTablero
      {...datos}
      ia={{
        disponible: entorno.iaHabilitada,
        puedeCorrer: esResponsable({ esAdmin: usuario.esAdmin, areas: usuario.membresias }),
        lectura,
        observaciones,
      }}
    />
  )
}
