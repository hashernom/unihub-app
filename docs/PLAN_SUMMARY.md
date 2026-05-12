# UniHub - Plan de Desarrollo Completo (Ionic + Angular)

## 🔗 Repositorio GitHub
**https://github.com/hashernom/unihub-app**

83 issues creados en 11 fases con milestones y labels.

---

## 📋 Resumen Ejecutivo

**UniHub** es una aplicación cross-platform (web, iOS, Android) construida con **Ionic + Angular** para universidades. Un solo codebase en TypeScript que integra:

| Módulo | Descripción | Issues |
|--------|-------------|--------|
| 🔐 Auth | Registro con código estudiantil + email, login, roles (student/admin) | #7-#14 |
| 📊 Dashboard | Anuncios, avisos, notificaciones en tiempo real | #15-#22 |
| 📝 Encuestas | Creación, respuesta, resultados con gráficos | #23-#30 |
| 📅 Calendario | Eventos, aulas, disponibilidad, conflictos | #31-#39 |
| 🤖 Help Bot | FAQ interactivo, full-text search, escalación | #40-#45 |
| 🎨 UI/UX | Diseño responsive, animaciones, accesibilidad, PWA | #46-#52 |
| 🧪 Testing | Unit, integration, E2E, accessibility | #53-#60 |
| 🔒 Seguridad | RLS, rate limiting, CSP, input sanitization | #61-#67 |
| ⚙️ CI/CD | GitHub Actions, ambientes dev/staging/prod | #68-#73 |
| 🚀 Deploy | PWA + App Store + Play Store, Supabase prod | #74-#79 |
| 📈 Monitoreo | Sentry error tracking, analytics, backups | #80-#83 |

---

## 🏗️ Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Ionic 7+ + Angular 18+ + TypeScript |
| UI Components | Ionic Web Components + CSS Custom Properties |
| State Management | Angular Services + RxJS + Signals |
| PWA | Service Worker (Angular PWA) + Workbox |
| Native Bridge | Capacitor 6+ (cámara, notificaciones, storage) |
| Backend | Supabase (PostgreSQL + Auth JWT + Realtime + Edge Functions Deno) |
| Cache Local | @capacitor-community/sqlite + Ionic Storage |
| DI | Angular dependency injection (`providedIn: 'root'`) |
| CI/CD | GitHub Actions (npm, lint, test, build, deploy) |
| Testing | Jest, Jasmine, Playwright (E2E), axe-core (a11y) |
| Monitoring | Sentry + Supabase Logs |

---

## 📐 Arquitectura

```
┌────────────────────────────────────────────────────┐
│  Presentation Layer (Ionic Pages + Components)     │
│  - Angular templates con Ionic UI components       │
│  - RxJS async pipe + Signals                       │
└──────────────────┬─────────────────────────────────┘
                   │ Services (DI)
┌──────────────────▼─────────────────────────────────┐
│  Application Layer (Angular Services + Facades)    │
│  - AuthService, SurveyService, EventService, etc.  │
│  - State management via BehaviorSubject + Signals   │
└──────────────────┬─────────────────────────────────┘
                   │
┌──────────────────▼─────────────────────────────────┐
│  Data Layer (Providers / Repositories)             │
│  - Network-first: @supabase/supabase-js            │
│  - Offline-fallback: SQLite + Ionic Storage         │
│  - Realtime subscriptions via Supabase Realtime     │
└──────┬──────────────────────┬──────────────────────┘
       │                      │
┌──────▼──────┐        ┌──────▼──────┐
│  Supabase   │        │  SQLite     │
│  (Remote)   │        │  (Local)    │
│  PostgreSQL │        │  Capacitor  │
└─────────────┘        └─────────────┘
```

- **Angular Services + Repository Pattern**
- **Network-first, cache-fallback** para offline via SQLite
- **Edge Functions** (Deno TypeScript) para lógica server-side
- **Row Level Security** (PostgreSQL) para autorización a nivel DB
- **PWA** con Service Worker para acceso offline y cache de assets

---

## 📅 Fases y Timeline

| Fase | Semanas | Issues | Prioridad | Dependencia |
|------|---------|--------|:---------:|-------------|
| M0: Foundation | 1 | #1-#6 | — | — |
| M1: Auth | 1.5 | #7-#14 | — | M0 |
| M2: Dashboard | 1.5 | #15-#22 | p0 | M1 |
| M3: Surveys | 2 | #23-#30 | p1 | M1 |
| M4: Calendar | 2 | #31-#39 | p1 | M1 + M3 |
| M5: Help Bot | 1.5 | #40-#45 | p1 | M1 + M2 |
| M6: Polish | 1.5 | #46-#52 | p2 | ≥2 de M2-M5 funcionales |
| M7: Testing | 1.5 | #53-#60 | p2 | por módulo (unit → component → E2E) |
| M8: Security | 1 | #61-#67 | p2 | por capa (CSP temprano, RLS ya hecho, audit final) |
| M9: DevOps | 1 | #72-#73, #90 | p3 | M0 (CI base ya existe) |
| M10: Deploy | 1 | #74-#79 | p3 | M6-M8 |
| M11: Maintenance | ongoing | #80-#83 | p3 | M10 |

