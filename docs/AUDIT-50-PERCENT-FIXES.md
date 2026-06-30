# UniHub — Soluciones aplicadas a la auditoría del 50%

**Fecha:** 2026-06-30  
**Documento origen:** `docs/AUDIT-50-PERCENT.md`  
**Objetivo:** mapear 1 a 1 cada hallazgo de la auditoría con la solución concreta implementada, los archivos tocados y la justificación técnica. Al final se incluyen los resultados de verificación.

---

## Resumen ejecutivo de cambios

| Fase | Hallazgos atacados | Estado |
|------|-------------------|--------|
| **Fase 0 — Bloqueantes de seguridad** | F-01, F-02, F-03, F-04, F-11 | ✅ Completada |
| **Fase 1 — Recuperar señal de calidad** | F-05, F-06, F-07, F-09 | ✅ Completada |
| **Fase 2 — Endurecimiento y pulido** | F-08, F-12, F-15, F-16 | ✅ Completada |

**Resultado final de verificación:**
- `npm run lint` → ✅ 0 errores
- `npm test -- --watch=false` → ✅ 13/13 archivos, 119/119 tests pasan
- `npm run build` → ✅ exit 0 (solo warnings de dependencias tipo CommonJS)

---

## Fase 0 — Bloqueantes de seguridad

### F-01 — Escalación de privilegios: auto-registro como administrador

**Solución aplicada:**
1. **Trigger de BD endurecido** (`supabase/migrations/00011_fix_profile_role_and_security_definers.sql`):
   - Se recrea `public.handle_new_user()` para que **siempre** inserte `role = 'student'` e **ignore** cualquier `role` enviado en `user_metadata`.
   - Se recrean `get_user_role()` e `is_admin()` con `SECURITY DEFINER SET search_path = public` (ver F-11).
   - Se añade RPC `promote_to_admin(target_user_id UUID)` que solo permite a un admin existente promover a otro usuario.

2. **Nueva Edge Function** `create-admin` (`supabase/functions/create-admin/index.ts`):
   - Valida el JWT del admin que invoca.
   - Verifica con `service_role` que el llamante tenga `role = 'admin'`.
   - Crea el nuevo usuario con `serviceClient.auth.admin.createUser()` (Admin API), evitando el flujo público de signup y su `user_metadata`.
   - Actualiza el perfil creado por el trigger a `role = 'admin'`.
   - Retorna 201/403/401/500 con CORS.

3. **Frontend:**
   - `src/app/core/services/auth.service.ts`: `signUp()` ya no acepta parámetro `role`; siempre envía metadata sin `role`. Se añaden `promoteToAdmin()` y `getAccessToken()`.
   - `src/app/core/services/supabase.service.ts`: se añade `promoteToAdmin(userId)` que invoca la RPC.
   - `src/app/pages/admin-register/admin-register.page.ts`: ahora llama a la Edge Function `create-admin` con el token del admin logueado, en lugar de `auth.signUp(..., 'admin')`.
   - `src/app/pages/register/register.page.ts`: adaptado a la nueva firma de `signUp()`.

**Justificación:**
- El problema raíz era que el rol provenía de datos controlados por el cliente (`user_metadata`) y el trigger lo confiaba. Al forzar `role='student'` en el trigger, un atacante que envíe `role:'admin'` solo obtiene un perfil de estudiante.
- La creación de admins pasa por una Edge Function con `service_role` y validación de identidad, imposible de falsificar desde el cliente.
- La sesión del admin creador **no se reemplaza** porque usamos `auth.admin.createUser` en lugar de `signUp`.

---

### F-02 — Tabla `recurring_exceptions` sin RLS

**Solución aplicada:**
- Nueva migración `supabase/migrations/00012_add_missing_rls.sql`:
  - `ALTER TABLE recurring_exceptions ENABLE ROW LEVEL SECURITY;`
  - Policy SELECT para usuarios autenticados (necesitan leer excepciones para renderizar el calendario).
  - Policy `FOR ALL` para admins (`USING (is_admin()) WITH CHECK (is_admin())`).

**Justificación:**
- Sin RLS, cualquier cliente podía insertar/modificar excepciones y cancelar/modificar instancias de exámenes o clases para todos.
- Ahora solo los admins pueden gestionar excepciones; los estudiantes solo las leen.

---

### F-03 — Tabla `survey_reminders` sin RLS

