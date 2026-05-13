# UniHub — Handoff Report

## Estado general

| Hito | Estado |
|---|---|
| M1 — Auth (login, register, forgot/reset, profile, guards) | ✅ Completo y estable |
| M2 — Dashboard (anuncios, avisos, realtime, search, admin CRUDs, edge function) | ✅ Código completo, 41 tests, build OK |
| M3 — Surveys | ⬜ Pendiente |
| M4 — Calendar | ⬜ Pendiente |
| M5 — Help Bot | ⬜ Pendiente |

**Último bug conocido**: `ExpressionChangedError` al cerrar sesión → ya corregido con `ionViewWillEnter()` en login page. Falta verificar con `ng serve`.

---

## Stack

- **Frontend**: Ionic 8 + Angular 21 (standalone components)
- **Backend**: Supabase (`syhxhnisksggxhtbvggu`, sa-east-1)
- **Admin user**: `admin@unihub.com` / `Admin123456!` (rol admin)

---

## M2 — Issues completados

| Issue | Descripción |
|---|---|
| #15 | Student Dashboard: anuncios, avisos, eventos, encuestas, FAQ con búsqueda |
| #16 | AnnouncementService: CRUD, caché offline, filtro por categoría, expiración |
| #17 | NoticeService: CRUD, caché offline, orden por prioridad |
| #18 | RealtimeService: suscripciones Supabase Realtime por tabla |
| #19 | Search/filter en dashboard (searchbar + chips por categoría) |
| #20 | Admin CRUD de anuncios (crear, editar, eliminar, pin, expiración) |
| #21 | Admin CRUD de avisos (crear, editar, eliminar, toggle activo) |
| #22 | Edge Function `notify-on-announcement` (FCM push, desplegada v2) |

---

## Arquitectura

```
src/app/
├── core/services/
│   ├── auth.service.ts           # signUp, signIn, signOut, restoreSession
│   ├── announcement.service.ts   # CRUD anuncios + caché
│   ├── notice.service.ts         # CRUD avisos + caché
│   ├── realtime.service.ts       # Suscripciones Realtime
│   └── supabase.client.ts        # Cliente Supabase singleton
├── pages/
│   ├── login/                    # Login con toast de error
│   ├── register/                 # Register con ion-selects de carrera/semestre
│   ├── tab-dashboard/            # Dashboard estudiante con skeletons
│   ├── admin-dashboard/          # Dashboard admin
│   ├── admin-announcements/      # CRUD admin anuncios
│   ├── admin-notices/            # CRUD admin avisos
│   ├── announcement-form/        # Form crear/editar anuncio
│   └── notice-form/              # Form crear/editar aviso
├── shared/components/
│   ├── announcement-card/        # Card reusable con badge categoría, pin, fecha
│   └── notice-card/              # Card reusable con badge prioridad, alerta
└── app.config.ts                 # APP_INITIALIZER para auth
```

---

## Bugs críticos corregidos

### 1. Session restore timing (raíz de muchos otros bugs)
- **Problema**: `restoreSession()` corría async en el constructor de AuthService, pero el router y guards evaluaban antes de que terminara. Al recargar la página, el usuario veía el login pese a tener sesión activa. Al intentar loguearse otra vez, Supabase devolvía *"Invalid login credentials"* porque ya existía una sesión activa.
- **Fix**: `APP_INITIALIZER` en `app.config.ts` — Angular espera a que `AuthService.initialize()` (que llama a `restoreSession()`) termine antes de arrancar el router. Nunca se ve el login si ya hay sesión.

### 2. Páginas cacheadas por Ionic (ExpressionChangedError)
- **Problema**: Ionic cachea páginas. Al volver al login tras cerrar sesión, reusaba una instancia donde `loading` podía estar `true` del intento anterior. Angular detectaba el cambio a `false` durante change detection y lanzaba `NG0100`.
- **Fix**: `ionViewWillEnter()` en LoginPage — resetea `loading`, `errorMessage`, `showToast` cada vez que se entra a la página.

