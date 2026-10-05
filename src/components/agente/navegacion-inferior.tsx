"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { FileText, Inbox, Plus, UserRound } from "lucide-react"
import { cn } from "@/lib/utils"

/** Barra inferior para celulares: las acciones del agente a un toque. */
export function NavegacionInferior({ base = "", esInterno }: { base?: string; esInterno: boolean }) {
  const ruta = usePathname()
  const items = [
    { href: `${base}/mis-tramites`, etiqueta: "Mis trámites", icono: FileText, exacto: true },
    { href: `${base}/mis-tramites/nuevo`, etiqueta: "Nuevo", icono: Plus, destacado: true },
    esInterno
      ? { href: `${base}/bandeja`, etiqueta: "Bandeja", icono: Inbox }
      : { href: `${base}/perfil`, etiqueta: "Perfil", icono: UserRound },
  ]
  const activo = (href: string, exacto?: boolean) =>
    exacto ? ruta === href || (ruta.startsWith(`${href}/`) && !ruta.startsWith(`${href}/nuevo`)) : ruta.startsWith(href)

  return (
    <nav
      aria-label="Navegación"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden print:hidden"
    >
      <ul className="grid grid-cols-3">
        {items.map((i) => (
          <li key={i.href}>
            <Link
              href={i.href}
              aria-current={activo(i.href, i.exacto) ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 text-[0.7rem] font-medium text-muted-foreground transition-colors",
                activo(i.href, i.exacto) && "text-primary",
              )}
            >
              <span
                className={cn(
                  "grid size-8 place-items-center rounded-xl transition-colors",
                  i.destacado && "bg-gradient-to-br from-marca-2 to-marca-1 text-white shadow-md shadow-primary/30",
                  !i.destacado && activo(i.href, i.exacto) && "bg-primary/10",
                )}
              >
                <i.icono className="size-[1.1rem]" />
              </span>
              {i.etiqueta}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
