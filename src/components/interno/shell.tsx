import Link from "next/link"
import { Marca } from "@/components/marca"
import { Campana } from "@/components/campana"
import { MenuUsuario } from "@/components/menu-usuario"
import { Buscador } from "@/components/interno/buscador"
import { MenuMovil } from "@/components/interno/menu-movil"
import { Navegacion } from "@/components/interno/navegacion"
import type { UsuarioVista } from "@/lib/vistas"

/** Estructura del espacio de trabajo interno: barra lateral, buscador, avisos y menú. */
export function ShellInterno({
  usuario,
  pendientes,
  base = "",
  children,
}: {
  usuario: UsuarioVista
  pendientes?: number
  base?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">
        Ir al contenido
      </a>
      <aside className="sticky top-0 hidden h-svh w-56 shrink-0 flex-col border-r bg-sidebar p-4 print:hidden lg:flex xl:w-64">
        <Link href={`${base}/bandeja`} className="mb-8 px-1">
          <Marca />
        </Link>
        <Navegacion pendientes={pendientes} base={base} />
        <div className="mt-auto rounded-xl border bg-card/60 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Tus áreas</p>
          <ul className="mt-1.5 space-y-1">
            {usuario.areas.map((a) => (
              <li key={a.id} className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-primary" />
                {a.nombre}
              </li>
            ))}
            {usuario.areas.length === 0 && <li>Administración</li>}
          </ul>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur print:hidden sm:px-6">
          <MenuMovil pendientes={pendientes} base={base} />
          <Buscador base={base} />
          <div className="ml-auto flex items-center gap-1">
            <Campana perfilId={usuario.id} rutaBase={`${base}/expedientes`} demo={!!base} />
            <MenuUsuario datos={usuario.menu} base={base} />
          </div>
        </header>
        <main id="contenido" className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  )
}