**Solución aplicada:**
- En `supabase/migrations/00012_add_missing_rls.sql`:
  - `ALTER TABLE survey_reminders ENABLE ROW LEVEL SECURITY;`
  - Policy SELECT para admins (monitoreo/debug).
  - Policy `FOR ALL` para `auth.role() = 'service_role'` (los cron/edge functions que escriben recordatorios).

**Justificación:**
- Evita que usuarios anon/authenticated lean PII (`user_id`) o inyecten/borren recordatorios que afectan el cron `remind-pending-surveys`.

---

### F-04 — Admin CRUDs no ven filas inactivas/canceladas/expiradas

**Solución aplicada:**
- Nueva migración `supabase/migrations/00013_add_admin_select_policies.sql`:
  - Añade policies `SELECT` para admins en `announcements`, `notices`, `surveys`, `classrooms`, `events`, `faq_entries`.
  - Las policies se combinan con OR con las policies existentes para estudiantes.

**Justificación:**
- Las policies SELECT originales filtraban por `is_active=true`, `is_cancelled=false`, fechas válidas, etc. Esto es correcto para estudiantes, pero los admins necesitan ver TODO para poder gestionar borradores, re-activar items, des-cancelar eventos, etc.
- Los métodos de servicio (`getAllEvents`, `getAllSurveys`, `getClassrooms`, `getAnnouncements`, etc.) no tenían filtros activos, así que ahora que RLS permite leer todo para admins, esos métodos devuelven el universo completo a los admins y el subconjunto activo a los estudiantes.

---

### F-11 — Funciones `SECURITY DEFINER` sin `search_path`

**Solución aplicada:**
1. En `supabase/migrations/00011_fix_profile_role_and_security_definers.sql`:
   - `get_user_role()` e `is_admin()` recreadas con `SECURITY DEFINER SET search_path = public`.
2. En `supabase/migrations/00014_fix_faq_search_search_path.sql`:
   - `search_faq_fts(...)` y `search_faq_trigram(...)` recreadas con `SECURITY DEFINER SET search_path = public`.
   - Se cualifican las tablas como `public.faq_entries`.

**Justificación:**
- `handle_new_user` ya usaba el patrón correcto (`SET search_path = ''`). Se alinean el resto de funciones `SECURITY DEFINER` para mitigar riesgo de search_path injection.

---

## Fase 1 — Recuperar señal de calidad

### F-05 — CI en rojo + branch protection bypassed

**Solución aplicada:**
- Se arreglaron las causas raíz del CI rojo: tests time-bomb (F-06) y suites que no cargaban (F-07).
- Se corrigió `.github/workflows/supabase-ci.yml` (F-09) para que apunte a `supabase/functions/` en vez de `supabase/edge-functions/`.

**Justificación:**
- Con tests verdes (119/119) y workflow corregido, `Ionic CI` y `Supabase CI` pueden volver a verde.
- Queda pendiente (por fuera del código) cambiar la branch protection a `enforcement_level: everyone` y añadir `required_pull_request_reviews`; esto se documenta como recomendación porque requiere permisos de owner en GitHub.

---

### F-06 — Tests "time-bomb" con fechas hardcoded

**Solución aplicada:**
- `src/app/core/services/announcement.service.spec.ts`:
  - Se reemplazaron las fechas fijas (`2026-12-31`, `2026-06-15`, `2020-01-01`) por helpers `futureDate(days)` y `pastDate(days)` relativos a `Date.now()`.
  - Los tests ahora son deterministas respecto al día de ejecución.

**Justificación:**
- El mock `expires_at: '2026-06-15T00:00:00Z'` se volvió pasado el 2026-06-30, haciendo que el servicio filtrara el item y fallaran 3 aserciones. Con fechas relativas nunca vuelve a ocurrir.

---

### F-07 — 2 suites no cargaban por import ESM de Ionic

**Solución aplicada:**
- `src/app/core/services/toast.service.spec.ts` y `src/app/core/services/error-handler.service.spec.ts`:
  - Se añadió `vi.mock('@ionic/angular/standalone', ...)` **antes** de importar los servicios.
  - El mock stub `ToastController` evita que Vitest cargue el módulo real de Ionic, que contiene un bare directory import no soportado por el resolver ESM de Node.
