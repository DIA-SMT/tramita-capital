// Formas de datos que reciben las vistas. Las páginas las cargan desde Supabase;
// la vista previa de diseño (/vista-previa) las arma con datos de ejemplo.
import type { Enum, Fila } from "@/lib/database.types"
import type { DatosMenu } from "@/components/menu-usuario"

export type UsuarioVista = {
  id: string
  menu: DatosMenu
  areas: { id: string; nombre: string; rol: Enum<"rol_area"> }[]
  esInterno: boolean
  esAdmin: boolean
  perfilIncompleto?: boolean
}

export type FilaBandeja = Pick<
  Fila<"expedientes">,
  | "id"
  | "numero"
  | "asunto"
  | "estado"
  | "prioridad"
  | "prioridad_motivo"
  | "prioridad_origen"
  | "vence_at"
  | "created_at"
  | "reservado"
  | "asignado_a"
  | "area_actual_id"
> & {
  tipo: { nombre: string; icono: string | null } | null
  area: { nombre: string } | null
  iniciador: { nombre: string; apellido: string; legajo: string | null } | null
  asignado: { nombre: string; apellido: string } | null
  /** Solo en "Pasados por mi área": desde cuándo está en su oficina actual y cuándo lo pasó el área. */
  seguimiento?: { enAreaDesde: string | null; pasadoAt: string | null }
}

export type ResumenMetricas = {
  activos: number
  ingresados_hoy: number
  resueltos_30d: number
  vencidos: number
  urgentes: number
  promedio_dias: number | null
  linea_base_dias: number | null
  hojas_evitadas: number
  borradores_ia: number
  borradores_ia_aceptados: number
}

/** Métricas de impacto del período (metricas_impacto). null si la base todavía no las tiene. */
export type ImpactoMetricas = {
  resoluciones: number
  resoluciones_olografas: number
  novedades_registradas: number
  novedades_pendientes: number
  novedades_cargadas: number
  /** Días promedio entre que Bonificaciones la registra y Liquidación la carga en Civitas. */
  novedades_demora_carga: number | null
  /** Días promedio entre la firma de la resolución y la carga en Civitas. */
  resolucion_a_civitas: number | null
  consultas_migue: number
  personas_migue: number
  consultas_migue_ok: number
  hojas_anio: number
}

export type MetricaTipo = {
  codigo: string
  nombre: string
  promedio: number | null
  lineaBase: number | null
  plazo: number | null
  resueltos: number
  total: number
}

export type CargaPersona = { perfil_id: string; nombre: string; area: string; asignados: number; fojas_30d: number }
export type DiaSerie = { dia: string; ingresados: number; resueltos: number }
export type EtapaMetrica = { area: string; estadias: number; horas_promedio: number; horas_maximo: number }
/** Pasos del circuito en papel (relevamiento) frente al circuito digital configurado. */
export type CircuitoComparado = { codigo: string; nombre: string; antes: number; despues: number }

export type TramiteAgente = Pick<Fila<"expedientes">, "id" | "numero" | "asunto" | "estado" | "resultado" | "instancia" | "paso_actual" | "updated_at" | "created_at"> & {
  tipo: { nombre: string; icono: string | null } | null
  area: { codigo: string; nombre: string } | null
  pasos: { orden: number; nombre: string; accion: Enum<"accion_paso"> }[]
}

/** Un expediente en la cola de firma de resoluciones (/firmar). */
export type ItemFirma = {
  id: string
  numero: string
  asunto: string
  prioridad: Enum<"prioridad_expediente">
  reservado: boolean
  vence_at: string | null
  /** Cuándo llegó a la oficina que firma. */
  llegoAt: string
  /** La resolución ya está firmada y falta pasar el expediente a la oficina siguiente. */
  firmada: boolean
  tipo: { nombre: string; icono: string | null }
  agente: string
  /** Proyecto de resolución en borrador; null si el área anterior no lo dejó. */
  proyecto: { titulo: string; sentido: "hace_lugar" | "rechaza" | null; conIA: boolean; incompleto: boolean } | null
}

/** Una resolución firmada en el Registro de resoluciones (/resoluciones). */
export type FilaResolucion = {
  /** Foja de la resolución; null si es de la demo y no tiene copia. */
  id: string | null
  /** Número de protocolo (N/DCH/AAAA). */
  numero: string | null
  firmadaAt: string
  sentido: "hace_lugar" | "rechaza" | null
  olografa: boolean
  firmante: string | null
  agente: string
  /** Para abrir su ficha; null en la demo cuando la persona es inventada. */
  agenteId: string | null
  tramite: { nombre: string; icono: string | null }
  /** id null: expediente que esta persona no puede abrir (o de la demo). */
  expediente: { id: string | null; numero: string; reservado: boolean }
}

/** Lo que quedó en el legajo digital de un agente: resoluciones firmadas y documentación archivada. */
export type EntradaLegajo = {
  id: string
  titulo: string
  fecha: string
  /** Trámite del que salió; null si la persona no puede abrirlo. */
  tramite: { expedienteId: string | null; numero: string; nombre: string } | null
  /** Resolución: la foja firmada, con su copia oficial. */
  resolucion: { fojaId: string | null; numero: string | null; sentido: "hace_lugar" | "rechaza" | null } | null
  /** Documentación: el archivo, con descarga segura. */
  documento: { id: string; nombre: string; bytes: number | null } | null
  /** Presentación del agente que el trámite manda al legajo (por ejemplo, el formulario de cambio de domicilio): la foja firmada, con su copia oficial. */
  presentacion?: { fojaId: string } | null
}

/** Ficha de un agente para el personal de Capital Humano (/agentes/[id]). */
export type FichaAgente = {
  id: string
  nombre: string
  /** Datos del legajo; null si esta persona solo puede ver el nombre (puede_ver_perfil). */
  perfil: {
    legajo: string | null
    cuil: string | null
    reparticion: string | null
    categoria: string | null
    email: string
    telefono: string | null
  } | null
  tramites: (Pick<Fila<"expedientes">, "id" | "numero" | "asunto" | "estado" | "resultado" | "reservado" | "created_at" | "resuelto_at"> & {
    tipo: { nombre: string; icono: string | null }
    area: string | null
  })[]
  legajo: EntradaLegajo[]
  /** Novedades de haberes; null si esta persona no trabaja con ellas. */
  novedades:
    | {
        id: string
        concepto: string
        movimiento: Fila<"novedades_haberes">["movimiento"]
        vigenciaDesde: string
        estado: Fila<"novedades_haberes">["estado"]
        resolucion: string | null
      }[]
    | null
}

export type TipoCatalogo = Pick<
  Fila<"tipos_tramite">,
  "codigo" | "nombre" | "descripcion" | "categoria" | "icono" | "plazo_dias" | "reservado" | "requisitos"
>
