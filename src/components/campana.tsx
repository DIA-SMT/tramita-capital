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

/** Campanita con avisos en tiempo real. `rutaBase` arma el enlace al expediente. */
export function Campana({ perfilId, rutaBase }: { perfilId: string; rutaBase: "/mis-tramites" | "/expedientes" }) {
  const [lista, setLista] = useState<Notificacion[]>([])
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
  }, [consultar, perfilId])

  async function alAbrir(abrir: boolean) {
    setAbierta(abrir)
    if (abrir && sinLeer > 0) {
      const ahora = new Date().toISOString()
      await clienteNavegador().from("notificaciones").update({ leida_at: ahora }).eq("perfil_id", perfilId).is("leida_at", null)
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
