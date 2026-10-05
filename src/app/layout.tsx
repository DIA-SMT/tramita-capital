import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google"
import { Proveedores } from "@/components/proveedores"
import "./globals.css"

const sans = Geist({ variable: "--font-sans", subsets: ["latin"] })
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] })
const serif = Source_Serif_4({ variable: "--font-serif", subsets: ["latin"] })

export const metadata: Metadata = {
  title: { default: "Tramita Capital", template: "%s · Tramita Capital" },
  description: "Expediente electrónico de Capital Humano · Municipalidad de San Miguel de Tucumán",
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f9fc" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1220" },
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
