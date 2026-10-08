// =====================================================================
// Catálogo base de Capital Humano (semilla de la base de datos)
//
// Bonificaciones y asignaciones: relevamiento del Área Bonificaciones del
// 07/10/2026, circuito FINAL DIGITAL, corregido y depurado (ver informe de
// auditoría). Licencias: provisorio hasta tener su relevamiento.
//
// La base de datos es la fuente de verdad en ejecución: este archivo solo
// genera supabase/seeds/01_catalogo.sql (npm run catalogo) y alimenta la
// vista previa de diseño. Cambiar un circuito en producción = editar la base.
// =====================================================================
import type { Enum } from "@/lib/database.types"
import type { CampoFormulario, Requisito } from "@/lib/dominio"

export type AreaSemilla = { codigo: string; nombre: string; descripcion: string }

export type PasoSemilla = {
  nombre: string
  area: string
  accion: Enum<"accion_paso">
  plazo_horas: number
  controles?: string[]
  revisa?: string[]
  genera?: string[]
  permite_subsanacion?: boolean
  destino_final?: string
  instrucciones?: string
}

export type PlantillaSemilla = { tipo: Enum<"tipo_actuacion">; nombre: string; cuerpo: string; instrucciones: string }

export type TramiteSemilla = {
  codigo: string
  relevamiento: string | null
  nombre: string
  descripcion: string
  categoria: string
  icono: string
  normativa: string
  plazo_dias: number
  linea_base_dias: number | null
  prioridad_base: Enum<"prioridad_expediente">
  reservado: boolean
  pasos_actuales: number | null
  oficina: string | null
  requisitos: Requisito[]
  formulario: CampoFormulario[]
  documentacion_final: string[]
  pasos: PasoSemilla[]
  plantillas: PlantillaSemilla[]
}

// ---------------------------------------------------------------------
// Áreas
// ---------------------------------------------------------------------
export const AREAS_SEMILLA: AreaSemilla[] = [
  { codigo: "MESA", nombre: "Mesa de Entradas", descripcion: "Recepción y notificaciones. En el circuito digital de Bonificaciones no interviene." },
  { codigo: "BONIF", nombre: "Área Bonificaciones", descripcion: "Adicionales por título y asignaciones familiares: control, proyectos de resolución y novedades a Liquidación" },
  { codigo: "LIC", nombre: "Sección Licencias", descripcion: "Control de licencias y días disponibles (provisorio)" },
  { codigo: "MEDLAB", nombre: "Departamento de Medicina Laboral", descripcion: "Entrevistas e informes médicos" },
  { codigo: "DICT", nombre: "Asesoría Legal", descripcion: "Dictámenes jurídicos de la Dirección de Capital Humano" },
  { codigo: "DESP", nombre: "Despacho", descripcion: "Proyectos de resolución (provisorio, trámites de licencias)" },
  { codigo: "DIR", nombre: "Dirección de Capital Humano", descripcion: "Control y firma de resoluciones" },
  { codigo: "LIQ", nombre: "Liquidación de Haberes", descripcion: "Impacto de las novedades en la liquidación" },
]

/**
 * Áreas que no pertenecen a Capital Humano y se quitan de la base si no tienen uso.
 * Fiscalía Municipal y Secretaría de Gobierno son organismos externos: cuando se modele
 * la segunda reconsideración, intervendrán como remisión a otro organismo, no como áreas.
 */
export const AREAS_RETIRADAS = ["FISC", "SGOB"]

// ---------------------------------------------------------------------
// Bloques comunes del circuito FINAL DIGITAL
// ---------------------------------------------------------------------
const FOJA = "Foja de servicios"
const REVISTA = "Situación de revista"
const FORMULARIO = "Formulario"
const DICTAMEN = "Dictamen"
const RESOLUCION = "Resolución"
const FIRMADA = "Resolución firmada"
const NOVEDAD = "Novedad a Liquidación de Haberes"

const CIVITAS_ALTA = "Verificar en Civitas que no se haya hecho lugar antes a la misma solicitud"
const CIVITAS_BAJA = "Verificar en Civitas que la asignación esté vigente y desde cuándo se liquida"
const CIERRE = "Notificación electrónica al agente, incorporación al legajo digital y archivo"

const dictamen = (revisa: string[], foco: string): PasoSemilla => ({
  nombre: "Dictamen",
  area: "DICT",
  accion: "dictamen",
  plazo_horas: 48,
  controles: ["Controlar la documentación", foco],
  revisa,
  genera: [DICTAMEN],
})

const proyecto = (revisa: string[]): PasoSemilla => ({
  nombre: "Proyecto de resolución",
  area: "BONIF",
  accion: "resolucion",
  plazo_horas: 24,
  controles: ["Revisar el dictamen", "Preparar el proyecto de resolución en el sentido del dictamen"],
  revisa,
  genera: [RESOLUCION],
})

const firma = (revisa: string[]): PasoSemilla => ({
  nombre: "Control y firma de la resolución",
  area: "DIR",
  accion: "firma",
  plazo_horas: 24,
  controles: ["Controlar el proyecto y la documentación", "Firmar la resolución (el número y la fecha se asignan al firmar)"],
  revisa,
  genera: [FIRMADA],
  permite_subsanacion: false,
})

const novedad = (extra: string[] = []): PasoSemilla => ({
  nombre: "Novedad a Liquidación y cierre",
  area: "BONIF",
  accion: "liquidacion",
  plazo_horas: 24,
  controles: ["Informar la novedad a Liquidación de Haberes", "Registrar la novedad en Civitas", ...extra],
  revisa: [FIRMADA],
  genera: [NOVEDAD],
  permite_subsanacion: false,
  destino_final: CIERRE,
})

/** Circuito estándar de 5 pasos: control → dictamen → proyecto → firma → novedad. */
function circuitoEstandar(op: { control: PasoSemilla; aportados: string[]; focoDictamen: string; extraNovedad?: string[] }): PasoSemilla[] {
  const generados = op.control.genera ?? []
  const base = [...op.aportados, ...generados]
  return [
    op.control,
    dictamen(base, op.focoDictamen),
    proyecto([DICTAMEN, ...base]),
    firma([RESOLUCION, DICTAMEN, ...op.aportados]),
    novedad(op.extraNovedad),
  ]
}

