import type { Metadata } from "next"
import { crearClienteServidor } from "@/lib/supabase/servidor"
import { VistaVerificar, type ResultadoVerificacion } from "./vista"

export const metadata: Metadata = { title: "Verificar un documento" }

export default async function Verificar({ searchParams }: PageProps<"/verificar">) {
  const { codigo: crudo } = await searchParams
  // Admite el código con guiones o espacios, en mayúsculas o minúsculas.
  const codigo = typeof crudo === "string" ? crudo.toLowerCase().replace(/[^0-9a-f]/g, "").slice(0, 20) : ""
  let resultado: ResultadoVerificacion | null = null
  if (codigo.length === 20) {
    const supabase = await crearClienteServidor()
    const { data } = await supabase.rpc("verificar_foja", { p_codigo: codigo })
    resultado = (data as ResultadoVerificacion | null) ?? null
  }
  return <VistaVerificar codigo={codigo} resultado={resultado} />
}
