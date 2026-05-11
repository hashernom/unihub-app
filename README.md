# UniHub

Aplicación universitaria multiplataforma para estudiantes y administradores. Construida con Ionic + Angular 21 + Supabase.

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Angular 21 (standalone components) |
| UI | Ionic 8 + Capacitor 8 |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions) |
| Estado | RxJS / BehaviorSubjects |
| Offline | Ionic Storage + SQLite |
| PWA | Service Worker (instalable) |
| Tests | Vitest |
| CI/CD | GitHub Actions |

## Funcionalidades

- **Auth**: registro con email institucional (`@mail.udes.edu.co`), extracción automática de código estudiantil, login, recuperación de contraseña
- **Roles**: estudiante y administrador, con guards y redirección por rol
- **Perfil**: edición de nombre, avatar (DiceBear + upload a Supabase Storage), vista de carrera y semestre
- **Dashboard admin**: métricas (usuarios, encuestas, eventos), cards de navegación a CRUDs
- **Offline**: estrategia network-first con cache en SQLite
- **RLS**: 40+ políticas de seguridad a nivel de base de datos
- **Edge Functions**: validación de código estudiantil (Deno)

## Requisitos

- Node.js 18+
- npm 9+
- Angular CLI 21 (`npm install -g @angular/cli`)
- Una cuenta en Supabase (gratuita)

## Inicio rápido

```bash
git clone <repo>
cd unihub-src
npm install
ng serve
```

Abrir `http://localhost:4200/`.

### Variables de entorno

Configurar en `src/environments/environment.ts`:

```ts
export const environment = {
  production: false,
  supabaseUrl: 'https://tu-proyecto.supabase.co',
  supabaseAnonKey: 'tu-anon-key',
};
```

## Estructura del proyecto

```
src/
├── app/
│   ├── core/
│   │   ├── interfaces/        # Tipos compartidos
│   │   ├── services/          # Auth, Supabase, Offline, Storage
│   │   └── storage/           # Database + Storage services
│   ├── pages/
│   │   ├── login/             # Inicio de sesión
│   │   ├── register/          # Registro con email institucional
│   │   ├── forgot-password/   # Recuperación de contraseña
│   │   ├── reset-password/    # Cambio de contraseña
│   │   ├── profile/           # Perfil de usuario
│   │   ├── tabs/              # Navegación por tabs (estudiante)
│   │   ├── tab-dashboard/     # Dashboard estudiante
│   │   ├── tab-surveys/       # Encuestas
│   │   ├── tab-calendar/      # Calendario
│   │   ├── tab-help/          # FAQ / Ayuda
│   │   └── admin-*/           # CRUDs de administración
│   └── app.routes.ts          # Definición de rutas con guards
├── supabase/
│   ├── migrations/            # Migraciones SQL versionadas
│   ├── edge-functions/        # Edge Functions (Deno)
│   └── seed.sql               # Datos de prueba
└── docs/                      # Documentación del proyecto
```

## Comandos

```bash
ng serve           # Servidor de desarrollo
ng build           # Build de producción
ng test            # Tests unitarios (Vitest)
ng lint            # ESLint
ng build --stats-json # Build con análisis de bundle
```

## Arquitectura

3 capas con flujo unidireccional:

1. **Presentación**: Pages (standalone components Ionic)
2. **Aplicación**: Servicios singleton con BehaviorSubject + RxJS
3. **Datos**: SupabaseService + StorageService + OfflineManagerService

### Auth flow

```
signUp → Supabase Auth → trigger crea profile en BD → AuthUser local
signIn → Supabase Auth → ensureProfile() → AuthUser desde BD
```

El código estudiantil se extrae automáticamente del email institucional (parte antes de `@mail.udes.edu.co`).

## Base de datos

14 tablas en PostgreSQL con RLS habilitado. Ver `supabase/migrations/` y `docs/DATABASE_SCHEMA.md`.

## Documentación

Ver `docs/` para:
- `ARCHITECTURE.md` — Decisiones técnicas
- `DATABASE_SCHEMA.md` — Esquema completo
- `SECURITY.md` — Seguridad multi-capa
- `EDGE_FUNCTIONS.md` — Funciones serverless
- `CONTRIBUTING.md` — Cómo contribuir
- `DEPLOYMENT.md` — Guía de despliegue