const control = (nombre: string, controles: string[], revisa: string[], genera: string[] = [FOJA, REVISTA]): PasoSemilla => ({
  nombre,
  area: "BONIF",
  accion: "analisis",
  plazo_horas: 48,
  controles,
  revisa,
  genera,
})

// ---------------------------------------------------------------------
// Datos comunes de formularios
// ---------------------------------------------------------------------
const campo = (clave: string, etiqueta: string, tipo: CampoFormulario["tipo"], extra: Partial<CampoFormulario> = {}): CampoFormulario => ({
  clave,
  etiqueta,
  tipo,
  obligatorio: true,
  ...extra,
})
const req = (clave: string, nombre: string, descripcion?: string, obligatorio = true): Requisito => ({ clave, nombre, descripcion, obligatorio })

const CAMPOS_FAMILIAR = [campo("familiar", "Apellido y nombre del familiar", "texto"), campo("dni_familiar", "DNI del familiar", "texto")]

// ---------------------------------------------------------------------
// Modelos de resolución (anonimizados y adaptados al expediente digital)
// Los artículos de registro y notificación reemplazan la protocolización
// manual y la notificación a través de la repartición: validar con el área.
// ---------------------------------------------------------------------
const ENCABEZADO = `RESOLUCIÓN N.º {{numero_resolucion}}
Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Área Bonificaciones
San Miguel de Tucumán, {{fecha_resolucion}}`

const ART_REGISTRO = "Registrar la presente Resolución en el Registro de Resoluciones de la Dirección de Capital Humano."
const ART_NOTIFICACION = "Notificar al/a la agente por medio del sistema de expedientes electrónicos, con constancia de fecha en el expediente. Notificado/a, archívese."

const VISTO_AGENTE = "el/la agente {{agente}}, afiliado/a N.º {{legajo}}, categoría {{categoria}}, dependiente de {{dependencia}}, y con prestación de servicios en {{reparticion}}"

const INSTRUCCIONES_COMUNES = [
  "Las referencias \"a fs.\" tomalas de la numeración de fojas del expediente.",
  "Si el sentido indicado es NO hacer lugar, el Artículo 1º dice \"No hacer lugar al pedido...\" con los fundamentos del dictamen, y se omite el porcentaje o la fecha de efecto.",
  "Concordá el género (el/la agente) con los datos del agente.",
].join(" ")

function resolucionTitulo(nivel: string, conAnalitico: boolean, porcentaje: string) {
  return `${ENCABEZADO}

**VISTO:**
El Expediente N.º {{numero_expediente}}, de fecha {{fecha_expediente}}, por el cual ${VISTO_AGENTE}, solicita el pago del adicional por Título ${nivel} de {{titulo_obtenido}}; y

**CONSIDERANDO:**
Que a fs. {{fs}}, obra solicitud de pago del adicional por título efectuada por el/la agente;
Que a fs. {{fs}}, obra copia certificada del ${conAnalitico ? "certificado analítico y del " : ""}diploma de {{titulo_obtenido}} a favor del/de la agente, expedido por {{institucion}};
Que a fs. {{fs}}, se agrega informe de verificación del título sobre su autenticidad;
Que a fs. {{fs}}, se agregan foja de servicios y situación de revista del/de la agente;
Que a fs. {{fs}}, obra dictamen de la Asesoría Legal de la Dirección de Capital Humano, aconsejando hacer lugar al pago del adicional por Título ${nivel};

Por lo expuesto, y en virtud de lo establecido por los Decretos N.º 82/77, 23/81, 1320/01, 143/79, Art. 5º, y Ordenanza N.º 3537/04;

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** Hacer lugar al pedido de pago del adicional por título y otorgar al/a la agente {{agente}}, afiliado/a N.º {{legajo}}, el pago del adicional por Título ${nivel} de {{titulo_obtenido}}, con porcentaje del ${porcentaje} de la categoría de revista, a partir de {{mes_anio_efecto}}, por los motivos expresados en los considerandos que anteceden.

**Artículo 2º:** ${ART_REGISTRO}

**Artículo 3º:** ${ART_NOTIFICACION}`
}

function resolucionAlta(asignacion: string, acredita: string) {
  return `${ENCABEZADO}

**VISTO:**
El Expediente N.º {{numero_expediente}}, de fecha {{fecha_expediente}}, por el cual ${VISTO_AGENTE}, solicita el pago de la asignación familiar ${asignacion}; y

**CONSIDERANDO:**
Que a fs. {{fs}}, obra la solicitud de pago de la asignación familiar efectuada por el/la agente;
Que a fs. {{fs}}, obra ${acredita};
Que a fs. {{fs}}, se agregan foja de servicios y situación de revista del/de la agente;
Que a fs. {{fs}}, obra dictamen de la Asesoría Legal de la Dirección de Capital Humano, aconsejando hacer lugar al pago de la asignación familiar ${asignacion};

Por lo expuesto y en ejercicio de la competencia que le acuerda el Decreto N.º 143/G/79, artículo 2º;

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** Hacer lugar al pedido y otorgar al/a la agente {{agente}}, afiliado/a N.º {{legajo}}, el pago de la asignación familiar ${asignacion}{{en_relacion_a}}, a partir de {{mes_anio_efecto}}, conforme a lo citado en los considerandos que anteceden.

**Artículo 2º:** ${ART_REGISTRO}

**Artículo 3º:** ${ART_NOTIFICACION}`
}

