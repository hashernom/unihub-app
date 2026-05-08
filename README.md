# UniHub - Aplicación Universitaria

[![Platform](https://img.shields.io/badge/Platform-Android-green)](https://developer.android.com)
[![Kotlin](https://img.shields.io/badge/Kotlin-2.0-7F52FF?logo=kotlin)](https://kotlinlang.org)
[![Compose](https://img.shields.io/badge/Jetpack%20Compose-1.7-4285F4?logo=android)](https://developer.android.com/compose)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com)

App Android nativa para universidades que integra anuncios, encuestas, calendario, gestión de aulas y un bot de ayuda interactivo.

## Módulos

| Módulo | Descripción |
|--------|-------------|
| Auth | Registro con código estudiantil, login, roles (student/admin) |
| Dashboard | Anuncios con categorías, avisos prioritarios, notificaciones push |
| Encuestas | Creación, respuesta, resultados con gráficos y estadísticas |
| Calendario | Eventos, disponibilidad de aulas, detección de conflictos |
| Help Bot | FAQ interactivo con full-text search y escalación |

## Stack

- **Android**: Kotlin + Jetpack Compose + Material Design 3
- **Backend**: Supabase (PostgreSQL + Auth JWT + Realtime + Edge Functions)
- **Cache Local**: Room DB
- **DI**: Hilt
- **CI/CD**: GitHub Actions
- **Testing**: JUnit5, MockK, Compose Testing, Firebase Test Lab

## Estructura del Repositorio

```
unihub-app/
├── android/                    # App Android (Kotlin + Compose)
├── supabase/
│   ├── migrations/             # SQL versionado
│   ├── edge-functions/         # Deno (TypeScript)
│   └── seed.sql                # Datos de desarrollo
├── docs/
│   ├── ARCHITECTURE.md         # Decisiones de arquitectura (ADR)
│   ├── DATABASE_SCHEMA.md      # Esquema completo de base de datos
│   ├── EDGE_FUNCTIONS.md       # Contratos de Edge Functions
│   └── PLAN_SUMMARY.md         # Plan de desarrollo completo
├── .github/
│   └── workflows/              # CI/CD pipelines
└── scripts/
```

## Documentación

- [Arquitectura](docs/ARCHITECTURE.md) — Decisiones técnicas y diseño del sistema
- [Database Schema](docs/DATABASE_SCHEMA.md) — Esquema PostgreSQL completo
- [Edge Functions](docs/EDGE_FUNCTIONS.md) — Contratos de las 4 funciones serverless
- [Plan de Desarrollo](docs/PLAN_SUMMARY.md) — 83 issues en 11 fases

## Inicio Rápido

### Prerrequisitos
- Android Studio Hedgehog (2023.1.1) o superior
- JDK 17
- Supabase CLI (`npm install -g supabase`)

### Setup Local

```bash
# Clonar el repositorio
git clone https://github.com/hashernom/unihub-app.git
cd unihub-app

# Iniciar Supabase local
supabase start

# Aplicar migraciones
supabase db reset

# Abrir proyecto Android
# File > Open > android/
```

## Seguridad

- JWT via Supabase Auth
- Row Level Security en todas las tablas
- Certificate Pinning (OkHttp)
- EncryptedSharedPreferences para tokens
- Rate Limiting en Edge Functions
- ProGuard/R8 ofuscación

## Testing

```bash
# Unit tests
./gradlew test

# Instrumented tests
./gradlew connectedAndroidTest
```

Ejecutar más de 200 tests que cubren ViewModels, Repositories, Edge Functions e integración.

## Licencia

Proyecto académico — Universidad.
