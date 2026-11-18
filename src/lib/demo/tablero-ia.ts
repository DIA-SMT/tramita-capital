// Tablero de la vista previa: radiografía de los circuitos, observaciones y lo que respondería la IA, armado con los
// mismos números de la demo para que lo que dice la lectura coincida con lo que muestra el tablero. Sin IA.
import { CARGA, ETAPAS, impactoDemo, PARAMETRIZACION, POR_TIPO, RESUMEN, serieDemo, TIEMPOS_DEMO, TIPOS } from "@/lib/demo/datos"
import type { TiempoPaso } from "@/lib/pronostico"
import { armarRadiografia, duracionHoras, type ObservacionesTramite } from "@/lib/tablero-datos"
import type { AnalisisIA, Causa, Lectura } from "@/lib/tablero-ia"
import type { DemoTableroIA } from "@/app/(interno)/tablero/ia"

const nombre = (codigo: string) => TIPOS.find((t) => t.codigo === codigo)?.nombre ?? codigo
const pct = (a: number, b: number) => Math.round((a / b) * 100)
const num = (v: number, d = 1) => v.toLocaleString("es-AR", { maximumFractionDigits: d })

const historia = new Map<string, TiempoPaso[]>()
for (const t of TIEMPOS_DEMO) historia.set(t.tipo_tramite_id!, [...(historia.get(t.tipo_tramite_id!) ?? []), t])

export const RADIOGRAFIA_DEMO = armarRadiografia(
  TIPOS.filter((t) => !t.es_recurso),
  PARAMETRIZACION.pasos.map((p) => ({ tipo_tramite_id: p.tipo_tramite_id, orden: p.orden, nombre: p.nombre, area: p.area?.nombre ?? "", plazo_horas: p.plazo_horas })),
  historia,
)

const obs = (codigo: string, observaciones: number, expedientes: number, respuestaHoras: number | null): ObservacionesTramite => ({
  codigo,
  nombre: nombre(codigo),
  observaciones,
  expedientes,
  respuestaHoras,
})

/** Observaciones de los últimos días, sin los trámites reservados. */
export function observacionesDemo(dias: number): ObservacionesTramite[] {
  const k = dias / 30
  return [
    obs("BONIF-TIT-UNI", Math.round(6 * k), Math.round(5 * k), 30.5),
    obs("BONIF-TIT-SEC", Math.round(5 * k), Math.round(5 * k), 22),
    obs("ASIG-NACIMIENTO", Math.round(4 * k), Math.round(4 * k), 41.2),
    obs("ESC-INICIO", Math.round(4 * k), Math.round(3 * k), 18.6),
    obs("ASIG-HIJO", Math.round(2 * k), Math.round(2 * k), 52),
    obs("ASIG-MATRIMONIO", Math.round(2 * k), Math.round(2 * k), null),
  ].filter((o) => o.observaciones > 0)
}

