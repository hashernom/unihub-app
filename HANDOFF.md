# UniHub — Handoff Report

## Estado general

| Hito | Estado |
|---|---|
| M1 — Auth (login, register, forgot/reset, profile, guards) | ✅ Completo y estable |
| M2 — Dashboard (anuncios, avisos, realtime, search, admin CRUDs, edge function) | ✅ Completo |
| M3 — Surveys (listado, respuesta, admin CRUD, resultados, export, edge functions) | ✅ Completo |
| M4 — Calendar | ✅ Completo |
| M5 — Help Bot | ⬜ Pendiente |
| M6+ (Polish, Testing, DevOps, Deploy) | ⬜ Issues creados en GitHub |

---

## Stack

- **Frontend**: Ionic 8.8.6 + Angular 21.2 (standalone components)
- **Backend**: Supabase (`syhxhnisksggxhtbvggu`, sa-east-1)
- **Admin user**: `admin@unihub.com` / `Admin123456!` (rol admin)
- **Student test**: `01240371032@mail.udes.edu.co` (contraseña: `Admin123456!`)

---

## M4 — Calendar (completado en esta sesión)

### Páginas del módulo

| Ruta | Página | Funcionalidad |
|------|--------|---------------|
| `/tabs/calendar` | `tab-calendar.page` | Calendario estudiante con FullCalendar (mes/semana/día), filtros por tipo y aula, modal de detalles |
| `/admin/events` | `admin-events.page` | CRUD eventos con ActionSheet para recurrentes, cancelar/eliminar, badges de estado |
| `/admin/events/new` | `event-form.page` | Crear evento con selector 12h AM/PM, conflicto de horario, disponibilidad inline, notificación email |
| `/admin/events/edit/:id` | `event-form.page` | Editar evento (carga datos existentes) |
| `/admin/classrooms` | `admin-classrooms.page` | CRUD aulas con filtro por edificio, toggle activo/inactivo, disponibilidad semanal |
| `/admin/classrooms/new` | `classroom-form.page` | Crear aula con validaciones |
| `/admin/classrooms/edit/:id` | `classroom-form.page` | Editar aula |
| `/notification-settings` | `notification-settings.page` | Preferencias: 1h, 15min, encuestas, anuncios |

### Servicios y Edge Functions

| Archivo | Propósito |
|---------|-----------|
| `core/services/event.service.ts` | Supabase queries, RRULE expansion (`rrule` library), conflict detection, CRUD |
| `core/services/offline-manager.service.ts` | Caching network-first para eventos próximos |
| `supabase/.../send-event-invitation/index.ts` | Edge function - envía emails con ICS via Resend |
| `supabase/.../check-classroom-availability/index.ts` | Edge function - verifica disponibilidad de aula |
| `supabase/.../remind-event-notifications/index.ts` | Edge function (cron 15min) - notificaciones FCM push |

### FullCalendar configuración

| Opción | Valor | Propósito |
|--------|-------|-----------|
| `plugins` | dayGrid, timeGrid, interaction | Vistas mes/semana/día + interacciones |
| `locale` | `es` | Español |
| `firstDay` | `1` | Semana empieza lunes |
| `navLinks` | `true` | Números de día son links navegables |
| `dateClick` | handler | Navega a vista diaria al clickear día |
| `eventClick` | handler | Abre modal con detalles del evento |
| `dayMaxEventRows` | `3` | Límite de eventos visibles por día (+ "más") |
| `headerToolbar` | `false` | Toolbar personalizado en template |
| `dayCellClassNames` | dinámico | Highlight dorado en día seleccionado |

### Filtros del calendario estudiante

-Filtro por tipo de evento (chips: Todos/Clases/Exámenes/Reuniones/Talleres/Otros)
-Filtro por aula (selector IonSelect con popover)
-Filtros combinables (tipo + aula)
-Botón "Limpiar filtros"
-Conteo de eventos por tipo y aula

### Eventos recurrentes (RRULE)

-Soporte completo: RRULE expandido via `rrule` library
-Instancias con IDs únicos compuestos (`eventId_dateKey`)
-Cancelación de instancia individual via `recurring_exceptions` (upsert)
-Admin ActionSheet: "Solo esta instancia" / "Toda la serie"
-Editar instancia: toast recomendando cancelar y recrear

