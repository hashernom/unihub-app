# UniHub - Aplicación Universitaria

[![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20iOS%20%7C%20Android-blue)](https://ionicframework.com)
[![Ionic](https://img.shields.io/badge/Ionic-7-3880FF?logo=ionic)](https://ionicframework.com)
[![Angular](https://img.shields.io/badge/Angular-18-DD0031?logo=angular)](https://angular.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com)

Aplicación cross-platform (web, iOS, Android) construida con **Ionic + Angular** para universidades. Un solo codebase TypeScript que integra anuncios, encuestas, calendario, gestión de aulas y un bot de ayuda interactivo.

## Módulos

| Módulo | Descripción |
|--------|-------------|
| Auth | Registro con código estudiantil, login, roles (student/admin) |
| Dashboard | Anuncios con categorías, avisos prioritarios, notificaciones push |
| Encuestas | Creación, respuesta, resultados con gráficos y estadísticas |
| Calendario | Eventos, disponibilidad de aulas, detección de conflictos |
| Help Bot | FAQ interactivo con full-text search y escalación |

## Stack

- **Frontend**: Ionic 7+ + Angular 18+ + TypeScript
- **UI**: Ionic Web Components + CSS Custom Properties
- **Native Bridge**: Capacitor 6+ (notificaciones, storage, cámara)
- **State**: Angular Services + RxJS + Signals
- **Backend**: Supabase (PostgreSQL + Auth JWT + Realtime + Edge Functions)
- **Cache Local**: SQLite (Capacitor) + Ionic Storage + PWA Service Worker
- **CI/CD**: GitHub Actions (npm)
- **Testing**: Jest, Jasmine, Playwright (E2E), axe-core (a11y)
- **Monitoring**: Sentry

## Inicio Rápido

### Prerrequisitos
- Node.js 20+
- Ionic CLI (`npm install -g @ionic/cli`)
- Angular CLI (`npm install -g @angular/cli`)
- Supabase CLI (`npm install -g supabase`)

### Setup Local

```bash
# Clonar el repositorio
git clone https://github.com/hashernom/unihub-app.git
cd unihub-app

# Instalar dependencias
npm install

# Iniciar Supabase local (PostgreSQL + Auth + Realtime)
supabase start

# Aplicar migraciones y seed data
supabase db reset

# Iniciar app en navegador
ionic serve

# Ejecutar en dispositivo (iOS/Android)
ionic capacitor run android
ionic capacitor run ios
```

## Estructura del Repositorio

```
unihub-app/
├── src/                        # Ionic + Angular app
│   ├── app/
│   │   ├── core/               # AuthService, SupabaseService, StorageService
│   │   ├── shared/             # Shared components, pipes, directives
│   │   └── pages/              # Feature pages (auth, dashboard, surveys, calendar, help)
│   ├── assets/                 # Images, icons, fonts
│   ├── environments/           # Environment config
│   └── theme/                  # CSS variables, global styles
├── supabase/
│   ├── migrations/             # PostgreSQL versionado
│   ├── edge-functions/         # Deno TypeScript
│   └── seed.sql                # Datos de desarrollo
├── docs/
│   ├── ARCHITECTURE.md         # Decisiones de arquitectura (ADR)
│   ├── DATABASE_SCHEMA.md      # Esquema completo de base de datos
│   ├── EDGE_FUNCTIONS.md       # Contratos de Edge Functions
│   └── PLAN_SUMMARY.md         # Plan de desarrollo (83 issues, 11 fases)
├── capacitor.config.ts         # Capacitor configuration
└── README.md
```

## Documentación

- [Arquitectura](docs/ARCHITECTURE.md) — ADR: Ionic vs Native, Supabase vs Firebase, capas, seguridad
- [Database Schema](docs/DATABASE_SCHEMA.md) — 14 tablas PostgreSQL con índices y RLS
- [Edge Functions](docs/EDGE_FUNCTIONS.md) — Contratos TypeScript de las 4 funciones Deno
- [Plan de Desarrollo](docs/PLAN_SUMMARY.md) — 83 issues en 11 fases

## Seguridad

- JWT via Supabase Auth (almacenado en Ionic Secure Storage)
- Row Level Security en PostgreSQL
- Content Security Policy (CSP) en PWA
- Angular sanitizer contra XSS
- Rate Limiting en Edge Functions
- npm audit + Dependabot

## Testing

```bash
# Unit tests
npm test

# E2E tests
npm run e2e

# Accessibility audit
npm run a11y
```

Ejecutar más de 200 tests que cubren Services, Components, Edge Functions y flujos E2E.

## Licencia

Proyecto académico — Universidad.
