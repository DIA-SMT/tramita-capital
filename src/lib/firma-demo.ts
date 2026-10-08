// Vista previa: la firma registrada en la vista previa se guarda solo en este navegador
// para poder compararla de verdad (con las mismas reglas que la base). Nada sale del equipo.
import { evaluar, registroDe, type Evaluacion, type PatronFirma, type RegistroPatron } from "@/lib/firma-trazo"

const CLAVE = "tramita-vista-previa-firma"

export function guardarFirmaDemo(muestras: PatronFirma[]) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(registroDe(muestras)))
  } catch {
    // Sin almacenamiento disponible: la comparación de la vista previa no estará disponible.
  }
}

export function leerFirmaDemo(): RegistroPatron | null {
  try {
    const crudo = localStorage.getItem(CLAVE)
    return crudo ? (JSON.parse(crudo) as RegistroPatron) : null
  } catch {
    return null
  }
}

export function borrarFirmaDemo() {
  try {
    localStorage.removeItem(CLAVE)
  } catch {
    // nada
  }
}

/** Compara contra la firma registrada en la vista previa (o explica que no hay). */
export function compararDemo(trazo: PatronFirma): Evaluacion | { error: string } {
  const registro = leerFirmaDemo()
  if (!registro) return { error: "En la vista previa todavía no registraste tu firma en este navegador. Registrala en “Mi firma” para poder compararla." }
  return evaluar(trazo, registro)
}