function resolucionBaja(asignacion: string, acredita: string, conDictamen: boolean) {
  return `${ENCABEZADO}

**VISTO:**
El Expediente N.º {{numero_expediente}}, de fecha {{fecha_expediente}}, por el cual ${VISTO_AGENTE}, solicita el cese del pago de la asignación familiar por ${asignacion}; y

**CONSIDERANDO:**
Que a fs. {{fs}}, obra la solicitud de baja de la asignación familiar del/de la agente;
Que a fs. {{fs}}, obra ${acredita};
Que a fs. {{fs}}, se agregan foja de servicios y situación de revista del/de la agente;${
    conDictamen
      ? `\nQue a fs. {{fs}}, obra dictamen de la Asesoría Legal de la Dirección de Capital Humano, aconsejando hacer lugar al pedido de baja de la asignación por ${asignacion}, a partir de {{mes_anio_cese}};`
      : ""
  }

Por lo expuesto y en ejercicio de la competencia que le acuerda el Decreto N.º 143/G/79, artículo 2º;

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** Hacer lugar al pedido y disponer el cese del pago de la asignación familiar por ${asignacion} en relación a {{familiar}}, DNI {{dni_familiar}}, a partir de {{mes_anio_cese}}, al/a la agente {{agente}}, afiliado/a N.º {{legajo}}, conforme a lo citado en los considerandos que anteceden.

**Artículo 2º:** ${ART_REGISTRO}

**Artículo 3º:** ${ART_NOTIFICACION}`
}

const NORMATIVA_TITULO =
  "Decretos N.º 82/77, 23/81, 1320/01 y 143/79 (art. 5º) y Ordenanza N.º 3537/04, según el modelo de resolución del Área Bonificaciones."
const NORMATIVA_ASIGNACIONES =
  "Competencia: Decreto N.º 143/G/79, art. 2º (según los modelos de resolución del Área Bonificaciones). [COMPLETAR por Capital Humano: régimen de asignaciones familiares aplicable y montos]."

// ---------------------------------------------------------------------
// Trámites del Área Bonificaciones (relevamiento 07/10/2026)
// ---------------------------------------------------------------------
const titulo = (op: {
  codigo: string
  relevamiento: string
  nivel: "Secundario" | "Terciario" | "Universitario"
  icono: string
  conAnalitico: boolean
  porcentaje: string
}): TramiteSemilla => {
  const aportados = [FORMULARIO, ...(op.conAnalitico ? ["Certificado analítico"] : []), "Diploma autenticado"]
  return {
    codigo: op.codigo,
    relevamiento: op.relevamiento,
    nombre: `Adicional por título ${op.nivel.toLowerCase()}`,
    descripcion: `Pago del adicional salarial por título ${op.nivel.toLowerCase()}.`,
    categoria: "Bonificaciones por título",
    icono: op.icono,
    normativa:
      op.nivel === "Secundario"
        ? `${NORMATIVA_TITULO} Porcentaje: 17,5 % de la categoría de revista.`
        : `${NORMATIVA_TITULO} [COMPLETAR por Capital Humano: confirmar la norma y el porcentaje para el título ${op.nivel.toLowerCase()}; solo hay modelo para el secundario].`,
    plazo_dias: 10,
    linea_base_dias: null,
    prioridad_base: "normal",
    reservado: false,
    pasos_actuales: 8,
    oficina: "Área Bonificaciones",
    requisitos: [
      ...(op.conAnalitico ? [req("certificado_analitico", "Certificado analítico", "Copia certificada")] : []),
      req("diploma", "Diploma autenticado", "Copia certificada, anverso y reverso"),
    ],
    formulario: [
      campo("titulo_obtenido", "Título obtenido", "texto", { ayuda: "Tal como figura en el diploma" }),
      campo("institucion", "Institución que lo expide", "texto"),
      campo("fecha_egreso", "Fecha de egreso", "fecha"),
    ],
    documentacion_final: [...(op.conAnalitico ? ["certificado_analitico"] : []), "diploma"],
    pasos: circuitoEstandar({
      control: control(
        "Control de documentación y verificación del título",
        ["Controlar la documentación adjunta", "Verificar la autenticidad del título", CIVITAS_ALTA],
        aportados,
        [FOJA, REVISTA, "Informe de verificación del título"],
      ),
      aportados,
      focoDictamen: "Dictaminar sobre la procedencia del adicional por título",
    }),
    plantillas: [
      {
        tipo: "resolucion",
        nombre: `Resolución de adicional por título ${op.nivel.toLowerCase()}`,
        cuerpo: resolucionTitulo(op.nivel, op.conAnalitico, op.porcentaje),
        instrucciones: `${INSTRUCCIONES_COMUNES} El adicional rige a partir del mes de la solicitud salvo que el dictamen diga otra cosa.${
          op.nivel === "Secundario" ? "" : " El porcentaje no está definido en el relevamiento: dejá [COMPLETAR: porcentaje] si no surge de la normativa cargada."
        }`,
      },
    ],
  }
}

