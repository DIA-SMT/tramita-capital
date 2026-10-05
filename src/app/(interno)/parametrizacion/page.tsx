import type { Metadata } from "next"
import { ArrowRight, Clock, FileText, FormInput, Lock, Paperclip, ScrollText } from "lucide-react"
import { IconoTramite } from "@/components/icono-tramite"
import { InsigniaPrioridad } from "@/components/insignias"
import { leerFormulario, leerRequisitos, TIPOS_ACTUACION } from "@/lib/dominio"
import { crearClienteServidor } from "@/lib/supabase/servidor"
import { requerirInterno } from "@/lib/usuario"

export const metadata: Metadata = { title: "Trámites y circuitos" }

export default async function Parametrizacion() {
  await requerirInterno()
  const supabase = await crearClienteServidor()
  const [{ data: tipos }, { data: pasos }, { data: plantillas }] = await Promise.all([
    supabase.from("tipos_tramite").select("*").order("categoria").order("nombre"),
    supabase.from("pasos_circuito").select("tipo_tramite_id, orden, nombre, plazo_horas, area:areas!pasos_circuito_area_id_fkey(nombre)").order("orden"),
    supabase.from("plantillas").select("tipo_tramite_id, tipo_documento, nombre, version, instrucciones_ia").eq("activa", true),
  ])

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Trámites y circuitos</h1>
          <p className="text-sm text-muted-foreground">
            Cada trámite está parametrizado: formulario, requisitos, cursograma, plazos y modelos que usa la IA.
          </p>
        </div>
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
          Configuración provisoria: se reemplaza con el cursograma y los modelos reales de Capital Humano.
        </p>
      </div>

      <div className="grid gap-4">
        {(tipos ?? []).map((t) => {
          const circuito = (pasos ?? []).filter((p) => p.tipo_tramite_id === t.id)
          const campos = leerFormulario(t.formulario)
          const requisitos = leerRequisitos(t.requisitos)
          const modelos = (plantillas ?? []).filter((p) => p.tipo_tramite_id === t.id)
          return (
            <article key={t.id} className="rounded-2xl border bg-card p-5 sm:p-6">
              <header className="flex flex-wrap items-start gap-4">
                <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                  <IconoTramite icono={t.icono} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-medium">{t.nombre}</h2>
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">{t.codigo}</span>
                    <InsigniaPrioridad prioridad={t.prioridad_base} />
                    {t.reservado && (
                      <span className="inline-flex items-center gap-1 text-xs text-violet-700 dark:text-violet-300">
                        <Lock className="size-3" /> Reservado
                      </span>
                    )}
                    {!t.activo && <span className="text-xs text-muted-foreground">(inactivo)</span>}
                  </div>
                  <p className="text-sm text-muted-foreground">{t.descripcion}</p>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3.5" /> Objetivo {t.plazo_dias ?? "—"} d
                  </span>
                  <span>Antes: {t.linea_base_dias ?? "sin medir"}</span>
                </div>
              </header>

              <div className="mt-5">
                <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Cursograma</p>
                <ol className="flex flex-wrap items-center gap-1.5">
                  {circuito.map((p, i) => (
                    <li key={p.orden} className="flex items-center gap-1.5">
                      <span className="rounded-lg border bg-background px-2.5 py-1.5 text-xs">
                        <span className="font-medium">{p.orden}. {p.nombre}</span>
                        <span className="block text-muted-foreground">
                          {p.area?.nombre}
                          {p.plazo_horas ? ` · ${p.plazo_horas} h` : ""}
                        </span>
                      </span>
                      {i < circuito.length - 1 && <ArrowRight className="size-3.5 text-muted-foreground" />}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <Bloque icono={FormInput} titulo="Formulario">
                  {campos.map((c) => (
                    <li key={c.clave}>
                      {c.etiqueta} <span className="text-muted-foreground">· {c.tipo}{c.obligatorio ? " · obligatorio" : ""}</span>
                    </li>
                  ))}
                </Bloque>
                <Bloque icono={Paperclip} titulo="Requisitos">
                  {requisitos.map((r) => (
                    <li key={r.clave}>
                      {r.nombre} <span className="text-muted-foreground">{r.obligatorio ? "· obligatorio" : "· opcional"}</span>
                    </li>
                  ))}
                </Bloque>
                <Bloque icono={ScrollText} titulo="Modelos para la IA">
                  {modelos.length === 0 && <li className="text-muted-foreground">Sin modelos: la IA usa la estructura general.</li>}
                  {modelos.map((m) => (
                    <li key={m.nombre}>
                      <FileText className="mr-1 inline size-3" />
                      {TIPOS_ACTUACION[m.tipo_documento]}: {m.nombre} <span className="text-muted-foreground">v{m.version}</span>
                    </li>
                  ))}
                </Bloque>
              </div>
              {t.normativa && <p className="mt-4 text-xs text-muted-foreground">Normativa: {t.normativa}</p>}
            </article>
          )
        })}
      </div>
    </div>
  )
}

function Bloque({ icono: Icono, titulo, children }: { icono: typeof FileText; titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-muted/40 p-4">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        <Icono className="size-3.5" /> {titulo}
      </p>
      <ul className="space-y-1 text-sm">{children}</ul>
    </div>
  )
}
