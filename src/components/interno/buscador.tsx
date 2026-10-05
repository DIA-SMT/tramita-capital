"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { BarChart3, FilePlus2, FileSearch, FileText, Inbox, Moon, Search, Settings2, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import type { Enum } from "@/lib/database.types"
import { ESTADOS } from "@/lib/dominio"
import { clienteNavegador } from "@/lib/supabase/navegador"

type Resultado = { id: string; numero: string; asunto: string; estado: Enum<"estado_expediente"> }

/** Paleta de comandos (Ctrl/⌘ + K): buscar expedientes por número o asunto e ir a cualquier sección. */
export function Buscador({ base = "" }: { base?: string }) {
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
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
    if (q.length < 2 || base) return
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
  }, [q, base])

  function ir(ruta: string) {
    setAbierto(false)
    setTexto("")
    router.push(`${base}${ruta}`)
  }

  const secciones = [
    { valor: "bandeja de trabajo", ruta: "/bandeja", icono: Inbox, texto: "Bandeja de trabajo" },
    { valor: "asignados a mi", ruta: "/bandeja?vista=mios", icono: Inbox, texto: "Asignados a mí" },
    { valor: "tablero de impacto metricas informe", ruta: "/tablero", icono: BarChart3, texto: "Tablero de impacto" },
    { valor: "tramites y circuitos parametrizacion", ruta: "/parametrizacion", icono: Settings2, texto: "Trámites y circuitos" },
    { valor: "mis tramites personales", ruta: "/mis-tramites", icono: FileText, texto: "Mis trámites personales" },
    { valor: "iniciar nuevo tramite propio", ruta: "/mis-tramites/nuevo", icono: FilePlus2, texto: "Iniciar un trámite propio" },
  ]

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setAbierto(true)}
        className="h-9 min-w-0 flex-1 shrink justify-start gap-2 bg-card/60 text-muted-foreground sm:w-72 sm:flex-none"
      >
        <Search className="size-4" />
        <span className="flex-1 truncate text-left font-normal">Buscar o ir a…</span>
        <kbd className="hidden rounded border bg-muted px-1.5 font-mono text-[0.65rem] sm:inline">Ctrl K</kbd>
      </Button>
      <CommandDialog open={abierto} onOpenChange={setAbierto} title="Buscar" description="Expedientes y secciones">
        <CommandInput placeholder="Número (CH-2026-…), asunto o sección…" value={texto} onValueChange={setTexto} />
        <CommandList>
          <CommandEmpty>Sin resultados.</CommandEmpty>
          {visibles.length > 0 && (
            <>
              <CommandGroup heading="Expedientes">
                {visibles.map((r) => (
                  <CommandItem key={r.id} value={`${r.numero} ${r.asunto}`} onSelect={() => ir(`/expedientes/${r.id}`)}>
                    <FileSearch />
                    <span className="font-mono text-xs tabular">{r.numero}</span>
                    <span className="truncate">{r.asunto}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{ESTADOS[r.estado].etiqueta}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}
          <CommandGroup heading="Ir a">
            {secciones.map((s) => (
              <CommandItem key={s.ruta} value={s.valor} onSelect={() => ir(s.ruta)}>
                <s.icono /> {s.texto}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Preferencias">
            <CommandItem
              value="cambiar tema oscuro claro apariencia"
              onSelect={() => {
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
                setAbierto(false)
              }}
            >
              {resolvedTheme === "dark" ? <Sun /> : <Moon />} Cambiar a tema {resolvedTheme === "dark" ? "claro" : "oscuro"}
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
