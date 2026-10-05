import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Clock, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { IconoTramite } from "@/components/icono-tramite"
import { leerFormulario, leerRequisitos } from "@/lib/dominio"
import { crearClienteServidor } from "@/lib/supabase/servidor"
import { FormularioTramite } from "./formulario-tramite"

export async function generateMetadata({ params }: PageProps<"/mis-tramites/nuevo/[codigo]">): Promise<Metadata> {
  const { codigo } = await params
  return { title: `Nuevo trámite ${codigo}` }
}

export default async function FormularioNuevo({ params }: PageProps<"/mis-tramites/nuevo/[codigo]">) {
  const { codigo } = await params
  const supabase = await crearClienteServidor()
  const { data: tipo } = await supabase
    .from("tipos_tramite")
    .select("id, codigo, nombre, descripcion, icono, plazo_dias, reservado, requisitos, formulario")
    .eq("codigo", decodeURIComponent(codigo))
    .eq("activo", true)
    .maybeSingle()
  if (!tipo) notFound()

  const { data: pasos } = await supabase
    .from("pasos_circuito")
    .select("orden, nombre, area:areas!pasos_circuito_area_id_fkey(nombre)")
    .eq("tipo_tramite_id", tipo.id)
    .order("orden")

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link href="/mis-tramites/nuevo">
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
                <Clock className="size-3.5" /> Objetivo de resolución: {tipo.plazo_dias} días
              </span>
            )}
            {tipo.reservado && (
              <span className="inline-flex items-center gap-1 text-violet-700 dark:text-violet-300">
                <Lock className="size-3.5" /> Trámite confidencial: solo lo ve el personal autorizado
              </span>
            )}
          </div>
        </div>
      </div>

      <FormularioTramite
        codigo={tipo.codigo}
        nombre={tipo.nombre}
        campos={leerFormulario(tipo.formulario)}
        requisitos={leerRequisitos(tipo.requisitos)}
        pasos={(pasos ?? []).map((p) => ({ orden: p.orden, nombre: p.nombre, area: p.area?.nombre ?? "" }))}
      />
    </div>
  )
}
