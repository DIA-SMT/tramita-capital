import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import { leerDatos, nombreCompleto } from "@/lib/dominio"
import { leerProtocolo } from "@/lib/firma"
import type { EntradaLegajo, FichaAgente } from "@/lib/vistas"

type Cliente = SupabaseClient<Database>

/**
 * Legajo digital de un agente: lo que el sistema archivó de sus trámites (la resolución al firmarla y
 * la documentación final al archivar). Pasa por RLS: el agente ve todo lo suyo y el personal, lo de
 * los expedientes que puede ver.
 */
export async function cargarLegajo(supabase: Cliente, perfilId: string): Promise<EntradaLegajo[]> {
  const { data } = await supabase
    .from("legajo_documentos")
    .select(
      "id, tipo, titulo, created_at, expediente:expedientes!legajo_documentos_expediente_id_fkey(id, numero, tipo:tipos_tramite!expedientes_tipo_tramite_id_fkey(nombre)), actuacion:actuaciones!legajo_documentos_actuacion_id_fkey(id, titulo, datos), documento:documentos!legajo_documentos_documento_id_fkey(id, nombre_archivo, tamano_bytes)",
    )
    .eq("perfil_id", perfilId)
    .order("created_at", { ascending: false })
    .limit(500)

  return (data ?? []).map((l) => {
    const sentido = l.actuacion ? leerDatos(l.actuacion.datos).sentido : undefined
    return {
      id: l.id,
      titulo: l.actuacion?.titulo ?? l.titulo,
      fecha: l.created_at,
      tramite: l.expediente ? { expedienteId: l.expediente.id, numero: l.expediente.numero, nombre: l.expediente.tipo?.nombre ?? "Trámite" } : null,
      resolucion:
        l.tipo === "resolucion"
          ? {
              fojaId: l.actuacion?.id ?? null,
              numero: (l.actuacion && leerProtocolo(l.actuacion.datos)?.numero) ?? l.titulo.match(/N\.º\s*(\S+)/)?.[1] ?? null,
              sentido: sentido === "hace_lugar" || sentido === "rechaza" ? sentido : null,
            }
          : null,
      documento: l.documento ? { id: l.documento.id, nombre: l.documento.nombre_archivo, bytes: l.documento.tamano_bytes } : null,
    }
  })
}

/**
 * Ficha de un agente para el personal de Capital Humano. Los datos del legajo solo si la persona
 * puede verlos (puede_ver_perfil); si no, solo el nombre. Los trámites y el legajo, los que RLS deja.
 */
export async function cargarFichaAgente(supabase: Cliente, perfilId: string, conNovedades: boolean): Promise<FichaAgente | null> {
  const [{ data: perfil }, { data: basicos }, { data: expedientes }, legajo, { data: novedades }] = await Promise.all([
    supabase.from("perfiles").select("nombre, apellido, legajo, cuil, reparticion, categoria, email, telefono").eq("id", perfilId).maybeSingle(),
    supabase.rpc("perfiles_basicos", { p_ids: [perfilId] }),
    supabase
      .from("expedientes")
      .select(
        "id, numero, asunto, estado, resultado, reservado, created_at, resuelto_at, tipo:tipos_tramite!expedientes_tipo_tramite_id_fkey(nombre, icono), area:areas!expedientes_area_actual_id_fkey(nombre)",
      )
      .eq("iniciador_id", perfilId)
      .order("created_at", { ascending: false })
      .limit(200),
    cargarLegajo(supabase, perfilId),
    conNovedades
      ? supabase
          .from("novedades_haberes")
          .select("id, concepto, movimiento, vigencia_desde, estado, resolucion_numero")
          .eq("perfil_id", perfilId)
          .neq("estado", "anulada")
          .order("vigencia_desde", { ascending: false })
      : Promise.resolve({ data: null }),
  ])
  const nombre = perfil ? nombreCompleto(perfil) : basicos?.[0] ? nombreCompleto(basicos[0]) : null
  if (!nombre) return null

  return {
    id: perfilId,
    nombre,
    perfil: perfil
      ? { legajo: perfil.legajo, cuil: perfil.cuil, reparticion: perfil.reparticion, categoria: perfil.categoria, email: perfil.email, telefono: perfil.telefono }
      : null,
    tramites: (expedientes ?? []).map(({ tipo, area, ...e }) => ({ ...e, tipo: { nombre: tipo?.nombre ?? "Trámite", icono: tipo?.icono ?? null }, area: area?.nombre ?? null })),
    legajo,
    novedades: novedades
      ? novedades.map((n) => ({
          id: n.id,
          concepto: n.concepto,
          movimiento: n.movimiento,
          vigenciaDesde: n.vigencia_desde,
          estado: n.estado,
          resolucion: n.resolucion_numero,
        }))
      : null,
  }
}
