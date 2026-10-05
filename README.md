# Tramita Capital

Expediente electrónico de la **Dirección de Capital Humano** de la Municipalidad de San Miguel de Tucumán.
Es parte del *Programa de Incorporación de Inteligencia Artificial a Capital Humano* (Dirección de IA).

Los agentes municipales inician y siguen sus trámites (licencias, bonificaciones, asignaciones) en forma 100 % digital.
Capital Humano los tramita en una bandeja con prioridad automática, redacta dictámenes y resoluciones con IA, siempre con revisión
y firma humanas, y mide el impacto en tiempo real.

## Stack

| Capa | Tecnología |
|---|---|
| App | Next.js 16 (App Router, Server Actions, Turbopack) · React 19 · Tailwind 4 · shadcn/ui |
| Datos | Supabase: Postgres 17 + RLS, Auth (enlace mágico), Storage privado y Realtime |
| IA | Claude Opus 5.5, directo (SDK de Anthropic, con respaldo del lado del servidor) o vía OpenRouter (`src/lib/ia/proveedor.ts`) |
| Email | Resend |
| Bot | Migue (API `/api/migue` y webhook saliente) |
| Hosting | Vercel |

## Cómo funciona

- **Trámites parametrizados**: `tipos_tramite` define el formulario, los requisitos, los plazos y la línea de base.
  `pasos_circuito` define el cursograma y `plantillas` guarda los modelos de dictamen o resolución que usa la IA.
- **Fojas digitales**: cada actuación firmada recibe una foja correlativa y un hash SHA-256 encadenado con la foja anterior.
  Las fojas firmadas son inmutables: un trigger lo impide. Desde el expediente se puede verificar la integridad de la cadena.
- **Hoja de ruta digital**: cada pase entre áreas queda en `movimientos` y como foja de pase.
- **Seguridad**: RLS en todas las tablas. Las transiciones del expediente (crear, pasar, firmar, observar, archivar)
  solo se hacen por funciones RPC que validan rol y área. Los expedientes reservados (salud, discapacidad) tienen visibilidad
  restringida. Todo queda auditado en `auditoria`.
- **IA con humano en el centro**: la IA redacta borradores en vivo con el contexto del expediente y los modelos del área.
  Una persona los edita y los firma. Cada generación queda registrada en `ia_generaciones`. Además, la IA sugiere la prioridad
  de cada trámite cuando ingresa.
- **Adjuntos**: el navegador los sube directo a Storage. El servidor verifica cada archivo, calcula el SHA-256 y lo asienta en una foja.

## Desarrollo local

Requiere Node 20.9+ y Docker Desktop (para Supabase local).

```bash
npm install
npx supabase start          # levanta Postgres, Auth, Storage y Studio
npx supabase db reset       # aplica migraciones + catálogo + datos demo (supabase/seeds/)
cp .env.example .env.local  # completar con las claves que imprime `supabase start`
npm run dev
```

- App: http://localhost:3000 · Studio: http://127.0.0.1:54323 · Correos de prueba (Mailpit): http://127.0.0.1:54324
- Datos de ejemplo: `supabase/seeds/01_catalogo.sql` (catálogo provisorio, apto para cualquier entorno) y `supabase/seeds/02_demo_local.sql` (usuarios y expedientes demo, **solo local**; la contraseña está en ese archivo).
- **Vista previa de diseño**: http://localhost:3000/vista-previa muestra todas las pantallas con datos de ejemplo y roles intercambiables, sin login. En producción solo se activa con `MODO_DEMO=1` (útil para presentaciones).
- Tipos de la base: `npx supabase gen types typescript --local > src/lib/database.types.ts`

## Despliegue

1. Crear el proyecto en Supabase y aplicar las migraciones con `npx supabase link` y luego `npx supabase db push`. Cargar solo `seeds/01_catalogo.sql`; **nunca** `02_demo_local.sql`.
2. En Supabase Auth, configurar SMTP con Resend y agregar la URL de Vercel en *Redirect URLs* (`https://<dominio>/auth/callback`).
3. En Vercel, importar el repo y cargar las variables de `.env.example`.

## Estructura

```
supabase/migrations/   esquema, seguridad (RLS) y operaciones (RPC, foliado, métricas)
supabase/seeds/        catálogo provisorio + demo local
src/app/(agente)/      portal del agente: mis trámites, iniciar, seguimiento
src/app/(interno)/     bandeja, expediente, tablero de impacto, parametrización
src/app/api/           IA (streaming), descarga segura de documentos, Migue
src/lib/ia/            redacción y priorización con Claude
src/lib/avisos/        notificaciones: sistema, email (Resend), Migue
```
