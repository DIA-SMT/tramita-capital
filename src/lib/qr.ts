import "server-only"
import QRCode from "qrcode"

/** QR de verificación pública de una foja (SVG en línea, sin servicios externos). */
export function qrVerificacion(url: string) {
  return QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#0b1530", light: "#0000" } })
}
