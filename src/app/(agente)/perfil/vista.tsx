import { BadgeCheck, Lock } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { iniciales, nombreCompleto } from "@/lib/dominio"
import { FormularioPerfil } from "./formulario"

export type PerfilVista = {
  nombre: string
  apellido: string
  email: string
  telefono: string | null
  cuil: string | null
  legajo: string | null
  reparticion: string | null
  dependencia?: string | null
  categoria?: string | null
}

export function VistaPerfil({ perfil, demo = false }: { perfil: PerfilVista; demo?: boolean }) {
  const oficiales = [
    { etiqueta: "Email", valor: perfil.email },
    { etiqueta: "CUIL", valor: perfil.cuil },
    { etiqueta: "Legajo", valor: perfil.legajo },
    { etiqueta: "Categoría", valor: perfil.categoria },
    { etiqueta: "Dependiente de", valor: perfil.dependencia },
    { etiqueta: "Presta servicios en", valor: perfil.reparticion },
  ]
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Avatar className="size-16">
          <AvatarFallback className="bg-gradient-to-br from-marca-2 to-marca-1 text-lg font-semibold text-white">{iniciales(perfil)}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{nombreCompleto(perfil) === "—" ? "Mi perfil" : nombreCompleto(perfil)}</h1>
          <p className="text-sm text-muted-foreground">{perfil.email}</p>
        </div>
      </div>

      <section className="rounded-2xl border bg-card p-5 sm:p-6">
        <h2 className="mb-5 font-medium">Datos de contacto</h2>
        <FormularioPerfil perfil={perfil} demo={demo} />
      </section>

      <section className="rounded-2xl border bg-card p-5 sm:p-6">
        <h2 className="flex items-center gap-2 font-medium">
          <BadgeCheck className="size-4 text-primary" /> Datos del legajo
        </h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">Vienen del padrón de personal. Si algo está mal, avisá a Capital Humano.</p>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {oficiales.map((d) => (
            <div key={d.etiqueta} className="rounded-xl bg-muted/40 p-3">
              <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                <Lock className="size-3" /> {d.etiqueta}
              </dt>
              <dd className="mt-0.5 truncate text-sm font-medium">{d.valor || "Sin cargar"}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}
