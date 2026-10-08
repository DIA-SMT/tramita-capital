import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowRight, BadgeCheck, BarChart3, FilePlus2, FileText, Inbox, PenLine, Settings2, Stamp, UserRound } from "lucide-react"
import { Marca } from "@/components/marca"
import { ShellAgente } from "@/components/agente/shell"
import { ShellInterno } from "@/components/interno/shell"
import {
  BANDEJA,
  CARGA,
  CATALOGO,
  ETAPAS,
  EXPEDIENTES,
  FIRMA_DEMO,
  PARAMETRIZACION,
  PERFIL_AGENTE,
  PERSONAS,
  POR_TIPO,
  RESUMEN,
  ROL_SUGERIDO,
  ROLES_DEMO,
  serieDemo,
  TIPOS,
  TRAMITES_AGENTE,
  usuarioDemo,
  type RolDemo,
} from "@/lib/demo/datos"
import { leerFormulario, leerRequisitos, nombreCompleto } from "@/lib/dominio"
import { entorno } from "@/lib/entorno"
import { codigoVerificacion, leerSello, urlImagenFirma } from "@/lib/firma"
import { qrVerificacion } from "@/lib/qr"
import { DocumentoOficial } from "@/components/documento/documento-oficial"
import { VistaMiFirma } from "@/app/(interno)/mi-firma/vista"
import { VistaVerificar, type ResultadoVerificacion } from "@/app/verificar/vista"
import { VistaBandeja } from "@/app/(interno)/bandeja/vista"
import { VistaExpediente } from "@/app/(interno)/expedientes/[id]/vista"
import { VistaParametrizacion } from "@/app/(interno)/parametrizacion/vista"
import { VistaTablero } from "@/app/(interno)/tablero/vista"
import { VistaMisTramites } from "@/app/(agente)/mis-tramites/vista"
import { Catalogo } from "@/app/(agente)/mis-tramites/nuevo/catalogo"
import { EncabezadoCatalogo } from "@/app/(agente)/mis-tramites/nuevo/encabezado"
import { VistaFormularioNuevo } from "@/app/(agente)/mis-tramites/nuevo/[codigo]/vista"
import { VistaSeguimiento } from "@/app/(agente)/mis-tramites/[id]/vista"
import { VistaPerfil } from "@/app/(agente)/perfil/vista"
import { BarraDemo } from "../barra-demo"

export const metadata: Metadata = { title: "Vista previa de diseño", robots: { index: false } }

const B = "/vista-previa"

function habilitada() {
  return process.env.NODE_ENV !== "production" || process.env.MODO_DEMO === "1"
}

