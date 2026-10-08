// Tipos de la base de datos.
// Escritos a mano a partir de supabase/migrations; regenerar con:
//   npx supabase gen types typescript --local > src/lib/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type Rel<FK extends string, Col extends string, Ref extends string> = {
  foreignKeyName: FK
  columns: [Col]
  isOneToOne: false
  referencedRelation: Ref
  referencedColumns: ["id"]
}

export type Database = {
  __InternalSupabase: { PostgrestVersion: "13.0.5" }
  public: {
    Tables: {
      areas: {
        Row: { id: string; codigo: string; nombre: string; descripcion: string | null; activa: boolean; created_at: string }
        Insert: { id?: string; codigo: string; nombre: string; descripcion?: string | null; activa?: boolean; created_at?: string }
        Update: { id?: string; codigo?: string; nombre?: string; descripcion?: string | null; activa?: boolean; created_at?: string }
        Relationships: []
      }
      perfiles: {
        Row: {
          id: string; email: string; nombre: string; apellido: string; cuil: string | null; legajo: string | null
          telefono: string | null; reparticion: string | null; categoria: string | null; dependencia: string | null
          es_admin: boolean; created_at: string; updated_at: string
        }
        Insert: {
          id: string; email: string; nombre?: string; apellido?: string; cuil?: string | null; legajo?: string | null
          telefono?: string | null; reparticion?: string | null; categoria?: string | null; dependencia?: string | null
          es_admin?: boolean; created_at?: string; updated_at?: string
        }
        Update: { nombre?: string; apellido?: string; telefono?: string | null }
        Relationships: []
      }
      miembros_area: {
        Row: { perfil_id: string; area_id: string; rol: Database["public"]["Enums"]["rol_area"]; ve_reservados: boolean; created_at: string }
        Insert: { perfil_id: string; area_id: string; rol?: Database["public"]["Enums"]["rol_area"]; ve_reservados?: boolean; created_at?: string }
        Update: { rol?: Database["public"]["Enums"]["rol_area"]; ve_reservados?: boolean }
        Relationships: [
          Rel<"miembros_area_perfil_id_fkey", "perfil_id", "perfiles">,
          Rel<"miembros_area_area_id_fkey", "area_id", "areas">,
        ]
      }
      tipos_tramite: {
        Row: {
          id: string; codigo: string; nombre: string; descripcion: string | null; categoria: string; icono: string | null
          normativa: string | null; requisitos: Json; formulario: Json; plazo_dias: number | null; linea_base_dias: number | null
          prioridad_base: Database["public"]["Enums"]["prioridad_expediente"]; reservado: boolean; activo: boolean
          version: number; codigo_relevamiento: string | null; oficina: string | null; pasos_actuales: number | null
          documentacion_final: string[]; created_at: string; updated_at: string
        }
        Insert: {
          id?: string; codigo: string; nombre: string; descripcion?: string | null; categoria?: string; icono?: string | null
          normativa?: string | null; requisitos?: Json; formulario?: Json; plazo_dias?: number | null; linea_base_dias?: number | null
          prioridad_base?: Database["public"]["Enums"]["prioridad_expediente"]; reservado?: boolean; activo?: boolean; version?: number
          codigo_relevamiento?: string | null; oficina?: string | null; pasos_actuales?: number | null; documentacion_final?: string[]
        }
        Update: Partial<Database["public"]["Tables"]["tipos_tramite"]["Insert"]>
        Relationships: []
      }
      pasos_circuito: {
        Row: {
          id: string; tipo_tramite_id: string; orden: number; nombre: string; area_id: string
          accion: Database["public"]["Enums"]["accion_paso"]; plazo_horas: number | null; instrucciones: string | null
          controles: string[]; revisa: string[]; genera: string[]; permite_subsanacion: boolean; destino_final: string | null
        }
        Insert: {
          id?: string; tipo_tramite_id: string; orden: number; nombre: string; area_id: string
          accion: Database["public"]["Enums"]["accion_paso"]; plazo_horas?: number | null; instrucciones?: string | null
          controles?: string[]; revisa?: string[]; genera?: string[]; permite_subsanacion?: boolean; destino_final?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["pasos_circuito"]["Insert"]>
        Relationships: [
          Rel<"pasos_circuito_tipo_tramite_id_fkey", "tipo_tramite_id", "tipos_tramite">,
          Rel<"pasos_circuito_area_id_fkey", "area_id", "areas">,
        ]
      }
      plantillas: {
        Row: {
          id: string; tipo_tramite_id: string; tipo_documento: Database["public"]["Enums"]["tipo_actuacion"]; nombre: string
          cuerpo: string; instrucciones_ia: string | null; version: number; activa: boolean; created_at: string
        }
        Insert: {
          id?: string; tipo_tramite_id: string; tipo_documento: Database["public"]["Enums"]["tipo_actuacion"]; nombre: string
          cuerpo: string; instrucciones_ia?: string | null; version?: number; activa?: boolean
        }
        Update: Partial<Database["public"]["Tables"]["plantillas"]["Insert"]>
        Relationships: [Rel<"plantillas_tipo_tramite_id_fkey", "tipo_tramite_id", "tipos_tramite">]
      }
      expedientes: {
        Row: {
          id: string; numero: string; tipo_tramite_id: string; iniciador_id: string; asunto: string; datos: Json
          estado: Database["public"]["Enums"]["estado_expediente"]; prioridad: Database["public"]["Enums"]["prioridad_expediente"]
          prioridad_motivo: string | null; prioridad_origen: string; paso_actual: number; area_actual_id: string | null
          asignado_a: string | null; reservado: boolean; vence_at: string | null; resuelto_at: string | null
          resultado: "aprobado" | "rechazado" | null; instancia: number; created_at: string; updated_at: string
        }
        Insert: {
          id?: string; numero: string; tipo_tramite_id: string; iniciador_id: string; asunto: string; datos?: Json
          estado?: Database["public"]["Enums"]["estado_expediente"]; prioridad?: Database["public"]["Enums"]["prioridad_expediente"]
          prioridad_motivo?: string | null; prioridad_origen?: string; paso_actual?: number; area_actual_id?: string | null
          asignado_a?: string | null; reservado?: boolean; vence_at?: string | null; resuelto_at?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["expedientes"]["Insert"]>
        Relationships: [
          Rel<"expedientes_tipo_tramite_id_fkey", "tipo_tramite_id", "tipos_tramite">,
          Rel<"expedientes_iniciador_id_fkey", "iniciador_id", "perfiles">,
          Rel<"expedientes_asignado_a_fkey", "asignado_a", "perfiles">,
          Rel<"expedientes_area_actual_id_fkey", "area_actual_id", "areas">,
        ]
      }
      actuaciones: {
        Row: {
          id: string; expediente_id: string; foja: number | null; tipo: Database["public"]["Enums"]["tipo_actuacion"]
          titulo: string; contenido: string | null; datos: Json; estado: Database["public"]["Enums"]["estado_actuacion"]
          autor_id: string | null; area_id: string | null; generada_por_ia: boolean; ia_generacion_id: string | null
          firmada_por: string | null; firmada_at: string | null; hash: string | null; hash_anterior: string | null
          created_at: string; updated_at: string
        }
        Insert: {
          id?: string; expediente_id: string; tipo: Database["public"]["Enums"]["tipo_actuacion"]; titulo: string
          contenido?: string | null; datos?: Json; autor_id?: string | null; area_id?: string | null
          generada_por_ia?: boolean; ia_generacion_id?: string | null
        }
        Update: { titulo?: string; contenido?: string | null; datos?: Json; tipo?: Database["public"]["Enums"]["tipo_actuacion"] }
        Relationships: [
          Rel<"actuaciones_expediente_id_fkey", "expediente_id", "expedientes">,
          Rel<"actuaciones_autor_id_fkey", "autor_id", "perfiles">,
          Rel<"actuaciones_firmada_por_fkey", "firmada_por", "perfiles">,
          Rel<"actuaciones_area_id_fkey", "area_id", "areas">,
        ]
      }
      documentos: {
        Row: {
          id: string; expediente_id: string; actuacion_id: string | null; requisito_clave: string | null; nombre_archivo: string
          storage_path: string; mime_type: string | null; tamano_bytes: number | null; sha256: string | null
          subido_por: string | null; created_at: string
        }
        Insert: {
          id?: string; expediente_id: string; actuacion_id?: string | null; requisito_clave?: string | null; nombre_archivo: string
          storage_path: string; mime_type?: string | null; tamano_bytes?: number | null; sha256?: string | null; subido_por?: string | null
        }
        Update: never
        Relationships: [Rel<"documentos_expediente_id_fkey", "expediente_id", "expedientes">]
      }
      movimientos: {
        Row: {
          id: string; expediente_id: string; desde_area_id: string | null; hacia_area_id: string | null
          desde_perfil_id: string | null; hacia_perfil_id: string | null; paso_desde: number | null; paso_hacia: number | null
          motivo: string | null; created_at: string
        }
        Insert: never
        Update: never
        Relationships: [
          Rel<"movimientos_expediente_id_fkey", "expediente_id", "expedientes">,
          Rel<"movimientos_desde_area_id_fkey", "desde_area_id", "areas">,
          Rel<"movimientos_hacia_area_id_fkey", "hacia_area_id", "areas">,
        ]
      }
      ia_generaciones: {
        Row: {
          id: string; expediente_id: string | null; tipo: string; modelo: string; solicitado_por: string | null
          entrada_tokens: number | null; salida_tokens: number | null; duracion_ms: number | null; resultado: string | null
          estado: string; aceptada: boolean | null; created_at: string
        }
        Insert: {
          id?: string; expediente_id?: string | null; tipo: string; modelo: string; solicitado_por?: string | null
          entrada_tokens?: number | null; salida_tokens?: number | null; duracion_ms?: number | null; resultado?: string | null
          estado?: string; aceptada?: boolean | null
        }
        Update: { aceptada?: boolean | null }
        Relationships: []
      }
      notificaciones: {
        Row: {
          id: string; perfil_id: string; expediente_id: string | null; titulo: string; cuerpo: string | null
          canal: Database["public"]["Enums"]["canal_notificacion"]; leida_at: string | null; enviada_at: string | null
          error: string | null; created_at: string
        }
        Insert: {
          id?: string; perfil_id: string; expediente_id?: string | null; titulo: string; cuerpo?: string | null
          canal?: Database["public"]["Enums"]["canal_notificacion"]; leida_at?: string | null; enviada_at?: string | null; error?: string | null
        }
        Update: { leida_at?: string | null; enviada_at?: string | null; error?: string | null }
        Relationships: [Rel<"notificaciones_expediente_id_fkey", "expediente_id", "expedientes">]
      }
      legajo_documentos: {
        Row: {
          id: string; perfil_id: string; expediente_id: string | null; actuacion_id: string | null; documento_id: string | null
          tipo: string; titulo: string; created_at: string
        }
        Insert: never
        Update: never
        Relationships: [Rel<"legajo_documentos_expediente_id_fkey", "expediente_id", "expedientes">]
      }
      firmas_registradas: {
        // pin_hash existe en la base pero nunca se expone (sin permiso de lectura).
        Row: {
          id: string; perfil_id: string; aclaracion: string; cargo: string; imagen_path: string | null; imagen_sha256: string | null
          activa: boolean; bloqueada_hasta: string | null; created_at: string; revocada_at: string | null
          // Versión 2: trazo visible de la última muestra; las muestras y su patrón nunca se exponen.
          version: number; visible: Json | null; dispositivo: string | null; tinta: string | null
        }
        Insert: never
        Update: never
        Relationships: []
      }
      intentos_firma: {
        Row: {
          id: number; perfil_id: string; actuacion_id: string | null; motivo: "clave" | "trazo" | "copia"; puntaje: number | null
          crudo: Json | null; dispositivo: string | null; created_at: string
        }
        Insert: never
        Update: never
        Relationships: []
      }
      // Evidencia pericial de cada resolución firmada: solo administración / auditoría.
      evidencias_firma: {
        Row: {
          id: string; actuacion_id: string; perfil_id: string; registro_id: string; crudo: Json; patron: Json
          dispositivo: string | null; contexto: Json; sha256: string; created_at: string
        }
        Insert: never
        Update: never
        Relationships: []
      }
      auditoria: {
        Row: { id: number; tabla: string; registro_id: string | null; accion: string; actor_id: string | null; datos: Json | null; created_at: string }
        Insert: never
        Update: never
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      crear_expediente: { Args: { p_tipo: string; p_asunto: string; p_datos: Json }; Returns: Database["public"]["Tables"]["expedientes"]["Row"] }
      registrar_documentos: { Args: { p_expediente: string; p_documentos: Json }; Returns: Database["public"]["Tables"]["actuaciones"]["Row"] }
      tomar_expediente: { Args: { p_expediente: string }; Returns: Database["public"]["Tables"]["expedientes"]["Row"] }
      pasar_expediente: {
        Args: { p_expediente: string; p_hacia_area?: string | null; p_hacia_perfil?: string | null; p_motivo?: string | null }
        Returns: Database["public"]["Tables"]["expedientes"]["Row"]
      }
      registrar_firma: {
        Args: { p_aclaracion: string; p_cargo: string; p_clave: string; p_muestras: Json; p_dispositivo: string; p_tinta: string }
        Returns: Json
      }
      revocar_firma: { Args: Record<string, never>; Returns: undefined }
      probar_firma: { Args: { p_trazo: Json }; Returns: Json }
      verificar_foja: { Args: { p_codigo: string }; Returns: Json }
      // Resoluciones: clave y trazo crudo. Devuelve null si la clave o la firma no coinciden (o es una copia).
      firmar_actuacion: {
        Args: { p_actuacion: string; p_clave?: string; p_trazo?: Json; p_dispositivo?: string; p_tinta?: string; p_contexto?: Json }
        Returns: Database["public"]["Tables"]["actuaciones"]["Row"] | null
      }
      observar_expediente: { Args: { p_expediente: string; p_motivo: string }; Returns: Database["public"]["Tables"]["expedientes"]["Row"] }
      subsanar_expediente: { Args: { p_expediente: string; p_texto: string }; Returns: Database["public"]["Tables"]["expedientes"]["Row"] }
      archivar_expediente: { Args: { p_expediente: string; p_motivo?: string | null }; Returns: Database["public"]["Tables"]["expedientes"]["Row"] }
      fijar_prioridad: {
        Args: { p_expediente: string; p_prioridad: Database["public"]["Enums"]["prioridad_expediente"]; p_motivo: string }
        Returns: Database["public"]["Tables"]["expedientes"]["Row"]
      }
      verificar_integridad: { Args: { p_expediente: string }; Returns: { foja: number; hash_ok: boolean; cadena_ok: boolean }[] }
      perfiles_basicos: { Args: { p_ids: string[] }; Returns: { id: string; nombre: string; apellido: string }[] }
      metricas_resumen: { Args: Record<string, never>; Returns: Json }
      metricas_por_tipo: {
        Args: Record<string, never>
        Returns: {
          tipo_id: string; codigo: string; nombre: string; total: number; activos: number; resueltos: number
          promedio_dias: number | null; linea_base_dias: number | null; plazo_dias: number | null
        }[]
      }
      metricas_carga: { Args: Record<string, never>; Returns: { perfil_id: string; nombre: string; area: string; asignados: number; fojas_30d: number }[] }
      metricas_por_etapa: { Args: { p_dias?: number }; Returns: { area: string; estadias: number; horas_promedio: number; horas_maximo: number }[] }
      metricas_serie: { Args: { p_dias?: number }; Returns: { dia: string; ingresados: number; resueltos: number }[] }
      es_interno: { Args: Record<string, never>; Returns: boolean }
      es_admin: { Args: Record<string, never>; Returns: boolean }
    }
    Enums: {
      estado_expediente: "iniciado" | "en_tramite" | "observado" | "resuelto" | "archivado" | "rechazado"
      prioridad_expediente: "baja" | "normal" | "alta" | "urgente"
      rol_area: "operador" | "dictaminante" | "firmante" | "jefe"
      tipo_actuacion:
        | "presentacion" | "documento" | "providencia" | "informe" | "dictamen" | "resolucion"
        | "notificacion" | "observacion" | "subsanacion" | "pase" | "nota"
      estado_actuacion: "borrador" | "firmada" | "anulada"
      accion_paso: "recepcion" | "analisis" | "dictamen" | "resolucion" | "firma" | "liquidacion" | "notificacion" | "archivo"
      canal_notificacion: "sistema" | "email" | "migue"
    }
    CompositeTypes: { [_ in never]: never }
  }
}

type Publico = Database["public"]
export type Fila<T extends keyof Publico["Tables"]> = Publico["Tables"][T]["Row"]
export type Enum<T extends keyof Publico["Enums"]> = Publico["Enums"][T]
