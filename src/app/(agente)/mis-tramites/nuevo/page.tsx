import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Clock, FileCheck2, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { IconoTramite } from "@/components/icono-tramite"
import { leerRequisitos } from "@/lib/dominio"
import { crearClienteServidor } from "@/lib/supabase/servidor"

export const metadata: Metadata = { title: "Iniciar un trámite" }

export default async function NuevoTramite() {
  const supabase = await crearClienteServidor()
  const { data: tipos } = await supabase
    .from("tipos_tramite")
    .select("codigo, nombre, descripcion, categoria, icono, plazo_dias, requisitos, reservado")
    .eq("activo", true)
    .order("categoria")
    .order("nombre")

  const categorias = new Map<string, NonNullable<typeof tipos>>()
  for (const t of tipos ?? []) categorias.set(t.categoria, [...(categorias.get(t.categoria) ?? []), t])

  return (
    <div className="space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2 text-muted-foreground">
          <Link href="/mis-tramites">
            <ArrowLeft /> Mis trámites
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">¿Qué trámite querés iniciar?</h1>
        <p className="mt-1 text-muted-foreground">Elegí el trámite: te pedimos solo lo necesario y lo seguís desde acá.</p>
      </div>

      {[...categorias.entries()].map(([categoria, lista]) => (
        <section key={categoria} className="space-y-3">
          <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{categoria}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {lista.map((t) => {
              const requisitos = leerRequisitos(t.requisitos)
              return (
                <Link
                  key={t.codigo}
                  href={`/mis-tramites/nuevo/${t.codigo}`}
                  className="group flex flex-col rounded-2xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-marca-2/15 to-marca-1/15 text-primary">
                      <IconoTramite icono={t.icono} />
                    </span>
                    {t.reservado && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-violet-500/10 px-2 py-0.5 text-xs text-violet-700 dark:text-violet-300">
                        <Lock className="size-3" /> Confidencial
                      </span>
                    )}
                  </div>
                  <h3 className="mt-4 font-medium">{t.nombre}</h3>
                  <p className="mt-1 flex-1 text-sm text-muted-foreground">{t.descripcion}</p>
                  <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                    {t.plazo_dias && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3.5" /> Objetivo: {t.plazo_dias} {t.plazo_dias === 1 ? "día" : "días"}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <FileCheck2 className="size-3.5" /> {requisitos.length} {requisitos.length === 1 ? "documento" : "documentos"}
                    </span>
                    <ArrowRight className="ml-auto size-4 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
