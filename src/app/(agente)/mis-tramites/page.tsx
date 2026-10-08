import type { Metadata } from "next"
import { crearClienteServidor } from "@/lib/supabase/servidor"
import { requerirUsuario } from "@/lib/usuario"
import { VistaMisTramites } from "./vista"

export const metadata: Metadata = { title: "Mis trámites" }

export default async function MisTramites() {
  const usuario = await requerirUsuario()
  const supabase = await crearClienteServidor()

  const { data: expedientes } = await supabase
    .from("expedientes")
    .select(
      "id, numero, asunto, estado, resultado, instancia, paso_actual, tipo_tramite_id, updated_at, created_at, tipo:tipos_tramite!expedientes_tipo_tramite_id_fkey(nombre, icono), area:areas!expedientes_area_actual_id_fkey(codigo, nombre)",
    )
    .eq("iniciador_id", usuario.id)
    .order("updated_at", { ascending: false })

  const lista = expedientes ?? []
  const tipos = [...new Set(lista.map((e) => e.tipo_tramite_id))]
  const { data: pasos } = tipos.length
    ? await supabase.from("pasos_circuito").select("tipo_tramite_id, orden, nombre, accion").in("tipo_tramite_id", tipos)
    : { data: [] }

  return (
    <VistaMisTramites
      usuarioId={usuario.id}
      nombre={usuario.perfil.nombre}
      tramites={lista.map((e) => ({ ...e, pasos: (pasos ?? []).filter((p) => p.tipo_tramite_id === e.tipo_tramite_id) }))}
    />
  )
}
