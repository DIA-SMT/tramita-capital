// Huella de los modelos del catálogo, para comparar con la base. En el SQL Editor:
// select md5(string_agg(t.codigo||'|'||p.tipo_documento||'|'||p.nombre||'|'||p.cuerpo||'|'||coalesce(p.instrucciones_ia,''), '#' order by t.codigo, p.tipo_documento))
// from plantillas p join tipos_tramite t on t.id = p.tipo_tramite_id;
import { huellaCatalogo } from "./lib/huella"

const { md5, modelos } = huellaCatalogo()
console.log(md5, modelos)