- Se descartaron intentos previos (`resolve.alias`, `ssr.noExternal`, `deps.inline`, setup file global) porque no resolvieron el problema en esta versión de Vitest/Ionic.

**Justificación:**
- `vi.mock` al inicio del archivo es el mecanismo oficial de Vitest para reemplazar un módulo antes de que se resuelvan sus dependencias. Es la solución más estable y localizada.

---

### F-09 — `supabase-ci.yml` con path incorrecto

**Solución aplicada:**
- `.github/workflows/supabase-ci.yml`:
  - `paths` cambiados de `supabase/edge-functions/**` a `supabase/functions/**`.
  - `hashFiles('supabase/edge-functions/**/*.ts')` → `hashFiles('supabase/functions/**/*.ts')`.
  - `deno lint supabase/edge-functions/` → `deno lint supabase/functions/`.
  - `deno test supabase/edge-functions/` → `deno test supabase/functions/`.
  - Se añadió paso `deno fmt --check supabase/functions/`.

**Justificación:**
- El repositorio usa `supabase/functions/`, no `supabase/edge-functions/`. El workflow anterior nunca se disparaba correctamente y fallaba con "workflow file issue".

---

## Fase 2 — Endurecimiento y pulido

### F-08 — `validate-student-code` no se usaba y regex no coincidía

**Solución aplicada:**
1. `supabase/functions/validate-student-code/index.ts`:
   - Regex actualizado a `/^[Uu]?\d{8,11}$/` para soportar tanto `U########` (documentado en FAQ/seed) como códigos numéricos de 11 dígitos (usados en emails institucionales).
   - Se añadieron CORS headers y manejo de `OPTIONS`/`POST`.
   - Se corrigieron tildes y ortografía en mensajes.
2. `src/app/pages/register/register.page.ts`:
   - Se valida el prefijo del email con el mismo regex antes de llamar a la Edge Function.
   - Se invoca `validate-student-code` vía `fetch` antes de ejecutar `signUp`.
   - Si el código es inválido, ya registrado o blacklisteado, se muestra el error y se aborta el registro.
   - `onRegister()` se convirtió a `async/await` para la secuencia validación → registro.

**Justificación:**
- Antes la validación de código era solo client-side y muy laxa (`length >= 3`). Ahora hay una doble verificación (formato + existencia/blacklist) en server-side antes de crear la cuenta.

---

### F-12 — `console.log` de debug en producción

**Solución aplicada:**
- `src/app/core/services/auth.service.ts`: se eliminaron todos los `console.log`/`console.warn` de debug.
- `src/app/core/services/help-bot.service.ts`: se eliminó `console.log('[HelpBotService] search response', data)`.
- `src/app/pages/register/register.page.ts`: se eliminó `console.log("Register error:", err)`.
- `src/app/pages/tab-dashboard/tab-dashboard.page.ts`: se eliminó `console.log("[Dashboard] Load complete")`.

**Justificación:**
- Reduce ruido en consola del navegador y evita filtrar información sensible (emails, IDs) en producción. Se mantuvieron los `console.warn`/`console.error` legítimos para casos de error.

---

### F-15 — `manifest.webmanifest` incompleto

**Solución aplicada:**
- `public/manifest.webmanifest`: se añadieron `description`, `lang`, `orientation`, `theme_color`, `background_color`, `categories`.

**Justificación:**
- Mejora la calificación PWA en Lighthouse y asegura que la barra de herramientas/ splash screen usen los colores de marca.

---

### F-16 — Avatar fallback exponía nombres a DiceBear

**Solución aplicada:**
- `src/app/pages/profile/profile.page.ts`:
  - Se eliminó la URL a `https://api.dicebear.com/7.x/initials/svg?seed=...`.
  - Se añadió `buildInitialsAvatar()` que genera un SVG inline con las iniciales del usuario y lo devuelve como `data:image/svg+xml;utf8,...`.

**Justificación:**
- Evita enviar nombres de usuarios a un servicio de terceros y elimina la dependencia de red para el avatar por defecto.

---

## Archivos nuevos

| Archivo | Propósito |
|---------|-----------|
| `supabase/migrations/00011_fix_profile_role_and_security_definers.sql` | Trigger seguro + helpers + RPC `promote_to_admin` |
| `supabase/migrations/00012_add_missing_rls.sql` | RLS para `recurring_exceptions` y `survey_reminders` |
| `supabase/migrations/00013_add_admin_select_policies.sql` | Policies SELECT de admin para CRUDs |
| `supabase/migrations/00014_fix_faq_search_search_path.sql` | `search_path` en funciones FAQ |
| `supabase/functions/create-admin/index.ts` | Edge Function para crear admins de forma segura |

