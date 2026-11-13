"use client"

import { useSyncExternalStore } from "react"
import Link from "next/link"
import { ArrowRight, LifeBuoy, X } from "lucide-react"
import { Button } from "@/components/ui/button"

const CLAVE = "tramita:bienvenida-interna"
// El evento "storage" solo avisa a las otras pestañas: para esta, uno propio.
const EVENTO = "tramita:bienvenida"

function leerCerrada() {
  try {
    return localStorage.getItem(CLAVE) === "1"
  } catch {
    return true
  }
}

function suscribir(aviso: () => void) {
  window.addEventListener("storage", aviso)
  window.addEventListener(EVENTO, aviso)
  return () => {
    window.removeEventListener("storage", aviso)
    window.removeEventListener(EVENTO, aviso)
  }
}

function cerrar() {
  try {
    localStorage.setItem(CLAVE, "1")
  } catch {
    // Sin almacenamiento (navegación privada): se vuelve a mostrar la próxima vez.
  }
  window.dispatchEvent(new Event(EVENTO))
}

/**
 * Bienvenida para quien usa el expediente electrónico por primera vez: lo lleva a la ayuda «Del papel
 * al sistema». Una vez cerrada no vuelve a aparecer en ese navegador. En el servidor no se dibuja, así
 * quien ya la cerró no la ve aparecer y desaparecer.
 */
export function Bienvenida({ base = "" }: { base?: string }) {
  const cerrada = useSyncExternalStore(suscribir, leerCerrada, () => true)
  if (cerrada) return null

  return (
    <section
      aria-labelledby="bienvenida-titulo"
      className="relative flex flex-col gap-4 overflow-hidden rounded-2xl border bg-gradient-to-r from-marca-2/[0.08] via-card to-card p-4 pr-12 animate-in fade-in sm:flex-row sm:items-center sm:p-5 sm:pr-12"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-marca-3/25 text-[#5c4a00] dark:text-marca-3">
        <LifeBuoy className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 id="bienvenida-titulo" className="font-medium">
          ¿Primera vez con el expediente electrónico?
        </h2>
        <p className="text-sm text-muted-foreground">
          Es el mismo expediente de siempre, sin papel. En la ayuda está dónde quedó cada cosa y tu trabajo, paso a paso.
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button asChild size="sm" onClick={cerrar}>
          <Link href={`${base}/ayuda`}>
            Ver la ayuda <ArrowRight />
          </Link>
        </Button>
        <Button size="sm" variant="ghost" onClick={cerrar}>
          Ya lo conozco
        </Button>
      </div>
      <Button size="icon" variant="ghost" onClick={cerrar} className="absolute top-2 right-2 size-8 text-muted-foreground" aria-label="Cerrar la bienvenida">
        <X />
      </Button>
    </section>
  )
}
