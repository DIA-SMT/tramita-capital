"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Banknote, BarChart3, BookOpenText, FileText, Inbox, LifeBuoy, PenLine, Settings2, Stamp, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/** `titulo`: el nombre completo, como ayuda al pasar el mouse cuando la etiqueta es corta. */
type Item = { href: string; etiqueta: string; titulo?: string; icono: LucideIcon; coincide?: string[]; contador?: number; aviso?: string }

/**
 * Menú del espacio interno, ordenado en tres grupos: el trabajo del día, lo que se consulta y lo personal.
 * Cada persona ve solo lo que usa: `paraFirmar` (resoluciones que esperan su firma) es null si no firma
 * resoluciones, `novedades` (pendientes de carga en Civitas) es null si no trabaja con novedades, y el
 * tablero y los circuitos son para responsables de área. `firmaPendiente`: falta registrar la firma.
 */
export function Navegacion({
  alNavegar,
  pendientes,
  paraFirmar = null,
  novedades = null,
  responsable = false,
  firmaPendiente = false,
  base = "",
}: {
  alNavegar?: () => void
  pendientes?: number
  paraFirmar?: number | null
  novedades?: number | null
  responsable?: boolean
  firmaPendiente?: boolean
  base?: string
}) {
  const ruta = usePathname()
  const firma = paraFirmar !== null || firmaPendiente
  const grupos: { titulo: string; items: Item[] }[] = [
    {
      titulo: "Trabajo",
      items: [
        {
          href: `${base}/bandeja`,
          etiqueta: "Bandeja",
          icono: Inbox,
          coincide: [`${base}/bandeja`, `${base}/expedientes`, `${base}/agentes`],
          contador: pendientes,
        },
        ...(paraFirmar === null ? [] : [{ href: `${base}/firmar`, etiqueta: "Para firmar", icono: Stamp, contador: paraFirmar }]),
        ...(novedades === null ? [] : [{ href: `${base}/novedades`, etiqueta: "Novedades", titulo: "Novedades de haberes", icono: Banknote, contador: novedades }]),
      ],
    },
    {
      titulo: "Consulta",
      items: [
        { href: `${base}/resoluciones`, etiqueta: "Resoluciones", titulo: "Registro de resoluciones", icono: BookOpenText },
        ...(responsable
          ? [
              { href: `${base}/tablero`, etiqueta: "Tablero de impacto", icono: BarChart3 },
              { href: `${base}/parametrizacion`, etiqueta: "Trámites y circuitos", icono: Settings2 },
            ]
          : []),
      ],
    },
    {
      titulo: "Personal",
      items: [
        ...(firma ? [{ href: `${base}/mi-firma`, etiqueta: "Mi firma", icono: PenLine, aviso: firmaPendiente ? "Registrar" : undefined }] : []),
        { href: `${base}/ayuda`, etiqueta: "Ayuda", titulo: "Del papel al sistema: ayuda para el personal", icono: LifeBuoy },
        { href: `${base}/mis-tramites`, etiqueta: "Mis trámites", titulo: "Mis trámites propios, como agente", icono: FileText },
      ],
    },
  ]
  const activo = (i: Item) => (i.coincide ?? [i.href]).some((r) => ruta.startsWith(r))

  return (
    <nav className="grid grid-cols-[minmax(0,1fr)] gap-4" aria-label="Principal">
      {grupos.map((g) => (
        <div key={g.titulo} className="grid grid-cols-[minmax(0,1fr)] gap-0.5">
          <p className="px-3 pb-1 text-[0.65rem] font-semibold tracking-[0.12em] text-sidebar-foreground/45 uppercase">{g.titulo}</p>
          {g.items.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              onClick={alNavegar}
              title={i.titulo}
              aria-current={activo(i) ? "page" : undefined}
              className={cn(
                "group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                activo(i) && "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)]",
              )}
            >
              {activo(i) && <span aria-hidden className="absolute top-2 bottom-2 -left-1 w-1 rounded-full bg-marca-3" />}
              <i.icono className={cn("size-4 shrink-0", activo(i) && "text-sidebar-primary")} />
              <span className="flex-1 truncate">{i.etiqueta}</span>
              {!!i.contador && (
                <span className="rounded-full bg-marca-3 px-2 text-xs font-semibold text-[#061a44] tabular">{i.contador}</span>
              )}
              {i.aviso && <span className="rounded-full bg-marca-3 px-2 text-xs font-semibold text-[#061a44]">{i.aviso}</span>}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  )
}
