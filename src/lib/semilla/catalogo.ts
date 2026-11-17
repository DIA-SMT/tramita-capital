// =====================================================================
// Catálogo base de Capital Humano (semilla de la base de datos)
//
// Relevamiento de Capital Humano del 16/11/2026 (29 trámites) y su informe de
// actualización para la Dirección de IA, circuito FINAL DIGITAL, con los
// modelos reales de dictamen, resolución e informe del área. Los códigos de
// `relevamiento` siguen el índice del 16/11 (001–029; el prenatal se separó en
// mujer 018 y varón 019, y la maternidad en postparto 025 y preparto 026).
// Lo que depende de una respuesta del área está marcado con "A validar con el
// área".
//
// Decisiones del área que rigen en todo el catálogo:
// - "Se elimina el formulario": los datos del agente salen del legajo de
//   Civitas. Acá salen del perfil; el formulario pide solo lo propio del pedido.
// - El primer paso ya no agrega foja de servicios ni situación de revista: la
//   Asesoría (o Medicina Laboral) las consulta en Civitas. Los modelos citan esa
//   consulta en lugar de una foja. Con API de Civitas aparecerían solas.
// - Requisito de Civitas para iniciar cualquier trámite: "Liquida SÍ" y sin
//   baja cargada ni en curso. Sin API se controla en el primer paso.
//
// 008 y 010 (certificados en término) y 021 (cambio de domicilio, Higiene y
// Seguridad, con el recorrido en un mapa) cierran sin resolución (migración
// 001600): su circuito no tiene firma y el área los cierra en el último paso.
// Sin cargar todavía: 022 (certificado de trabajo) se emitiría solo; 015 (hijo y familia
// numerosa) el área lo eliminó porque lo absorbe la asignación por hijo/a; 029
// (reducción horaria) "no tendrá versión digital por ahora" (depende de
// Fiscalía). La licencia por examen sigue provisoria: no vino en el relevamiento.
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
  /** Trámite de recurso: no se inicia desde el catálogo, solo desde un trámite resuelto (migración 001700). */
  es_recurso?: boolean
  /** Código del trámite de recurso de reconsideración que usa este trámite; null si no la admite. */
  reconsideracion?: string | null
}

// ---------------------------------------------------------------------
// Áreas
// ---------------------------------------------------------------------
export const AREAS_SEMILLA: AreaSemilla[] = [
  { codigo: "MESA", nombre: "Mesa de Entradas", descripcion: "Recepción y notificaciones. En el circuito digital de Bonificaciones no interviene." },
  {
    codigo: "BONIF",
    nombre: "Área Bonificaciones",
    descripcion: "Adicionales por título, asignaciones familiares y escolaridad: control, proyectos de resolución y novedades a Liquidación",
  },
  { codigo: "LIC", nombre: "Sección Licencias", descripcion: "Control de días disponibles de la licencia por examen (provisorio)" },
  { codigo: "MEDLAB", nombre: "Departamento de Medicina Laboral", descripcion: "Licencias médicas y por maternidad, entrevistas e informes médicos" },
  // A validar con el área: el membrete de los dictámenes dice "Asesoría Legal" y las resoluciones, "Asesoría Letrada".
  { codigo: "DICT", nombre: "Asesoría Legal", descripcion: "Dictámenes jurídicos de la Dirección de Capital Humano" },
  { codigo: "DESP", nombre: "Despacho", descripcion: "Proyectos de resolución de la licencia por examen (provisorio)" },
  { codigo: "DIR", nombre: "Dirección de Capital Humano", descripcion: "Control y firma de resoluciones" },
  { codigo: "LIQ", nombre: "Liquidación de Haberes", descripcion: "Impacto de las novedades en la liquidación" },
  {
    codigo: "HYS",
    nombre: "Departamento de Higiene y Seguridad",
    descripcion: "Control del recorrido entre el domicilio y el lugar de trabajo (cobertura de accidentes in itinere)",
  },
]

/**
 * Áreas que no pertenecen a Capital Humano y se quitan de la base si no tienen uso.
 * Fiscalía Municipal y Secretaría de Gobierno son organismos externos: cuando se modele
 * la segunda reconsideración, intervendrán como remisión a otro organismo, no como áreas.
 */
export const AREAS_RETIRADAS = ["FISC", "SGOB"]

// Recursos de reconsideración (migración 001700; los trámites de recurso, al final del archivo). Según el relevamiento del 16/11:
// - Primera: siempre que el/la agente no esté de acuerdo con lo resuelto, dentro de 8 días hábiles
//   (con el plazo extraordinario del art. 25 de la OPA, se admite incluso en las 2 primeras horas del
//   día hábil siguiente), con una nota de reconsideración y documentación nueva opcional. Circuito:
//   Asesoría Legal (plazo y fondo, nuevo dictamen) → Bonificaciones (resolución) → Dirección (firma)
//   → Bonificaciones (novedad si se admite y carga en Civitas).
// - Segunda (jerárquica): se habilita si se rechaza la primera, con una nota de segunda
//   reconsideración. Sigue en papel porque el expediente sale impreso de la repartición: Asesoría
//   Legal (informe) → Fiscalía Municipal (dictamen) → Secretaría de Gobierno (resolución).
// No la admiten: baja por interrupción de estudios y certificados en término. A validar con el área:
// el inicio de clases fuera de término dice que no la admite, pero su circuito la incluye.

// ---------------------------------------------------------------------
// Bloques comunes del circuito FINAL DIGITAL
// ---------------------------------------------------------------------
const FORMULARIO = "Formulario"
const DICTAMEN = "Dictamen"
const RESOLUCION = "Resolución"
const FIRMADA = "Resolución firmada"
const NOVEDAD = "Novedad a Liquidación de Haberes"
const INFORME_MEDLAB = "Informe de Medicina Laboral"

// Condiciones de Civitas. El relevamiento las pone como requisito para poder iniciar; sin API de
// Civitas no se pueden comprobar al iniciar, así que las controla el área en el primer paso.
/** Requisito de todos los trámites del relevamiento del 16/11 ("no es posible iniciar el trámite, el agente no se encuentra activo"). */
const CIVITAS_ACTIVO = "Verificar en Civitas que el/la agente tenga «Liquida SÍ» en su legajo y no tenga una baja cargada ni en curso"
/** Ya no se adjuntan: el relevamiento pide que la Asesoría vea estos datos de Civitas sin que nadie los agregue. */
const CIVITAS_DATOS = "Consultar en Civitas la situación de revista y la foja de servicios del/de la agente (ya no se adjuntan al expediente)"
const CIVITAS_ALTA = "Verificar en Civitas que no se haya hecho lugar antes a la misma solicitud"
const CIVITAS_BAJA = "Verificar en Civitas que la asignación esté vigente y desde cuándo se liquida"
const CIVITAS_HIJO_PERCIBE = "Verificar en Civitas que el hijo/a esté registrado/a y que el/la agente perciba la asignación por hijo/a por él/ella (requisito excluyente)"
const civitasNoPercibe = (quien: string) =>
  `Verificar en Civitas que ${quien} no esté declarado/a en el grupo familiar o, si lo está, que figure en el ítem Asignación con código A (a cargo) o N (no genera asignación); si ya genera asignación, no corresponde el trámite`
const civitasDeclarado = (quien: string) => `Verificar en Civitas que ${quien} esté declarado/a en el grupo familiar`
const CIERRE = "Notificación electrónica al agente, incorporación al legajo digital y archivo"

