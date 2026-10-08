import * as z from "zod"
import { DIM, PUNTOS } from "@/lib/firma-trazo"

/** Patrón normalizado de una firma dibujada (ver src/lib/firma-trazo.ts). La base vuelve a validarlo. */
export const Patron = z.object({
  v: z.array(z.number().finite().min(-50).max(50)).length(PUNTOS * DIM),
  duracion: z.number().int().min(150).max(120000),
  trazos: z.number().int().min(1).max(60),
  relacion: z.number().finite(),
})

/** Lee un patrón enviado como JSON en un FormData. */
export function leerPatron(valor: FormDataEntryValue | null) {
  try {
    const r = Patron.safeParse(JSON.parse(String(valor ?? "")))
    return r.success ? r.data : null
  } catch {
    return null
  }
}