**Total: ~12-14 semanas (con solapamiento)**

### Reglas de ejecución

- **M2 debe completarse primero** (p0): dashboard es la vista principal del estudiante y admin
- **M3 y M4 pueden solaparse parcialmente**: surveys → survey responses → calendar
- **M5 puede comenzar tras M2** (necesita contexto del dashboard para la UI del help bot)
- **M6 NO debe esperar a M2-M5 completos**: empieza cuando ≥2 módulos de feature estén funcionales
- **M7 va en paralelo con cada módulo**: tests unitarios al cerrar cada issue, E2E al final
- **M8 por capas**: CSP/input sanitization en paralelo con features, RLS audit al final
- **M9 (#72, #73, #90)**: CI ya existe desde M0, solo falta entornos+migrations+audit
- **M10 solo cuando la app esté pulida, testeada y asegurada**
- **Los issues cerrados #68-#71 eran duplicados de trabajo hecho en M0**

---

## 🔒 Seguridad

1. JWT via Supabase Auth (almacenado en Ionic Secure Storage)
2. Row Level Security en todas las tablas PostgreSQL
3. Content Security Policy (CSP) en PWA
4. HTTPS + HSTS
5. Rate Limiting en Edge Functions
6. Input sanitization (XSS prevention via Angular's built-in sanitizer)
7. CORS configurado en Supabase
8. npm audit + Dependabot para vulnerabilidades

---

## 🧪 Testing Strategy

```
    /\\ E2E /\\        ~5%  - Flujos críticos (Playwright)
   /  UI    \\       ~15%  - Component tests (Jasmine + Ionic Test)
  /----------\\       ~30%  - Integration (Services + Supabase)
 /   Unit     \\     ~50%  - Services, Pipes, Edge Functions (Jest)
```

---

## ✅ Definition of Done

- [ ] Código implementado según arquitectura
- [ ] Tests unitarios pasando (>80% coverage)
- [ ] ESLint + Prettier sin errores
- [ ] Funciona en Chrome, Safari, iOS, Android (PWA)
- [ ] PR revisado
- [ ] 3+ acceptance criteria cumplidos
- [ ] No introduce regresiones

---

## 📂 Estructura del Repositorio

```
unihub-app/
├── .github/workflows/         # CI/CD (ionic-ci, edge-functions-ci, release)
├── src/                       # Ionic + Angular app
│   ├── app/                   # App module, routing, core services
│   │   ├── core/              # AuthService, SupabaseService, StorageService
│   │   ├── shared/            # Shared components, pipes, directives
│   │   └── pages/             # Feature pages (auth, dashboard, surveys, calendar, help)
│   ├── assets/                # Images, icons, fonts
│   ├── environments/          # Environment config (dev, staging, prod)
│   └── theme/                 # CSS variables, global styles
├── supabase/
│   ├── migrations/            # PostgreSQL versionado
│   │   ├── 00001_initial_schema.sql   (14 tablas, constraints, índices, triggers)
│   │   └── 00002_rls_policies.sql     (40+ políticas RLS con filtros por estado)
│   ├── edge-functions/        # Deno TypeScript (4 funciones con contratos documentados)
│   └── seed.sql               # 7 aulas, 12 FAQs, 2 encuestas de ejemplo
├── docs/
│   ├── ARCHITECTURE.md        # ADR: Ionic vs Native, Supabase vs Firebase, capas, seguridad
│   ├── DATABASE_SCHEMA.md     # Esquema completo con índices y RLS mejorado
│   ├── EDGE_FUNCTIONS.md      # Contratos detallados de las 4 Edge Functions
│   └── PLAN_SUMMARY.md        # Plan de desarrollo completo (83 issues, 11 fases)
├── capacitor.config.ts        # Capacitor configuration
├── angular.json               # Angular CLI configuration
├── ionic.config.json          # Ionic configuration
└── README.md
```

### ✅ Entregables completados (2026-05-08)

| Entregable | Estado | Descripción |
|------------|--------|-------------|
| Migraciones SQL | ✅ | `00001_initial_schema.sql` + `00002_rls_policies.sql` listas para Supabase CLI |
| RLS Policies | ✅ | 40+ políticas con filtrado por `expires_at`, `is_active`, `is_cancelled` |
| Seed Data | ✅ | 7 classrooms, 12 FAQ entries, 2 surveys, blacklist inicial |
| Documentación | ✅ | ARCHITECTURE.md, DATABASE_SCHEMA.md, EDGE_FUNCTIONS.md, README.md |
| Edge Functions (contratos) | ✅ | 4 funciones documentadas con contratos TypeScript (Deno) |
| Nuevas tablas | ✅ | `notification_tokens`, `student_code_blacklist`, `survey_results_cache` |
