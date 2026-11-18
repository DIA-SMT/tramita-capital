import { pendientesEnTexto, type ControlGuardado, type Cotejo, type Revision } from "@/lib/controles-ia"
import { leerDatos, leerFormulario, leerRequisitos } from "@/lib/dominio"
import type { ExpedienteCompleto } from "@/lib/expedientes"

/**
 * Resultados de ejemplo de los controles con IA para la vista previa (sin IA). Dos expedientes tienen el suyo, escrito
 * a mano para que se vea un hallazgo real; el resto recibe uno armado con sus propios datos.
 */
export function controlDemo(d: ExpedienteCompleto, tipo: ControlGuardado["tipo"]): ControlGuardado | null {
  if (tipo === "cotejo") {
    if (d.documentos.length === 0) return null
    return { tipo, cotejo: COTEJOS[d.expediente.id] ?? cotejoGenerico(d), base: [] }
  }
  const proyecto = d.borradores.findLast((b) => b.tipo === "resolucion")
  if (!proyecto) return null
  return { tipo, revision: REVISIONES[d.expediente.id] ?? revisionGenerica(proyecto.contenido ?? ""), base: [] }
}

const COTEJOS: Record<string, Cotejo> = {
  "demo-titulo": {
    semaforo: "amarillo",
    conclusion: "El analítico corresponde y sus datos coinciden con lo declarado. Es una copia simple: falta ver la legalización.",
    documentos: [
      {
        documento: "analitico.pdf",
        requisito: "Certificado analítico",
        tipo_detectado: "Certificado analítico de estudios secundarios",
        corresponde: "si",
        legible: true,
        cotejos: [
          { dato: "Nombre y apellido", declarado: "Jorge Ruiz", en_documento: "RUIZ, Jorge Alberto", resultado: "coincide" },
          {
            dato: "Título",
            declarado: "Bachiller con orientación en Economía y Administración",
            en_documento: "Bachiller con Orientación en Economía y Administración",
            resultado: "coincide",
          },
          { dato: "Establecimiento", declarado: "Escuela de Comercio N.º 2", en_documento: "Escuela de Comercio N.º 2 «Prof. Luis F. Nougués»", resultado: "coincide" },
          { dato: "Fecha de egreso", declarado: "13/12/2019", en_documento: "13 de diciembre de 2019", resultado: "coincide" },
        ],
        alertas: ["Es una copia simple: no se ve la legalización del Ministerio de Educación. Si el área la exige, pedila antes de pasar."],
      },
    ],
  },
}

const REVISIONES: Record<string, Revision> = {
  "demo-firma": {
    veredicto: "revisar",
    resumen: "Está en condiciones de firmarse; solo conviene precisar la cita de fs. 3.",
    chequeos: [
      { aspecto: "Agente", resultado: "ok", detalle: "Carla Gómez, afiliada N.º 09455, y su repartición coinciden en el visto y en el artículo 1º." },
      { aspecto: "Lo pedido y lo resuelto", resultado: "ok", detalle: "El artículo 1º otorga el adicional por título secundario de Perito Mercantil, que es lo que se pidió a fs. 1." },
      { aspecto: "Coherencia con el dictamen", resultado: "ok", detalle: "Hace lugar como aconseja el dictamen de fs. 4, con el mismo porcentaje (17,5 %)." },
      { aspecto: "Fechas y período", resultado: "ok", detalle: "La vigencia, a partir de septiembre de 2026, es la que aconseja el dictamen." },
      {
        aspecto: "Fojas citadas",
        resultado: "atencion",
        detalle: "Atribuye a fs. 3 la constancia de verificación del título; fs. 3 es el pase a Asesoría Legal, que la incluye en su providencia. Conviene citarla como «providencia de fs. 3».",
      },
      { aspecto: "Normativa", resultado: "ok", detalle: "Los Decretos 82/77, 23/81, 1320/01 y 143/79 y la Ordenanza 3537/04 son los del modelo del área." },
      { aspecto: "Datos sin completar", resultado: "ok", detalle: "Solo quedan el número y la fecha de la resolución, que se completan al firmar." },
      { aspecto: "Redacción", resultado: "ok", detalle: "Artículos numerados del 1º al 3º; visto, considerando y parte resolutiva en orden." },
    ],
  },
}

function cotejoGenerico(d: ExpedienteCompleto): Cotejo {
  const requisitos = new Map(leerRequisitos(d.tipo.requisitos).map((r) => [r.clave, r.nombre]))
  const datos = leerDatos(d.expediente.datos)
  const campos = leerFormulario(d.tipo.formulario)
    .filter((c) => datos[c.clave] && !c.clave.endsWith("_geo") && !c.clave.endsWith("_lista") && c.tipo !== "recorrido")
    .slice(0, 2)
  const agente = d.nombres[d.expediente.iniciador_id] ?? "El agente"
  return {
    semaforo: "verde",
    conclusion: "Los documentos corresponden a lo que se pide y sus datos coinciden con lo declarado.",
    documentos: d.documentos.map((doc) => {
      const requisito = doc.requisito_clave ? (requisitos.get(doc.requisito_clave) ?? doc.requisito_clave) : "Adjunto"
      return {
        documento: doc.nombre_archivo,
        requisito,
        tipo_detectado: requisito,
        corresponde: "si" as const,
        legible: true,
        cotejos: [
          { dato: "Nombre y apellido", declarado: agente, en_documento: agente.toUpperCase(), resultado: "coincide" as const },
          ...campos.map((c) => ({ dato: c.etiqueta, declarado: datos[c.clave], en_documento: datos[c.clave], resultado: "coincide" as const })),
        ],
        alertas: [],
      }
    }),
  }
}

function revisionGenerica(contenido: string): Revision {
  const pendientes = pendientesEnTexto(contenido)
  const chequeos: Revision["chequeos"] = [
    { aspecto: "Agente", resultado: "ok", detalle: "Nombre, legajo y repartición coinciden con el expediente." },
    { aspecto: "Lo pedido y lo resuelto", resultado: "ok", detalle: "La parte resolutiva resuelve lo que se pidió en la presentación." },
    { aspecto: "Coherencia con el dictamen", resultado: "ok", detalle: "El sentido y los fundamentos siguen al dictamen." },
    { aspecto: "Fechas y período", resultado: "ok", detalle: "Las fechas y la vigencia son coherentes con el expediente." },
    { aspecto: "Fojas citadas", resultado: "ok", detalle: "Cada foja citada existe y dice lo que el proyecto le atribuye." },
    { aspecto: "Normativa", resultado: "ok", detalle: "Las normas citadas son las del modelo del área." },
    pendientes.length
      ? { aspecto: "Datos sin completar", resultado: "error", detalle: `Quedan sin completar: ${pendientes.join(", ")}.` }
      : { aspecto: "Datos sin completar", resultado: "ok", detalle: "Solo quedan el número y la fecha de la resolución, que se completan al firmar." },
    { aspecto: "Redacción", resultado: "ok", detalle: "Artículos numerados en orden y forma del acto administrativo correcta." },
  ]
  return pendientes.length
    ? { veredicto: "corregir", resumen: "Hay datos sin completar: corregilos antes de firmar.", chequeos }
    : { veredicto: "lista", resumen: "No se encontraron observaciones: coincide con el expediente, el dictamen y el modelo.", chequeos }
}
