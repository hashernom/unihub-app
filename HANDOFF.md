# UniHub — Handoff Report

## Estado general

| Hito | Estado |
|---|---|
| M1 — Auth (login, register, forgot/reset, profile, guards) | ✅ Completo y estable |
| M2 — Dashboard (anuncios, avisos, realtime, search, admin CRUDs, edge function) | ✅ Completo |
| M3 — Surveys (listado, respuesta, admin CRUD, resultados, export, edge functions) | ✅ Completo |
| M4 — Calendar | ⬜ Pendiente |
| M5 — Help Bot | ⬜ Pendiente |
| M6+ (Polish, Testing, DevOps, Deploy) | ⬜ Issues creados en GitHub |

**Último bug conocido**: `IonBadge` unused import warning en `TabDashboardPage` (no crítico).

---

## Stack

- **Frontend**: Ionic 8.8.6 + Angular 21.2 (standalone components)
- **Backend**: Supabase (`syhxhnisksggxhtbvggu`, sa-east-1)
- **Admin user**: `admin@unihub.com` / `Admin123456!` (rol admin)
- **Student test**: `01240371032@mail.udes.edu.co` (contraseña: `Admin123456!`)

---

## M3 — Surveys (completado hoy)

| Issue | Descripción |
|---|---|
| #23 | Student survey list (`tab-surveys`) con badges Pendiente/Respondida, skeletons, pull-to-refresh, date filter |
| #24 | Survey response form (`survey-response`) con tipos: text, radio, checkbox, rating stars, validación required, anti-doble-envío |
| #25 | Admin survey manager (`admin-surveys`) + `survey-form` con CRUD, toggle active, preguntas inline, reorder, preview |
| #26 | Survey results (`survey-results`) con Chart.js (barras choice, distribución rating), stats, CSV/PDF export |
| #27 | Edge Function `process-survey-results` — agrega respuestas, cache 1h, admin JWT check (desplegada v3) |
| #28 | Expiración: edge fn `deactivate-expired-surveys` + validación "Encuesta finalizada" en frontend |
| #29 | Notificaciones: edge fn `remind-pending-surveys` + badge rojo en tabs con `getPendingSurveyCount()` |
| #30 | Export CSV/PDF: edge fn `export-survey-results` (v2 con CORS) + jsPDF con captura de canvas |

### Edge Functions deployadas

| Función | Versión | verify_jwt | CORS |
|---|---|---|---|
| `notify-on-announcement` | v2 | ❌ | ❌ |
| `process-survey-results` | v3 | ✅ (JWT decode manual) | ✅ |
| `export-survey-results` | v2 | ✅ (JWT decode manual) | ✅ |
| `deactivate-expired-surveys` | v1 | ❌ (cron) | N/A |
| `remind-pending-surveys` | v1 | ❌ (cron) | N/A |

**Importante**: Edge Functions con `verify_jwt: true` NO pueden usar `supabase.auth.getUser()` porque el token es consumido por el middleware. Se debe decodificar el JWT manualmente con `atob(token.split(".")[1])`. Esto está implementado en `process-survey-results` v3+ y `export-survey-results` v2+.

### DB — Migraciones aplicadas

00001 (schema inicial), 00002 (RLS), 00003 (trigger perfil), 00005 (realtime), 00006 (survey_reminders + UNIQUE)

Migration `00006_add_survey_reminders.sql` crea tabla `survey_reminders` con UNIQUE(survey_id, user_id).

Mock data SQL disponible para 3 surveys con preguntas de todos los tipos y 3 responses.

---

## Rediseño Frontend (completado hoy)

### Design System (`src/theme/`)

| Archivo | Propósito |
|---|---|
| `variables.css` | Colores Ionic: primary navy `#1E3A5F`, tertiary gold `#D4A843`, step colors |
| `tokens.css` | ~80 design tokens: spacing (8px grid), typography (Outfit + DM Serif), shadows (navy-tinted), semantic surfaces |
| `utilities.css` | Clases atómicas (`.u-flex-center`, `.u-gap-2`, etc.) |

### Partials SCSS compartidos (`src/app/styles/`)