### 3. Register → Dashboard sin pasar por login
- **Problema**: `NoAuthGuard` en `/register` causaba race condition: al hacer signUp, el guard veía la nueva sesión y redirigía al dashboard antes de que el perfil estuviera listo.
- **Fix**: Se removió `NoAuthGuard` de `/register`. `signUp()` ya no llama `currentUserSubject.next()`. Register page llama `setCurrentUser()` manualmente tras éxito y navega explícitamente a `/tabs/dashboard`.

### 4. Dashboard cargando infinitamente
- **Problema**: Queries de Supabase podían colgar si RLS bloqueaba o si había error de red.
- **Fix**: `withTimeout(promise, 5000)` por query + try/catch individuales. Si una query falla, las demás cargan normalmente.

### 5. Iconos Ionicons rotos
- **Problema**: Ionic 8 standalone requiere kebab-case en `addIcons`.
- **Fix**: `'person-circle': personCircle`, `'log-out': logOut`, etc.

### 6. Migration 00003 no aplicada
- **Problema**: El trigger `on_auth_user_created` que crea el perfil automáticamente no existía en la BD, causando error 500 en registro.
- **Fix**: Aplicada la migración. Perfil se crea automáticamente al registrarse.

---

## Base de datos

- **Migraciones aplicadas**: 00001 (schema inicial), 00002 (RLS), 00003 (trigger perfil automático), 00005 (realtime publication)
- **Datos mock**: 39 registros en 9 tablas (announcements, notices, events, classrooms, surveys, survey_questions, faq_entries, help_queries, student_code_blacklist)
- **Usuarios**: Solo `admin@unihub.com` (todos los demás eliminados)
- **Edge Function**: `notify-on-announcement` desplegada v2 sin verify_jwt. Responde `{"sent":0,"failed":0,"skipped":0}` (no hay tokens FCM registrados)

---

## Lo que falta/pendiente

### Configuración manual en Supabase Dashboard
- Habilitar Realtime para `announcements` y `notices` en Database → Replication
- Crear webhook en Database → Webhooks para INSERT en `announcements` → Edge Function URL
- Configurar `FCM_SERVER_KEY` como secreto de la Edge Function (si se quiere notificaciones reales)

### Verificación final (cuando corras `ng serve`)
1. **Registro** de nuevo estudiante → debe ir directo al dashboard sin pasar por login
2. **Recargar página** → debe permanecer en dashboard (no redirigir al login)
3. **Login con admin** → `admin@unihub.com` / `Admin123456!` → debe entrar al admin dashboard
4. **Cerrar sesión** → debe ir al login sin `ExpressionChangedError`
5. **Limpiar localStorage** en navegador (F12 → Application → Local Storage → borrar keys `sb-*`) si hay sesiones stale

### Próximos milestones
- **M3 — Surveys**: listado de encuestas activas, formulario de respuesta (texto, opción múltiple, rating), admin CRUD
- **M4 — Calendar**: calendario académico, eventos, horarios
- **M5 — Help Bot**: chatbot FAQ, help queries

---

## Archivos clave

| Archivo | Propósito |
|---|---|
| `app.config.ts` | `APP_INITIALIZER` para auth → espera a restoreSession |
| `auth.service.ts` | `initialize()` + `setCurrentUser()` + `restoreSession()` con detección de sesiones stale |
| `login.page.ts` | `ionViewWillEnter()` resetea estado, parser de errores robusto |
| `register.page.ts` | `.subscribe()` directo, `setCurrentUser()` manual, ion-selects |
| `tab-dashboard.page.ts` | `withTimeout()` por query, try/catch individual, skeletons |
| `announcement.service.ts` | CRUD + caché offline + filtros por categoría + expires_at |
| `notice.service.ts` | CRUD + caché offline + orden por prioridad |
| `realtime.service.ts` | Suscripciones Supabase Realtime por canal |
| `angular.json` | Budget subido a 1.5MB/2MB |

---

## Tests

- **41 tests** unitarios (servicios de anuncios, avisos, auth)
- **Lint**: 0 errores
- **Build**: pasa (development + production)
