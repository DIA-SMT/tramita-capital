import { leerPuntos, type Punto } from "@/lib/recorrido"
import { MapaRecorrido } from "@/components/mapa-recorrido"

/** El recorrido que marcó el agente: el resumen y el mapa (si marcó puntos). */
export function VerRecorrido({ resumen, geo }: { resumen: string; geo?: string | null }) {
  const puntos = leerPuntos(geo)
  return (
    <div className="grid gap-2">
      <p className="text-sm">{resumen || "—"}</p>
      {puntos.length > 0 && (
        <>
          <MapaRecorrido puntos={puntos} etiqueta="Recorrido de la casa al trabajo" />
          <Referencias />
        </>
      )}
    </div>
  )
}

export function Referencias() {
  return (
    <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2.5 rounded-full border-2 border-green-600 bg-white" /> Casa
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2.5 rounded-full border-2 border-red-600 bg-white" /> Trabajo
      </span>
    </p>
  )
}

/**
 * Croquis del recorrido para la copia impresa: el trazo en SVG, sin mapa de fondo (no depende de un servidor de
 * mapas y se imprime igual siempre). Proyección equirectangular, que alcanza para distancias urbanas.
 */
export function CroquisRecorrido({ geo, ancho = 320, alto = 200 }: { geo?: string | null; ancho?: number; alto?: number }) {
  const puntos = leerPuntos(geo)
  if (puntos.length < 2) return null
  const coseno = Math.cos((puntos[0][0] * Math.PI) / 180)
  const xy = puntos.map(([lat, lng]): Punto => [lng * coseno, -lat])
  const [minX, maxX] = [Math.min(...xy.map((p) => p[0])), Math.max(...xy.map((p) => p[0]))]
  const [minY, maxY] = [Math.min(...xy.map((p) => p[1])), Math.max(...xy.map((p) => p[1]))]
  const margen = 24
  const escala = Math.min((ancho - 2 * margen) / (maxX - minX || 1), (alto - 2 * margen) / (maxY - minY || 1))
  const px = xy.map(([x, y]) => [margen + (x - minX) * escala, margen + (y - minY) * escala])
  const [casa, trabajo] = [px[0], px[px.length - 1]]
  return (
    <svg viewBox={`0 0 ${ancho} ${alto}`} width={ancho} height={alto} role="img" aria-label="Croquis del recorrido de la casa al trabajo" className="rounded border">
      <polyline points={px.map((p) => p.join(",")).join(" ")} fill="none" stroke="#0066FF" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={casa[0]} cy={casa[1]} r={6} fill="#fff" stroke="#16a34a" strokeWidth={3} />
      <circle cx={trabajo[0]} cy={trabajo[1]} r={6} fill="#fff" stroke="#dc2626" strokeWidth={3} />
      {/* Las etiquetas van arriba de cada punto, para no taparse con el trazo. */}
      <text x={casa[0]} y={casa[1] - 10} fontSize={10} fill="#16a34a" textAnchor="middle" fontWeight={600}>
        Casa
      </text>
      <text x={trabajo[0]} y={trabajo[1] - 10} fontSize={10} fill="#dc2626" textAnchor="middle" fontWeight={600}>
        Trabajo
      </text>
    </svg>
  )
}
