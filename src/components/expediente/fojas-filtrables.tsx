"use client"

import { useState } from "react"
import { LineaFojas, type FojaVista } from "@/components/expediente/linea-fojas"
import { cn } from "@/lib/utils"

const FILTROS = [
  { clave: "todas", etiqueta: "Todas" },
  { clave: "decisiones", etiqueta: "Decisiones", tipos: ["dictamen", "resolucion", "observacion", "subsanacion", "informe", "providencia"] },
  { clave: "documentos", etiqueta: "Documentación", tipos: ["presentacion", "documento", "subsanacion"] },
] as const

/** Línea de fojas con filtro rápido para encontrar lo importante sin leer cada pase. */
export function FojasFiltrables({ fojas, firmantes }: { fojas: FojaVista[]; firmantes: Record<string, string> }) {
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]["clave"]>("todas")
  const activo = FILTROS.find((f) => f.clave === filtro)
  const visibles = activo && "tipos" in activo ? fojas.filter((f) => (activo.tipos as readonly string[]).includes(f.tipo)) : fojas

  return (
    <div>
      <div className="mb-5 flex gap-1" role="group" aria-label="Filtrar fojas">
        {FILTROS.map((f) => (
          <button
            key={f.clave}
            type="button"
            onClick={() => setFiltro(f.clave)}
            aria-pressed={filtro === f.clave}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              filtro === f.clave ? "border-primary/40 bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {f.etiqueta}
          </button>
        ))}
      </div>
      <LineaFojas fojas={visibles} firmantes={firmantes} />
    </div>
  )
}
