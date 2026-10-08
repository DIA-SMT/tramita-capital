import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database, Enum } from "@/lib/database.types"
import { fechaCorta, leerDatos, leerFormulario, nombreCompleto, TIPOS_ACTUACION } from "@/lib/dominio"
import { escaparDatos } from "@/lib/ia/cliente"

type Cliente = SupabaseClient<Database>

/**
 * Reúne todo lo que la IA necesita saber de un expediente.
 * Usa el cliente del usuario: si no puede ver el expediente, la IA tampoco.
 */
export async function contextoExpediente(supabase: Cliente, expedienteId: string, tipoDocumento: Enum<"tipo_actuacion">) {
  const { data: exp } = await supabase
    .from("expedientes")
    .select("*, tipo:tipos_tramite!expedientes_tipo_tramite_id_fkey(*)")
    .eq("id", expedienteId)
    .single()
  if (!exp || !exp.tipo) return null

  const [{ data: actuaciones }, { data: documentos }, { data: plantillas }, { data: personas }] = await Promise.all([
    supabase
      .from("actuaciones")
      .select("foja, tipo, titulo, contenido, firmada_at, estado")
      .eq("expediente_id", expedienteId)
      .eq("estado", "firmada")
      .order("foja"),
    supabase.from("documentos").select("nombre_archivo, requisito_clave, created_at").eq("expediente_id", expedienteId),
    supabase
      .from("plantillas")
      .select("nombre, cuerpo, instrucciones_ia")
      .eq("tipo_tramite_id", exp.tipo_tramite_id)
      .eq("tipo_documento", tipoDocumento)
      .eq("activa", true)
      .order("version", { ascending: false })
      .limit(1),
    supabase.rpc("perfiles_basicos", { p_ids: [exp.iniciador_id] }),
  ])

  // El personal interno puede leer legajo y repartición; si no, quedan como [COMPLETAR].
  const { data: iniciador } = await supabase
    .from("perfiles")
    .select("nombre, apellido, legajo, reparticion, categoria, dependencia")
    .eq("id", exp.iniciador_id)
    .maybeSingle()

  const campos = leerFormulario(exp.tipo.formulario)
  const datos = leerDatos(exp.datos)
  const plantilla = plantillas?.[0] ?? null

  const lineasDatos = campos.map((c) => `- ${escaparDatos(c.etiqueta)}: ${escaparDatos(datos[c.clave]) || "(sin dato)"}`)
  const lineasDocs = (documentos ?? []).map(
    (d) => `- ${escaparDatos(d.requisito_clave ?? "adjunto")}: ${escaparDatos(d.nombre_archivo)} (${fechaCorta(d.created_at)})`,
  )
  const fojas = (actuaciones ?? []).map(
    (a) =>
      `<foja n="${a.foja}" tipo="${TIPOS_ACTUACION[a.tipo]}" fecha="${a.firmada_at ? fechaCorta(a.firmada_at) : ""}">\n${escaparDatos(a.titulo)}\n${escaparDatos(a.contenido)}\n</foja>`,
  )

  const persona = iniciador ?? personas?.[0] ?? null
  const textoExpediente = [
    `<expediente numero="${exp.numero}" tipo="${escaparDatos(exp.tipo.nombre)}" reservado="${exp.reservado ? "sí" : "no"}" iniciado="${fechaCorta(exp.created_at)}">`,
    `<agente>${escaparDatos(nombreCompleto(persona))}; legajo: ${iniciador?.legajo ?? "[COMPLETAR]"}; categoría: ${escaparDatos(iniciador?.categoria) || "[COMPLETAR]"}; dependiente de: ${escaparDatos(iniciador?.dependencia) || "[COMPLETAR]"}; con prestación de servicios en: ${escaparDatos(iniciador?.reparticion) || "[COMPLETAR]"}</agente>`,
    `<asunto>${escaparDatos(exp.asunto)}</asunto>`,
    `<datos_formulario>\n${lineasDatos.join("\n")}\n</datos_formulario>`,
    `<documentacion>\n${lineasDocs.join("\n") || "(sin documentos adjuntos)"}\n</documentacion>`,
    `<actuaciones>\n${fojas.join("\n")}\n</actuaciones>`,
    `</expediente>`,
  ].join("\n")

  return { expediente: exp, tipo: exp.tipo, plantilla, textoExpediente }
}