const dictamen = (revisa: string[], foco: string): PasoSemilla => ({
  nombre: "Dictamen",
  area: "DICT",
  accion: "dictamen",
  plazo_horas: 48,
  controles: ["Controlar la documentación", CIVITAS_DATOS, foco],
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

/** Cierre de la escolaridad admitida: se carga en el sistema de escolaridad (externo) y en la foja; no es novedad de haberes. */
const cierreEscolaridad: PasoSemilla = {
  nombre: "Carga en el sistema de escolaridad y cierre",
  area: "BONIF",
  accion: "notificacion",
  plazo_horas: 24,
  controles: ["Cargar el certificado admitido en el sistema de escolaridad", "Registrar la escolaridad en la foja de servicios"],
  revisa: [FIRMADA],
  genera: [],
  permite_subsanacion: false,
  destino_final: CIERRE,
}

/** Circuito estándar de 5 pasos: control → dictamen → proyecto → firma → novedad (u otro cierre). */
function circuitoEstandar(op: { control: PasoSemilla; aportados: string[]; focoDictamen: string; extraNovedad?: string[]; cierre?: PasoSemilla }): PasoSemilla[] {
  const generados = op.control.genera ?? []
  const base = [...op.aportados, ...generados]
  return [
    op.control,
    dictamen(base, op.focoDictamen),
    proyecto([DICTAMEN, ...base]),
    firma([RESOLUCION, DICTAMEN, ...op.aportados]),
    op.cierre ?? novedad(op.extraNovedad),
  ]
}

/**
 * Primer paso de Bonificaciones: controla y verifica. Ya no agrega foja de servicios ni situación de
 * revista (las consulta la Asesoría en Civitas); lo controlado queda en la providencia del pase.
 */
const control = (nombre: string, controles: string[], revisa: string[], genera: string[] = []): PasoSemilla => ({
  nombre,
  area: "BONIF",
  accion: "analisis",
  plazo_horas: 48,
  controles: [...controles, CIVITAS_ACTIVO],
  revisa,
  genera,
})

// Pago único (matrimonio y nacimiento): la novedad se registra con un solo período.
const PAGO_UNICO = "Es pago único: registrar la novedad con un solo período (desde y hasta el mismo mes)"

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
const CAMPOS_HIJO = [
  campo("familiar", "Apellido y nombre del hijo/a", "texto"),
  campo("dni_familiar", "DNI del hijo/a", "texto"),
  campo("fecha_nacimiento", "Fecha de nacimiento del hijo/a", "fecha"),
]
const CAMPOS_CONYUGE = CAMPOS_FAMILIAR.map((c) => ({ ...c, etiqueta: c.etiqueta.replace("del familiar", "del/de la cónyuge") }))
// El dictamen cita la negativa de ANSES del otro progenitor con su nombre y CUIL.
const CAMPOS_PROGENITOR = [
  campo("progenitor", "Apellido y nombre del otro progenitor", "texto", { obligatorio: false, ayuda: "El de la negativa de ANSES" }),
  campo("cuil_progenitor", "CUIL del otro progenitor", "texto", { obligatorio: false }),
]
const OBSERVACIONES = campo("observaciones", "Observaciones", "texto_largo", { obligatorio: false })

// ---------------------------------------------------------------------
// Modelos de dictamen y resolución (anonimizados y adaptados al expediente digital)
// Los artículos de registro y notificación reemplazan la protocolización
// manual y la notificación a través de la repartición: validar con el área.
// ---------------------------------------------------------------------
const encabezadoResolucion = (oficina: string) => `RESOLUCIÓN N.º {{numero_resolucion}}
Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · ${oficina}
San Miguel de Tucumán, {{fecha_resolucion}}`
const ENCABEZADO = encabezadoResolucion("Área Bonificaciones")

const ART_REGISTRO = "Registrar la presente Resolución en el Registro de Resoluciones de la Dirección de Capital Humano."
const ART_NOTIFICACION = "Notificar al/a la agente por medio del sistema de expedientes electrónicos, con constancia de fecha en el expediente. Notificado/a, archívese."

// Los modelos de título nombran la categoría del agente; los de asignaciones y bajas, no.
const VISTO_AGENTE = "el/la agente {{agente}}, afiliado/a N.º {{legajo}}, dependiente de {{dependencia}}, y con prestación de servicios en {{reparticion}}"
const VISTO_AGENTE_CATEGORIA = "el/la agente {{agente}}, afiliado/a N.º {{legajo}}, categoría {{categoria}}, dependiente de {{dependencia}}, y con prestación de servicios en {{reparticion}}"

// Así nombran a la Asesoría los modelos de resolución del área.
const ASESORIA = "Asesoría Letrada de la Dirección de Capital Humano"

// Foja de servicios y situación de revista ya no se agregan al expediente: se citan como consulta a Civitas.
const CONSULTA_CIVITAS = "Que se consultaron en el sistema Civitas la foja de servicios y la situación de revista del/de la agente;"

const INSTRUCCIONES_COMUNES = [
  "Las referencias \"a fs.\" tomalas de la numeración de fojas del expediente.",
  "Si el sentido indicado es NO hacer lugar, el Artículo 1º dice \"No hacer lugar al pedido...\" con los fundamentos del dictamen, y se omite el porcentaje o la fecha de efecto.",
  "Concordá el género (el/la agente) con los datos del agente.",
].join(" ")

const INSTRUCCIONES_DICTAMEN = [
  "El dictamen no lleva número. {{fecha}} es la fecha de hoy.",
  "Las referencias \"A fs.\" tomalas de la numeración de fojas del expediente; la planta, el vínculo y la fecha de alta salen de la consulta de Civitas (si no están en el expediente, [COMPLETAR]).",
  "Si la documentación no alcanza para hacer lugar, no lo aconsejes: señalá qué falta.",
  "Concordá el género (el/la agente) con los datos del agente.",
].join(" ")

const encabezadoDictamen = (asunto: string) => `Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Asesoría Legal
San Miguel de Tucumán, {{fecha}}

EXPEDIENTE: {{numero_expediente}}
FECHA: {{fecha_expediente}}
DEPENDENCIA: {{dependencia}}
CAUSANTE: {{agente}}, AF {{legajo}}
ASUNTO: ${asunto}

A la Dirección de Capital Humano
S/D

**DICTAMEN**`

// --- Adicional por título ---------------------------------------------
type NivelTitulo = "Secundario" | "Terciario" | "Universitario"

/** Qué documento acredita el título, según el nivel (modelos del área). */
const DOCUMENTO_TITULO: Record<NivelTitulo, string> = {
  Secundario: "certificado analítico de estudios secundarios de {{titulo_obtenido}}",
  Terciario: "certificado analítico y del diploma de {{titulo_obtenido}}",
  Universitario: "diploma universitario de {{titulo_obtenido}}",
}

function resolucionTitulo(nivel: NivelTitulo, porcentaje: string, conDuracion: boolean) {
  return `${ENCABEZADO}

**VISTO:**
El Expediente N.º {{numero_expediente}}, de fecha {{fecha_expediente}}, por el cual ${VISTO_AGENTE_CATEGORIA}, solicita el pago del adicional por Título ${nivel} de {{titulo_obtenido}}; y

**CONSIDERANDO:**
Que a fs. {{fs}}, obra solicitud de pago del adicional por título efectuada por el/la agente;
Que a fs. {{fs}}, obra copia certificada del ${DOCUMENTO_TITULO[nivel]} a favor del/de la agente, expedido por {{institucion}};
Que a fs. {{fs}}, el Área Bonificaciones de esta Dirección deja constancia de la verificación de su autenticidad;
${CONSULTA_CIVITAS}
Que a fs. {{fs}}, obra dictamen de ${ASESORIA}, aconsejando hacer lugar al pago del adicional por Título ${nivel};

Por lo expuesto, y en virtud de lo establecido por los Decretos N.º 82/77, 23/81, 1320/01, 143/79, Art. 5º, y Ordenanza N.º 3537/04;

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** Hacer lugar al pedido de pago del adicional por título y otorgar al/a la agente {{agente}}, afiliado/a N.º {{legajo}}, el pago del adicional por Título ${nivel} de {{titulo_obtenido}}${conDuracion ? ", con duración de {{duracion}} años" : ""}, con porcentaje del ${porcentaje} de la categoría de revista, a partir de {{mes_anio_efecto}}, por los motivos expresados en los considerandos que anteceden.

**Artículo 2º:** ${ART_REGISTRO}

**Artículo 3º:** ${ART_NOTIFICACION}`
}

function dictamenTitulo(nivel: NivelTitulo, porcentaje: string, conDuracion: boolean) {
  const n = nivel.toLowerCase()
  return `${encabezadoDictamen("PAGO ADICIONAL POR TÍTULO")}

Vienen a dictamen los presentes autos por medio de los cuales el/la agente {{agente}}, AF {{legajo}}, dependiente de {{dependencia}}, solicita el pago del adicional por título ${n} de "{{titulo_obtenido}}", expedido por {{institucion}}.

Se acompaña la siguiente documentación:
A fs. {{fs}}, solicitud de pago del adicional por título.
A fs. {{fs}}, copia certificada del ${DOCUMENTO_TITULO[nivel]}.
A fs. {{fs}}, verificación del título realizada por {{verificador}}, en fecha {{fecha_verificacion}}.
Según los antecedentes laborales y la situación de revista del/de la agente consultados en el sistema Civitas, revista con fecha de alta el {{fecha_alta}}, {{vinculo_laboral}}.

Las normas legales vigentes que regulan la materia de títulos y su pago, que resultan aplicables al caso son: Decreto N.º 82/77, Decreto N.º 1320/01, el Decreto N.º 143/79, artículo 5, y art. 1 de la Ordenanza N.º 3537/04.

El/la peticionante ha cumplido con los requisitos legales necesarios para acreditar título ${n}${conDuracion ? " de {{duracion}} años de duración" : ""}.

Por lo expuesto, sugiero DISPONER EL PAGO DEL ${porcentaje} en concepto de adicional por título ${n} de {{titulo_obtenido}}, al/a la agente {{agente}}, AF {{legajo}}, dependiente de {{dependencia}}, a partir de {{mes_anio_efecto}}.

Tal es mi dictamen.`
}

// --- Asignaciones familiares ------------------------------------------
// Modelos reales del área: dictamen y resolución del pago por nacimiento y por hijo/a.
// Las demás asignaciones siguen la misma estructura.
function resolucionAlta(op: { asignacion: string; acredita: string[]; pagoUnico?: boolean }) {
  const pago = op.pagoUnico ? "pago único" : "pago"
  return `${ENCABEZADO}

**VISTO:**
El Expediente N.º {{numero_expediente}}, de fecha {{fecha_expediente}}, por el cual ${VISTO_AGENTE}, solicita el pago de la asignación familiar ${op.asignacion}; y

**CONSIDERANDO:**
Que a fs. {{fs}}, obra solicitud de pago de la asignación familiar ${op.asignacion};
${op.acredita.map((a) => `Que a fs. {{fs}}, obra ${a};`).join("\n")}
${CONSULTA_CIVITAS}
Que a fs. {{fs}}, obra dictamen de ${ASESORIA}, indicando que corresponde hacer lugar al pedido de ${pago} de la asignación familiar ${op.asignacion}{{en_relacion_a}}. Dicho pago debe efectuarse desde el mes de {{mes_anio_efecto}};

Por lo expuesto y en ejercicio de la competencia que le acuerda el Decreto N.º 143/G/79, artículo 2º;

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** Hacer lugar al pedido y otorgar el ${pago} de la asignación familiar ${op.asignacion} al/a la agente {{agente}}, afiliado/a N.º {{legajo}}, dependiente de {{dependencia}}, con prestación de servicios en {{reparticion}}{{en_relacion_a}}, y a partir de {{mes_anio_efecto}}, en atención a las razones invocadas en los considerandos que anteceden.

**Artículo 2º:** ${ART_REGISTRO}

**Artículo 3º:** ${ART_NOTIFICACION}`
}

function dictamenAsignacion(op: { asignacion: string; documentacion: string[]; analisis: string; pagoUnico?: boolean }) {
  return `${encabezadoDictamen("PAGO DE ASIGNACIÓN FAMILIAR")}

Vienen las presentes actuaciones a este servicio jurídico, por medio de las cuales el/la agente {{agente}}, afiliado/a N.º {{legajo}}, dependiente de {{dependencia}}, inicia expediente por pago de asignación familiar ${op.asignacion}.

Documentación obrante en el expediente y normativa aplicable.-
A fs. {{fs}}, obra la solicitud de pago de asignación familiar;
${op.documentacion.map((d) => `A fs. {{fs}}, obra ${d};`).join("\n")}
Según los antecedentes laborales y la situación de revista del/de la agente consultados en el sistema Civitas, revista en planta {{planta}}, con fecha de alta el {{fecha_alta}}, dependiente de {{dependencia}}.

La normativa vigente que regula el caso planteado es, a saber: la Ordenanza N.º 546/75, artículos N.º 2, 6 y 8, y el Decreto Reglamentario N.º 584/75, artículos N.º 3, 5, 7 y 15, respecto del pago de asignación familiar ${op.asignacion}.

Análisis.-
Entrando a analizar los presentes autos bajo la normativa vigente, resulta que ${op.analisis}

En consecuencia, de las presentes actuaciones surge que el/la agente acredita los requisitos establecidos por la normativa vigente a fin de poder acceder al pago de la asignación familiar ${op.asignacion}.

Por ello, y conforme a lo considerado, se aconseja HACER LUGAR al/a la agente {{agente}}, afiliado/a N.º {{legajo}}, dependiente de {{dependencia}}, al ${op.pagoUnico ? "PAGO ÚNICO" : "PAGO"} DE LA ASIGNACIÓN FAMILIAR ${op.asignacion.toUpperCase()}{{en_relacion_a}}. El mismo deberá efectuarse a partir de {{mes_anio_efecto}}.

Tal es mi dictamen.`
}

const INSTRUCCIONES_ALTA = `${INSTRUCCIONES_COMUNES} El pago rige desde el mes de la solicitud (fecha del expediente) salvo que el dictamen diga otra cosa.`
// A validar con el área: el dictamen modelo cita estos artículos para nacimiento y por hijo/a; no se sabe si valen para las demás asignaciones.
const ARTICULOS_A_CONFIRMAR =
  "Los artículos de la Ordenanza N.º 546/75 y del Decreto N.º 584/75 del modelo corresponden al pago por nacimiento y por hijo/a: para esta asignación escribí [COMPLETAR: artículos aplicables de la Ordenanza N.º 546/75 y del Decreto N.º 584/75]."
const NEGATIVA_ANSES = "certificación negativa de ANSES de {{progenitor}}, C.U.I.L. N.º {{cuil_progenitor}}, donde consta que no percibe asignaciones familiares"
const ANALISIS_NEGATIVA = "De la constancia de certificación negativa correspondiente a {{progenitor}} (fs. {{fs}}), surge que no registra liquidación de asignaciones familiares."

// --- Bajas de asignaciones --------------------------------------------
function resolucionBaja(asignacion: string, acredita: string, conDictamen: boolean) {
  return `${ENCABEZADO}

**VISTO:**
El Expediente N.º {{numero_expediente}}, de fecha {{fecha_expediente}}, por el cual ${VISTO_AGENTE}, solicita el cese del pago de la asignación familiar por ${asignacion}; y

**CONSIDERANDO:**
Que a fs. {{fs}}, obra la solicitud de baja de la asignación familiar del/de la agente;
Que a fs. {{fs}}, obra ${acredita};
${CONSULTA_CIVITAS}${
    conDictamen
      ? `\nQue a fs. {{fs}}, obra dictamen de ${ASESORIA}, aconsejando hacer lugar al pedido de baja de la asignación por ${asignacion}, a partir de {{mes_anio_cese}};`
      : ""
  }

Por lo expuesto y en ejercicio de la competencia que le acuerda el Decreto N.º 143/G/79, artículo 2º;

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** Hacer lugar al pedido y disponer el cese del pago de la asignación familiar por ${asignacion} en relación a {{familiar}}, DNI {{dni_familiar}}, a partir de {{mes_anio_cese}}, al/a la agente {{agente}}, afiliado/a N.º {{legajo}}, conforme a lo citado en los considerandos que anteceden.

**Artículo 2º:** ${ART_REGISTRO}

**Artículo 3º:** ${ART_NOTIFICACION}`
}

// --- Certificados escolares presentados fuera de término ---------------
function resolucionEscolaridad(momento: "inicio" | "fin") {
  const palabra = momento === "inicio" ? "inicio" : "finalización"
  const sigla = momento === "inicio" ? "CIC" : "CFC"
  return `${ENCABEZADO}

**VISTO:**
El Expediente N.º {{numero_expediente}}, de fecha {{fecha_expediente}}, por el cual el/la agente {{agente}}, afiliado/a N.º {{legajo}}, dependiente de {{dependencia}}, presenta en forma extemporánea el certificado escolar de ${palabra} de clases del ciclo lectivo {{ciclo_lectivo}}; y

**CONSIDERANDO:**
Que a fs. {{fs}}, obra el pedido del/de la agente, solicitando admitir ${sigla}/{{ciclo_lectivo}};
Que a fs. {{fs}}, obra certificado de ${palabra} de clases correspondiente al ciclo lectivo {{ciclo_lectivo}}, perteneciente a {{hijos}}, hijos/as del/de la agente;
Que se consultó en el sistema Civitas la situación de revista del/de la agente;
Que a fs. {{fs}}, obra dictamen de ${ASESORIA}, indicando admitir la carga extemporánea del certificado de ${palabra} de clases {{ciclo_lectivo}}, presentado por el/la agente;

Por ello y en uso de las facultades conferidas en el Anexo III del Decreto N.º 2118/SG/04 y su ampliatorio Decreto N.º 2683/SEH/08;

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** Hacer lugar al pedido y admitir el certificado escolar de ${palabra} de clases del ciclo lectivo {{ciclo_lectivo}}, presentado extemporáneamente por el/la agente {{agente}}, afiliado/a N.º {{legajo}}, perteneciente a {{hijos}}, y liquidar a favor del/de la agente la asignación familiar por escolaridad {{nivel_escolaridad}}, en atención a las razones invocadas en los considerandos que anteceden.

**Artículo 2º:** ${ART_REGISTRO}

**Artículo 3º:** ${ART_NOTIFICACION}`
}

// ---------------------------------------------------------------------
// Normativa
// ---------------------------------------------------------------------
const NORMATIVA_TITULO =
  "Decretos N.º 82/77, 23/81, 1320/01 y 143/79 (art. 5º) y Ordenanza N.º 3537/04, según el modelo de resolución del Área Bonificaciones."
// El Formulario 14 cita además la Ord. N.º 646/86, los Dtos. N.º 302/90, 550/86 y 557/99, la Ley N.º 24.195 y el
// Dictamen de Fiscalía Municipal N.º 19963 (leídos de una imagen). A validar con el área antes de pasarlos a la normativa.
const NORMATIVA_ASIGNACIONES =
  "Ordenanza N.º 546/75 de Asignaciones Familiares y su Decreto Reglamentario N.º 584/SEH/75. Competencia: Decreto N.º 143/G/79, art. 2º (según los modelos de resolución del Área Bonificaciones). [COMPLETAR por Capital Humano: montos vigentes]."
const NORMATIVA_ALTAS = `${NORMATIVA_ASIGNACIONES} En el pago por nacimiento y por hijo/a, el dictamen modelo cita la Ordenanza N.º 546/75, arts. 2º, 6º y 8º, y el Decreto Reglamentario N.º 584/75, arts. 3º, 5º, 7º y 15; el art. 6º de la Ordenanza exige una antigüedad y un plazo para solicitar la asignación. [COMPLETAR por Capital Humano: antigüedad mínima y plazo para solicitar].`
const NORMATIVA_ESCOLARIDAD =
  "Competencia: Anexo III del Decreto N.º 2118/SG/04 y su ampliatorio Decreto N.º 2683/SEH/08 (según los modelos de resolución del Área Bonificaciones). Régimen de asignaciones familiares: Ordenanza N.º 546/75 y Decreto Reglamentario N.º 584/SEH/75. El certificado de inicio de clases se presenta dentro de los 60 días de iniciado el ciclo lectivo, ante el encargado de personal de la repartición. [COMPLETAR por Capital Humano: plazo del certificado de fin de clases y desde qué mes se liquida la escolaridad admitida fuera de término]."

// ---------------------------------------------------------------------
// Trámites del Área Bonificaciones (relevamiento 16/11/2026)
// ---------------------------------------------------------------------
const titulo = (op: {
  codigo: string
  relevamiento: string
  nivel: NivelTitulo
  icono: string
  conAnalitico: boolean
  conDiploma: boolean
  porcentaje: string
  normativa: string
  instruccionesPorcentaje: string
}): TramiteSemilla => {
  const aportados = [FORMULARIO, ...(op.conAnalitico ? ["Certificado analítico"] : []), ...(op.conDiploma ? ["Diploma autenticado"] : [])]
  const conDuracion = op.nivel !== "Secundario"
  const n = op.nivel.toLowerCase()
  return {
    codigo: op.codigo,
    relevamiento: op.relevamiento,
    nombre: `Adicional por título ${n}`,
    descripcion: `Pago del adicional salarial por título ${n}.`,
    categoria: "Bonificaciones por título",
    icono: op.icono,
    normativa: `${NORMATIVA_TITULO} ${op.normativa}`,
    plazo_dias: 10,
    linea_base_dias: null,
    prioridad_base: "normal",
    reservado: false,
    pasos_actuales: 8,
    oficina: "Área Bonificaciones",
    requisitos: [
      ...(op.conAnalitico ? [req("certificado_analitico", "Certificado analítico", "Copia certificada")] : []),
      ...(op.conDiploma ? [req("diploma", "Diploma autenticado", "Copia certificada, anverso y reverso")] : []),
    ],
    // Formulario 17: el área lo elimina y los datos del agente salen del legajo de Civitas (acá, del perfil). Quedan
    // los del título, que Civitas no tiene. A validar con el área: domicilio y domicilio laboral, que el perfil no tiene.
    formulario: [
      campo("titulo_obtenido", "Título obtenido", "texto", { ayuda: "Tal como figura en el diploma" }),
      ...(conDuracion ? [campo("duracion", "Duración de la carrera (años)", "numero", { ayuda: "Según el plan de estudios" })] : []),
      campo("institucion", "Establecimiento que lo expide", "texto"),
      campo("localidad_institucion", "Localidad del establecimiento", "texto"),
      campo("domicilio_institucion", "Domicilio del establecimiento", "texto", { obligatorio: false }),
      campo("mail_institucion", "Mail del establecimiento", "texto", { obligatorio: false, ayuda: "Sirve para pedir la verificación del título" }),
      campo("fecha_egreso", "Fecha de egreso", "fecha", { obligatorio: false }),
      OBSERVACIONES,
    ],
    // Al legajo: lo que adjuntó el agente y la resolución firmada (el informe de verificación ya no va).
    documentacion_final: [...(op.conAnalitico ? ["certificado_analitico"] : []), ...(op.conDiploma ? ["diploma"] : [])],
    pasos: circuitoEstandar({
      // La verificación queda en la providencia del pase ("se verifica o no se verifica la documentación").
      control: control(
        "Control de documentación y verificación del título",
        [
          "Controlar la documentación adjunta",
          op.nivel === "Universitario"
            ? "Verificar el título online en el Registro Público de Graduados Universitarios (SIU-CIN) o, si es extranjero, en el de convalidaciones"
            : "Verificar la autenticidad del título",
          CIVITAS_ALTA,
          `Verificar en Civitas que el/la agente no esté cobrando ya el adicional por título ${n}`,
        ],
        aportados,
      ),
      aportados,
      focoDictamen: "Dictaminar sobre la procedencia del adicional por título",
    }),
    plantillas: [
      {
        tipo: "dictamen",
        nombre: `Dictamen sobre adicional por título ${n}`,
        cuerpo: dictamenTitulo(op.nivel, op.porcentaje, conDuracion),
        instrucciones: `${INSTRUCCIONES_DICTAMEN} El adicional rige a partir del mes de la solicitud (fecha del expediente). Si se acompaña un título de posgrado, no se paga: indicá que deberá registrarse en los antecedentes laborales del/de la agente y agregarse la copia al legajo. ${op.instruccionesPorcentaje}`,
      },
      {
        tipo: "resolucion",
        nombre: `Resolución de adicional por título ${n}`,
        cuerpo: resolucionTitulo(op.nivel, op.porcentaje, conDuracion),
        instrucciones: `${INSTRUCCIONES_COMUNES} El adicional rige a partir del mes de la solicitud salvo que el dictamen diga otra cosa. ${op.instruccionesPorcentaje}`,
      },
    ],
  }
}

// Certificados escolares dentro de término (008 y 010): un solo paso de Bonificaciones (control y carga en el sistema de
// escolaridad y en la foja), sin dictamen ni resolución. Cierran sin resolución (migración 001600): el área los cierra
// con la constancia de lo hecho. No admiten recurso de reconsideración. A validar con el área: el plazo del certificado
// de fin de clases y qué va al legajo (el relevamiento no lo define).
const certificadoEnTermino = (op: { codigo: string; relevamiento: string; momento: "inicio" | "fin" }): TramiteSemilla => {
  const clave = `certificado_${op.momento}_clases`
  const certificado = `Certificado escolar de ${op.momento} de clases`
  return {
    codigo: op.codigo,
    relevamiento: op.relevamiento,
    nombre: `Certificado de ${op.momento} de clases`,
    descripcion:
      op.momento === "inicio"
        ? "Presentación del certificado de inicio de clases dentro de los 60 días del inicio del ciclo lectivo, para cobrar la asignación por escolaridad. Si ya pasó el plazo, iniciá el de fuera de término."
        : "Presentación del certificado de fin de clases en término, para cobrar la asignación por escolaridad. Si ya pasó el plazo, iniciá el de fuera de término.",
    categoria: "Escolaridad",
    icono: "backpack",
    normativa: NORMATIVA_ESCOLARIDAD,
    plazo_dias: 5,
    linea_base_dias: null,
    prioridad_base: "normal",
    reservado: false,
    pasos_actuales: 3,
    oficina: "Área Bonificaciones",
    requisitos: [req(clave, certificado, "Formulario de concurrencia escolar del Portal del Empleado, con sello y firma del establecimiento")],
    formulario: [
      campo("ciclo_lectivo", "Ciclo lectivo", "numero"),
      campo("hijos", "Hijos/as que incluye el certificado", "texto_largo", {
        ayuda: "Solo los que te generan asignación por hijo/a. Para cada uno: apellido y nombre, DNI, curso o grado, e institución a la que asiste",
      }),
      OBSERVACIONES,
    ],
    documentacion_final: [clave],
    pasos: [
      {
        nombre: "Control y carga en el sistema de escolaridad",
        area: "BONIF",
        accion: "notificacion",
        plazo_horas: 48,
        controles: [
          "Controlar la documentación adjunta",
          "Controlar que el certificado corresponda al ciclo lectivo, esté en término y tenga sello y firma del establecimiento",
          CIVITAS_HIJO_PERCIBE,
          CIVITAS_ALTA,
          CIVITAS_ACTIVO,
          "Cargar el certificado en el sistema de escolaridad",
          "Registrar la escolaridad en la foja de servicios",
        ],
        revisa: [FORMULARIO, certificado],
        genera: [],
        destino_final: CIERRE,
      },
    ],
    plantillas: [],
  }
}

// Certificados escolares fuera de término (009 y 011): pasan por la Asesoría y terminan en resolución.
const certificadoFueraDeTermino = (op: { codigo: string; relevamiento: string; momento: "inicio" | "fin" }): TramiteSemilla => {
  const clave = `certificado_${op.momento}_clases`
  const certificado = `Certificado escolar de ${op.momento} de clases`
  const aportados = [FORMULARIO, certificado]
  return {
    codigo: op.codigo,
    relevamiento: op.relevamiento,
    nombre: `Certificado de ${op.momento} de clases fuera de término`,
    descripcion:
      op.momento === "inicio"
        ? "Presentación del certificado de inicio de clases pasados los 60 días del inicio del ciclo lectivo, para cobrar la asignación por escolaridad."
        : "Presentación del certificado de fin de clases fuera de plazo, para cobrar la asignación por escolaridad.",
    categoria: "Escolaridad",
    icono: "backpack",
    normativa: NORMATIVA_ESCOLARIDAD,
    plazo_dias: 10,
    linea_base_dias: null,
    prioridad_base: "normal",
    reservado: false,
    pasos_actuales: 8,
    oficina: "Área Bonificaciones",
    requisitos: [req(clave, certificado, "Formulario de concurrencia escolar del Portal del Empleado, con sello y firma del establecimiento")],
    // La nota de pedido del papel pasa a ser el campo Motivo, como en la baja por motivos particulares. El relevamiento
    // pide elegir uno por uno los hijos/as por los que percibe asignación (con API de Civitas, de una lista), con su
    // curso o grado y la institución. A validar con el área: un expediente por presentación (varios hijos/as) o uno por hijo/a.
    formulario: [
      campo("ciclo_lectivo", "Ciclo lectivo", "numero"),
      campo("hijos", "Hijos/as que incluye el certificado", "texto_largo", {
        ayuda: "Solo los que te generan asignación por hijo/a. Para cada uno: apellido y nombre, DNI, curso o grado, e institución a la que asiste",
      }),
      campo("motivo", "Motivo de la presentación fuera de término", "texto_largo"),
      OBSERVACIONES,
    ],
    // A validar con el área: el relevamiento no define qué va al legajo.
    documentacion_final: [clave],
    pasos: circuitoEstandar({
      control: control(
        "Control de documentación",
        ["Controlar la documentación adjunta", "Controlar que el certificado corresponda al ciclo lectivo y tenga sello y firma del establecimiento", CIVITAS_HIJO_PERCIBE],
        aportados,
      ),
      aportados,
      focoDictamen: "Dictaminar sobre la admisión del certificado presentado fuera de término",
      cierre: cierreEscolaridad,
    }),
    plantillas: [
      {
        tipo: "resolucion",
        nombre: `Resolución de certificado de ${op.momento} de clases fuera de término`,
        cuerpo: resolucionEscolaridad(op.momento),
        instrucciones: `${INSTRUCCIONES_COMUNES} En {{hijos}} poné, para cada hijo/a, "[apellido y nombre], DNI [dni], nacido/a el [fecha], con asistencia a [grado o año] [nivel]", unidos con "y". {{nivel_escolaridad}} es "primaria" o "media" según el nivel (si hay de los dos, "primaria y media"). Si el dictamen indica desde qué mes se liquida, agregá "a partir de [mes y año]" al final del Artículo 1º; si no, marcá [REVISAR: desde qué mes se liquida].`,
      },
    ],
  }
}

// 018 y 019 — Prenatal. La pide la agente embarazada (018) o el agente cuya cónyuge o conviviente está embarazada
// (019, nuevo en el relevamiento del 16/11). Mismo circuito: Bonificaciones → Medicina Laboral (documentación y
// entrevista) → Asesoría → Bonificaciones → Dirección → Bonificaciones. Al legajo: certificado, ecografía y resolución.
// A validar con el área: semanas mínimas de gestación y período de pago; en el 019, a quién entrevista Medicina Laboral
// (el relevamiento dice "a la agente", como en el 018). El 018 "no debe aparecer a los hombres", pero el perfil no
// tiene el dato del sexo (vendría de Civitas o de CiDiTuc).
const FPP = "Certificado médico con fecha probable de parto"
const prenatal = (varon: boolean): TramiteSemilla => {
  const aportados = [FORMULARIO, FPP, "Ecografía", ...(varon ? ["Acta de matrimonio o de unión convivencial", "Negativa de ANSES de la madre"] : [])]
  const quien = varon ? "la madre, su cónyuge o conviviente {{familiar}}," : "la agente"
  return {
    codigo: varon ? "ASIG-PRENATAL-VARON" : "ASIG-PRENATAL",
    relevamiento: varon ? "019" : "018",
    nombre: varon ? "Asignación familiar prenatal (cónyuge o conviviente embarazada)" : "Asignación familiar prenatal (agente embarazada)",
    descripcion: varon
      ? "Pago de la asignación prenatal durante el embarazo de tu cónyuge o conviviente."
      : "Pago de la asignación prenatal durante el embarazo. La pide la agente embarazada.",
    categoria: "Asignaciones familiares",
    icono: "heart-pulse",
    normativa: `${NORMATIVA_ALTAS} [COMPLETAR por Capital Humano: semanas mínimas de gestación y período de pago].`,
    plazo_dias: 10,
    linea_base_dias: null,
    prioridad_base: "normal",
    reservado: true,
    pasos_actuales: 10,
    oficina: "Área Bonificaciones",
    requisitos: [
      req("certificado_medico_fpp", FPP),
      req("ecografia", "Ecografía"),
      ...(varon
        ? [
            req("acta_vinculo", "Acta de matrimonio o de unión convivencial"),
            req("negativa_anses", "Negativa de ANSES de la madre", "Certifica que la madre no percibe la asignación"),
          ]
        : []),
    ],
    formulario: [
      ...(varon
        ? [
            campo("familiar", "Apellido y nombre de tu cónyuge o conviviente", "texto"),
            campo("dni_familiar", "DNI de tu cónyuge o conviviente", "texto"),
            campo("cuil_familiar", "CUIL de tu cónyuge o conviviente", "texto", { obligatorio: false, ayuda: "El de la negativa de ANSES" }),
            campo("vinculo", "Vínculo", "seleccion", { opciones: ["Matrimonio", "Unión convivencial"] }),
          ]
        : []),
      campo("fecha_probable_parto", "Fecha probable de parto", "fecha"),
    ],
    documentacion_final: ["certificado_medico_fpp", "ecografia"],
    pasos: [
      control(
        "Control de documentación",
        [
          "Controlar la documentación adjunta",
          ...(varon ? ["Controlar el vínculo con la madre y su negativa de ANSES"] : []),
          CIVITAS_ALTA,
        ],
        aportados,
      ),
      {
        nombre: "Entrevista e informe médico",
        area: "MEDLAB",
        accion: "analisis",
        plazo_horas: 72,
        controles: [
          "Controlar la documentación médica y su veracidad",
          varon ? "Entrevistar a la persona embarazada, si corresponde" : "Entrevistar a la agente",
          "Constatar el embarazo y la fecha probable de parto",
        ],
        revisa: [FPP, "Ecografía"],
        genera: [INFORME_MEDLAB],
      },
      dictamen([...aportados, INFORME_MEDLAB], "Dictaminar sobre la procedencia de la asignación prenatal"),
      proyecto([DICTAMEN, INFORME_MEDLAB]),
      firma([RESOLUCION, DICTAMEN, INFORME_MEDLAB]),
      novedad(),
    ],
    plantillas: [
      {
        tipo: "dictamen",
        nombre: `Dictamen sobre asignación prenatal${varon ? " (cónyuge o conviviente)" : ""}`,
        cuerpo: dictamenAsignacion({
          asignacion: "prenatal",
          documentacion: [
            "certificado médico con fecha probable de parto el {{fecha_probable_parto}}",
            ...(varon
              ? [
                  "copia del acta de {{vinculo_acta}} con {{familiar}}, DNI {{dni_familiar}}",
                  "impresión de consulta de certificación negativa, correspondiente a {{familiar}}, C.U.I.L. N.º {{cuil_familiar}}",
                ]
              : []),
            "informe del Departamento de Medicina Laboral",
          ],
          analisis: varon
            ? "respecto de la asignación prenatal, el agente acredita el vínculo con {{familiar}} a través del acta (fs. {{fs}}), y el embarazo y la fecha probable de parto mediante el certificado médico (fs. {{fs}}) y el informe del Departamento de Medicina Laboral (fs. {{fs}}). De la constancia de certificación negativa correspondiente a {{familiar}} (fs. {{fs}}), surge que no registra liquidación de asignaciones familiares."
            : "respecto de la asignación prenatal, la agente acredita el embarazo y la fecha probable de parto mediante el certificado médico (fs. {{fs}}) y el informe del Departamento de Medicina Laboral (fs. {{fs}}).",
        }),
        instrucciones: `${INSTRUCCIONES_DICTAMEN} Expediente RESERVADO: no transcribas datos de salud; referí a "la documentación médica obrante". ${varon ? '{{vinculo_acta}} es "matrimonio" o "unión convivencial" según el formulario. {{en_relacion_a}}: ", respecto del embarazo de su cónyuge o conviviente [apellido y nombre], DNI [dni]".' : "{{en_relacion_a}} queda vacío."} ${ARTICULOS_A_CONFIRMAR}`,
      },
      {
        tipo: "resolucion",
        nombre: `Resolución de asignación prenatal${varon ? " (cónyuge o conviviente)" : ""}`,
        cuerpo: resolucionAlta({
          asignacion: "prenatal",
          acredita: [
            `certificado médico con fecha probable de parto el {{fecha_probable_parto}} de ${quien} e informe del Departamento de Medicina Laboral`,
            ...(varon ? ["acta de {{vinculo_acta}} con {{familiar}}, DNI {{dni_familiar}}, y su certificación negativa de ANSES"] : []),
          ],
        }),
        instrucciones: `${INSTRUCCIONES_ALTA} Expediente RESERVADO: no transcribas datos de salud; referí a "la documentación médica obrante". ${varon ? '{{vinculo_acta}} es "matrimonio" o "unión convivencial". {{en_relacion_a}}: ", en relación al embarazo de [cónyuge o conviviente], DNI [dni]".' : "{{en_relacion_a}} queda vacío."}`,
      },
    ],
  }
}

export const TRAMITES_BONIFICACIONES: TramiteSemilla[] = [
  titulo({
    codigo: "BONIF-TIT-SEC",
    relevamiento: "001",
    nivel: "Secundario",
    icono: "school",
    // El secundario se acredita con el analítico, sin diploma (relevamiento y modelo de resolución).
    conAnalitico: true,
    conDiploma: false,
    porcentaje: "17,5 %",
    normativa: "Porcentaje: 17,5 % de la categoría de revista.",
    instruccionesPorcentaje: "El porcentaje es 17,5 % de la categoría de revista.",
  }),
  titulo({
    codigo: "BONIF-TIT-TER",
    relevamiento: "002",
    nivel: "Terciario",
    icono: "book-open",
    conAnalitico: true,
    conDiploma: true,
    porcentaje: "{{porcentaje}}",
    // A validar con el área: no hay modelo del terciario.
    normativa: "[COMPLETAR por Capital Humano: porcentaje para el título terciario y si depende de la duración de la carrera].",
    instruccionesPorcentaje: "El porcentaje del título terciario no está definido: dejá [COMPLETAR: porcentaje] si no surge de la normativa cargada.",
  }),
  titulo({
    codigo: "BONIF-TIT-UNI",
    relevamiento: "003",
    nivel: "Universitario",
    icono: "graduation-cap",
    conAnalitico: false,
    conDiploma: true,
    porcentaje: "{{porcentaje}}",
    // A validar con el área: porcentaje para carreras de menos de 5 años y de pregrado; verificación de títulos anteriores
    // a 2012 (el registro SIU-CIN cubre desde 2012, los extranjeros desde 2010); si "agentes activos" incluye contratados.
    normativa:
      "Porcentaje: 50 % de la categoría de revista para títulos universitarios de grado de 5 años de duración (según el dictamen modelo del área). [COMPLETAR por Capital Humano: porcentaje para carreras de grado de menor duración y de pregrado].",
    instruccionesPorcentaje:
      "El porcentaje es 50 % de la categoría de revista para títulos de grado de 5 años de duración; para otra duración, dejá [COMPLETAR: porcentaje].",
  }),

  // Bajas por hijo/a (004, 006 y 007) — A validar con el área: si cesa también la familia numerosa.
  // 004 — A validar con el área: si el certificado de estudios es obligatorio o alcanza con la declaración jurada
  // (Formulario 9.1, solo para mayores de 15 años), qué pasa con los menores de 15, quién reemplaza la firma del
  // encargado de personal y si la baja incluye siempre la escolaridad. Al legajo va solo la resolución firmada. No admite
  // recurso de reconsideración.
  {
    codigo: "BAJA-ESTUDIOS",
    relevamiento: "004",
    nombre: "Baja de asignación por hijo/a por interrupción de estudios",
    descripcion: "Cese del pago de la asignación familiar por hijo/a cuando deja de estudiar.",
    categoria: "Bajas de asignaciones",
    icono: "user-minus",
    normativa: `${NORMATIVA_ASIGNACIONES} Declaración jurada de interrupción de estudios: art. 19 del Decreto N.º 584/SEH/75 (falsedad de lo declarado).`,
    plazo_dias: 10,
    linea_base_dias: null,
    prioridad_base: "normal",
    reservado: false,
    pasos_actuales: 8,
    oficina: "Área Bonificaciones",
    requisitos: [
      req("certificado_estudios", "Certificado de estudios con fecha hasta", "Indica hasta cuándo cursó el hijo/a"),
      req(
        "ddjj_interrupcion",
        "Declaración jurada de interrupción de estudios (Formulario 9.1)",
        "Obligatoria si tu hijo/a es mayor de 15 años. La firman vos y el encargado de personal de tu repartición",
        false,
      ),
    ],
    formulario: [...CAMPOS_HIJO, campo("fecha_interrupcion", "Fecha de interrupción de los estudios", "fecha"), OBSERVACIONES],
    documentacion_final: [],
    pasos: circuitoEstandar({
      control: control(
        "Control de documentación",
        ["Controlar la documentación adjunta", CIVITAS_HIJO_PERCIBE, CIVITAS_BAJA],
        [FORMULARIO, "Certificado de estudios con fecha hasta", "Declaración jurada de interrupción de estudios"],
      ),
      aportados: [FORMULARIO, "Certificado de estudios con fecha hasta", "Declaración jurada de interrupción de estudios"],
      focoDictamen: "Dictaminar sobre la baja, la fecha de cese y si alcanza también a la escolaridad",
    }),
    plantillas: [
      {
        tipo: "resolucion",
        nombre: "Resolución de baja de asignación por hijo/a (interrupción de estudios)",
        cuerpo: resolucionBaja(
          "hijo/a, por interrupción de estudios",
          "certificado de estudios y, en su caso, formulario N.º 9.1 de declaración jurada de interrupción de estudios, en relación a {{familiar}}, DNI {{dni_familiar}}",
          true,
        ),
        instrucciones: `${INSTRUCCIONES_COMUNES} Si el dictamen aconseja también la baja de la asignación por escolaridad, incluila en el Artículo 1º; si no lo dice, marcá [REVISAR: ¿corresponde también la baja por escolaridad?].`,
      },
    ],
  },
  // 005 — Desde el relevamiento del 16/11 pasa por la Asesoría, como las demás bajas (antes eran 3 pasos sin dictamen).
  // A validar con el área: el modelo de resolución adjunto es el de título (no hay uno propio de la baja por divorcio).
  {
    codigo: "BAJA-DIVORCIO",
    relevamiento: "005",
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
    formulario: [
      ...CAMPOS_FAMILIAR.map((c) => ({ ...c, etiqueta: c.etiqueta.replace("del familiar", "del/de la ex cónyuge") })),
      campo("fecha_divorcio", "Fecha de la sentencia de divorcio", "fecha"),
      OBSERVACIONES,
    ],
    documentacion_final: ["sentencia_divorcio"],
    pasos: circuitoEstandar({
      control: control(
        "Control de documentación",
        ["Controlar la documentación adjunta", civitasDeclarado("el/la cónyuge"), "Verificar en Civitas que no haya una solicitud duplicada", CIVITAS_BAJA],
        [FORMULARIO, "Sentencia judicial de divorcio"],
      ),
      aportados: [FORMULARIO, "Sentencia judicial de divorcio"],
      focoDictamen: "Dictaminar sobre la baja y desde cuándo cesa la asignación",
    }),
    plantillas: [
      {
        tipo: "resolucion",
        nombre: "Resolución de baja de asignación por cónyuge (divorcio)",
        cuerpo: resolucionBaja(
          "cónyuge",
          "acta de matrimonio con la anotación de la sentencia de divorcio, o la sentencia judicial de divorcio, de fecha {{fecha_divorcio}}, en relación a {{familiar}}, DNI {{dni_familiar}}",
          true,
        ),
        instrucciones: `${INSTRUCCIONES_COMUNES} El cese rige desde el mes que indique el dictamen (en general, el de la sentencia de divorcio); si es anterior al pedido, señalá con [REVISAR: períodos liquidados después del divorcio] para que el área defina el tratamiento.`,
      },
    ],
  },
  // 006 — A validar con el área: el modelo es de cónyuge (no hay de hijo/a) y no se sabe si la baja por hijo/a
  // arrastra también la escolaridad.
  {
    codigo: "BAJA-FALLECIMIENTO",
    relevamiento: "006",
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
      OBSERVACIONES,
    ],
    documentacion_final: ["acta_defuncion"],
    pasos: circuitoEstandar({
      control: control("Control de documentación", ["Controlar la documentación adjunta", civitasDeclarado("el familiar"), CIVITAS_BAJA], [FORMULARIO, "Acta de defunción"]),
      aportados: [FORMULARIO, "Acta de defunción"],
      focoDictamen: "Dictaminar sobre la baja y la fecha de cese",
    }),
    plantillas: [
      {
        tipo: "resolucion",
        nombre: "Resolución de baja de asignación por fallecimiento",
        cuerpo: resolucionBaja("{{vinculo}}", "acta de defunción en relación a {{familiar}}, DNI {{dni_familiar}}, fallecido/a el {{fecha_fallecimiento}}", true),
        instrucciones: `${INSTRUCCIONES_COMUNES} El vínculo (cónyuge o hijo/a) sale del formulario. El cese rige desde el mes del fallecimiento: indicá la fecha de fallecimiento en el Artículo 1º. No transcribas la causa de muerte aunque figure en el acta.`,
      },
    ],
  },
  // 007 — La "nota solicitando la baja" ya no se adjunta (lo confirma el área): pasa a ser el campo Motivo. Se pide por
  // cada hijo/a. A validar con el área: la observación dice que sirve para la baja de cualquier asignación (cónyuge,
  // hijo/a, etc.) pero el trámite y la condición de Civitas son por hijo/a; si hay modelo de resolución propio.
  {
    codigo: "BAJA-PARTICULAR",
    relevamiento: "007",
    nombre: "Baja de asignación por hijo/a por motivos particulares",
    descripcion: "Pedido del/de la agente para dejar de percibir la asignación familiar por un hijo/a.",
    categoria: "Bajas de asignaciones",
    icono: "user-minus",
    normativa: NORMATIVA_ASIGNACIONES,
    plazo_dias: 10,
    linea_base_dias: null,
    prioridad_base: "normal",
    reservado: false,
    pasos_actuales: 5,
    oficina: "Área Bonificaciones",
    requisitos: [],
    formulario: [...CAMPOS_HIJO, campo("desde", "A partir de", "fecha"), campo("motivo", "Motivo", "texto_largo"), OBSERVACIONES],
    documentacion_final: [],
    pasos: circuitoEstandar({
      control: control("Control de la solicitud", ["Controlar la solicitud y el motivo", CIVITAS_HIJO_PERCIBE, CIVITAS_BAJA], [FORMULARIO]),
      aportados: [FORMULARIO],
      focoDictamen: "Dictaminar sobre la baja solicitada",
    }),
    plantillas: [
      {
        tipo: "resolucion",
        nombre: "Resolución de baja de asignación por hijo/a por motivos particulares",
        cuerpo: resolucionBaja("hijo/a", "la manifestación del/de la agente sobre los motivos particulares de la baja, en relación a {{familiar}}, DNI {{dni_familiar}}", true),
        instrucciones: `${INSTRUCCIONES_COMUNES} El motivo sale del formulario. Sin modelo del área: validar.`,
      },
    ],
  },

  // 009 y 011 — Cierran con la carga en el sistema de escolaridad y en la foja de servicios (ya no es novedad a
  // Liquidación). A validar con el área: plazo del certificado de fin, desde qué mes se liquida lo admitido, qué
  // niveles y edades cubre y qué va al legajo.
  certificadoEnTermino({ codigo: "ESC-FIN", relevamiento: "008", momento: "fin" }),
  certificadoFueraDeTermino({ codigo: "ESC-FIN-EXT", relevamiento: "009", momento: "fin" }),
  certificadoEnTermino({ codigo: "ESC-INICIO", relevamiento: "010", momento: "inicio" }),
  certificadoFueraDeTermino({ codigo: "ESC-INICIO-EXT", relevamiento: "011", momento: "inicio" }),

  // 012 — El área quiere que la familia numerosa se ofrezca dentro de la asignación por hijo/a (013) al declarar el
  // tercer hijo/a, y eliminó "Hijo/a y familia numerosa" (015) por eso. Mientras la novedad de haberes admita un alta
  // por expediente, sigue como trámite aparte. A validar con el área: el informe repite los requisitos del de hijo/a,
  // y falta el monto. El modelo real de resolución acredita con la consulta del grupo familiar en Civitas.
  {
    codigo: "ASIG-FAM-NUM",
    relevamiento: "012",
    nombre: "Asignación familiar por familia numerosa",
    descripcion: "Pago de la asignación por familia numerosa, desde el tercer hijo/a, en relación a un hijo/a.",
    categoria: "Asignaciones familiares",
    icono: "users-round",
    normativa: `${NORMATIVA_ALTAS} Familia numerosa (según el área): corresponde al declarar el tercer hijo/a, siempre que ninguno de los tres sea mayor de 21 años y que los mayores de 15 perciban la asignación por escolaridad. Se pide por cada hijo/a.`,
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
    formulario: [...CAMPOS_HIJO, campo("cantidad_hijos", "Cantidad de hijos/as a tu cargo", "numero"), ...CAMPOS_PROGENITOR, OBSERVACIONES],
    documentacion_final: ["acta_nacimiento", "certificado_escolaridad"],
    pasos: circuitoEstandar({
      control: control(
        "Control de documentación y grupo familiar",
        [
          "Controlar la documentación adjunta",
          "Consultar en Civitas el grupo familiar: que sea el tercer hijo/a o más, que ninguno de los tres pase los 21 años y que los mayores de 15 perciban escolaridad",
          CIVITAS_ALTA,
          "Actualizar el grupo familiar en Civitas",
        ],
        [FORMULARIO, "Acta de nacimiento del hijo/a", "Negativa de ANSES de la madre o del padre"],
      ),
      aportados: [FORMULARIO, "Acta de nacimiento del hijo/a", "Negativa de ANSES de la madre o del padre"],
      focoDictamen: "Dictaminar sobre la procedencia de la asignación por familia numerosa",
    }),
    plantillas: [
      {
        tipo: "dictamen",
        nombre: "Dictamen sobre asignación por familia numerosa",
        cuerpo: dictamenAsignacion({
          asignacion: "por familia numerosa",
          documentacion: [
            "consulta del grupo familiar en el sistema Civitas respecto de los hijos/as del/de la agente",
            "copia del acta de nacimiento expedida y certificada por el Registro de Estado Civil y Capacidad de las Personas, correspondiente a {{familiar}}, DNI {{dni_familiar}}, nacido/a el {{fecha_nacimiento}}",
          ],
          analisis:
            "respecto de la asignación por familia numerosa, de la consulta del grupo familiar en Civitas (fs. {{fs}}) surge que el/la agente tiene a su cargo {{cantidad_hijos}} hijos/as, entre ellos/as {{familiar}}, cuyo vínculo acredita con el acta de nacimiento (fs. {{fs}}). La asignación por familia numerosa corresponde desde el tercer hijo/a, siempre que ninguno de los tres sea mayor de 21 años y que los mayores de 15 perciban la asignación por escolaridad.",
        }),
        instrucciones: `${INSTRUCCIONES_DICTAMEN} {{en_relacion_a}}: ", respecto de su hijo/a [apellido y nombre], DNI [dni], nacido/a el [fecha]". ${ARTICULOS_A_CONFIRMAR} Sin modelo propio de dictamen.`,
      },
      {
        tipo: "resolucion",
        nombre: "Resolución de asignación por familia numerosa",
        cuerpo: resolucionAlta({
          asignacion: "por familia numerosa",
          acredita: ["la consulta del grupo familiar en el sistema Civitas respecto de los hijos/as del/de la agente"],
        }),
        instrucciones: `${INSTRUCCIONES_ALTA} {{en_relacion_a}}: ", en relación a [hijo/a], DNI [dni], nacido/a el [fecha]". Modelo real del área.`,
      },
    ],
  },
  // 013 — Según el área: hasta los 15 años no hace falta certificado de escolaridad; desde los 15, para seguir
  // cobrando hay que presentar los certificados de inicio y fin de clases. Si se pide por más de un hijo/a, va todo en
  // la misma resolución y el mismo expediente: acá, uno por hijo/a hasta que la novedad de haberes admita varias altas
  // por expediente (lo mismo con nacimiento y por hijo/a juntos, y con la familia numerosa al declarar el tercero).
  {
    codigo: "ASIG-HIJO",
    relevamiento: "013",
    nombre: "Asignación familiar por hijo/a",
    descripcion: "Pago de la asignación familiar por hijo/a. Se pide por cada hijo/a.",
    categoria: "Asignaciones familiares",
    icono: "users",
    normativa: `${NORMATIVA_ALTAS} Según el área: hasta los 15 años se paga sin certificado de escolaridad; cumplidos los 15, para seguir percibiéndola hay que presentar los certificados de inicio y fin de clases.`,
    plazo_dias: 10,
    linea_base_dias: null,
    prioridad_base: "normal",
    reservado: false,
    pasos_actuales: 8,
    oficina: "Área Bonificaciones",
    requisitos: [
      req("acta_nacimiento", "Acta de nacimiento del hijo/a"),
      req("negativa_anses", "Negativa de ANSES de la madre o del padre", "Certifica que el otro progenitor no percibe la asignación"),
      req("certificado_escolaridad", "Certificado de escolaridad", "Solo si tu hijo/a tiene 15 años o más", false),
    ],
    formulario: [...CAMPOS_HIJO, ...CAMPOS_PROGENITOR, OBSERVACIONES],
    documentacion_final: ["acta_nacimiento", "certificado_escolaridad"],
    pasos: circuitoEstandar({
      control: control(
        "Control de documentación y grupo familiar",
        [
          "Controlar la documentación adjunta",
          "Controlar la negativa de ANSES del otro progenitor",
          "Si el hijo/a tiene 15 años o más, controlar el certificado de escolaridad",
          civitasNoPercibe("el hijo/a"),
          "Actualizar el grupo familiar en Civitas",
          "Si con este hijo/a el/la agente llega a tres, indicarle que puede pedir la asignación por familia numerosa",
        ],
        [FORMULARIO, "Acta de nacimiento del hijo/a", "Negativa de ANSES de la madre o del padre", "Certificado de escolaridad"],
      ),
      aportados: [FORMULARIO, "Acta de nacimiento del hijo/a", "Negativa de ANSES de la madre o del padre", "Certificado de escolaridad"],
      focoDictamen: "Dictaminar sobre la procedencia de la asignación",
    }),
    plantillas: [
      {
        tipo: "dictamen",
        nombre: "Dictamen sobre asignación por hijo/a",
        cuerpo: dictamenAsignacion({
          asignacion: "por hijo/a",
          documentacion: [
            "copia del acta de nacimiento expedida y certificada por el Registro de Estado Civil y Capacidad de las Personas, correspondiente a {{familiar}}, DNI {{dni_familiar}}, nacido/a el {{fecha_nacimiento}}",
            "impresión de consulta de certificación negativa, correspondiente a {{progenitor}}, C.U.I.L. N.º {{cuil_progenitor}}",
          ],
          analisis: `respecto de la asignación por hijo/a, el/la agente acredita el hecho y el vínculo familiar con {{familiar}} a través del acta de nacimiento (fs. {{fs}}). ${ANALISIS_NEGATIVA}`,
        }),
        instrucciones: `${INSTRUCCIONES_DICTAMEN} {{en_relacion_a}}: ", respecto de su hijo/a [apellido y nombre], DNI [dni], nacido/a el [fecha]". El pago rige desde el mes de la solicitud (fecha del expediente).`,
      },
      {
        tipo: "resolucion",
        nombre: "Resolución de asignación por hijo/a",
        cuerpo: resolucionAlta({
          asignacion: "por hijo/a",
          acredita: [
            "acta de nacimiento expedida por el Registro de Estado Civil y Capacidad de las Personas, correspondiente a {{familiar}}, DNI {{dni_familiar}}, nacido/a el {{fecha_nacimiento}}",
            NEGATIVA_ANSES,
          ],
        }),
        instrucciones: `${INSTRUCCIONES_ALTA} {{en_relacion_a}}: ", en relación a [hijo/a], DNI [dni], nacido/a el [fecha]".`,
      },
    ],
  },
  // 014 — Reservado (datos de salud) y con prioridad alta. Medicina Laboral controla la documentación en el alta; en la
  // renovación del CUD no interviene (bifurcación pendiente de modelar: ver instrucciones del paso). El acta de
  // nacimiento se adjunta solo la primera vez. Se paga sin límite de edad mientras el CUD esté vigente; si vence, se
  // corta. Al legajo va solo la resolución firmada. A validar con el área: no hay modelo propio de dictamen ni de
  // resolución; la condición de Civitas del alta bloquearía la renovación.
  {
    codigo: "ASIG-HIJO-DISC",
    relevamiento: "014",
    nombre: "Asignación familiar por hijo/a con discapacidad",
    descripcion: "Alta o renovación de la asignación familiar por hijo/a con discapacidad.",
    categoria: "Asignaciones familiares",
    icono: "heart-handshake",
    normativa: `${NORMATIVA_ALTAS} Según el área: se paga sin límite de edad, aun después de los 21 años, mientras el Certificado Único de Discapacidad esté vigente; si vence, se corta la asignación. Se pide por cada hijo/a. Ley 26.378 (Convención sobre los Derechos de las Personas con Discapacidad).`,
    plazo_dias: 5,
    linea_base_dias: null,
    prioridad_base: "alta",
    reservado: true,
    pasos_actuales: 9,
    oficina: "Área Bonificaciones",
    requisitos: [
      req("cud", "Certificado Único de Discapacidad (CUD)", "Vigente"),
      req("acta_nacimiento", "Acta de nacimiento del hijo/a", "Solo la primera vez (en el alta)", false),
      req("negativa_anses", "Negativa de ANSES de la madre o del padre"),
    ],
    formulario: [
      campo("tipo_solicitud", "Tipo de solicitud", "seleccion", { opciones: ["Alta", "Renovación del CUD"] }),
      ...CAMPOS_HIJO,
      campo("vencimiento_cud", "Vencimiento del CUD", "fecha", { ayuda: "Sirve para avisarte antes de que venza" }),
      ...CAMPOS_PROGENITOR,
      campo("observaciones", "Observaciones", "texto_largo", { obligatorio: false, ayuda: "No incluyas diagnósticos: el CUD ya los contiene" }),
    ],
    documentacion_final: [],
    pasos: [
      {
        nombre: "Control del CUD y de la documentación",
        area: "MEDLAB",
        accion: "analisis",
        plazo_horas: 48,
        controles: ["Controlar el Certificado Único de Discapacidad y su vigencia", "Controlar la veracidad de la documentación adjunta"],
        revisa: [FORMULARIO, "Certificado Único de Discapacidad (CUD)"],
        genera: [],
        instrucciones: "En la renovación del CUD Medicina Laboral no interviene: pasar directo al Área Bonificaciones.",
      },
      control(
        "Control de documentación y grupo familiar",
        [
          "Controlar la documentación adjunta (el acta de nacimiento, solo en el alta)",
          "Verificar en Civitas la fecha de vencimiento del CUD, en caso de corresponder",
          "Solo en el alta: verificar en Civitas que el hijo/a no genere ya asignación (código A o N en el ítem Asignación) y que no se haya hecho lugar antes a la misma solicitud",
          "Actualizar el grupo familiar en Civitas",
        ],
        [FORMULARIO, "Acta de nacimiento del hijo/a", "Certificado Único de Discapacidad (CUD)", "Negativa de ANSES de la madre o del padre"],
      ),
      dictamen([FORMULARIO, "Acta de nacimiento del hijo/a", "Certificado Único de Discapacidad (CUD)"], "Dictaminar sobre la procedencia de la asignación"),
      proyecto([DICTAMEN, "Certificado Único de Discapacidad (CUD)"]),
      firma([RESOLUCION, DICTAMEN, "Certificado Único de Discapacidad (CUD)"]),
      novedad(["Registrar el vencimiento del CUD para el aviso de renovación"]),
    ],
    plantillas: [
      {
        tipo: "dictamen",
        nombre: "Dictamen sobre asignación por hijo/a con discapacidad",
        cuerpo: dictamenAsignacion({
          asignacion: "por hijo/a con discapacidad",
          documentacion: [
            "copia del acta de nacimiento expedida y certificada por el Registro de Estado Civil y Capacidad de las Personas, correspondiente a {{familiar}}, DNI {{dni_familiar}}",
            "Certificado Único de Discapacidad correspondiente a {{familiar}}, con vencimiento el {{vencimiento_cud}}, controlado por el Departamento de Medicina Laboral",
            "impresión de consulta de certificación negativa, correspondiente a {{progenitor}}, C.U.I.L. N.º {{cuil_progenitor}}",
          ],
          analisis: `respecto de la asignación por hijo/a con discapacidad, el/la agente acredita el vínculo familiar con {{familiar}} a través del acta de nacimiento (fs. {{fs}}) y la discapacidad mediante el Certificado Único de Discapacidad vigente (fs. {{fs}}), controlado por el Departamento de Medicina Laboral. La asignación se paga sin límite de edad mientras el certificado esté vigente. ${ANALISIS_NEGATIVA}`,
        }),
        instrucciones: `${INSTRUCCIONES_DICTAMEN} Expediente RESERVADO: no transcribas diagnósticos; referí a "la documentación médica obrante". Usá "hijo/a con discapacidad", nunca "discapacitado". Si es renovación del CUD, decilo en la apertura: el acta de nacimiento ya obra en el alta y Medicina Laboral no interviene. ${ARTICULOS_A_CONFIRMAR} Sin modelo propio: sigue el de nacimiento y por hijo/a.`,
      },
      {
        tipo: "resolucion",
        nombre: "Resolución de asignación por hijo/a con discapacidad",
        cuerpo: resolucionAlta({
          asignacion: "por hijo/a con discapacidad",
          acredita: [
            "acta de nacimiento expedida por el Registro de Estado Civil y Capacidad de las Personas, correspondiente a {{familiar}}, DNI {{dni_familiar}}",
            "Certificado Único de Discapacidad de {{familiar}}, con vencimiento el {{vencimiento_cud}}, controlado por el Departamento de Medicina Laboral",
            NEGATIVA_ANSES,
          ],
        }),
        instrucciones: `${INSTRUCCIONES_ALTA} Expediente RESERVADO: no transcribas diagnósticos; referí a "la documentación médica obrante". Usá "hijo/a con discapacidad", nunca "discapacitado". {{en_relacion_a}}: ", en relación a [hijo/a], DNI [dni]". Si es renovación, decilo en el VISTO. Sin modelo propio: sigue el de nacimiento y por hijo/a; validar con el área.`,
      },
    ],
  },
  // 016 — Pago único, dentro del año de la celebración. Al legajo: acta de matrimonio y resolución firmada.
  {
    codigo: "ASIG-MATRIMONIO",
    relevamiento: "016",
    nombre: "Asignación familiar por matrimonio (pago único)",
    descripcion: "Pago único de la asignación familiar por matrimonio del/de la agente. Se pide dentro del año de la celebración.",
    categoria: "Asignaciones familiares",
    icono: "heart",
    normativa: `${NORMATIVA_ALTAS} Según el área: se dispone de un (1) año desde la fecha de celebración del matrimonio para solicitarla.`,
    plazo_dias: 10,
    linea_base_dias: null,
    prioridad_base: "normal",
    reservado: false,
    pasos_actuales: 8,
    oficina: "Área Bonificaciones",
    requisitos: [req("acta_matrimonio", "Acta de matrimonio")],
    formulario: [...CAMPOS_CONYUGE, campo("fecha_matrimonio", "Fecha de matrimonio", "fecha", { ayuda: "Tenés un año desde la celebración para pedirla" }), OBSERVACIONES],
    documentacion_final: ["acta_matrimonio"],
    pasos: circuitoEstandar({
      control: control(
        "Control de documentación",
        ["Controlar la documentación adjunta", "Controlar que se pida dentro del año de la celebración del matrimonio", civitasNoPercibe("el/la cónyuge"), CIVITAS_ALTA],
        [FORMULARIO, "Acta de matrimonio"],
      ),
      aportados: [FORMULARIO, "Acta de matrimonio"],
      focoDictamen: "Dictaminar sobre la procedencia de la asignación",
      extraNovedad: [PAGO_UNICO],
    }),
    plantillas: [
      {
        tipo: "dictamen",
        nombre: "Dictamen sobre asignación por matrimonio",
        cuerpo: dictamenAsignacion({
          asignacion: "por matrimonio",
          documentacion: ["copia del acta de matrimonio expedida y certificada por el Registro de Estado Civil y Capacidad de las Personas, de fecha {{fecha_matrimonio}}, con {{familiar}}, DNI {{dni_familiar}}"],
          analisis:
            "respecto de la asignación por matrimonio, el/la agente acredita el hecho y el vínculo con {{familiar}} a través del acta de matrimonio (fs. {{fs}}), y la solicita dentro del año de la celebración.",
          pagoUnico: true,
        }),
        instrucciones: `${INSTRUCCIONES_DICTAMEN} {{en_relacion_a}}: ", respecto de su matrimonio con [cónyuge], DNI [dni]". Si entre la fecha del matrimonio y la del expediente pasó más de un año, no lo aconsejes: señalá [REVISAR: pedido fuera del plazo de un año]. ${ARTICULOS_A_CONFIRMAR}`,
      },
      {
        tipo: "resolucion",
        nombre: "Resolución de asignación por matrimonio",
        cuerpo: resolucionAlta({
          asignacion: "por matrimonio",
          acredita: ["acta de matrimonio expedida por el Registro de Estado Civil y Capacidad de las Personas, de fecha {{fecha_matrimonio}}, con {{familiar}}, DNI {{dni_familiar}}"],
          pagoUnico: true,
        }),
        instrucciones: `${INSTRUCCIONES_ALTA} Es pago único. {{en_relacion_a}}: ", en relación a [cónyuge], DNI [dni]".`,
      },
    ],
  },
  // 017 — Pago único. Si se presenta CUD, el área lo junta con la asignación por hijo/a con discapacidad (014): acá se le
  // indica al/a la agente que la inicie. A validar con el área: la condición de Civitas es contradictoria entre el
  // circuito actual ("el hijo/a debe estar declarado") y el final ("el/la cónyuge debe estar registrado/a").
  {
    codigo: "ASIG-NACIMIENTO",
    relevamiento: "017",
    nombre: "Asignación familiar por nacimiento (pago único)",
    descripcion: "Pago único de la asignación familiar por nacimiento de hijo/a.",
    categoria: "Asignaciones familiares",
    icono: "baby",
    normativa: NORMATIVA_ALTAS,
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
      req(
        "certificado_discapacidad",
        "Certificado Único de Discapacidad (CUD)",
        "Solo si el hijo/a tiene discapacidad: se tramita junto con la asignación por hijo/a con discapacidad",
        false,
      ),
    ],
    formulario: [...CAMPOS_HIJO, ...CAMPOS_PROGENITOR, OBSERVACIONES],
    documentacion_final: ["acta_nacimiento", "certificado_discapacidad"],
    pasos: circuitoEstandar({
      control: control(
        "Control de documentación y grupo familiar",
        [
          "Controlar la documentación adjunta",
          "Controlar la negativa de ANSES del otro progenitor",
          CIVITAS_ALTA,
          "Actualizar el grupo familiar en Civitas",
          "Si se acompaña CUD, indicar al/a la agente que inicie también la asignación por hijo/a con discapacidad",
        ],
        [FORMULARIO, "Acta de nacimiento del hijo/a", "Negativa de ANSES de la madre o del padre"],
      ),
      aportados: [FORMULARIO, "Acta de nacimiento del hijo/a", "Negativa de ANSES de la madre o del padre"],
      focoDictamen: "Dictaminar sobre la procedencia de la asignación",
      extraNovedad: [PAGO_UNICO],
    }),
    plantillas: [
      {
        tipo: "dictamen",
        nombre: "Dictamen sobre asignación por nacimiento",
        cuerpo: dictamenAsignacion({
          asignacion: "por nacimiento",
          documentacion: [
            "copia del acta de nacimiento expedida y certificada por el Registro de Estado Civil y Capacidad de las Personas, correspondiente a {{familiar}}, DNI {{dni_familiar}}, nacido/a el {{fecha_nacimiento}}",
            "impresión de consulta de certificación negativa, correspondiente a {{progenitor}}, C.U.I.L. N.º {{cuil_progenitor}}",
          ],
          analisis: `respecto de la asignación por nacimiento, el/la agente acredita el hecho y el vínculo familiar con {{familiar}} a través del acta de nacimiento (fs. {{fs}}). Además, cumple con la antigüedad requerida para el pago de la asignación por nacimiento y se encuentra dentro del plazo legal para solicitarla (art. 6º Ord. N.º 546/75). ${ANALISIS_NEGATIVA}`,
          pagoUnico: true,
        }),
        instrucciones: `${INSTRUCCIONES_DICTAMEN} {{en_relacion_a}}: ", respecto de su hijo/a [apellido y nombre], DNI [dni], nacido/a el [fecha]". Si la antigüedad o el plazo no surgen del expediente, no los afirmes: marcá [REVISAR: antigüedad y plazo del art. 6º Ord. N.º 546/75]. Si se acompaña CUD, mencionalo sin transcribir diagnóstico.`,
      },
      {
        tipo: "resolucion",
        nombre: "Resolución de asignación por nacimiento",
        cuerpo: resolucionAlta({
          asignacion: "por nacimiento",
          acredita: [
            "acta de nacimiento expedida por el Registro de Estado Civil y Capacidad de las Personas, correspondiente a {{familiar}}, DNI {{dni_familiar}}, nacido/a el {{fecha_nacimiento}}",
            NEGATIVA_ANSES,
          ],
          pagoUnico: true,
        }),
        instrucciones: `${INSTRUCCIONES_ALTA} Es pago único. {{en_relacion_a}}: ", en relación a [hijo/a], DNI [dni], nacido/a el [fecha]". Si se acompaña CUD, mencionalo sin transcribir diagnóstico.`,
      },
    ],
  },
  prenatal(false),
  prenatal(true),
  // 020 — Al legajo: acta de matrimonio y resolución firmada. A validar con el área: si se pide negativa de ANSES o
  // constancia laboral del/de la cónyuge. El Formulario 14 pide indicar si el/la cónyuge tiene discapacidad.
  {
    codigo: "ASIG-CONYUGE",
    relevamiento: "020",
    nombre: "Asignación familiar por cónyuge",
    descripcion: "Pago de la asignación familiar por cónyuge.",
    categoria: "Asignaciones familiares",
    icono: "heart",
    normativa: NORMATIVA_ALTAS,
    plazo_dias: 10,
    linea_base_dias: null,
    prioridad_base: "normal",
    reservado: false,
    pasos_actuales: 8,
    oficina: "Área Bonificaciones",
    requisitos: [
      req("acta_matrimonio", "Acta de matrimonio"),
      req("certificado_discapacidad", "Certificado Único de Discapacidad (CUD) del/de la cónyuge", "Solo si tu cónyuge tiene discapacidad", false),
    ],
    formulario: [
      ...CAMPOS_CONYUGE,
      campo("fecha_matrimonio", "Fecha de matrimonio", "fecha"),
      campo("conyuge_discapacidad", "¿Tu cónyuge tiene discapacidad?", "seleccion", { opciones: ["No", "Sí"] }),
      OBSERVACIONES,
    ],
    documentacion_final: ["acta_matrimonio"],
    pasos: circuitoEstandar({
      control: control("Control de documentación", ["Controlar la documentación adjunta", civitasNoPercibe("el/la cónyuge")], [FORMULARIO, "Acta de matrimonio"]),
      aportados: [FORMULARIO, "Acta de matrimonio"],
      focoDictamen: "Dictaminar sobre la procedencia de la asignación",
    }),
    plantillas: [
      {
        tipo: "dictamen",
        nombre: "Dictamen sobre asignación por cónyuge",
        cuerpo: dictamenAsignacion({
          asignacion: "por cónyuge",
          documentacion: ["copia del acta de matrimonio expedida y certificada por el Registro de Estado Civil y Capacidad de las Personas, con {{familiar}}, DNI {{dni_familiar}}"],
          analisis: "respecto de la asignación por cónyuge, el/la agente acredita el vínculo con {{familiar}} a través del acta de matrimonio (fs. {{fs}}).",
        }),
        instrucciones: `${INSTRUCCIONES_DICTAMEN} {{en_relacion_a}}: ", respecto de su cónyuge [apellido y nombre], DNI [dni]". Si el/la cónyuge tiene discapacidad, mencioná el CUD sin transcribir diagnóstico. ${ARTICULOS_A_CONFIRMAR}`,
      },
      {
        tipo: "resolucion",
        nombre: "Resolución de asignación por cónyuge",
        cuerpo: resolucionAlta({
          asignacion: "por cónyuge",
          acredita: ["acta de matrimonio expedida por el Registro de Estado Civil y Capacidad de las Personas, con {{familiar}}, DNI {{dni_familiar}}"],
        }),
        instrucciones: `${INSTRUCCIONES_ALTA} {{en_relacion_a}}: ", en relación a [cónyuge], DNI [dni]". Si el/la cónyuge tiene discapacidad, mencioná el CUD sin transcribir diagnóstico.`,
      },
    ],
  },
]

