import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowRight, FileSignature, Gauge, ShieldCheck, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Marca } from "@/components/marca"
import { obtenerUsuario } from "@/lib/usuario"

const PILARES = [
  {
    icono: FileSignature,
    titulo: "100 % digital",
    texto: "Iniciás tu trámite desde el celular, adjuntás la documentación y seguís cada paso. Sin papel ni hoja de ruta.",
  },
  {
    icono: Sparkles,
    titulo: "IA con humano en el centro",
    texto: "La IA prepara borradores de dictámenes y resoluciones; siempre los revisa y firma una persona responsable.",
  },
  {
    icono: ShieldCheck,
    titulo: "Seguro y trazable",
    texto: "Cada foja queda firmada electrónicamente y encadenada: cualquier alteración es detectable.",
  },
  {
    icono: Gauge,
    titulo: "Impacto medible",
    texto: "Tiempos reales de cada trámite frente a la línea de base. De 35 días a horas.",
  },
]

export default async function Inicio() {
  const usuario = await obtenerUsuario()
  if (usuario) redirect(usuario.esInterno ? "/bandeja" : "/mis-tramites")

  return (
    <main className="fondo-marca relative flex min-h-svh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Marca />
        <Button asChild variant="outline">
          <Link href="/ingresar">Ingresar</Link>
        </Button>
      </header>

      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-16 sm:px-6">
        <p className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
          <span className="size-1.5 rounded-full bg-emerald-500" /> Programa de Incorporación de IA a Capital Humano
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
          Tus trámites de personal, <span className="bg-gradient-to-r from-marca-1 to-marca-2 bg-clip-text text-transparent">resueltos en horas</span>.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-pretty text-muted-foreground">
          Expediente electrónico de la Dirección de Capital Humano de la Municipalidad de San Miguel de Tucumán. Licencias,
          bonificaciones y asignaciones, de punta a punta en digital.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg" className="h-11 px-5 text-base">
            <Link href="/ingresar">
              Ingresar con mi cuenta <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PILARES.map((p) => (
            <div key={p.titulo} className="rounded-2xl border bg-card/80 p-5 backdrop-blur">
              <p.icono className="size-5 text-primary" />
              <h2 className="mt-3 font-medium">{p.titulo}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{p.texto}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto w-full max-w-6xl px-4 py-6 text-xs text-muted-foreground sm:px-6">
        Municipalidad de San Miguel de Tucumán · Dirección de Inteligencia Artificial
      </footer>
    </main>
  )
}
