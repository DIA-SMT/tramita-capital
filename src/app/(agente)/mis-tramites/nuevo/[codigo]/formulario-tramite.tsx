"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check, Loader2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
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
type Etapa = "editando" | "creando" | "subiendo" | "listo"

export function FormularioTramite({
  codigo,
  nombre,
  campos,
  requisitos,
  pasos,
}: {
  codigo: string
  nombre: string
  campos: CampoFormulario[]
  requisitos: Requisito[]
  pasos: Paso[]
}) {
  const router = useRouter()
  const [valores, setValores] = useState<Record<string, string>>({})
  const [asunto, setAsunto] = useState("")
  const [archivos, setArchivos] = useState<Record<string, File | null>>({})
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [etapa, setEtapa] = useState<Etapa>("editando")
  const [avance, setAvance] = useState("")

  const ocupado = etapa !== "editando"

  function validar() {
    const e: Record<string, string> = {}
    for (const c of campos) {
      const v = (valores[c.clave] ?? "").trim()
      if (c.obligatorio && !v) e[c.clave] = "Este dato es obligatorio"
      if (v && c.tipo === "numero" && Number.isNaN(Number(v))) e[c.clave] = "Ingresá un número"
    }
    for (const r of requisitos) {
      if (r.obligatorio && !archivos[r.clave]) e[`archivo:${r.clave}`] = "Adjuntá este documento"
    }
    setErrores(e)
    return Object.keys(e).length === 0
  }

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    if (!validar()) {
      toast.error("Faltan datos o documentos obligatorios")
      return
    }

    setEtapa("creando")
    const titulo = asunto.trim() || `${nombre}${valores[campos[0]?.clave] ? ` — ${valores[campos[0].clave]}` : ""}`
    const resultado = await iniciarTramite({ codigo, asunto: titulo, datos: valores })
    if (!resultado.ok) {
      setEtapa("editando")
      toast.error(resultado.error)
      return
    }

    const pendientes = requisitos
      .filter((r) => archivos[r.clave])
      .map((r) => ({ file: archivos[r.clave]!, requisito_clave: r.clave, etiqueta: r.nombre }))

    if (pendientes.length > 0) {
      setEtapa("subiendo")
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

    setEtapa("listo")
    toast.success(`Trámite ${resultado.numero} iniciado`, { description: "Te vamos a avisar cada vez que avance." })
    router.push(`/mis-tramites/${resultado.id}?nuevo=1`)
  }

  return (
    <form onSubmit={enviar} className="grid gap-6 lg:grid-cols-[1fr_18rem]" noValidate>
      <div className="space-y-6">
        <section className="rounded-2xl border bg-card p-5 sm:p-6">
          <h2 className="font-medium">Datos de la solicitud</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {campos.map((c) => (
              <div key={c.clave} className={cn("grid gap-2", c.tipo === "texto_largo" && "sm:col-span-2")}>
                <Label htmlFor={c.clave}>
                  {c.etiqueta} {c.obligatorio && <span className="text-destructive">*</span>}
                </Label>
                <Campo
                  campo={c}
                  valor={valores[c.clave] ?? ""}
                  invalido={Boolean(errores[c.clave])}
                  alCambiar={(v) => setValores((s) => ({ ...s, [c.clave]: v }))}
                  deshabilitado={ocupado}
                />
                {errores[c.clave] ? (
                  <p className="text-xs text-destructive">{errores[c.clave]}</p>
                ) : (
                  c.ayuda && <p className="text-xs text-muted-foreground">{c.ayuda}</p>
                )}
              </div>
            ))}
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="asunto">
                Asunto <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="asunto"
                value={asunto}
                onChange={(e) => setAsunto(e.target.value)}
                placeholder={`Ej.: ${nombre}`}
                maxLength={300}
                disabled={ocupado}
              />
            </div>
          </div>
        </section>

        {requisitos.length > 0 && (
          <section className="rounded-2xl border bg-card p-5 sm:p-6">
            <h2 className="font-medium">Documentación</h2>
            <p className="mt-1 text-sm text-muted-foreground">PDF o foto (JPG, PNG). Hasta 20 MB por archivo.</p>
            <div className="mt-5 grid gap-3">
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
          </section>
        )}
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
        </div>
        <Button type="submit" size="lg" className="h-11 w-full text-base" disabled={ocupado}>
          {etapa === "editando" && (
            <>
              <Send /> Iniciar trámite
            </>
          )}
          {etapa === "creando" && (
            <>
              <Loader2 className="animate-spin" /> Creando expediente…
            </>
          )}
          {etapa === "subiendo" && (
            <>
              <Loader2 className="animate-spin" /> Subiendo documentos {avance}
            </>
          )}
          {etapa === "listo" && (
            <>
              <Check /> ¡Listo!
            </>
          )}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Al iniciar, declarás que los datos son correctos. Tu presentación queda firmada electrónicamente con tu usuario.
        </p>
      </aside>
    </form>
  )
}

function Campo({
  campo,
  valor,
  invalido,
  alCambiar,
  deshabilitado,
}: {
  campo: CampoFormulario
  valor: string
  invalido: boolean
  alCambiar: (v: string) => void
  deshabilitado: boolean
}) {
  if (campo.tipo === "texto_largo") {
    return (
      <Textarea id={campo.clave} value={valor} onChange={(e) => alCambiar(e.target.value)} aria-invalid={invalido} rows={4} disabled={deshabilitado} />
    )
  }
  if (campo.tipo === "seleccion") {
    return (
      <Select value={valor} onValueChange={alCambiar} disabled={deshabilitado}>
        <SelectTrigger id={campo.clave} aria-invalid={invalido} className="w-full">
          <SelectValue placeholder="Elegí una opción" />
        </SelectTrigger>
        <SelectContent>
          {(campo.opciones ?? []).map((o) => (
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
      value={valor}
      onChange={(e) => alCambiar(e.target.value)}
      aria-invalid={invalido}
      disabled={deshabilitado}
    />
  )
}
