"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, ArrowRight, Check, CloudCheck, FileCheck2, Loader2, Pencil, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { SelectorArchivo } from "@/components/expediente/selector-archivo"
import { subirDocumentos } from "@/components/expediente/subir-documentos"
import type { CampoFormulario, Requisito } from "@/lib/dominio"
import { cn } from "@/lib/utils"
import { iniciarTramite } from "../../acciones"

type Paso = { orden: number; nombre: string; area: string }
type Envio = "editando" | "creando" | "subiendo" | "listo"

function mostrarValor(c: CampoFormulario, v: string) {
  if (!v) return "—"
  if (c.tipo === "fecha") {
    const [a, m, d] = v.split("-")
    return d && m && a ? `${d}/${m}/${a}` : v
  }
  return v
}

/**
 * Asistente de inicio de trámite en 3 pasos: datos → documentación → revisión.
 * Guarda lo escrito en el dispositivo para no perderlo si se corta la conexión.
 */
export function FormularioTramite({
  codigo,
  nombre,
  campos,
  requisitos,
  pasos,
  base = "",
  demo = false,
}: {
  codigo: string
  nombre: string
  campos: CampoFormulario[]
  requisitos: Requisito[]
  pasos: Paso[]
  base?: string
  demo?: boolean
}) {
  const router = useRouter()
  const claveBorrador = `tramita:borrador:${codigo}`
  const etapas = [
    { clave: "datos", titulo: "Tus datos" },
    ...(requisitos.length ? [{ clave: "documentos", titulo: "Documentación" }] : []),
    { clave: "revision", titulo: "Revisá y enviá" },
  ] as const
  const [etapa, setEtapa] = useState(0)
  const [valores, setValores] = useState<Record<string, string>>({})
  const [asunto, setAsunto] = useState("")
  const [archivos, setArchivos] = useState<Record<string, File | null>>({})
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [declaracion, setDeclaracion] = useState(false)
  const [envio, setEnvio] = useState<Envio>("editando")
  const [avance, setAvance] = useState("")
  const [guardadoLocal, setGuardadoLocal] = useState(false)
  const restaurado = useRef(false)
  const titulo = useRef<HTMLHeadingElement>(null)

  const actual = etapas[etapa]
  const ocupado = envio !== "editando"

  // Recupera un borrador guardado en este dispositivo.
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const crudo = localStorage.getItem(claveBorrador)
        if (crudo) {
          const b = JSON.parse(crudo) as { valores?: Record<string, string>; asunto?: string }
          if (b.valores && Object.values(b.valores).some(Boolean)) {
            setValores(b.valores)
            setAsunto(b.asunto ?? "")
            toast.info("Recuperamos lo que habías cargado", {
              action: {
                label: "Empezar de cero",
                onClick: () => {
                  setValores({})
                  setAsunto("")
                  try {
                    localStorage.removeItem(claveBorrador)
                  } catch {}
                },
              },
            })
          }
        }
      } catch {}
      restaurado.current = true
    }, 0)
    return () => clearTimeout(t)
  }, [claveBorrador])

  // Autoguardado local (sin archivos).
  useEffect(() => {
    if (!restaurado.current || ocupado) return
    const t = setTimeout(() => {
      try {
        localStorage.setItem(claveBorrador, JSON.stringify({ valores, asunto }))
        setGuardadoLocal(true)
      } catch {}
    }, 600)
    return () => clearTimeout(t)
  }, [valores, asunto, claveBorrador, ocupado])

  function irA(i: number) {
    setEtapa(i)
    requestAnimationFrame(() => {
      titulo.current?.focus()
      window.scrollTo({ top: 0, behavior: "smooth" })
    })
  }

  function validarDatos() {
    const e: Record<string, string> = {}
    for (const c of campos) {
      const v = (valores[c.clave] ?? "").trim()
      if (c.obligatorio && !v) e[c.clave] = "Este dato es obligatorio"
      if (v && c.tipo === "numero" && (Number.isNaN(Number(v)) || Number(v) < 0)) e[c.clave] = "Ingresá un número válido"
    }
    setErrores((x) => ({ ...Object.fromEntries(Object.entries(x).filter(([k]) => k.startsWith("archivo:"))), ...e }))
    return Object.keys(e).length === 0
  }

  function validarDocumentos() {
    const e: Record<string, string> = {}
    for (const r of requisitos) if (r.obligatorio && !archivos[r.clave]) e[`archivo:${r.clave}`] = "Adjuntá este documento"
    setErrores((x) => ({ ...Object.fromEntries(Object.entries(x).filter(([k]) => !k.startsWith("archivo:"))), ...e }))
    return Object.keys(e).length === 0
  }

  /** Lleva el foco al primer campo con error para que no haya que buscarlo. */
  function enfocarPrimerError() {
    requestAnimationFrame(() => {
      const campo = document.querySelector<HTMLElement>('[aria-invalid="true"], [data-error="true"]')
      campo?.scrollIntoView({ behavior: "smooth", block: "center" })
      campo?.focus({ preventScroll: true })
    })
  }

  function continuar() {
    const ok = actual.clave === "datos" ? validarDatos() : actual.clave === "documentos" ? validarDocumentos() : true
    if (!ok) {
      toast.error("Revisá los campos marcados")
      enfocarPrimerError()
      return
    }
    irA(etapa + 1)
  }

  async function enviar() {
    if (!validarDatos()) return irA(0)
    if (requisitos.length && !validarDocumentos()) return irA(1)

    setEnvio("creando")
    const tituloTramite = asunto.trim() || `${nombre}${valores[campos[0]?.clave] ? ` — ${valores[campos[0].clave]}` : ""}`

    if (demo) {
      await new Promise((r) => setTimeout(r, 700))
      setEnvio("subiendo")
      setAvance("1/1")
      await new Promise((r) => setTimeout(r, 700))
      setEnvio("listo")
      toast.success("Vista previa: trámite CH-2026-000007 iniciado")
      router.push(`${base}/mis-tramites/demo-licencia?nuevo=1`)
      return
    }

    const resultado = await iniciarTramite({ codigo, asunto: tituloTramite, datos: valores })
    if (!resultado.ok) {
      setEnvio("editando")
      toast.error(resultado.error)
      return
    }

    const pendientes = requisitos
      .filter((r) => archivos[r.clave])
      .map((r) => ({ file: archivos[r.clave]!, requisito_clave: r.clave, etiqueta: r.nombre }))

    if (pendientes.length > 0) {
      setEnvio("subiendo")
      try {
        await subirDocumentos(resultado.id, pendientes, (hechos, total) => setAvance(`${hechos}/${total}`))
      } catch (e) {
        toast.error(`El trámite ${resultado.numero} se inició, pero falló la carga de archivos`, {
          description: e instanceof Error ? e.message : "Podés adjuntarlos desde el detalle del trámite.",
        })
        router.push(`/mis-tramites/${resultado.id}`)
        return
      }
    }

    try {
      localStorage.removeItem(claveBorrador)
    } catch {}
    setEnvio("listo")
    router.push(`/mis-tramites/${resultado.id}?nuevo=1`)
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_18rem]">
      <div className="space-y-5">
        {/* Indicador de pasos */}
        <ol className="flex items-center gap-2" aria-label="Pasos">
          {etapas.map((e, i) => (
            <li key={e.clave} className="flex flex-1 items-center gap-2">
              <button
                type="button"
                disabled={i >= etapa || ocupado}
                onClick={() => irA(i)}
                aria-current={i === etapa ? "step" : undefined}
                className="flex min-w-0 items-center gap-2 disabled:cursor-default"
              >
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold transition-colors",
                    i < etapa && "bg-primary text-primary-foreground",
                    i === etapa && "bg-primary/10 text-primary ring-2 ring-primary",
                    i > etapa && "bg-muted text-muted-foreground",
                  )}
                >
                  {i < etapa ? <Check className="size-3.5" /> : i + 1}
                </span>
                <span className={cn("hidden truncate text-sm sm:inline", i === etapa ? "font-medium" : "text-muted-foreground")}>{e.titulo}</span>
              </button>
              {i < etapas.length - 1 && <span className={cn("h-px flex-1", i < etapa ? "bg-primary" : "bg-border")} />}
            </li>
          ))}
        </ol>

        <section className="rounded-2xl border bg-card p-5 animate-in fade-in slide-in-from-bottom-1 sm:p-6" key={actual.clave}>
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Paso {etapa + 1} de {etapas.length}
              </p>
              <h2 ref={titulo} tabIndex={-1} className="text-lg font-semibold tracking-tight outline-none">
                {actual.titulo}
              </h2>
            </div>
            {guardadoLocal && actual.clave === "datos" && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <CloudCheck className="size-3.5" /> Guardado en este dispositivo
              </span>
            )}
          </div>

          {actual.clave === "datos" && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {campos.map((c) => (
                <div key={c.clave} className={cn("grid gap-2", c.tipo === "texto_largo" && "sm:col-span-2")}>
                  <Label htmlFor={c.clave}>
                    {c.etiqueta} {c.obligatorio && <span className="text-destructive">*</span>}
                  </Label>
                  <Campo
                    campo={c}
                    valor={valores[c.clave] ?? ""}
                    invalido={Boolean(errores[c.clave])}
                    alCambiar={(v) => {
                      setValores((s) => ({ ...s, [c.clave]: v }))
                      if (errores[c.clave]) setErrores((x) => ({ ...x, [c.clave]: "" }))
                    }}
                  />
                  {errores[c.clave] ? (
                    <p className="text-xs text-destructive" role="alert">
                      {errores[c.clave]}
                    </p>
                  ) : (
                    c.ayuda && <p className="text-xs text-muted-foreground">{c.ayuda}</p>
                  )}
                </div>
              ))}
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="asunto">
                  Asunto <span className="font-normal text-muted-foreground">(opcional)</span>
                </Label>
                <Input id="asunto" value={asunto} onChange={(e) => setAsunto(e.target.value)} placeholder={`Ej.: ${nombre}`} maxLength={300} />
                <p className="text-xs text-muted-foreground">Si lo dejás vacío, lo armamos con los datos que cargaste.</p>
              </div>
            </div>
          )}

          {actual.clave === "documentos" && (
            <div className="grid gap-3">
              <p className="-mt-2 mb-1 text-sm text-muted-foreground">
                Podés sacarle una foto al documento con el celular. PDF o imagen, hasta 20 MB por archivo.
              </p>
              {requisitos.map((r) => (
                <SelectorArchivo
                  key={r.clave}
                  titulo={r.nombre}
                  descripcion={r.descripcion}
                  obligatorio={r.obligatorio}
                  archivo={archivos[r.clave] ?? null}
                  error={errores[`archivo:${r.clave}`]}
                  alCambiar={(f, error) => {
                    setArchivos((s) => ({ ...s, [r.clave]: f }))
                    setErrores((s) => ({ ...s, [`archivo:${r.clave}`]: error ?? "" }))
                  }}
                />
              ))}
            </div>
          )}

          {actual.clave === "revision" && (
            <div className="space-y-5">
              <Resumen titulo="Datos" alEditar={() => irA(0)} deshabilitado={ocupado}>
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {campos.map((c) => (
                    <div key={c.clave}>
                      <dt className="text-xs text-muted-foreground">{c.etiqueta}</dt>
                      <dd className="text-sm font-medium break-words">{mostrarValor(c, valores[c.clave] ?? "")}</dd>
                    </div>
                  ))}
                </dl>
              </Resumen>
              {requisitos.length > 0 && (
                <Resumen titulo="Documentación" alEditar={() => irA(1)} deshabilitado={ocupado}>
                  <ul className="space-y-1.5">
                    {requisitos.map((r) => (
                      <li key={r.clave} className="flex items-center gap-2 text-sm">
                        {archivos[r.clave] ? (
                          <FileCheck2 className="size-4 shrink-0 text-emerald-600" />
                        ) : (
                          <span className="size-4 shrink-0 rounded-full border border-dashed" />
                        )}
                        <span className="min-w-0 flex-1 truncate">
                          {r.nombre}
                          {archivos[r.clave] && <span className="text-muted-foreground"> · {archivos[r.clave]!.name}</span>}
                        </span>
                        {!archivos[r.clave] && <span className="text-xs text-muted-foreground">{r.obligatorio ? "Falta" : "Después"}</span>}
                      </li>
                    ))}
                  </ul>
                </Resumen>
              )}
              <div className="flex items-start gap-2.5 rounded-xl bg-muted/50 p-4">
                <Checkbox id="declaracion" checked={declaracion} onCheckedChange={(v) => setDeclaracion(v === true)} className="mt-0.5" disabled={ocupado} />
                <Label htmlFor="declaracion" className="text-sm leading-snug font-normal">
                  Declaro que los datos son correctos y que la documentación es auténtica. Mi presentación queda firmada electrónicamente con mi
                  usuario.
                </Label>
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between gap-3 border-t pt-5">
            {etapa > 0 ? (
              <Button type="button" variant="ghost" onClick={() => irA(etapa - 1)} disabled={ocupado}>
                <ArrowLeft /> Atrás
              </Button>
            ) : (
              <span />
            )}
            {actual.clave !== "revision" ? (
              <Button type="button" onClick={continuar} size="lg" className="h-10">
                Continuar <ArrowRight data-icon="inline-end" />
              </Button>
            ) : (
              <Button type="button" onClick={enviar} size="lg" className="h-10" disabled={!declaracion || ocupado}>
                {envio === "editando" && (
                  <>
                    <Send /> Iniciar trámite
                  </>
                )}
                {envio === "creando" && (
                  <>
                    <Loader2 className="animate-spin" /> Creando expediente…
                  </>
                )}
                {envio === "subiendo" && (
                  <>
                    <Loader2 className="animate-spin" /> Subiendo documentos {avance}
                  </>
                )}
                {envio === "listo" && (
                  <>
                    <Check /> ¡Listo!
                  </>
                )}
              </Button>
            )}
          </div>
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-2xl border bg-card p-5">
          <h2 className="text-sm font-medium">Cómo sigue tu trámite</h2>
          <ol className="mt-4 space-y-3">
            {pasos.map((p) => (
              <li key={p.orden} className="flex gap-3 text-sm">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-medium tabular">{p.orden}</span>
                <span>
                  <span className="block leading-tight">{p.nombre}</span>
                  <span className="text-xs text-muted-foreground">{p.area}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-muted-foreground">Te avisamos por email y WhatsApp cada vez que avanza.</p>
        </div>
      </aside>
    </div>
  )
}

function Resumen({ titulo, alEditar, deshabilitado, children }: { titulo: string; alEditar: () => void; deshabilitado?: boolean; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium">{titulo}</h3>
        <Button type="button" variant="ghost" size="xs" onClick={alEditar} disabled={deshabilitado}>
          <Pencil /> Editar
        </Button>
      </div>
      {children}
    </div>
  )
}

function Campo({
  campo,
  valor,
  invalido,
  alCambiar,
}: {
  campo: CampoFormulario
  valor: string
  invalido: boolean
  alCambiar: (v: string) => void
}) {
  if (campo.tipo === "texto_largo") {
    return <Textarea id={campo.clave} value={valor} onChange={(e) => alCambiar(e.target.value)} aria-invalid={invalido} rows={4} />
  }
  if (campo.tipo === "seleccion") {
    const opciones = campo.opciones ?? []
    if (opciones.length <= 4) {
      return (
        <div
          id={campo.clave}
          className="flex flex-wrap gap-2 rounded-lg outline-none"
          role="radiogroup"
          aria-label={campo.etiqueta}
          aria-invalid={invalido || undefined}
          tabIndex={invalido ? -1 : undefined}
        >
          {opciones.map((o) => (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={valor === o}
              onClick={() => alCambiar(o)}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm transition-colors",
                valor === o ? "border-primary bg-primary/10 font-medium text-primary" : "hover:bg-muted",
                invalido && !valor && "border-destructive/60",
              )}
            >
              {o}
            </button>
          ))}
        </div>
      )
    }
    return (
      <Select value={valor} onValueChange={alCambiar}>
        <SelectTrigger id={campo.clave} aria-invalid={invalido} className="h-10 w-full">
          <SelectValue placeholder="Elegí una opción" />
        </SelectTrigger>
        <SelectContent>
          {opciones.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }
  return (
    <Input
      id={campo.clave}
      type={campo.tipo === "fecha" ? "date" : campo.tipo === "numero" ? "number" : "text"}
      inputMode={campo.tipo === "numero" ? "numeric" : undefined}
      min={campo.tipo === "numero" ? 0 : undefined}
      value={valor}
      onChange={(e) => alCambiar(e.target.value)}
      aria-invalid={invalido}
      className="h-10"
    />
  )
}
