// Datos de ejemplo para la vista previa de diseño (/vista-previa).
// No se guardan en ningún lado: sirven para ver y presentar la interfaz sin iniciar sesión.
// Trámites, circuitos y áreas salen del catálogo real (src/lib/semilla/catalogo.ts);
// las personas, los expedientes y las métricas son inventados.
import type { Enum, Fila, Json } from "@/lib/database.types"
import type { ExpedienteCompleto } from "@/lib/expedientes"
import type { CargaPersona, DiaSerie, EtapaMetrica, FilaBandeja, MetricaTipo, ResumenMetricas, TipoCatalogo, TramiteAgente, UsuarioVista } from "@/lib/vistas"
import type { DatosParametrizacion } from "@/app/(interno)/parametrizacion/vista"
import type { PerfilVista } from "@/app/(agente)/perfil/vista"
import { AREAS_SEMILLA, CATALOGO_SEMILLA } from "@/lib/semilla/catalogo"
import { FIRMA_EJEMPLO } from "@/lib/demo/firma-ejemplo"

const ahora = Date.now()
const hace = (horas: number) => new Date(ahora - horas * 3_600_000).toISOString()
const en = (horas: number) => new Date(ahora + horas * 3_600_000).toISOString()
/** Huella de ejemplo, distinta para cada semilla (FNV-1a encadenado hasta 64 caracteres hex). */
const huella = (semilla: string) => {
  let h = 2166136261
  let salida = ""
  for (let ronda = 0; salida.length < 64; ronda++) {
    for (const c of `${semilla}#${ronda}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0
    salida += h.toString(16).padStart(8, "0")
  }
  return salida.slice(0, 64)
}

// ---------------------------------------------------------------------
// Organización
// ---------------------------------------------------------------------
export const AREAS = AREAS_SEMILLA.map((a) => ({ id: `a-${a.codigo.toLowerCase()}`, codigo: a.codigo, nombre: a.nombre }))
const area = (codigo: string) => AREAS.find((a) => a.codigo === codigo)!

export const PERSONAS = {
  ana: { id: "p-ana", nombre: "Ana", apellido: "Paz", legajo: "10234", reparticion: "Secretaría de Obras Públicas", email: "ana.paz@smt.gob.ar" },
  jorge: { id: "p-jorge", nombre: "Jorge", apellido: "Ruiz", legajo: "08812", reparticion: "Dirección de Tránsito", email: "jorge.ruiz@smt.gob.ar" },
  carla: { id: "p-carla", nombre: "Carla", apellido: "Gómez", legajo: "09455", reparticion: "Dirección de Espacios Verdes", email: "carla.gomez@smt.gob.ar" },
  lucia: { id: "p-lucia", nombre: "Lucía", apellido: "Medina", legajo: "11001", reparticion: "Capital Humano", email: "lmedina@smt.gob.ar" },
  elena: { id: "p-elena", nombre: "Elena", apellido: "Ríos", legajo: "11007", reparticion: "Capital Humano", email: "erios@smt.gob.ar" },
  sofia: { id: "p-sofia", nombre: "Sofía", apellido: "Herrera", legajo: "11006", reparticion: "Capital Humano", email: "sherrera@smt.gob.ar" },
  pablo: { id: "p-pablo", nombre: "Pablo", apellido: "Díaz", legajo: "11002", reparticion: "Capital Humano", email: "pdiaz@smt.gob.ar" },
  ines: { id: "p-ines", nombre: "Inés", apellido: "Vidal", legajo: "11003", reparticion: "Capital Humano", email: "ividal@smt.gob.ar" },
  martin: { id: "p-martin", nombre: "Martín", apellido: "Sosa", legajo: "11004", reparticion: "Capital Humano", email: "msosa@smt.gob.ar" },
  laura: { id: "p-laura", nombre: "Laura", apellido: "Campos", legajo: "11005", reparticion: "Capital Humano", email: "lcampos@smt.gob.ar" },
}
type Persona = keyof typeof PERSONAS
const NOMBRES: Record<string, string> = Object.fromEntries(Object.values(PERSONAS).map((p) => [p.id, `${p.nombre} ${p.apellido}`]))

/** Roles disponibles en la vista previa: con quién estás mirando la pantalla. */
export const ROLES_DEMO = {
  bonificaciones: { persona: PERSONAS.sofia, area: "BONIF", rol: "operador" as Enum<"rol_area">, etiqueta: "Área Bonificaciones" },
  medicina: { persona: PERSONAS.elena, area: "MEDLAB", rol: "operador" as Enum<"rol_area">, etiqueta: "Medicina Laboral" },
  dictamenes: { persona: PERSONAS.ines, area: "DICT", rol: "dictaminante" as Enum<"rol_area">, etiqueta: "Asesoría Legal" },
  direccion: { persona: PERSONAS.laura, area: "DIR", rol: "firmante" as Enum<"rol_area">, etiqueta: "Dirección" },
  mesa: { persona: PERSONAS.lucia, area: "MESA", rol: "operador" as Enum<"rol_area">, etiqueta: "Mesa de Entradas" },
  licencias: { persona: PERSONAS.pablo, area: "LIC", rol: "operador" as Enum<"rol_area">, etiqueta: "Sección Licencias" },
  despacho: { persona: PERSONAS.martin, area: "DESP", rol: "operador" as Enum<"rol_area">, etiqueta: "Despacho" },
}
export type RolDemo = keyof typeof ROLES_DEMO

export function usuarioDemo(rol: RolDemo | "agente"): UsuarioVista {
  if (rol === "agente") {
    const p = PERSONAS.ana
    return {
      id: p.id,
      menu: { nombre: `${p.nombre} ${p.apellido}`, email: p.email, iniciales: "AP", areas: [], esInterno: false },
      areas: [],
      esInterno: false,
      esAdmin: false,
      perfilIncompleto: true,
    }
  }
  const r = ROLES_DEMO[rol]
  const a = area(r.area)
  const rolTexto = { operador: "Operador/a", dictaminante: "Dictaminante", firmante: "Firmante", jefe: "Jefe/a de área" }[r.rol]
  return {
    id: r.persona.id,
    menu: {
      nombre: `${r.persona.nombre} ${r.persona.apellido}`,
      email: r.persona.email,
      iniciales: `${r.persona.nombre[0]}${r.persona.apellido[0]}`,
      areas: [{ nombre: a.nombre, rol: rolTexto }],
      esInterno: true,
    },
    areas: [{ id: a.id, nombre: a.nombre, rol: r.rol }],
    esInterno: true,
    esAdmin: false,
  }
}

// ---------------------------------------------------------------------
// Tipos de trámite y circuitos (del catálogo real)
// ---------------------------------------------------------------------
type Tipo = Fila<"tipos_tramite">

export const TIPOS: Tipo[] = CATALOGO_SEMILLA.map((t) => ({
  id: `t-${t.codigo.toLowerCase()}`,
  codigo: t.codigo,
  nombre: t.nombre,
  descripcion: t.descripcion,
  categoria: t.categoria,
  icono: t.icono,
  normativa: t.normativa,
  requisitos: t.requisitos as Json,
  formulario: t.formulario as Json,
  plazo_dias: t.plazo_dias,
  linea_base_dias: t.linea_base_dias,
  prioridad_base: t.prioridad_base,
  reservado: t.reservado,
  activo: true,
  version: 1,
  codigo_relevamiento: t.relevamiento,
  oficina: t.oficina,
  pasos_actuales: t.pasos_actuales,
  documentacion_final: t.documentacion_final,
  created_at: hace(800),
  updated_at: hace(800),
}))
const tipo = (codigo: string) => TIPOS.find((t) => t.codigo === codigo)!

const pasosDe = (codigo: string) =>
  CATALOGO_SEMILLA.find((t) => t.codigo === codigo)!.pasos.map((p, i) => ({
    orden: i + 1,
    nombre: p.nombre,
    area_id: area(p.area).id,
    accion: p.accion,
    controles: p.controles ?? [],
    revisa: p.revisa ?? [],
    genera: p.genera ?? [],
    permite_subsanacion: p.permite_subsanacion ?? true,
    destino_final: p.destino_final ?? null,
    instrucciones: p.instrucciones ?? null,
    area: area(p.area).nombre,
  }))

export const CATALOGO: TipoCatalogo[] = TIPOS.map((t) => ({
  codigo: t.codigo,
  nombre: t.nombre,
  descripcion: t.descripcion,
  categoria: t.categoria,
  icono: t.icono,
  plazo_dias: t.plazo_dias,
  reservado: t.reservado,
  requisitos: t.requisitos,
}))

export const PARAMETRIZACION: DatosParametrizacion = {
  tipos: TIPOS,
  pasos: TIPOS.flatMap((t) =>
    pasosDe(t.codigo).map((p) => ({
      tipo_tramite_id: t.id,
      orden: p.orden,
      nombre: p.nombre,
      plazo_horas: CATALOGO_SEMILLA.find((c) => c.codigo === t.codigo)!.pasos[p.orden - 1].plazo_horas,
      controles: p.controles,
      revisa: p.revisa,
      genera: p.genera,
      destino_final: p.destino_final,
      area: { nombre: p.area },
    })),
  ),
  plantillas: CATALOGO_SEMILLA.flatMap((t) =>
    t.plantillas.map((pl) => ({ tipo_tramite_id: `t-${t.codigo.toLowerCase()}`, tipo_documento: pl.tipo, nombre: pl.nombre, version: 1 })),
  ),
}

// ---------------------------------------------------------------------
// Expedientes de ejemplo
// ---------------------------------------------------------------------
type FojaEntrada = [Enum<"tipo_actuacion">, string, string, Persona, number, string | null, boolean?, Record<string, Json>?]

function armar(op: {
  id: string
  numero: string
  codigo: string
  asunto: string
  iniciador: Persona
  datos: Record<string, string>
  estado: Enum<"estado_expediente">
  resultado?: "aprobado" | "rechazado"
  prioridad: Enum<"prioridad_expediente">
  prioridad_motivo?: string
  prioridad_origen?: string
  paso: number
  asignado?: Persona
  creadoHace: number
  venceEn: number
  fojas: FojaEntrada[]
  borradores?: { tipo: Enum<"tipo_actuacion">; titulo: string; contenido: string; autor: Persona; ia?: boolean; hace: number; sentido?: "hace_lugar" | "rechaza" }[]
  documentos: { nombre: string; requisito: string; kb: number; mime?: string; hace: number }[]
}): ExpedienteCompleto {
  const t = tipo(op.codigo)
  const pasos = pasosDe(op.codigo)
  const a = AREAS.find((x) => x.id === pasos[op.paso - 1].area_id)!
  const expediente = {
    id: op.id,
    numero: op.numero,
    tipo_tramite_id: t.id,
    iniciador_id: PERSONAS[op.iniciador].id,
    asunto: op.asunto,
    datos: op.datos as Json,
    estado: op.estado,
    resultado: op.resultado ?? null,
    instancia: 0,
    prioridad: op.prioridad,
    prioridad_motivo: op.prioridad_motivo ?? null,
    prioridad_origen: op.prioridad_origen ?? "regla",
    paso_actual: op.paso,
    area_actual_id: a.id,
    asignado_a: op.asignado ? PERSONAS[op.asignado].id : null,
    reservado: t.reservado,
    vence_at: en(op.venceEn),
    resuelto_at: op.estado === "resuelto" || op.estado === "archivado" ? hace(2) : null,
    created_at: hace(op.creadoHace),
    updated_at: hace(1),
    tipo: {
      id: t.id,
      codigo: t.codigo,
      nombre: t.nombre,
      icono: t.icono,
      plazo_dias: t.plazo_dias,
      linea_base_dias: t.linea_base_dias,
      requisitos: t.requisitos,
      formulario: t.formulario,
      normativa: t.normativa,
    },
    area: a,
  }
  const fojas = op.fojas.map(([tipoFoja, titulo, contenido, firmante, horas, codArea, ia, datosFoja], i) => ({
    id: `${op.id}-f${i + 1}`,
    foja: i + 1,
    tipo: tipoFoja,
    titulo,
    contenido,
    datos: (datosFoja ?? {}) as Json,
    estado: "firmada" as const,
    autor_id: PERSONAS[firmante].id,
    area_id: codArea ? area(codArea).id : null,
    generada_por_ia: Boolean(ia),
    ia_generacion_id: null,
    firmada_por: PERSONAS[firmante].id,
    firmada_at: hace(horas),
    hash: huella(`${op.id}-f${i + 1}`),
    created_at: hace(horas),
    updated_at: hace(horas),
    area: codArea ? area(codArea).nombre : null,
  }))
  const borradores = (op.borradores ?? []).map((b, i) => ({
    id: `${op.id}-b${i + 1}`,
    foja: null,
    tipo: b.tipo,
    titulo: b.titulo,
    contenido: b.contenido,
    datos: (b.sentido ? { sentido: b.sentido } : {}) as Json,
    estado: "borrador" as const,
    autor_id: PERSONAS[b.autor].id,
    area_id: null,
    generada_por_ia: Boolean(b.ia),
    ia_generacion_id: null,
    firmada_por: null,
    firmada_at: null,
    hash: null,
    created_at: hace(b.hace),
    updated_at: hace(b.hace),
  }))
  const primera = pasos[0]
  const movimientos = op.fojas
    .filter(([tf]) => tf === "pase" || tf === "presentacion")
    .map(([tf, titulo, contenido, firmante, horas, codArea], i) => ({
      id: `${op.id}-m${i}`,
      desde_area_id: tf === "presentacion" ? null : codArea ? area(codArea).id : null,
      hacia_area_id: null,
      desde_perfil_id: PERSONAS[firmante].id,
      hacia_perfil_id: null,
      motivo: tf === "presentacion" ? "Ingreso del trámite" : contenido,
      created_at: hace(horas),
      desde: tf === "presentacion" ? null : codArea ? area(codArea).nombre : null,
      hacia: tf === "presentacion" ? primera.area : titulo.replace("Pase a ", ""),
    }))
  return {
    expediente,
    tipo: expediente.tipo,
    area: a,
    pasos,
    fojas,
    borradores,
    documentos: op.documentos.map((d, i) => ({
      id: `${op.id}-d${i}`,
      nombre_archivo: d.nombre,
      mime_type: d.mime ?? "application/pdf",
      tamano_bytes: d.kb * 1024,
      created_at: hace(d.hace),
      requisito_clave: d.requisito,
    })),
    movimientos,
    areas: AREAS,
    nombres: NOMBRES,
  } as ExpedienteCompleto
}

const presentacion = (campos: [string, string][], asunto: string) =>
  `**Asunto:** ${asunto}\n\n${campos.map(([k, v]) => `- **${k}:** ${v}`).join("\n")}`

const adjuntos = (lista: [string, string][]) => lista.map(([archivo, etiqueta], i) => `- ${archivo} (${etiqueta}) · SHA-256 \`${huella(archivo + i).slice(0, 16)}…\``).join("\n")

const INFORME_TITULO = (titulo: string, institucion: string) =>
  `**INFORME DE VERIFICACIÓN DEL TÍTULO**\n\nSe verificó ante ${institucion} la autenticidad del título de ${titulo} acompañado por el/la agente. La institución confirma su emisión y los datos coinciden con la copia certificada.\n\nSe controló en Civitas que no se haya hecho lugar antes a la misma solicitud: sin antecedentes.\n\nSe agregan foja de servicios y situación de revista. Pase a Asesoría Legal.`

export const EXPEDIENTES: Record<string, ExpedienteCompleto> = {
  // Paso 1 de Bonificaciones: la tarjeta de tarea guía el control.
  "demo-titulo": armar({
    id: "demo-titulo",
    numero: "CH-2026-000007",
    codigo: "BONIF-TIT-SEC",
    asunto: "Adicional por título secundario",
    iniciador: "jorge",
    datos: { titulo_obtenido: "Bachiller con orientación en Economía y Administración", institucion: "Escuela de Comercio N.º 2", fecha_egreso: "2019-12-13" },
    estado: "en_tramite",
    prioridad: "normal",
    paso: 1,
    asignado: "sofia",
    creadoHace: 20,
    venceEn: 28,
    fojas: [
      [
        "presentacion",
        "Presentación: Adicional por título secundario",
        presentacion(
          [
            ["Título obtenido", "Bachiller con orientación en Economía y Administración"],
            ["Institución", "Escuela de Comercio N.º 2"],
            ["Fecha de egreso", "13/12/2019"],
          ],
          "Adicional por título secundario",
        ),
        "jorge",
        20,
        null,
      ],
      ["documento", "Documentación acompañada", adjuntos([["analitico.pdf", "Certificado analítico"], ["diploma.pdf", "Diploma autenticado"]]), "jorge", 20, null],
      ["documento", "Foja de servicios", adjuntos([["foja-servicios-civitas.pdf", "Foja de servicios"]]), "sofia", 3, "BONIF"],
    ],
    documentos: [
      { nombre: "analitico.pdf", requisito: "certificado_analitico", kb: 412, hace: 20 },
      { nombre: "diploma.pdf", requisito: "diploma", kb: 655, hace: 20 },
      { nombre: "foja-servicios-civitas.pdf", requisito: "foja_servicios", kb: 98, hace: 3 },
    ],
  }),
  // Paso 2: dictamen con IA y datos por completar.
  "demo-dictamen": armar({
    id: "demo-dictamen",
    numero: "CH-2026-000003",
    codigo: "BONIF-TIT-TER",
    asunto: "Adicional por título terciario",
    iniciador: "jorge",
    datos: { titulo_obtenido: "Técnico Superior en Seguridad Vial", institucion: "Instituto Superior de Educación Vial", fecha_egreso: "2026-07-15" },
    estado: "en_tramite",
    prioridad: "normal",
    paso: 2,
    asignado: "ines",
    creadoHace: 72,
    venceEn: 30,
    fojas: [
      [
        "presentacion",
        "Presentación: Adicional por título terciario",
        presentacion(
          [
            ["Título obtenido", "Técnico Superior en Seguridad Vial"],
            ["Institución", "Instituto Superior de Educación Vial"],
            ["Fecha de egreso", "15/07/2026"],
          ],
          "Adicional por título terciario",
        ),
        "jorge",
        72,
        null,
      ],
      ["documento", "Documentación acompañada", adjuntos([["analitico-isev.pdf", "Certificado analítico"], ["diploma-isev.pdf", "Diploma autenticado"]]), "jorge", 72, null],
      ["documento", "Foja de servicios y situación de revista", adjuntos([["foja.pdf", "Foja de servicios"], ["revista.pdf", "Situación de revista"]]), "sofia", 50, "BONIF"],
      ["informe", "Informe de verificación del título", INFORME_TITULO("Técnico Superior en Seguridad Vial", "el Instituto Superior de Educación Vial"), "sofia", 49, "BONIF", true],
      ["pase", "Pase a Asesoría Legal", "Documentación controlada y título verificado. Pase para dictamen.", "sofia", 48, "BONIF"],
    ],
    borradores: [
      {
        tipo: "dictamen",
        titulo: "Dictamen",
        contenido:
          "**DICTAMEN N.º [COMPLETAR: número de dictamen]**\nRef.: Expte. N.º CH-2026-000003 — Adicional por título terciario\n\n**I. ANTECEDENTES**\nEl agente Jorge Ruiz, Legajo N.º 08812, solicita el pago del adicional por título de Técnico Superior en Seguridad Vial (nivel terciario). A fs. 2 obran el certificado analítico y el diploma; a fs. 4 el Área Bonificaciones informa que verificó la autenticidad del título y que no hay antecedentes en Civitas.\n\n**II. ANÁLISIS**\nLa documentación acredita el título invocado. El porcentaje del adicional para el nivel terciario es [COMPLETAR: porcentaje según la normativa].\n\n**III. CONCLUSIÓN**\nEsta Asesoría entiende que corresponde hacer lugar a lo solicitado a partir de agosto de 2026.",
        autor: "ines",
        ia: true,
        hace: 3,
        sentido: "hace_lugar",
      },
    ],
    documentos: [
      { nombre: "analitico-isev.pdf", requisito: "certificado_analitico", kb: 380, hace: 72 },
      { nombre: "diploma-isev.pdf", requisito: "diploma", kb: 845, hace: 72 },
      { nombre: "foja.pdf", requisito: "foja_servicios", kb: 96, hace: 50 },
      { nombre: "revista.pdf", requisito: "situacion_revista", kb: 71, hace: 50 },
    ],
  }),
  // Paso 4: la Dirección firma; número y fecha se asignan al firmar.
  "demo-firma": armar({
    id: "demo-firma",
    numero: "CH-2026-000005",
    codigo: "BONIF-TIT-SEC",
    asunto: "Adicional por título secundario",
    iniciador: "carla",
    datos: { titulo_obtenido: "Perito Mercantil", institucion: "Colegio Nacional Bartolomé Mitre", fecha_egreso: "2012-12-07" },
    estado: "en_tramite",
    prioridad: "normal",
    paso: 4,
    asignado: "laura",
    creadoHace: 120,
    venceEn: 20,
    fojas: [
      ["presentacion", "Presentación: Adicional por título secundario", presentacion([["Título obtenido", "Perito Mercantil"], ["Institución", "Colegio Nacional Bartolomé Mitre"]], "Adicional por título secundario"), "carla", 120, null],
      ["documento", "Documentación acompañada", adjuntos([["analitico-cnbm.pdf", "Certificado analítico"], ["diploma-cnbm.pdf", "Diploma autenticado"]]), "carla", 120, null],
      ["documento", "Foja de servicios y situación de revista", adjuntos([["foja.pdf", "Foja de servicios"], ["revista.pdf", "Situación de revista"]]), "sofia", 100, "BONIF"],
      ["informe", "Informe de verificación del título", INFORME_TITULO("Perito Mercantil", "el Colegio Nacional Bartolomé Mitre"), "sofia", 99, "BONIF", true],
      ["pase", "Pase a Asesoría Legal", "Título verificado. Pase para dictamen.", "sofia", 98, "BONIF"],
      [
        "dictamen",
        "Dictamen",
        "**I. ANTECEDENTES**\nLa agente Carla Gómez solicita el adicional por título secundario (Perito Mercantil).\n\n**II. ANÁLISIS**\nObran el analítico y el diploma (fs. 2) y el informe de verificación (fs. 4). Corresponde el 17,5 % de la categoría de revista.\n\n**III. CONCLUSIÓN**\nSe aconseja hacer lugar a lo solicitado a partir de septiembre de 2026.",
        "ines",
        40,
        "DICT",
        true,
        { firma: { tipo: "electronica", aclaracion: "Inés Vidal", cargo: "Asesoría Legal" } },
      ],
      ["pase", "Pase a Área Bonificaciones", "Con dictamen favorable.", "ines", 39, "DICT"],
      ["pase", "Pase a Dirección de Capital Humano", "Se eleva el proyecto de resolución para la firma.", "sofia", 6, "BONIF"],
    ],
    borradores: [
      {
        tipo: "resolucion",
        titulo: "Resolución: adicional por título secundario",
        contenido:
          "RESOLUCIÓN N.º {{numero_resolucion}}\nMunicipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Área Bonificaciones\nSan Miguel de Tucumán, {{fecha_resolucion}}\n\n**VISTO:**\nEl Expediente N.º CH-2026-000005, por el cual la agente Carla Gómez, afiliada N.º 09455, con prestación de servicios en la Dirección de Espacios Verdes, solicita el pago del adicional por Título Secundario de Perito Mercantil; y\n\n**CONSIDERANDO:**\nQue a fs. 1, obra solicitud de pago del adicional por título efectuada por la agente;\nQue a fs. 2, obra copia certificada del certificado analítico y del diploma de Perito Mercantil, expedido por el Colegio Nacional Bartolomé Mitre;\nQue a fs. 4, se agrega informe de verificación del título sobre su autenticidad;\nQue a fs. 3, se agregan foja de servicios y situación de revista de la agente;\nQue a fs. 6, obra dictamen de la Asesoría Legal, aconsejando hacer lugar al pago del adicional por Título Secundario;\n\nPor lo expuesto, y en virtud de lo establecido por los Decretos N.º 82/77, 23/81, 1320/01, 143/79, Art. 5º, y Ordenanza N.º 3537/04;\n\n**LA DIRECTORA DE CAPITAL HUMANO**\n**R E S U E L V E:**\n\n**Artículo 1º:** Hacer lugar al pedido y otorgar a la agente Carla Gómez, afiliada N.º 09455, el pago del adicional por Título Secundario de Perito Mercantil, con porcentaje del 17,5 % de la categoría de revista, a partir de septiembre de 2026.\n\n**Artículo 2º:** Registrar la presente Resolución en el Registro de Resoluciones de la Dirección de Capital Humano.\n\n**Artículo 3º:** Notificar a la agente por medio del sistema de expedientes electrónicos. Notificada, archívese.",
        autor: "sofia",
        ia: true,
        hace: 6.5,
        sentido: "hace_lugar",
      },
    ],
    documentos: [
      { nombre: "analitico-cnbm.pdf", requisito: "certificado_analitico", kb: 402, hace: 120 },
      { nombre: "diploma-cnbm.pdf", requisito: "diploma", kb: 1240, hace: 120 },
      { nombre: "foja.pdf", requisito: "foja_servicios", kb: 96, hace: 100 },
      { nombre: "revista.pdf", requisito: "situacion_revista", kb: 71, hace: 100 },
    ],
  }),
  // Paso 5: resolución firmada; falta la novedad a Liquidación para cerrar.
  "demo-cierre": armar({
    id: "demo-cierre",
    numero: "CH-2026-000004",
    codigo: "ASIG-MATRIMONIO",
    asunto: "Asignación familiar por matrimonio",
    iniciador: "ana",
    datos: { familiar: "Luna, Diego", dni_familiar: "31222444", fecha_matrimonio: "2026-08-22" },
    estado: "resuelto",
    resultado: "aprobado",
    prioridad: "normal",
    paso: 5,
    asignado: "sofia",
    creadoHace: 96,
    venceEn: 20,
    fojas: [
      ["presentacion", "Presentación: Asignación familiar por matrimonio", presentacion([["Cónyuge", "Luna, Diego"], ["Fecha de matrimonio", "22/08/2026"]], "Asignación familiar por matrimonio"), "ana", 96, null],
      ["documento", "Documentación acompañada", adjuntos([["acta-matrimonio.pdf", "Acta de matrimonio"]]), "ana", 96, null],
      ["documento", "Foja de servicios y situación de revista", adjuntos([["foja.pdf", "Foja de servicios"], ["revista.pdf", "Situación de revista"]]), "sofia", 80, "BONIF"],
      ["pase", "Pase a Asesoría Legal", "Documentación completa. Sin antecedentes en Civitas.", "sofia", 79, "BONIF"],
      ["dictamen", "Dictamen", "**III. CONCLUSIÓN**\nSe aconseja hacer lugar a la asignación por matrimonio.", "ines", 50, "DICT", true],
      ["pase", "Pase a Área Bonificaciones", "Con dictamen favorable.", "ines", 49, "DICT"],
      ["pase", "Pase a Dirección de Capital Humano", "Se eleva el proyecto de resolución.", "sofia", 30, "BONIF"],
      [
        "resolucion",
        "Resolución: asignación por matrimonio — Res. N.º 1431/DCH/2026",
        "RESOLUCIÓN N.º 1431/DCH/2026\nSan Miguel de Tucumán, 07/10/2026\n\n**LA DIRECTORA DE CAPITAL HUMANO**\n**R E S U E L V E:**\n\n**Artículo 1º:** Hacer lugar al pedido y otorgar a la agente Ana Paz, afiliada N.º 10234, el pago de la asignación familiar por matrimonio, en relación a Diego Luna, DNI 31.222.444, a partir de agosto de 2026.\n\n**Artículo 2º:** Registrar la presente Resolución en el Registro de Resoluciones de la Dirección de Capital Humano.\n\n**Artículo 3º:** Notificar a la agente por medio del sistema de expedientes electrónicos. Notificada, archívese.",
        "laura",
        5,
        "DIR",
        true,
        {
          firma: {
            tipo: "olografa",
            version: 2,
            registro_id: "demo",
            aclaracion: "Laura Campos",
            cargo: "Directora de Capital Humano",
            visible: FIRMA_EJEMPLO,
            tinta: "#1e3a8a",
            dispositivo: "pen",
            forma: { puntaje: 0.081, umbral: 0.16 },
            ritmo: { puntaje: 0.022, umbral: 0.041 },
            evidencia_sha256: huella("firma-ejemplo"),
          },
          protocolo: { numero: "1431/DCH/2026", fecha: "07/10/2026" },
          sentido: "hace_lugar",
        },
      ],
      ["pase", "Pase a Área Bonificaciones", "Firmada y protocolizada. Para la novedad a Liquidación.", "laura", 4, "DIR"],
    ],
    documentos: [
      { nombre: "acta-matrimonio.pdf", requisito: "acta_matrimonio", kb: 288, hace: 96 },
      { nombre: "foja.pdf", requisito: "foja_servicios", kb: 96, hace: 80 },
      { nombre: "revista.pdf", requisito: "situacion_revista", kb: 71, hace: 80 },
    ],
  }),
  // Reservado y urgente: entra por Medicina Laboral.
  "demo-urgente": armar({
    id: "demo-urgente",
    numero: "CH-2026-000008",
    codigo: "ASIG-HIJO-DISC",
    asunto: "Asignación por hijo con discapacidad",
    iniciador: "ana",
    datos: { tipo_solicitud: "Alta", familiar: "Paz, Tomás", dni_familiar: "58123456", vencimiento_cud: "2031-09-30" },
    estado: "iniciado",
    prioridad: "urgente",
    prioridad_motivo: "Asignación por hijo/a con discapacidad: un corte impacta directamente en el ingreso familiar.",
    prioridad_origen: "ia",
    paso: 1,
    creadoHace: 1.5,
    venceEn: 46,
    fojas: [
      ["presentacion", "Presentación: Asignación familiar por hijo/a con discapacidad", presentacion([["Tipo de solicitud", "Alta"], ["Hijo/a", "Paz, Tomás"]], "Asignación por hijo con discapacidad"), "ana", 1.5, null],
      [
        "documento",
        "Documentación acompañada",
        adjuntos([
          ["cud-tomas.pdf", "Certificado Único de Discapacidad (CUD)"],
          ["acta-nacimiento.pdf", "Acta de nacimiento del hijo/a"],
          ["negativa-anses.pdf", "Negativa de ANSES de la madre o del padre"],
        ]),
        "ana",
        1.5,
        null,
      ],
    ],
    documentos: [
      { nombre: "cud-tomas.pdf", requisito: "cud", kb: 530, hace: 1.5 },
      { nombre: "acta-nacimiento.pdf", requisito: "acta_nacimiento", kb: 210, hace: 1.5 },
      { nombre: "negativa-anses.pdf", requisito: "negativa_anses", kb: 120, hace: 1.5 },
    ],
  }),
  "demo-licencia": armar({
    id: "demo-licencia",
    numero: "CH-2026-000002",
    codigo: "LIC-EXAMEN",
    asunto: "Licencia por examen — Derecho Administrativo",
    iniciador: "ana",
    datos: { institucion: "Universidad Nacional de Tucumán", carrera: "Abogacía", materia: "Derecho Administrativo", fecha_examen: "2026-10-09", dias_solicitados: "3" },
    estado: "en_tramite",
    prioridad: "normal",
    prioridad_motivo: "Licencia con examen en 4 días: entra en plazo normal.",
    prioridad_origen: "ia",
    paso: 2,
    asignado: "pablo",
    creadoHace: 20,
    venceEn: 6,
    fojas: [
      [
        "presentacion",
        "Presentación: Licencia por examen",
        presentacion(
          [
            ["Institución educativa", "Universidad Nacional de Tucumán"],
            ["Carrera", "Abogacía"],
            ["Materia", "Derecho Administrativo"],
            ["Fecha del examen", "09/10/2026"],
            ["Días solicitados", "3"],
          ],
          "Licencia por examen — Derecho Administrativo",
        ),
        "ana",
        20,
        null,
      ],
      ["documento", "Documentación acompañada", adjuntos([["constancia-inscripcion-unt.pdf", "Constancia de inscripción al examen"]]), "ana", 20, null],
      ["pase", "Pase a Sección Licencias", "Constancia de inscripción verificada. Pase a Licencias para control de días.", "lucia", 14, "MESA"],
    ],
    documentos: [{ nombre: "constancia-inscripcion-unt.pdf", requisito: "constancia_inscripcion", kb: 312, hace: 20 }],
  }),
  "demo-observado": armar({
    id: "demo-observado",
    numero: "CH-2026-000006",
    codigo: "LIC-ENFERMEDAD",
    asunto: "Licencia por enfermedad desde el 30/09",
    iniciador: "ana",
    datos: { fecha_inicio: "2026-09-30", dias_indicados: "3" },
    estado: "observado",
    prioridad: "normal",
    paso: 1,
    asignado: "lucia",
    creadoHace: 30,
    venceEn: -6,
    fojas: [
      ["presentacion", "Presentación: Licencia por enfermedad", presentacion([["Fecha de inicio", "30/09/2026"], ["Días indicados", "3"]], "Licencia por enfermedad"), "ana", 30, null],
      ["documento", "Documentación acompañada", adjuntos([["certificado.jpg", "Certificado médico"]]), "ana", 30, null],
      ["observacion", "Observación al agente", "El certificado adjunto no tiene firma ni sello del profesional. Por favor, adjuntá una copia legible con firma y matrícula.", "lucia", 20, "MESA"],
    ],
    documentos: [{ nombre: "certificado.jpg", requisito: "certificado_medico", kb: 980, mime: "image/jpeg", hace: 30 }],
  }),
  "demo-resuelto": armar({
    id: "demo-resuelto",
    numero: "CH-2026-000001",
    codigo: "LIC-EXAMEN",
    asunto: "Licencia por examen — Análisis Matemático I",
    iniciador: "ana",
    datos: { institucion: "UTN Facultad Regional Tucumán", carrera: "Ingeniería Civil", materia: "Análisis Matemático I", fecha_examen: "2026-10-02", dias_solicitados: "2" },
    estado: "archivado",
    resultado: "aprobado",
    prioridad: "normal",
    paso: 5,
    creadoHace: 50,
    venceEn: -2,
    fojas: [
      ["presentacion", "Presentación: Licencia por examen", presentacion([["Materia", "Análisis Matemático I"], ["Días solicitados", "2"]], "Licencia por examen"), "ana", 50, null],
      ["pase", "Pase a Sección Licencias", "Requisitos completos. Pase a Licencias.", "lucia", 46, "MESA"],
      ["pase", "Pase a Despacho", "La agente registra 4 días disponibles en el período.", "pablo", 30, "LIC"],
      ["pase", "Pase a Dirección de Capital Humano", "Se eleva proyecto de resolución para la firma.", "martin", 12, "DESP"],
      [
        "resolucion",
        "Resolución: concede licencia por examen — Res. N.º 1398/DCH/2026",
        "**LA DIRECCIÓN DE CAPITAL HUMANO RESUELVE:**\n\n**ARTÍCULO 1º.-** CONCEDER a la agente Ana Paz, Legajo N.º 10234, licencia por examen por el término de dos (2) días a partir del 01/10/2026.\n\n**ARTÍCULO 2º.-** Comuníquese, notifíquese y archívese.",
        "laura",
        6,
        "DIR",
        true,
      ],
      ["pase", "Pase a Mesa de Entradas", "Firmada. Notifíquese.", "laura", 5, "DIR"],
      ["nota", "Archivo del expediente", "Notificada la agente por medios electrónicos. Archívese.", "lucia", 2, "MESA"],
    ],
    documentos: [],
  }),
}

/** Firma registrada de ejemplo (persona ficticia) para ver el flujo de firma con clave. */
export const FIRMA_DEMO = { aclaracion: "Laura Campos", cargo: "Directora de Capital Humano", visible: FIRMA_EJEMPLO, tinta: "#1e3a8a" }

/** Rol con el que conviene mirar cada expediente para ver su “próximo paso”. */
export const ROL_SUGERIDO: Record<string, RolDemo> = {
  "demo-titulo": "bonificaciones",
  "demo-dictamen": "dictamenes",
  "demo-firma": "direccion",
  "demo-cierre": "bonificaciones",
  "demo-urgente": "medicina",
  "demo-licencia": "licencias",
  "demo-observado": "mesa",
  "demo-resuelto": "mesa",
}

export const BANDEJA: FilaBandeja[] = Object.values(EXPEDIENTES)
  .filter((d) => ["iniciado", "en_tramite", "observado", "resuelto"].includes(d.expediente.estado))
  .map((d) => {
    const e = d.expediente
    const ini = Object.values(PERSONAS).find((p) => p.id === e.iniciador_id)!
    const asig = Object.values(PERSONAS).find((p) => p.id === e.asignado_a)
    return {
      id: e.id,
      numero: e.numero,
      asunto: e.asunto,
      estado: e.estado,
      prioridad: e.prioridad,
      prioridad_motivo: e.prioridad_motivo,
      prioridad_origen: e.prioridad_origen,
      vence_at: e.vence_at,
      created_at: e.created_at,
      reservado: e.reservado,
      asignado_a: e.asignado_a,
      area_actual_id: e.area_actual_id,
      tipo: { nombre: d.tipo.nombre, icono: d.tipo.icono },
      area: { nombre: d.area?.nombre ?? "" },
      iniciador: { nombre: ini.nombre, apellido: ini.apellido, legajo: ini.legajo },
      asignado: asig ? { nombre: asig.nombre, apellido: asig.apellido } : null,
    }
  })
  .sort((a, b) => ({ urgente: 0, alta: 1, normal: 2, baja: 3 })[a.prioridad] - ({ urgente: 0, alta: 1, normal: 2, baja: 3 })[b.prioridad])

export const TRAMITES_AGENTE: TramiteAgente[] = Object.values(EXPEDIENTES)
  .filter((d) => d.expediente.iniciador_id === PERSONAS.ana.id)
  .map((d) => ({
    id: d.expediente.id,
    numero: d.expediente.numero,
    asunto: d.expediente.asunto,
    estado: d.expediente.estado,
    resultado: d.expediente.resultado,
    instancia: d.expediente.instancia,
    paso_actual: d.expediente.paso_actual,
    updated_at: d.expediente.updated_at,
    created_at: d.expediente.created_at,
    tipo: { nombre: d.tipo.nombre, icono: d.tipo.icono },
    area: d.area ? { codigo: d.area.codigo, nombre: d.area.nombre } : null,
    pasos: d.pasos.map((p) => ({ orden: p.orden, nombre: p.nombre, accion: p.accion })),
  }))

export const PERFIL_AGENTE: PerfilVista = {
  nombre: "Ana",
  apellido: "Paz",
  email: "ana.paz@smt.gob.ar",
  telefono: null,
  cuil: "27-30111222-4",
  legajo: "10234",
  reparticion: "Secretaría de Obras Públicas",
  dependencia: "Secretaría de Obras Públicas",
  categoria: "18",
}

// ---------------------------------------------------------------------
// Métricas (inventadas para la presentación)
// ---------------------------------------------------------------------
export const RESUMEN: ResumenMetricas = {
  activos: 38,
  ingresados_hoy: 6,
  resueltos_30d: 112,
  vencidos: 2,
  urgentes: 7,
  promedio_dias: 1.9,
  linea_base_dias: 35,
  hojas_evitadas: 1284,
  borradores_ia: 96,
  borradores_ia_aceptados: 81,
}

const metrica = (codigo: string, promedio: number, resueltos: number, total: number): MetricaTipo => {
  const t = tipo(codigo)
  return { codigo, nombre: t.nombre, promedio, lineaBase: t.linea_base_dias, plazo: t.plazo_dias, resueltos, total }
}

export const POR_TIPO: MetricaTipo[] = [
  metrica("LIC-EXAMEN", 1.6, 64, 71),
  metrica("BONIF-TIT-SEC", 6.1, 14, 17),
  metrica("BONIF-TIT-UNI", 7.4, 9, 12),
  metrica("ASIG-HIJO-DISC", 2.4, 5, 6),
  metrica("ASIG-NACIMIENTO", 4.2, 11, 13),
  metrica("ASIG-MATRIMONIO", 3.8, 6, 7),
  metrica("LIC-ENFERMEDAD", 1.1, 11, 14),
]

export const CARGA: CargaPersona[] = [
  { perfil_id: "p-sofia", nombre: "Sofía Herrera", area: "Área Bonificaciones", asignados: 11, fojas_30d: 96 },
  { perfil_id: "p-pablo", nombre: "Pablo Díaz", area: "Sección Licencias", asignados: 9, fojas_30d: 74 },
  { perfil_id: "p-ines", nombre: "Inés Vidal", area: "Asesoría Legal", asignados: 6, fojas_30d: 22 },
  { perfil_id: "p-lucia", nombre: "Lucía Medina", area: "Mesa de Entradas", asignados: 4, fojas_30d: 61 },
  { perfil_id: "p-laura", nombre: "Laura Campos", area: "Dirección de Capital Humano", asignados: 2, fojas_30d: 69 },
]

export const ETAPAS: EtapaMetrica[] = [
  { area: "Asesoría Legal", estadias: 41, horas_promedio: 52.4, horas_maximo: 140.2 },
  { area: "Área Bonificaciones", estadias: 96, horas_promedio: 21.7, horas_maximo: 70.5 },
  { area: "Dirección de Capital Humano", estadias: 58, horas_promedio: 9.3, horas_maximo: 31 },
  { area: "Sección Licencias", estadias: 71, horas_promedio: 6.2, horas_maximo: 22.8 },
]

export function serieDemo(dias: number): DiaSerie[] {
  return Array.from({ length: dias }, (_, i) => {
    const fecha = new Date(ahora - (dias - 1 - i) * 86_400_000)
    const finde = fecha.getDay() === 0 || fecha.getDay() === 6
    const ola = Math.sin(i / 3) * 1.5
    const ingresados = finde ? Math.round(Math.abs(ola) * 0.4) : Math.max(1, Math.round(4 + ola + ((i * 7) % 3)))
    const resueltos = finde ? 0 : Math.max(0, Math.round(3.6 + Math.cos(i / 4) * 1.4 + ((i * 5) % 2)))
    return { dia: fecha.toISOString().slice(0, 10), ingresados, resueltos }
  })
}