export default async function VistaPrevia({ params, searchParams }: PageProps<"/vista-previa/[[...ruta]]">) {
  if (!habilitada()) notFound()
  const [{ ruta = [] }, sp] = await Promise.all([params, searchParams])
  const [seccion, id, extra] = ruta
  const como = (typeof sp.como === "string" && sp.como in ROLES_DEMO ? sp.como : null) as RolDemo | null

  if (!seccion) return <Galeria />

  // --- Documento oficial y verificación pública ----------------------------
  const fojasDemo = Object.values(EXPEDIENTES).flatMap((d) => d.fojas.map((f) => ({ f, d })))
  if (seccion === "documento" && id) {
    const hallada = fojasDemo.find(({ f }) => f.id === id)
    if (!hallada) notFound()
    const { f, d } = hallada
    const sello = leerSello(f.datos)
    const codigo = f.hash ? codigoVerificacion(f.hash) : ""
    return (
      <>
        <DocumentoOficial
          doc={{
            tipo: f.tipo,
            titulo: f.titulo,
            contenido: f.contenido,
            foja: f.foja,
            firmadaAt: f.firmada_at,
            hash: f.hash,
            sello,
            firmante: f.firmada_por ? (d.nombres[f.firmada_por] ?? null) : null,
            numeroExpediente: d.expediente.numero,
            area: f.area ?? null,
            reservado: d.expediente.reservado,
          }}
          qrSvg={f.hash ? await qrVerificacion(`${entorno.sitio}${B}/verificar?codigo=${codigo}`) : null}
          urlVerificacion={`${entorno.sitio}${B}/verificar`}
          volver={`${B}/expedientes/${d.expediente.id}`}
          imagenFirma={sello?.tipo === "registrada" ? urlImagenFirma(f.id, true) : null}
        />
        <BarraDemo rol="direccion" interno={false} />
      </>
    )
  }
  if (seccion === "verificar") {
    const codigo = typeof sp.codigo === "string" ? sp.codigo.toLowerCase().replace(/[^0-9a-f]/g, "").slice(0, 20) : ""
    const hallada = codigo.length === 20 ? fojasDemo.find(({ f }) => f.hash?.startsWith(codigo)) : null
    const sello = hallada ? leerSello(hallada.f.datos) : null
    const resultado: ResultadoVerificacion | null = hallada
      ? {
          tipo: hallada.f.tipo,
          protocolo: hallada.f.titulo.match(/Res\. N\.º (\S+)/)?.[1] ?? null,
          foja: hallada.f.foja,
          firmada_at: hallada.f.firmada_at,
          firmante: sello?.aclaracion ?? (hallada.f.firmada_por ? (hallada.d.nombres[hallada.f.firmada_por] ?? null) : null),
          cargo: sello?.cargo ?? null,
          firma_registrada: sello?.tipo === "registrada",
          integra: true,
        }
      : null
    return (
      <>
        <VistaVerificar codigo={codigo} resultado={resultado} accion={`${B}/verificar`} />
        <BarraDemo rol="direccion" interno={false} />
      </>
    )
  }

  // --- Espacio interno ---------------------------------------------------
  if (["bandeja", "expedientes", "tablero", "parametrizacion", "mi-firma"].includes(seccion)) {
    const rol: RolDemo = como ?? (seccion === "expedientes" && id ? (ROL_SUGERIDO[id] ?? "bonificaciones") : "bonificaciones")
    const usuario = usuarioDemo(rol)
    const misAreas = usuario.areas.map((a) => a.id)
    const pendientes = BANDEJA.filter((e) => e.area_actual_id && misAreas.includes(e.area_actual_id)).length

    let contenido: React.ReactNode = null
    if (seccion === "bandeja") {
      const vista = sp.vista === "mios" || sp.vista === "todos" ? sp.vista : "area"
      const filtrados = BANDEJA.filter((e) =>
        vista === "mios" ? e.asignado_a === usuario.id : vista === "area" ? e.area_actual_id && misAreas.includes(e.area_actual_id) : true,
      )
      contenido = (
        <VistaBandeja
          expedientes={filtrados}
          vistas={[
            { clave: "area", etiqueta: "En mis áreas", cantidad: pendientes },
            { clave: "mios", etiqueta: "Asignados a mí", cantidad: BANDEJA.filter((e) => e.asignado_a === usuario.id).length },
            { clave: "todos", etiqueta: "Todo Capital Humano", cantidad: BANDEJA.length },
          ]}
          tipos={TIPOS.map((t) => ({ codigo: t.codigo, nombre: t.nombre }))}
          usuarioId={usuario.id}
          misAreas={misAreas}
          nombre={ROLES_DEMO[rol].persona.nombre}
          base={B}
          demo
        />
      )
    } else if (seccion === "expedientes") {
      const datos = id ? EXPEDIENTES[id] : null
      if (!datos) notFound()
      const ini = Object.values(PERSONAS).find((p) => p.id === datos.expediente.iniciador_id)!
      contenido = (
        <VistaExpediente
          datos={datos}
          iniciador={ini}
          usuario={{
            id: usuario.id,
            nombre: usuario.menu.nombre,
            esAdmin: false,
            membresias: usuario.areas.map((a) => ({ area_id: a.id, rol: a.rol })),
            firma: rol === "direccion" ? FIRMA_DEMO : null,
          }}
          iaDisponible
          base={B}
          demo
        />
      )
    } else if (seccion === "tablero") {
      const dias = [7, 30, 90].includes(Number(sp.dias)) ? Number(sp.dias) : 30
      const circuitos = TIPOS.filter((t) => t.pasos_actuales != null).map((t) => ({
        codigo: t.codigo,
        nombre: t.nombre,
        antes: t.pasos_actuales ?? 0,
        despues: PARAMETRIZACION.pasos.filter((p) => p.tipo_tramite_id === t.id).length,
      }))
      contenido = <VistaTablero resumen={RESUMEN} porTipo={POR_TIPO} carga={CARGA} serie={serieDemo(dias)} dias={dias} etapas={ETAPAS} circuitos={circuitos} />
    } else if (seccion === "mi-firma") {
      const conFirma = rol === "direccion"
      contenido = (
        <VistaMiFirma
          firma={conFirma ? { id: "demo", ...FIRMA_DEMO, registradaAt: "2026-09-29T13:00:00.000Z", bloqueadaHasta: null } : null}
          nombre={nombreCompleto(ROLES_DEMO[rol].persona)}
          demo
        />
      )
    } else {
      contenido = <VistaParametrizacion {...PARAMETRIZACION} />
    }

    return (
      <>
        <ShellInterno usuario={usuario} pendientes={pendientes} base={B}>
          {contenido}
        </ShellInterno>
        <BarraDemo rol={rol} interno />
      </>
    )
  }

  // --- Portal del agente -------------------------------------------------
  if (["mis-tramites", "perfil"].includes(seccion)) {
    const usuario = usuarioDemo("agente")
    let contenido: React.ReactNode = null
    if (seccion === "perfil") {
      contenido = <VistaPerfil perfil={PERFIL_AGENTE} demo />
    } else if (!id) {
      contenido = <VistaMisTramites usuarioId={usuario.id} nombre="Ana" tramites={TRAMITES_AGENTE} base={B} demo />
    } else if (id === "nuevo" && !extra) {
      contenido = (
        <div className="space-y-6">
          <EncabezadoCatalogo base={B} />
          <Catalogo tipos={CATALOGO} base={B} />
        </div>
      )
    } else if (id === "nuevo" && extra) {
      const t = TIPOS.find((x) => x.codigo === decodeURIComponent(extra))
      if (!t) notFound()
      contenido = (
        <VistaFormularioNuevo
          agente={{ ...PERFIL_AGENTE, nombre: `${PERFIL_AGENTE.nombre} ${PERFIL_AGENTE.apellido}` }}
          tipo={{
            ...t,
            campos: leerFormulario(t.formulario),
            requisitos: leerRequisitos(t.requisitos),
            pasos: PARAMETRIZACION.pasos.filter((p) => p.tipo_tramite_id === t.id).map((p) => ({ orden: p.orden, nombre: p.nombre, area: p.area?.nombre ?? "" })),
          }}
          base={B}
          demo
        />
      )
    } else {
      const datos = EXPEDIENTES[id]
      if (!datos) notFound()
      contenido = <VistaSeguimiento datos={datos} nuevo={Boolean(sp.nuevo)} base={B} demo />
    }
    return (
      <>
        <ShellAgente usuario={usuario} base={B}>
          {contenido}
        </ShellAgente>
        <BarraDemo rol="agente" interno={false} />
      </>
    )
  }

  notFound()
}

