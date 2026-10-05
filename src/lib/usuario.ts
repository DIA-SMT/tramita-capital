import "server-only"
import { cache } from "react"
import { redirect } from "next/navigation"
import { crearClienteServidor } from "@/lib/supabase/servidor"
import type { Enum, Fila } from "@/lib/database.types"
import { iniciales, nombreCompleto, ROLES } from "@/lib/dominio"
import type { UsuarioVista } from "@/lib/vistas"

export type Membresia = {
  area_id: string
  rol: Enum<"rol_area">
  ve_reservados: boolean
  area: Pick<Fila<"areas">, "id" | "codigo" | "nombre">
}

export type UsuarioActual = {
  id: string
  perfil: Fila<"perfiles">
  membresias: Membresia[]
  esInterno: boolean
  esAdmin: boolean
}

/** Usuario de la request actual (memoizado por request). */
export const obtenerUsuario = cache(async (): Promise<UsuarioActual | null> => {
  const supabase = await crearClienteServidor()
  const { data } = await supabase.auth.getClaims()
  const id = data?.claims?.sub
  if (!id) return null

  const [{ data: perfil }, { data: membresias }] = await Promise.all([
    supabase.from("perfiles").select("*").eq("id", id).single(),
    supabase
      .from("miembros_area")
      .select("area_id, rol, ve_reservados, area:areas!miembros_area_area_id_fkey(id, codigo, nombre)")
      .eq("perfil_id", id),
  ])
  if (!perfil) return null

  const lista = (membresias ?? []).filter((m) => m.area) as Membresia[]
  return {
    id,
    perfil,
    membresias: lista,
    esInterno: lista.length > 0,
    esAdmin: perfil.es_admin,
  }
})

export function datosMenu(usuario: UsuarioActual) {
  return {
    nombre: nombreCompleto(usuario.perfil) === "—" ? usuario.perfil.email : nombreCompleto(usuario.perfil),
    email: usuario.perfil.email,
    iniciales: iniciales(usuario.perfil),
    areas: usuario.membresias.map((m) => ({ nombre: m.area.nombre, rol: ROLES[m.rol] })),
    esInterno: usuario.esInterno || usuario.esAdmin,
  }
}

/** Datos del usuario que necesitan las estructuras (shells) de la app. */
export function usuarioVista(usuario: UsuarioActual): UsuarioVista {
  return {
    id: usuario.id,
    menu: datosMenu(usuario),
    areas: usuario.membresias.map((m) => ({ id: m.area_id, nombre: m.area.nombre, rol: m.rol })),
    esInterno: usuario.esInterno || usuario.esAdmin,
    esAdmin: usuario.esAdmin,
    perfilIncompleto: !usuario.perfil.nombre.trim() || !usuario.perfil.telefono,
  }
}

export async function requerirUsuario() {
  const usuario = await obtenerUsuario()
  if (!usuario) redirect("/ingresar")
  return usuario
}

export async function requerirInterno() {
  const usuario = await requerirUsuario()
  if (!usuario.esInterno && !usuario.esAdmin) redirect("/mis-tramites")
  return usuario
}
