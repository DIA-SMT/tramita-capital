import { Award, FileText, GraduationCap, HeartHandshake, Stethoscope, Users, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const ICONOS: Record<string, LucideIcon> = {
  "graduation-cap": GraduationCap,
  award: Award,
  users: Users,
  "heart-handshake": HeartHandshake,
  stethoscope: Stethoscope,
}

export function IconoTramite({ icono, className }: { icono: string | null; className?: string }) {
  const Icono = (icono && ICONOS[icono]) || FileText
  return <Icono className={cn("size-5", className)} />
}
