import Link from "next/link"
import { ArrowRight, Stamp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TiempoReal } from "@/components/tiempo-real"
import { Bienvenida } from "@/components/interno/bienvenida"
import type { FilaBandeja } from "@/lib/vistas"
import { Filtros } from "./filtros"
import { ListaBandeja } from "./lista"

export function VistaBandeja({
  expedientes,
  vistas,
  tipos,
  usuarioId,
  misAreas,
  nombre,
  vista = "area",
  paraFirmar = null,
  base = "",
  demo = false,
}: {
  expedientes: FilaBandeja[]
  vistas: { clave: string; etiqueta: string; cantidad: number }[]
  tipos: { codigo: string; nombre: string }[]
  usuarioId: string
  misAreas: string[]
  nombre: string
  /** Pestaña activa: en "pasados" cada fila dice dónde está y desde cuándo. */
  vista?: string
  /** Resoluciones que esperan la firma de esta persona; null si no firma resoluciones. */
  paraFirmar?: number | null
  base?: string
  demo?: boolean
}) {
  const hora = new Date().getHours()
  const saludo = hora < 13 ? "Buen día" : hora < 20 ? "Buenas tardes" : "Buenas noches"

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {!demo && <TiempoReal canal={`bandeja-${usuarioId}`} suscripciones={[{ tabla: "expedientes" }]} />}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {saludo}
            {nombre ? `, ${nombre}` : ""}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Bandeja de trabajo</h1>
        </div>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          En vivo: se actualiza cuando entra o se mueve un expediente
        </p>
      </div>

      <Bienvenida base={base} />

      {!!paraFirmar && (
        <Link
          href={`${base}/firmar`}
          className="group flex items-center gap-4 rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/[0.07] to-transparent p-4 transition-colors hover:border-primary/40"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
            <Stamp className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium">
              {paraFirmar === 1 ? "Tenés una resolución para firmar" : `Tenés ${paraFirmar} resoluciones para firmar`}
            </span>
            <span className="block text-sm text-muted-foreground">Firmalas una tras otra, sin abrir cada expediente.</span>
          </span>
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <span>
              Empezar <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
            </span>
          </Button>
        </Link>
      )}

      <Filtros vistas={vistas} tipos={tipos} />
      <ListaBandeja expedientes={expedientes} misAreas={misAreas} usuarioId={usuarioId} pasados={vista === "pasados"} base={base} demo={demo} />
    </div>
  )
}
