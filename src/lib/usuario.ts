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
// Iguales a gestiona_novedades() y carga_novedades() en la base.
/** Bonificaciones, Liquidación y Dirección trabajan con las novedades de haberes. */
export const gestionaNovedades = (u: UsuarioActual) => u.esAdmin || u.membresias.some((m) => ["BONIF", "LIQ", "DIR"].includes(m.area.codigo))
/** Bonificaciones y Liquidación las cargan en Civitas. */
export const cargaNovedades = (u: UsuarioActual) => u.esAdmin || u.membresias.some((m) => ["BONIF", "LIQ"].includes(m.area.codigo))

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

/**
 * Firma resoluciones y todavía no registró su firma: tiene rol firmante o jefe en un área con paso
 * de firma en algún circuito (lo mismo que exige firmar_actuacion). Se le pide registrarla antes de empezar.
 */
export async function firmaPendiente(usuario: UsuarioActual) {
  const areas = usuario.membresias.filter((m) => m.rol === "firmante" || m.rol === "jefe").map((m) => m.area_id)
  if (areas.length === 0) return false
  const supabase = await crearClienteServidor()
  const [{ count: pasosFirma }, { count: firmas }] = await Promise.all([
    supabase.from("pasos_circuito").select("id", { count: "exact", head: true }).eq("accion", "firma").in("area_id", areas),
    supabase.from("firmas_registradas").select("id", { count: "exact", head: true }).eq("perfil_id", usuario.id).eq("activa", true).gte("version", 2),
  ])
  return (pasosFirma ?? 0) > 0 && (firmas ?? 0) === 0
}
