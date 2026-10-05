import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Marca } from "@/components/marca"
import { obtenerUsuario } from "@/lib/usuario"
import { FormularioIngreso } from "./formulario-ingreso"

export const metadata: Metadata = { title: "Ingresar" }

export default async function Ingresar({ searchParams }: PageProps<"/ingresar">) {
  const { volver, error } = await searchParams
  const usuario = await obtenerUsuario()
  if (usuario) redirect(usuario.esInterno ? "/bandeja" : "/mis-tramites")

  return (
    <main className="fondo-marca grid min-h-svh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex justify-center">
          <Marca />
        </Link>
        <div className="rounded-2xl border bg-card p-6 shadow-xl shadow-primary/5 sm:p-7">
          <h1 className="text-xl font-semibold tracking-tight">Ingresá a tus trámites</h1>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">Usá el email con el que estás registrado en Capital Humano.</p>
          {error && (
            <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              El enlace venció o ya fue usado. Pedí uno nuevo.
            </p>
          )}
          <FormularioIngreso volver={typeof volver === "string" ? volver : "/"} />
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Municipalidad de San Miguel de Tucumán · Dirección de Capital Humano
        </p>
      </div>
    </main>
  )
}
