// =====================================================================
// Catálogo base de Capital Humano (semilla de la base de datos)
//
// Bonificaciones, asignaciones y escolaridad: relevamiento del Área
// Bonificaciones del 22/10/2026 (reemplaza al del 07/10), circuito FINAL
// DIGITAL, con los modelos reales de dictamen y resolución del área.
// Lo que depende de una respuesta del área está marcado con
// "A validar con el área". Licencias: provisorio hasta tener su relevamiento.
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
  {
    codigo: "BONIF",
    nombre: "Área Bonificaciones",
    descripcion: "Adicionales por título, asignaciones familiares y escolaridad: control, proyectos de resolución y novedades a Liquidación",
  },
  { codigo: "LIC", nombre: "Sección Licencias", descripcion: "Control de licencias y días disponibles (provisorio)" },
  { codigo: "MEDLAB", nombre: "Departamento de Medicina Laboral", descripcion: "Entrevistas e informes médicos" },
  // A validar con el área: el membrete de los dictámenes dice "Asesoría Legal" y las resoluciones, "Asesoría Letrada".
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

// Recursos de reconsideración (no modelados todavía). El relevamiento los prevé en títulos
// (001 y 003), bajas por divorcio y fallecimiento, certificados fuera de término y asignaciones.
// Reconsideración 1: Asesoría Legal (plazo y fondo, dictamen) → Bonificaciones (resolución) →
// Dirección (firma) → Bonificaciones (novedad si se admite). Reconsideración 2: Asesoría Legal
// (informe) → Fiscalía Municipal (dictamen) → Secretaría de Gobierno (resolución) → Bonificaciones.
// A validar con el área: si la segunda es en realidad un recurso jerárquico, y si en el terciario,
// las bajas por estudios y por motivos particulares y los certificados en término no hay recursos.

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

// Condiciones de Civitas. El relevamiento las pone como requisito para poder iniciar; sin API de
// Civitas no se pueden comprobar al iniciar, así que las controla el área en el primer paso.
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
const ENCABEZADO = `RESOLUCIÓN N.º {{numero_resolucion}}
Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano · Área Bonificaciones
San Miguel de Tucumán, {{fecha_resolucion}}`

const ART_REGISTRO = "Registrar la presente Resolución en el Registro de Resoluciones de la Dirección de Capital Humano."
const ART_NOTIFICACION = "Notificar al/a la agente por medio del sistema de expedientes electrónicos, con constancia de fecha en el expediente. Notificado/a, archívese."

// Los modelos de título nombran la categoría del agente; los de asignaciones y bajas, no.
const VISTO_AGENTE = "el/la agente {{agente}}, afiliado/a N.º {{legajo}}, dependiente de {{dependencia}}, y con prestación de servicios en {{reparticion}}"
const VISTO_AGENTE_CATEGORIA = "el/la agente {{agente}}, afiliado/a N.º {{legajo}}, categoría {{categoria}}, dependiente de {{dependencia}}, y con prestación de servicios en {{reparticion}}"

// Así nombran a la Asesoría los modelos de resolución del área.
const ASESORIA = "Asesoría Letrada de la Dirección de Capital Humano"

const INSTRUCCIONES_COMUNES = [
  "Las referencias \"a fs.\" tomalas de la numeración de fojas del expediente.",
  "Si el sentido indicado es NO hacer lugar, el Artículo 1º dice \"No hacer lugar al pedido...\" con los fundamentos del dictamen, y se omite el porcentaje o la fecha de efecto.",
  "Concordá el género (el/la agente) con los datos del agente.",
].join(" ")

