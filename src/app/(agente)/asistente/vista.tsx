import { Asistente } from "@/components/agente/asistente"
import type { DatosAsistente } from "@/lib/asistente"

export function VistaAsistente({
  nombre,
  enfocado,
  restantes,
  disponible,
  base = "",
  demo = false,
  datosDemo,
}: {
  nombre: string
  enfocado: { id: string; numero: string; tipo: string } | null
  restantes: number
  disponible: boolean
  base?: string
  demo?: boolean
  datosDemo?: DatosAsistente
}) {
  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Asistente</h1>
        <p className="mt-1 text-sm text-muted-foreground">Consultas sobre tus trámites, requisitos y plazos, a cualquier hora.</p>
      </div>
      <Asistente
        key={enfocado?.id ?? "todos"}
        nombre={nombre}
        enfocado={enfocado}
        restantes={restantes}
        disponible={disponible}
        base={base}
        demo={demo}
        datosDemo={datosDemo}
      />
    </div>
  )
}
