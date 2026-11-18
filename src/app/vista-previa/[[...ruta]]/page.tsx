import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  BarChart3,
  BookOpenText,
  FilePlus2,
  FileStack,
  FileText,
  FolderLock,
  Inbox,
  LifeBuoy,
  MapPin,
  PenLine,
  Scale,
  Settings2,
  Sparkles,
  Stamp,
  UserRound,
} from "lucide-react"
import { Marca } from "@/components/marca"
import { ShellAgente } from "@/components/agente/shell"
import { ShellInterno } from "@/components/interno/shell"
import {
  asistenteDemo,
  BANDEJA,
  pasadosDemo,
  CARGA,
  CATALOGO,
  COLA_FIRMA_DEMO,
  ETAPAS,
  EXPEDIENTES,
  fichaDemo,
  FIRMA_DEMO,
  impactoDemo,
  legajoDemo,
  NOVEDADES_DEMO,
  PARAMETRIZACION,
  PERFIL_AGENTE,
  PERSONAS,
  POR_TIPO,
  RESOLUCIONES_DEMO,
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
import { CopiaExpediente } from "@/components/documento/copia-expediente"
import { DocumentoOficial } from "@/components/documento/documento-oficial"
import { VistaAyuda } from "@/app/(interno)/ayuda/vista"
import { VistaFirmar } from "@/app/(interno)/firmar/vista"
import { VistaMiFirma } from "@/app/(interno)/mi-firma/vista"
import { VistaResoluciones } from "@/app/(interno)/resoluciones/vista"
import { VistaVerificar, type ResultadoVerificacion } from "@/app/verificar/vista"
import { VistaBandeja } from "@/app/(interno)/bandeja/vista"
import { VistaExpediente } from "@/app/(interno)/expedientes/[id]/vista"
import { VistaParametrizacion } from "@/app/(interno)/parametrizacion/vista"
import { VistaNovedades } from "@/app/(interno)/novedades/vista"
import { VistaTablero } from "@/app/(interno)/tablero/vista"
import { VistaMisTramites } from "@/app/(agente)/mis-tramites/vista"
import { Catalogo } from "@/app/(agente)/mis-tramites/nuevo/catalogo"
import { EncabezadoCatalogo } from "@/app/(agente)/mis-tramites/nuevo/encabezado"
import { VistaFormularioNuevo } from "@/app/(agente)/mis-tramites/nuevo/[codigo]/vista"
import { VistaSeguimiento } from "@/app/(agente)/mis-tramites/[id]/vista"
import { VistaPerfil } from "@/app/(agente)/perfil/vista"
import { VistaMigue } from "@/app/(agente)/migue/vista"
import { VistaMiLegajo } from "@/app/(agente)/mi-legajo/vista"
import { VistaFichaAgente } from "@/app/(interno)/agentes/[id]/vista"
import { observacionesDemo, RADIOGRAFIA_DEMO, tableroIADemo } from "@/lib/demo/tablero-ia"
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
          imagenFirma={sello?.tipo === "olografa" ? urlImagenFirma(f.id, true) : null}
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
          firma_olografa: sello?.tipo === "olografa",
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
  if (["bandeja", "expedientes", "tablero", "parametrizacion", "mi-firma", "novedades", "firmar", "resoluciones", "ayuda", "agentes"].includes(seccion)) {
    const rol: RolDemo =
      como ??
      (seccion === "expedientes" && id
        ? (ROL_SUGERIDO[id] ?? "bonificaciones")
        : seccion === "novedades"
          ? "liquidacion"
          : seccion === "firmar" || seccion === "resoluciones"
            ? "direccion"
            : "bonificaciones")
    const areaRol = ROLES_DEMO[rol].area
    const novedadesPendientes = ["BONIF", "LIQ", "DIR"].includes(areaRol) ? NOVEDADES_DEMO.filter((n) => n.estado === "pendiente").length : null
    const usuario = usuarioDemo(rol)
    // Primer ingreso de Dirección, antes de registrar la firma (?firma=pendiente).
    const firmaPendiente = rol === "direccion" && sp.firma === "pendiente"
    const misAreas = usuario.areas.map((a) => a.id)
    const pendientes = BANDEJA.filter((e) => e.area_actual_id && misAreas.includes(e.area_actual_id)).length
    // Cola de firma de la Dirección; en la vista previa, lo firmado se va sacando con ?hechas=.
    const hechas = typeof sp.hechas === "string" ? sp.hechas.split(",").filter(Boolean) : []
    const cola = rol === "direccion" ? COLA_FIRMA_DEMO.filter((i) => !hechas.includes(i.id)) : null

    let contenido: React.ReactNode = null
    if (seccion === "bandeja") {
      const vista = sp.vista === "mios" || sp.vista === "todos" || sp.vista === "pasados" ? sp.vista : "area"
      const pasados = pasadosDemo(misAreas)
      const filtrados =
        vista === "pasados"
          ? pasados
          : BANDEJA.filter((e) =>
              vista === "mios" ? e.asignado_a === usuario.id : vista === "area" ? e.area_actual_id && misAreas.includes(e.area_actual_id) : true,
            )
      contenido = (
        <VistaBandeja
          expedientes={filtrados}
          vistas={[
            { clave: "area", etiqueta: "En mis áreas", cantidad: pendientes },
            { clave: "mios", etiqueta: "Asignados a mí", cantidad: BANDEJA.filter((e) => e.asignado_a === usuario.id).length },
            { clave: "pasados", etiqueta: "Pasados por mi área", cantidad: pasados.length },
            { clave: "todos", etiqueta: "Todo Capital Humano", cantidad: BANDEJA.length },
          ]}
          tipos={TIPOS.map((t) => ({ codigo: t.codigo, nombre: t.nombre }))}
          usuarioId={usuario.id}
          misAreas={misAreas}
          nombre={ROLES_DEMO[rol].persona.nombre}
          vista={vista}
          paraFirmar={cola ? cola.length : null}
          base={B}
          demo
        />
      )
    } else if (seccion === "expedientes" && extra === "completo") {
      const datos = id ? EXPEDIENTES[id] : null
      if (!datos) notFound()
      const ini = Object.values(PERSONAS).find((p) => p.id === datos.expediente.iniciador_id)!
      contenido = (
        <CopiaExpediente
          datos={datos}
          iniciador={ini}
          generada={{ por: nombreCompleto(ROLES_DEMO[rol].persona), at: new Date().toISOString() }}
          urlVerificacion={`${entorno.sitio}${B}/verificar`}
          volver={`${B}/expedientes/${datos.expediente.id}?como=${rol}`}
          demo
        />
      )
    } else if (seccion === "firmar") {
      const enlace = (exp: string, sacar: string[] = hechas) => `${B}/firmar?como=${rol}${sacar.length ? `&hechas=${sacar.join(",")}` : ""}&exp=${exp}`
      const pedido = typeof sp.exp === "string" ? sp.exp : null
      const elegido = cola?.find((i) => i.id === pedido) ?? cola?.find((i) => !i.firmada) ?? cola?.[0] ?? null
      const datos = elegido ? EXPEDIENTES[elegido.id] : null
      const ini = datos ? Object.values(PERSONAS).find((p) => p.id === datos.expediente.iniciador_id)! : null
      const proximo = cola?.find((i) => !i.firmada && i.id !== elegido?.id)
      const tras = elegido ? [...hechas, elegido.id] : hechas
      contenido = (
        <VistaFirmar
          firmaResoluciones={cola !== null}
          cola={cola ?? []}
          elegido={datos ? { datos, iniciador: ini } : null}
          firmante={{ nombre: nombreCompleto(ROLES_DEMO[rol].persona), cargo: "Firmante de Dirección de Capital Humano" }}
          firmaRegistrada={firmaPendiente ? null : FIRMA_DEMO}
          enlace={(exp) => enlace(exp)}
          rutaTrasFirmar={proximo ? enlace(proximo.id, tras) : `${B}/firmar?como=${rol}&hechas=${tras.join(",")}`}
          base={B}
          demo
        />
      )
    } else if (seccion === "resoluciones") {
      contenido = <VistaResoluciones filas={RESOLUCIONES_DEMO} anio={2026} anios={[2026]} veReservados base={B} />
    } else if (seccion === "agentes") {
      const ficha = id ? fichaDemo(id, novedadesPendientes !== null) : null
      if (!ficha) notFound()
      contenido = <VistaFichaAgente ficha={ficha} base={B} demo />
    } else if (seccion === "ayuda") {
      const r = ROLES_DEMO[rol]
      contenido = (
        <VistaAyuda
          operador={r.rol === "operador"}
          dictaminante={r.rol === "dictaminante"}
          firmante={rol === "direccion"}
          novedades={["BONIF", "LIQ"].includes(r.area)}
          base={B}
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
            firma: rol === "direccion" && !firmaPendiente ? FIRMA_DEMO : null,
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
      // Lectura con IA, preguntas y causas: arrancan sin correr y se simulan al tocar el botón. Con ?como= de un
      // operador se ven como las ve quien no las puede pedir.
      const operador = como != null && ROLES_DEMO[como].rol === "operador"
      contenido = (
        <VistaTablero
          resumen={RESUMEN}
          impacto={impactoDemo(dias)}
          porTipo={POR_TIPO}
          carga={CARGA}
          serie={serieDemo(dias)}
          dias={dias}
          etapas={ETAPAS}
          circuitos={circuitos}
          radiografia={RADIOGRAFIA_DEMO}
          observaciones={observacionesDemo(dias)}
          ia={{ disponible: true, puedeCorrer: !operador, lectura: null, observaciones: null, demo: tableroIADemo(dias) }}
        />
      )
    } else if (seccion === "novedades") {
      contenido = (
        <VistaNovedades
          novedades={NOVEDADES_DEMO}
          puedeCargar={["BONIF", "LIQ"].includes(areaRol)}
          sinAcceso={novedadesPendientes === null}
          base={B}
          demo
        />
      )
    } else if (seccion === "mi-firma") {
      const conFirma = rol === "direccion" && !firmaPendiente
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
        <ShellInterno
          usuario={usuario}
          pendientes={pendientes}
          paraFirmar={cola ? cola.length : null}
          novedades={novedadesPendientes}
          firmaPendiente={firmaPendiente}
          base={B}
        >
          {contenido}
        </ShellInterno>
        <BarraDemo rol={rol} interno />
      </>
    )
  }

  // --- Portal del agente -------------------------------------------------
  if (["mis-tramites", "perfil", "migue", "mi-legajo"].includes(seccion)) {
    const usuario = usuarioDemo("agente")
    let contenido: React.ReactNode = null
    if (seccion === "perfil") {
      contenido = <VistaPerfil perfil={PERFIL_AGENTE} demo />
    } else if (seccion === "mi-legajo") {
      contenido = <VistaMiLegajo entradas={legajoDemo(PERSONAS.ana.id)} base={B} demo />
    } else if (id && extra === "completo") {
      const datos = EXPEDIENTES[id]
      if (!datos || datos.expediente.iniciador_id !== PERSONAS.ana.id) notFound()
      contenido = (
        <CopiaExpediente
          datos={datos}
          iniciador={PERSONAS.ana}
          generada={{ por: nombreCompleto(PERSONAS.ana), at: new Date().toISOString() }}
          urlVerificacion={`${entorno.sitio}${B}/verificar`}
          volver={`${B}/mis-tramites/${id}`}
          etiquetaVolver="Volver al trámite"
          demo
        />
      )
    } else if (seccion === "migue") {
      const datos = asistenteDemo(typeof sp.expediente === "string" ? sp.expediente : null)
      const foco = datos.tramites.find((t) => t.id === datos.enfocado)
      contenido = <VistaMigue enfocado={foco ? { id: foco.id, numero: foco.numero, tipo: foco.tipo } : null} />
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
      const t = TIPOS.find((x) => x.codigo === decodeURIComponent(extra) && !x.es_recurso)
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
        <ShellAgente usuario={usuario} migue={{ nombre: "Ana", restantes: 30, disponible: true, datosDemo: asistenteDemo(null) }} base={B}>
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
        { href: `${B}/mi-legajo`, icono: FolderLock, titulo: "Mi legajo", texto: "Las resoluciones de sus trámites con copia oficial y la documentación archivada: sin desglose en papel." },
        { href: `${B}/mis-tramites/demo-haberes/completo`, icono: FileStack, titulo: "Mi expediente completo", texto: "El agente descarga su propio expediente, con carátula, fojas y firmas, en PDF." },
        {
          href: `${B}/mis-tramites/demo-rechazado`,
          icono: Scale,
          titulo: "Pedir reconsideración",
          texto: "Si no está de acuerdo con lo resuelto, la agente la pide desde el trámite, dentro de los 8 días hábiles.",
        },
        { href: `${B}/mis-tramites/demo-haberes`, icono: Banknote, titulo: "Impacto en haberes", texto: "Desde qué período rige y cuándo Liquidación lo cargó en Civitas." },
        { href: `${B}/migue`, icono: Sparkles, titulo: "Migue", texto: "El asistente de los trámites: estado, requisitos, plazos y haberes. También flota en cada pantalla y responde por WhatsApp." },
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
        { href: `${B}/firmar?como=direccion`, icono: Stamp, titulo: "Para firmar (Dirección)", texto: "Las resoluciones listas, una tras otra: leer, controlar, firmar y pasar sin abrir cada expediente." },
        { href: `${B}/expedientes/demo-firma?como=direccion`, icono: Stamp, titulo: "Firma de resolución (Dirección)", texto: "Número y fecha se asignan al firmar: sin protocolización manual." },
        { href: `${B}/expedientes/demo-cierre?como=bonificaciones`, icono: Stamp, titulo: "Cierre (Bonificaciones)", texto: "Novedad de haberes con el período leído de la resolución, foja firmada y archivo." },
        {
          href: `${B}/expedientes/demo-hijos?como=bonificaciones`,
          icono: Stamp,
          titulo: "Varias altas en un expediente",
          texto: "Dos hijos/as y la familia numerosa en una resolución: la novedad propone una línea por cada uno.",
        },
        {
          href: `${B}/expedientes/demo-recurso?como=dictamenes`,
          icono: Scale,
          titulo: "Recurso de reconsideración (Asesoría)",
          texto: "Expediente nuevo, vinculado al recurrido: fundamentos, documentación nueva y la resolución recurrida a mano.",
        },
        {
          href: `${B}/expedientes/demo-domicilio?como=higiene`,
          icono: MapPin,
          titulo: "Cambio de domicilio (Higiene y Seguridad)",
          texto: "El recorrido marcado en el mapa y el cierre sin resolución, con la constancia de lo hecho.",
        },
        { href: `${B}/novedades?como=liquidacion`, icono: Banknote, titulo: "Novedades de haberes (Liquidación)", texto: "Planilla para Civitas en un clic y control de lo cargado: sin desglose en papel." },
        { href: `${B}/bandeja?como=direccion&firma=pendiente`, icono: PenLine, titulo: "Primer ingreso de Dirección", texto: "Antes de empezar, el sistema pide registrar la firma de las resoluciones." },
        { href: `${B}/mi-firma?como=bonificaciones`, icono: PenLine, titulo: "Registrar mi firma", texto: "Dibujada o escaneada, una sola vez, con clave de 6 números." },
        { href: `${B}/documento/demo-cierre-f8`, icono: FileText, titulo: "Documento oficial", texto: "Membrete, firma registrada y QR de verificación, listo para imprimir." },
        { href: `${B}/expedientes/demo-haberes/completo?como=bonificaciones`, icono: FileStack, titulo: "Expediente completo", texto: "Carátula, índice, cada foja con su firma y la hoja de ruta: como en papel, listo para PDF." },
        { href: `${B}/agentes/p-ana?como=bonificaciones`, icono: UserRound, titulo: "Ficha del agente", texto: "Sus datos, sus trámites, su legajo digital y sus novedades de haberes, en un solo lugar." },
        { href: `${B}/resoluciones`, icono: BookOpenText, titulo: "Registro de resoluciones", texto: "El protocolo con la numeración correlativa y la copia oficial de cada una." },
        { href: `${B}/verificar`, icono: BadgeCheck, titulo: "Verificación pública", texto: "Cualquiera comprueba con el código o el QR que la copia es auténtica." },
        { href: `${B}/tablero`, icono: BarChart3, titulo: "Tablero de impacto", texto: "De 35 días a horas, días ahorrados e informe imprimible." },
        { href: `${B}/parametrizacion`, icono: Settings2, titulo: "Trámites y circuitos", texto: "Formularios, requisitos, cursogramas y modelos para la IA." },
        { href: `${B}/ayuda?como=bonificaciones`, icono: LifeBuoy, titulo: "Del papel al sistema", texto: "Ayuda para el personal: dónde quedó cada cosa del papel y el trabajo de cada rol, paso a paso." },
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