// ---------------------------------------------------------------------
// Licencias (relevamiento 16/11/2026: notas médicas y maternidad).
// Las lleva el Departamento de Medicina Laboral: entrevista o constatación,
// Formulario 16 (licencia médica, se emite en el sistema de licencias médicas)
// y proyecto de resolución; firma la Dirección; Medicina carga en Civitas.
// Familiar enfermo y familiar con discapacidad pasan además por la Asesoría.
// La situación de revista ya no se agrega: se consulta en Civitas.
// A validar con el área en todas: quién firma (los modelos los sella la
// Coordinación de Salud Ocupacional, y en maternidad también la Directora),
// qué va al legajo y qué a la ficha médica, las prórrogas (cada una sería un
// expediente nuevo) y los descuentos (50 % o sin goce: la novedad de haberes
// hoy exige una resolución que haga lugar). El pedido por teléfono o por
// persona autorizada (Formulario 15) no está soportado.
// La licencia por examen sigue provisoria: no vino en el relevamiento.
// ---------------------------------------------------------------------
const pasoSimple = (nombre: string, area: string, accion: Enum<"accion_paso">, plazo_horas: number): PasoSemilla => ({ nombre, area, accion, plazo_horas })

const FORM16 = "Licencia médica (Formulario 16)"
const CERTIFICADO = "Certificado médico"
const PREOCUPACIONAL = "Verificar en Civitas que el/la agente tenga realizado el examen preocupacional"

