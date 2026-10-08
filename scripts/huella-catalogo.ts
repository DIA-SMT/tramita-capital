// Huella de los modelos del catálogo, para comparar con la base:
// select md5(string_agg(t.codigo||'|'||p.tipo_documento||'|'||p.nombre||'|'||p.cuerpo||'|'||coalesce(p.instrucciones_ia,''), '#' order by t.codigo, p.tipo_documento))
// from plantillas p join tipos_tramite t on t.id = p.tipo_tramite_id;
import { createHash } from "node:crypto"
import { CATALOGO_SEMILLA } from "../src/lib/semilla/catalogo"

const filas = CATALOGO_SEMILLA.flatMap((t) => t.plantillas.map((p) => ({ codigo: t.codigo, ...p })))
  .sort((a, b) => (a.codigo < b.codigo ? -1 : a.codigo > b.codigo ? 1 : a.tipo < b.tipo ? -1 : 1))
  .map((p) => [p.codigo, p.tipo, p.nombre, p.cuerpo, p.instrucciones].join("|"))
console.log(createHash("md5").update(filas.join("#"), "utf8").digest("hex"), filas.length)
