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
- **IA**: todas las llamadas pasan por `src/lib/ia/proveedor.ts` (`generarTexto` y `generarJSON`), que elige entre Claude directo y OpenRouter según `IA_PROVEEDOR` y las claves disponibles. El contenido cargado por agentes va escapado dentro de `<expediente>` como datos, nunca como instrucciones. La IA nunca firma: propone un borrador y firma una persona. Prueba manual: `npx tsx --env-file=.env.local --conditions=react-server scripts/probar-ia.ts`.
- **Novedades de haberes (cierre hacia Civitas)**: en el paso `liquidacion` del circuito, el documento "Novedad a Liquidación" abre `DialogoNovedad`. Propone movimiento (alta, o baja para los `BAJA-*`) y período: el período sale del texto de la resolución ("a partir de agosto de 2026", "08/2026" o "01/08/2026"; si no lo encuentra, toma el mes de la firma y lo avisa). La RPC `registrar_novedad` agrega la foja firmada y crea la fila en `novedades_haberes`, con número de expediente y resolución copiados para que Liquidación los vea aunque el expediente sea reservado. En `/novedades` trabajan Bonificaciones, Liquidación y Dirección: filtro por estado y período, **planilla CSV para Civitas** (`planillaCSV` en `src/lib/novedades.ts`: separador ";" y BOM; columnas provisorias hasta conocer el formato de importación de Civitas), marcar como cargadas (`marcar_novedades_cargadas`, solo Bonificaciones y Liquidación) y anular las pendientes con motivo. Mide la demora de carga. Avisa a Liquidación al registrar, y al agente cuando su novedad queda cargada. El estado se ve en el expediente (`NovedadHaberes`: "Impacto en tus haberes" para el agente, "Novedad de haberes" para Capital Humano) y lo responde el asistente, que no promete recibos ni montos. Con API de Civitas, la misma tabla alimentaría el envío automático.
- **Migue, el asistente del agente (módulo 6)**: el asistente con IA se llama **siempre Migue**, el mismo de los demás sistemas de la Dirección de IA. Su voz y su estilo se copian de ensenIA-smt (`C:\repos\ensenIA-smt`: `supabase/functions/migue/_prompts.ts`, `src/pages/Migue.tsx`, `src/components/FloatingMigue.tsx`; retrato en `public/migue.jpeg`). **Acá se acota a los trámites de Capital Humano**: estado, requisitos, plazos, normativa del catálogo, haberes y uso del portal. Lo demás lo rechaza con amabilidad. Está en todo el portal del agente como burbuja flotante y arrastrable (`MigueFlotante`; si se abre desde un trámite, ya sabe cuál es), en la pantalla `/migue` (también `?expediente=<id>`) y por WhatsApp (acción `preguntar` de `/api/migue`). Burbuja y pantalla comparten una sola conversación (`MigueProvider`, en el layout del agente). `SISTEMA_MIGUE` tiene la guía de uso con los textos reales de los botones (**mantenerla al día** si cambia un botón) y `pantallaActual` le dice desde qué pantalla escriben, aceptando solo rutas conocidas. Responde sobre los trámites propios y el catálogo con `src/lib/ia/asistente.ts` (instrucciones, carga de datos y `textoDatos`). La carga filtra siempre por iniciador y por fojas firmadas, así que es la misma con RLS (portal) o con el cliente admin (Migue). Conversación de varios turnos (`historial` en `generarTexto`), cupo de 30 consultas diarias por persona (`LIMITE_DIARIO_ASISTENTE`) y registro en `ia_generaciones` con `tipo = 'asistente'` y la pregunta en `consulta`. El personal interno **no** lee esas consultas (pueden tener datos de salud). En `/vista-previa/migue` las respuestas se simulan con `respuestaDemo` (`src/lib/asistente.ts`), sin IA. Prueba con la IA real y los datos de la demo: `npx tsx --env-file=.env.local --conditions=react-server scripts/probar-asistente.ts`.
- **Secretos**: las claves (OpenRouter, Supabase secret, Resend) van solo en `.env.local` y en las variables de Vercel. Nunca se escriben en código, documentación, commits ni respuestas.
- **Nombres en español** en código de dominio (expedientes, actuaciones, avisos). Los textos de la UI van en español rioplatense.
- **Catálogo**: se edita en `src/lib/semilla/catalogo.ts` y se genera `supabase/seeds/01_catalogo.sql` con `npm run catalogo` (SQL idempotente). Los 15 trámites del Área Bonificaciones salen del relevamiento del 22/10/2026 (reemplaza al del 07/10; los códigos `relevamiento` siguen su índice 001–017), con los modelos reales de dictamen y resolución del área (títulos y asignaciones) y los certificados de inicio y fin de clases **fuera de término** (`ESC-*-EXT`). Lo que depende de una respuesta del área está marcado en el catálogo con el comentario "A validar con el área" (`grep -n "A validar" src/lib/semilla/catalogo.ts`). No están cargados: los certificados **dentro de término** (un solo paso sin resolución: hace falta una migración para registrar la novedad sin resolución firmada), los recursos de reconsideración, varias asignaciones en un mismo expediente (el índice de `novedades_haberes` admite un alta por expediente) y las notas médicas (la carpeta 018 no vino). Las licencias siguen provisorias. Cada paso define qué controla, qué revisa y qué genera la oficina (`pasos_circuito.controles/revisa/genera`), y la tarjeta "Tarea del paso" (`src/components/expediente/tarea-paso.tsx`) lo muestra. El material del relevamiento tiene datos personales: nunca va al repo. `02_demo_local.sql` crea usuarios demo: **solo local**.
- **Protocolización automática**: las resoluciones llevan `{{numero_resolucion}}` y `{{fecha_resolucion}}`; `firmar_actuacion` asigna el número (`N/DCH/AAAA`) y la fecha al firmar, fija el resultado (sentido `hace_lugar`/`rechaza`) y manda la resolución al legajo digital (`legajo_documentos`).
- **Firma ológrafa electrónica (resoluciones)**: biometría dinámica, versión 2 (migración 000900; las 000600–000800 son la versión anterior). El navegador solo captura el **trazo crudo** (`[x, y, t, presión]` por punto, más el dispositivo: lápiz, dedo o mouse) y lo envía tal cual; **la base calcula todo**: `_firma_patron` (64 puntos de forma + perfil de velocidad, duración, trazos, largo de tinta) y `_firma_evaluar` (DTW de forma y de ritmo con umbrales propios de la persona, más duración, trazos, largo y detección de **copias exactas** contra las muestras y las últimas 20 firmas). `src/lib/firma-trazo.ts` es el espejo exacto en TS (vista previa y calibración: `scripts/calibrar-firma.ts`; solo forma aceptaba ~77 % de imitaciones hábiles sintéticas, forma + ritmo ~6 %). Registro en `/mi-firma`: tres muestras crudas (la base rechaza si varían mucho en forma o ritmo), aclaración, cargo y clave de 6 números (bcrypt). Para firmar **cada resolución** se dibuja la firma y se pone la clave; se estampa el **trazo verificado** en vectores (`datos.firma.visible`, dentro del hash de la foja, componente `TrazoFirma`). La evidencia pericial (trazo crudo, patrón, dispositivo, navegador/IP/pantalla) queda en `evidencias_firma` (solo admin, append-only) ligada al sello por SHA-256. 5 intentos fallidos (clave, trazo o copia, en `intentos_firma`) bloquean 15 min. Dictámenes y demás fojas: firma electrónica simple. Las fojas firmadas con la versión anterior conservan su imagen PNG (bucket privado `firmas`, `/api/firmas/[fojaId]`). Copia oficial en `/documento/[id]` (membrete, firma y QR) y verificación pública en `/verificar?codigo=`. Es firma electrónica (Ley 25.506, art. 5), no digital. La firma ficticia de la vista previa se genera con `scripts/firma-ejemplo.ts`.
- **Acceso**: el ingreso definitivo será por CiDiTuc (pendiente; no se trabaja por ahora). Para testing hay usuarios de prueba por rol en `supabase/seeds/03_usuarios_prueba.sql` (agente@, bonificaciones@, asesoria@, direccion@, etc. en smt.gob.ar), aplicados en la nube y marcados con `app_metadata.prueba`: **borrarlos antes de producción**. Sus contraseñas son aleatorias y nunca van al repo: `npx tsx scripts/claves-prueba.ts` las regenera en `credenciales-prueba.txt` (git lo ignora) y deja en `supabase/.temp/claves-prueba.sql` el SQL con los hashes bcrypt, que se aplica en la base y cierra las sesiones abiertas.
- **Marca**: logos cimba del municipio en `public/` (versiones transparentes en `public/marca/`), tipografía Poppins y paleta #0066FF / #2EB1FF / #F4DC00 (tokens en `globals.css`). Barra lateral interna en azul profundo. Componentes `Marca`, `Isotipo`, `Membrete` e `HiloMarca` en `src/components/marca.tsx`.
- **Repositorio**: github.com/DIA-SMT/tramita-capital (público).
- **Supabase en la nube**: proyecto `tramita-capital` (ref `phwsnyobuzbrtojtvcsr`, sa-east-1, plan Free). Tiene aplicadas las migraciones 000100–001100 (las dos últimas, a mano desde el SQL Editor el 23/10/2026, así que no figuran en el historial de migraciones de Supabase), el catálogo de `01_catalogo.sql` y los usuarios de prueba. Se reactivó el 23/10/2026; lo que falta aplicar se acumula en la sección *Pendiente en Supabase*, al final de este archivo. Ojo al pegar SQL en el SQL Editor desde Windows: el 23/10 quedaron `` dentro de los 26 modelos y se limpiaron con `replace(cuerpo, chr(13), '')`. Después de aplicar el catálogo, comprobar siempre la huella. Las migraciones nuevas se escriben en `supabase/migrations/` y se aplican en la nube **todas juntas**, cuando Marco lo indique. Para comprobar que los modelos coinciden: `npx tsx scripts/huella-catalogo.ts` contra el md5 que indica el script. El plan Free **pausa el proyecto tras 7 días sin uso**: se reactiva desde el panel o con el MCP de Supabase (`restore_project`).
- **Vercel**: https://tramita-capital.vercel.app (vista previa pública en `/vista-previa`). Proyecto `tramita-capital` en la cuenta `direccionia-5744` (donde están los demás sistemas municipales), conectado al repo: cada push a `main` publica en producción. Las funciones corren en `gru1` (São Paulo, junto a Supabase) según `vercel.json`. Variables cargadas en Production y Preview: URL y clave pública de Supabase, IA vía OpenRouter (clave como *sensitive*) y `MODO_DEMO=1` (vista previa para presentaciones). `SUPABASE_SECRET_KEY` (clave `sb_secret_` nueva, como *sensitive*) cargada el 23/10/2026: habilita avisos, priorización y Migue por WhatsApp. Falta Resend. Las variables se cargan con `vercel env add` pasándoles el valor por stdin desde `.env.local`, nunca como argumento ni en pantalla.
- **Vistas y datos separados**: cada pantalla tiene `page.tsx` (carga desde Supabase) y `vista.tsx` (presentación pura). `/vista-previa` reutiliza las vistas con `src/lib/demo/datos.ts` y `demo` en `true` (las acciones se simulan). Al cambiar una pantalla, revisala ahí con cada rol, en 1024 px (Windows al 125 %) y en el celular.
- Comandos: `npm run dev` · `npx tsc --noEmit` · `npx eslint src` · `npm run catalogo` · `npx supabase db reset`.

