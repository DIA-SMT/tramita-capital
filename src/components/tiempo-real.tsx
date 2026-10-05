"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { clienteNavegador } from "@/lib/supabase/navegador"

type Suscripcion = { tabla: "expedientes" | "actuaciones" | "movimientos" | "notificaciones"; filtro?: string }

/**
 * Escucha cambios en Postgres (respetando RLS) y refresca la vista del servidor.
 * Agrupa ráfagas de eventos para no refrescar de más.
 */
export function TiempoReal({ canal, suscripciones }: { canal: string; suscripciones: Suscripcion[] }) {
  const router = useRouter()
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clave = JSON.stringify(suscripciones)

  useEffect(() => {
    const supabase = clienteNavegador()
    const lista: Suscripcion[] = JSON.parse(clave)
    let c = supabase.channel(canal)
    for (const s of lista) {
      c = c.on("postgres_changes", { event: "*", schema: "public", table: s.tabla, filter: s.filtro }, () => {
        if (temporizador.current) clearTimeout(temporizador.current)
        temporizador.current = setTimeout(() => router.refresh(), 400)
      })
    }
    c.subscribe()
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current)
      supabase.removeChannel(c)
    }
  }, [canal, clave, router])

  return null
}
