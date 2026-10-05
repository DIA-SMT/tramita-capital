import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"

/** Renderiza Markdown sin HTML crudo (react-markdown no ejecuta HTML por defecto). */
export function Markdown({ children, className }: { children: string | null | undefined; className?: string }) {
  if (!children) return null
  return (
    <div className={cn("documento", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  )
}