export const TRAMITES_BONIFICACIONES: TramiteSemilla[] = [
  titulo({ codigo: "BONIF-TIT-SEC", relevamiento: "001", nivel: "Secundario", icono: "school", conAnalitico: true, porcentaje: "17,5 %" }),
  titulo({ codigo: "BONIF-TIT-TER", relevamiento: "002", nivel: "Terciario", icono: "book-open", conAnalitico: true, porcentaje: "{{porcentaje}}" }),
  titulo({ codigo: "BONIF-TIT-UNI", relevamiento: "003", nivel: "Universitario", icono: "graduation-cap", conAnalitico: false, porcentaje: "{{porcentaje}}" }),

  // 004 — El FINAL DIGITAL elimina el dictamen y deja 3 pasos. El proyecto de resolución
  // lo prepara el área en el primer paso (el relevamiento no asignaba a nadie la resolución).
  {
    codigo: "BAJA-DIVORCIO",
    relevamiento: "004",
    nombre: "Baja de asignación por cónyuge por divorcio",
    descripcion: "Cese del pago de la asignación familiar por cónyuge a raíz del divorcio.",
    categoria: "Bajas de asignaciones",
    icono: "user-minus",
    normativa: NORMATIVA_ASIGNACIONES,
    plazo_dias: 5,
    linea_base_dias: null,
    prioridad_base: "normal",
    reservado: false,
    pasos_actuales: 8,
    oficina: "Área Bonificaciones",
    requisitos: [req("sentencia_divorcio", "Sentencia judicial de divorcio", "O acta de matrimonio con la anotación del divorcio")],
    formulario: [...CAMPOS_FAMILIAR.map((c) => ({ ...c, etiqueta: c.etiqueta.replace("del familiar", "del/de la ex cónyuge") })), campo("fecha_divorcio", "Fecha de la sentencia de divorcio", "fecha")],
    documentacion_final: ["sentencia_divorcio"],
    pasos: [
      control(
        "Control de documentación y proyecto de resolución",
        ["Controlar la documentación adjunta", CIVITAS_BAJA, "Definir desde cuándo cesa la asignación", "Preparar el proyecto de resolución"],
        [FORMULARIO, "Sentencia judicial de divorcio"],
        [FOJA, REVISTA, RESOLUCION],
      ),
      firma([RESOLUCION, FORMULARIO, "Sentencia judicial de divorcio", FOJA, REVISTA]),
      novedad(),
    ],
    plantillas: [
      {
        tipo: "resolucion",
        nombre: "Resolución de baja de asignación por cónyuge (divorcio)",
        cuerpo: resolucionBaja("cónyuge", "sentencia judicial de divorcio de fecha {{fecha_divorcio}}, en relación a {{familiar}}, DNI {{dni_familiar}}", false),
        instrucciones: `${INSTRUCCIONES_COMUNES} En este circuito no interviene la Asesoría Legal: no menciones dictamen. Si la fecha de cese es anterior al pedido, señalá con [REVISAR: períodos liquidados después del divorcio] para que el área defina el tratamiento.`,
      },
    ],
  },
  {
    codigo: "BAJA-FALLECIMIENTO",
    relevamiento: "005",
    nombre: "Baja de asignación por fallecimiento",
    descripcion: "Cese del pago de la asignación familiar por fallecimiento del hijo/a o del cónyuge.",
    categoria: "Bajas de asignaciones",
    icono: "user-minus",
    normativa: NORMATIVA_ASIGNACIONES,
    plazo_dias: 5,
    linea_base_dias: null,
    prioridad_base: "normal",
    reservado: false,
    pasos_actuales: 8,
    oficina: "Área Bonificaciones",
    requisitos: [req("acta_defuncion", "Acta de defunción")],
    formulario: [
      campo("vinculo", "Vínculo con la persona fallecida", "seleccion", { opciones: ["Cónyuge", "Hijo/a"] }),
      ...CAMPOS_FAMILIAR,
      campo("fecha_fallecimiento", "Fecha de fallecimiento", "fecha"),
    ],
    documentacion_final: ["acta_defuncion"],
    pasos: circuitoEstandar({
      control: control("Control de documentación", ["Controlar la documentación adjunta", CIVITAS_BAJA], [FORMULARIO, "Acta de defunción"]),
      aportados: [FORMULARIO, "Acta de defunción"],
      focoDictamen: "Dictaminar sobre la baja y la fecha de cese",
    }),
    plantillas: [
      {
        tipo: "resolucion",
        nombre: "Resolución de baja de asignación por fallecimiento",
        cuerpo: resolucionBaja("{{vinculo}}", "acta de defunción en relación a {{familiar}}, DNI {{dni_familiar}}, fallecido/a el {{fecha_fallecimiento}}", true),
        instrucciones: `${INSTRUCCIONES_COMUNES} El vínculo (cónyuge o hijo/a) sale del formulario. No transcribas la causa de muerte aunque figure en el acta.`,
      },
    ],
  },
  {
    codigo: "BAJA-ESTUDIOS",
    relevamiento: "006",
    nombre: "Baja de asignación por hijo/a por interrupción de estudios",
    descripcion: "Cese del pago de la asignación familiar por hijo/a cuando deja de estudiar.",
    categoria: "Bajas de asignaciones",
    icono: "user-minus",
    normativa: NORMATIVA_ASIGNACIONES,
    plazo_dias: 10,
    linea_base_dias: null,
    prioridad_base: "normal",
    reservado: false,
    pasos_actuales: 8,
    oficina: "Área Bonificaciones",
    requisitos: [
      req("certificado_estudios", "Certificado de estudios con fecha hasta", "Indica hasta cuándo cursó el hijo/a"),
      req("ddjj_interrupcion", "Declaración jurada de interrupción de estudios", "Formulario 9.1, si no tenés el certificado", false),
    ],
    formulario: [
      campo("familiar", "Apellido y nombre del hijo/a", "texto"),
      campo("dni_familiar", "DNI del hijo/a", "texto"),
      campo("fecha_interrupcion", "Fecha de interrupción de los estudios", "fecha"),
    ],
    documentacion_final: ["certificado_estudios", "ddjj_interrupcion"],
    pasos: circuitoEstandar({
      control: control("Control de documentación", ["Controlar la documentación adjunta", CIVITAS_BAJA], [FORMULARIO, "Certificado de estudios con fecha hasta"]),
      aportados: [FORMULARIO, "Certificado de estudios con fecha hasta"],
      focoDictamen: "Dictaminar sobre la baja, la fecha de cese y si alcanza también a la escolaridad",
    }),
    plantillas: [
      {
        tipo: "resolucion",
        nombre: "Resolución de baja de asignación por hijo/a (interrupción de estudios)",
        cuerpo: resolucionBaja(
          "hijo/a, por interrupción de estudios",
          "certificado de estudios o declaración jurada de interrupción de estudios en relación a {{familiar}}, DNI {{dni_familiar}}",
          true,
        ),
        instrucciones: `${INSTRUCCIONES_COMUNES} Si el dictamen aconseja también la baja de la asignación por escolaridad, incluila en el Artículo 1º; si no lo dice, marcá [REVISAR: ¿corresponde también la baja por escolaridad?].`,
      },
    ],
  },
  {
    codigo: "BAJA-PARTICULAR",
    relevamiento: "007",
    nombre: "Baja de asignación por motivos particulares",
    descripcion: "Pedido del/de la agente para dejar de percibir una asignación familiar.",
    categoria: "Bajas de asignaciones",
    icono: "user-minus",
    normativa: NORMATIVA_ASIGNACIONES,
    plazo_dias: 10,
    linea_base_dias: null,
    prioridad_base: "normal",
    reservado: false,
    pasos_actuales: 8,
    oficina: "Área Bonificaciones",
    // La "nota solicitando la baja" del papel pasa a ser el campo Motivo del formulario.
    requisitos: [],
    formulario: [
      campo("asignacion", "Asignación que querés dar de baja", "seleccion", { opciones: ["Por cónyuge", "Por hijo/a", "Por hijo/a con discapacidad", "Prenatal", "Otra"] }),
      { ...CAMPOS_FAMILIAR[0], obligatorio: false, ayuda: "Si la asignación es por un familiar" },
      { ...CAMPOS_FAMILIAR[1], obligatorio: false },
      campo("desde", "A partir de", "fecha"),
      campo("motivo", "Motivo", "texto_largo"),
    ],
    documentacion_final: [],
    pasos: circuitoEstandar({
      control: control("Control de la solicitud", ["Controlar la solicitud y el motivo", CIVITAS_BAJA], [FORMULARIO]),
      aportados: [FORMULARIO],
      focoDictamen: "Dictaminar sobre la baja solicitada",
    }),
    plantillas: [
      {
        tipo: "resolucion",
        nombre: "Resolución de baja de asignación por motivos particulares",
        cuerpo: resolucionBaja("{{asignacion}}", "la manifestación del/de la agente sobre los motivos particulares de la baja", true),
        instrucciones: `${INSTRUCCIONES_COMUNES} La asignación y el motivo salen del formulario. Si no hay familiar, eliminá "en relación a ..., DNI ...". Sin modelo del área: validar.`,
      },
    ],
  },
  {
    codigo: "ASIG-HIJO",
    relevamiento: "008",
    nombre: "Asignación familiar por hijo/a",
    descripcion: "Pago de la asignación familiar por hijo/a.",
    categoria: "Asignaciones familiares",
    icono: "users",
    normativa: `${NORMATIVA_ASIGNACIONES} [COMPLETAR por Capital Humano: edad máxima, escolaridad exigida y vigencia].`,
    plazo_dias: 10,
    linea_base_dias: null,
    prioridad_base: "normal",
    reservado: false,
    pasos_actuales: 8,
    oficina: "Área Bonificaciones",
    requisitos: [
      req("acta_nacimiento", "Acta de nacimiento del hijo/a"),
      req("negativa_anses", "Negativa de ANSES de la madre o del padre", "Certifica que el otro progenitor no percibe la asignación"),
      req("certificado_escolaridad", "Certificado de escolaridad", "Cuando el hijo/a está escolarizado", false),
    ],
    formulario: [
      campo("familiar", "Apellido y nombre del hijo/a", "texto"),
      campo("dni_familiar", "DNI del hijo/a", "texto"),
      campo("fecha_nacimiento", "Fecha de nacimiento", "fecha"),
    ],
    documentacion_final: ["acta_nacimiento", "negativa_anses", "certificado_escolaridad"],
    pasos: circuitoEstandar({
      control: control(
        "Control de documentación y grupo familiar",
        ["Controlar la documentación adjunta", "Controlar la negativa de ANSES del otro progenitor", CIVITAS_ALTA, "Actualizar el grupo familiar en Civitas"],
        [FORMULARIO, "Acta de nacimiento del hijo/a", "Negativa de ANSES de la madre o del padre"],
        ["Administración de grupo familiar", FOJA, REVISTA],
      ),
      aportados: [FORMULARIO, "Acta de nacimiento del hijo/a", "Negativa de ANSES de la madre o del padre"],
      focoDictamen: "Dictaminar sobre la procedencia de la asignación",
    }),
    plantillas: [
      {
        tipo: "resolucion",
        nombre: "Resolución de asignación por hijo/a",
        cuerpo: resolucionAlta("por hijo/a", "acta de nacimiento de {{familiar}}, DNI {{dni_familiar}}, y negativa de ANSES del otro progenitor"),
        instrucciones: `${INSTRUCCIONES_COMUNES} En {{en_relacion_a}} poné ", en relación a [hijo/a], DNI [dni]". Modelo derivado de los de bajas: validar con el área.`,
      },
    ],
  },
  // 009 — Reservado (datos de salud) y con prioridad alta. Medicina Laboral interviene en el alta;
  // en la renovación del CUD no (bifurcación pendiente de modelar: ver instrucciones del paso).
  {
    codigo: "ASIG-HIJO-DISC",
    relevamiento: "009",
    nombre: "Asignación familiar por hijo/a con discapacidad",
    descripcion: "Alta o renovación de la asignación familiar por hijo/a con discapacidad.",
    categoria: "Asignaciones familiares",
    icono: "heart-handshake",
    normativa: `${NORMATIVA_ASIGNACIONES} Ley 26.378 (Convención sobre los Derechos de las Personas con Discapacidad).`,
    plazo_dias: 5,
    linea_base_dias: null,
    prioridad_base: "alta",
    reservado: true,
    pasos_actuales: 9,
    oficina: "Área Bonificaciones",
    requisitos: [
      req("cud", "Certificado Único de Discapacidad (CUD)", "Vigente"),
      req("acta_nacimiento", "Acta de nacimiento del hijo/a"),
      req("negativa_anses", "Negativa de ANSES de la madre o del padre"),
      req("certificado_escolaridad", "Certificado de escolaridad", "Cuando el hijo/a está escolarizado", false),
      req("resolucion_anterior", "Resolución anterior", "Solo en la renovación del CUD", false),
    ],
    formulario: [
      campo("tipo_solicitud", "Tipo de solicitud", "seleccion", { opciones: ["Alta", "Renovación del CUD"] }),
      campo("familiar", "Apellido y nombre del hijo/a", "texto"),
      campo("dni_familiar", "DNI del hijo/a", "texto"),
      campo("vencimiento_cud", "Vencimiento del CUD", "fecha", { ayuda: "Sirve para avisarte antes de que venza" }),
    ],
    documentacion_final: ["cud", "acta_nacimiento", "negativa_anses", "certificado_escolaridad"],
    pasos: [
      {
        nombre: "Control del CUD e informe interno",
        area: "MEDLAB",
        accion: "analisis",
        plazo_horas: 48,
        controles: ["Controlar el Certificado Único de Discapacidad", "Producir el informe interno"],
        revisa: [FORMULARIO, "Certificado Único de Discapacidad (CUD)"],
        genera: ["Informe de Medicina Laboral"],
        instrucciones: "En la renovación del CUD Medicina Laboral no interviene: pasar directo al Área Bonificaciones.",
      },
      control(
        "Control de documentación y grupo familiar",
        [
          "Controlar la documentación adjunta",
          "Verificar en Civitas el vencimiento del CUD",
          CIVITAS_ALTA,
          "Actualizar el grupo familiar en Civitas",
        ],
        [FORMULARIO, "Acta de nacimiento del hijo/a", "Certificado Único de Discapacidad (CUD)", "Negativa de ANSES de la madre o del padre", "Informe de Medicina Laboral"],
        ["Administración de grupo familiar", FOJA, REVISTA],
      ),
      dictamen([FORMULARIO, "Acta de nacimiento del hijo/a", "Certificado Único de Discapacidad (CUD)", "Informe de Medicina Laboral", FOJA, REVISTA], "Dictaminar sobre la procedencia de la asignación"),
      proyecto([DICTAMEN, "Informe de Medicina Laboral", FOJA, REVISTA]),
      firma([RESOLUCION, DICTAMEN, "Certificado Único de Discapacidad (CUD)"]),
      novedad(["Registrar el vencimiento del CUD para el aviso de renovación"]),
    ],
    plantillas: [
      {
        tipo: "resolucion",
        nombre: "Resolución de asignación por hijo/a con discapacidad",
        cuerpo: resolucionAlta("por hijo/a con discapacidad", "Certificado Único de Discapacidad de {{familiar}}, DNI {{dni_familiar}}, con vencimiento el {{vencimiento_cud}}, e informe del Departamento de Medicina Laboral"),
        instrucciones: `${INSTRUCCIONES_COMUNES} Expediente RESERVADO: no transcribas diagnósticos; referí a "la documentación médica obrante". Usá "hijo/a con discapacidad", nunca "discapacitado". En {{en_relacion_a}} poné ", en relación a [hijo/a], DNI [dni]". Si es renovación, decilo en el VISTO. Modelo derivado de los de bajas: validar con el área.`,
      },
    ],
  },
  {
    codigo: "ASIG-MATRIMONIO",
    relevamiento: "010",
    nombre: "Asignación familiar por matrimonio",
    descripcion: "Pago de la asignación familiar por matrimonio del/de la agente.",
    categoria: "Asignaciones familiares",
    icono: "heart",
    normativa: NORMATIVA_ASIGNACIONES,
    plazo_dias: 10,
    linea_base_dias: null,
    prioridad_base: "normal",
    reservado: false,
    pasos_actuales: 8,
    oficina: "Área Bonificaciones",
    requisitos: [req("acta_matrimonio", "Acta de matrimonio")],
    formulario: [...CAMPOS_FAMILIAR.map((c) => ({ ...c, etiqueta: c.etiqueta.replace("del familiar", "del/de la cónyuge") })), campo("fecha_matrimonio", "Fecha de matrimonio", "fecha")],
    documentacion_final: ["acta_matrimonio"],
    pasos: circuitoEstandar({
      control: control("Control de documentación", ["Controlar la documentación adjunta", CIVITAS_ALTA], [FORMULARIO, "Acta de matrimonio"]),
      aportados: [FORMULARIO, "Acta de matrimonio"],
      focoDictamen: "Dictaminar sobre la procedencia de la asignación",
    }),
    plantillas: [
      {
        tipo: "resolucion",
        nombre: "Resolución de asignación por matrimonio",
        cuerpo: resolucionAlta("por matrimonio", "acta de matrimonio de fecha {{fecha_matrimonio}} con {{familiar}}, DNI {{dni_familiar}}"),
        instrucciones: `${INSTRUCCIONES_COMUNES} En {{en_relacion_a}} poné ", en relación a [cónyuge], DNI [dni]". Modelo derivado de los de bajas: validar con el área.`,
      },
    ],
  },
  {
    codigo: "ASIG-NACIMIENTO",
    relevamiento: "011",
    nombre: "Asignación familiar por nacimiento",
    descripcion: "Pago de la asignación familiar por nacimiento de hijo/a.",
    categoria: "Asignaciones familiares",
    icono: "baby",
    normativa: NORMATIVA_ASIGNACIONES,
    plazo_dias: 10,
    linea_base_dias: null,
    prioridad_base: "normal",
    reservado: false,
    pasos_actuales: 8,
    oficina: "Área Bonificaciones",
    requisitos: [
      req("acta_nacimiento", "Acta de nacimiento del hijo/a"),
      req("negativa_anses", "Negativa de ANSES de la madre o del padre", "Certifica que el otro progenitor no percibe la asignación"),
      req(
        "no_percepcion_empleador",
        "Certificado de no percepción de salario familiar del empleador",
        "Solo si la negativa de ANSES muestra al otro progenitor como trabajador registrado",
        false,
      ),
      req("certificado_discapacidad", "Certificado Único de Discapacidad (CUD)", "Solo si el hijo/a tiene discapacidad", false),
    ],
    formulario: [
      campo("familiar", "Apellido y nombre del hijo/a", "texto"),
      campo("dni_familiar", "DNI del hijo/a", "texto"),
      campo("fecha_nacimiento", "Fecha de nacimiento", "fecha"),
    ],
    documentacion_final: ["acta_nacimiento", "negativa_anses", "no_percepcion_empleador", "certificado_discapacidad"],
    pasos: circuitoEstandar({
      control: control(
        "Control de documentación y grupo familiar",
        ["Controlar la documentación adjunta", "Controlar la negativa de ANSES del otro progenitor", CIVITAS_ALTA, "Actualizar el grupo familiar en Civitas"],
        [FORMULARIO, "Acta de nacimiento del hijo/a", "Negativa de ANSES de la madre o del padre"],
        ["Administración de grupo familiar", FOJA, REVISTA],
      ),
      aportados: [FORMULARIO, "Acta de nacimiento del hijo/a", "Negativa de ANSES de la madre o del padre"],
      focoDictamen: "Dictaminar sobre la procedencia de la asignación",
    }),
    plantillas: [
      {
        tipo: "resolucion",
        nombre: "Resolución de asignación por nacimiento",
        cuerpo: resolucionAlta("por nacimiento", "acta de nacimiento de {{familiar}}, DNI {{dni_familiar}}, nacido/a el {{fecha_nacimiento}}, y negativa de ANSES del otro progenitor"),
        instrucciones: `${INSTRUCCIONES_COMUNES} En {{en_relacion_a}} poné ", en relación a [hijo/a], DNI [dni]". Si se acompaña CUD, mencionalo sin transcribir diagnóstico. Modelo derivado de los de bajas: validar con el área.`,
      },
    ],
  },
  {
    codigo: "ASIG-PRENATAL",
    relevamiento: "012",
    nombre: "Asignación familiar prenatal",
    descripcion: "Pago de la asignación prenatal durante el embarazo.",
    categoria: "Asignaciones familiares",
    icono: "heart-pulse",
    normativa: `${NORMATIVA_ASIGNACIONES} [COMPLETAR por Capital Humano: semanas mínimas de gestación y período de pago].`,
    plazo_dias: 10,
    linea_base_dias: null,
    prioridad_base: "normal",
    reservado: true,
    pasos_actuales: 10,
    oficina: "Área Bonificaciones",
    requisitos: [
      req("certificado_medico_fpp", "Certificado médico con fecha probable de parto"),
      req("ecografia", "Ecografía"),
    ],
    formulario: [campo("fecha_probable_parto", "Fecha probable de parto", "fecha")],
    documentacion_final: ["certificado_medico_fpp"],
    pasos: [
      control("Control de documentación", ["Controlar la documentación adjunta", CIVITAS_ALTA], [FORMULARIO, "Certificado médico con fecha probable de parto", "Ecografía"]),
      {
        nombre: "Entrevista e informe médico",
        area: "MEDLAB",
        accion: "analisis",
        plazo_horas: 72,
        controles: ["Entrevistar a la agente", "Constatar el embarazo y la fecha probable de parto"],
        revisa: ["Certificado médico con fecha probable de parto", "Ecografía"],
        genera: ["Informe de Medicina Laboral"],
      },
      dictamen([FORMULARIO, FOJA, REVISTA, "Informe de Medicina Laboral"], "Dictaminar sobre la procedencia de la asignación prenatal"),
      proyecto([DICTAMEN, "Informe de Medicina Laboral", FOJA, REVISTA]),
      firma([RESOLUCION, DICTAMEN, "Informe de Medicina Laboral"]),
      novedad(),
    ],
    plantillas: [
      {
        tipo: "resolucion",
        nombre: "Resolución de asignación prenatal",
        cuerpo: resolucionAlta("prenatal", "certificado médico con fecha probable de parto {{fecha_probable_parto}} e informe del Departamento de Medicina Laboral"),
        instrucciones: `${INSTRUCCIONES_COMUNES} Expediente RESERVADO: no transcribas datos de salud; referí a "la documentación médica obrante". En {{en_relacion_a}} no pongas nada. Modelo derivado de los de bajas: validar con el área.`,
      },
    ],
  },
  {
    codigo: "ASIG-CONYUGE",
    relevamiento: "013",
    nombre: "Asignación familiar por cónyuge",
    descripcion: "Pago de la asignación familiar por cónyuge.",
    categoria: "Asignaciones familiares",
    icono: "heart",
    normativa: NORMATIVA_ASIGNACIONES,
    plazo_dias: 10,
    linea_base_dias: null,
    prioridad_base: "normal",
    reservado: false,
    pasos_actuales: 8,
    oficina: "Área Bonificaciones",
    requisitos: [req("acta_matrimonio", "Acta de matrimonio")],
    formulario: [...CAMPOS_FAMILIAR.map((c) => ({ ...c, etiqueta: c.etiqueta.replace("del familiar", "del/de la cónyuge") })), campo("fecha_matrimonio", "Fecha de matrimonio", "fecha")],
    documentacion_final: ["acta_matrimonio"],
    pasos: circuitoEstandar({
      control: control("Control de documentación", ["Controlar la documentación adjunta", CIVITAS_ALTA], [FORMULARIO, "Acta de matrimonio"]),
      aportados: [FORMULARIO, "Acta de matrimonio"],
      focoDictamen: "Dictaminar sobre la procedencia de la asignación",
    }),
    plantillas: [
      {
        tipo: "resolucion",
        nombre: "Resolución de asignación por cónyuge",
        cuerpo: resolucionAlta("por cónyuge", "acta de matrimonio con {{familiar}}, DNI {{dni_familiar}}"),
        instrucciones: `${INSTRUCCIONES_COMUNES} En {{en_relacion_a}} poné ", en relación a [cónyuge], DNI [dni]". Modelo derivado de los de bajas: validar con el área.`,
      },
    ],
  },
]