const ENCABEZADO_MEDLAB = encabezadoResolucion("Departamento de Medicina Laboral")
const COMPETENCIA_LICENCIAS = "Por lo expuesto y en ejercicio de la competencia que le acuerda el Decreto N.º 337/77, art. 64;"
const RECAUDO_AGENTE = "a. Condición de agente municipal (según la situación de revista consultada en el sistema Civitas)."
const RECAUDO_TERMINO =
  "Solicitud temporánea por parte del/de la agente (véase la fecha y hora de inicio del expediente electrónico)."
const AGENTE_RESUELVE =
  "{{agente}}, afiliado/a N.º {{legajo}}, categoría {{categoria}}, agrupamiento {{agrupamiento}}, dependiente de {{dependencia}}, con prestación de servicios en {{reparticion}}"
const INSTRUCCIONES_LICENCIA = [
  INSTRUCCIONES_COMUNES,
  'Expediente RESERVADO: no transcribas diagnósticos ni datos de salud; referí a "la documentación médica obrante".',
  "Las fechas desde y hasta y la cantidad de días salen de la licencia médica (Formulario 16) que emitió el médico auditor; si no están, [COMPLETAR].",
  "La categoría y el agrupamiento salen de la situación de revista de Civitas; si no están en el expediente, [COMPLETAR].",
].join(" ")

