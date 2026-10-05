"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Eye, LayoutGrid } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const ROLES = [
  { valor: "mesa", etiqueta: "Lucía · Mesa de Entradas" },
  { valor: "licencias", etiqueta: "Pablo · Sección Licencias" },
  { valor: "dictamenes", etiqueta: "Inés · Asesoría Letrada" },
  { valor: "despacho", etiqueta: "Martín · Despacho" },
  { valor: "direccion", etiqueta: "Laura · Dirección" },
]

/** Barra flotante de la vista previa: indica que los datos son de ejemplo y permite cambiar de rol. */
export function BarraDemo({ rol, interno }: { rol: string; interno: boolean }) {
  const router = useRouter()
  const ruta = usePathname()
  const params = useSearchParams()

  return (
    <div className="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-2xl border bg-popover/95 p-1.5 pl-3 text-sm shadow-xl backdrop-blur sm:bottom-4 print:hidden">
      <Eye className="size-4 shrink-0 text-primary" />
      <span className="hidden font-medium whitespace-nowrap sm:inline">Vista previa · datos de ejemplo</span>
      {interno && (
        <Select
          value={rol}
          onValueChange={(v) => {
            const p = new URLSearchParams(params.toString())
            p.set("como", v)
            router.push(`${ruta}?${p.toString()}`)
          }}
        >
          <SelectTrigger size="sm" className="h-8 w-52 bg-background" aria-label="Mirar como">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => (
              <SelectItem key={r.valor} value={r.valor}>
                {r.etiqueta}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Link href="/vista-previa" className="inline-flex h-8 items-center gap-1.5 rounded-xl px-2.5 text-xs font-medium hover:bg-muted">
        <LayoutGrid className="size-3.5" /> Pantallas
      </Link>
    </div>
  )
}
