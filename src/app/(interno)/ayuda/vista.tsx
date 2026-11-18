import Link from "next/link"
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  BookOpenText,
  FilePenLine,
  FolderLock,
  FileStack,
  FolderInput,
  Hash,
  Inbox,
  Keyboard,
  Lock,
  PenLine,
  Route,
  Scale,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Stamp,
  UserRoundCheck,
  type LucideIcon,
} from "lucide-react"

type Equivalencia = { papel: string; sistema: string; donde: string; icono: LucideIcon; ruta?: string }

const EQUIVALENCIAS: Equivalencia[] = [
  { papel: "Mesa de entradas recibe el pedido", sistema: "El agente lo inicia desde su portal, con los requisitos y los documentos", donde: "Bandeja", icono: FolderInput, ruta: "/bandeja" },
  { papel: "Carátula y número de expediente", sistema: "El número (CH-AAAA-NNNNNN) se asigna solo al iniciar", donde: "Arriba de cada expediente", icono: Hash },
  { papel: "Foliar", sistema: "Cada actuación firmada recibe su número de foja, en orden", donde: "Pestaña «Fojas»", icono: FileStack },
  { papel: "Hoja de ruta", sistema: "Cada pase queda registrado con fecha, hora y quién lo hizo", donde: "Pestaña «Hoja de ruta»", icono: Route },
  { papel: "Pase con providencia", sistema: "«Pasar a [área]»: la providencia se arma con lo que hiciste", donde: "Tarea del paso", icono: Send },
  { papel: "Firmar dictámenes, informes y notas", sistema: "Firma electrónica con tu usuario, en un clic", donde: "Botón «Firmar»", icono: FilePenLine },
  { papel: "Firmar la resolución", sistema: "Dibujás tu firma y ponés tu clave de 6 números", donde: "Para firmar · Mi firma", icono: Stamp, ruta: "/firmar" },
  { papel: "Libro de resoluciones", sistema: "El número y la fecha se asignan solos al firmar", donde: "Registro de resoluciones", icono: BookOpenText, ruta: "/resoluciones" },
  { papel: "Desglose y nota a Liquidación", sistema: "Novedad de haberes y planilla para cargar en Civitas", donde: "Novedades de haberes", icono: Banknote, ruta: "/novedades" },
  { papel: "Desglosar al legajo", sistema: "La resolución firmada y la documentación final van solas al legajo digital", donde: "Ficha del agente (tocá su nombre)", icono: FolderLock },
  { papel: "Fotocopia o copia para el agente", sistema: "Copia oficial con QR de verificación, o el expediente completo en PDF", donde: "«Expediente completo»", icono: ShieldCheck },
  { papel: "Nota de reconsideración en Mesa de Entradas", sistema: "«Pedir reconsideración» desde el trámite resuelto: expediente nuevo, vinculado al recurrido", donde: "El trámite del agente", icono: Scale },
  {
    papel: "Certificado de trabajo: Registro lo arma, la Dirección lo firma y Registro lo entrega",
    sistema: "Sale al pedirlo, con la firma que autorizó la Dirección y QR de verificación; si falta el dato de Civitas, lo emite Registro",
    donde: "El trámite del agente",
    icono: BadgeCheck,
  },
  { papel: "Buscar el expediente o la carpeta en el armario", sistema: "Buscador por número, asunto, nombre o legajo", donde: "Ctrl + K", icono: Search },
]

type Tarea = { titulo: string; quien: string; icono: LucideIcon; pasos: string[] }

const OPERADOR: Tarea = {
  titulo: "Trabajar un expediente",
  quien: "Mesa de Entradas, Bonificaciones, Medicina Laboral, Licencias, Despacho, Higiene y Seguridad, Registro",
  icono: Inbox,
  pasos: [
    "En la Bandeja está lo que llegó a tu área: primero lo urgente y lo que está por vencer.",
    "Abrí el expediente y tocá «Tomar el expediente»: queda a tu cargo.",
    "Arriba ves «Lo que te mandaron»: el pase y lo que agregó el área anterior.",
    "La «Tarea del paso» te dice qué controlar, qué revisar y qué producir. Tildá los controles; cada documento se redacta desde su botón, con un borrador de la IA que revisás vos.",
    "Cuando está todo, «Pasar a [área]». Si falta algo del agente: «Falta algo del agente: devolvérselo».",
    "Los trámites que no llevan resolución (certificados escolares en término, cambio de domicilio) terminan en tu área: en el último paso, «Cerrar el trámite». Lo que hiciste queda como constancia firmada.",
    "En Registro, un certificado de trabajo llega solo cuando falta el dato de Civitas: controlá en Civitas, tildá el control y «Emitir certificado». El trámite se cierra y el dato queda al día en la ficha del agente («Datos de Civitas»).",
    "Registro y Liquidación: una vez por mes, en «Datos de Civitas», subí la planilla que exportás de Civitas y tocá «Actualizar [N] agentes» (revisá antes las filas con errores). Con «Liquida SÍ» al día, los certificados de trabajo salen solos.",
  ],
}

