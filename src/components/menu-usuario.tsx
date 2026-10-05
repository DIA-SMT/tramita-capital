"use client"

import Link from "next/link"
import { useTheme } from "next-themes"
import { FileText, Inbox, LogOut, Monitor, Moon, Sun, UserRound } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type DatosMenu = {
  nombre: string
  email: string
  iniciales: string
  areas: { nombre: string; rol: string }[]
  esInterno: boolean
}

export function MenuUsuario({ datos, base = "" }: { datos: DatosMenu; base?: string }) {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50" aria-label="Menú de usuario">
        <Avatar className="size-8">
          <AvatarFallback className="bg-gradient-to-br from-marca-2 to-marca-1 text-xs font-semibold text-white">
            {datos.iniciales}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium text-foreground">{datos.nombre}</p>
          <p className="truncate text-xs text-muted-foreground">{datos.email}</p>
          {datos.areas.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {datos.areas.map((a) => (
                <span key={a.nombre} className="rounded bg-secondary px-1.5 py-0.5 text-[0.7rem] text-secondary-foreground">
                  {a.nombre} · {a.rol}
                </span>
              ))}
            </div>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {datos.esInterno && (
            <DropdownMenuItem asChild>
              <Link href={`${base}/bandeja`}>
                <Inbox /> Bandeja de trabajo
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link href={`${base}/mis-tramites`}>
              <FileText /> Mis trámites personales
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`${base}/perfil`}>
              <UserRound /> Mi perfil
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">Apariencia</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light">
            <Sun /> Claro
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon /> Oscuro
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor /> Según el sistema
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <form action="/auth/salir" method="post">
          <DropdownMenuItem asChild variant="destructive">
            <button type="submit" className="w-full">
              <LogOut /> Cerrar sesión
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