function lecturaDemo(dias: number): Lectura {
  const top = RADIOGRAFIA_DEMO[0]
  const lento = top.pasos.find((p) => p.orden === top.lento)!
  const totalAsignados = CARGA.reduce((s, c) => s + c.asignados, 0)
  const mas = CARGA.reduce((a, b) => (b.asignados > a.asignados ? b : a))
  const examen = POR_TIPO.find((t) => t.codigo === "LIC-EXAMEN")!
  const serie = serieDemo(dias)
  const ingresados = serie.reduce((s, d) => s + d.ingresados, 0)
  const resueltos = serie.reduce((s, d) => s + d.resueltos, 0)
  const desvio = POR_TIPO.filter((t) => t.plazo && t.promedio && t.promedio > t.plazo).sort((a, b) => b.promedio! / b.plazo! - a.promedio! / a.plazo!)[0]
  const sinBase = POR_TIPO.filter((t) => t.lineaBase == null).length
  const hallazgos: Lectura["hallazgos"] = [
    {
      tipo: "cuello",
      titulo: `${lento.nombre}, el paso más lento del trámite más largo`,
      cifra: duracionHoras(lento.horas),
      detalle: `Es el ${pct(lento.horas, top.totalHoras)} % del recorrido de la ${top.nombre.toLowerCase()}, que en total tarda ${duracionHoras(top.totalHoras)} (mediana). En toda la Dirección, ${ETAPAS[0].area} es la oficina donde más tiempo pasan los expedientes: ${num(ETAPAS[0].horas_promedio / 24)} días en promedio.`,
      accion: `Revisar con ${lento.area} si ese paso puede salir con un modelo estandarizado o con un control previo en la oficina anterior.`,
    },
    {
      tipo: "logro",
      titulo: "La licencia por examen dejó de ser un problema",
      cifra: `${num(examen.promedio!)} días`,
      detalle: `Antes del sistema tardaba ${examen.lineaBase} días: ${pct(examen.lineaBase! - examen.promedio!, examen.lineaBase!)} % menos, medido sobre ${examen.resueltos} licencias resueltas.`,
      accion: "Mostrarlo en el informe de impacto: es el antes y después más claro que hay hoy.",
    },
    {
      tipo: "carga",
      titulo: "Una persona concentra un tercio de lo asignado",
      cifra: `${pct(mas.asignados, totalAsignados)} %`,
      detalle: `${mas.asignados} de los ${totalAsignados} expedientes asignados en curso están a cargo de una misma persona de ${mas.area}; la que menos tiene, ${Math.min(...CARGA.map((c) => c.asignados))}.`,
      accion: `Repartir los nuevos de ${mas.area} entre quienes tienen menos asignados antes de que se acumulen.`,
    },
    {
      tipo: "riesgo",
      titulo: `${RESUMEN.vencidos} expedientes vencidos y ${RESUMEN.urgentes} con prioridad alta`,
      cifra: String(RESUMEN.vencidos),
      detalle: "Son pocos frente a los que están en curso, pero vencidos ya pasaron el plazo objetivo. La bandeja marca además «En riesgo» los que vencerían al ritmo habitual de cada paso.",
      accion: "Revisar hoy los vencidos y el filtro «En riesgo» de la bandeja.",
    },
    {
      tipo: "tendencia",
      titulo: resueltos >= ingresados ? "Se resuelve más de lo que entra" : "Entra más de lo que se resuelve",
      cifra: `${resueltos} de ${ingresados}`,
      detalle: `En los últimos ${dias} días se resolvieron ${resueltos} trámites y entraron ${ingresados}.`,
      accion: resueltos >= ingresados ? "Sostener el ritmo y sumar el próximo trámite al sistema." : "Mirar qué paso acumula expedientes en la radiografía de los circuitos.",
    },
  ]
  if (desvio) {
    hallazgos.splice(3, 0, {
      tipo: "desvio",
      titulo: `${desvio.nombre}, por encima del objetivo`,
      cifra: `${num(desvio.promedio!)} días`,
      detalle: `El objetivo es ${desvio.plazo} días; sobre ${desvio.resueltos} resueltos, el promedio lo supera en ${num(desvio.promedio! - desvio.plazo!)} días.`,
      accion: "Ver en la radiografía qué paso lo demora y si el objetivo es realista para este trámite.",
    })
  }
  return {
    titular: `La licencia por examen sale en ${num(examen.promedio!)} días contra ${examen.lineaBase} en papel; el próximo salto está en ${lento.area}.`,
    hallazgos: hallazgos.slice(0, 6),
    limites: [
      `${sinBase} de los ${POR_TIPO.length} trámites medidos todavía no tienen cargada la demora en papel: el antes y después se compara solo donde la hay.`,
      "Los pasos con menos de 3 casos se calculan con su plazo, no con datos reales.",
    ],
  }
}

function respuestasDemo(dias: number): DemoTableroIA["respuestas"] {
  const top = RADIOGRAFIA_DEMO[0]
  const lento = top.pasos.find((p) => p.orden === top.lento)!
  const totalAsignados = CARGA.reduce((s, c) => s + c.asignados, 0)
  const mas = CARGA.reduce((a, b) => (b.asignados > a.asignados ? b : a))
  const examen = POR_TIPO.find((t) => t.codigo === "LIC-EXAMEN")!
  const impacto = impactoDemo(dias)
  return [
    {
      pregunta: "¿Dónde se traban más los trámites?",
      respuesta: {
        respuesta: `En ${ETAPAS[0].area}: es la oficina donde más tiempo pasan los expedientes, ${num(ETAPAS[0].horas_promedio / 24)} días en promedio y hasta ${num(ETAPAS[0].horas_maximo / 24)} en el peor caso. Paso por paso, el trámite más largo es la ${top.nombre.toLowerCase()} (${duracionHoras(top.totalHoras)}), y lo frena ${lento.nombre.toLowerCase()}: ${pct(lento.horas, top.totalHoras)} % del recorrido.`,
        cifras: [
          { etiqueta: ETAPAS[0].area, valor: `${num(ETAPAS[0].horas_promedio / 24)} días` },
          { etiqueta: `${lento.nombre} (${top.nombre})`, valor: duracionHoras(lento.horas) },
          { etiqueta: "Parte del recorrido", valor: `${pct(lento.horas, top.totalHoras)} %` },
        ],
        sin_datos: "",
      },
    },
    {
      pregunta: "¿Está pareja la carga del equipo?",
      respuesta: {
        respuesta: `No del todo. De ${totalAsignados} expedientes asignados en curso, ${mas.asignados} (${pct(mas.asignados, totalAsignados)} %) están a cargo de una misma persona de ${mas.area}, y la que menos tiene lleva ${Math.min(...CARGA.map((c) => c.asignados))}. Las fojas firmadas en 30 días muestran que el trabajo sí se mueve en todas las áreas: conviene repartir los nuevos antes de que se acumulen.`,
        cifras: [
          { etiqueta: "Asignados en curso", valor: String(totalAsignados) },
          { etiqueta: "La persona con más", valor: `${mas.asignados} (${pct(mas.asignados, totalAsignados)} %)` },
        ],
        sin_datos: "El tablero no mide la complejidad de cada expediente: un reparto parejo en cantidad puede no serlo en trabajo.",
      },
    },
    {
      pregunta: "¿Cuánto mejoramos frente al papel?",
      respuesta: {
        respuesta: `En la licencia por examen, de ${examen.lineaBase} días a ${num(examen.promedio!)}: ${pct(examen.lineaBase! - examen.promedio!, examen.lineaBase!)} % menos, sobre ${examen.resueltos} licencias. Además se evitaron ${impacto.hojas_anio.toLocaleString("es-AR")} hojas en 12 meses (${pct(impacto.hojas_anio, 8000)} % de las 8.000 que consumía la hoja de ruta) y ${impacto.consultas_migue} consultas se resolvieron con Migue sin ir a la ventanilla.`,
        cifras: [
          { etiqueta: "Licencia por examen", valor: `${examen.lineaBase} → ${num(examen.promedio!)} días` },
          { etiqueta: "Hojas evitadas", valor: impacto.hojas_anio.toLocaleString("es-AR") },
          { etiqueta: "Consultas a Migue", valor: String(impacto.consultas_migue) },
        ],
        sin_datos: "Para el resto de los trámites falta que Capital Humano cargue cuánto tardaban en papel.",
      },
    },
    {
      pregunta: "¿Qué tendría que mirar esta semana?",
      respuesta: {
        respuesta: `Tres cosas: los ${RESUMEN.vencidos} expedientes vencidos y los marcados «En riesgo» en la bandeja; ${lento.nombre.toLowerCase()} de la ${top.nombre.toLowerCase()}, que es el paso que más frena; y las ${impacto.novedades_pendientes} novedades de haberes que esperan la carga en Civitas.`,
        cifras: [
          { etiqueta: "Vencidos", valor: String(RESUMEN.vencidos) },
          { etiqueta: "Prioridad alta o urgente", valor: String(RESUMEN.urgentes) },
          { etiqueta: "Novedades sin cargar", valor: String(impacto.novedades_pendientes) },
        ],
        sin_datos: "",
      },
    },
  ]
}

