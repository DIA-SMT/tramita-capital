// Vista previa: la firma registrada en la vista previa se guarda solo en este navegador
// para poder compararla de verdad (con las mismas reglas que la base). Nada sale del equipo.
import { evaluar, registroDe, type Evaluacion, type PatronFirma, type RegistroPatron } from "@/lib/firma-trazo"

const CLAVE = "tramita-vista-previa-firma"
/** Como la base: las últimas 20 firmas usadas sirven para detectar copias. */
const ANTERIORES = 20

type Guardada = { registro: RegistroPatron; anteriores: PatronFirma[] }

function leer(): Guardada | null {
  try {
    const crudo = localStorage.getItem(CLAVE)
    const g = crudo ? (JSON.parse(crudo) as Partial<Guardada>) : null
    // Las registradas con la versión anterior (sin ritmo) no sirven: se registra de nuevo.
    return g?.registro?.version === 2 ? { registro: g.registro, anteriores: g.anteriores ?? [] } : null
  } catch {
    return null
  }
}

function escribir(g: Guardada) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(g))
  } catch {
    // Sin almacenamiento disponible: la comparación de la vista previa no estará disponible.
  }
}

export function guardarFirmaDemo(muestras: PatronFirma[]) {
  escribir({ registro: registroDe(muestras), anteriores: [] })
}

export const hayFirmaDemo = () => leer() !== null

export function borrarFirmaDemo() {
  try {
    localStorage.removeItem(CLAVE)
  } catch {
    // nada
  }
}

/** Compara contra la firma registrada en la vista previa (o explica que no hay). */
export function compararDemo(patron: PatronFirma): Evaluacion | { error: string } {
  const g = leer()
  if (!g) return { error: "En la vista previa todavía no registraste tu firma en este navegador. Registrala en “Mi firma” para poder compararla." }
  return evaluar(patron, g.registro, g.anteriores)
}

/** Una firma aceptada queda entre las anteriores: volver a presentarla idéntica es una copia. */
export function registrarUsoDemo(patron: PatronFirma) {
  const g = leer()
  if (g) escribir({ ...g, anteriores: [patron, ...g.anteriores].slice(0, ANTERIORES) })
}
