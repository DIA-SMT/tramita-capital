import ReactMarkdown from "react-markdown"
import remarkBreaks from "remark-breaks"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"

// Número y fecha de resolución: los completa el sistema al firmar (protocolización automática).
const conMarcadores = (texto: string) =>
  texto.replaceAll("{{numero_resolucion}}", "[número al firmar]").replaceAll("{{fecha_resolucion}}", "[fecha al firmar]")

/** Datos que la IA no pudo completar: [COMPLETAR: qué falta]. */
export const MARCADOR_COMPLETAR = /\[COMPLETAR[^\]]*\]/g
const ENLACE_MARCADOR = "#completar-"

/** Cada [COMPLETAR …] pasa a ser un enlace interno numerado, que se dibuja como un aviso resaltado. */
const conDatosPendientes = (texto: string) => {
  let n = 0
  return texto.replace(MARCADOR_COMPLETAR, (m) => {
    const que = m.replace(/^\[COMPLETAR:?\s*/, "").replace(/\]$/, "").replace(/[[\]]/g, "") || "dato faltante"
    return `[${que}](${ENLACE_MARCADOR}${n++})`
  })
}

/**
 * Renderiza Markdown sin HTML crudo (react-markdown no ejecuta HTML por defecto).
 * Respeta los saltos de línea simples, que en los actos administrativos importan.
 * `oficial` usa tipografía con serifa para dictámenes y resoluciones.
 * Con `alDatoPendiente`, los [COMPLETAR …] se resaltan y al tocarlos se avisa cuál (0, 1, 2…).
 */
export function Markdown({
  children,
  className,
  oficial = false,
  alDatoPendiente,
}: {
  children: string | null | undefined
  className?: string
  oficial?: boolean
  alDatoPendiente?: (numero: number) => void
}) {
  if (!children) return null
  const texto = conMarcadores(children)
  return (
    <div className={cn("documento", oficial && "documento-oficial", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={
          alDatoPendiente
            ? {
                a: ({ href, children: contenido, ...resto }) =>
                  href?.startsWith(ENLACE_MARCADOR) ? (
                    <button
                      type="button"
                      onClick={() => alDatoPendiente(Number(href.slice(ENLACE_MARCADOR.length)))}
                      title="Completar este dato en el texto"
                      className="mx-0.5 inline rounded-md bg-amber-300 px-1.5 py-0.5 font-sans text-[0.82em] font-semibold text-amber-950 ring-2 ring-amber-500/60 hover:bg-amber-200 focus-visible:ring-amber-600 focus-visible:outline-none"
                    >
                      ⚠ Completar: {contenido}
                    </button>
                  ) : (
                    <a href={href} {...resto}>
                      {contenido}
                    </a>
                  ),
              }
            : undefined
        }
      >
        {alDatoPendiente ? conDatosPendientes(texto) : texto}
      </ReactMarkdown>
    </div>
  )
}
