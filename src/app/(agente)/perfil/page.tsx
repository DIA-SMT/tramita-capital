import type { Metadata } from "next"
import { requerirUsuario } from "@/lib/usuario"
import { VistaPerfil } from "./vista"

export const metadata: Metadata = { title: "Mi perfil" }

export default async function Perfil() {
  const { perfil } = await requerirUsuario()
  return <VistaPerfil perfil={perfil} />
}