// ---------------------------------------------------------------------
// Licencias (PROVISORIO: sin relevamiento todavía)
// ---------------------------------------------------------------------
const pasoSimple = (nombre: string, area: string, accion: Enum<"accion_paso">, plazo_horas: number): PasoSemilla => ({ nombre, area, accion, plazo_horas })

export const TRAMITES_LICENCIAS: TramiteSemilla[] = [
  {
    codigo: "LIC-EXAMEN",
    relevamiento: null,
    nombre: "Licencia por examen",
    descripcion: "Licencia para rendir exámenes en carreras de nivel medio, terciario o universitario.",
    categoria: "Licencias",
    icono: "graduation-cap",
    normativa: "[COMPLETAR por Capital Humano: artículo del Estatuto / régimen de licencias aplicable]",
    plazo_dias: 2,
    linea_base_dias: 35,
    prioridad_base: "normal",
    reservado: false,
    pasos_actuales: null,
    oficina: null,
    requisitos: [
      req("constancia_inscripcion", "Constancia de inscripción al examen", "Emitida por la institución educativa"),
      req("certificado_rendido", "Certificado de examen rendido", "Podés adjuntarlo después de rendir", false),
    ],
    formulario: [
      campo("institucion", "Institución educativa", "texto"),
      campo("carrera", "Carrera", "texto"),
      campo("materia", "Materia / espacio curricular", "texto"),
      campo("fecha_examen", "Fecha del examen", "fecha"),
      campo("dias_solicitados", "Días de licencia solicitados", "numero", { ayuda: "Incluye el día del examen" }),
    ],
    documentacion_final: ["certificado_rendido"],
    pasos: [
      pasoSimple("Recepción y control de requisitos", "MESA", "recepcion", 8),
      pasoSimple("Control de días disponibles", "LIC", "analisis", 8),
      pasoSimple("Proyecto de resolución", "DESP", "resolucion", 8),
      pasoSimple("Firma de la resolución", "DIR", "firma", 8),
      pasoSimple("Notificación y archivo", "MESA", "notificacion", 8),
    ],
    plantillas: [
      {
        tipo: "resolucion",
        nombre: "Resolución de licencia por examen",
        cuerpo: `RESOLUCIÓN N.º {{numero_resolucion}}
San Miguel de Tucumán, {{fecha_resolucion}}

**VISTO:**
El Expediente N.º {{numero_expediente}}, por el cual el/la agente {{agente}}, Legajo N.º {{legajo}}, solicita licencia por examen; y

**CONSIDERANDO:**
Que el/la agente acredita su inscripción para rendir la materia {{materia}} de la carrera {{carrera}}, en {{institucion}}, con fecha {{fecha_examen}};
Que la Sección Licencias informa que el/la agente cuenta con días disponibles en el período en curso;
Que corresponde hacer lugar a lo solicitado conforme {{normativa}};

Por ello,

**LA DIRECCIÓN DE CAPITAL HUMANO**
**RESUELVE:**

**ARTÍCULO 1º.-** CONCEDER al/la agente {{agente}}, Legajo N.º {{legajo}}, licencia por examen por el término de {{dias}} día(s) a partir del {{fecha_inicio}}.

**ARTÍCULO 2º.-** El/la agente deberá presentar el certificado de examen rendido dentro de los cinco (5) días hábiles posteriores.

**ARTÍCULO 3º.-** Comuníquese, notifíquese y archívese.`,
        instrucciones:
          "Verificá que la fecha del examen y los días solicitados sean coherentes. Si en el expediente ya consta el certificado de examen rendido, eliminá el artículo 2º. No inventes normativa: dejá el marcador [COMPLETAR].",
      },
    ],
  },
  {
    codigo: "LIC-HIJO-DISC",
    relevamiento: null,
    nombre: "Licencia por atención de hijo/a con discapacidad",
    descripcion: "Licencia especial para acompañamiento y tratamiento de hijo/a con discapacidad.",
    categoria: "Licencias",
    icono: "heart-handshake",
    normativa: "[COMPLETAR por Capital Humano: norma aplicable; dictámenes en estandarización]",
    plazo_dias: 3,
    linea_base_dias: null,
    prioridad_base: "alta",
    reservado: true,
    pasos_actuales: null,
    oficina: null,
    requisitos: [
      req("cud", "Certificado Único de Discapacidad (CUD)", "Vigente"),
      req("indicacion_medica", "Indicación médica o de tratamiento", "Con período sugerido"),
    ],
    formulario: [
      campo("hijo", "Apellido y nombre del hijo/a", "texto"),
      campo("dni_hijo", "DNI del hijo/a", "texto"),
      campo("desde", "Desde", "fecha"),
      campo("hasta", "Hasta", "fecha"),
      campo("detalle", "Detalle de la necesidad", "texto_largo", { obligatorio: false }),
    ],
    documentacion_final: ["cud"],
    pasos: [
      pasoSimple("Recepción y control de requisitos", "MESA", "recepcion", 8),
      pasoSimple("Dictamen", "DICT", "dictamen", 24),
      pasoSimple("Proyecto de resolución", "DESP", "resolucion", 8),
      pasoSimple("Firma de la resolución", "DIR", "firma", 8),
      pasoSimple("Notificación y archivo", "MESA", "notificacion", 8),
    ],
    plantillas: [
      {
        tipo: "dictamen",
        nombre: "Dictamen sobre licencia por hijo/a con discapacidad",
        cuerpo: `**DICTAMEN N.º {{numero_dictamen}}**
Ref.: Expte. N.º {{numero_expediente}} — Licencia por atención de hijo/a con discapacidad (RESERVADO)

**I. ANTECEDENTES**
{{antecedentes}}

**II. ANÁLISIS**
{{analisis}}

**III. CONCLUSIÓN**
{{conclusion}}`,
        instrucciones:
          'Expediente RESERVADO: no transcribas diagnósticos ni datos de salud más allá de lo imprescindible; referí a "la documentación médica obrante". Priorizá la continuidad del tratamiento.',
      },
    ],
  },
  {
    codigo: "LIC-ENFERMEDAD",
    relevamiento: null,
    nombre: "Licencia por enfermedad",
    descripcion: "Justificación de inasistencias por razones de salud con certificado médico.",
    categoria: "Licencias",
    icono: "stethoscope",
    normativa: "[COMPLETAR por Capital Humano: régimen de licencias por enfermedad; plazo de 48 h para el certificado]",
    plazo_dias: 2,
    linea_base_dias: null,
    prioridad_base: "normal",
    reservado: true,
    pasos_actuales: null,
    oficina: null,
    requisitos: [req("certificado_medico", "Certificado médico", "Presentar dentro de las 48 horas")],
    formulario: [
      campo("fecha_inicio", "Fecha de inicio", "fecha"),
      campo("dias_indicados", "Días indicados por el médico", "numero"),
      campo("observaciones", "Observaciones", "texto_largo", { obligatorio: false, ayuda: "No incluyas diagnóstico: el certificado ya lo contiene" }),
    ],
    documentacion_final: [],
    pasos: [
      pasoSimple("Recepción del certificado", "MESA", "recepcion", 4),
      pasoSimple("Control de licencia", "LIC", "analisis", 8),
      pasoSimple("Proyecto de resolución", "DESP", "resolucion", 8),
      pasoSimple("Firma de la resolución", "DIR", "firma", 8),
    ],
    plantillas: [],
  },
]

/** Trámites que ya no existen: se borran de la base si no tienen expedientes. */
export const CODIGOS_RETIRADOS = ["BONIF-TITULO", "ASIG-FAMILIAR"]

export const CATALOGO_SEMILLA: TramiteSemilla[] = [...TRAMITES_BONIFICACIONES, ...TRAMITES_LICENCIAS]
