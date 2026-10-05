import "server-only"
import { clienteAdmin } from "@/lib/supabase/admin"
import { entorno } from "@/lib/entorno"
import { enviarEmail } from "@/lib/avisos/email"
import { enviarMigue } from "@/lib/avisos/migue"

type Aviso = {
  perfilId: string
  expedienteId?: string
  titulo: string
  cuerpo: string
  /** Ruta interna, p. ej. /mis-tramites/<id> */
  ruta?: string
}

/**
 * Notifica a una persona por todos los canales disponibles:
 * campanita del sistema (siempre), email (Resend) y WhatsApp vía Migue.
 * Pensado para ejecutarse dentro de `after()` sin demorar la respuesta.
 */
export async function avisar({ perfilId, expedienteId, titulo, cuerpo, ruta }: Aviso) {
  const admin = clienteAdmin()
  const enlace = ruta ? new URL(ruta, entorno.sitio).toString() : undefined

  await admin.from("notificaciones").insert({ perfil_id: perfilId, expediente_id: expedienteId, titulo, cuerpo, canal: "sistema" })

  const [{ data: perfil }, { data: exp }] = await Promise.all([
    admin.from("perfiles").select("email, telefono").eq("id", perfilId).single(),
    expedienteId
      ? admin.from("expedientes").select("numero").eq("id", expedienteId).single()
      : Promise.resolve({ data: null }),
  ])
  if (!perfil) return

  const envios: Promise<unknown>[] = []

  if (perfil.email && entorno.resendClave) {
    envios.push(
      enviarEmail(perfil.email, { titulo, cuerpo, enlace }).then((r) =>
        admin.from("notificaciones").insert({
          perfil_id: perfilId, expediente_id: expedienteId, titulo, cuerpo, canal: "email",
          enviada_at: r.ok ? new Date().toISOString() : null, error: r.ok ? null : r.error,
        }),
      ),
    )
  }

  if (perfil.telefono && entorno.migueWebhook) {
    envios.push(
      enviarMigue(perfil.telefono, { titulo, cuerpo, numero: exp?.numero, enlace }).then((r) =>
        admin.from("notificaciones").insert({
          perfil_id: perfilId, expediente_id: expedienteId, titulo, cuerpo, canal: "migue",
          enviada_at: r.ok ? new Date().toISOString() : null, error: r.ok ? null : r.error,
        }),
      ),
    )
  }

  await Promise.allSettled(envios)
}

/** Avisa a todas las personas de un área (p. ej. "nuevo expediente en tu bandeja"). */
export async function avisarArea(areaId: string, aviso: Omit<Aviso, "perfilId">, excepto?: string) {
  const { data: miembros } = await clienteAdmin().from("miembros_area").select("perfil_id").eq("area_id", areaId)
  await Promise.allSettled(
    (miembros ?? []).filter((m) => m.perfil_id !== excepto).map((m) => avisarSinFallar({ ...aviso, perfilId: m.perfil_id })),
  )
}

/** Igual que `avisar`, pero nunca lanza: los avisos no deben romper un trámite. */
export async function avisarSinFallar(aviso: Aviso) {
  try {
    await avisar(aviso)
  } catch (error) {
    console.error("[avisos] no se pudo notificar", error)
  }
}
