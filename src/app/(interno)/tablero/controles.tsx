"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const PERIODOS = [7, 30, 90] as const

export function ControlesTablero({ dias }: { dias: number }) {
  const ruta = usePathname()
  const params = useSearchParams()
  const con = (d: number) => {
    const p = new URLSearchParams(params.toString())
    p.set("dias", String(d))
    return `${ruta}?${p.toString()}`
  }

  return (
    <div className="flex items-center gap-2 print:hidden">
      <div className="flex gap-1 rounded-xl bg-muted p-1" role="group" aria-label="Período">
        {PERIODOS.map((d) => (
          <Link
            key={d}
            href={con(d)}
            scroll={false}
            aria-current={dias === d ? "true" : undefined}
            className={cn(
              "rounded-lg px-3 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
              dias === d && "bg-background text-foreground shadow-sm",
            )}
          >
            {d} días
          </Link>
        ))}
      </div>
      <Button variant="outline" onClick={() => window.print()}>
        <Printer /> Imprimir informe
      </Button>
    </div>
  )
}
