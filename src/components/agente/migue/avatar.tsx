import Image from "next/image"
import { cn } from "@/lib/utils"

const TAMANOS = { xs: "size-8", sm: "size-10", md: "size-12", lg: "size-24" } as const

/** Retrato de Migue recortado en círculo, con el mismo encuadre que en EstudIA. */
export function AvatarMigue({ tamano = "sm", className }: { tamano?: keyof typeof TAMANOS; className?: string }) {
  return (
    <span aria-hidden className={cn("relative inline-flex shrink-0 overflow-hidden rounded-full border-2 border-primary/25 bg-white shadow-sm", TAMANOS[tamano], className)}>
      <Image src="/migue.jpeg" alt="" fill sizes="96px" draggable={false} className="origin-[50%_26%] scale-[1.85] object-cover" />
    </span>
  )
}
