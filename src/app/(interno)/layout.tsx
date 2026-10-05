import { ShellInterno } from "@/components/interno/shell"
import { ESTADOS_ACTIVOS } from "@/lib/dominio"
import { crearClienteServidor } from "@/lib/supabase/servidor"
import { requerirInterno, usuarioVista } from "@/lib/usuario"

export default async function LayoutInterno({ children }: LayoutProps<"/">) {
  const usuario = await requerirInterno()
  const supabase = await crearClienteServidor()
  const areas = usuario.membresias.map((m) => m.area_id)
  const { count } = areas.length
    ? await supabase.from("expedientes").select("id", { count: "exact", head: true }).in("area_actual_id", areas).in("estado", ESTADOS_ACTIVOS)
    : { count: 0 }

  return (
    <ShellInterno usuario={usuarioVista(usuario)} pendientes={count ?? 0}>
      {children}
    </ShellInterno>
  )
}
