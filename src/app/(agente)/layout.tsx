import { ShellAgente } from "@/components/agente/shell"
import { requerirUsuario, usuarioVista } from "@/lib/usuario"

export default async function LayoutAgente({ children }: LayoutProps<"/">) {
  const usuario = await requerirUsuario()
  return <ShellAgente usuario={usuarioVista(usuario)}>{children}</ShellAgente>
}
