import Link from "next/link"
import { Banknote, ChevronRight, FileText, FolderLock, Lock, Mail, Phone, ShieldAlert } from "lucide-react"
import { IconoTramite } from "@/components/icono-tramite"
import { InsigniaEstado } from "@/components/insignias"
import { ListaLegajo } from "@/components/legajo"
import { ESTADOS_ACTIVOS, fechaCorta, iniciales } from "@/lib/dominio"
import { ESTADOS_NOVEDAD, MOVIMIENTOS, periodo } from "@/lib/novedades"
import { cn } from "@/lib/utils"
import type { FichaAgente } from "@/lib/vistas"

/**
 * Ficha de un agente para Capital Humano: sus datos, sus trámites, lo que quedó en su legajo digital y
 * sus novedades de haberes, en un solo lugar. Reemplaza buscar la carpeta del legajo en el archivo.
 */
export function VistaFichaAgente({ ficha: f, base = "", demo = false }: { ficha: FichaAgente; base?: string; demo?: boolean }) {
  const enCurso = f.tramites.filter((t) => ESTADOS_ACTIVOS.includes(t.estado)).length
  const resueltos = f.tramites.filter((t) => t.resuelto_at).length
  const [nombre, ...resto] = f.nombre.split(" ")

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-col gap-5 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center sm:p-6">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-marca-2 to-marca-1 text-lg font-semibold text-white shadow-lg shadow-primary/20">
          {iniciales({ nombre, apellido: resto.join(" ") })}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">Agente municipal</p>
          <h1 className="text-2xl font-semibold tracking-tight">{f.nombre}</h1>
          {f.perfil ? (
            <>
              <p className="mt-1 text-sm text-muted-foreground">
                {[f.perfil.legajo && `Legajo ${f.perfil.legajo}`, f.perfil.cuil && `CUIL ${f.perfil.cuil}`, f.perfil.reparticion, f.perfil.categoria && `Categoría ${f.perfil.categoria}`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <Mail className="size-3.5 shrink-0 text-muted-foreground" /> <span className="truncate">{f.perfil.email}</span>
                </span>
                {f.perfil.telefono && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="size-3.5 text-muted-foreground" /> {f.perfil.telefono}
                  </span>
                )}
              </p>
            </>
          ) : (
            <p className="mt-2 flex items-start gap-1.5 text-sm text-muted-foreground">
              <ShieldAlert className="mt-0.5 size-4 shrink-0" />
              Ves solo el nombre. El legajo, el CUIL y el contacto los ven las áreas que tienen, tuvieron o liquidan sus trámites.
            </p>
          )}
        </div>
        <dl className="grid shrink-0 grid-cols-3 gap-4 border-t pt-4 text-center sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6">
          <Dato etiqueta="Trámites" valor={f.tramites.length} />
          <Dato etiqueta="En curso" valor={enCurso} />
          <Dato etiqueta="Resueltos" valor={resueltos} />
        </dl>
      </header>

      <section aria-labelledby="ficha-tramites">
        <h2 id="ficha-tramites" className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <FileText className="size-4" /> Trámites
        </h2>
        {f.tramites.length === 0 ? (
          <p className="rounded-2xl border border-dashed bg-card/50 px-4 py-8 text-center text-sm text-muted-foreground">No hay trámites que puedas ver.</p>
        ) : (
          <ul className="divide-y rounded-2xl border bg-card">
            {f.tramites.map((t) => (
              <li key={t.id}>
                <Link href={`${base}/expedientes/${t.id}`} className="group flex items-center gap-3 p-4 transition-colors hover:bg-muted/40">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <IconoTramite icono={t.tipo.icono} className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{t.tipo.nombre}</span>
                      <InsigniaEstado estado={t.estado} />
                      {t.reservado && <Lock className="size-3.5 text-violet-600" aria-label="Reservado" />}
                    </span>
                    {t.asunto !== t.tipo.nombre && <span className="block truncate text-sm text-muted-foreground">{t.asunto}</span>}
                    <span className="block text-xs text-muted-foreground">
                      <span className="font-mono tabular">{t.numero}</span> · iniciado el {fechaCorta(t.created_at)}
                      {t.resuelto_at ? ` · resuelto el ${fechaCorta(t.resuelto_at)}` : t.area ? ` · en ${t.area}` : ""}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="ficha-legajo">
        <h2 id="ficha-legajo" className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <FolderLock className="size-4" /> Legajo digital
        </h2>
        <ListaLegajo
          entradas={f.legajo}
          rutaTramite="expedientes"
          vacio="Todavía no hay nada en su legajo digital que puedas ver. Las resoluciones llegan solas al firmarse."
          base={base}
          demo={demo}
        />
      </section>

      {f.novedades && (
        <section aria-labelledby="ficha-novedades">
          <h2 id="ficha-novedades" className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Banknote className="size-4" /> Novedades de haberes
          </h2>
          {f.novedades.length === 0 ? (
            <p className="rounded-2xl border border-dashed bg-card/50 px-4 py-8 text-center text-sm text-muted-foreground">Sin novedades de haberes.</p>
          ) : (
            <ul className="divide-y rounded-2xl border bg-card">
              {f.novedades.map((n) => (
                <li key={n.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-4 text-sm">
                  <span className="font-medium">
                    {MOVIMIENTOS[n.movimiento]} · {n.concepto}
                  </span>
                  <span className="text-muted-foreground">desde {periodo(n.vigenciaDesde)}</span>
                  {n.resolucion && <span className="font-mono text-xs text-muted-foreground tabular">Res. {n.resolucion}</span>}
                  <span className={cn("ml-auto rounded-full px-2.5 py-0.5 text-xs font-medium", ESTADOS_NOVEDAD[n.estado].clase)}>{ESTADOS_NOVEDAD[n.estado].etiqueta}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <div className="flex flex-col-reverse">
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="text-2xl font-semibold tracking-tight tabular">{valor}</dd>
    </div>
  )
}
