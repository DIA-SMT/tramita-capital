import Link from "next/link"
import { Inbox, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Marca } from "@/components/marca"
import { Campana } from "@/components/campana"
import { MenuUsuario } from "@/components/menu-usuario"
import { datosMenu, requerirUsuario } from "@/lib/usuario"

export default async function LayoutAgente({ children }: LayoutProps<"/">) {
  const usuario = await requerirUsuario()

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-2 px-4 sm:px-6">
          <Link href="/mis-tramites" className="mr-auto">
            <Marca />
          </Link>
          {(usuario.esInterno || usuario.esAdmin) && (
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/bandeja">
                <Inbox /> Bandeja
              </Link>
            </Button>
          )}
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/mis-tramites/nuevo">
              <Plus /> Nuevo trámite
            </Link>
          </Button>
          <Campana perfilId={usuario.id} rutaBase="/mis-tramites" />
          <MenuUsuario datos={datosMenu(usuario)} />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">{children}</main>
      <footer className="mx-auto w-full max-w-5xl px-4 py-6 text-xs text-muted-foreground sm:px-6">
        Dirección de Capital Humano · Municipalidad de San Miguel de Tucumán
      </footer>
    </div>
  )
}
