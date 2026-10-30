/**
 * Acceso rápido de la etapa de prueba: los usuarios de seeds/03_usuarios_prueba.sql, para entrar con un clic.
 * Todos usan la misma contraseña (decisión del 30/10/2026; la asigna seeds/03b_clave_prueba.sql).
 * Se apaga con ACCESO_PRUEBA=0 y se borra, junto con los usuarios de prueba, antes de producción.
 */
export const CLAVE_PRUEBA = "123456"

/** En el orden en que suelen intervenir. `interno`: entra a la bandeja; si no, a sus trámites. */
export const USUARIOS_PRUEBA = [
  { email: "agente@smt.gob.ar", nombre: "Agente", hace: "Inicia trámites y responde observaciones", interno: false },
  { email: "mesa@smt.gob.ar", nombre: "Mesa de Entradas", hace: "Recibe la licencia por examen", interno: true },
  { email: "bonificaciones@smt.gob.ar", nombre: "Bonificaciones", hace: "Controla y prepara el proyecto", interno: true },
  { email: "jefe.bonificaciones@smt.gob.ar", nombre: "Jefatura de Bonificaciones", hace: "Lo mismo, con rol de jefe", interno: true },
  { email: "asesoria@smt.gob.ar", nombre: "Asesoría Legal", hace: "Redacta y firma el dictamen", interno: true },
  { email: "direccion@smt.gob.ar", nombre: "Dirección", hace: "Firma las resoluciones", interno: true },
  { email: "medicina@smt.gob.ar", nombre: "Medicina Laboral", hace: "Licencias médicas y maternidad", interno: true },
  { email: "liquidacion@smt.gob.ar", nombre: "Liquidación", hace: "Carga las novedades en Civitas", interno: true },
  { email: "licencias@smt.gob.ar", nombre: "Sección Licencias", hace: "Controla los días de licencia", interno: true },
  { email: "despacho@smt.gob.ar", nombre: "Despacho", hace: "Proyecta la licencia por examen", interno: true },
] as const

/** Solo en el servidor: la variable no llega al navegador. */
export const accesoPruebaActivo = () => process.env.ACCESO_PRUEBA !== "0"