---

## Archivos modificados

- `src/app/core/services/auth.service.ts`
- `src/app/core/services/supabase.service.ts`
- `src/app/pages/admin-register/admin-register.page.ts`
- `src/app/pages/register/register.page.ts`
- `src/app/pages/profile/profile.page.ts`
- `src/app/pages/tab-dashboard/tab-dashboard.page.ts`
- `src/app/core/services/help-bot.service.ts`
- `src/app/core/services/announcement.service.spec.ts`
- `src/app/core/services/toast.service.spec.ts`
- `src/app/core/services/error-handler.service.spec.ts`
- `supabase/functions/validate-student-code/index.ts`
- `.github/workflows/supabase-ci.yml`
- `public/manifest.webmanifest`
- `vitest.config.ts`

---

## Instrucciones de despliegue

1. **Aplicar migraciones en Supabase** (en orden):
   ```bash
   supabase migration up
   # o una a una:
   # supabase db reset   # solo en dev
   ```
   Migraciones a aplicar: `00011`, `00012`, `00013`, `00014`.

2. **Desplegar Edge Functions**:
   ```bash
   supabase functions deploy validate-student-code
   supabase functions deploy create-admin
   # redesplegar las demás si se desea
   ```

3. **Variables de entorno necesarias** en Supabase para `create-admin`:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

4. **Verificar `auth.admin.createUser`**: en proyectos Supabase gratuitos, la Admin API está habilitada por defecto para el `service_role`. Si hay restricciones, habilitarla.

5. **Probar flujo de registro de admin**:
   - Loguear como admin existente.
   - Ir a `/admin/register`, crear nuevo admin.
   - Verificar en BD que el nuevo perfil tiene `role='admin'`.
   - Verificar que no se puede crear admin sin sesión de admin (curl directo debe dar 401/403).

6. **Probar flujo de registro de estudiante**:
   - Usar un email `@mail.udes.edu.co` con código válido.
   - Verificar que el perfil se crea con `role='student'` aunque se envíe `role:'admin'` en metadata.

7. **Probar admin CRUDs**:
   - Cancelar un evento → recargar `/admin/events` → debe seguir visible con badge "Cancelado".
   - Desactivar un aula → recargar `/admin/classrooms` → debe seguir visible y poder re-activarse.
   - Desactivar una encuesta/FAQ/anuncio → recargar → seguir visible para admin.

---

## Hallazgos NO atacados en esta ronda (recomendados para M8/M10/M11)

| Hallazgo | Motivo de no atacar ahora | Hito futuro |
|----------|---------------------------|-------------|
| F-10 — FCM legacy + firma webhook | Requiere configuración de Firebase Admin SDK / OAuth2 y secret de webhook fuera del repo. Es un cambio de infraestructura, no solo código. | M8 / M10 |
| F-13 — `supabaseAnonKey` hardcoded | La anon key es pública por diseño. Separar dev/prod requiere crear segundo proyecto Supabase y ajustar CI. | M9#72 / M10 |
| F-14 — Budget bundle 1.53 MB | Warning, no error. Optimización de bundle pertenece a M8 performance. | M8 |
| F-17 — `createProfile` fallback muerto | Código muerto de bajo impacto; el trigger siempre crea el perfil en el flujo normal. | M8 cleanup |
| F-18 — Hueco migración `00004` | Bajo impacto administrativo. | M9 (migraciones) |
| F-19 — Webhook DB no versionado | Requiere configuración en dashboard o uso de `pg_net`/`cron` en SQL. | M9#73 |

---

## Conclusión

Se cerraron todos los hallazgos críticos y altos de la auditoría, más varios medios y bajos. La suite de tests pasó de 100/103 con 3 fallos y 2 suites rotas a **119/119 tests pasando en 13 archivos**. El build de producción es exitoso y el lint no reporta errores.

**El proyecto ya cumple la condición para recibir luz verde y continuar con M7–M11.** Queda pendiente el despliegue de las migraciones y Edge Functions en Supabase, y ajustar la branch protection en GitHub.
