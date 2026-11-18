// Prueba manual de la IA del tablero (lectura, pregunta y causas de las observaciones) con los datos de la vista previa.
// No usa la base: arma el texto como lo arma la app y llama a la IA configurada en .env.local.
//   npx tsx --env-file=.env.local --conditions=react-server scripts/probar-tablero-ia.ts
import { CARGA, ETAPAS, impactoDemo, POR_TIPO, RESUMEN, serieDemo } from "@/lib/demo/datos"
import { observacionesDemo, RADIOGRAFIA_DEMO } from "@/lib/demo/tablero-ia"
import { entorno } from "@/lib/entorno"
import { escaparDatos } from "@/lib/ia/cliente"
import { generarJSON } from "@/lib/ia/proveedor"
import { SISTEMA_LECTURA, SISTEMA_OBSERVACIONES, SISTEMA_PREGUNTA } from "@/lib/ia/tablero"
import { textoTablero, type DatosTablero } from "@/lib/tablero-datos"
import { contarCausas, EsquemaCausas, EsquemaLectura, EsquemaRespuestaTablero } from "@/lib/tablero-ia"

const datos: DatosTablero = {
  dias: 30,
  resumen: RESUMEN,
  impacto: impactoDemo(30),
  porTipo: POR_TIPO,
  carga: CARGA,
  serie: serieDemo(30),
  etapas: ETAPAS,
  circuitos: [],
  radiografia: RADIOGRAFIA_DEMO,
  observaciones: observacionesDemo(30),
}

// Observaciones inventadas, como las escribiría el área.
const OBSERVACIONES: [string, string][] = [
  ["Adicional por título universitario", "La copia del título no está legalizada por el Ministerio de Educación. Adjunte copia legalizada."],
  ["Adicional por título universitario", "Falta la legalización del título. Sin eso no se puede dar curso."],
  ["Adicional por título secundario", "El analítico es copia simple: debe estar legalizado."],
  ["Adicional por título universitario", "El título adjunto está incompleto, falta el reverso con la legalización."],
  ["Asignación familiar por nacimiento (pago único)", "La partida de nacimiento no se lee: la foto está borrosa. Suba un PDF o una foto nítida."],
  ["Asignación familiar por nacimiento (pago único)", "Adjuntó el certificado de nacido vivo y no la partida de nacimiento del Registro Civil."],
  ["Asignación familiar por hijo/a", "No se ve el número de DNI del menor en la partida."],
  ["Certificado de inicio de clases", "El certificado de alumno regular es del año 2025: debe ser del ciclo lectivo 2026."],
  ["Certificado de inicio de clases", "El certificado no tiene firma ni sello de la escuela."],
  ["Certificado de inicio de clases", "Corresponde al ciclo lectivo anterior. Presente el de este año."],
  ["Asignación familiar por matrimonio", "La fecha de matrimonio declarada no coincide con la del acta."],
  ["Adicional por título secundario", "Falta la legalización del título secundario."],
]

async function main() {
  console.log(`Proveedor: ${entorno.iaProveedor} · modelo: ${entorno.iaProveedor === "openrouter" ? entorno.iaModeloOpenRouter : entorno.iaModelo}\n`)
  const texto = textoTablero(datos)
  console.log(`Texto del tablero: ${texto.length} caracteres\n`)

  let t = Date.now()
  const lectura = await generarJSON(EsquemaLectura, "lectura_tablero", { sistema: SISTEMA_LECTURA, usuario: texto, maxTokens: 6000, esfuerzo: "medium" })
  console.log(`— Lectura (${((Date.now() - t) / 1000).toFixed(1)} s, ${lectura.entradaTokens} → ${lectura.salidaTokens} tokens)`)
  console.log(JSON.stringify(lectura.datos, null, 2))

  t = Date.now()
  const pregunta = "¿Qué trámite conviene mirar primero y por qué?"
  const respuesta = await generarJSON(EsquemaRespuestaTablero, "respuesta_tablero", {
    sistema: SISTEMA_PREGUNTA,
    usuario: `${texto}\n\n<pregunta>${escaparDatos(pregunta)}</pregunta>`,
    maxTokens: 3000,
    esfuerzo: "medium",
  })
  console.log(`\n— Pregunta: ${pregunta} (${((Date.now() - t) / 1000).toFixed(1)} s, ${respuesta.entradaTokens} → ${respuesta.salidaTokens} tokens)`)
  console.log(JSON.stringify(respuesta.datos, null, 2))

  t = Date.now()
  const lista = OBSERVACIONES.map(([tramite, texto], i) => ({ id: i + 1, tramite, texto }))
  const causas = await generarJSON(EsquemaCausas, "causas_observaciones", {
    sistema: SISTEMA_OBSERVACIONES,
    usuario: `<observaciones periodo_dias="30" total="${lista.length}">\n${lista
      .map((o) => `<observacion id="${o.id}" tramite="${escaparDatos(o.tramite)}">${escaparDatos(o.texto)}</observacion>`)
      .join("\n")}\n</observaciones>`,
    maxTokens: 6000,
    esfuerzo: "medium",
  })
  console.log(`\n— Causas (${((Date.now() - t) / 1000).toFixed(1)} s, ${causas.entradaTokens} → ${causas.salidaTokens} tokens)`)
  console.log(JSON.stringify(causas.datos && contarCausas(causas.datos, lista), null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
