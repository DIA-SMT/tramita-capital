import "server-only"
import { Resend } from "resend"
import { entorno } from "@/lib/entorno"

let resend: Resend | undefined

function escaparHtml(texto: string) {
  return texto.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;")
}

function plantilla({ titulo, cuerpo, enlace }: { titulo: string; cuerpo: string; enlace?: string }) {
  const boton = enlace
    ? `<p style="margin:28px 0 0"><a href="${escaparHtml(enlace)}" style="background:#1d3a8a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;display:inline-block">Ver el trámite</a></p>`
    : ""
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f4f5f7;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111827">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:16px;padding:32px" cellpadding="0" cellspacing="0"><tr><td>
<p style="margin:0 0 4px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6b7280">Tramita Capital · Capital Humano</p>
<h1 style="margin:0 0 16px;font-size:20px;line-height:1.3">${escaparHtml(titulo)}</h1>
<p style="margin:0;font-size:15px;line-height:1.6;color:#374151">${escaparHtml(cuerpo).replaceAll("\n", "<br>")}</p>
${boton}
</td></tr></table>
<p style="font-size:12px;color:#9ca3af;margin-top:16px">Municipalidad de San Miguel de Tucumán · Este es un aviso automático.</p>
</td></tr></table></body></html>`
}

export async function enviarEmail(destino: string, aviso: { titulo: string; cuerpo: string; enlace?: string }) {
  if (!entorno.resendClave) {
    return { ok: false as const, error: "RESEND_API_KEY no configurada" }
  }
  resend ??= new Resend(entorno.resendClave)
  const { error } = await resend.emails.send({
    from: entorno.emailRemitente,
    to: destino,
    subject: aviso.titulo,
    html: plantilla(aviso),
    text: `${aviso.titulo}\n\n${aviso.cuerpo}${aviso.enlace ? `\n\n${aviso.enlace}` : ""}`,
  })
  return error ? { ok: false as const, error: error.message } : { ok: true as const }
}
