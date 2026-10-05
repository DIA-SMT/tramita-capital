import { TiempoReal } from "@/components/tiempo-real"
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
  base = "",
  demo = false,
}: {
  expedientes: FilaBandeja[]
  vistas: { clave: string; etiqueta: string; cantidad: number }[]
  tipos: { codigo: string; nombre: string }[]
  usuarioId: string
  misAreas: string[]
  nombre: string
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

      <Filtros vistas={vistas} tipos={tipos} />
      <ListaBandeja expedientes={expedientes} misAreas={misAreas} usuarioId={usuarioId} base={base} demo={demo} />
    </div>
  )
}
