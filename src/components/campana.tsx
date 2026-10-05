"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Bell, BellRing } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Fila } from "@/lib/database.types"
import { haceCuanto } from "@/lib/dominio"
import { clienteNavegador } from "@/lib/supabase/navegador"
import { cn } from "@/lib/utils"

type Notificacion = Pick<Fila<"notificaciones">, "id" | "titulo" | "cuerpo" | "leida_at" | "created_at" | "expediente_id">

/** Avisos de ejemplo para la vista previa (sin red). */
function avisosDemo(interno: boolean): Notificacion[] {
  const hace = (min: number) => new Date(Date.now() - min * 60_000).toISOString()
  return interno
    ? [
        { id: "n1", titulo: "Nuevo trámite CH-2026-000004", cuerpo: "Asignación por hijo con discapacidad · prioridad urgente", leida_at: null, created_at: hace(90), expediente_id: "demo-urgente" },
        { id: "n2", titulo: "CH-2026-000006: el agente respondió la observación", cuerpo: "El expediente volvió a tu bandeja.", leida_at: null, created_at: hace(240), expediente_id: "demo-observado" },
      ]
    : [
        { id: "n3", titulo: "Tu trámite CH-2026-000002 avanzó", cuerpo: "Ahora está en Sección Licencias.", leida_at: null, created_at: hace(60), expediente_id: "demo-licencia" },
        { id: "n4", titulo: "Tu trámite CH-2026-000006 necesita una corrección", cuerpo: "El certificado adjunto no tiene firma ni sello del profesional.", leida_at: hace(30), created_at: hace(1200), expediente_id: "demo-observado" },
      ]
}

/** Campanita con avisos en tiempo real. `rutaBase` arma el enlace al expediente. */
export function Campana({ perfilId, rutaBase, demo = false }: { perfilId: string; rutaBase: string; demo?: boolean }) {
  const [lista, setLista] = useState<Notificacion[]>(() => (demo ? avisosDemo(rutaBase.endsWith("/expedientes")) : []))
  const [abierta, setAbierta] = useState(false)
  const sinLeer = lista.filter((n) => !n.leida_at).length

  const consultar = useCallback(
    () =>
      clienteNavegador()
        .from("notificaciones")
        .select("id, titulo, cuerpo, leida_at, created_at, expediente_id")
        .eq("perfil_id", perfilId)
        .eq("canal", "sistema")
        .order("created_at", { ascending: false })
        .limit(20),
    [perfilId],
  )

  useEffect(() => {
    if (demo) return
    let vigente = true
    const cargar = () =>
      consultar().then(({ data }) => {
        if (vigente) setLista(data ?? [])
      })
    cargar()
    const supabase = clienteNavegador()
    const canal = supabase
      .channel(`avisos-${perfilId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notificaciones", filter: `perfil_id=eq.${perfilId}` }, cargar)
      .subscribe()
    return () => {
      vigente = false
      supabase.removeChannel(canal)
    }
  }, [consultar, perfilId, demo])

  async function alAbrir(abrir: boolean) {
    setAbierta(abrir)
    if (abrir && sinLeer > 0) {
      const ahora = new Date().toISOString()
      if (!demo) await clienteNavegador().from("notificaciones").update({ leida_at: ahora }).eq("perfil_id", perfilId).is("leida_at", null)
      setLista((l) => l.map((n) => ({ ...n, leida_at: n.leida_at ?? ahora })))
    }
  }

  return (
    <Popover open={abierta} onOpenChange={alAbrir}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Avisos${sinLeer ? `: ${sinLeer} sin leer` : ""}`}>
          {sinLeer > 0 ? <BellRing className="text-primary" /> : <Bell />}
          {sinLeer > 0 && (
            <span className="absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[0.65rem] font-semibold text-white tabular">
              {sinLeer}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3 text-sm font-medium">Avisos</div>
        <ScrollArea className="max-h-96">
          {lista.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No tenés avisos todavía.</p>
          ) : (
            <ul className="divide-y">
              {lista.map((n) => (
                <li key={n.id}>
                  <Link
                    href={n.expediente_id ? `${rutaBase}/${n.expediente_id}` : "#"}
                    onClick={() => setAbierta(false)}
                    className={cn("block px-4 py-3 transition-colors hover:bg-muted/60", !n.leida_at && "bg-primary/5")}
                  >
                    <p className="text-sm font-medium">{n.titulo}</p>
                    {n.cuerpo && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.cuerpo}</p>}
                    <p className="mt-1 text-[0.7rem] text-muted-foreground">{haceCuanto(n.created_at)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
