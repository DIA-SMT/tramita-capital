# Tramita Capital — Programa de Incorporación de IA a Capital Humano

Proyecto de la **Dirección de IA de la Municipalidad de San Miguel de Tucumán** (Marco Rossi) junto con la **Secretaría / Dirección de Capital Humano**. Fuente: reunión del 2026-10-01 (transcripción de audio de WhatsApp, `Downloads/WhatsApp Audio 2026-10-01 at 11.10.24 (transcript).mp4.pdf.txt`).

Idioma de trabajo: español (Argentina).

## Problema

- Capital Humano es, según el relevamiento, la repartición que menos innovó: todo en papel, la directora (Lorena) se pasa el día firmando.
- **Licencia por examen: 35 días de demora promedio** (en febrero se firmaban licencias de exámenes ya rendidos). Objetivo: ~2 días.
- **Hoja de ruta de expedientes: ~8.000 hojas/año** solo en Capital Humano (relevado por Patricio, 2024/25).
- En el primer trámite analizado, **entre 30 % y 40 % de los pasos se pueden eliminar**.
- Personal nuevo asignado que nunca hizo una resolución.
- La priorización (hijos con discapacidad, pagos/asignaciones) existe de hecho pero **no está estandarizada**.
- Capital Humano no puede medir su propia carga de trabajo (picos, sobrecarga, tiempos).
- Al cerrar un trámite se hace un **desglose** manual (resolución por duplicado, nota de desglose, vuelve a la repartición para notificar, lo desglosado va a legajo) y después hay que **cargarlo a mano en Civitas**.

## Alcance

Trámites que un **agente municipal** (≈4.300–4.500 personas) inicia ante Capital Humano. No incluye trámites entre reparticiones. Es una herramienta interna: no es para el ciudadano.

Trámites mencionados (el MVP será el más sencillo y estandarizado, a definir con Capital Humano):
- Licencia por examen
- Bonificación por título
- Adicional por asignación familiar
- Licencia por nota médica (hoy: 48 h para presentar el certificado una vez iniciado el expediente; control médico presencial al terminar)
- Licencia por discapacidad / hijo con discapacidad (la Dra. Orellana está estandarizando estos dictámenes)
- Bonificaciones en general

## Módulos previstos

1. **Inicio digital del trámite** por parte del agente, con formulario y requisitos.
2. **Flujo interno / bandeja de expedientes**: pase entre áreas según el cursograma (mesa de entradas → dictamen → resolución → notificación), bandeja por usuario filtrada por tipo de trámite. Reemplaza la hoja de ruta en papel.
3. **Priorización automática con IA**: clasificar urgencia al ingresar (discapacidad, cortes de asignación, pagos).
4. **Proyectos de dictamen y resolución automatizados**, con **validación humana obligatoria** ("humano en el centro"): el equipo genera el borrador con IA y alguien con experiencia lo controla. Semáforo de complejidad por tipo de resolución.
5. **Tablero de métricas en tiempo real**: tiempos por trámite (antes/después), volumen, carga por agente, picos mensuales, resoluciones emitidas. Medir el impacto es requisito político: la Doctora pide impacto medible en herramientas internas.
6. **Consulta / asistente** para que el agente consulte el estado y la normativa de sus trámites.
7. Más adelante: **control médico por videollamada** con toma de notas automática por IA.

Existe además un **generador de notas automatizado** (de la Dirección de IA) que casi nadie usa; puede integrarse (genera nota con número de expediente, logo, estilo por secretaría).

## Restricciones y definiciones clave

- **Firma**: la firma electrónica (validez dentro del sistema, tipo usuario/contraseña; "salvo prueba en contrario") es distinta de la firma digital (certificado, no repudiable, validez nacional — Ley 25.506). El sistema usa firma electrónica interna. La resolución final puede necesitar firma digital; alternativa de respaldo que se planteó: imprimir, firmar y escanear (Marco no está de acuerdo). Puede requerir un **ajuste normativo** (resolución u ordenanza) para evitar nulidades. Antecedente: en Catastro se exige firma ológrafa.
- **Civitas**: software externo de RRHH alquilado. Hoy dan acceso de **solo lectura**; hay que pedir **escritura/API** para que el sistema impacte directo. Si no se consigue, se automatiza igual todo lo previo.
- **Legajo digital** (desarrollo interno de Patricio en Capital Humano): está frenado por falta de escáneres. Pendiente saber dónde se aloja, qué volumen de datos tiene y su estado, para decidir si se integra o se reconstruye en el mismo sistema (la idea es **un solo sistema** y no sistemas satélite). Escaneo: pasantes y laboratorio de la Facultad de Derecho vía convenio. Se arranca desde hoy en adelante y luego se carga el histórico.
- **Datos sensibles** (salud, discapacidad): hay resoluciones más reservadas que otras y el acceso debe ser restringido.
- **IA**: usar modelos por API (Claude / GPT / Gemma) dentro de un sistema propio, no herramientas comerciales de chat. Soberanía de datos.
- **Coordinación política**: hubo una reunión con Omar (Ing. Abraham, Secretaría de Innovación). Hay que evitar sistemas duplicados o que convivan sin sentido. Capital Humano tiene que **impulsar e implementar** el sistema como propio.