const NORMATIVA_LICENCIAS =
  "Decreto N.º 337/EH/77 (régimen de licencias), Ordenanza N.º 936/87 y su Decreto Reglamentario N.º 10/G/88, y Ordenanza N.º 223/84 (según el Formulario 15). Competencia: Decreto N.º 337/77, art. 64."

/** Paso de Medicina Laboral. */
const pasoMedicina = (nombre: string, accion: Enum<"accion_paso">, controles: string[], revisa: string[], genera: string[], plazo_horas = 24): PasoSemilla => ({
  nombre,
  area: "MEDLAB",
  accion,
  plazo_horas,
  controles,
  revisa,
  genera,
})

/** Cierre de Medicina Laboral: carga en Civitas y en la foja de servicios. No es novedad de haberes. */
const cierreMedicina = (extra: string[] = []): PasoSemilla => ({
  nombre: "Carga en Civitas y cierre",
  area: "MEDLAB",
  accion: "notificacion",
  plazo_horas: 24,
  controles: ["Cargar la licencia en Civitas y en la foja de servicios", ...extra],
  revisa: [FIRMADA],
  genera: [],
  permite_subsanacion: false,
  destino_final: CIERRE,
})

/** Circuito digital de las notas médicas: Medicina Laboral → Dirección → Medicina Laboral. */
function circuitoMedico(op: { controles: string[]; aportados: string[]; genera?: string[]; extraCierre?: string[] }): PasoSemilla[] {
  const genera = op.genera ?? [FORM16, RESOLUCION]
  return [
    pasoMedicina("Control médico, licencia y proyecto de resolución", "resolucion", [...op.controles, CIVITAS_ACTIVO, "Preparar el proyecto de resolución"], op.aportados, genera),
    firma([RESOLUCION, ...genera.filter((g) => g !== RESOLUCION), ...op.aportados.filter((a) => a !== FORMULARIO)]),
    cierreMedicina(op.extraCierre),
  ]
}

