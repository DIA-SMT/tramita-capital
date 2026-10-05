import Link from "next/link"
import { Inbox, Plus, UserRoundPen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Marca } from "@/components/marca"
import { Campana } from "@/components/campana"
import { MenuUsuario } from "@/components/menu-usuario"
import { NavegacionInferior } from "@/components/agente/navegacion-inferior"
import type { UsuarioVista } from "@/lib/vistas"

/** Estructura del portal del agente: simple, legible y pensada primero para el celular. */
export function ShellAgente({ usuario, base = "", children }: { usuario: UsuarioVista; base?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">
        Ir al contenido
      </a>
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur print:hidden">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-2 px-4 sm:px-6">
          <Link href={`${base}/mis-tramites`} className="mr-auto">
            <Marca />
          </Link>
          {usuario.esInterno && (
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href={`${base}/bandeja`}>
                <Inbox /> Bandeja
              </Link>
            </Button>
          )}
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href={`${base}/mis-tramites/nuevo`}>
              <Plus /> Nuevo trámite
            </Link>
          </Button>
          <Campana perfilId={usuario.id} rutaBase={`${base}/mis-tramites`} demo={!!base} />
          <MenuUsuario datos={usuario.menu} base={base} />
        </div>
      </header>

      {usuario.perfilIncompleto && (
        <div className="border-b bg-primary/5 print:hidden">
          <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-2.5 text-sm sm:px-6">
            <UserRoundPen className="size-4 shrink-0 text-primary" />
            <p className="flex-1">
              Completá tu perfil y tu celular para recibir avisos por WhatsApp a través de <strong>Migue</strong>.
            </p>
            <Button asChild size="xs" variant="outline">
              <Link href={`${base}/perfil`}>Completar</Link>
            </Button>
          </div>
        </div>
      )}

      <main id="contenido" className="mx-auto w-full max-w-5xl flex-1 px-4 pt-8 pb-28 sm:px-6 sm:pb-10">
        {children}
      </main>
      <footer className="mx-auto hidden w-full max-w-5xl px-4 py-6 text-xs text-muted-foreground sm:block sm:px-6 print:hidden">
        Dirección de Capital Humano · Municipalidad de San Miguel de Tucumán
      </footer>
      <NavegacionInferior base={base} esInterno={usuario.esInterno} />
    </div>
  )
}
