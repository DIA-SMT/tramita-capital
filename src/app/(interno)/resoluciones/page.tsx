import type { Metadata } from "next"
import { leerDatos, nombreCompleto } from "@/lib/dominio"
import { leerProtocolo, leerSello } from "@/lib/firma"
import { crearClienteServidor } from "@/lib/supabase/servidor"
import { requerirInterno } from "@/lib/usuario"
import type { FilaResolucion } from "@/lib/vistas"
import { VistaResoluciones } from "./vista"

export const metadata: Metadata = { title: "Registro de resoluciones" }

/** El sistema empezó a numerar resoluciones en 2026. */
const PRIMER_ANIO = 2026
const anioEnTucuman = () => Number(new Intl.DateTimeFormat("es-AR", { year: "numeric", timeZone: "America/Argentina/Tucuman" }).format(new Date()))

export default async function Resoluciones({ searchParams }: PageProps<"/resoluciones">) {
  const [usuario, sp] = await Promise.all([requerirInterno(), searchParams])
  const actual = anioEnTucuman()
  const pedido = Number(sp.anio)
  const anio = Number.isInteger(pedido) && pedido >= PRIMER_ANIO && pedido <= actual ? pedido : actual

  // RLS: cada persona ve las resoluciones de los expedientes que puede ver (los reservados, solo quien está autorizado).
  const supabase = await crearClienteServidor()
  const { data } = await supabase
    .from("actuaciones")
    .select(
      "id, titulo, datos, firmada_at, firmada_por, expediente:expedientes!actuaciones_expediente_id_fkey(id, numero, reservado, iniciador_id, tipo:tipos_tramite!expedientes_tipo_tramite_id_fkey(nombre, icono))",
    )
    .eq("tipo", "resolucion")
    .eq("estado", "firmada")
    .gte("firmada_at", `${anio}-01-01T00:00:00-03:00`)
    .lt("firmada_at", `${anio + 1}-01-01T00:00:00-03:00`)
    .order("firmada_at", { ascending: false })
    .limit(2000)

  const ids = new Set<string>()
  for (const r of data ?? []) {
    if (r.expediente) ids.add(r.expediente.iniciador_id)
    if (r.firmada_por) ids.add(r.firmada_por)
  }
  const { data: personas } = ids.size ? await supabase.rpc("perfiles_basicos", { p_ids: [...ids] }) : { data: [] }
  const nombre = new Map((personas ?? []).map((p) => [p.id, nombreCompleto(p)]))

  const filas: FilaResolucion[] = (data ?? []).flatMap((r) => {
    if (!r.expediente || !r.firmada_at) return []
    const sello = leerSello(r.datos)
    const sentido = leerDatos(r.datos).sentido
    return [
      {
        id: r.id,
        numero: leerProtocolo(r.datos)?.numero ?? r.titulo.match(/N\.º\s*(\S+)/)?.[1] ?? null,
        firmadaAt: r.firmada_at,
        sentido: sentido === "hace_lugar" || sentido === "rechaza" ? sentido : null,
        olografa: sello?.tipo === "olografa",
        firmante: sello?.aclaracion ?? (r.firmada_por ? (nombre.get(r.firmada_por) ?? null) : null),
        agente: nombre.get(r.expediente.iniciador_id) ?? "—",
        agenteId: r.expediente.iniciador_id,
        tramite: { nombre: r.expediente.tipo?.nombre ?? "Trámite", icono: r.expediente.tipo?.icono ?? null },
        expediente: { id: r.expediente.id, numero: r.expediente.numero, reservado: r.expediente.reservado },
      },
    ]
  })

  return (
    <VistaResoluciones
      filas={filas}
      anio={anio}
      anios={Array.from({ length: actual - PRIMER_ANIO + 1 }, (_, i) => actual - i)}
      veReservados={usuario.esAdmin || usuario.membresias.some((m) => m.ve_reservados)}
    />
  )
}