/** Resolución de nota médica, sobre el modelo real de familiar enfermo. */
function resolucionNotaMedica(op: { licencia: string; norma: string; recaudos: string[]; otorga: string }) {
  return `${ENCABEZADO_MEDLAB}

**VISTO:**
El Expediente N.º {{numero_expediente}}, por el cual el/la agente {{agente}}, afiliado/a N.º {{legajo}}, solicita ${op.licencia} respecto de los días {{fecha_desde}} al {{fecha_hasta}}; y

**CONSIDERANDO:**
Que la petición del/de la agente está reglada por ${op.norma};
Que de las constancias de las presentes actuaciones surge que se han cumplido todos los recaudos legales exigidos para la procedencia de la licencia solicitada. A saber:
${[RECAUDO_AGENTE, ...op.recaudos.map((r, i) => `${String.fromCharCode(98 + i)}. ${r}`)].join("\n")}

${COMPETENCIA_LICENCIAS}

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** Hacer lugar a ${op.otorga} respecto de los días {{fecha_desde}} al {{fecha_hasta}} a ${AGENTE_RESUELVE}, conforme a los considerandos.

**Artículo 2º:** ${ART_REGISTRO}

**Artículo 3º:** ${ART_NOTIFICACION}`
}

const CAMPOS_NOTA_MEDICA = [
  campo("fecha_desde", "Desde qué día", "fecha"),
  campo("domicilio_reposo", "Domicilio donde hacés reposo", "texto", { ayuda: "Para la visita domiciliaria de Medicina Laboral" }),
  campo("turno", "Tu turno de trabajo", "seleccion", { opciones: ["Mañana", "Tarde", "Noche", "Rotativo"] }),
  campo("dias_certificado", "Días que indica el certificado", "numero", { obligatorio: false }),
]
const OBSERVACIONES_SALUD = campo("observaciones", "Observaciones", "texto_largo", { obligatorio: false, ayuda: "No incluyas diagnósticos: el certificado ya los contiene" })

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

  // 027 — El circuito digital empieza en el encargado de personal de la repartición (recibe el aviso, controla que sea
  // en término y deriva a Medicina Laboral): ese actor no existe todavía en el sistema, así que queda como control de
  // Medicina Laboral. A validar con el área: no hay modelo de resolución propio (el que adjunta el área, "Resolución
  // nota médica", es el de familiar enfermo, y acá se usa esa estructura) y si el preocupacional puede bloquear una
  // licencia médica.
  {
    codigo: "LIC-ENFERMEDAD",
    relevamiento: "027",
    nombre: "Licencia por enfermedad",
    descripcion: "Justificación de inasistencias por enfermedad, con entrevista en Medicina Laboral.",
    categoria: "Licencias médicas",
    icono: "stethoscope",
    normativa: `${NORMATIVA_LICENCIAS} Enfermedad: arts. 18 a 31 del Decreto N.º 337/EH/77 (art. 18: 30 días por año; art. 19: afecciones de largo tratamiento, 6 meses con goce íntegro y 6 meses al 50 %; art. 30: cada certificación por hasta 30 días, con nueva revisación). El aviso se da hasta 2 horas después del horario de ingreso y la entrevista con el certificado original es hasta las 11 h del día hábil siguiente. [COMPLETAR por Capital Humano: confirmar plazos y encuadre].`,
    plazo_dias: 2,
    linea_base_dias: null,
    prioridad_base: "normal",
    reservado: true,
    pasos_actuales: 6,
    oficina: "Departamento de Medicina Laboral",
    requisitos: [req("certificado_medico", CERTIFICADO, "Llevá el original a la entrevista en Medicina Laboral, hasta las 11 h del día hábil siguiente")],
    formulario: [...CAMPOS_NOTA_MEDICA, OBSERVACIONES_SALUD],
    // A validar con el área: qué va al legajo y qué queda en la ficha médica.
    documentacion_final: [],
    pasos: circuitoMedico({
      controles: [
        "Controlar que el aviso haya sido en término (hasta 2 horas después del horario de ingreso; hoy lo controla el encargado de personal de la repartición)",
        "Entrevistar al/a la agente con el certificado original",
        PREOCUPACIONAL,
        "Encuadrar la licencia (arts. 18, 19 o 23) y controlar los días usados en el año",
        "Emitir la licencia médica (Formulario 16) en el sistema de licencias médicas",
      ],
      aportados: [FORMULARIO, CERTIFICADO],
    }),
    plantillas: [
      {
        tipo: "resolucion",
        nombre: "Resolución de licencia por enfermedad",
        cuerpo: resolucionNotaMedica({
          licencia: "licencia por enfermedad",
          norma: "el Decreto N.º EH-337/77, arts. 18 y siguientes, la Ordenanza N.º 936/87 y su Decreto Reglamentario N.º 10/88",
          recaudos: [
            "Derecho del/de la agente a la licencia por enfermedad, de la que usó {{dias_usados}} días en el año calendario a la fecha del pedido (véase informe del Departamento de Medicina Laboral a fs. {{fs}}).",
            "Enfermedad constatada por el médico auditor del Departamento de Medicina Laboral (véase licencia médica a fs. {{fs}}).",
            RECAUDO_TERMINO,
          ],
          otorga: "la licencia con goce de sueldo por enfermedad",
        }),
        instrucciones: `${INSTRUCCIONES_LICENCIA} Si el encuadre es el art. 19 y ya pasaron los primeros 6 meses, la licencia es con el 50 % de los haberes; si el goce no surge del expediente, [REVISAR: goce de haberes]. Sin modelo propio del área: sigue la estructura del de familiar enfermo; validar.`,
      },
    ],
  },
  // 023 — Prioridad alta. El certificado médico se presenta en Medicina Laboral (en persona o por alguien autorizado) y
  // queda en la ficha médica. Puede terminar en rechazo. A validar con el área: la denuncia a la ART aparece en el
  // circuito actual y no en el digital; el relevamiento ya no menciona el Formulario 16; el art. 28 cita la Ley 9.688
  // (hoy rige la Ley 24.557). El modelo que adjunta el área ("Resolución nota médica") es el de familiar enfermo.
  {
    codigo: "LIC-ACCIDENTE",
    relevamiento: "023",
    nombre: "Licencia por accidente de trabajo",
    descripcion: "Licencia por accidente en el trabajo, en el trayecto o por enfermedad profesional.",
    categoria: "Licencias médicas",
    icono: "hard-hat",
    normativa: `${NORMATIVA_LICENCIAS} Accidente de trabajo o enfermedad profesional: art. 28 del Decreto N.º 337/EH/77 (salario íntegro); in itinere, art. 29 (denuncia policial dentro de las 24 horas); art. 30 (certificaciones por hasta 30 días). [COMPLETAR por Capital Humano: régimen de riesgos del trabajo vigente y reintegro de la ART].`,
    plazo_dias: 3,
    linea_base_dias: null,
    prioridad_base: "alta",
    reservado: true,
    pasos_actuales: 6,
    oficina: "Departamento de Medicina Laboral",
    requisitos: [
      req("certificado_medico", CERTIFICADO, "Llevá el original a Medicina Laboral (vos o alguien autorizado); queda en tu ficha médica"),
      req("denuncia_art", "Denuncia del accidente ante la ART", "Si ya la hiciste", false),
      req("constancia_policial", "Denuncia policial", "Solo si el accidente fue en el trayecto: dentro de las 24 horas", false),
    ],
    formulario: [
      campo("tipo_accidente", "Dónde ocurrió", "seleccion", { opciones: ["En el lugar de trabajo", "En el trayecto (in itinere)", "En ocasión del trabajo", "Enfermedad profesional"] }),
      campo("fecha_accidente", "Fecha del accidente", "fecha"),
      campo("circunstancias", "Cómo ocurrió", "texto_largo", { ayuda: "Lo que pasó, sin datos médicos" }),
      ...CAMPOS_NOTA_MEDICA,
      OBSERVACIONES_SALUD,
    ],
    documentacion_final: [],
    pasos: circuitoMedico({
      controles: [
        "Recibir el certificado original para la ficha médica",
        "Controlar la denuncia a la ART y, si fue en el trayecto, la denuncia policial",
        "Encuadrar la licencia (arts. 28 y 29) y emitir la licencia médica (Formulario 16)",
      ],
      aportados: [FORMULARIO, CERTIFICADO],
    }),
    plantillas: [
      {
        tipo: "resolucion",
        nombre: "Resolución de licencia por accidente de trabajo",
        cuerpo: resolucionNotaMedica({
          licencia: "licencia por accidente de trabajo",
          norma: "el Decreto N.º EH-337/77, arts. 28 y 29, la Ordenanza N.º 936/87 y su Decreto Reglamentario N.º 10/88",
          recaudos: [
            "Accidente de trabajo denunciado por el/la agente, ocurrido el {{fecha_accidente}} ({{tipo_accidente}}) (véase la presentación a fs. {{fs}} y la denuncia a fs. {{fs}}).",
            "Incapacidad laboral constatada por el médico auditor del Departamento de Medicina Laboral (véase licencia médica a fs. {{fs}}).",
          ],
          otorga: "la licencia con goce íntegro de sueldo por accidente de trabajo",
        }),
        instrucciones: `${INSTRUCCIONES_LICENCIA} Si es in itinere y no consta la denuncia policial, señalalo con [REVISAR: denuncia policial dentro de las 24 h (art. 29)]. Sin modelo propio del área: validar.`,
      },
    ],
  },
  // 028 — Circuito del relevamiento del 16/11: Medicina Laboral (control e informe) → Asesoría (dictamen; puede
  // observar) → Medicina Laboral (proyecto de resolución) → Dirección (firma) → Medicina Laboral (toma conocimiento del
  // número y la fecha, y carga). A validar con el área: la declaración jurada de parentesco (sale del modelo, no del
  // relevamiento) y los parentescos alcanzados.
  {
    codigo: "LIC-FAMILIAR-ENFERMO",
    relevamiento: "028",
    nombre: "Licencia por atención de familiar enfermo",
    descripcion: "Licencia con goce de sueldo para atender a un familiar enfermo: hasta 10 días hábiles por año.",
    categoria: "Licencias médicas",
    icono: "hand-heart",
    normativa: `${NORMATIVA_LICENCIAS} Atención de familiar enfermo: art. 50 del Decreto N.º EH-337/77, Ordenanza N.º 936/87 y Decreto Reglamentario N.º 10/88: diez días hábiles por año calendario con percepción íntegra de haberes.`,
    plazo_dias: 2,
    linea_base_dias: null,
    prioridad_base: "normal",
    reservado: true,
    pasos_actuales: 6,
    oficina: "Departamento de Medicina Laboral",
    requisitos: [
      req("certificado_medico", "Certificado médico del familiar", "Que indique que requiere tu atención personal"),
      req("ddjj_familiar", "Declaración jurada de parentesco y grupo familiar", "Para la justificación por familiar enfermo"),
    ],
    formulario: [
      ...CAMPOS_FAMILIAR,
      campo("parentesco", "Parentesco", "seleccion", { opciones: ["Cónyuge o conviviente", "Hijo/a", "Padre o madre", "Otro"] }),
      campo("fecha_desde", "Desde", "fecha"),
      campo("fecha_hasta", "Hasta", "fecha"),
      OBSERVACIONES_SALUD,
    ],
    documentacion_final: ["ddjj_familiar"],
    pasos: [
      pasoMedicina(
        "Control médico e informe",
        "analisis",
        [
          civitasDeclarado("el familiar"),
          CIVITAS_ACTIVO,
          "Controlar el certificado médico del familiar y la necesidad de atención personal",
          "Informar los días usados en el año (hasta 10 días hábiles)",
          "Emitir la licencia médica (Formulario 16)",
        ],
        [FORMULARIO, "Certificado médico del familiar", "Declaración jurada de parentesco y grupo familiar"],
        [FORM16, INFORME_MEDLAB],
      ),
      dictamen([FORMULARIO, "Certificado médico del familiar", "Declaración jurada de parentesco y grupo familiar", INFORME_MEDLAB], "Dictaminar sobre la procedencia de la licencia y el cupo de días"),
      pasoMedicina("Proyecto de resolución", "resolucion", ["Revisar el dictamen", "Preparar el proyecto de resolución en el sentido del dictamen"], [DICTAMEN, INFORME_MEDLAB, FORM16], [RESOLUCION]),
      firma([RESOLUCION, DICTAMEN, INFORME_MEDLAB]),
      cierreMedicina(["Tomar conocimiento del número y la fecha de la resolución"]),
    ],
    plantillas: [
      {
        tipo: "resolucion",
        nombre: "Resolución de licencia por familiar enfermo",
        cuerpo: resolucionNotaMedica({
          licencia: "licencia con goce de sueldo por atención de familiar enfermo",
          norma: "el Decreto N.º EH-337/77, art. 50, la Ordenanza N.º 936/87 y su Decreto Reglamentario N.º 10/88",
          recaudos: [
            "Derecho del/de la agente a diez días hábiles por año calendario para gozar de licencia por atención de familiar enfermo con percepción íntegra de haberes, de los cuales usó {{dias_usados}} días a la fecha del pedido que se tramita por el presente expediente, por lo que le restan {{dias_restantes}} días (véase informe del Departamento de Medicina Laboral a fs. {{fs}}).",
            "Enfermedad del familiar del/de la agente que requiere su atención personal (véase declaración jurada que acredita el parentesco y la composición del núcleo familiar a fs. {{fs}}, y el informe del Departamento de Medicina Laboral que acredita la enfermedad y la necesidad de asistencia a fs. {{fs}}).",
            `Dictamen de ${ASESORIA} que aconseja hacer lugar a la licencia (véase fs. {{fs}}).`,
            RECAUDO_TERMINO,
          ],
          otorga: "la licencia con goce de sueldo por atención de familiar enfermo",
        }),
        instrucciones: `${INSTRUCCIONES_LICENCIA} Si los días pedidos superan los que le restan en el año, señalalo con [REVISAR: cupo de 10 días hábiles]. Modelo real del área; el recaudo del dictamen se agrega porque el circuito digital pasa por la Asesoría, y los artículos de digitalizar, remitir y archivar se reemplazan por el registro y la notificación electrónica.`,
      },
    ],
  },
  // 024 — Reemplaza a la licencia por hijo/a con discapacidad provisoria. Prioridad alta. Rangos del Formulario 3 (Ord.
  // 5363/24). Al terminar, Medicina Laboral incorpora la documentación del tratamiento que presenta el/la agente. A
  // validar con el área: quién resuelve (hoy redacta la resolución la Secretaría de dependencia; el circuito digital no
  // se la asigna a nadie: acá la prepara la Dirección en el paso de firma), los vínculos alcanzados y el monto del pago
  // especial. Dictámenes en estandarización (Dra. Orellana).
  {
    codigo: "LIC-FAMILIAR-DISC",
    relevamiento: "024",
    nombre: "Licencia especial por familiar con discapacidad",
    descripcion: "Licencia o pago especial para acompañar el tratamiento de un hijo/a o cónyuge con discapacidad.",
    categoria: "Licencias médicas",
    icono: "heart-handshake",
    normativa:
      "Ordenanza N.º 5363/24 (licencia y asignación especial por hijo/a o cónyuge con discapacidad), art. 4º, de aplicación al personal de todas las reparticiones excepto la Dirección de Educación. Según el Formulario 3: licencia especial de 30 a 90 días por tratamiento dentro de la provincia o de 30 a 180 días fuera de la provincia, o pago especial; agotada la licencia con goce de haberes, se otorga sin goce hasta 60 días por tratamiento dentro de la provincia o 120 días fuera. Al terminar, el/la agente presenta en Medicina Laboral los certificados de los tratamientos realizados. [COMPLETAR por Capital Humano: monto del pago especial y vínculos alcanzados]. Ley 26.378 (Convención sobre los Derechos de las Personas con Discapacidad).",
    plazo_dias: 5,
    linea_base_dias: null,
    prioridad_base: "alta",
    reservado: true,
    pasos_actuales: 9,
    oficina: "Departamento de Medicina Laboral",
    requisitos: [
      req("cud", "Certificado Único de Discapacidad (CUD)", "Vigente"),
      req(
        "certificado_medico",
        CERTIFICADO,
        "Que indique si el tratamiento es dentro o fuera de la provincia, que requiere tu atención personal y permanente, y el tipo de tratamiento",
      ),
      req(
        "plan_terapeutico",
        "Historia clínica y plan de tratamiento",
        "Emitidos por los profesionales que atienden a tu familiar; si la discapacidad es neurológica, también la historia clínica del pediatra o neurólogo",
      ),
      req("acta_vinculo", "Acta de nacimiento o de matrimonio o unión convivencial", "La que acredita el parentesco"),
      req("copia_dni_familiar", "DNI del familiar", "Copia"),
      req("ddjj_grupo_familiar", "Declaración jurada de grupo familiar conviviente (Formulario 22)", undefined, false),
    ],
    // Formularios 22 y 3: los datos del agente salen del perfil; el motivo (días y/o pago) pasa a ser un campo.
    formulario: [
      campo("vinculo", "Vínculo", "seleccion", { opciones: ["Hijo/a", "Cónyuge o conviviente"] }),
      ...CAMPOS_FAMILIAR,
      campo("fecha_nacimiento", "Fecha de nacimiento del familiar", "fecha"),
      campo("convive", "¿Convive con vos?", "seleccion", { opciones: ["Sí", "No"] }),
      campo("solicita", "Qué pedís", "seleccion", { opciones: ["Días de licencia", "Pago especial", "Días de licencia y pago especial"] }),
      campo("lugar_tratamiento", "Dónde es el tratamiento", "seleccion", {
        opciones: ["Dentro de la provincia", "Fuera de la provincia"],
        ayuda: "Dentro de la provincia, de 30 a 90 días; fuera, de 30 a 180 días",
      }),
      campo("goce", "Goce de haberes", "seleccion", {
        opciones: ["Con goce de haberes", "Sin goce de haberes"],
        ayuda: "Sin goce, solo si ya agotaste la licencia con goce: hasta 60 días dentro de la provincia o 120 fuera",
      }),
      campo("fecha_desde", "Desde", "fecha"),
      campo("fecha_hasta", "Hasta", "fecha"),
      campo("vencimiento_cud", "Vencimiento del CUD", "fecha"),
      OBSERVACIONES_SALUD,
    ],
    documentacion_final: ["cud"],
    pasos: [
      pasoMedicina(
        "Evaluación e informe médico",
        "analisis",
        [
          civitasDeclarado("el familiar"),
          PREOCUPACIONAL,
          CIVITAS_ACTIVO,
          "Controlar la documentación que acredita el parentesco",
          "Controlar si el/la agente ya usó este beneficio",
          "Evaluar al familiar y encuadrar el pedido (art. 4º; dentro o fuera de la provincia, con o sin goce) e informar con recomendación",
          "Controlar el CUD y su vencimiento",
        ],
        [FORMULARIO, "Certificado Único de Discapacidad (CUD)", CERTIFICADO, "Historia clínica y plan de tratamiento"],
        [INFORME_MEDLAB],
        48,
      ),
      dictamen([FORMULARIO, "Certificado Único de Discapacidad (CUD)", CERTIFICADO, INFORME_MEDLAB], "Dictaminar sobre la procedencia de la licencia especial"),
      {
        nombre: "Proyecto, control y firma de la resolución",
        area: "DIR",
        accion: "firma",
        plazo_horas: 24,
        controles: ["Preparar el proyecto de resolución en el sentido del dictamen", "Controlar y firmar (el número y la fecha se asignan al firmar)"],
        revisa: [DICTAMEN, INFORME_MEDLAB, "Certificado Único de Discapacidad (CUD)"],
        genera: [RESOLUCION, FIRMADA],
        permite_subsanacion: false,
      },
      cierreMedicina([
        "Registrar en Civitas el código de la licencia (D14 con goce, D16 sin goce)",
        "Incorporar al expediente la documentación respaldatoria del tratamiento que presente el/la agente",
        "Indicar al/a la agente que, al terminar la licencia, acredite los tratamientos para la constancia de conclusión",
      ]),
    ],
    plantillas: [
      {
        tipo: "informe",
        nombre: "Informe de Medicina Laboral (familiar con discapacidad)",
        cuerpo: `Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Departamento de Medicina Laboral
San Miguel de Tucumán, {{fecha}}

A: Asesoría Letrada
De: Departamento de Medicina Laboral

REF.: Expte. N.º {{numero_expediente}}.-

Atento al pedido solicitado y evaluado/a {{familiar}}, D.N.I. N.º {{dni_familiar}}, {{vinculo}} del/de la agente {{agente}}, N.º {{legajo}}, dependiente de {{dependencia}}, este Departamento de Medicina Laboral determina que existen las discapacidades descriptas en el certificado médico adjunto a las presentes actuaciones, las cuales son {{caracter_discapacidad}}.
A fs. {{fs}} consta informe (historia clínica, estudios y plan de tratamiento) emitido por los profesionales intervinientes.
Cabe destacar que el presente pedido debe encuadrarse, según nuestro criterio, en las disposiciones del artículo 4º inc. {{inciso}}; el tratamiento se realizará {{lugar_tratamiento}}, y a fs. {{fs}} consta CUD con fecha de actualización {{vencimiento_cud}}.
El/la agente hará uso de los días de licencia según necesidad; serán auditados y autorizados por el Departamento de Medicina Laboral a través del sistema de licencias médicas.
Al finalizar el período de licencia otorgado, el/la agente deberá acreditar ante este Departamento la documentación de las medidas de rehabilitación y prestaciones realizadas que justifiquen su uso para los fines invocados, a fin de emitir la constancia de conclusión del presente expediente.
Atentamente.-`,
        instrucciones:
          'Expediente RESERVADO: no transcribas diagnósticos; el carácter de la discapacidad es "parcial" o "total" y "transitoria" o "permanente", según el certificado. Usá "con discapacidad", nunca "discapacitado". Si el inciso del art. 4º no surge de la evaluación, [COMPLETAR: inciso]. Modelo real del área.',
      },
      {
        tipo: "dictamen",
        nombre: "Dictamen sobre licencia especial por familiar con discapacidad",
        cuerpo: `${encabezadoDictamen("LICENCIA ESPECIAL POR FAMILIAR CON DISCAPACIDAD")}

Vienen las presentes actuaciones a este servicio jurídico, por medio de las cuales el/la agente {{agente}}, afiliado/a N.º {{legajo}}, dependiente de {{dependencia}}, solicita licencia especial por {{vinculo}} con discapacidad, {{familiar}}, DNI {{dni_familiar}}.

Documentación obrante en el expediente y normativa aplicable.-
A fs. {{fs}}, obra la solicitud del/de la agente;
A fs. {{fs}}, obran el Certificado Único de Discapacidad, el certificado médico y el plan de tratamiento;
A fs. {{fs}}, obra el informe del Departamento de Medicina Laboral;
Se consultó en el sistema Civitas la situación de revista del/de la agente.

La normativa aplicable es la Ordenanza N.º 5363/24, art. 4º.

Análisis.-
{{analisis}}

Por ello, y conforme a lo considerado, se aconseja {{conclusion}}.

Tal es mi dictamen.`,
        instrucciones: `${INSTRUCCIONES_DICTAMEN} Expediente RESERVADO: no transcribas diagnósticos; referí a "la documentación médica obrante". Usá "con discapacidad", nunca "discapacitado". Priorizá la continuidad del tratamiento. Sin modelo del área: los dictámenes de discapacidad están en estandarización; validar.`,
      },
      {
        tipo: "resolucion",
        nombre: "Resolución de licencia especial por familiar con discapacidad",
        cuerpo: `${ENCABEZADO_MEDLAB}

**VISTO:**
El Expediente N.º {{numero_expediente}}, por el cual el/la agente {{agente}}, afiliado/a N.º {{legajo}}, solicita licencia especial por {{vinculo}} con discapacidad, {{familiar}}, DNI {{dni_familiar}}; y

**CONSIDERANDO:**
Que la petición del/de la agente está reglada por la Ordenanza N.º 5363/24, art. 4º;
Que a fs. {{fs}}, obra el informe del Departamento de Medicina Laboral, que encuadra el pedido en el art. 4º inc. {{inciso}}, con tratamiento {{lugar_tratamiento}};
Que a fs. {{fs}}, obra dictamen de ${ASESORIA}, aconsejando {{sentido_dictamen}};
Que se consultó en el sistema Civitas la situación de revista del/de la agente;

${COMPETENCIA_LICENCIAS}

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** Hacer lugar a la licencia especial {{con_sin_goce}} por {{vinculo}} con discapacidad desde el {{fecha_desde}} hasta el {{fecha_hasta}} a ${AGENTE_RESUELVE}, conforme a los considerandos.

**Artículo 2º:** Hacer saber al/a la agente que, al finalizar la licencia, deberá acreditar ante el Departamento de Medicina Laboral las prestaciones realizadas.

**Artículo 3º:** ${ART_REGISTRO}

**Artículo 4º:** ${ART_NOTIFICACION}`,
        instrucciones: `${INSTRUCCIONES_LICENCIA} Usá "con discapacidad", nunca "discapacitado". {{con_sin_goce}} sale del campo "Goce de haberes" ("con goce de haberes" o "sin goce de haberes"). Controlá que los días estén dentro del rango del lugar del tratamiento (con goce: de 30 a 90 días dentro de la provincia o de 30 a 180 fuera; sin goce: hasta 60 o 120); si no, [REVISAR: rango de días]. Si el pedido es el pago especial, [COMPLETAR: alcance del pago especial]. Sin modelo del área: hoy la resolución la redacta la Secretaría de dependencia; validar competencia.`,
      },
    ],
  },
  // 026 (preparto) y 025 (postparto) — El relevamiento del 16/11 los separa en dos trámites. La hora de lactancia es un
  // campo del postparto ("solicita o no hora de lactancia"); como la base admite una resolución por expediente, el
  // permiso sigue en un trámite aparte. Solo para agentes mujeres ("no debe aparecer a los hombres"): el perfil no tiene
  // el dato del sexo. A validar con el área: duraciones (en el ejemplo, preparto de 30 días reducible y postparto hasta
  // completar 180), parto anticipado o múltiple, goce según la planta, adopción o paternidad, y si conviene unir
  // postparto y lactancia en un expediente cuando la base admita varias resoluciones.
  {
    codigo: "MAT-PREPARTO",
    relevamiento: "026",
    nombre: "Licencia por maternidad (preparto)",
    descripcion: "Licencia por maternidad antes del parto. Después del parto se pide la licencia postparto.",
    categoria: "Licencias médicas",
    icono: "heart-pulse",
    normativa: `${NORMATIVA_LICENCIAS} Maternidad: Decreto N.º 337/77, arts. 32 a 38, y su modificatoria, Ordenanza N.º 223/84, art. 1º. Requisitos: antigüedad mínima en el municipio superior a un mes y más de seis meses en cualquier actividad en relación de dependencia en los doce meses anteriores a la iniciación del último empleo. [COMPLETAR por Capital Humano: duración del preparto y del postparto, y días de preparto que se pasan al postparto].`,
    plazo_dias: 3,
    linea_base_dias: null,
    prioridad_base: "alta",
    reservado: true,
    pasos_actuales: 6,
    oficina: "Departamento de Medicina Laboral",
    requisitos: [req("certificado_medico", "Certificado médico con fecha probable de parto")],
    formulario: [
      campo("fecha_desde", "Desde qué día", "fecha"),
      campo("fecha_probable_parto", "Fecha probable de parto", "fecha"),
      campo("dias_reduccion", "Días de preparto que pasás al postparto", "numero", { obligatorio: false, ayuda: "Si optás por reducir el preparto" }),
      OBSERVACIONES_SALUD,
    ],
    documentacion_final: ["certificado_medico"],
    pasos: circuitoMedico({
      controles: [
        "Constatar el embarazo y la fecha probable de parto",
        "Controlar la antigüedad (más de un mes en el municipio y más de seis meses en los doce anteriores al último empleo)",
        "Emitir la licencia médica (Formulario 16)",
      ],
      aportados: [FORMULARIO, "Certificado médico con fecha probable de parto"],
    }),
    plantillas: [
      {
        tipo: "resolucion",
        nombre: "Resolución de licencia por maternidad (preparto)",
        cuerpo: `${ENCABEZADO_MEDLAB}

**VISTO:**
El Expediente N.º {{numero_expediente}}, por el cual la agente {{agente}}, afiliada N.º {{legajo}}, solicita licencia por maternidad a partir del {{fecha_desde}}{{opcion_reduccion}}; y

**CONSIDERANDO:**
Que la petición de la agente está reglada por el Decreto N.º 337/77, arts. 32 a 38, y su modificatoria, la Ordenanza N.º 223/84, art. 1º;
Que de las constancias de las presentes actuaciones surge que se han cumplido todos los recaudos legales exigidos para la procedencia de la licencia solicitada. A saber:
${RECAUDO_AGENTE}
b. Antigüedad mínima en el municipio superior a un mes (véase informe del Departamento de Medicina Laboral a fs. {{fs}}).
c. Antigüedad mínima en cualquier actividad en relación de dependencia superior a seis meses en el transcurso de los doce meses anteriores a la fecha de iniciación del último empleo (véase informe del Departamento de Medicina Laboral a fs. {{fs}}).
d. Embarazo constatado por la Dirección de Capital Humano (véase informe del Departamento de Medicina Laboral a fs. {{fs}}).

${COMPETENCIA_LICENCIAS}

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** Hacer lugar a la licencia por maternidad (preparto) con goce de sueldo a ${AGENTE_RESUELVE}, a partir del {{fecha_desde}} hasta el {{fecha_hasta}}, conforme a los considerandos.

**Artículo 2º:** Hacer saber a la agente que, producido el parto, deberá iniciar la licencia por maternidad (postparto) con el acta de nacimiento.

**Artículo 3º:** ${ART_REGISTRO}

**Artículo 4º:** ${ART_NOTIFICACION}`,
        instrucciones: `${INSTRUCCIONES_LICENCIA} {{opcion_reduccion}}: si la agente opta por reducir el preparto, ", manifestando que opta por la reducción del período preparto en [N] días a fin de que sean adicionados al período postparto en la misma extensión"; si no, nada. Modelo real del área (lo firmaron la Coordinación de Medicina Laboral y la Directora).`,
      },
    ],
  },
  {
    codigo: "MAT-POSTPARTO",
    relevamiento: "025",
    nombre: "Licencia por maternidad (postparto)",
    descripcion: "Licencia por maternidad después del parto, con el acta de nacimiento.",
    categoria: "Licencias médicas",
    icono: "baby",
    normativa: `${NORMATIVA_LICENCIAS} Maternidad: Decreto N.º E-H 337/77, art. 32 y siguientes, y su modificatoria, Ordenanza N.º 223/84. [COMPLETAR por Capital Humano: duración del postparto y tratamiento de los días de preparto no gozados].`,
    plazo_dias: 3,
    linea_base_dias: null,
    prioridad_base: "alta",
    reservado: true,
    pasos_actuales: 6,
    oficina: "Departamento de Medicina Laboral",
    // A validar con el área: el relevamiento pide el certificado médico; el acta de nacimiento sale del circuito actual
    // (el expediente vuelve con el acta) y la cita el modelo de resolución.
    requisitos: [req("certificado_medico", CERTIFICADO, "Constancia médica del parto"), req("acta_nacimiento", "Acta de nacimiento del hijo/a")],
    formulario: [
      ...CAMPOS_HIJO,
      campo("fecha_desde", "Desde qué día", "fecha"),
      campo("resolucion_preparto", "Resolución de la licencia preparto", "texto", { obligatorio: false, ayuda: "Si la tuviste: número de resolución o de expediente" }),
      campo("solicita_lactancia", "¿Vas a pedir la hora de lactancia?", "seleccion", {
        opciones: ["Sí", "No"],
        ayuda: "Si la pedís, Medicina Laboral te va a indicar que inicies el permiso de lactancia (va en un trámite aparte)",
      }),
      OBSERVACIONES_SALUD,
    ],
    documentacion_final: ["certificado_medico", "acta_nacimiento"],
    pasos: circuitoMedico({
      controles: [
        "Controlar el certificado médico, el acta de nacimiento y la resolución de preparto, si la hubo",
        "Emitir la licencia médica (Formulario 16)",
        "Revisar si la agente pidió la hora de lactancia; si la pidió, indicarle que inicie el permiso de lactancia",
      ],
      aportados: [FORMULARIO, CERTIFICADO, "Acta de nacimiento del hijo/a"],
    }),
    plantillas: [
      {
        tipo: "resolucion",
        nombre: "Resolución de licencia por maternidad (postparto)",
        cuerpo: `${ENCABEZADO_MEDLAB}

**VISTO:**
El Expediente N.º {{numero_expediente}}, por el cual la agente {{agente}}, afiliada N.º {{legajo}}, solicita licencia postparto a partir del {{fecha_desde}} al {{fecha_hasta}}, con goce de sueldo; y

**CONSIDERANDO:**
Que la petición de la agente está reglada por el Decreto N.º E-H 337/77, artículo 32 y subsiguientes, y su modificatoria, la Ordenanza N.º 223/84;
Que la Dirección de Capital Humano emitió la Resolución N.º {{resolucion_preparto}} otorgando licencia por maternidad (preparto) a partir del {{desde_preparto}};
Que la agente adjuntó el acta de nacimiento de {{familiar}}, por lo cual corresponde conceder la licencia por maternidad (postparto) por el tiempo restante;
Que se ha dado cumplimiento a los requisitos de tiempo y forma establecidos por la norma vigente;

Por ello, y de conformidad con las facultades conferidas por el artículo 64 del Decreto N.º E-H 337/77;

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** Hacer lugar a la licencia por maternidad (postparto) con goce de sueldo a ${AGENTE_RESUELVE}, a partir del {{fecha_desde}} al {{fecha_hasta}}, por los considerandos que anteceden.

**Artículo 2º:** ${ART_REGISTRO}

**Artículo 3º:** ${ART_NOTIFICACION}`,
        instrucciones: `${INSTRUCCIONES_LICENCIA} Si no hubo licencia preparto (parto anticipado), eliminá el considerando de la resolución de preparto. Modelo real del área.`,
      },
    ],
  },
  {
    codigo: "MAT-LACTANCIA",
    // En el relevamiento del 16/11 la hora de lactancia se pide en el formulario del postparto (025).
    relevamiento: "025",
    nombre: "Permiso de lactancia",
    descripcion: "Una hora diaria hasta que tu hijo/a cumpla un año, después de la licencia postparto. Inicialo si lo pediste en la licencia postparto.",
    categoria: "Licencias médicas",
    icono: "milk",
    normativa: `${NORMATIVA_LICENCIAS} Permiso de lactancia: Decreto N.º 337/77, art. 39. [COMPLETAR por Capital Humano: si es un turno de una hora o una hora diaria, y si se puede pedir después].`,
    plazo_dias: 3,
    linea_base_dias: null,
    prioridad_base: "normal",
    reservado: true,
    // El relevamiento cuenta los pasos de toda la maternidad en preparto y postparto.
    pasos_actuales: null,
    oficina: "Departamento de Medicina Laboral",
    // La manifestación de la agente es la presentación del formulario.
    requisitos: [],
    formulario: [
      ...CAMPOS_HIJO,
      campo("fecha_desde", "Desde qué día", "fecha", { ayuda: "En general, al terminar la licencia postparto" }),
      campo("resoluciones_previas", "Resoluciones de preparto y postparto", "texto", { obligatorio: false, ayuda: "Número de resolución o de expediente" }),
      OBSERVACIONES,
    ],
    documentacion_final: [],
    pasos: circuitoMedico({
      controles: ["Controlar las resoluciones de preparto y postparto, y que la agente haya pedido la hora de lactancia"],
      aportados: [FORMULARIO],
      genera: [RESOLUCION],
      extraCierre: ["Registrar la reducción horaria por lactancia en Civitas"],
    }),
    plantillas: [
      {
        tipo: "resolucion",
        nombre: "Resolución de permiso de lactancia",
        cuerpo: `${ENCABEZADO_MEDLAB}

**VISTO:**
El Expediente N.º {{numero_expediente}}, por el cual la agente {{agente}}, afiliada N.º {{legajo}}, solicita permiso por lactancia de una (1) hora diaria a partir del {{fecha_desde}}; y

**CONSIDERANDO:**
Que la petición de la agente está reglada por el Decreto N.º 337/77, art. 39;
Que la Dirección de Capital Humano otorgó licencia por maternidad preparto por Resolución N.º {{resolucion_preparto}} y postparto por Resolución N.º {{resolucion_postparto}};
Que la agente hizo uso de la opción legal de gozar del permiso de lactancia (véase su manifestación a fs. {{fs}});
Que se ha dado cumplimiento en tiempo y forma a los requisitos determinados por la normativa vigente;

Por ello, y en ejercicio de las facultades conferidas por el Decreto N.º E-H 337/77, art. 64;

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** CONCEDER permiso de lactancia de una (1) hora diaria a partir del {{fecha_desde}} hasta que su hijo/a cumpla un año, a la agente ${AGENTE_RESUELVE}, por los considerandos que anteceden.

**Artículo 2º:** ${ART_REGISTRO}

**Artículo 3º:** ${ART_NOTIFICACION}`,
        instrucciones: `${INSTRUCCIONES_COMUNES} Si no constan las resoluciones de preparto o postparto, eliminá lo que falte o marcá [COMPLETAR]. Modelo real del área.`,
      },
    ],
  },
]