### Seed data (supabase/seed.sql)

#### 7 aulas

| Aula | Edificio | Capacidad |
|------|----------|-----------|
| Aula 101 | Edificio A | 40 |
| Aula 201 | Edificio A | 60 |
| Aula 301 | Edificio A | 35 |
| Laboratorio 1 | Edificio B | 30 |
| Auditorio Principal | Edificio C | 200 |
| Sala de Reuniones | Edificio A | 15 |
| Aula Magna | Edificio D | 150 |

#### 5 eventos recurrentes (class)

| Evento | Días | Horario | Aula | Inicia |
|--------|------|---------|------|--------|
| Álgebra Lineal | Lun, Mié, Vie | 08:00-10:00 | Aula 101 | 20-abr |
| Programación I | Lun, Mié | 10:00-12:00 | Laboratorio 1 | 27-abr |
| Cálculo Diferencial | Mar, Jue | 14:00-16:00 | Aula 201 | 21-abr |
| Física Mecánica | Mié | 07:00-10:00 | Aula 301 | 22-abr |
| Inglés Técnico | Jue | 09:00-11:00 | Aula 101 | 23-abr |

#### 9 eventos únicos

| Fecha | Evento | Tipo | Aula |
|-------|--------|------|------|
| 12-may | Parcial de Cálculo | exam 🔴 | Aula Magna |
| 15-may | Charla: IA en la Educación | workshop 🟠 | Auditorio |
| 25-may | Sustentación de Proyectos | meeting 🟢 | Auditorio |
| 30-may | Taller de Machine Learning | workshop 🟠 | Laboratorio 1 |
| 01-jun | Cierre de Notas | other ⚪ | Aula 201 |
| 05-jun | Reunión de Facultad | meeting 🟢 | Sala Reuniones |
| 08-jun | Semana de Repaso — Física | class 🔵 | Aula 301 |
| 10-jun | Ordinario — Física | exam 🔴 | Aula 201 |
| 15-jun | Examen Final — Álgebra | exam 🔴 | Auditorio |

### Datos en Supabase

Los datos se cargaron directamente en el proyecto Supabase via `supabase_execute_sql`:
- 5 classrooms existentes renombradas a los nombres del seed
- 2 aulas nuevas creadas (Aula 301 + Aula Magna)
- 5 eventos viejos eliminados
- 14 eventos insertados (5 recurrentes con RRULE + 9 únicos)

### Guía de testing

Documento `docs/M4-TESTING-GUIDE.md` con 50+ casos de prueba para:
- Calendario estudiante (1.1-1.14)
- Filtros (2.1-2.6)
- Gestión de aulas admin (3.1-3.9)
- Gestión de eventos admin (4.1-4.17)
- Visualización estudiante (5.1-5.4)
- Notificaciones (6.1-6.3)
- Admin Dashboard (7.1)
- Regresión M1-M3 (8.1-8.4)
- Backend/API (9.1-9.5)

---

## Bugs corregidos en esta sesión (M4)

### 1. Notificaciones 15 minutos nunca se enviaban
- **Problema**: `remind-event-notifications/index.ts:39-40` — `fifteenMinIds` se creaba con los mismos `fifteenMinEvents`, filtrando contra sí mismo. `fifteenMinOnly` siempre vacío.
- **Fix**: Usar `oneHourIds` en vez de `fifteenMinIds`.

### 2. `editEvent()` muerto en admin-events
- **Problema**: Método duplicado `editEvent()` que usaba `cancelTarget` en vez de `editTarget` y no era llamado desde el template.
- **Fix**: Eliminado.

### 3. Eventos sin aula invisibles en calendario estudiante
- **Problema**: `classrooms!inner(name)` en non-recurring (INNER JOIN) vs `classrooms(name)` en recurring (LEFT JOIN). Eventos sin aula no aparecían.
- **Fix**: Cambiado a `classrooms(name)` (LEFT JOIN) consistente.

### 4. Errores de invitación email silenciados
- **Problema**: `sendInvitations().catch(() => {})` — sin feedback.
- **Fix**: Toast con mensaje de error.

### 5. Navegación calendario con DOM queries frágiles
- **Problema**: `document.querySelector(".full-calendar")` con casting inseguro.
- **Fix**: `@ViewChild(FullCalendarComponent)` con `getApi().today()/prev()/next()/changeView()`.

