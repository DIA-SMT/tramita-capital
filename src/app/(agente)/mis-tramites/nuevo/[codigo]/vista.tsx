import Link from "next/link"
import { ArrowLeft, BadgeCheck, Clock, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { IconoTramite } from "@/components/icono-tramite"
import type { CampoFormulario, Requisito } from "@/lib/dominio"
import { FormularioTramite } from "./formulario-tramite"

export type TipoFormulario = {
  codigo: string
  nombre: string
  descripcion: string | null
  icono: string | null
  plazo_dias: number | null
  reservado: boolean
  campos: CampoFormulario[]
  requisitos: Requisito[]
  pasos: { orden: number; nombre: string; area: string }[]
}

/** Datos del agente que vienen del legajo: se precargan y no se editan en el trámite. */
export type DatosAgente = {
  nombre: string
  legajo: string | null
  cuil: string | null
  categoria?: string | null
  dependencia?: string | null
  reparticion: string | null
}

export function VistaFormularioNuevo({ tipo, agente, base = "", demo = false }: { tipo: TipoFormulario; agente?: DatosAgente; base?: string; demo?: boolean }) {
  const datosAgente = agente
    ? [
        { etiqueta: "Agente", valor: agente.nombre },
        { etiqueta: "Legajo", valor: agente.legajo },
        { etiqueta: "CUIL", valor: agente.cuil },
        { etiqueta: "Categoría", valor: agente.categoria },
        { etiqueta: "Dependiente de", valor: agente.dependencia },
        { etiqueta: "Presta servicios en", valor: agente.reparticion },
      ]
    : []
  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link href={`${base}/mis-tramites/nuevo`}>
          <ArrowLeft /> Todos los trámites
        </Link>
      </Button>

      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-marca-2 to-marca-1 text-white shadow-lg shadow-primary/20">
          <IconoTramite icono={tipo.icono} className="size-6" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{tipo.nombre}</h1>
          <p className="mt-1 text-muted-foreground">{tipo.descripcion}</p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {tipo.plazo_dias && (
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" /> Se resuelve en ~{tipo.plazo_dias} días
              </span>
            )}
            {tipo.reservado && (
              <span className="inline-flex items-center gap-1 text-violet-700 dark:text-violet-300">
                <Lock className="size-3.5" /> Confidencial: solo lo ve el personal autorizado
              </span>
            )}
          </div>
        </div>
      </div>

      {agente && (
        <section className="rounded-2xl border bg-card p-4 sm:p-5">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <BadgeCheck className="size-4 text-primary" /> Tus datos del legajo
          </h2>
          <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {datosAgente.map((d) => (
              <div key={d.etiqueta} className="min-w-0">
                <dt className="text-xs text-muted-foreground">{d.etiqueta}</dt>
                <dd className="truncate font-medium">{d.valor || <span className="font-normal text-muted-foreground">Sin dato</span>}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">Se agregan solos al trámite. Si algo no coincide, avisá a Capital Humano antes de iniciarlo.</p>
        </section>
      )}

      <FormularioTramite
        codigo={tipo.codigo}
        nombre={tipo.nombre}
        campos={tipo.campos}
        requisitos={tipo.requisitos}
        pasos={tipo.pasos}
        base={base}
        demo={demo}
      />
    </div>
  )
}
