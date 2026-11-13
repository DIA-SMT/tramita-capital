import { FolderLock, Info } from "lucide-react"
import { ListaLegajo } from "@/components/legajo"
import type { EntradaLegajo } from "@/lib/vistas"

/**
 * Mi legajo: lo que Capital Humano archivó de los trámites del agente. Antes, la resolución por
 * duplicado y el desglose iban en papel al legajo; ahora quedan acá, con su copia oficial verificable.
 */
export function VistaMiLegajo({ entradas, base = "", demo = false }: { entradas: EntradaLegajo[]; base?: string; demo?: boolean }) {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">Dirección de Capital Humano</p>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <FolderLock className="size-6 text-primary" /> Mi legajo
        </h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Las resoluciones de tus trámites y la documentación que quedó archivada. Cada resolución tiene su copia oficial, con un código que
          cualquiera puede verificar.
        </p>
      </header>

      <ListaLegajo
        entradas={entradas}
        rutaTramite="mis-tramites"
        vacio="Todavía no hay nada en tu legajo digital. Cuando se firme la resolución de uno de tus trámites, la vas a encontrar acá."
        base={base}
        demo={demo}
      />

      <p className="flex items-start gap-2 rounded-xl bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        Acá está lo que pasó por Tramita Capital. Lo anterior al sistema sigue en tu legajo en papel, en Capital Humano.
      </p>
    </div>
  )
}
