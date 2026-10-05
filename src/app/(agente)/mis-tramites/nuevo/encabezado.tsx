import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export function EncabezadoCatalogo({ base = "" }: { base?: string }) {
  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2 text-muted-foreground">
        <Link href={`${base}/mis-tramites`}>
          <ArrowLeft /> Mis trámites
        </Link>
      </Button>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">¿Qué trámite querés iniciar?</h1>
      <p className="mt-1 text-muted-foreground">Te pedimos solo lo necesario y lo seguís desde acá, paso a paso.</p>
    </div>
  )
}
