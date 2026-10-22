// Asistente del agente (módulo 6): los datos que consulta, armados igual desde Supabase
// o desde la demo, y las respuestas simuladas de la vista previa (sin IA ni login).
import type { Enum, Json } from "@/lib/database.types"
import { ESTADOS_ACTIVOS, estadoVisible, fechaCorta, leerRequisitos, TIPOS_ACTUACION, type Requisito } from "@/lib/dominio"
import { MOVIMIENTOS, periodo, type NovedadExpediente } from "@/lib/novedades"

/** Consultas por persona y por día (portal y Migue juntos). */
export const LIMITE_DIARIO_ASISTENTE = 30

export type TramiteAsistente = {
  id: string
  numero: string
  tipo: string
  codigo: string
  asunto: string
  /** Estado en el lenguaje del agente. */
  estado: string
  activo: boolean
  observado: boolean
  iniciado: string
  lleva: string
  plazoDias: number | null
  venceAt: string | null
  reservado: boolean
  area: string | null
  paso: { orden: number; total: number; nombre: string } | null
  siguiente: { nombre: string; area: string } | null
  /** Documentación que todavía no presentó (la obligatoria se exige al iniciar). */
  pendientes: Requisito[]
  observacion: string | null
  resolucion: { titulo: string; fecha: string | null } | null
  resultado: string | null
  /** Novedades de haberes: qué se informó a Liquidación y si ya está cargado en Civitas. */
  haberes: { movimiento: string; concepto: string; desde: string; hasta: string | null; cargada: boolean; registrada: string; cargadaAt: string | null }[]
  /** Solo para el trámite sobre el que se consulta. */
  fojas: { foja: number | null; tipo: string; titulo: string; fecha: string | null; contenido: string }[]
}

export type TipoAsistente = {
  codigo: string
  nombre: string
  descripcion: string | null
  plazoDias: number | null
  requisitos: Requisito[]
  normativa: string | null
}

export type DatosAsistente = {
  nombre: string
  tramites: TramiteAsistente[]
  catalogo: TipoAsistente[]
  /** Trámite sobre el que se abrió la consulta, si hay. */
  enfocado: string | null
}

/** Lo mínimo de un expediente para resumirlo (ExpedienteCompleto lo cumple). */
export type EntradaTramite = {
  expediente: {
    id: string
    numero: string
    asunto: string
    estado: Enum<"estado_expediente">
    resultado: string | null
    instancia: number
    paso_actual: number
    created_at: string
    resuelto_at: string | null
    vence_at: string | null
    reservado: boolean
  }
  tipo: { codigo: string; nombre: string; plazo_dias: number | null; requisitos: Json }
  area: { codigo: string; nombre: string } | null
  pasos: { orden: number; nombre: string; accion: Enum<"accion_paso">; area: string }[]
  fojas: { foja: number | null; tipo: Enum<"tipo_actuacion">; titulo: string; contenido: string | null; firmada_at: string | null }[]
  documentos: { requisito_clave: string | null }[]
  novedades?: NovedadExpediente[]
}

function duracion(desde: string, hasta: string | null) {
  const dias = ((hasta ? new Date(hasta) : new Date()).getTime() - new Date(desde).getTime()) / 86_400_000
  return dias < 1 ? `${Math.max(1, Math.round(dias * 24))} h` : `${dias.toLocaleString("es-AR", { maximumFractionDigits: 1 })} días`
}