const DICTAMINANTE: Tarea = {
  titulo: "Dictaminar",
  quien: "Asesoría Legal",
  icono: Scale,
  pasos: [
    "Tomá el expediente desde la Bandeja.",
    "«Redactar dictamen»: la IA propone el borrador con los datos del expediente. Lo que no pudo completar queda marcado [COMPLETAR].",
    "Revisalo, corregilo y firmalo: queda foliado.",
    "Pasalo al área siguiente con «Pasar a [área]».",
  ],
}

const FIRMANTE: Tarea = {
  titulo: "Firmar resoluciones",
  quien: "Dirección de Capital Humano",
  icono: Stamp,
  pasos: [
    "Una sola vez: registrá tu firma en «Mi firma» (tres muestras y una clave de 6 números).",
    "En «Para firmar» están las resoluciones listas, una tras otra. No hace falta abrir cada expediente.",
    "Leé el proyecto (y, si querés, el dictamen y la documentación), marcá los controles, dibujá tu firma y poné tu clave.",
    "«Firmar y pasar a [área]»: el número y la fecha se asignan solos, la resolución va al legajo y el expediente sigue su camino.",
    "Si el proyecto hay que corregirlo, «Devolver»: elegís el área (la que hizo el proyecto, o la Asesoría para el dictamen) y escribís qué cambiar. Vuelve sin firmar y, ya corregido, aparece de nuevo en «Para firmar».",
    "Certificado de trabajo: en «Mi firma», «Autorizar» la emisión automática con tu clave. Desde ahí sale firmado al pedirlo, sin pasar por tu bandeja. Lo revocás cuando quieras.",
  ],
}

const NOVEDADES: Tarea = {
  titulo: "Cargar las novedades en Civitas",
  quien: "Bonificaciones y Liquidación de Haberes",
  icono: Banknote,
  pasos: [
    "Al cerrar, Bonificaciones registra la novedad con «Registrar novedad»: el período sale de la resolución.",
    "Con varios hijos/as (o la familia numerosa) en el mismo expediente, propone una línea por cada uno: la que no corresponda se destilda y se puede registrar después. En el nacimiento con asignación por hijo/a, cada hijo/a lleva un pago único y una línea mensual: el pago único rige solo en el período desde.",
    "En «Novedades de haberes», Liquidación descarga la «Planilla para Civitas».",
    "Después de cargarla en Civitas, «Marcar cargadas»: el agente ve que impactó en sus haberes.",
  ],
}

const REGLAS: { titulo: string; texto: string; icono: LucideIcon }[] = [
  { titulo: "Lo firmado no se edita", texto: "Si hay que corregir, se agrega otra foja. Así el expediente queda íntegro y verificable.", icono: ShieldCheck },
  {
    titulo: "La IA propone, la persona decide",
    texto: "Lo que redacta la IA lo firma quien lo revisa: con tu firma asumís el contenido como propio. Solo el certificado de trabajo sale firmado sin pasar por nadie, con la firma que la Dirección autorizó para eso.",
    icono: Sparkles,
  },
  { titulo: "Reservados", texto: "Los expedientes con datos de salud o discapacidad los ve solo el personal autorizado.", icono: Lock },
  { titulo: "Todo queda registrado", texto: "Quién hizo cada cosa, cuándo y desde dónde. Nadie tiene que acordarse.", icono: UserRoundCheck },
]

/**
 * Ayuda para el personal de Capital Humano que nunca usó un expediente electrónico: qué es cada
 * cosa del papel en el sistema, el trabajo de cada rol paso a paso, las reglas y los atajos.
 * Muestra primero el trabajo de quien la mira.
 */
