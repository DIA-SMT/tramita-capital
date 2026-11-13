import Link from "next/link"
import { ArrowLeft, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BloqueFirma } from "@/components/firma/bloque-firma"
import { Markdown } from "@/components/markdown"
import { Membrete } from "@/components/marca"
import { ESTADOS, fechaCorta, fechaHora, leerDatos, leerFormulario, nombreCompleto, TIPOS_ACTUACION } from "@/lib/dominio"
import type { ExpedienteCompleto } from "@/lib/expedientes"
import { codigoLegible, codigoVerificacion, leerSello, urlImagenFirma } from "@/lib/firma"
import { cn } from "@/lib/utils"
import { BotonImprimir } from "./boton-imprimir"

/** Fojas que empiezan hoja nueva al imprimir; las cortas (pases, notas) van seguidas. */
const HOJA_PROPIA = new Set(["presentacion", "informe", "dictamen", "resolucion"])

function tamano(bytes: number | null) {
  if (!bytes) return ""
  return bytes > 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

/**
 * El expediente completo como en papel: carátula con índice de fojas, cada foja con su firma y su
 * código de verificación, la hoja de ruta y la documentación adjunta. Se lee de corrido y se imprime
 * o se guarda en PDF (para Asesoría, un pedido judicial o una copia para el agente).
 */
export function CopiaExpediente({
  datos: d,
  iniciador,
  generada,
  urlVerificacion,
  volver,
  etiquetaVolver = "Volver al expediente",
  demo = false,
}: {
  datos: ExpedienteCompleto
  iniciador: { nombre: string; apellido: string; legajo: string | null; reparticion: string | null } | null
  /** Quién y cuándo generó la copia. */
  generada: { por: string; at: string }
  urlVerificacion: string
  volver: string
  etiquetaVolver?: string
  demo?: boolean
}) {
  const e = d.expediente
  const agente = iniciador ? nombreCompleto(iniciador) : (d.nombres[e.iniciador_id] ?? "—")
  const campos = leerFormulario(d.tipo.formulario)
  const valores = leerDatos(e.datos)
  const hoja = "papel mx-auto w-full max-w-[210mm] rounded-xl px-6 py-8 shadow-xl shadow-primary/5 sm:px-[18mm] sm:py-[14mm] print:max-w-none print:rounded-none print:px-0 print:py-0 print:shadow-none"

  return (
    <div className="rounded-3xl bg-muted/50 px-3 py-5 sm:px-6 print:rounded-none print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-2 print:hidden">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link href={volver}>
            <ArrowLeft /> {etiquetaVolver}
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          {e.reservado && <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-700 dark:text-violet-300">Reservado</span>}
          <BotonImprimir />
        </div>
      </div>

      <div className="space-y-6 print:space-y-0">
        {/* Carátula */}
        <article className={cn(hoja, "print:break-after-page")}>
          <Membrete />
          <p className="mt-10 text-center text-[0.7rem] font-semibold tracking-[0.25em] text-[var(--muted-foreground)] uppercase">Expediente electrónico</p>
          <p className="mt-2 text-center font-mono text-3xl font-semibold tracking-tight tabular">{e.numero}</p>
          <p className="mx-auto mt-3 max-w-md text-center text-lg font-medium text-balance">{e.asunto}</p>

          <dl className="mx-auto mt-8 grid max-w-xl grid-cols-1 gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
            <Dato etiqueta="Iniciado por">
              {agente}
              {iniciador?.legajo && <span className="block text-xs text-[var(--muted-foreground)]">Legajo {iniciador.legajo}</span>}
              {iniciador?.reparticion && <span className="block text-xs text-[var(--muted-foreground)]">{iniciador.reparticion}</span>}
            </Dato>
            <Dato etiqueta="Trámite">{d.tipo.nombre}</Dato>
            <Dato etiqueta="Fecha de inicio">{fechaCorta(e.created_at)}</Dato>
            <Dato etiqueta="Estado">
              {ESTADOS[e.estado].etiqueta}
              {e.resuelto_at && <span className="block text-xs text-[var(--muted-foreground)]">Resuelto el {fechaCorta(e.resuelto_at)}</span>}
            </Dato>
            <Dato etiqueta="Oficina actual">{d.area?.nombre ?? "—"}</Dato>
            <Dato etiqueta="Fojas">{d.fojas.length}</Dato>
          </dl>
          {e.reservado && (
            <p className="mx-auto mt-6 max-w-xl rounded-lg border border-violet-500/30 bg-violet-500/5 px-3 py-2 text-xs text-violet-800">
              Expediente reservado: contiene datos sensibles. Su copia solo se entrega a quien esté autorizado.
            </p>
          )}

          <h2 className="mt-10 border-b pb-2 text-sm font-semibold">Índice de fojas</h2>
          <table className="mt-2 w-full text-left text-xs">
            <thead className="text-[var(--muted-foreground)]">
              <tr>
                <th className="w-12 py-1.5 pr-2 font-medium">Foja</th>
                <th className="py-1.5 pr-2 font-medium">Actuación</th>
                <th className="hidden py-1.5 pr-2 font-medium sm:table-cell">Oficina</th>
                <th className="w-24 py-1.5 text-right font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {d.fojas.map((f) => (
                <tr key={f.id}>
                  <td className="py-1.5 pr-2 font-mono tabular">{f.foja}</td>
                  <td className="py-1.5 pr-2">
                    <a href={`#foja-${f.foja}`} className="hover:underline print:no-underline">
                      {f.titulo}
                    </a>
                    <span className="text-[var(--muted-foreground)]"> · {TIPOS_ACTUACION[f.tipo]}</span>
                  </td>
                  <td className="hidden py-1.5 pr-2 text-[var(--muted-foreground)] sm:table-cell">{f.area ?? "Agente"}</td>
                  <td className="py-1.5 text-right tabular">{f.firmada_at ? fechaCorta(f.firmada_at) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {campos.some((c) => valores[c.clave]) && (
            <>
              <h2 className="mt-8 border-b pb-2 text-sm font-semibold">Datos del pedido</h2>
              <dl className="mt-3 grid grid-cols-1 gap-x-8 gap-y-2 text-xs sm:grid-cols-2">
                {campos
                  .filter((c) => valores[c.clave])
                  .map((c) => (
                    <div key={c.clave}>
                      <dt className="text-[var(--muted-foreground)]">{c.etiqueta}</dt>
                      <dd className="font-medium">{valores[c.clave]}</dd>
                    </div>
                  ))}
              </dl>
            </>
          )}

          <p className="mt-10 border-t pt-3 text-[0.68rem] leading-relaxed text-[var(--muted-foreground)]">
            Copia del expediente electrónico generada el {fechaHora(generada.at)} por {generada.por}. Cada foja está firmada electrónicamente (Ley
            25.506) y encadenada a las anteriores por una huella SHA-256: verificá cualquiera en {urlVerificacion} con el código impreso al pie.
          </p>
        </article>

        {/* Fojas */}
        {d.fojas.map((f) => {
          const sello = leerSello(f.datos)
          const codigo = f.hash ? codigoVerificacion(f.hash) : null
          return (
            <article key={f.id} id={`foja-${f.foja}`} className={cn(hoja, "scroll-mt-20", HOJA_PROPIA.has(f.tipo) ? "print:break-before-page" : "print:mt-10 print:border-t print:pt-8")}>
              {HOJA_PROPIA.has(f.tipo) && <Membrete area={f.area ?? undefined} className="mb-6" />}
              <div className="flex items-baseline justify-between gap-4 text-[0.7rem] text-[var(--muted-foreground)]">
                <span className="font-semibold tracking-wide uppercase">{TIPOS_ACTUACION[f.tipo]}</span>
                <span className="tabular">
                  Expte. N.º {e.numero} · Foja {f.foja}
                </span>
              </div>
              <h2 className="mt-2 text-base font-semibold">{f.titulo}</h2>
              <div className="mt-3">
                <Markdown oficial>{f.contenido}</Markdown>
              </div>
              <div className="mt-8 flex break-inside-avoid flex-wrap items-end justify-between gap-4">
                <p className="max-w-xs text-[0.65rem] leading-relaxed text-[var(--muted-foreground)]">
                  {f.area && <span className="block">{f.area}</span>}
                  {codigo && (
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="size-3 text-emerald-600" /> Código <span className="font-mono font-semibold">{codigoLegible(codigo)}</span>
                    </span>
                  )}
                </p>
                <BloqueFirma
                  sello={sello}
                  firmadaAt={f.firmada_at}
                  hash={f.hash}
                  imagenUrl={sello?.tipo === "olografa" ? urlImagenFirma(f.id, demo) : null}
                  firmante={f.firmada_por ? (d.nombres[f.firmada_por] ?? null) : null}
                />
              </div>
            </article>
          )
        })}

        {/* Hoja de ruta y documentación */}
        <article className={cn(hoja, "print:break-before-page")}>
          <h2 className="text-sm font-semibold">Hoja de ruta</h2>
          <p className="text-xs text-[var(--muted-foreground)]">Cada pase entre oficinas, con fecha, hora y quién lo hizo.</p>
          <ol className="mt-4 space-y-3 text-xs">
            {d.movimientos.map((m) => (
              <li key={m.id} className="grid grid-cols-[6.5rem_1fr] gap-3 break-inside-avoid">
                <span className="text-[var(--muted-foreground)] tabular">{fechaHora(m.created_at)}</span>
                <span>
                  <span className="font-medium">
                    {m.desde ?? "Agente"} → {m.hacia ?? "—"}
                  </span>
                  {m.desde_perfil_id && d.nombres[m.desde_perfil_id] && <span className="text-[var(--muted-foreground)]"> · {d.nombres[m.desde_perfil_id]}</span>}
                  {m.motivo && <span className="block text-[var(--muted-foreground)]">{m.motivo}</span>}
                </span>
              </li>
            ))}
          </ol>

          <h2 className="mt-10 text-sm font-semibold">Documentación adjunta</h2>
          {d.documentos.length === 0 ? (
            <p className="mt-2 text-xs text-[var(--muted-foreground)]">Sin documentos adjuntos.</p>
          ) : (
            <ul className="mt-3 divide-y divide-[var(--border)] text-xs">
              {d.documentos.map((doc) => (
                <li key={doc.id} className="flex items-baseline justify-between gap-3 py-1.5">
                  <span className="min-w-0 truncate">{doc.nombre_archivo}</span>
                  <span className="shrink-0 text-[var(--muted-foreground)] tabular">
                    {tamano(doc.tamano_bytes)} · {fechaCorta(doc.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[0.65rem] text-[var(--muted-foreground)]">Los archivos originales se descargan desde el expediente electrónico.</p>
        </article>
      </div>
    </div>
  )
}

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-[var(--muted-foreground)]">{etiqueta}</dt>
      <dd className="mt-0.5 font-medium">{children}</dd>
    </div>
  )
}
