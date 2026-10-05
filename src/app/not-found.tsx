import Link from "next/link"
import { FileQuestion } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NoEncontrado() {
  return (
    <main className="grid min-h-svh place-items-center px-4">
      <div className="max-w-sm text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
          <FileQuestion className="size-6" />
        </span>
        <h1 className="mt-4 text-xl font-semibold">No encontramos lo que buscás</h1>
        <p className="mt-1 text-sm text-muted-foreground">El expediente no existe o no tenés permiso para verlo.</p>
        <Button asChild className="mt-6">
          <Link href="/">Volver al inicio</Link>
        </Button>
      </div>
    </main>
  )
}
