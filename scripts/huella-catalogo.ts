// Huella de los modelos del catálogo, para comparar con la base:
// select md5(string_agg(t.codigo||'|'||p.tipo_documento||'|'||p.nombre||'|'||p.cuerpo||'|'||coalesce(p.instrucciones_ia,''), '#' order by t.codigo, p.tipo_documento))
// from plantillas p join tipos_tramite t on t.id = p.tipo_tramite_id;
import { createHash } from "node:crypto"
import type { Enum } from "../src/lib/database.types"
import { CATALOGO_SEMILLA } from "../src/lib/semilla/catalogo"

// Postgres ordena un enum por el orden en que se declaró (migración 000100), no alfabéticamente:
// informe va antes que dictamen.
const ORDEN_TIPO: Enum<"tipo_actuacion">[] = [
  "presentacion",
  "documento",
  "providencia",
  "informe",
  "dictamen",
  "resolucion",
  "notificacion",
  "observacion",
  "subsanacion",
  "pase",
  "nota",
]

const filas = CATALOGO_SEMILLA.flatMap((t) => t.plantillas.map((p) => ({ codigo: t.codigo, ...p })))
  .sort((a, b) => (a.codigo < b.codigo ? -1 : a.codigo > b.codigo ? 1 : ORDEN_TIPO.indexOf(a.tipo) - ORDEN_TIPO.indexOf(b.tipo)))
  .map((p) => [p.codigo, p.tipo, p.nombre, p.cuerpo, p.instrucciones].join("|"))
console.log(createHash("md5").update(filas.join("#"), "utf8").digest("hex"), filas.length)
