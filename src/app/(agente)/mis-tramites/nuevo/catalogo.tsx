"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, Clock, FileCheck2, Lock, Search, SearchX } from "lucide-react"
import { Input } from "@/components/ui/input"
import { IconoTramite } from "@/components/icono-tramite"
import { leerRequisitos } from "@/lib/dominio"
import type { TipoCatalogo } from "@/lib/vistas"

const normalizar = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()

/** Catálogo de trámites con búsqueda tolerante a acentos. */
export function Catalogo({ tipos, base = "" }: { tipos: TipoCatalogo[]; base?: string }) {
  const [q, setQ] = useState("")
  const filtrados = useMemo(() => {
    const t = normalizar(q.trim())
    return t ? tipos.filter((x) => normalizar(`${x.nombre} ${x.descripcion ?? ""} ${x.categoria}`).includes(t)) : tipos
  }, [q, tipos])

  const categorias = new Map<string, TipoCatalogo[]>()
  for (const t of filtrados) categorias.set(t.categoria, [...(categorias.get(t.categoria) ?? []), t])

  return (
    <div className="space-y-8">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscá: licencia, título, asignación…"
          className="h-11 bg-card pl-9 text-base sm:text-sm"
          aria-label="Buscar trámite"
        />
      </div>

      {filtrados.length === 0 && (
        <div className="grid place-items-center rounded-2xl border border-dashed py-14 text-center">
          <SearchX className="size-8 text-muted-foreground/60" />
          <p className="mt-3 font-medium">No encontramos “{q}”</p>
          <p className="text-sm text-muted-foreground">Probá con otra palabra o consultá a Capital Humano.</p>
        </div>
      )}

      {[...categorias.entries()].map(([categoria, lista]) => (
        <section key={categoria} className="space-y-3">
          <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{categoria}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {lista.map((t) => {
              const requisitos = leerRequisitos(t.requisitos)
              return (
                <Link
                  key={t.codigo}
                  href={`${base}/mis-tramites/nuevo/${t.codigo}`}
                  className="group flex flex-col rounded-2xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-marca-2/15 to-marca-1/15 text-primary transition-colors group-hover:from-marca-2 group-hover:to-marca-1 group-hover:text-white">
                      <IconoTramite icono={t.icono} />
                    </span>
                    {t.reservado && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-violet-500/10 px-2 py-0.5 text-xs text-violet-700 dark:text-violet-300">
                        <Lock className="size-3" /> Confidencial
                      </span>
                    )}
                  </div>
                  <h3 className="mt-4 font-medium">{t.nombre}</h3>
                  <p className="mt-1 flex-1 text-sm text-muted-foreground">{t.descripcion}</p>
                  <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                    {t.plazo_dias && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3.5" /> Se resuelve en ~{t.plazo_dias} {t.plazo_dias === 1 ? "día" : "días"}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <FileCheck2 className="size-3.5" /> {requisitos.length} {requisitos.length === 1 ? "documento" : "documentos"}
                    </span>
                    <ArrowRight className="ml-auto size-4 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
