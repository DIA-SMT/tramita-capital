import type { Metadata } from "next"
import { notFound } from "next/navigation"
import * as z from "zod"
import { cargarFichaAgente } from "@/lib/legajo"
import { crearClienteServidor } from "@/lib/supabase/servidor"
import { gestionaCivitas, gestionaNovedades, requerirInterno } from "@/lib/usuario"
import { VistaFichaAgente } from "./vista"

export const metadata: Metadata = { title: "Ficha del agente", robots: { index: false } }

export default async function FichaAgente({ params }: PageProps<"/agentes/[id]">) {
  const [{ id }, usuario] = await Promise.all([params, requerirInterno()])
  if (!z.uuid().safeParse(id).success) notFound()
  const ficha = await cargarFichaAgente(await crearClienteServidor(), id, gestionaNovedades(usuario))
  if (!ficha) notFound()
  // Datos de Civitas (migración 001900): los cargan Registro, Liquidación o Administración.
  return <VistaFichaAgente ficha={ficha} editaCivitas={gestionaCivitas(usuario)} />
}
