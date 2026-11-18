import {
  Award,
  Baby,
  Backpack,
  BookOpen,
  BriefcaseBusiness,
  FileText,
  GraduationCap,
  HandHeart,
  HardHat,
  Heart,
  HeartHandshake,
  HeartPulse,
  MapPin,
  Milk,
  Scale,
  School,
  Stethoscope,
  UserMinus,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

const ICONOS: Record<string, LucideIcon> = {
  "graduation-cap": GraduationCap,
  award: Award,
  users: Users,
  "heart-handshake": HeartHandshake,
  stethoscope: Stethoscope,
  school: School,
  "book-open": BookOpen,
  "user-minus": UserMinus,
  heart: Heart,
  baby: Baby,
  "heart-pulse": HeartPulse,
  backpack: Backpack,
  "hard-hat": HardHat,
  "hand-heart": HandHeart,
  milk: Milk,
  "users-round": UsersRound,
  "map-pin": MapPin,
  scale: Scale,
  "briefcase-business": BriefcaseBusiness,
}

export function IconoTramite({ icono, className }: { icono: string | null; className?: string }) {
  const Icono = (icono && ICONOS[icono]) || FileText
  return <Icono className={cn("size-5", className)} />
}