export function armarTramite(t: EntradaTramite, detallado = false): TramiteAsistente {
  const { expediente: e, tipo, area } = t
  const pasos = [...t.pasos].sort((a, b) => a.orden - b.orden)
  const fojas = [...t.fojas].sort((a, b) => (a.foja ?? 0) - (b.foja ?? 0))
  const activo = ESTADOS_ACTIVOS.includes(e.estado)
  const actual = pasos.find((p) => p.orden === e.paso_actual)
  const siguiente = pasos.find((p) => p.orden > e.paso_actual)
  const presentados = new Set(t.documentos.map((d) => d.requisito_clave))
  const observacion = e.estado === "observado" ? fojas.findLast((f) => f.tipo === "observacion") : undefined
  const resolucion = fojas.findLast((f) => f.tipo === "resolucion")

  return {
    id: e.id,
    numero: e.numero,
    tipo: tipo.nombre,
    codigo: tipo.codigo,
    asunto: e.asunto,
    estado: estadoVisible({ estado: e.estado, resultado: e.resultado, instancia: e.instancia, areaCodigo: area?.codigo, accionPaso: actual?.accion }).etiqueta,
    activo,
    observado: e.estado === "observado",
    iniciado: e.created_at,
    lleva: duracion(e.created_at, e.resuelto_at),
    plazoDias: tipo.plazo_dias,
    venceAt: activo ? e.vence_at : null,
    reservado: e.reservado,
    area: activo ? (area?.nombre ?? null) : null,
    paso: activo && actual ? { orden: actual.orden, total: pasos.length, nombre: actual.nombre } : null,
    siguiente: activo && siguiente ? { nombre: siguiente.nombre, area: siguiente.area } : null,
    pendientes: activo ? leerRequisitos(tipo.requisitos).filter((r) => !presentados.has(r.clave)) : [],
    observacion: observacion?.contenido ?? null,
    resolucion: resolucion ? { titulo: resolucion.titulo, fecha: resolucion.firmada_at } : null,
    resultado: e.resultado === "aprobado" ? "se hizo lugar" : e.resultado === "rechazado" ? "no se hizo lugar" : null,
    haberes: (t.novedades ?? [])
      .filter((n) => n.estado !== "anulada")
      .map((n) => ({
        movimiento: MOVIMIENTOS[n.movimiento].toLowerCase(),
        concepto: n.concepto,
        desde: periodo(n.vigencia_desde),
        hasta: n.vigencia_hasta ? periodo(n.vigencia_hasta) : null,
        cargada: n.estado === "cargada",
        registrada: n.created_at,
        cargadaAt: n.cargada_at,
      })),
    fojas: detallado
      ? fojas.map((f) => ({ foja: f.foja, tipo: TIPOS_ACTUACION[f.tipo], titulo: f.titulo, fecha: f.firmada_at, contenido: (f.contenido ?? "").slice(0, 1500) }))
      : [],
  }
}

/** La normativa sin cargar figura como "[COMPLETAR…]" en el catálogo. */
export const normativaCargada = (n: string | null) => (n && !n.includes("[COMPLETAR") ? n : null)

export function sugerenciasAsistente(conTramite: boolean) {
  return conTramite
    ? ["¿En qué está este trámite?", "¿Qué sigue y cuánto puede tardar?", "¿Me falta presentar algo?", "¿Cuándo se refleja en mi sueldo?"]
    : [
        "¿En qué están mis trámites?",
        "¿Tengo algo pendiente?",
        "¿Cuándo se refleja en mi sueldo?",
        "¿Qué necesito para el adicional por título universitario?",
        "¿Cuánto tarda una licencia por examen?",
      ]
}

// ---------------------------------------------------------------------
// Respuestas simuladas (vista previa)
// ---------------------------------------------------------------------
const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()

const GENERICAS = new Set(["licencia", "adicional", "pago", "asignacion", "familiar", "bajas", "para", "motivos"])

function tipoMencionado(q: string, catalogo: TipoAsistente[]) {
  const palabras = q.split(/[^a-z0-9]+/).filter((w) => w.length >= 4)
  let mejor: TipoAsistente | null = null
  let puntos = 0
  for (const t of catalogo) {
    const claves = normalizar(t.nombre)
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 4 && !GENERICAS.has(w))
    const p = claves.filter((c) => palabras.some((w) => w.startsWith(c.slice(0, 5)) || c.startsWith(w.slice(0, 5)))).length
    if (p > puntos) [mejor, puntos] = [t, p]
  }
  return mejor
}