const INSTRUCCIONES_DICTAMEN = [
  "El dictamen no lleva número. {{fecha}} es la fecha de hoy.",
  "Las referencias \"A fs.\" tomalas de la numeración de fojas del expediente; la planta, el vínculo y la fecha de alta salen de la situación de revista (si no están, [COMPLETAR]).",
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
Que a fs. {{fs}}, se agrega informe del Área de Verificación de Títulos y Egresados de esta Dirección, sobre su autenticidad;
Que a fs. {{fs}}, se agregan foja de servicios y situación de revista del/de la agente;
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
A fs. {{fs}}, antecedentes laborales.
A fs. {{fs}}, situación de revista del/de la agente, con fecha de alta el {{fecha_alta}}, {{vinculo_laboral}}.

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
Que a fs. {{fs}}, se agrega foja de servicios del/de la agente;
Que a fs. {{fs}}, se agrega situación de revista del/de la agente;
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
A fs. {{fs}}, obran antecedentes laborales y situación de revista del/de la agente, planta {{planta}}, con fecha de alta el {{fecha_alta}}, dependiente de {{dependencia}}.

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
Que a fs. {{fs}}, se agregan foja de servicios y situación de revista del/de la agente;${
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
Que a fs. {{fs}}, se agrega situación de revista del/de la agente;
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
// Trámites del Área Bonificaciones (relevamiento 22/10/2026)
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
    // Formulario 17. Los datos del agente (nombre, CUIL, legajo, teléfono, reparticiones) salen del perfil.
    // A validar con el área: el formulario pide también el domicilio y el domicilio laboral, que el perfil no tiene.
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
    // A validar con el área: el relevamiento también manda al legajo el informe de verificación, que hoy no tiene cómo llegar (solo pasan los requisitos).
    documentacion_final: [...(op.conAnalitico ? ["certificado_analitico"] : []), ...(op.conDiploma ? ["diploma"] : [])],
    pasos: circuitoEstandar({
      control: control(
        "Control de documentación y verificación del título",
        [
          "Controlar la documentación adjunta",
          op.nivel === "Universitario"
            ? "Verificar el título online en el Registro Público de Graduados Universitarios (SIU-CIN) o, si es extranjero, en el de convalidaciones"
            : "Verificar la autenticidad del título",
          CIVITAS_ALTA,
        ],
        aportados,
        [FOJA, REVISTA, "Informe de verificación del título"],
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

// Certificados escolares fuera de término (009 y 011). Los de dentro de término (008 y 010) son un solo paso de
// Bonificaciones, sin dictamen ni resolución: no se cargan hasta que la novedad de haberes pueda registrarse sin
// resolución firmada (hoy registrar_novedad la exige; hace falta una migración).
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
    // La nota de pedido del papel pasa a ser el campo Motivo, como en la baja por motivos particulares.
    // A validar con el área: un expediente por presentación (varios hijos/as) o uno por hijo/a.
    formulario: [
      campo("ciclo_lectivo", "Ciclo lectivo", "numero"),
      campo("hijos", "Hijos/as que incluye el certificado", "texto_largo", { ayuda: "Para cada uno: apellido y nombre, DNI, fecha de nacimiento, nivel y grado o año" }),
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
      extraNovedad: ["Cargar la escolaridad del ciclo lectivo en Civitas y en la foja de servicios"],
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

  // 004 — A validar con el área: si el certificado de estudios es obligatorio o alcanza con la declaración jurada
  // (Formulario 9.1, solo para mayores de 15 años), qué pasa con los menores de 15, quién reemplaza la firma del
  // encargado de personal y si la baja incluye siempre la escolaridad. El Formulario 9 no vino en el relevamiento.
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
    documentacion_final: ["ddjj_interrupcion"],
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
  // 005 — El FINAL DIGITAL elimina el dictamen y deja 3 pasos. El proyecto de resolución lo prepara el área en el
  // primer paso (el relevamiento no asigna a nadie la resolución). A validar con el área: el modelo de resolución
  // cita un dictamen de la Asesoría, y la Dirección "revisa" un dictamen que en este circuito nadie produce.
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
    pasos: [
      control(
        "Control de documentación y proyecto de resolución",
        [
          "Controlar la documentación adjunta",
          civitasDeclarado("el/la cónyuge"),
          "Verificar en Civitas que no haya una solicitud duplicada",
          "Definir desde cuándo cesa la asignación",
          "Preparar el proyecto de resolución",
        ],
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
        cuerpo: resolucionBaja(
          "cónyuge",
          "acta de matrimonio con la anotación de la sentencia de divorcio, o la sentencia judicial de divorcio, de fecha {{fecha_divorcio}}, en relación a {{familiar}}, DNI {{dni_familiar}}",
          false,
        ),
        instrucciones: `${INSTRUCCIONES_COMUNES} En este circuito no interviene la Asesoría: no menciones dictamen. El cese rige desde el mes de la sentencia de divorcio; si es anterior al pedido, señalá con [REVISAR: períodos liquidados después del divorcio] para que el área defina el tratamiento.`,
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
  // 007 — Ahora es solo por hijo/a. El circuito actual tiene 5 pasos (no 8). La "nota solicitando la baja" del papel
  // pasa a ser el campo Motivo del formulario. A validar con el área: si la nota firmada sigue siendo necesaria, si el
  // circuito actual de 5 pasos es real y si hay modelo de resolución.
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

  // 009 y 011 — A validar con el área: plazo del certificado de fin, desde qué mes se liquida lo admitido, qué niveles
  // y edades cubre y qué va al legajo. Errores del material: el adjunto de 008 es el formulario de inicio y el
  // informe de 010 dice "fin de clases".
  certificadoFueraDeTermino({ codigo: "ESC-FIN-EXT", relevamiento: "009", momento: "fin" }),
  certificadoFueraDeTermino({ codigo: "ESC-INICIO-EXT", relevamiento: "011", momento: "inicio" }),

  // 012 — A validar con el área: si el certificado de escolaridad es obligatorio (el relevamiento lo pide sin condición).
  // El caso real pide nacimiento y por hijo/a en un solo expediente: acá van en expedientes separados, porque la
  // novedad de haberes admite un alta por expediente.
  {
    codigo: "ASIG-HIJO",
    relevamiento: "012",
    nombre: "Asignación familiar por hijo/a",
    descripcion: "Pago de la asignación familiar por hijo/a.",
    categoria: "Asignaciones familiares",
    icono: "users",
    normativa: `${NORMATIVA_ALTAS} [COMPLETAR por Capital Humano: edad máxima, escolaridad exigida y vigencia].`,
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
    formulario: [...CAMPOS_HIJO, ...CAMPOS_PROGENITOR, OBSERVACIONES],
    documentacion_final: ["acta_nacimiento", "certificado_escolaridad"],
    pasos: circuitoEstandar({
      control: control(
        "Control de documentación y grupo familiar",
        ["Controlar la documentación adjunta", "Controlar la negativa de ANSES del otro progenitor", civitasNoPercibe("el hijo/a"), "Actualizar el grupo familiar en Civitas"],
        [FORMULARIO, "Acta de nacimiento del hijo/a", "Negativa de ANSES de la madre o del padre", "Certificado de escolaridad"],
        ["Administración de grupo familiar", FOJA, REVISTA],
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
  // 013 — Reservado (datos de salud) y con prioridad alta. Medicina Laboral interviene en el alta; en la renovación
  // del CUD no (bifurcación pendiente de modelar: ver instrucciones del paso). En la renovación no se presenta el
  // Formulario 14 sino una nota (acá, el mismo formulario digital con "Renovación del CUD"). Al legajo el
  // relevamiento manda solo la resolución firmada. A validar con el área: no hay modelo propio de dictamen ni de
  // resolución; la condición de Civitas del alta bloquearía la renovación.
  {
    codigo: "ASIG-HIJO-DISC",
    relevamiento: "013",
    nombre: "Asignación familiar por hijo/a con discapacidad",
    descripcion: "Alta o renovación de la asignación familiar por hijo/a con discapacidad.",
    categoria: "Asignaciones familiares",
    icono: "heart-handshake",
    normativa: `${NORMATIVA_ALTAS} Ley 26.378 (Convención sobre los Derechos de las Personas con Discapacidad).`,
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
      ...CAMPOS_HIJO,
      campo("vencimiento_cud", "Vencimiento del CUD", "fecha", { ayuda: "Sirve para avisarte antes de que venza" }),
      ...CAMPOS_PROGENITOR,
      campo("observaciones", "Observaciones", "texto_largo", { obligatorio: false, ayuda: "No incluyas diagnósticos: el CUD ya los contiene" }),
    ],
    documentacion_final: [],
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
          "Verificar en Civitas la fecha de vencimiento del CUD, en caso de corresponder",
          "Solo en el alta: verificar en Civitas que el hijo/a no genere ya asignación (código A o N en el ítem Asignación) y que no se haya hecho lugar antes a la misma solicitud",
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
        tipo: "dictamen",
        nombre: "Dictamen sobre asignación por hijo/a con discapacidad",
        cuerpo: dictamenAsignacion({
          asignacion: "por hijo/a con discapacidad",
          documentacion: [
            "copia del acta de nacimiento expedida y certificada por el Registro de Estado Civil y Capacidad de las Personas, correspondiente a {{familiar}}, DNI {{dni_familiar}}",
            "Certificado Único de Discapacidad correspondiente a {{familiar}}, con vencimiento el {{vencimiento_cud}}",
            "informe del Departamento de Medicina Laboral",
            "impresión de consulta de certificación negativa, correspondiente a {{progenitor}}, C.U.I.L. N.º {{cuil_progenitor}}",
          ],
          analisis: `respecto de la asignación por hijo/a con discapacidad, el/la agente acredita el vínculo familiar con {{familiar}} a través del acta de nacimiento (fs. {{fs}}) y la discapacidad mediante el Certificado Único de Discapacidad vigente (fs. {{fs}}) y el informe del Departamento de Medicina Laboral (fs. {{fs}}). ${ANALISIS_NEGATIVA}`,
        }),
        instrucciones: `${INSTRUCCIONES_DICTAMEN} Expediente RESERVADO: no transcribas diagnósticos; referí a "la documentación médica obrante". Usá "hijo/a con discapacidad", nunca "discapacitado". Si es renovación del CUD, decilo en la apertura y citá la resolución anterior en lugar del informe de Medicina Laboral. ${ARTICULOS_A_CONFIRMAR} Sin modelo propio: sigue el de nacimiento y por hijo/a.`,
      },
      {
        tipo: "resolucion",
        nombre: "Resolución de asignación por hijo/a con discapacidad",
        cuerpo: resolucionAlta({
          asignacion: "por hijo/a con discapacidad",
          acredita: [
            "acta de nacimiento expedida por el Registro de Estado Civil y Capacidad de las Personas, correspondiente a {{familiar}}, DNI {{dni_familiar}}",
            "Certificado Único de Discapacidad de {{familiar}}, con vencimiento el {{vencimiento_cud}}, e informe del Departamento de Medicina Laboral",
            NEGATIVA_ANSES,
          ],
        }),
        instrucciones: `${INSTRUCCIONES_ALTA} Expediente RESERVADO: no transcribas diagnósticos; referí a "la documentación médica obrante". Usá "hijo/a con discapacidad", nunca "discapacitado". {{en_relacion_a}}: ", en relación a [hijo/a], DNI [dni]". Si es renovación, decilo en el VISTO. Sin modelo propio: sigue el de nacimiento y por hijo/a; validar con el área.`,
      },
    ],
  },
  // 014 — Pago único. A validar con el área: el informe de matrimonio es copia del de cónyuge (017), así que la
  // condición de Civitas y lo que va al legajo no están relevados de verdad.
  {
    codigo: "ASIG-MATRIMONIO",
    relevamiento: "014",
    nombre: "Asignación familiar por matrimonio (pago único)",
    descripcion: "Pago único de la asignación familiar por matrimonio del/de la agente.",
    categoria: "Asignaciones familiares",
    icono: "heart",
    normativa: NORMATIVA_ALTAS,
    plazo_dias: 10,
    linea_base_dias: null,
    prioridad_base: "normal",
    reservado: false,
    pasos_actuales: 8,
    oficina: "Área Bonificaciones",
    requisitos: [req("acta_matrimonio", "Acta de matrimonio")],
    formulario: [...CAMPOS_CONYUGE, campo("fecha_matrimonio", "Fecha de matrimonio", "fecha"), OBSERVACIONES],
    documentacion_final: ["acta_matrimonio"],
    pasos: circuitoEstandar({
      control: control("Control de documentación", ["Controlar la documentación adjunta", CIVITAS_ALTA], [FORMULARIO, "Acta de matrimonio"]),
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
          analisis: "respecto de la asignación por matrimonio, el/la agente acredita el hecho y el vínculo con {{familiar}} a través del acta de matrimonio (fs. {{fs}}).",
          pagoUnico: true,
        }),
        instrucciones: `${INSTRUCCIONES_DICTAMEN} {{en_relacion_a}}: ", respecto de su matrimonio con [cónyuge], DNI [dni]". ${ARTICULOS_A_CONFIRMAR}`,
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
  // 015 — Pago único. A validar con el área: la condición de Civitas es contradictoria entre el circuito actual
  // ("el hijo/a debe estar declarado") y el final ("el/la cónyuge debe estar registrado/a").
  {
    codigo: "ASIG-NACIMIENTO",
    relevamiento: "015",
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
      req("certificado_discapacidad", "Certificado Único de Discapacidad (CUD)", "Solo si el hijo/a tiene discapacidad", false),
    ],
    formulario: [...CAMPOS_HIJO, ...CAMPOS_PROGENITOR, OBSERVACIONES],
    documentacion_final: ["acta_nacimiento", "certificado_discapacidad"],
    pasos: circuitoEstandar({
      control: control(
        "Control de documentación y grupo familiar",
        ["Controlar la documentación adjunta", "Controlar la negativa de ANSES del otro progenitor", CIVITAS_ALTA, "Actualizar el grupo familiar en Civitas"],
        [FORMULARIO, "Acta de nacimiento del hijo/a", "Negativa de ANSES de la madre o del padre"],
        ["Administración de grupo familiar", FOJA, REVISTA],
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
  // 016 — Solo para agentes mujeres. A validar con el área: semanas mínimas de gestación y período de pago.
  {
    codigo: "ASIG-PRENATAL",
    relevamiento: "016",
    nombre: "Asignación familiar prenatal",
    descripcion: "Pago de la asignación prenatal durante el embarazo. La pide la agente embarazada.",
    categoria: "Asignaciones familiares",
    icono: "heart-pulse",
    normativa: `${NORMATIVA_ALTAS} [COMPLETAR por Capital Humano: semanas mínimas de gestación y período de pago].`,
    plazo_dias: 10,
    linea_base_dias: null,
    prioridad_base: "normal",
    reservado: true,
    pasos_actuales: 10,
    oficina: "Área Bonificaciones",
    requisitos: [req("certificado_medico_fpp", "Certificado médico con fecha probable de parto"), req("ecografia", "Ecografía")],
    formulario: [campo("fecha_probable_parto", "Fecha probable de parto", "fecha")],
    documentacion_final: ["certificado_medico_fpp", "ecografia"],
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
        tipo: "dictamen",
        nombre: "Dictamen sobre asignación prenatal",
        cuerpo: dictamenAsignacion({
          asignacion: "prenatal",
          documentacion: ["certificado médico con fecha probable de parto el {{fecha_probable_parto}}", "informe del Departamento de Medicina Laboral"],
          analisis: "respecto de la asignación prenatal, la agente acredita el embarazo y la fecha probable de parto mediante el certificado médico (fs. {{fs}}) y el informe del Departamento de Medicina Laboral (fs. {{fs}}).",
        }),
        instrucciones: `${INSTRUCCIONES_DICTAMEN} Expediente RESERVADO: no transcribas datos de salud; referí a "la documentación médica obrante". {{en_relacion_a}} queda vacío. ${ARTICULOS_A_CONFIRMAR}`,
      },
      {
        tipo: "resolucion",
        nombre: "Resolución de asignación prenatal",
        cuerpo: resolucionAlta({
          asignacion: "prenatal",
          acredita: ["certificado médico con fecha probable de parto el {{fecha_probable_parto}} e informe del Departamento de Medicina Laboral"],
        }),
        instrucciones: `${INSTRUCCIONES_ALTA} Expediente RESERVADO: no transcribas datos de salud; referí a "la documentación médica obrante". {{en_relacion_a}} queda vacío.`,
      },
    ],
  },
  // 017 — A validar con el área: si se pide negativa de ANSES o constancia laboral del/de la cónyuge, y qué va al legajo
  // ("no relevados"). El Formulario 14 pide indicar si el/la cónyuge tiene discapacidad.
  {
    codigo: "ASIG-CONYUGE",
    relevamiento: "017",
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
  // Notas médicas por enfermedad: el índice del relevamiento del 22/10 la lista como 018, pero la carpeta no vino.
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
