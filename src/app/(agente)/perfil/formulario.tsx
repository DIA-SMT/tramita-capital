"use client"

import { useActionState, useEffect } from "react"
import { toast } from "sonner"
import { Loader2, MessageCircle, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { actualizarPerfil, type EstadoPerfil } from "./acciones"

type Perfil = { nombre: string; apellido: string; telefono: string | null }

export function FormularioPerfil({ perfil, demo = false }: { perfil: Perfil; demo?: boolean }) {
  const [estado, accion, guardando] = useActionState<EstadoPerfil, FormData>(
    demo ? async () => ({ ok: true }) : actualizarPerfil,
    undefined,
  )

  useEffect(() => {
    if (estado?.ok) toast.success(demo ? "Vista previa: perfil actualizado" : "Perfil actualizado")
    else if (estado?.error && !estado.campos) toast.error(estado.error)
  }, [estado, demo])

  return (
    <form action={accion} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <div className="grid gap-2">
        <Label htmlFor="nombre">Nombre</Label>
        <Input id="nombre" name="nombre" defaultValue={perfil.nombre} autoComplete="given-name" aria-invalid={!!estado?.campos?.nombre} className="h-10" />
        {estado?.campos?.nombre && <p className="text-xs text-destructive">{estado.campos.nombre}</p>}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="apellido">Apellido</Label>
        <Input id="apellido" name="apellido" defaultValue={perfil.apellido} autoComplete="family-name" aria-invalid={!!estado?.campos?.apellido} className="h-10" />
        {estado?.campos?.apellido && <p className="text-xs text-destructive">{estado.campos.apellido}</p>}
      </div>
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="telefono" className="flex items-center gap-1.5">
          <MessageCircle className="size-4 text-emerald-600" /> Celular para avisos por WhatsApp
        </Label>
        <Input
          id="telefono"
          name="telefono"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          defaultValue={perfil.telefono ?? ""}
          placeholder="381 555 1234"
          aria-invalid={!!estado?.campos?.telefono}
          className="h-10 max-w-xs"
        />
        {estado?.campos?.telefono ? (
          <p className="text-xs text-destructive">{estado.campos.telefono}</p>
        ) : (
          <p className="text-xs text-muted-foreground">Migue, el asistente del municipio, te avisa por este número cuando tu trámite avanza.</p>
        )}
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={guardando}>
          {guardando ? <Loader2 className="animate-spin" /> : <Save />} Guardar cambios
        </Button>
      </div>
    </form>
  )
}
