# UniHub - Architecture Decision Records (ADR)

## 1. ¿Por qué Supabase y no Firebase?

| Criterio | Supabase | Firebase |
|----------|----------|----------|
| Base de datos | PostgreSQL relacional con constraints, JOINs, transacciones | Firestore NoSQL sin JOINs reales ni constraints |
| Auth | JWT estándar, integración nativa con PostgreSQL RLS | Auth propietario, sin integración directa con DB |
| Realtime | PostgreSQL replication via WAL | Listeners específicos de Firestore |
| Edge Functions | Deno / TypeScript (open source) | Google Cloud Functions (vendor lock-in) |
| Migraciones | SQL versionado con CLI, reproducible localmente | Sin migraciones (schema-less) |
| Costo | Open source, self-hosted posible | Propietario, no self-hosted |
| Escalabilidad | PostgreSQL escalable verticalmente + read replicas | Escala automática pero costosa a volumen |

**Decisión**: Supabase porque el dominio (gestión universitaria) es inherentemente relacional: estudiantes, encuestas, aulas, eventos, respuestas — todos con relaciones 1:N y N:M que requieren JOINs y constraints. Además, RLS permite delegar autorización a la capa de datos, simplificando el backend.

## 2. ¿Por qué Jetpack Compose y no XML Views?

| Criterio | Jetpack Compose | XML Views |
|----------|-----------------|-----------|
| Código | Declarativo, menos líneas, menos bugs | Imperativo, boilerplate |
| Previsualización | Live preview en Android Studio | Solo estático |
| Animaciones | API declarativa simple | Animators complejos |
| Mantenimiento | Estado = UI, sin sync manual | View binding, adapters, findViewById |
| Curva de aprendizaje | Moderada (paradigma reactivo) | Baja |
| Madurez | Estable desde 2023 | Legacy desde 2008 |

**Decisión**: Compose porque reduce el tiempo de desarrollo en ~30% para UI complejas como calendarios interactivos y gráficos de encuestas. El equipo puede aprender el paradigma reactivo en M0.

## 3. Patrón de Arquitectura: MVVM + Repository

```
┌──────────────────────────────────────────────────────┐
│  UI Layer (Compose Screens)                         │
│  - Observa StateFlow del ViewModel                  │
│  - Emite eventos de usuario                         │
└──────────────────┬───────────────────────────────────┘
                   │ collectAsState()
┌──────────────────▼───────────────────────────────────┐
│  ViewModel Layer (Hilt-injected)                    │
│  - Expone StateFlow<UiState>                        │
│  - Orquesta llamadas a Repository                   │
│  - Maneja lógica de presentación                    │
└──────────────────┬───────────────────────────────────┘
                   │ suspend fun / Flow
┌──────────────────▼───────────────────────────────────┐
│  Repository Layer                                   │
│  - Network-first: Supabase SDK                      │
│  - Cache-fallback: Room DB                          │
│  - Sincronización offline                           │
└──────┬────────────────────────┬──────────────────────┘
       │                        │
┌──────▼──────┐          ┌──────▼──────┐
│  Supabase   │          │  Room DB    │
│  (Remote)   │          │  (Local)    │
└─────────────┘          └─────────────┘
```

**Principios**:
- **Unidirectional Data Flow (UDF)**: UI emite eventos → ViewModel procesa → nuevo estado → UI se re-renderiza
- **Single source of truth**: El repositorio decide si devolver datos de red o cache
- **Separation of concerns**: ViewModels no saben de HTTP ni SQL; Repositorios no saben de Compose

## 4. Estrategia de Cache

```
1. UI pide datos al Repository
2. Repository devuelve cache Room inmediatamente (si existe)
3. Repository hace fetch a Supabase en paralelo
4. Si Supabase responde: actualiza Room, emite nuevo dato
5. Si Supabase falla: emite error pero UI ya tiene cache
6. Mutaciones (POST/PUT/DELETE): optimista con rollback
```

- **Room** guarda: announcements, notices, events (últimos 30 días), FAQ entries
- **No se cachea**: survey_responses (siempre frescos), auth tokens (EncryptedSharedPreferences)

## 5. Seguridad en Capas

```
┌────────────────┐
│  App Layer     │  Certificate Pinning (OkHttp)
│                │  EncryptedSharedPreferences
│                │  ProGuard/R8 obfuscation
├────────────────┤
│  Transport     │  HTTPS (TLS 1.3)
│                │  JWT en Authorization header
├────────────────┤
│  API Gateway   │  Supabase Auth (JWT validation)
│                │  Rate Limiting (Edge Functions)
├────────────────┤
│  Database      │  Row Level Security (RLS)
│                │  Prepared statements (SQL injection)
│                │  Point-in-time recovery (backups)
└────────────────┘
```

## 6. Convenciones de Código

### Kotlin
- `camelCase` para variables, funciones
- `PascalCase` para clases, data classes, sealed classes
- `SCREAMING_SNAKE_CASE` para constantes en companion object
- Sufijos: `Screen`, `ViewModel`, `Repository`, `DataSource`
- Prefijos para estados: `Loading`, `Success`, `Error`

### SQL
- `snake_case` para tablas y columnas
- Plural para tablas: `profiles`, `announcements`, `surveys`
- Singular para claves foráneas: `created_by`, `survey_id`
- Migraciones numeradas: `00001_initial_schema.sql`

### Edge Functions
- TypeScript con Deno runtime
- Un archivo por función: `notify-on-announcement/index.ts`
- Tests con `deno test`

## 7. Testing Strategy

| Nivel | Framework | Alcance | % Objetivo |
|-------|-----------|---------|------------|
| Unit | JUnit5 + MockK | ViewModels, Repositories, UseCases | 50% |
| Integration | JUnit5 + TestDispatcher | Repository + Room + Supabase | 30% |
| UI | Compose Testing | Screens, navigation, gestures | 15% |
| E2E | Firebase Test Lab | Flujos críticos en dispositivo real | 5% |

## 8. Performance Targets

| Métrica | Objetivo |
|---------|----------|
| Cold start | < 2s |
| Screen render | < 500ms |
| API response (P95) | < 3s |
| Offline availability | 100% (cache) |
| Crash-free rate | > 99% |
| APK size | < 30MB |
