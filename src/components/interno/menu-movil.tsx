"use client"

import { useState } from "react"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Marca } from "@/components/marca"
import { Navegacion } from "@/components/interno/navegacion"

export function MenuMovil({ pendientes, base }: { pendientes?: number; base?: string }) {
  const [abierto, setAbierto] = useState(false)
  return (
    <Sheet open={abierto} onOpenChange={setAbierto}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menú">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-4 text-sidebar-foreground">
        <SheetTitle className="sr-only">Menú</SheetTitle>
        <Marca claro className="mb-6 px-1" />
        <Navegacion alNavegar={() => setAbierto(false)} pendientes={pendientes} base={base} />
      </SheetContent>
    </Sheet>
  )
}