function Galeria() {
  const grupos = [
    {
      titulo: "Portal del agente",
      descripcion: "Lo que ve cualquier agente municipal, pensado primero para el celular.",
      items: [
        { href: `${B}/mis-tramites`, icono: FileText, titulo: "Mis trámites", texto: "Estado de cada trámite en lenguaje claro y lo que requiere acción primero." },
        { href: `${B}/mis-tramites/nuevo`, icono: FilePlus2, titulo: "Catálogo de trámites", texto: "Búsqueda tolerante a acentos, plazos y documentos requeridos." },
        { href: `${B}/mis-tramites/nuevo/ASIG-NACIMIENTO`, icono: FilePlus2, titulo: "Asistente de inicio", texto: "Datos del legajo precargados, requisitos condicionales, autoguardado y revisión final." },
        { href: `${B}/mis-tramites/demo-urgente`, icono: FileText, titulo: "Seguimiento en curso", texto: "Estado simple, dónde está, qué sigue y cuánto lleva." },
        { href: `${B}/mis-tramites/demo-cierre`, icono: Stamp, titulo: "Trámite aprobado", texto: "Resolución firmada con número asignado al firmar." },
        { href: `${B}/mis-tramites/demo-observado`, icono: FileText, titulo: "Trámite observado", texto: "La corrección pedida y la respuesta con adjunto, en el mismo lugar." },
        { href: `${B}/mis-tramites/demo-resuelto`, icono: Stamp, titulo: "Trámite resuelto", texto: "La resolución firmada y todo el recorrido." },
        { href: `${B}/perfil`, icono: UserRound, titulo: "Mi perfil", texto: "Celular para avisos por WhatsApp a través de Migue." },
      ],
    },
    {
      titulo: "Capital Humano",
      descripcion: "El espacio de trabajo interno. Cambiá de rol con la barra inferior.",
      items: [
        { href: `${B}/bandeja?como=bonificaciones`, icono: Inbox, titulo: "Bandeja de trabajo", texto: "Foco en vencidos y urgentes, atajos de teclado y tomar con un clic." },
        { href: `${B}/expedientes/demo-titulo?como=bonificaciones`, icono: Inbox, titulo: "Tarea del paso (Bonificaciones)", texto: "Qué controlar, qué revisar y qué producir, según el relevamiento." },
        { href: `${B}/expedientes/demo-urgente?como=medicina`, icono: Inbox, titulo: "Expediente urgente y reservado", texto: "Hijo/a con discapacidad: entra por Medicina Laboral con prioridad." },
        { href: `${B}/expedientes/demo-dictamen?como=dictamenes`, icono: Inbox, titulo: "Dictamen con IA (Asesoría Legal)", texto: "Borrador con datos [COMPLETAR] por resolver antes de firmar." },
        { href: `${B}/expedientes/demo-firma?como=direccion`, icono: Stamp, titulo: "Firma de resolución (Dirección)", texto: "Número y fecha se asignan al firmar: sin protocolización manual." },
        { href: `${B}/expedientes/demo-cierre?como=bonificaciones`, icono: Stamp, titulo: "Cierre (Bonificaciones)", texto: "Novedad a Liquidación, notificación y legajo digital." },
        { href: `${B}/mi-firma?como=bonificaciones`, icono: PenLine, titulo: "Registrar mi firma", texto: "Dibujada o escaneada, una sola vez, con clave de 6 números." },
        { href: `${B}/documento/demo-cierre-f8`, icono: FileText, titulo: "Documento oficial", texto: "Membrete, firma registrada y QR de verificación, listo para imprimir." },
        { href: `${B}/verificar`, icono: BadgeCheck, titulo: "Verificación pública", texto: "Cualquiera comprueba con el código o el QR que la copia es auténtica." },
        { href: `${B}/tablero`, icono: BarChart3, titulo: "Tablero de impacto", texto: "De 35 días a horas, días ahorrados e informe imprimible." },
        { href: `${B}/parametrizacion`, icono: Settings2, titulo: "Trámites y circuitos", texto: "Formularios, requisitos, cursogramas y modelos para la IA." },
      ],
    },
  ]

  return (
    <main className="fondo-marca min-h-svh px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Marca />
        <h1 className="mt-8 text-3xl font-semibold tracking-tight">Vista previa de diseño</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Todas las pantallas con datos de ejemplo, sin iniciar sesión. Las acciones se simulan y no se guarda nada. Sirve para revisar la
          interfaz y para presentar el sistema.
        </p>
        <div className="mt-10 space-y-10">
          {grupos.map((g) => (
            <section key={g.titulo}>
              <h2 className="text-lg font-semibold">{g.titulo}</h2>
              <p className="text-sm text-muted-foreground">{g.descripcion}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {g.items.map((i) => (
                  <Link
                    key={i.href}
                    href={i.href}
                    className="group flex flex-col rounded-2xl border bg-card/90 p-5 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
                  >
                    <i.icono className="size-5 text-primary" />
                    <h3 className="mt-3 font-medium">{i.titulo}</h3>
                    <p className="mt-1 flex-1 text-sm text-muted-foreground">{i.texto}</p>
                    <ArrowRight className="mt-3 size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}
