import type { Metadata } from "next"
import { areasDeFirma, requerirInterno } from "@/lib/usuario"
import { VistaAyuda } from "./vista"

export const metadata: Metadata = { title: "Del papel al sistema" }

export default async function Ayuda() {
  const usuario = await requerirInterno()
  const firmante = (await areasDeFirma(usuario)).length > 0
  const roles = new Set(usuario.membresias.map((m) => m.rol))
  // Administración ve el trabajo de todos los roles.
  const todo = usuario.esAdmin
  return (
    <VistaAyuda
      operador={todo || roles.has("operador") || (roles.has("jefe") && !firmante)}
      dictaminante={todo || roles.has("dictaminante")}
      firmante={todo || firmante}
      novedades={todo || usuario.membresias.some((m) => ["BONIF", "LIQ"].includes(m.area.codigo))}
    />
  )
}
