// Prueba manual de los controles con IA (cotejo de documentación y segunda lectura), con documentos sintéticos.
// No usa la base: arma el pedido como lo arma la app y llama a la IA configurada en .env.local.
//   npx tsx --env-file=.env.local --conditions=react-server scripts/probar-controles-ia.ts
import sharp from "sharp"
import { combinarRevision, EsquemaCotejo, EsquemaRevision, pendientesEnTexto } from "@/lib/controles-ia"
import { SISTEMA_COTEJO, SISTEMA_REVISION } from "@/lib/ia/controles"
import { generarJSON } from "@/lib/ia/proveedor"
import { entorno } from "@/lib/entorno"

// Certificado analítico ficticio (imagen): coincide con lo declarado.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="760">
<rect width="100%" height="100%" fill="#fbf8ef"/><rect x="30" y="30" width="1040" height="700" fill="none" stroke="#5a4a2a" stroke-width="4"/>
<g font-family="Georgia, serif" fill="#2b2112">
<text x="550" y="110" font-size="34" text-anchor="middle">COLEGIO NACIONAL BARTOLOMÉ MITRE</text>
<text x="550" y="160" font-size="26" text-anchor="middle">CERTIFICADO ANALÍTICO DE ESTUDIOS</text>
<text x="90" y="250" font-size="24">Se certifica que GÓMEZ, CARLA BEATRIZ, D.N.I. 30.123.456,</text>
<text x="90" y="295" font-size="24">ha aprobado la totalidad de las asignaturas del plan de estudios</text>
<text x="90" y="340" font-size="24">correspondiente al título de PERITO MERCANTIL.</text>
<text x="90" y="385" font-size="24">Fecha de egreso: 12 de diciembre de 2009.</text>
<text x="90" y="430" font-size="24">San Miguel de Tucumán, 3 de marzo de 2010.</text>
<text x="760" y="610" font-size="20">Firma y sello</text><text x="760" y="640" font-size="18">Rectora</text>
<circle cx="900" cy="560" r="55" fill="none" stroke="#7a2e2e" stroke-width="3"/>
</g></svg>`

// Constancia ficticia (PDF mínimo hecho a mano): el DNI no coincide, a propósito.
function pdfMinimo(lineas: string[]) {
  // Las líneas no llevan paréntesis ni barras invertidas, que en PDF hay que escapar.
  const texto = lineas.map((l, i) => `BT /F1 14 Tf 60 ${740 - i * 24} Td (${l}) Tj ET`).join("\n")
  const objetos = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(texto, "latin1")} >>\nstream\n${texto}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  ]
  let pdf = "%PDF-1.4\n"
  const offsets: number[] = []
  objetos.forEach((o, i) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"))
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`
  })
  const xref = Buffer.byteLength(pdf, "latin1")
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return Buffer.from(pdf, "latin1")
}

