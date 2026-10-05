// Datos de ejemplo para la vista previa de diseño (/vista-previa).
// No se guardan en ningún lado: sirven para ver y presentar la interfaz sin iniciar sesión.
import type { Enum, Fila, Json } from "@/lib/database.types"
import type { ExpedienteCompleto } from "@/lib/expedientes"
import type { CargaPersona, DiaSerie, FilaBandeja, MetricaTipo, ResumenMetricas, TipoCatalogo, TramiteAgente, UsuarioVista } from "@/lib/vistas"
import type { DatosParametrizacion } from "@/app/(interno)/parametrizacion/vista"
import type { PerfilVista } from "@/app/(agente)/perfil/vista"

const ahora = Date.now()
const hace = (horas: number) => new Date(ahora - horas * 3_600_000).toISOString()
const en = (horas: number) => new Date(ahora + horas * 3_600_000).toISOString()
const huella = (n: number) => (n * 2654435761).toString(16).padStart(8, "0").repeat(8).slice(0, 64)

// ---------------------------------------------------------------------
// Organización
// ---------------------------------------------------------------------
export const AREAS = [
  { id: "a-mesa", codigo: "MESA", nombre: "Mesa de Entradas" },
  { id: "a-lic", codigo: "LIC", nombre: "Sección Licencias" },
  { id: "a-dict", codigo: "DICT", nombre: "Asesoría Letrada" },
  { id: "a-desp", codigo: "DESP", nombre: "Despacho" },
  { id: "a-dir", codigo: "DIR", nombre: "Dirección de Capital Humano" },
  { id: "a-liq", codigo: "LIQ", nombre: "Liquidación de Haberes" },
]
const area = (codigo: string) => AREAS.find((a) => a.codigo === codigo)!

export const PERSONAS = {
  ana: { id: "p-ana", nombre: "Ana", apellido: "Paz", legajo: "10234", reparticion: "Secretaría de Obras Públicas", email: "ana.paz@smt.gob.ar" },
  jorge: { id: "p-jorge", nombre: "Jorge", apellido: "Ruiz", legajo: "08812", reparticion: "Dirección de Tránsito", email: "jorge.ruiz@smt.gob.ar" },
  lucia: { id: "p-lucia", nombre: "Lucía", apellido: "Medina", legajo: "11001", reparticion: "Capital Humano", email: "lmedina@smt.gob.ar" },
  pablo: { id: "p-pablo", nombre: "Pablo", apellido: "Díaz", legajo: "11002", reparticion: "Capital Humano", email: "pdiaz@smt.gob.ar" },
  ines: { id: "p-ines", nombre: "Inés", apellido: "Vidal", legajo: "11003", reparticion: "Capital Humano", email: "ividal@smt.gob.ar" },
  martin: { id: "p-martin", nombre: "Martín", apellido: "Sosa", legajo: "11004", reparticion: "Capital Humano", email: "msosa@smt.gob.ar" },
  laura: { id: "p-laura", nombre: "Laura", apellido: "Campos", legajo: "11005", reparticion: "Capital Humano", email: "lcampos@smt.gob.ar" },
}
const NOMBRES: Record<string, string> = Object.fromEntries(Object.values(PERSONAS).map((p) => [p.id, `${p.nombre} ${p.apellido}`]))

