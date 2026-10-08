"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, FileText, Inbox, PenLine, Settings2, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type Item = { href: string; etiqueta: string; icono: LucideIcon; coincide?: string[]; contador?: number }

export function Navegacion({ alNavegar, pendientes, base = "" }: { alNavegar?: () => void; pendientes?: number; base?: string }) {
  const ruta = usePathname()
  const items: Item[] = [
    { href: `${base}/bandeja`, etiqueta: "Bandeja", icono: Inbox, coincide: [`${base}/bandeja`, `${base}/expedientes`], contador: pendientes },
    { href: `${base}/tablero`, etiqueta: "Tablero de impacto", icono: BarChart3 },
    { href: `${base}/parametrizacion`, etiqueta: "Trámites y circuitos", icono: Settings2 },
    { href: `${base}/mi-firma`, etiqueta: "Mi firma", icono: PenLine },
  ]
  const activo = (i: Item) => (i.coincide ?? [i.href]).some((r) => ruta.startsWith(r))

  return (
    <nav className="grid gap-1" aria-label="Principal">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          onClick={alNavegar}
          aria-current={activo(i) ? "page" : undefined}
          className={cn(
            "group relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            activo(i) && "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)]",
          )}
        >
          {activo(i) && <span aria-hidden className="absolute top-2 bottom-2 -left-1 w-1 rounded-full bg-marca-3" />}
          <i.icono className={cn("size-4", activo(i) && "text-sidebar-primary")} />
          <span className="flex-1">{i.etiqueta}</span>
          {!!i.contador && (
            <span className="rounded-full bg-marca-3 px-2 text-xs font-semibold text-[#061a44] tabular">{i.contador}</span>
          )}
        </Link>
      ))}
      <div className="my-2 h-px bg-sidebar-border" />
      <Link
        href={`${base}/mis-tramites`}
        onClick={alNavegar}
        className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        <FileText className="size-4" />
        Mis trámites propios
      </Link>
    </nav>
  )
}
