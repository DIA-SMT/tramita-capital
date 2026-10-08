import ReactMarkdown from "react-markdown"
import remarkBreaks from "remark-breaks"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"

// Número y fecha de resolución: los completa el sistema al firmar (protocolización automática).
const conMarcadores = (texto: string) =>
  texto.replaceAll("{{numero_resolucion}}", "[número al firmar]").replaceAll("{{fecha_resolucion}}", "[fecha al firmar]")

/**
 * Renderiza Markdown sin HTML crudo (react-markdown no ejecuta HTML por defecto).
 * Respeta los saltos de línea simples, que en los actos administrativos importan.
 * `oficial` usa tipografía con serifa para dictámenes y resoluciones.
 */
export function Markdown({ children, className, oficial = false }: { children: string | null | undefined; className?: string; oficial?: boolean }) {
  if (!children) return null
  return (
    <div className={cn("documento", oficial && "documento-oficial", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{conMarcadores(children)}</ReactMarkdown>
    </div>
  )
}
