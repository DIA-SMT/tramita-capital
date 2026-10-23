import { ShellAgente } from "@/components/agente/shell"
import { entorno } from "@/lib/entorno"
import { consultasRestantes } from "@/lib/ia/asistente"
import { crearClienteServidor } from "@/lib/supabase/servidor"
import { requerirUsuario, usuarioVista } from "@/lib/usuario"

export default async function LayoutAgente({ children }: LayoutProps<"/">) {
  const usuario = await requerirUsuario()
  const restantes = await consultasRestantes(await crearClienteServidor(), usuario.id)
  return (
    <ShellAgente usuario={usuarioVista(usuario)} migue={{ nombre: usuario.perfil.nombre, restantes, disponible: entorno.iaHabilitada }}>
      {children}
    </ShellAgente>
  )
}
