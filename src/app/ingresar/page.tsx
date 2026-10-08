import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Fingerprint, Route, ShieldCheck } from "lucide-react"
import { Isotipo, Marca } from "@/components/marca"
import { obtenerUsuario } from "@/lib/usuario"
import { FormularioIngreso } from "./formulario-ingreso"

export const metadata: Metadata = { title: "Ingresar" }

const DATOS = [
  { icono: Route, valor: "−39 %", texto: "pasos en los circuitos de Bonificaciones" },
  { icono: Fingerprint, valor: "Firma", texto: "registrada, con clave y verificable por QR" },
  { icono: ShieldCheck, valor: "Fojas", texto: "encadenadas: cualquier alteración se detecta" },
]

export default async function Ingresar({ searchParams }: PageProps<"/ingresar">) {
  const { volver, error } = await searchParams
  const usuario = await obtenerUsuario()
  if (usuario) redirect(usuario.esInterno ? "/bandeja" : "/mis-tramites")

  return (
    <main className="grid min-h-svh lg:grid-cols-[1.1fr_1fr]">
      {/* Panel de marca */}
      <section className="panel-marca relative hidden flex-col overflow-hidden p-10 text-white lg:flex xl:p-14">
        <Isotipo claro className="pointer-events-none absolute -right-28 -bottom-28 h-[36rem] w-auto opacity-[0.08]" />
        <span aria-hidden className="pointer-events-none absolute top-16 right-24 size-48 rounded-full bg-marca-3/30 blur-3xl" />
        <Link href="/" className="relative w-fit">
          <Marca claro />
        </Link>
        <div className="relative mt-auto max-w-xl">
          <p className="vidrio inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium">
            <span className="size-1.5 rounded-full bg-marca-3" /> Programa de Incorporación de IA a Capital Humano
          </p>
          <h2 className="mt-6 text-4xl leading-tight font-semibold tracking-tight text-balance xl:text-5xl">
            Capital Humano, <span className="text-marca-3">sin papel</span> y sin esperas.
          </h2>
          <p className="mt-4 max-w-md text-white/75">
            Licencias, bonificaciones y asignaciones de punta a punta en digital. La IA prepara los borradores; las personas deciden y firman.
          </p>
          <ul className="mt-10 grid grid-cols-3 gap-3">
            {DATOS.map((d) => (
              <li key={d.valor} className="vidrio rounded-2xl p-4">
                <d.icono className="size-4 text-marca-2" />
                <p className="mt-3 text-xl font-semibold">{d.valor}</p>
                <p className="mt-0.5 text-xs leading-snug text-white/70">{d.texto}</p>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative mt-10 text-xs text-white/50">Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano</p>
      </section>

      {/* Formulario */}
      <section className="fondo-marca flex flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-8 flex justify-center lg:hidden">
            <Marca />
          </Link>
          <div className="rounded-3xl border bg-card p-6 shadow-2xl shadow-primary/10 sm:p-8">
            <h1 className="text-2xl font-semibold tracking-tight">Ingresá</h1>
            <p className="mt-1 mb-6 text-sm text-muted-foreground">Con el email con el que estás registrado en Capital Humano.</p>
            {error && (
              <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">El enlace venció o ya fue usado. Pedí uno nuevo.</p>
            )}
            <FormularioIngreso volver={typeof volver === "string" ? volver : "/"} />
            <div className="mt-6 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> próximamente <span className="h-px flex-1 bg-border" />
            </div>
            <button
              type="button"
              disabled
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-2.5 text-sm font-medium text-muted-foreground"
            >
              <ShieldCheck className="size-4" /> Ingresar con CiDiTuc
            </button>
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground lg:hidden">Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano</p>
        </div>
      </section>
    </main>
  )
}
