import { Skeleton } from "@/components/ui/skeleton"

export default function Cargando() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Skeleton className="h-6 w-24" />
      <div className="flex gap-4">
        <Skeleton className="size-12 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-7 w-full max-w-xl" />
          <Skeleton className="h-4 w-80" />
        </div>
      </div>
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  )
}
