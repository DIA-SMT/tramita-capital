"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { BarChart3, BookOpenText, Database, FilePlus2, FileSearch, FileText, Inbox, LifeBuoy, Moon, Search, Settings2, Stamp, Sun, UserRound } from "lucide-react"
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
type Agente = { id: string; nombre: string; apellido: string; legajo: string | null }

/**
 * Paleta de comandos (Ctrl/⌘ + K): buscar expedientes por número o asunto, agentes por nombre o legajo
 * (los que RLS deja ver) e ir a cualquier sección. Ofrece las mismas secciones que el menú de la persona.
 */
export function Buscador({
  base = "",
  paraFirmar = false,
  responsable = false,
  civitas = false,
}: {
  base?: string
  paraFirmar?: boolean
  responsable?: boolean
  civitas?: boolean
}) {
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState("")
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [agentes, setAgentes] = useState<Agente[]>([])

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
  const agentesVisibles = q.length < 2 ? [] : agentes

  useEffect(() => {
    if (q.length < 2 || base) return
    const t = setTimeout(async () => {
      const limpio = q.replaceAll("%", "").replaceAll(",", " ")
      const patron = `%${limpio}%`
      // Para personas alcanza la palabra más larga: "Ana Paz" encuentra a Paz aunque nombre y apellido estén separados.
      const palabra = `%${limpio.split(/\s+/).sort((a, b) => b.length - a.length)[0]}%`
      const cliente = clienteNavegador()
      const [{ data }, { data: personas }] = await Promise.all([
        cliente
          .from("expedientes")
          .select("id, numero, asunto, estado")
          .or(`numero.ilike.${patron},asunto.ilike.${patron}`)
          .order("created_at", { ascending: false })
          .limit(8),
        cliente
          .from("perfiles")
          .select("id, nombre, apellido, legajo")
          .or(`nombre.ilike.${palabra},apellido.ilike.${palabra},legajo.ilike.${palabra}`)
          .order("apellido")
          .limit(6),
      ])
      setResultados(data ?? [])
      setAgentes(personas ?? [])
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
    ...(paraFirmar ? [{ valor: "para firmar resoluciones firma", ruta: "/firmar", icono: Stamp, texto: "Para firmar" }] : []),
    { valor: "registro de resoluciones protocolo libro numero", ruta: "/resoluciones", icono: BookOpenText, texto: "Registro de resoluciones" },
    ...(civitas ? [{ valor: "datos de civitas importar planilla liquida legajo", ruta: "/datos-civitas", icono: Database, texto: "Datos de Civitas" }] : []),
    ...(responsable
      ? [
          { valor: "tablero de impacto metricas informe", ruta: "/tablero", icono: BarChart3, texto: "Tablero de impacto" },
          { valor: "tramites y circuitos parametrizacion", ruta: "/parametrizacion", icono: Settings2, texto: "Trámites y circuitos" },
        ]
      : []),
    { valor: "ayuda del papel al sistema como se hace", ruta: "/ayuda", icono: LifeBuoy, texto: "Del papel al sistema (ayuda)" },
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
        <CommandInput placeholder="Número (CH-2026-…), asunto, agente o sección…" value={texto} onValueChange={setTexto} />
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
          {agentesVisibles.length > 0 && (
            <>
              <CommandGroup heading="Agentes">
                {agentesVisibles.map((a) => (
                  <CommandItem key={a.id} value={`${a.nombre} ${a.apellido} ${a.legajo ?? ""}`} onSelect={() => ir(`/agentes/${a.id}`)}>
                    <UserRound />
                    <span className="truncate">
                      {a.apellido}, {a.nombre}
                    </span>
                    {a.legajo && <span className="ml-auto text-xs text-muted-foreground tabular">Leg. {a.legajo}</span>}
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
