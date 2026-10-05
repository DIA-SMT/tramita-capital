"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

type Vista = { clave: string; etiqueta: string; cantidad: number }

export function Filtros({ vistas, tipos }: { vistas: Vista[]; tipos: { codigo: string; nombre: string }[] }) {
  const router = useRouter()
  const ruta = usePathname()
  const params = useSearchParams()
  const vista = params.get("vista") ?? "area"

  function con(cambios: Record<string, string | null>) {
    const p = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(cambios)) {
      if (v === null || v === "todos") p.delete(k)
      else p.set(k, v)
    }
    return `${ruta}?${p.toString()}`
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-muted p-1">
        {vistas.map((v) => (
          <Link
            key={v.clave}
            href={con({ vista: v.clave })}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
              vista === v.clave && "bg-background text-foreground shadow-sm",
            )}
          >
            {v.etiqueta}
            <span className={cn("rounded-md px-1.5 text-xs tabular", vista === v.clave ? "bg-primary/10 text-primary" : "bg-background/60")}>
              {v.cantidad}
            </span>
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 lg:ml-auto">
        <Select value={params.get("tipo") ?? "todos"} onValueChange={(v) => router.push(con({ tipo: v }))}>
          <SelectTrigger className="w-52 bg-card">
            <SelectValue placeholder="Tipo de trámite" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los trámites</SelectItem>
            {tipos.map((t) => (
              <SelectItem key={t.codigo} value={t.codigo}>
                {t.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={params.get("estado") ?? "activos"} onValueChange={(v) => router.push(con({ estado: v === "activos" ? null : v }))}>
          <SelectTrigger className="w-40 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="activos">En curso</SelectItem>
            <SelectItem value="observado">Observados</SelectItem>
            <SelectItem value="cerrados">Finalizados</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
