"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowRight, PenLine } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * Primer paso de quien firma resoluciones: registrar su firma antes de que le llegue el primer expediente.
 * Se ve en todo el espacio interno hasta que la registra (menos en la propia pantalla de registro).
 */
export function AvisoFirma({ base = "" }: { base?: string }) {
  const ruta = usePathname()
  if (ruta.startsWith(`${base}/mi-firma`)) return null
  return (
    <section
      aria-label="Registrá tu firma"
      className="mb-6 flex flex-col gap-4 rounded-2xl border border-marca-3/70 bg-marca-3/10 p-4 sm:flex-row sm:items-center sm:p-5"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-marca-3 text-[#061a44]">
        <PenLine className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Primer paso: registrá tu firma</p>
        <p className="text-sm text-muted-foreground">
          Vas a firmar las resoluciones de Capital Humano. Registrala antes de que te llegue el primer expediente: la dibujás tres veces y elegís una
          clave de 6 números. Se hace una sola vez y lleva un par de minutos.
        </p>
      </div>
      <Button asChild className="shrink-0">
        <Link href={`${base}/mi-firma`}>
          Registrar mi firma <ArrowRight />
        </Link>
      </Button>
    </section>
  )
}
