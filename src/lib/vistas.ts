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

export type TipoCatalogo = Pick<
  Fila<"tipos_tramite">,
  "codigo" | "nombre" | "descripcion" | "categoria" | "icono" | "plazo_dias" | "reservado" | "requisitos"
>
