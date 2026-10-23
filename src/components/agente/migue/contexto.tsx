"use client"

import { createContext, useContext, useRef, useState } from "react"
import { respuestaDemo, type DatosAsistente } from "@/lib/asistente"

export type MensajeMigue = { rol: "usuario" | "asistente"; texto: string; error?: boolean }

type Contexto = { expedienteId?: string | null; pantalla?: string }

type ValorMigue = {
  nombre: string
  mensajes: MensajeMigue[]
  generando: boolean
  restantes: number
  disponible: boolean
  habilitado: boolean
  demo: boolean
  base: string
  preguntar: (texto: string, contexto?: Contexto) => Promise<void>
  detener: () => void
  reiniciar: () => void
}

const MigueContexto = createContext<ValorMigue | null>(null)

/** La conversación sin los intercambios fallidos, para que siempre alterne persona → Migue. */
function historialValido(mensajes: MensajeMigue[]) {
  const pares: MensajeMigue[] = []
  for (let i = 0; i + 1 < mensajes.length; i += 2) {
    if (!mensajes[i + 1].error) pares.push(mensajes[i], mensajes[i + 1])
  }
  return pares.map(({ rol, texto }) => ({ rol, texto }))
}

/**
 * Una sola conversación con Migue en todo el portal: la burbuja flotante y la pantalla
 * de Migue comparten el hilo, que dura mientras la persona navega (no se guarda en la base).
 */
export function MigueProvider({
  nombre,
  restantes: restantesIniciales,
  disponible,
  base = "",
  demo = false,
  datosDemo,
  children,
}: {
  nombre: string
  restantes: number
  disponible: boolean
  base?: string
  demo?: boolean
  datosDemo?: DatosAsistente
  children: React.ReactNode
}) {
  const [mensajes, setMensajes] = useState<MensajeMigue[]>([])
  const [generando, setGenerando] = useState(false)
  const [restantes, setRestantes] = useState(restantesIniciales)
  const cancelador = useRef<AbortController | null>(null)
  const habilitado = demo || (disponible && restantes > 0)

  const agregar = (delta: string) =>
    setMensajes((m) => {
      const ultimo = m.at(-1)!
      return [...m.slice(0, -1), { ...ultimo, texto: ultimo.texto + delta }]
    })

  async function preguntar(texto: string, contexto: Contexto = {}) {
    const pregunta = texto.trim()
    if (!pregunta || generando || !habilitado) return
    const previos = historialValido(mensajes)
    setMensajes((m) => [...m, { rol: "usuario", texto: pregunta }, { rol: "asistente", texto: "" }])
    setGenerando(true)

    if (demo && datosDemo) {
      await new Promise((r) => setTimeout(r, 500))
      for (const palabra of respuestaDemo(pregunta, { ...datosDemo, enfocado: contexto.expedienteId ?? null }, base).split(/(?<=\s)/)) {
        await new Promise((r) => setTimeout(r, 16))
        agregar(palabra)
      }
      return setGenerando(false)
    }

    cancelador.current = new AbortController()
    try {
      const r = await fetch("/api/ia/asistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expedienteId: contexto.expedienteId ?? undefined,
          pantalla: contexto.pantalla,
          mensajes: [...previos, { rol: "usuario", texto: pregunta }],
        }),
        signal: cancelador.current.signal,
      })
      if (!r.ok || !r.body) throw new Error((await r.json().catch(() => null))?.error ?? "Migue no pudo responder")
      const quedan = Number(r.headers.get("X-Consultas-Restantes"))
      if (Number.isFinite(quedan)) setRestantes(quedan)
      const lector = r.body.getReader()
      const decodificador = new TextDecoder()
      for (;;) {
        const { done, value } = await lector.read()
        if (done) break
        agregar(decodificador.decode(value, { stream: true }))
      }
    } catch (e) {
      const cancelado = e instanceof DOMException && e.name === "AbortError"
      setMensajes((m) => [
        ...m.slice(0, -1),
        { rol: "asistente", texto: cancelado ? m.at(-1)!.texto || "Consulta cancelada." : e instanceof Error ? e.message : "Migue no pudo responder", error: true },
      ])
    } finally {
      setGenerando(false)
    }
  }

  const valor: ValorMigue = {
    nombre,
    mensajes,
    generando,
    restantes,
    disponible,
    habilitado,
    demo,
    base,
    preguntar,
    detener: () => cancelador.current?.abort(),
    reiniciar: () => {
      cancelador.current?.abort()
      setMensajes([])
    },
  }
  return <MigueContexto value={valor}>{children}</MigueContexto>
}

export function useMigue() {
  const valor = useContext(MigueContexto)
  if (!valor) throw new Error("useMigue necesita <MigueProvider>")
  return valor
}