| Partial | Propósito |
|---|---|
| `_cards.scss` | `%card-base` con barra de acento lateral (3px gold/blue/green), gradiente cálido, sombra navy-tinted |
| `_auth.scss` | Full-bleed gradient background + floating card blanca para auth forms |
| `_animations.scss` | Keyframes fadeIn, skeleton-pulse (shimmer), stagger, prefers-reduced-motion |
| `_badges.scss` | `.badge-pill`, `.badge-count`, `.badge-status` (active/expired/draft) |
| `_dashboard.scss` | `.metrics-row`, `.metric-card`, `.dashboard-section` |
| `_empty-states.scss` | `.empty-state` con icono + texto principal + secundario |
| `_forms.scss` | `.form-actions`, `.required-star`, `.stars-container`, `.option-row` |
| `_loading-states.scss` | `.loading-spinner`, `.skeleton*` con shimmer animation |
| `_dark-mode.scss` | Stub preparado para M5 (solo redefinir tokens) |

### Tipografía

- **Body**: Outfit (300/400/500/600/700) — cargada vía Google Fonts
- **Headings**: DM Serif Display (para títulos principales)
- Escala: 12px–32px con tokens `--text-xs` a `--text-3xl`

### Layout — Dashboard estudiante

- Hero gradient navy con stats glassmorphism (anuncios, avisos, encuestas)
- Secciones con acento lateral coloreado (oro=anuncios, azul=avisos, purple=eventos, verde=encuestas)
- Iconos decorativos en cada cabecera (megaphone, warning, calendar, checkbox)
- Empty states con icono + texto principal + subtexto
- Survey CTA con glow dorado pulsante

### Layout — Auth pages

- Header oculto (`ion-hide`)
- Full-bleed gradient background (navy degradado con orbes dorados)
- Card flotante blanca con sombra para el formulario
- Inputs con fondo gris suave, highlight dorado al focus
- Marca con icono en recuadro glassmorphism

### Layout — Panel admin

- Hero con badge "Panel de Administración", stats glassmorphism
- Sección Módulos con acento dorado
- Cards de navegación con shadow + gradient + scale al presionar
- Admin list pages con barras de acento (oro=anuncios, azul=avisos, verde=encuestas)
- Skeleton shimmer loading (reemplaza texto "Cargando...")
- Empty states premium con iconos + botón de acción
- Admin Register con auth-style layout

### Layout — Tab bar

- Glassmorphism (`backdrop-filter: blur(12px)`)
- Indicador dorado en tab activo (2px línea superior)
- 64px altura, padding generoso

---

## Bugs corregidos hoy

### 1. Encoding de caracteres españoles
- **Problema**: `Set-Content` de PowerShell guardaba archivos sin UTF-8 → ó, ñ, é, ¿ se veían como ? o caracteres rotos
- **Fix**: Cambiar a usar solo `read`/`edit` tools para modificaciones de archivos. Nunca usar PowerShell `Set-Content` o `node -e` para HTML/TS con caracteres especiales.
- **Lección aprendida**: Las herramientas `read`/`edit`/`write` trabajan con el workspace root sin restricciones. No usar shell para escribir archivos.

### 2. `tsconfig.app.json` configuración incorrecta
- **Problema**: Usaba `include: ["src/**/*.ts"]` que es demasiado amplio para Angular 21 con esbuild
- **Fix**: Cambiar a `files: ["src/main.ts"]` + `include: ["src/**/*.d.ts"]`

---

## Arquitectura actualizada

