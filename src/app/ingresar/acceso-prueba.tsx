"use client"

import { useState, useTransition } from "react"
import { Loader2 } from "lucide-react"
import { USUARIOS_PRUEBA } from "@/lib/usuarios-prueba"
import { entrarComoPrueba } from "./acciones"

/** Un botón por usuario de prueba: un clic y entra. */
export function AccesoPrueba({ volver }: { volver: string }) {
  const [entrando, setEntrando] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, iniciar] = useTransition()

  function entrar(email: string) {
    setError(null)
    setEntrando(email)
    iniciar(async () => {
      const r = await entrarComoPrueba(email, volver)
      if (r?.error) {
        setError(r.error)
        setEntrando(null)
      }
    })
  }

  return (
    <div className="grid gap-3">
      <ul className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
        {USUARIOS_PRUEBA.map((u) => (
          <li key={u.email}>
            <button
              type="button"
              onClick={() => entrar(u.email)}
              disabled={entrando !== null}
              className="flex h-full w-full flex-col items-start gap-0.5 rounded-xl border bg-background px-3 py-2.5 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-60"
            >
              <span className="flex items-center gap-1.5 text-sm font-medium">
                {entrando === u.email && <Loader2 className="size-3.5 animate-spin" />}
                {u.nombre}
              </span>
              <span className="text-xs leading-snug text-muted-foreground">{u.hace}</span>
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
