"use client"

import { useActionState } from "react"
import { KeyRound, Loader2, MailCheck, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { enviarEnlace, ingresarConClave, type EstadoIngreso } from "./acciones"

export function FormularioIngreso({ volver }: { volver: string }) {
  const [estadoEnlace, accionEnlace, enviandoEnlace] = useActionState<EstadoIngreso, FormData>(enviarEnlace, undefined)
  const [estadoClave, accionClave, enviandoClave] = useActionState<EstadoIngreso, FormData>(ingresarConClave, undefined)

  if (estadoEnlace?.enviado) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center animate-in fade-in zoom-in-95">
        <span className="grid size-12 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
          <MailCheck className="size-6" />
        </span>
        <h2 className="text-lg font-medium">Revisá tu correo</h2>
        <p className="text-sm text-muted-foreground">
          Enviamos un enlace de ingreso a <strong className="text-foreground">{estadoEnlace.enviado}</strong>. Vence en una hora.
        </p>
      </div>
    )
  }

  return (
    <Tabs defaultValue="enlace" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="enlace">
          <Wand2 /> Enlace por email
        </TabsTrigger>
        <TabsTrigger value="clave">
          <KeyRound /> Contraseña
        </TabsTrigger>
      </TabsList>

      <TabsContent value="enlace" className="mt-5">
        <form action={accionEnlace} className="grid gap-4">
          <input type="hidden" name="volver" value={volver} />
          <div className="grid gap-2">
            <Label htmlFor="email-enlace">Email</Label>
            <Input id="email-enlace" name="email" type="email" autoComplete="email" placeholder="nombre@smt.gob.ar" required className="h-10" />
          </div>
          {estadoEnlace?.error && <p className="text-sm text-destructive">{estadoEnlace.error}</p>}
          <Button type="submit" size="lg" className="h-10" disabled={enviandoEnlace}>
            {enviandoEnlace && <Loader2 className="animate-spin" />} Enviarme el enlace
          </Button>
          <p className="text-xs text-muted-foreground">Sin contraseñas: te llega un enlace seguro de un solo uso.</p>
        </form>
      </TabsContent>

      <TabsContent value="clave" className="mt-5">
        <form action={accionClave} className="grid gap-4">
          <input type="hidden" name="volver" value={volver} />
          <div className="grid gap-2">
            <Label htmlFor="email-clave">Email</Label>
            <Input id="email-clave" name="email" type="email" autoComplete="username" required className="h-10" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="clave">Contraseña</Label>
            <Input id="clave" name="clave" type="password" autoComplete="current-password" required className="h-10" />
          </div>
          {estadoClave?.error && <p className="text-sm text-destructive">{estadoClave.error}</p>}
          <Button type="submit" size="lg" className="h-10" disabled={enviandoClave}>
            {enviandoClave && <Loader2 className="animate-spin" />} Ingresar
          </Button>
        </form>
      </TabsContent>
    </Tabs>
  )
}