```
src/
├── index.html                        # Google Fonts Outfit + DM Serif Display
├── styles.scss                       # Global: importa tokens + partials + resets
├── theme/
│   ├── variables.css                 # Colores Ionic (navy + gold + step colors)
│   ├── tokens.css                    # Design tokens (spacing, fonts, shadows, semantic surfaces)
│   └── utilities.css                 # Clases atómicas
├── app/
│   ├── app.scss                      # Headings globales (h1-h4), links, focus, selection
│   ├── app.config.ts                 # APP_INITIALIZER para auth
│   ├── core/services/
│   │   ├── auth.service.ts           # signUp, signIn, signOut, restoreSession
│   │   ├── announcement.service.ts   # CRUD anuncios + caché
│   │   ├── notice.service.ts         # CRUD avisos + caché
│   │   ├── survey.service.ts         # CRUD encuestas, respuestas, resultados, export
│   │   ├── realtime.service.ts       # Suscripciones Realtime
│   │   └── supabase.client.ts        # Cliente Supabase singleton
│   ├── pages/
│   │   ├── login/                    # Full-bleed auth layout + floating card
│   │   ├── register/                 # Full-bleed auth layout + floating card
│   │   ├── forgot-password/          # Full-bleed auth layout
│   │   ├── reset-password/           # Full-bleed auth layout
│   │   ├── tab-dashboard/            # Hero + sections accent + survey CTA gold
│   │   ├── tab-surveys/              # Survey list with badges, skeletons
│   │   ├── survey-response/          # Dynamic form with all question types
│   │   ├── survey-results/           # Chart.js charts + CSV/PDF export
│   │   ├── tabs/                     # Glassmorphism tab bar + gold indicator
│   │   ├── admin-dashboard/          # Hero + metrics + nav grid
│   │   ├── admin-announcements/      # CRUD con accent bar oro
│   │   ├── admin-notices/            # CRUD con accent bar azul
│   │   ├── admin-surveys/            # CRUD con accent bar verde
│   │   ├── admin-register/           # Auth-style layout
│   │   ├── survey-form/              # Admin create/edit survey con questions builder
│   │   ├── announcement-form/        # Admin create/edit announcement
│   │   ├── notice-form/              # Admin create/edit notice
│   │   ├── admin-events/             # Stub con empty state
│   │   ├── admin-faq/                # Stub con empty state
│   │   └── admin-users/              # Stub con empty state
│   ├── shared/components/
│   │   ├── announcement-card/        # Card con accent bar oro, badge categoría, pin, fecha
│   │   └── notice-card/              # Card con accent bar azul, badge prioridad, alerta
│   └── styles/                       # Partials SCSS compartidos
│       ├── _index.scss               # Barrel file
│       ├── _animations.scss          # Keyframes + stagger + reduced motion
│       ├── _cards.scss               # %card-base con accent bar
│       ├── _auth.scss                # Full-bleed auth layout
│       ├── _forms.scss               # Form actions, stars, options
│       ├── _badges.scss              # .badge-pill, .badge-count, .badge-status
│       ├── _dashboard.scss           # Metrics + sections
│       ├── _empty-states.scss        # Empty state con iconos
│       ├── _loading-states.scss      # Skeleton shimmer + spinner
│       └── _dark-mode.scss           # Stub para M5
├── supabase/
│   ├── edge-functions/
│   │   ├── process-survey-results/   # v3 — CORS + JWT decode manual
│   │   ├── export-survey-results/    # v2 — CORS + JWT decode manual
│   │   ├── deactivate-expired-surveys/ # Cron job
│   │   └── remind-pending-surveys/   # FCM push reminders
│   └── migrations/
│       └── 00006_add_survey_reminders.sql
└── docs/
    └── FRONTEND-GUIDE.md             # Cómo modificar el frontend sin romper
```

---

## Bugs corregidos (sesiones anteriores)

### 1. Session restore timing
- **Problema**: `restoreSession()` async causaba race condition con router y guards
- **Fix**: `APP_INITIALIZER` en `app.config.ts`

### 2. Páginas cacheadas por Ionic (ExpressionChangedError)
- **Problema**: Ionic cachea páginas, al volver al login tras cerrar sesión daba NG0100
- **Fix**: `ionViewWillEnter()` en LoginPage resetea estado

### 3. Register → Dashboard sin pasar por login
- **Problema**: NoAuthGuard causaba race condition
- **Fix**: Se removió NoAuthGuard de /register

### 4. Dashboard cargando infinitamente
- **Problema**: Queries colgaban si RLS bloqueaba
- **Fix**: `withTimeout(promise, 5000)` + try/catch individuales

### 5. Iconos Ionicons rotos
- **Problema**: Ionic 8 standalone requiere kebab-case
- **Fix**: `'person-circle': personCircle`, etc.

### 6. Migration 00003 no aplicada
- **Problema**: Trigger on_auth_user_created faltante
- **Fix**: Migración aplicada

### 7. Change detection sistémico (M3)
- **Problema**: Ionic standalone + lazy-loading no dispara change detection tras async
- **Fix**: `ChangeDetectorRef.detectChanges()` en 8 páginas + `ionViewWillEnter` en tabs

