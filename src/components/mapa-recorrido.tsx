"use client"

import "leaflet/dist/leaflet.css"
import { useEffect, useRef, useState } from "react"
import type { LayerGroup, Map as MapaLeaflet } from "leaflet"
import { cn } from "@/lib/utils"
import { CENTRO_SMT, type Punto } from "@/lib/recorrido"

type Leaflet = typeof import("leaflet")

const COLOR_CASA = "#16a34a"
const COLOR_TRABAJO = "#dc2626"
const COLOR_RECORRIDO = "#0066FF"

/**
 * Mapa del recorrido de la casa al trabajo (OpenStreetMap con Leaflet). Con `alAgregar`, cada toque agrega un
 * punto; sin él, solo muestra el recorrido y se ajusta a sus puntos. Leaflet se carga en el navegador.
 */
export function MapaRecorrido({
  puntos,
  alAgregar,
  etiqueta,
  className,
}: {
  puntos: Punto[]
  alAgregar?: (p: Punto) => void
  etiqueta: string
  className?: string
}) {
  const contenedor = useRef<HTMLDivElement>(null)
  const mapa = useRef<MapaLeaflet | null>(null)
  const capa = useRef<LayerGroup | null>(null)
  const leaflet = useRef<Leaflet | null>(null)
  const agregar = useRef(alAgregar)
  const [listo, setListo] = useState(false)
  const editable = Boolean(alAgregar)

  useEffect(() => {
    agregar.current = alAgregar
  }, [alAgregar])

  // El mapa se crea una vez; el tamaño se recalcula cuando el contenedor cambia (por ejemplo, al abrir una pestaña).
  useEffect(() => {
    let vivo = true
    let observador: ResizeObserver | null = null
    import("leaflet").then((modulo) => {
      const L = (modulo as unknown as { default?: Leaflet }).default ?? modulo
      if (!vivo || !contenedor.current) return
      leaflet.current = L
      const m = L.map(contenedor.current, { scrollWheelZoom: false }).setView(CENTRO_SMT, 14)
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(m)
      capa.current = L.layerGroup().addTo(m)
      m.on("click", (ev) => agregar.current?.([ev.latlng.lat, ev.latlng.lng]))
      mapa.current = m
      observador = new ResizeObserver(() => m.invalidateSize())
      observador.observe(contenedor.current)
      setListo(true)
    })
    return () => {
      vivo = false
      observador?.disconnect()
      mapa.current?.remove()
      mapa.current = null
    }
  }, [])

  // Dibuja el recorrido: casa en verde, trabajo en rojo, esquinas en azul.
  useEffect(() => {
    const L = leaflet.current
    const m = mapa.current
    const g = capa.current
    if (!listo || !L || !m || !g) return
    g.clearLayers()
    if (puntos.length > 1) L.polyline(puntos, { color: COLOR_RECORRIDO, weight: 4, opacity: 0.85 }).addTo(g)
    puntos.forEach((p, i) => {
      const casa = i === 0
      const trabajo = i === puntos.length - 1 && puntos.length > 1
      L.circleMarker(p, {
        radius: casa || trabajo ? 8 : 4,
        color: casa ? COLOR_CASA : trabajo ? COLOR_TRABAJO : COLOR_RECORRIDO,
        fillColor: "#ffffff",
        fillOpacity: 1,
        weight: casa || trabajo ? 3 : 2,
      })
        .bindTooltip(casa ? "Casa" : trabajo ? "Trabajo" : `Punto ${i + 1}`)
        .addTo(g)
    })
    if (!editable && puntos.length > 0) m.fitBounds(L.latLngBounds(puntos), { padding: [28, 28], maxZoom: 17 })
  }, [puntos, listo, editable])

  return (
    <div
      ref={contenedor}
      role="application"
      aria-label={etiqueta}
      className={cn("z-0 h-72 w-full overflow-hidden rounded-xl border bg-muted sm:h-80", editable && "cursor-crosshair", className)}
    />
  )
}