// ---------------------------------------------------------------------
// Datos del agente (relevamiento 16/11/2026)
// ---------------------------------------------------------------------
// 021 — Cambio de domicilio: lo controla el Departamento de Higiene y Seguridad, que revisa el recorrido que el agente
// marca en el mapa (cobertura de accidentes in itinere). No lleva resolución: cierra sin resolución (migración 001600)
// y el formulario completado va al legajo. Con API de Civitas, el registro sería automático. A validar con el área:
// la norma aplicable, el plazo para informar el cambio y si Higiene y Seguridad lo devuelve cuando el recorrido no es
// razonable (acá puede observarlo).
export const TRAMITES_DATOS: TramiteSemilla[] = [
  {
    codigo: "CAMBIO-DOMICILIO",
    relevamiento: "021",
    nombre: "Cambio de domicilio",
    descripcion: "Actualizá tu domicilio y marcá en el mapa el recorrido hasta tu lugar de trabajo: es el que cubre un accidente en el trayecto.",
    categoria: "Datos personales",
    icono: "map-pin",
    normativa:
      "Formulario 19 (cambio de domicilio). El recorrido declarado entre el domicilio y el lugar de trabajo es el que se tiene en cuenta ante un accidente en el trayecto (in itinere). [COMPLETAR por Capital Humano: norma aplicable y plazo para informar el cambio].",
    plazo_dias: 5,
    linea_base_dias: null,
    prioridad_base: "normal",
    reservado: false,
    pasos_actuales: 4,
    oficina: "Departamento de Higiene y Seguridad",
    requisitos: [],
    formulario: [
      campo("domicilio_nuevo", "Nuevo domicilio", "texto", { ayuda: "Calle, número, piso y departamento" }),
      campo("barrio_localidad", "Barrio y localidad", "texto"),
      campo("desde", "Desde cuándo vivís ahí", "fecha"),
      campo("lugar_trabajo", "Dirección de tu lugar de trabajo", "texto", { ayuda: "Donde prestás servicios" }),
      campo("recorrido", "Recorrido de tu casa al trabajo", "recorrido", {
        ayuda: "Tocá el mapa para marcar tu casa, las esquinas por donde pasás y tu lugar de trabajo, en ese orden",
      }),
      OBSERVACIONES,
    ],
    documentacion_final: ["presentacion"],
    pasos: [
      {
        nombre: "Control del recorrido y registro",
        area: "HYS",
        accion: "notificacion",
        plazo_horas: 48,
        controles: [
          "Controlar el recorrido marcado en el mapa: que una el domicilio con el lugar de trabajo por un camino razonable",
          "Registrar el nuevo domicilio y el recorrido en Civitas",
          CIVITAS_ACTIVO,
        ],
        revisa: [FORMULARIO],
        genera: [],
        destino_final: "Notificación electrónica al agente; el formulario con el recorrido va a su legajo digital",
      },
    ],
    plantillas: [],
  },
]

