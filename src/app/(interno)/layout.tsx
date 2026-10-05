import Link from "next/link"
import { Marca } from "@/components/marca"
import { Campana } from "@/components/campana"
import { MenuUsuario } from "@/components/menu-usuario"
import { Buscador } from "@/components/interno/buscador"
import { MenuMovil } from "@/components/interno/menu-movil"
import { Navegacion } from "@/components/interno/navegacion"
import { datosMenu, requerirInterno } from "@/lib/usuario"

export default async function LayoutInterno({ children }: LayoutProps<"/">) {
  const usuario = await requerirInterno()

  return (
    <div className="flex min-h-svh">
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col border-r bg-sidebar p-4 lg:flex">
        <Link href="/bandeja" className="mb-8 px-1">
          <Marca />
        </Link>
        <Navegacion />
        <div className="mt-auto rounded-xl border bg-card/60 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Tus áreas</p>
          <ul className="mt-1.5 space-y-1">
            {usuario.membresias.map((m) => (
              <li key={m.area_id} className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-primary" />
                {m.area.nombre}
              </li>
            ))}
            {usuario.membresias.length === 0 && <li>Administración</li>}
          </ul>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur sm:px-6">
          <MenuMovil />
          <Buscador />
          <div className="ml-auto flex items-center gap-1">
            <Campana perfilId={usuario.id} rutaBase="/expedientes" />
            <MenuUsuario datos={datosMenu(usuario)} />
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}