/** Roles disponibles en la vista previa: con quién estás mirando la pantalla. */
export const ROLES_DEMO = {
  mesa: { persona: PERSONAS.lucia, area: "MESA", rol: "operador" as Enum<"rol_area">, etiqueta: "Mesa de Entradas" },
  licencias: { persona: PERSONAS.pablo, area: "LIC", rol: "operador" as Enum<"rol_area">, etiqueta: "Sección Licencias" },
  dictamenes: { persona: PERSONAS.ines, area: "DICT", rol: "dictaminante" as Enum<"rol_area">, etiqueta: "Asesoría Letrada" },
  despacho: { persona: PERSONAS.martin, area: "DESP", rol: "operador" as Enum<"rol_area">, etiqueta: "Despacho" },
  direccion: { persona: PERSONAS.laura, area: "DIR", rol: "firmante" as Enum<"rol_area">, etiqueta: "Dirección" },
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
// Tipos de trámite
// ---------------------------------------------------------------------
type Tipo = Fila<"tipos_tramite">
const base = { activo: true, version: 1, created_at: hace(800), updated_at: hace(800), prioridad_base: "normal" as const, reservado: false }

export const TIPOS: Tipo[] = [
  {
    ...base,
    id: "t-examen",
    codigo: "LIC-EXAMEN",
    nombre: "Licencia por examen",
    descripcion: "Licencia para rendir exámenes en carreras de nivel medio, terciario o universitario.",
    categoria: "Licencias",
    icono: "graduation-cap",
    normativa: "[COMPLETAR por Capital Humano: artículo del régimen de licencias]",
    plazo_dias: 2,
    linea_base_dias: 35,
    requisitos: [
      { clave: "constancia_inscripcion", nombre: "Constancia de inscripción al examen", descripcion: "Emitida por la institución educativa", obligatorio: true },
      { clave: "certificado_rendido", nombre: "Certificado de examen rendido", descripcion: "Podés adjuntarlo después de rendir", obligatorio: false },
    ],
    formulario: [
      { clave: "institucion", etiqueta: "Institución educativa", tipo: "texto", obligatorio: true },
      { clave: "carrera", etiqueta: "Carrera", tipo: "texto", obligatorio: true },
      { clave: "materia", etiqueta: "Materia / espacio curricular", tipo: "texto", obligatorio: true },
      { clave: "fecha_examen", etiqueta: "Fecha del examen", tipo: "fecha", obligatorio: true },
      { clave: "dias_solicitados", etiqueta: "Días de licencia solicitados", tipo: "numero", obligatorio: true, ayuda: "Incluye el día del examen" },
    ],
  },
  {
    ...base,
    id: "t-titulo",
    codigo: "BONIF-TITULO",
    nombre: "Bonificación por título",
    descripcion: "Adicional salarial por título secundario, terciario, universitario o de posgrado.",
    categoria: "Bonificaciones",
    icono: "award",
    normativa: "[COMPLETAR por Capital Humano: norma del adicional por título]",
    plazo_dias: 10,
    linea_base_dias: 45,
    requisitos: [
      { clave: "titulo", nombre: "Título (copia certificada)", descripcion: "Anverso y reverso", obligatorio: true },
      { clave: "analitico", nombre: "Certificado analítico", descripcion: "Opcional, si el título está en trámite", obligatorio: false },
    ],
    formulario: [
      { clave: "titulo_obtenido", etiqueta: "Título obtenido", tipo: "texto", obligatorio: true },
      { clave: "nivel", etiqueta: "Nivel", tipo: "seleccion", obligatorio: true, opciones: ["Secundario", "Terciario", "Universitario de grado", "Posgrado"] },
      { clave: "institucion", etiqueta: "Institución que lo emite", tipo: "texto", obligatorio: true },
      { clave: "fecha_egreso", etiqueta: "Fecha de egreso", tipo: "fecha", obligatorio: true },
    ],
  },
  {
    ...base,
    id: "t-asig",
    codigo: "ASIG-FAMILIAR",
    nombre: "Adicional por asignación familiar",
    descripcion: "Alta de asignaciones familiares: nacimiento, adopción, matrimonio, hijo/a, escolaridad.",
    categoria: "Asignaciones",
    icono: "users",
    normativa: null,
    plazo_dias: 5,
    linea_base_dias: null,
    requisitos: [
      { clave: "partida", nombre: "Partida o certificado que acredita el vínculo", obligatorio: true },
      { clave: "cud", nombre: "Certificado Único de Discapacidad (CUD)", descripcion: "Solo para hijo/a con discapacidad", obligatorio: false },
    ],
    formulario: [
      { clave: "tipo_asignacion", etiqueta: "Tipo de asignación", tipo: "seleccion", obligatorio: true, opciones: ["Nacimiento", "Adopción", "Matrimonio", "Hijo/a", "Hijo/a con discapacidad", "Escolaridad"] },
      { clave: "familiar", etiqueta: "Apellido y nombre del familiar", tipo: "texto", obligatorio: true },
      { clave: "dni_familiar", etiqueta: "DNI del familiar", tipo: "texto", obligatorio: true },
    ],
  },
  {
    ...base,
    id: "t-disc",
    codigo: "LIC-HIJO-DISC",
    nombre: "Licencia por atención de hijo/a con discapacidad",
    descripcion: "Licencia especial para acompañamiento y tratamiento de hijo/a con discapacidad.",
    categoria: "Licencias",
    icono: "heart-handshake",
    normativa: null,
    plazo_dias: 3,
    linea_base_dias: null,
    prioridad_base: "alta",
    reservado: true,
    requisitos: [
      { clave: "cud", nombre: "Certificado Único de Discapacidad (CUD)", obligatorio: true },
      { clave: "indicacion_medica", nombre: "Indicación médica o de tratamiento", obligatorio: true },
    ],
    formulario: [
      { clave: "hijo", etiqueta: "Apellido y nombre del hijo/a", tipo: "texto", obligatorio: true },
      { clave: "desde", etiqueta: "Desde", tipo: "fecha", obligatorio: true },
      { clave: "hasta", etiqueta: "Hasta", tipo: "fecha", obligatorio: true },
    ],
  },
  {
    ...base,
    id: "t-enf",
    codigo: "LIC-ENFERMEDAD",
    nombre: "Licencia por enfermedad",
    descripcion: "Justificación de inasistencias por razones de salud con certificado médico.",
    categoria: "Licencias",
    icono: "stethoscope",
    normativa: null,
    plazo_dias: 2,
    linea_base_dias: null,
    reservado: true,
    requisitos: [{ clave: "certificado_medico", nombre: "Certificado médico", descripcion: "Presentar dentro de las 48 horas", obligatorio: true }],
    formulario: [
      { clave: "fecha_inicio", etiqueta: "Fecha de inicio", tipo: "fecha", obligatorio: true },
      { clave: "dias_indicados", etiqueta: "Días indicados por el médico", tipo: "numero", obligatorio: true },
      { clave: "observaciones", etiqueta: "Observaciones", tipo: "texto_largo", obligatorio: false, ayuda: "No incluyas diagnóstico" },
    ],
  },
]
const tipo = (codigo: string) => TIPOS.find((t) => t.codigo === codigo)!

const CIRCUITOS: Record<string, [string, string, Enum<"accion_paso">][]> = {
  "LIC-EXAMEN": [
    ["Recepción y control de requisitos", "MESA", "recepcion"],
    ["Control de días disponibles", "LIC", "analisis"],
    ["Proyecto de resolución", "DESP", "resolucion"],
    ["Firma de la resolución", "DIR", "firma"],
    ["Notificación y archivo", "MESA", "notificacion"],
  ],
  "BONIF-TITULO": [
    ["Recepción y control de requisitos", "MESA", "recepcion"],
    ["Dictamen de procedencia", "DICT", "dictamen"],
    ["Proyecto de resolución", "DESP", "resolucion"],
    ["Firma de la resolución", "DIR", "firma"],
    ["Alta en liquidación", "LIQ", "liquidacion"],
  ],
  "ASIG-FAMILIAR": [
    ["Recepción y control de requisitos", "MESA", "recepcion"],
    ["Análisis de la asignación", "LIQ", "analisis"],
    ["Proyecto de resolución", "DESP", "resolucion"],
    ["Firma de la resolución", "DIR", "firma"],
    ["Alta en liquidación", "LIQ", "liquidacion"],
  ],
  "LIC-HIJO-DISC": [
    ["Recepción y control de requisitos", "MESA", "recepcion"],
    ["Dictamen", "DICT", "dictamen"],
    ["Proyecto de resolución", "DESP", "resolucion"],
    ["Firma de la resolución", "DIR", "firma"],
    ["Notificación y archivo", "MESA", "notificacion"],
  ],
  "LIC-ENFERMEDAD": [
    ["Recepción del certificado", "MESA", "recepcion"],
    ["Control de licencia", "LIC", "analisis"],
    ["Proyecto de resolución", "DESP", "resolucion"],
    ["Firma de la resolución", "DIR", "firma"],
  ],
}
const pasosDe = (codigo: string) =>
  CIRCUITOS[codigo].map(([nombre, a, accion], i) => ({ orden: i + 1, nombre, area_id: area(a).id, accion, area: area(a).nombre }))

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
  pasos: TIPOS.flatMap((t) => pasosDe(t.codigo).map((p) => ({ tipo_tramite_id: t.id, orden: p.orden, nombre: p.nombre, plazo_horas: 24, area: { nombre: p.area } }))),
  plantillas: [
    { tipo_tramite_id: "t-examen", tipo_documento: "resolucion", nombre: "Resolución de licencia por examen", version: 1 },
    { tipo_tramite_id: "t-titulo", tipo_documento: "dictamen", nombre: "Dictamen sobre bonificación por título", version: 1 },
    { tipo_tramite_id: "t-titulo", tipo_documento: "resolucion", nombre: "Resolución de bonificación por título", version: 1 },
    { tipo_tramite_id: "t-disc", tipo_documento: "dictamen", nombre: "Dictamen sobre licencia por hijo/a con discapacidad", version: 1 },
    { tipo_tramite_id: "t-asig", tipo_documento: "resolucion", nombre: "Resolución de asignación familiar", version: 1 },
  ],
}

