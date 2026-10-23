import type { Metadata } from "next"
import * as z from "zod"
import { crearClienteServidor } from "@/lib/supabase/servidor"
import { requerirUsuario } from "@/lib/usuario"
import { VistaMigue } from "./vista"

export const metadata: Metadata = { title: "Migue" }

export default async function PaginaMigue({ searchParams }: PageProps<"/migue">) {
  const [{ expediente }, usuario] = await Promise.all([searchParams, requerirUsuario()])
  const id = z.uuid().safeParse(expediente).data
  const { data: enfocado } = id
    ? await (await crearClienteServidor())
        .from("expedientes")
        .select("id, numero, tipo:tipos_tramite!expedientes_tipo_tramite_id_fkey(nombre)")
        .eq("id", id)
        .eq("iniciador_id", usuario.id)
        .maybeSingle()
    : { data: null }

  return <VistaMigue enfocado={enfocado ? { id: enfocado.id, numero: enfocado.numero, tipo: enfocado.tipo?.nombre ?? "Trámite" } : null} />
}