## Próximos pasos acordados

- [ ] Iniciar expediente: **"Programa de Incorporación de Inteligencia Artificial a Capital Humano"** (nombre amplio a propósito).
- [ ] Crear grupo de WhatsApp de trabajo.
- [ ] Capital Humano entrega: listado de trámites, requisitos, formularios, **cursograma** (flujo interno y reglas de negocio), modelos de dictámenes y resoluciones, estadísticas actuales (línea base de tiempos y cantidades) y un audio largo con los casos y excepciones que no están escritos.
- [ ] Elegir el trámite del MVP → piloto → habilitar trámites de a uno.
- [ ] Relevar el sistema de legajo de Patricio (hosting, volumen, estado).
- [ ] Definir el esquema de firma y el ajuste normativo necesario.
- [ ] Gestionar con Civitas el acceso de escritura o una API.

## Pendiente en Supabase (se aplica todo junto)

Marco decidió aplicar todos los cambios de base de una vez, cuando se reactive el proyecto o se cree uno nuevo. Cada cambio de base nuevo se agrega a esta lista, en orden.

**En el proyecto actual** (`phwsnyobuzbrtojtvcsr`, activo desde el 23/10/2026): **al día** al 23/10/2026. Tiene las migraciones 000100–001100, el catálogo del relevamiento del 22/10 (huella de modelos `f8c50fbcf8411a2e1fc7037b2d1b30d3`, igual a `npx tsx scripts/huella-catalogo.ts`), las contraseñas de prueba rotadas (en `credenciales-prueba.txt`, en la PC de la Dirección de IA; se comparten solo por canal privado) y la clave secreta en Vercel. Para volver a rotar las contraseñas: `npx tsx scripts/claves-prueba.ts` y aplicar `supabase/.temp/claves-prueba.sql`.
Nada pendiente. Los próximos cambios de base se anotan acá, en orden.

**Si se crea un proyecto nuevo**: aplicar todas las migraciones de `supabase/migrations/` en orden, `seeds/01_catalogo.sql`, `seeds/03_usuarios_prueba.sql` y el SQL de `scripts/claves-prueba.ts` (**nunca** `02_demo_local.sql`). Después hay que actualizar en Vercel `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_SECRET_KEY`, y en Supabase Auth agregar `https://tramita-capital.vercel.app/auth/callback` a las Redirect URLs.