### 6. Eventos recurrentes con IDs duplicados
- **Problema**: Todas las instancias compartían el mismo ID del evento padre → FullCalendar renderizaba erráticamente.
- **Fix**: IDs compuestos únicos: `${eventId}_${dateKey}`.

### 7. Mes no se mostraba en calendario
- **Fix**: `currentMonthLabel` actualizado via `datesSet` callback + template `{{ currentMonthLabel }}`.

### 8. No se podía seleccionar día en calendario
- **Problema**: `selectable` + `select` callback causaba highlight en todo el contenedor.
- **Fix**: `dateClick` + `dayCellClassNames` dinámico + manipulación directa del DOM. Highlight dorado visible.

### 9. Modal de detalles del evento en blanco
- **Problema**: `<ng-template>` deprecated en Ionic 8 impedía renderizar contenido del modal.
- **Fix**: Eliminado `<ng-template>`, contenido proyectado directamente.

### 10. Date pickers del form no funcionaban (IonDatetime)
- **Problema**: `IonDatetime presentation="date"` no permitía seleccionar días visualmente.
- **Fix**: Reemplazado por `<ion-input type="date">` nativo.

### 11. Horas en 24h sin opción AM/PM
- **Problema**: `<ion-input type="time">` en 24h.
- **Fix**: Selector custom con hour (1-12), : minute (00/15/30/45), segment AM/PM. Conversión automática a 24h para BD.

### 12. Lint errors preexistentes
- `IonBadge` unused import → removido
- `RRuleSet` unused import → removido
- `eventType: string = 'class'` → `eventType = 'class'`

---

## M3 — Surveys (completado en sesión anterior)

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

00001 (schema inicial), 00002 (RLS), 00003 (trigger perfil), 00005 (realtime), 00006 (survey_reminders + UNIQUE), 00007 (recurring_exceptions), 00008 (notification_settings)

---

## Rediseño Frontend (completado en sesión anterior)

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

## Deploy — Estrategia

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
npx cap add android
npx cap copy
npx cap sync
npx cap open android
```
`@capacitor/core` v8.3.3 ya está. **No están instalados** `@capacitor/android` ni `@capacitor/ios`.

---

## Archivos clave

| Archivo | Propósito |
|---|---|
| `theme/tokens.css` | Design tokens (no tocar valores hardcodeados) |
| `theme/variables.css` | Colores Ionic (primary navy, tertiary gold) |
| `core/services/event.service.ts` | Calendar queries, RRULE expansion, conflict detection, CRUD |
| `core/services/survey.service.ts` | CRUD encuestas + respuestas + resultados + export |
| `core/services/auth.service.ts` | initialize() + restoreSession() + cleanup sesiones stale |
| `app.config.ts` | APP_INITIALIZER para auth |
| `supabase/seed.sql` | Seed data: aulas, eventos, FAQs, surveys |
| `docs/M4-TESTING-GUIDE.md` | Testing guide para M4 con 50+ test cases |
| `HANDOFF.md` | Este archivo |

---

## Próximos milestones

1. **M5 — Help Bot**: chatbot FAQ, búsqueda
2. **M6 — Polish**: error handling service, loading states consistente, dark mode, accesibilidad
3. **M7 — Testing**: unit tests (Jest), component tests, E2E
4. **M8 — Performance**: bundle optimization, lazy loading, caching, PWA audit
5. **M9 — DevOps**: CI/CD pipeline audit, caching, preview deploys
6. **M10 — Deploy**: PWA production, Supabase prod, runbook, docs, integration test, launch
7. **M11 — Maintenance**: Sentry, analytics, monitoring, backups

---

## CI Pipeline

### Ionic CI
- `npm run lint` → All files pass (0 errors)
- `npm test` → 66 tests, 6 files
- `npm run build` → Build exitoso (warnings de canvg/jspdf/localforage, no de código propio)

### Supabase CI
- `deno lint supabase/edge-functions/` → .github/workflows/supabase-ci.yml
- `supabase db lint --file supabase/migrations/*.sql`

---

## Tests

- **66 tests** unitarios (servicios: auth, announcements, notices, events)
- **Lint**: 0 errores
- **Build**: pasa (development + production)