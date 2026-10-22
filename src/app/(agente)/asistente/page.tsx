import type { Metadata } from "next"
import * as z from "zod"
import { crearClienteServidor } from "@/lib/supabase/servidor"
import { entorno } from "@/lib/entorno"
import { consultasRestantes } from "@/lib/ia/asistente"
import { requerirUsuario } from "@/lib/usuario"
import { VistaAsistente } from "./vista"

export const metadata: Metadata = { title: "Asistente" }

export default async function PaginaAsistente({ searchParams }: PageProps<"/asistente">) {
  const [{ expediente }, usuario] = await Promise.all([searchParams, requerirUsuario()])
  const supabase = await crearClienteServidor()
  const id = z.uuid().safeParse(expediente).data

  const [{ data: enfocado }, restantes] = await Promise.all([
    id
      ? supabase
          .from("expedientes")
          .select("id, numero, tipo:tipos_tramite!expedientes_tipo_tramite_id_fkey(nombre)")
          .eq("id", id)
          .eq("iniciador_id", usuario.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    consultasRestantes(supabase, usuario.id),
  ])

  return (
    <VistaAsistente
      nombre={usuario.perfil.nombre}
      enfocado={enfocado ? { id: enfocado.id, numero: enfocado.numero, tipo: enfocado.tipo?.nombre ?? "Trámite" } : null}
      restantes={restantes}
      disponible={entorno.iaHabilitada}
    />
  )
}
