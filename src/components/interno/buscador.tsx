"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { FileSearch, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import type { Enum } from "@/lib/database.types"
import { ESTADOS } from "@/lib/dominio"
import { clienteNavegador } from "@/lib/supabase/navegador"

type Resultado = { id: string; numero: string; asunto: string; estado: Enum<"estado_expediente"> }

/** Paleta de búsqueda (Ctrl/⌘ + K) por número o asunto. Respeta RLS. */
export function Buscador() {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState("")
  const [resultados, setResultados] = useState<Resultado[]>([])

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setAbierto((a) => !a)
      }
    }
    window.addEventListener("keydown", alTeclear)
    return () => window.removeEventListener("keydown", alTeclear)
  }, [])

  const q = texto.trim()
  const visibles = q.length < 2 ? [] : resultados

  useEffect(() => {
    if (q.length < 2) return
    const t = setTimeout(async () => {
      const patron = `%${q.replaceAll("%", "").replaceAll(",", " ")}%`
      const { data } = await clienteNavegador()
        .from("expedientes")
        .select("id, numero, asunto, estado")
        .or(`numero.ilike.${patron},asunto.ilike.${patron}`)
        .order("created_at", { ascending: false })
        .limit(8)
      setResultados(data ?? [])
    }, 200)
    return () => clearTimeout(t)
  }, [q])

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setAbierto(true)}
        className="h-9 w-full max-w-sm justify-start gap-2 bg-card/60 text-muted-foreground sm:w-72"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left font-normal">Buscar expediente…</span>
        <kbd className="hidden rounded border bg-muted px-1.5 font-mono text-[0.65rem] sm:inline">Ctrl K</kbd>
      </Button>
      <CommandDialog open={abierto} onOpenChange={setAbierto} title="Buscar expediente" description="Por número o asunto">
        <CommandInput placeholder="CH-2026-000123 o palabras del asunto…" value={texto} onValueChange={setTexto} />
        <CommandList>
          <CommandEmpty>{texto.trim().length < 2 ? "Escribí al menos 2 caracteres." : "Sin resultados."}</CommandEmpty>
          {visibles.length > 0 && (
            <CommandGroup heading="Expedientes">
              {visibles.map((r) => (
                <CommandItem
                  key={r.id}
                  value={`${r.numero} ${r.asunto}`}
                  onSelect={() => {
                    setAbierto(false)
                    router.push(`/expedientes/${r.id}`)
                  }}
                >
                  <FileSearch />
                  <span className="font-mono text-xs tabular">{r.numero}</span>
                  <span className="truncate">{r.asunto}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{ESTADOS[r.estado].etiqueta}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