export function VistaAyuda({
  operador,
  dictaminante,
  firmante,
  novedades,
  base = "",
}: {
  operador: boolean
  dictaminante: boolean
  firmante: boolean
  novedades: boolean
  base?: string
}) {
  const propias = [operador && OPERADOR, dictaminante && DICTAMINANTE, firmante && FIRMANTE, novedades && NOVEDADES].filter((t): t is Tarea => !!t)
  const otras = [OPERADOR, DICTAMINANTE, FIRMANTE, NOVEDADES].filter((t) => !propias.includes(t))

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <header className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/[0.08] via-card to-card p-6 sm:p-8">
        <span aria-hidden className="pointer-events-none absolute -top-16 -right-16 size-56 rounded-full bg-marca-2/15 blur-3xl" />
        <p className="text-sm font-medium text-primary">Ayuda para Capital Humano</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Del papel al sistema</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Es el mismo expediente de siempre, con número, fojas, pases y firmas. Lo que cambia es que no hay papel que mover: el sistema folia, registra
          la hoja de ruta, numera las resoluciones y avisa a cada uno lo que le toca.
        </p>
      </header>

      <section aria-labelledby="equivalencias">
        <h2 id="equivalencias" className="text-lg font-semibold">
          Lo mismo, sin papel
        </h2>
        <p className="text-sm text-muted-foreground">Lo que hacías en papel y dónde está ahora.</p>
        <ul className="mt-4 divide-y rounded-2xl border bg-card">
          {EQUIVALENCIAS.map((e) => {
            const contenido = (
              <>
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <e.icono className="size-4" />
                </span>
                <span className="grid min-w-0 flex-1 gap-1 md:grid-cols-[minmax(0,15rem)_auto_minmax(0,1fr)] md:items-center md:gap-4">
                  <span className="text-sm text-muted-foreground">{e.papel}</span>
                  <ArrowRight className="hidden size-4 text-muted-foreground/60 md:block" aria-hidden />
                  <span className="text-sm">
                    <span className="font-medium">{e.sistema}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{e.donde}</span>
                  </span>
                </span>
              </>
            )
            return (
              <li key={e.papel}>
                {e.ruta ? (
                  <Link href={`${base}${e.ruta}`} className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40 md:items-center">
                    {contenido}
                  </Link>
                ) : (
                  <div className="flex items-start gap-3 px-4 py-3 md:items-center">{contenido}</div>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      <section aria-labelledby="tu-trabajo">
        <h2 id="tu-trabajo" className="text-lg font-semibold">
          {propias.length ? "Tu trabajo, paso a paso" : "El trabajo de cada rol, paso a paso"}
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {(propias.length ? propias : otras).map((t) => (
            <TarjetaTarea key={t.titulo} tarea={t} />
          ))}
        </div>
        {propias.length > 0 && otras.length > 0 && (
          <details className="group mt-4 rounded-2xl border bg-card/50">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-1.5">
                <ArrowRight className="size-4 transition-transform group-open:rotate-90" /> Lo que hacen los demás roles
              </span>
            </summary>
            <div className="grid gap-4 p-4 pt-0 md:grid-cols-2">
              {otras.map((t) => (
                <TarjetaTarea key={t.titulo} tarea={t} />
              ))}
            </div>
          </details>
        )}
      </section>

      <section aria-labelledby="reglas">
        <h2 id="reglas" className="text-lg font-semibold">
          Reglas que conviene saber
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {REGLAS.map((r) => (
            <div key={r.titulo} className="flex gap-3 rounded-2xl border bg-card p-4">
              <r.icono className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <p className="font-medium">{r.titulo}</p>
                <p className="text-sm text-muted-foreground">{r.texto}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="atajos" className="rounded-2xl border bg-card p-5">
        <h2 id="atajos" className="flex items-center gap-2 font-semibold">
          <Keyboard className="size-5 text-primary" /> Atajos de teclado
        </h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
          <Atajo teclas={["Ctrl", "K"]} texto="Buscar un expediente, un agente o ir a una sección" />
          <Atajo teclas={["j", "k"]} texto="Moverte por la bandeja" />
          <Atajo teclas={["Enter"]} texto="Abrir el expediente elegido" />
        </dl>
        <p className="mt-4 flex items-center gap-1.5 border-t pt-3 text-sm text-muted-foreground">
          <PenLine className="size-4" /> ¿Algo no se entiende o no funciona? Avisale a la Dirección de IA: lo vamos ajustando con lo que nos cuentan.
        </p>
      </section>
    </div>
  )
}

function TarjetaTarea({ tarea: t }: { tarea: Tarea }) {
  return (
    <article className="rounded-2xl border bg-card p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-marca-2 to-marca-1 text-white shadow-md shadow-primary/20">
          <t.icono className="size-5" />
        </span>
        <div className="min-w-0">
          <h3 className="font-semibold">{t.titulo}</h3>
          <p className="text-xs text-muted-foreground">{t.quien}</p>
        </div>
      </div>
      <ol className="mt-4 space-y-2.5">
        {t.pasos.map((p, i) => (
          <li key={i} className="flex gap-3 text-sm">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary tabular">{i + 1}</span>
            <span className="pt-0.5">{p}</span>
          </li>
        ))}
      </ol>
    </article>
  )
}

function Atajo({ teclas, texto }: { teclas: string[]; texto: string }) {
  return (
    <div className="flex items-center gap-2">
      <dt className="flex shrink-0 gap-1">
        {teclas.map((t) => (
          <kbd key={t} className="rounded-md border bg-muted px-1.5 py-0.5 font-mono text-xs">
            {t}
          </kbd>
        ))}
      </dt>
      <dd className="text-muted-foreground">{texto}</dd>
    </div>
  )
}
