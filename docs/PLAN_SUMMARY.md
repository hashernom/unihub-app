# UniHub - Plan de Desarrollo Completo

## 🔗 Repositorio GitHub
**https://github.com/hashernom/unihub-app**

83 issues creados en 11 fases con milestones, labels y estimaciones.

---

## 📋 Resumen Ejecutivo

**UniHub** es una aplicación Android nativa (Kotlin + Jetpack Compose) para universidad que integra:

| Módulo | Descripción | Issues |
|--------|-------------|--------|
| 🔐 Auth | Registro con código estudiantil + email, login, roles (student/admin) | #7-#14 |
| 📊 Dashboard | Anuncios, avisos, notificaciones en tiempo real | #15-#22 |
| 📝 Encuestas | Creación, respuesta, resultados con gráficos | #23-#30 |
| 📅 Calendario | Eventos, aulas, disponibilidad, conflictos | #31-#39 |
| 🤖 Help Bot | FAQ interactivo, full-text search, escalación | #40-#45 |
| 🎨 UI/UX | Diseño responsive, animaciones, accesibilidad | #46-#52 |
| 🧪 Testing | Unit, integration, UI, E2E, load testing | #53-#60 |
| 🔒 Seguridad | RLS, rate limiting, cert pinning, ofuscación | #61-#67 |
| ⚙️ CI/CD | GitHub Actions, ambientes dev/staging/prod | #68-#73 |
| 🚀 Deploy | APK firmado, Supabase prod, go-live | #74-#79 |
| 📈 Monitoreo | Crashlytics, Analytics, backups | #80-#83 |

---

## 🏗️ Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Android | Kotlin + Jetpack Compose + Material Design 3 |
| Backend | Supabase (PostgreSQL + Auth JWT + Realtime + Edge Functions Deno) |
| Cache Local | Room DB |
| DI | Hilt |
| CI/CD | GitHub Actions |
| Testing | JUnit5, MockK, Compose Testing, Firebase Test Lab |
| Monitoring | Firebase Crashlytics + Analytics |

---

## 📐 Arquitectura

```
UI (Compose Screens) → ViewModels (StateFlow) → Repositories → Supabase SDK + Room DB
                                                                       ↓
                                                                 PostgreSQL (RLS)
```

- **MVVM + Repository Pattern**
- **Network-first, cache-fallback** para offline
- **Edge Functions** para lógica de negocio server-side
- **Row Level Security** para autorización a nivel DB

---

## 📅 Fases y Timeline

| Fase | Semanas | Issues | Dependencia |
|------|---------|--------|-------------|
| M0: Foundation | 1 | #1-#6 | - |
| M1: Auth | 1.5 | #7-#14 | M0 |
| M2: Dashboard | 1.5 | #15-#22 | M1 |
| M3: Surveys | 2 | #23-#30 | M1 |
| M4: Calendar | 2 | #31-#39 | M1 |
| M5: Help Bot | 1.5 | #40-#45 | M1 |
| M6: Polish | 1.5 | #46-#52 | M2-M5 |
| M7: Testing | 1.5 | #53-#60 | M2-M5 |
| M8: Security | 1 | #61-#67 | M2-M5 |
| M9: DevOps | 1 | #68-#73 | M0 |
| M10: Deploy | 1 | #74-#79 | M6-M9 |
| M11: Maintenance | ongoing | #80-#83 | M10 |

**Total: ~14-15 semanas**

---

## 🔒 Seguridad

1. JWT via Supabase Auth
2. Row Level Security en todas las tablas
3. EncryptedSharedPreferences para tokens
4. Certificate Pinning (OkHttp)
5. Rate Limiting en Edge Functions
6. Input sanitization (XSS prevention)
7. ProGuard/R8 ofuscación
8. OWASP Dependency Check

---

## 🧪 Testing Strategy

```
    /\\ E2E /\\        ~5%  - Flujos críticos
   /  UI    \\       ~15%  - Compose Testing
  /----------\\       ~30%  - Integration
 /   Unit     \\     ~50%  - ViewModels, Repos, Edge Functions
```

---

## ✅ Definition of Done

- [ ] Código implementado según arquitectura
- [ ] Tests unitarios pasando (>80% coverage)
- [ ] Lint y detekt sin errores
- [ ] Funciona en emulador API 26 y 34
- [ ] PR revisado
- [ ] No introduce regresiones

---

## 📂 Estructura del Repositorio

```
unihub-app/
├── .github/workflows/       # CI/CD (android-ci, edge-functions-ci, release, nightly)
├── android/                 # App Android (Kotlin + Compose)
├── supabase/
│   ├── migrations/          # SQL versionado
│   ├── edge-functions/      # Deno (4 funciones)
│   └── seed.sql
├── docs/                    # ARCHITECTURE, DATABASE_SCHEMA, SECURITY, DEPLOYMENT
└── scripts/
```
