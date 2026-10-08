import Image from "next/image"
import { cn } from "@/lib/utils"

/** Isotipo del municipio (marca cimba). `claro` para fondos oscuros o de color. */
export function Isotipo({ className, claro = false }: { className?: string; claro?: boolean }) {
  return (
    <Image
      src={claro ? "/marca/cimba-blanco.png" : "/marca/cimba.png"}
      alt=""
      aria-hidden
      width={claro ? 256 : 340}
      height={claro ? 291 : 387}
      priority
      className={cn("h-8 w-auto", className)}
    />
  )
}

/** Logo del municipio + nombre del sistema. */
export function Marca({ className, compacta = false, claro = false }: { className?: string; compacta?: boolean; claro?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Isotipo claro={claro} />
      {!compacta && (
        <span className="flex flex-col leading-none">
          <span className={cn("text-[1.02rem] font-semibold tracking-tight", claro && "text-white")}>
            Tramita<span className={cn("font-light", claro ? "text-white/80" : "text-primary")}> Capital</span>
          </span>
          <span className={cn("mt-1 text-[0.62rem] font-medium tracking-[0.14em] uppercase", claro ? "text-white/60" : "text-muted-foreground")}>
            Municipalidad de SMT
          </span>
        </span>
      )}
    </span>
  )
}

/** Membrete institucional de los documentos oficiales. */
export function Membrete({ area, className }: { area?: string; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center text-center", className)}>
      <Image src="/marca/cimba.png" alt="Municipalidad de San Miguel de Tucumán" width={340} height={387} className="h-12 w-auto" />
      <p className="mt-2 text-[0.8rem] font-semibold tracking-wide">Municipalidad de San Miguel de Tucumán</p>
      <p className="text-[0.72rem] opacity-80">Dirección de Capital Humano{area ? ` · ${area}` : ""}</p>
      <span aria-hidden className="mt-3 h-0.5 w-full max-w-md rounded-full bg-gradient-to-r from-marca-1 via-marca-2 to-marca-3" />
    </div>
  )
}

/** Hilo de marca: azul, celeste y el sol amarillo del logo. */
export function HiloMarca({ className }: { className?: string }) {
  return <div aria-hidden className={cn("h-0.5 bg-gradient-to-r from-marca-1 via-marca-2 to-marca-3", className)} />
}