// ---------------------------------------------------------------------
// Recursos de reconsideración (relevamiento 16/11/2026, migración 001700)
// ---------------------------------------------------------------------
// El circuito digital es el mismo en todos los trámites que la admiten: Asesoría Legal (plazo y fondo, nuevo dictamen)
// → el área del trámite (proyecto de resolución) → Dirección (firma) → el área del trámite (novedad o carga en Civitas).
// Se pide desde el trámite resuelto (interponer_reconsideracion) y tramita en un expediente vinculado. A validar con el
// área: el número de la OPA, la norma de competencia, la hora de inicio de la atención (el límite se calcula a las 9:
// 2 horas desde las 7), los feriados (se cargan en public.feriados) y el modelo de dictamen y de resolución (no hay).
const NORMATIVA_RECONSIDERACION =
  "Recurso de reconsideración: se interpone dentro de los ocho (8) días hábiles de la notificación de la resolución. Por el plazo extraordinario del art. 25 de la Ordenanza de Procedimiento Administrativo (OPA), se admite para su análisis de fondo incluso en las dos (2) primeras horas del día hábil siguiente. Si se rechaza, procede el recurso jerárquico, que se presenta en papel. [COMPLETAR por Capital Humano: número de la OPA y norma de competencia]."

function dictamenReconsideracion() {
  return `${encabezadoDictamen("RECURSO DE RECONSIDERACIÓN")}

Vienen las presentes actuaciones a este servicio jurídico, por medio de las cuales el/la agente {{agente}}, AF {{legajo}}, dependiente de {{dependencia}}, interpone recurso de reconsideración contra la Resolución N.º {{resolucion_recurrida}}, dictada en el Expediente N.º {{expediente_origen}} ({{tramite_origen}}).

Admisibilidad formal.-
El recurso fue interpuesto el {{fecha_expediente}}, dentro del plazo de ocho (8) días hábiles desde la notificación de la resolución recurrida.

Fundamentos del recurso.-
{{fundamentos}}

Análisis.-
{{analisis}}

Por ello, y conforme a lo considerado, se aconseja {{conclusion}} el recurso de reconsideración interpuesto{{en_consecuencia}}.

Tal es mi dictamen.`
}

function resolucionReconsideracion(oficina: string) {
  return `${encabezadoResolucion(oficina)}

**VISTO:**
El Expediente N.º {{numero_expediente}}, de fecha {{fecha_expediente}}, por el cual ${VISTO_AGENTE}, interpone recurso de reconsideración contra la Resolución N.º {{resolucion_recurrida}}, dictada en el Expediente N.º {{expediente_origen}}; y

**CONSIDERANDO:**
Que a fs. {{fs}}, obra el recurso de reconsideración interpuesto por el/la agente, con sus fundamentos;
Que el recurso fue interpuesto dentro del plazo de ocho (8) días hábiles desde la notificación de la resolución recurrida;
Que a fs. {{fs}}, obra dictamen de ${ASESORIA}, aconsejando {{sentido_dictamen}};

Por lo expuesto y en ejercicio de la competencia que le acuerda [COMPLETAR: norma de competencia];

**LA DIRECTORA DE CAPITAL HUMANO**
**R E S U E L V E:**

**Artículo 1º:** {{hacer_lugar}} al recurso de reconsideración interpuesto por el/la agente {{agente}}, afiliado/a N.º {{legajo}}, contra la Resolución N.º {{resolucion_recurrida}}{{en_consecuencia}}, conforme a los considerandos que anteceden.

**Artículo 2º:** ${ART_REGISTRO}

**Artículo 3º:** ${ART_NOTIFICACION}`
}

const INSTRUCCIONES_RECONSIDERACION = [
  "Lo recurrido (los datos, el dictamen y la resolución del expediente de origen) está en <expediente_recurrido>; la resolución recurrida, el expediente de origen y el trámite salen de los datos del recurso.",
  "Resumí los fundamentos del/de la agente sin agregar nada; si sumó documentación nueva, decí qué aporta.",
  "{{conclusion}} es \"HACER LUGAR\" o \"NO HACER LUGAR\"; {{hacer_lugar}}, \"Hacer lugar\" o \"No hacer lugar\". Si se hace lugar, {{en_consecuencia}} es \", y en consecuencia [lo que se otorga o se corrige, con la fecha de efecto]\"; si no, queda vacío.",
  "Si no se hace lugar, agregá antes del registro un artículo que haga saber al/a la agente que puede interponer el recurso jerárquico: [COMPLETAR: plazo y ante quién].",
  "No inventes normas: lo que no esté en el expediente va como [COMPLETAR]. Sin modelo del área: validar.",
].join(" ")

const recurso = (op: { codigo: string; area: "BONIF" | "MEDLAB"; oficina: string; pasos_actuales: number | null }): TramiteSemilla => ({
  codigo: op.codigo,
  relevamiento: null,
  nombre: `Recurso de reconsideración (${op.oficina})`,
  descripcion:
    "Pedido de reconsideración de una resolución de Capital Humano. Se pide desde el trámite resuelto, dentro de los 8 días hábiles de la notificación.",
  categoria: "Recursos",
  icono: "scale",
  normativa: NORMATIVA_RECONSIDERACION,
  plazo_dias: 10,
  linea_base_dias: null,
  prioridad_base: "normal",
  reservado: false,
  pasos_actuales: op.pasos_actuales,
  oficina: op.oficina,
  es_recurso: true,
  requisitos: [req("documentacion_nueva", "Documentación nueva", "Solo si tenés algo que no presentaste antes", false)],
  formulario: [campo("fundamentos", "Fundamentos", "texto_largo")],
  documentacion_final: [],
  pasos: [
    {
      nombre: "Dictamen sobre el recurso",
      area: "DICT",
      accion: "dictamen",
      plazo_horas: 48,
      controles: [
        "Controlar que el recurso esté en término: 8 días hábiles desde la notificación (art. 25 de la OPA: hasta las 2 primeras horas del día hábil siguiente)",
        "Revisar el dictamen y la resolución recurridos (expediente de origen) y la documentación nueva",
        "Analizar el fondo y dictaminar si se hace lugar o no, con el motivo",
      ],
      revisa: [FORMULARIO],
      genera: [DICTAMEN],
    },
    {
      nombre: "Proyecto de resolución del recurso",
      area: op.area,
      accion: "resolucion",
      plazo_horas: 24,
      controles: ["Revisar el dictamen", "Preparar el proyecto de resolución del recurso en el sentido del dictamen"],
      revisa: [DICTAMEN],
      genera: [RESOLUCION],
    },
    firma([RESOLUCION, DICTAMEN]),
    op.area === "BONIF"
      ? {
          ...novedad(),
          nombre: "Novedad a Liquidación (si se hace lugar) y cierre",
          controles: [
            "Tomar conocimiento del número y la fecha de la resolución",
            "Si se hace lugar, informar la novedad a Liquidación y registrarla en Civitas",
            "Si no se hace lugar, no hay novedad: archivar",
          ],
        }
      : cierreMedicina(["Tomar conocimiento del número y la fecha de la resolución", "Si se hace lugar, cargar lo resuelto en Civitas"]),
  ],
  plantillas: [
    {
      tipo: "dictamen",
      nombre: "Dictamen sobre el recurso de reconsideración",
      cuerpo: dictamenReconsideracion(),
      instrucciones: `${INSTRUCCIONES_DICTAMEN} ${INSTRUCCIONES_RECONSIDERACION}`,
    },
    {
      tipo: "resolucion",
      nombre: "Resolución del recurso de reconsideración",
      cuerpo: resolucionReconsideracion(op.oficina),
      instrucciones: `${INSTRUCCIONES_COMUNES} ${INSTRUCCIONES_RECONSIDERACION}`,
    },
  ],
})

export const TRAMITES_RECURSOS: TramiteSemilla[] = [
  // El relevamiento cuenta 7 pasos en papel para la primera reconsideración de Bonificaciones.
  recurso({ codigo: "RECON-BONIF", area: "BONIF", oficina: "Área Bonificaciones", pasos_actuales: 7 }),
  recurso({ codigo: "RECON-MEDLAB", area: "MEDLAB", oficina: "Departamento de Medicina Laboral", pasos_actuales: null }),
]

/**
 * Trámites que no admiten reconsideración según el relevamiento del 16/11 (004, 007, 008, 010, 021) y la licencia
 * por examen, que no vino en el relevamiento. A validar con el área: el inicio de clases fuera de término dice que no
 * la admite, pero su circuito la incluye (acá la admite).
 */
const SIN_RECONSIDERACION = new Set(["BAJA-ESTUDIOS", "BAJA-PARTICULAR", "ESC-FIN", "ESC-INICIO", "CAMBIO-DOMICILIO", "LIC-EXAMEN"])
const conReconsideracion = (recursoCodigo: string) => (t: TramiteSemilla): TramiteSemilla => ({
  ...t,
  reconsideracion: SIN_RECONSIDERACION.has(t.codigo) ? null : recursoCodigo,
})

/** Trámites que ya no existen: se borran de la base si no tienen expedientes. */
export const CODIGOS_RETIRADOS = ["BONIF-TITULO", "ASIG-FAMILIAR", "LIC-HIJO-DISC"]

export const CATALOGO_SEMILLA: TramiteSemilla[] = [
  ...[...TRAMITES_BONIFICACIONES, ...TRAMITES_DATOS].map(conReconsideracion("RECON-BONIF")),
  ...TRAMITES_LICENCIAS.map(conReconsideracion("RECON-MEDLAB")),
  ...TRAMITES_RECURSOS,
]
