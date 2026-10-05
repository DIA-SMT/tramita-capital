import { cn } from "@/lib/utils"

/** Isotipo: una foja con el pliegue y un trazo de firma. */
export function Isotipo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8", className)}>
      <defs>
        <linearGradient id="tc-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--marca-2)" />
          <stop offset="1" stopColor="var(--marca-1)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#tc-g)" />
      <path d="M10 8h8.5L23 12.5V24a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" fill="white" fillOpacity=".95" />
      <path d="M18.5 8v4.5H23" fill="none" stroke="var(--marca-1)" strokeOpacity=".35" strokeWidth="1.2" />
      <path
        d="M12 20.5c1.2-1.6 2.1-1.8 2.6-.6.4 1 1 1.1 1.9-.2.8-1.1 1.5-1 2 .1.3.6.8.7 1.5.3"
        fill="none"
        stroke="var(--marca-1)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path d="M12 15h7M12 12.5h4" stroke="var(--marca-1)" strokeOpacity=".4" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

export function Marca({ className, compacta = false }: { className?: string; compacta?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Isotipo />
      {!compacta && (
        <span className="flex flex-col leading-none">
          <span className="text-[0.95rem] font-semibold tracking-tight">Tramita Capital</span>
          <span className="mt-0.5 text-[0.68rem] font-medium tracking-wide text-muted-foreground uppercase">
            Capital Humano · SMT
          </span>
        </span>
      )}
    </span>
  )
}