### 8. Sesiones stale en desarrollo
- **Problema**: Server restart dejaba sb-* keys en localStorage → sesión inválida
- **Fix**: Timestamp-based cleanup en `AuthService.initialize()` (>3s = clear)

### 9. CORS en Edge Functions
- **Problema**: Edge Functions con verify_jwt bloqueaban OPTIONS preflight
- **Fix**: `corsHeaders` + OPTIONS handler en todas las funciones

---

## Deploy — Estrategia (según issues M10)

### Ruta 1: PWA (inmediata, sin stores)
```bash
ionic build --configuration=production
# Subir dist/ a Vercel o Netlify
# Usuario abre URL → Chrome → "Instalar app"
```
Ya tiene `@angular/service-worker`. Falta crear `manifest.webmanifest` con icons y configurar `ngsw-config.json`.

### Ruta 2: Nativa (Capacitor — para Play Store / App Store)
```bash
ionic build --configuration=production
npx cap add android                    # Instalar @capacitor/android
npx cap copy
npx cap sync
npx cap open android                   # Android Studio → APK firmado
```
`@capacitor/core` v8.3.3 ya está. **No están instalados** `@capacitor/android` ni `@capacitor/ios`.

### Push notifications
Edge function `remind-pending-surveys` existe pero **no está conectada a FCM**. Para push real:
1. Instalar `@capacitor/push-notifications`
2. Configurar Firebase project
3. Conectar edge function a Firebase Admin SDK

---

## Lo que falta/pendiente

### Configuración manual en Supabase Dashboard
- Habilitar Realtime para `announcements` y `notices`
- Webhook para INSERT en `announcements` → Edge Function `notify-on-announcement`
- Configurar `FCM_SERVER_KEY` como secreto

### Próximos milestones (en orden de issues de GitHub)
1. **M4 — Calendar** (#31-36): calendario académico, eventos, horarios
2. **M5 — Help Bot** (#37-43): chatbot FAQ, búsqueda
3. **M6 — Polish** (#50-52): error handling service, loading states consistente, dark mode, accesibilidad
4. **M7 — Testing** (#53-58): unit tests (Jest), component tests, E2E
5. **M8 — Performance** (#59-63): bundle optimization, lazy loading, caching, PWA audit
6. **M9 — DevOps** (#64-71, #90): CI/CD pipeline audit, caching, preview deploys
7. **M10 — Deploy** (#74-79): PWA production, Supabase prod, runbook, docs, integration test, launch
8. **M11 — Maintenance** (#80-83): Sentry, analytics, monitoring, backups

---

## Archivos clave

| Archivo | Propósito |
|---|---|
| `theme/tokens.css` | Design tokens (no tocar valores hardcodeados) |
| `theme/variables.css` | Colores Ionic (primary navy, tertiary gold) |
| `app/styles/_cards.scss` | Card system con accent bar (modificar aquí para cambiar cards globalmente) |
| `app/styles/_auth.scss` | Full-bleed auth layout |
| `core/services/survey.service.ts` | CRUD encuestas + respuestas + resultados + export |
| `core/services/auth.service.ts` | initialize() + restoreSession() + cleanup sesiones stale |
| `app.config.ts` | APP_INITIALIZER para auth |
| `styles.scss` | Global styles (gradiente headers, botones, toasts) |
| `docs/FRONTEND-GUIDE.md` | Guía para modificar frontend sin romper |

---

## Verificación final (cuando corras `ng serve`)

1. Login con admin → admin dashboard con hero + stats + nav cards
2. Login con student → student dashboard con hero + sections accent + empty states con iconos
3. Navegar a encuestas → badge rojo si hay pendientes
4. Admin → Anuncios/Avisos/Encuestas → skeleton shimmer loading + accent bars + premium empty states
5. Auth pages → full-bleed gradient + floating card + brand icon
6. Tab bar → glassmorphism + gold indicator
7. Caracteres españoles (ó, ñ, é, ¿, ¡) deben verse correctamente

---

## Tests

- **41 tests** unitarios (servicios de anuncios, avisos, auth)
- **Lint**: 0 errores (solo warnings de libs externas: canvg, jspdf, localforage)
- **Build**: pasa (development + production)