function observacionesIADemo(dias: number): AnalisisIA | null {
  const total = observacionesDemo(dias).reduce((s, o) => s + o.observaciones, 0)
  if (total < 3) return null
  const parte = (n: number) => Math.max(1, Math.round((n * total) / 23))
  const causas: Causa[] = [
    {
      causa: "Copia del título sin legalizar",
      cantidad: parte(8),
      tramites: [nombre("BONIF-TIT-UNI"), nombre("BONIF-TIT-SEC")],
      donde: "requisitos",
      mejora: "Aclarar en el requisito que la copia del título va legalizada por el Ministerio de Educación, con una imagen de ejemplo.",
    },
    {
      causa: "Partida de nacimiento borrosa o incompleta",
      cantidad: parte(6),
      tramites: [nombre("ASIG-NACIMIENTO"), nombre("ASIG-HIJO")],
      donde: "formulario",
      mejora: "Pedir la partida digital del Registro Civil y avisar al cargar si la foto no se lee.",
    },
    {
      causa: "Certificado de alumno regular de otro ciclo lectivo",
      cantidad: parte(5),
      tramites: [nombre("ESC-INICIO")],
      donde: "instrucciones",
      mejora: "Indicar en las instrucciones que el certificado tiene que ser del ciclo lectivo en curso.",
    },
    {
      causa: "Datos del acta que no coinciden con lo declarado",
      cantidad: parte(3),
      tramites: [nombre("ASIG-MATRIMONIO")],
      donde: "formulario",
      mejora: "Pedir que el agente copie los datos tal como figuran en el acta y mostrarle dónde están.",
    },
  ]
  const contadas = causas.reduce((s, c) => s + c.cantidad, 0)
  if (total > contadas) causas.push({ causa: "Otras", cantidad: total - contadas, tramites: [nombre("BONIF-TIT-UNI")], donde: "otro", mejora: "Casos aislados: no piden un cambio general." })
  return {
    tipo: "observaciones",
    dias,
    analisis: {
      resumen: "Más de un tercio de las observaciones son por la legalización del título: con una aclaración en el requisito, la mayoría de esos trámites entraría completo.",
      total,
      causas,
    },
    at: new Date().toISOString(),
    por: null,
  }
}

export function tableroIADemo(dias: number): DemoTableroIA {
  return {
    lectura: { tipo: "lectura", dias, lectura: lecturaDemo(dias), at: new Date().toISOString(), por: null },
    observaciones: observacionesIADemo(dias),
    respuestas: respuestasDemo(dias),
    otra: {
      respuesta: "En la vista previa respondo las preguntas de ejemplo. Con la IA real, respondo cualquier pregunta sobre estos indicadores: tiempos, pasos, carga, papel o Civitas.",
      cifras: [],
      sin_datos: "",
    },
  }
}
