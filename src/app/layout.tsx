import type { Metadata, Viewport } from "next"
import { Geist_Mono, Poppins, Source_Serif_4 } from "next/font/google"
import { Proveedores } from "@/components/proveedores"
import "./globals.css"

const sans = Poppins({ variable: "--font-sans", subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] })
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] })
const serif = Source_Serif_4({ variable: "--font-serif", subsets: ["latin"] })

export const metadata: Metadata = {
  title: { default: "Tramita Capital", template: "%s · Tramita Capital" },
  description: "Expediente electrónico de Capital Humano · Municipalidad de San Miguel de Tucumán",
  applicationName: "Tramita Capital",
  icons: {
    icon: [
      { url: "/cimba-192.png", sizes: "192x192", type: "image/png" },
      { url: "/cimba-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0066ff" },
    { media: "(prefers-color-scheme: dark)", color: "#070d1c" },
  ],
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" suppressHydrationWarning className={`${sans.variable} ${mono.variable} ${serif.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Proveedores>{children}</Proveedores>
      </body>
    </html>
  )
}
