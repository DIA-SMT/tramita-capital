import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tramita Capital · Municipalidad de San Miguel de Tucumán",
    short_name: "Tramita Capital",
    description: "Expediente electrónico de Capital Humano",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f8fc",
    theme_color: "#0066ff",
    lang: "es-AR",
    icons: [
      { src: "/cimba-192.png", sizes: "192x192", type: "image/png" },
      { src: "/cimba-512.png", sizes: "512x512", type: "image/png" },
      { src: "/cimba-192-maskable.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/cimba-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
