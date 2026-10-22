import { ShellInterno } from "@/components/interno/shell"
import { ESTADOS_ACTIVOS } from "@/lib/dominio"
import { crearClienteServidor } from "@/lib/supabase/servidor"
import { gestionaNovedades, requerirInterno, usuarioVista } from "@/lib/usuario"

export default async function LayoutInterno({ children }: LayoutProps<"/">) {
  const usuario = await requerirInterno()
  const supabase = await crearClienteServidor()
  const areas = usuario.membresias.map((m) => m.area_id)
  const conNovedades = gestionaNovedades(usuario)
  const [{ count }, { count: novedades }] = await Promise.all([
    areas.length
      ? supabase.from("expedientes").select("id", { count: "exact", head: true }).in("area_actual_id", areas).in("estado", ESTADOS_ACTIVOS)
      : Promise.resolve({ count: 0 }),
    conNovedades
      ? supabase.from("novedades_haberes").select("id", { count: "exact", head: true }).eq("estado", "pendiente")
      : Promise.resolve({ count: null }),
  ])

  return (
    <ShellInterno usuario={usuarioVista(usuario)} pendientes={count ?? 0} novedades={conNovedades ? (novedades ?? 0) : null}>
      {children}
    </ShellInterno>
  )
}