async function main() {
  console.log(`Proveedor: ${entorno.iaProveedor} · modelo: ${entorno.iaProveedor === "openrouter" ? entorno.iaModeloOpenRouter : entorno.iaModelo}\n`)
  const png = await sharp(Buffer.from(svg)).png().toBuffer()
  const pdf = pdfMinimo([
    "MUNICIPALIDAD DE SAN MIGUEL DE TUCUMAN",
    "Direccion de Espacios Verdes",
    "",
    "CONSTANCIA DE SERVICIOS",
    "Se deja constancia que la agente GOMEZ, Carla Beatriz,",
    "DNI 31.987.654, Legajo 48213, presta servicios en esta",
    "Direccion desde el 01/03/2015.",
    "San Miguel de Tucuman, 02/11/2026.",
  ])

  let t = Date.now()
  const cotejo = await generarJSON(EsquemaCotejo, "cotejo_documentacion", {
    sistema: SISTEMA_COTEJO,
    usuario: `<expediente numero="CH-2026-000003" tramite="Bonificación por título secundario" reservado="no">
<agente>Carla Beatriz Gómez; CUIL: 27-30123456-4; legajo: 48213; repartición: Dirección de Espacios Verdes</agente>
<asunto>Adicional por título secundario — Perito Mercantil</asunto>
<datos_formulario>
- Título: Perito Mercantil
- Institución: Colegio Nacional Bartolomé Mitre
- Año de egreso: 2009
</datos_formulario>
<documentos>
1. analitico.png — cargado como: Título o certificado analítico
2. constancia.pdf — cargado como: Constancia de servicios
</documentos>
</expediente>
Fecha de hoy: ${new Date().toLocaleDateString("es-AR")}.`,
    adjuntos: [
      { nombre: "analitico.png", mime: "image/png", base64: png.toString("base64") },
      { nombre: "constancia.pdf", mime: "application/pdf", base64: pdf.toString("base64") },
    ],
    maxTokens: 12000,
    esfuerzo: "medium",
  })
  console.log(`— Cotejo (${((Date.now() - t) / 1000).toFixed(1)} s, ${cotejo.entradaTokens} → ${cotejo.salidaTokens} tokens)`)
  console.log(JSON.stringify(cotejo.datos, null, 2))

  const proyecto = `RESOLUCIÓN N.º {{numero_resolucion}}
San Miguel de Tucumán, {{fecha_resolucion}}

VISTO: El Expediente N.º CH-2026-000003, por el cual la agente Carla Beatriz Gómez, Legajo N.º 48213, solicita el adicional por título secundario; y
CONSIDERANDO: Que a fs. 2 obra copia certificada del certificado analítico de Perito Mercantil expedido por el Colegio Nacional Bartolomé Mitre; Que a fs. 7 la Asesoría Legal dictaminó favorablemente; Que corresponde hacer lugar conforme el art. 54 del Decreto [COMPLETAR];
Por ello, LA DIRECTORA DE CAPITAL HUMANO RESUELVE:
ARTÍCULO 1º.- HACER LUGAR al pago del adicional por título secundario a la agente Carla Beatriz Gómez, Legajo N.º 48213, a partir de septiembre de 2026.
ARTÍCULO 3º.- Comuníquese a Liquidación de Haberes, notifíquese y archívese.`
  t = Date.now()
  const revision = await generarJSON(EsquemaRevision, "revision_proyecto", {
    sistema: SISTEMA_REVISION,
    usuario: `<expediente numero="CH-2026-000003" tipo="Bonificación por título secundario" reservado="no" iniciado="20/10/2026">
<agente>Carla Beatriz Gómez; legajo: 48213</agente>
<asunto>Adicional por título secundario — Perito Mercantil</asunto>
<datos_formulario>
- Título: Perito Mercantil
- Institución: Colegio Nacional Bartolomé Mitre
</datos_formulario>
<actuaciones>
<foja n="1" tipo="Presentación" fecha="20/10/2026">Solicitud del adicional por título secundario.</foja>
<foja n="2" tipo="Documento" fecha="20/10/2026">Certificado analítico.</foja>
<foja n="3" tipo="Pase" fecha="21/10/2026">Pase a Asesoría Legal.</foja>
<foja n="4" tipo="Dictamen" fecha="23/10/2026">Dictamen: corresponde hacer lugar al adicional a partir de agosto de 2026, mes siguiente a la presentación completa.</foja>
<foja n="5" tipo="Pase" fecha="23/10/2026">Pase a Área Bonificaciones.</foja>
</actuaciones>
</expediente>

<modelo>
VISTO … CONSIDERANDO … conforme el art. 54 del Decreto 1234/1995 … RESUELVE: ARTÍCULO 1º.- HACER LUGAR … ARTÍCULO 2º.- Liquidación … ARTÍCULO 3º.- Comuníquese.
</modelo>

<proyecto titulo="Resolución">
${proyecto}
</proyecto>`,
    maxTokens: 8000,
    esfuerzo: "medium",
  })
  console.log(`\n— Revisión (${((Date.now() - t) / 1000).toFixed(1)} s, ${revision.entradaTokens} → ${revision.salidaTokens} tokens)`)
  console.log(JSON.stringify(revision.datos && combinarRevision(revision.datos, pendientesEnTexto(proyecto)), null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