// ---------------------------------------------------------------------
// Expedientes de ejemplo
// ---------------------------------------------------------------------
type FojaEntrada = [Enum<"tipo_actuacion">, string, string, string, number, string | null, boolean?]

function armar(op: {
  id: string
  numero: string
  codigo: string
  asunto: string
  iniciador: keyof typeof PERSONAS
  datos: Record<string, string>
  estado: Enum<"estado_expediente">
  prioridad: Enum<"prioridad_expediente">
  prioridad_motivo?: string
  prioridad_origen?: string
  paso: number
  asignado?: keyof typeof PERSONAS
  creadoHace: number
  venceEn: number
  fojas: FojaEntrada[]
  borradores?: { tipo: Enum<"tipo_actuacion">; titulo: string; contenido: string; autor: keyof typeof PERSONAS; ia?: boolean; hace: number }[]
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
  const fojas = op.fojas.map(([tipoFoja, titulo, contenido, firmante, horas, codArea, ia], i) => ({
    id: `${op.id}-f${i + 1}`,
    foja: i + 1,
    tipo: tipoFoja,
    titulo,
    contenido,
    estado: "firmada" as const,
    autor_id: PERSONAS[firmante as keyof typeof PERSONAS].id,
    area_id: codArea ? area(codArea).id : null,
    generada_por_ia: Boolean(ia),
    ia_generacion_id: null,
    firmada_por: PERSONAS[firmante as keyof typeof PERSONAS].id,
    firmada_at: hace(horas),
    hash: huella(i + op.numero.length * 7),
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
  const movimientos = op.fojas
    .filter(([tf]) => tf === "pase" || tf === "presentacion")
    .map(([tf, titulo, contenido, firmante, horas, codArea], i) => ({
      id: `${op.id}-m${i}`,
      desde_area_id: tf === "presentacion" ? null : codArea ? area(codArea).id : null,
      hacia_area_id: null,
      desde_perfil_id: PERSONAS[firmante as keyof typeof PERSONAS].id,
      hacia_perfil_id: null,
      motivo: tf === "presentacion" ? "Ingreso del trámite" : contenido,
      created_at: hace(horas),
      desde: tf === "presentacion" ? null : codArea ? area(codArea).nombre : null,
      hacia: tf === "presentacion" ? "Mesa de Entradas" : titulo.replace("Pase a ", ""),
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

export const EXPEDIENTES: Record<string, ExpedienteCompleto> = {
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
      ["documento", "Documentación acompañada", "- constancia-inscripcion-unt.pdf (Constancia de inscripción al examen) · SHA-256 `9f2c41d8a7b03e55…`", "ana", 20, null],
      ["pase", "Pase a Sección Licencias", "Constancia de inscripción verificada. Pase a Licencias para control de días.", "lucia", 14, "MESA"],
    ],
    documentos: [{ nombre: "constancia-inscripcion-unt.pdf", requisito: "constancia_inscripcion", kb: 312, hace: 20 }],
  }),
  "demo-titulo": armar({
    id: "demo-titulo",
    numero: "CH-2026-000003",
    codigo: "BONIF-TITULO",
    asunto: "Bonificación por título de Técnico Superior en Seguridad Vial",
    iniciador: "jorge",
    datos: { titulo_obtenido: "Técnico Superior en Seguridad Vial", nivel: "Terciario", institucion: "Instituto Superior de Educación Vial", fecha_egreso: "2026-07-15" },
    estado: "en_tramite",
    prioridad: "normal",
    paso: 2,
    asignado: "ines",
    creadoHace: 72,
    venceEn: 96,
    fojas: [
      [
        "presentacion",
        "Presentación: Bonificación por título",
        presentacion(
          [
            ["Título obtenido", "Técnico Superior en Seguridad Vial"],
            ["Nivel", "Terciario"],
            ["Institución", "Instituto Superior de Educación Vial"],
            ["Fecha de egreso", "15/07/2026"],
          ],
          "Bonificación por título",
        ),
        "jorge",
        72,
        null,
      ],
      ["documento", "Documentación acompañada", "- titulo-certificado.pdf (Título) · SHA-256 `51ac9e0b77d2c4f1…`", "jorge", 72, null],
      ["pase", "Pase a Asesoría Letrada", "Se adjunta copia certificada del título. Pase a Asesoría Letrada para dictamen.", "lucia", 50, "MESA"],
    ],
    borradores: [
      {
        tipo: "dictamen",
        titulo: "Dictamen: Bonificación por título",
        contenido:
          "**DICTAMEN N.º [COMPLETAR: número de dictamen]**\nRef.: Expte. N.º CH-2026-000003 — Bonificación por título\n\n**I. ANTECEDENTES**\nEl agente Jorge Ruiz, Legajo N.º 08812, solicita el reconocimiento del adicional por título de Técnico Superior en Seguridad Vial (nivel terciario).\n\n**II. ANÁLISIS**\nObra en autos copia certificada del título, cuyo nivel coincide con el declarado.\n\n**III. CONCLUSIÓN**\nEsta Asesoría entiende que corresponde hacer lugar a lo solicitado a partir del 01/08/2026.",
        autor: "ines",
        ia: true,
        hace: 3,
      },
    ],
    documentos: [{ nombre: "titulo-certificado.pdf", requisito: "titulo", kb: 845, hace: 72 }],
  }),
  "demo-firma": armar({
    id: "demo-firma",
    numero: "CH-2026-000005",
    codigo: "LIC-EXAMEN",
    asunto: "Licencia por examen — Análisis Matemático II",
    iniciador: "jorge",
    datos: { institucion: "UTN Facultad Regional Tucumán", carrera: "Ingeniería Civil", materia: "Análisis Matemático II", fecha_examen: "2026-10-08", dias_solicitados: "2" },
    estado: "en_tramite",
    prioridad: "alta",
    prioridad_motivo: "El examen es en 3 días: la licencia tiene que salir antes.",
    prioridad_origen: "ia",
    paso: 4,
    asignado: "laura",
    creadoHace: 26,
    venceEn: 2,
    fojas: [
      ["presentacion", "Presentación: Licencia por examen", presentacion([["Materia", "Análisis Matemático II"], ["Fecha del examen", "08/10/2026"], ["Días solicitados", "2"]], "Licencia por examen"), "jorge", 26, null],
      ["documento", "Documentación acompañada", "- inscripcion-utn.jpg (Constancia de inscripción) · SHA-256 `c03f2a19e8b74d60…`", "jorge", 26, null],
      ["pase", "Pase a Sección Licencias", "Requisitos completos.", "lucia", 22, "MESA"],
      ["pase", "Pase a Despacho", "El agente registra 4 días disponibles en el período.", "pablo", 9, "LIC"],
      ["pase", "Pase a Dirección de Capital Humano", "Se eleva proyecto de resolución para la firma.", "martin", 2, "DESP"],
    ],
    borradores: [
      {
        tipo: "resolucion",
        titulo: "Resolución: Licencia por examen",
        contenido:
          "RESOLUCIÓN N.º 1432/2026\nSan Miguel de Tucumán, 05/10/2026\n\n**VISTO:**\nEl Expediente N.º CH-2026-000005, por el cual el agente Jorge Ruiz, Legajo N.º 08812, solicita licencia por examen; y\n\n**CONSIDERANDO:**\nQue el agente acredita su inscripción para rendir Análisis Matemático II, con fecha 08/10/2026;\nQue la Sección Licencias informa que cuenta con días disponibles;\n\nPor ello,\n\n**LA DIRECCIÓN DE CAPITAL HUMANO**\n**RESUELVE:**\n\n**ARTÍCULO 1º.-** CONCEDER al agente Jorge Ruiz, Legajo N.º 08812, licencia por examen por el término de dos (2) días a partir del 07/10/2026.\n\n**ARTÍCULO 2º.-** Comuníquese, notifíquese y archívese.",
        autor: "martin",
        ia: true,
        hace: 2.5,
      },
    ],
    documentos: [{ nombre: "inscripcion-utn.jpg", requisito: "constancia_inscripcion", kb: 1240, mime: "image/jpeg", hace: 26 }],
  }),
  "demo-urgente": armar({
    id: "demo-urgente",
    numero: "CH-2026-000004",
    codigo: "ASIG-FAMILIAR",
    asunto: "Asignación por hijo con discapacidad",
    iniciador: "ana",
    datos: { tipo_asignacion: "Hijo/a con discapacidad", familiar: "Paz, Tomás", dni_familiar: "55123456" },
    estado: "iniciado",
    prioridad: "urgente",
    prioridad_motivo: "Asignación por hijo/a con discapacidad: un corte impacta directamente en el ingreso familiar.",
    prioridad_origen: "ia",
    paso: 1,
    creadoHace: 1.5,
    venceEn: 110,
    fojas: [
      ["presentacion", "Presentación: Adicional por asignación familiar", presentacion([["Tipo de asignación", "Hijo/a con discapacidad"], ["Familiar", "Paz, Tomás"]], "Asignación por hijo con discapacidad"), "ana", 1.5, null],
      ["documento", "Documentación acompañada", "- partida-nacimiento.pdf · SHA-256 `77b1e3c2d9a04f88…`\n- cud-tomas.pdf · SHA-256 `0d4e9a21c6f7b350…`", "ana", 1.5, null],
    ],
    documentos: [
      { nombre: "partida-nacimiento.pdf", requisito: "partida", kb: 210, hace: 1.5 },
      { nombre: "cud-tomas.pdf", requisito: "cud", kb: 530, hace: 1.5 },
    ],
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
      ["documento", "Documentación acompañada", "- certificado.jpg · SHA-256 `e2f018c4a9b3d7e6…`", "ana", 30, null],
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
        "Resolución: concede licencia por examen",
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

/** Rol con el que conviene mirar cada expediente para ver su “próximo paso”. */
export const ROL_SUGERIDO: Record<string, RolDemo> = {
  "demo-licencia": "licencias",
  "demo-titulo": "dictamenes",
  "demo-firma": "direccion",
  "demo-urgente": "mesa",
  "demo-observado": "mesa",
  "demo-resuelto": "mesa",
}

export const BANDEJA: FilaBandeja[] = Object.values(EXPEDIENTES)
  .filter((d) => ["iniciado", "en_tramite", "observado"].includes(d.expediente.estado))
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
    paso_actual: d.expediente.paso_actual,
    updated_at: d.expediente.updated_at,
    created_at: d.expediente.created_at,
    tipo: { nombre: d.tipo.nombre, icono: d.tipo.icono },
    pasos: d.pasos.map((p) => ({ orden: p.orden, nombre: p.nombre })),
  }))

export const PERFIL_AGENTE: PerfilVista = {
  nombre: "Ana",
  apellido: "Paz",
  email: "ana.paz@smt.gob.ar",
  telefono: null,
  cuil: "27-30111222-4",
  legajo: "10234",
  reparticion: "Secretaría de Obras Públicas",
}

// ---------------------------------------------------------------------
// Métricas
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

export const POR_TIPO: MetricaTipo[] = [
  { codigo: "LIC-EXAMEN", nombre: "Licencia por examen", promedio: 1.6, lineaBase: 35, plazo: 2, resueltos: 64, total: 71 },
  { codigo: "BONIF-TITULO", nombre: "Bonificación por título", promedio: 6.8, lineaBase: 45, plazo: 10, resueltos: 18, total: 23 },
  { codigo: "ASIG-FAMILIAR", nombre: "Adicional por asignación familiar", promedio: 2.9, lineaBase: null, plazo: 5, resueltos: 17, total: 20 },
  { codigo: "LIC-ENFERMEDAD", nombre: "Licencia por enfermedad", promedio: 1.1, lineaBase: null, plazo: 2, resueltos: 11, total: 14 },
  { codigo: "LIC-HIJO-DISC", nombre: "Licencia por atención de hijo/a con discapacidad", promedio: 2.2, lineaBase: null, plazo: 3, resueltos: 2, total: 3 },
]

export const CARGA: CargaPersona[] = [
  { perfil_id: "p-pablo", nombre: "Pablo Díaz", area: "Sección Licencias", asignados: 9, fojas_30d: 74 },
  { perfil_id: "p-lucia", nombre: "Lucía Medina", area: "Mesa de Entradas", asignados: 7, fojas_30d: 131 },
  { perfil_id: "p-ines", nombre: "Inés Vidal", area: "Asesoría Letrada", asignados: 6, fojas_30d: 22 },
  { perfil_id: "p-martin", nombre: "Martín Sosa", area: "Despacho", asignados: 4, fojas_30d: 58 },
  { perfil_id: "p-laura", nombre: "Laura Campos", area: "Dirección de Capital Humano", asignados: 2, fojas_30d: 69 },
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