## Actores

- **Marco Rossi**: Director de IA, abogado, dirige un laboratorio en la Facultad de Derecho. Desarrolla el sistema.
- **Lorena**: directora de Capital Humano.
- **Javier**: secretario; viene del Ministerio Público Fiscal.
- **Patricio ("Pato")**: hizo el legajo digital interno y el conteo de hojas; se suma al proyecto.
- **Dra. Orellana**: estandarización de dictámenes de discapacidad.
- **Omar / Ing. Abraham**: Secretaría de Innovación.
- **La Doctora**: máxima autoridad; pide medir impacto. Hito: **octubre 2026, 3 años de gestión**. Conviene tener algo para mostrar. También se puede presentar por el lado ambiental: menos papel y ahorro económico.
- El despacho de la secretaría tiene 6 personas, lo que facilita el piloto.

## Desarrollo (estado técnico)

@AGENTS.md

- **Stack**: Next.js 16 (App Router; `src/proxy.ts` reemplaza a middleware) · Supabase (Postgres + RLS, Auth, Storage, Realtime) · Vercel · Resend · Claude API (`claude-opus-5-5`, configurable con `IA_MODELO`). README.md tiene el detalle.
- **Regla de oro de seguridad**: las lecturas pasan por RLS con el cliente del usuario (`crearClienteServidor`). Las transiciones del expediente se hacen **solo por RPC** (`crear_expediente`, `pasar_expediente`, `firmar_actuacion`, etc.). `clienteAdmin()` (service role) queda solo para tareas de sistema: avisos, priorización y Migue.
- **Fojas**: las actuaciones firmadas son inmutables y se encadenan por SHA-256. No se edita una foja firmada: se agrega otra.
- **IA**: el contenido cargado por agentes va escapado dentro de `<expediente>` como datos, nunca como instrucciones. La IA nunca firma: propone un borrador y firma una persona.
- **Nombres en español** en código de dominio (expedientes, actuaciones, avisos). Los textos de la UI van en español rioplatense.
- **Provisorio**: las áreas, los circuitos, los formularios y las plantillas de `supabase/seeds/01_catalogo.sql` son ejemplos hasta que llegue el cursograma real. `02_demo_local.sql` crea usuarios demo: **solo local**.
- **Supabase en la nube**: proyecto `tramita-capital` (ref `phwsnyobuzbrtojtvcsr`, sa-east-1, plan Free). Tiene aplicadas las migraciones 000100–000400 y el catálogo provisorio, sin usuarios demo. Las migraciones nuevas se aplican en `supabase/migrations/` y también en el proyecto.
- **Vistas y datos separados**: cada pantalla tiene `page.tsx` (carga desde Supabase) y `vista.tsx` (presentación pura). `/vista-previa` reutiliza las vistas con `src/lib/demo/datos.ts` y `demo` en `true` (las acciones se simulan). Al cambiar una pantalla, revisala ahí con cada rol, en 1024 px (Windows al 125 %) y en el celular.
- Comandos: `npm run dev` · `npx tsc --noEmit` · `npx eslint src` · `npx supabase db reset`.

## Próximos pasos acordados

- [ ] Iniciar expediente: **"Programa de Incorporación de Inteligencia Artificial a Capital Humano"** (nombre amplio a propósito).
- [ ] Crear grupo de WhatsApp de trabajo.
- [ ] Capital Humano entrega: listado de trámites, requisitos, formularios, **cursograma** (flujo interno y reglas de negocio), modelos de dictámenes y resoluciones, estadísticas actuales (línea base de tiempos y cantidades) y un audio largo con los casos y excepciones que no están escritos.
- [ ] Elegir el trámite del MVP → piloto → habilitar trámites de a uno.
- [ ] Relevar el sistema de legajo de Patricio (hosting, volumen, estado).
- [ ] Definir el esquema de firma y el ajuste normativo necesario.
- [ ] Gestionar con Civitas el acceso de escritura o una API.