export function respuestaDemo(pregunta: string, d: DatosAsistente, base = ""): string {
  const q = normalizar(pregunta)
  const enlace = (t: TramiteAsistente) => `${base}/mis-tramites/${t.id}`
  const tipo = tipoMencionado(q, d.catalogo)
  const enfocado = d.tramites.find((t) => t.id === d.enfocado) ?? null
  const activos = d.tramites.filter((t) => t.activo)
  const sobre = enfocado ? [enfocado] : activos

  const detalle = (t: TramiteAsistente) => {
    const partes = [`Tu **${t.tipo}** (${t.numero}) está **${t.estado.toLowerCase()}**.`]
    if (t.observado && t.observacion) partes.push(`Capital Humano te pidió esta corrección: «${t.observacion.replace(/\.\s*$/, "")}». Respondela desde [el trámite](${enlace(t)}) y sigue su curso.`)
    else if (t.area) partes.push(`Ahora lo tiene ${t.area}${t.paso ? `, en el paso ${t.paso.orden} de ${t.paso.total}: ${t.paso.nombre.toLowerCase()}` : ""}.`)
    if (t.siguiente && !t.observado) partes.push(`Después sigue ${t.siguiente.nombre.toLowerCase()} (${t.siguiente.area}).`)
    if (t.resolucion) partes.push(`La resolución ya está firmada${t.resolucion.fecha ? ` desde el ${fechaCorta(t.resolucion.fecha)}` : ""}${t.resultado ? ` y ${t.resultado}` : ""}: [verla](${enlace(t)}).`)
    partes.push(`Lleva ${t.lleva}${t.plazoDias ? ` y el objetivo es resolverlo en ${t.plazoDias} días` : ""}.`)
    return partes.join(" ")
  }

  const requisitos = (t: TipoAsistente) => {
    const lista = t.requisitos.map((r) => `- ${r.nombre}${r.obligatorio ? "" : " (se puede presentar después)"}${r.descripcion ? `: ${r.descripcion}` : ""}`)
    const normativa = normativaCargada(t.normativa)
    return [
      `Para el trámite de **${t.nombre.toLowerCase()}** te van a pedir:`,
      lista.join("\n") || "- No tiene documentación cargada en el catálogo.",
      `${t.plazoDias ? `El objetivo es resolverlo en ${t.plazoDias} días. ` : ""}Podés iniciarlo desde [acá](${base}/mis-tramites/nuevo/${t.codigo}) y el sistema te guía paso a paso.`,
      normativa ? `Normativa: ${normativa}.` : "",
    ]
      .filter(Boolean)
      .join("\n\n")
  }

  if (tipo && /requisit|necesit|piden|pide|present|document|papel|como (inicio|hago|pido|saco|tramito)|iniciar|quiero/.test(q)) return requisitos(tipo)

  if (/haber|sueldo|recibo|cobr|liquidaci|civitas|impact/.test(q)) {
    const conHaberes = (enfocado ? [enfocado] : d.tramites).filter((t) => t.haberes.length > 0)
    if (conHaberes.length === 0) {
      return enfocado
        ? "Este trámite todavía no tiene novedad de haberes. Se informa a Liquidación cuando se firma la resolución que hace lugar, y te avisamos cuando quede cargada."
        : "Todavía no hay novedades de haberes en tus trámites. Se informan a Liquidación cuando se firma la resolución que hace lugar, y te avisamos cuando quedan cargadas."
    }
    const lineas = conHaberes.flatMap((t) =>
      t.haberes.map(
        (h) =>
          `- **${t.tipo}** (${t.numero}): ${h.movimiento} desde el período ${h.desde}. ${
            h.cargada && h.cargadaAt
              ? `Liquidación de Haberes ya la cargó en Civitas el ${fechaCorta(h.cargadaAt)}.`
              : `Se informó a Liquidación el ${fechaCorta(h.registrada)} y falta que la carguen en Civitas: te avisamos cuando esté.`
          }`,
      ),
    )
    return `${lineas.join("\n")}\n\nSi tenés dudas sobre tu recibo, consultá en Liquidación de Haberes.`
  }

  if (/observ|correg|correcc|falta|pendient|devolv|presentar/.test(q)) {
    const observados = sobre.filter((t) => t.observado)
    const cita = (texto: string | null) => (texto ?? "una corrección").replace(/\.\s*$/, "")
    const conDocumentos = sobre.filter((t) => t.pendientes.length > 0)
    const partes = observados.map(
      (t) => `- **${t.tipo}** (${t.numero}): Capital Humano te pidió «${cita(t.observacion)}». [Responder la corrección](${enlace(t)})`,
    )
    for (const t of conDocumentos) {
      const docs = t.pendientes.map((r) => `${r.nombre.toLowerCase()}${r.descripcion ? ` (${r.descripcion.toLowerCase()})` : ""}`)
      partes.push(`- **${t.tipo}** (${t.numero}): ${docs.length === 1 ? "falta" : "faltan"} ${docs.join("; ")}. Lo adjuntás desde [el trámite](${enlace(t)}).`)
    }
    if (partes.length === 0) return `No tenés nada pendiente${enfocado ? " en este trámite" : ""}: ${enfocado ? detalle(enfocado) : "tus trámites avanzan solos y te avisamos si hace falta algo."}`
    return [`Sí, ${partes.length === 1 ? "hay una cosa que necesita" : "hay cosas que necesitan"} tu atención:`, partes.join("\n")].join("\n\n")
  }

  if (/tarda|demora|plazo|cuanto|dias|rapido|cuando/.test(q)) {
    if (tipo && !enfocado) {
      const propio = activos.find((t) => t.codigo === tipo.codigo)
      return [
        `El objetivo para la **${tipo.nombre.toLowerCase()}** es resolverla en ${tipo.plazoDias ?? "pocos"} días, desde que el trámite entra completo.`,
        propio ? `La tuya (${propio.numero}) lleva ${propio.lleva} y está ${propio.estado.toLowerCase()}.` : "En papel este tipo de trámite tardaba semanas: ahora cada paso tiene su plazo y Capital Humano lo sigue en el tablero.",
      ].join(" ")
    }
    if (sobre.length === 0) return "No tenés trámites en curso. Si querés, preguntame cuánto tarda alguno del catálogo."
    return sobre
      .map(
        (t) =>
          `- **${t.tipo}** (${t.numero}): lleva ${t.lleva}${t.plazoDias ? ` de un objetivo de ${t.plazoDias} días` : ""}${t.venceAt ? `; el paso actual vence el ${fechaCorta(t.venceAt)}` : ""}.${t.siguiente ? ` Después sigue ${t.siguiente.nombre.toLowerCase()}.` : ""}`,
      )
      .join("\n")
  }

  if (/resoluc|aprob|resolvi|salio|firmad/.test(q)) {
    const resueltos = d.tramites.filter((t) => t.resolucion)
    if (resueltos.length === 0) return "Todavía no tenés resoluciones firmadas. Te avisamos por email y WhatsApp apenas salga la primera."
    return resueltos
      .map((t) => `- **${t.tipo}** (${t.numero}): ${t.resolucion?.titulo}${t.resolucion?.fecha ? `, firmada el ${fechaCorta(t.resolucion.fecha)}` : ""}${t.resultado ? ` (${t.resultado})` : ""}. [Ver la resolución](${enlace(t)})`)
      .join("\n")
  }

  if (enfocado || /estado|como va|como esta|en que|donde|avanz|novedad|tramite/.test(q)) {
    if (enfocado) return detalle(enfocado)
    if (activos.length === 0) return "No tenés trámites en curso. Podés iniciar uno desde [Nuevo trámite](" + base + "/mis-tramites/nuevo)."
    const terminados = d.tramites.length - activos.length
    return [
      `Tenés ${activos.length === 1 ? "un trámite" : `${activos.length} trámites`} en curso:`,
      activos.map((t) => `- **${t.tipo}** (${t.numero}): ${t.estado.toLowerCase()}${t.area && !t.observado ? `, ahora en ${t.area}` : ""}. [Ver](${enlace(t)})`).join("\n"),
      terminados ? `Y ${terminados === 1 ? "uno finalizado" : `${terminados} finalizados`}, con la resolución disponible.` : "",
    ]
      .filter(Boolean)
      .join("\n\n")
  }

  if (tipo) return requisitos(tipo)

  return "Puedo ayudarte con tus trámites de Capital Humano: en qué están, qué te falta presentar, cuánto pueden tardar y qué pide cada trámite del catálogo. Probá, por ejemplo, con «¿En qué están mis trámites?» o «¿Qué necesito para el adicional por título universitario?»."
}
