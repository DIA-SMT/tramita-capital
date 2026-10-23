import { AvatarMigue } from "@/components/agente/migue/avatar"
import { ChatMigue, type TramiteEnfocado } from "@/components/agente/migue/chat"

/** Migue en pantalla completa. La conversación es la misma que la de la burbuja flotante. */
export function VistaMigue({ enfocado }: { enfocado: TramiteEnfocado | null }) {
  return (
    <div className="space-y-6">
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <AvatarMigue tamano="md" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Migue</h1>
          <p className="text-sm text-muted-foreground">Tu asistente para los trámites de Capital Humano: estado, requisitos, plazos y haberes.</p>
        </div>
      </div>
      <ChatMigue modo="pagina" enfocado={enfocado} pantalla="/migue" />
    </div>
  )
}
