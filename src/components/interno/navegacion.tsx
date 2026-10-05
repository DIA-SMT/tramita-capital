"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, FileText, Inbox, Settings2, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type Item = { href: string; etiqueta: string; icono: LucideIcon; coincide?: string[] }

const ITEMS: Item[] = [
  { href: "/bandeja", etiqueta: "Bandeja", icono: Inbox, coincide: ["/bandeja", "/expedientes"] },
  { href: "/tablero", etiqueta: "Tablero de impacto", icono: BarChart3 },
  { href: "/parametrizacion", etiqueta: "Trámites y circuitos", icono: Settings2 },
]

export function Navegacion({ alNavegar }: { alNavegar?: () => void }) {
  const ruta = usePathname()
  const activo = (i: Item) => (i.coincide ?? [i.href]).some((r) => ruta.startsWith(r))

  return (
    <nav className="grid gap-1">
      {ITEMS.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          onClick={alNavegar}
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            activo(i) && "bg-sidebar-accent text-sidebar-accent-foreground",
          )}
        >
          <i.icono className={cn("size-4", activo(i) && "text-sidebar-primary")} />
          {i.etiqueta}
        </Link>
      ))}
      <div className="my-2 h-px bg-sidebar-border" />
      <Link
        href="/mis-tramites"
        onClick={alNavegar}
        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        <FileText className="size-4" />
        Mis trámites personales
      </Link>
    </nav>
  )
}
