# UniHub — Auditoría técnica al 50% del proyecto

**Fecha:** 2026-06-30
**Rama auditada:** `audit-del-50%` (HEAD `8eae0a7`, misma que `master`)
**Alcance:** Código fuente (`src/`), backend Supabase (`supabase/`), CI/CD (`.github/`), docs, issues/milestones de GitHub, build/lint/tests locales y remotos.
**Veredicto resumido:** ⚠️ **Luz verde condicional para continuar el desarrollo.** La arquitectura y las funcionalidades de M0–M6 son sólidas, pero **se detectaron 2 vulnerabilidades críticas de seguridad y 1 fallo sistémico de RLS** que deben corregirse **antes** de seguir añadiendo features (M7–M11). Además, la suite de tests está roja y el CI lleva 5+ semanas en rojo, lo que compromete la calidad continuada.

---

## 1. Metodología

1. Lectura de `README.md`, `HANDOFF.md`, `package.json`, configuración de build (`angular.json`, `tsconfig*.json`, `eslint.config.js`, `vitest.config.ts`, `ngsw-config.json`, `capacitor.config.ts`).
2. Revisión de issues (90) y milestones (11) del repo `hashernom/unihub-app` vía GitHub API.
3. Inspección del historial Git y ramas.
4. Análisis de arquitectura: `app.routes.ts`, `app.config.ts`, servicios core, páginas, componentes shared.
5. Auditoría de backend: 10 migraciones SQL, 10 Edge Functions, `seed.sql`.
6. **Verificación ejecutable** (local, Windows/PowerShell):
   - `npm run lint` → ✅ 0 errores
   - `npm test -- --watch=false` → ❌ 3 suites falladas, 3 tests fallando (100/103 pasan)
   - `npm run build` → ✅ exit 0, con ⚠️ warning de budget
7. Revisión de CI remoto: 15 últimos runs de `Ionic CI` y `Supabase CI`.
8. Verificación de branch protection en `master`.

---

## 2. Estado del proyecto vs. milestones

| Milestone | Issues | Estado real | Observaciones |
|-----------|-------:|-------------|---------------|
| M0 Foundation | 6 | ✅ Cerrado | Repo, CI, Supabase, docs, offline |
| M1 Auth | 8 | ✅ Cerrado | Login, register, profile, guards — **ver F-01 (escalación de privilegios)** |
| M2 Dashboard | 8 | ✅ Cerrado | Announcements, notices, realtime, admin CRUDs |
| M3 Surveys | 8 | ✅ Cerrado | CRUD, respuestas, resultados, exports, edge functions |
| M4 Calendar | 9 | ✅ Cerrado | FullCalendar, RRULE, aulas, conflictos, notificaciones |
| M5 Help Bot | 6 | ✅ Cerrado | Chat, FAQ admin, escalación, multilingüe |
| M6 UI/UX Polish | 7 | ✅ Cerrado | Dark mode, loading/empty/error states, accesibilidad parcial |
| M7 Testing & QA | 8 (0/8) | ⬜ Pendiente | **Parcialmente empezado: 103 tests existen pero 3 fallan** |
| M8 Security | 7 (0/7) | ⬜ Pendiente | **Crítico: varios hallazgos de esta auditoría pertenecen aquí** |
| M9 DevOps | 4 (1/7) | 🟡 Parcial | CI existe pero roto (ver F-08, F-09) |
| M10 Deploy | 7 (1/7) | 🟡 Parcial | PWA (manifest+SW) listo; falta prod env, runbook |
| M11 Maintenance | 4 (0/4) | ⬜ Pendiente | Sentry, analytics, monitoring, backups |

**Conclusión de avance:** ~50% correcto. Los milestones funcionales (M0–M6) están entregados; los transversales de calidad (M7–M11) están pendientes, lo cual es coherente con el punto del proyecto. **El problema no es el alcance pendiente, sino defectos heredados en lo ya entregado.**

---

## 3. Resultados de verificación ejecutable

| Comando | Resultado | Detalle |
|---------|-----------|---------|
| `npm run lint` | ✅ PASS | "All files pass linting." |
| `npm test` | ❌ FAIL | 3 archivos fallados, 3 tests fallando (100/103 pasan) |
| `npm run build` | ✅ PASS (con warning) | Initial bundle 1.53 MB > budget warning 1.5 MB |
| CI `Ionic CI` (remoto) | ❌ FAIL | 15/15 últimos runs en rojo (desde ≥ 2026-05-22) |
| CI `Supabase CI` (remoto) | ❌ FAIL | "workflow file issue" + path incorrecto |
| Branch protection `master` | ⚠️ Inefectiva | Requiere status check pero `enforcement_level: non_admins` → el owner bypassa |

> **Discrepancia con `HANDOFF.md`:** el documento afirma "npm test → 66 tests, 6 files" y "CI Pipeline: 0 errores". Esto es **inexacto**: hoy hay 103 tests (M6 añadió specs) y 3 fallan; el CI remoto está en rojo continuo. El HANDOFF está desactualizado.

---

## 4. Hallazgos por severidad

### 🔴 CRÍTICOS

#### F-01 — Escalación de privilegios: auto-registro como administrador
- **Severidad:** CRÍTICA
- **Ubicación:**
  - `src/app/core/services/supabase.service.ts:36-42` (`signUp` envía `metadata` como `user_metadata`)
  - `src/app/core/services/auth.service.ts:78-103` (`signUp` pasa `role` en metadata)
  - `supabase/migrations/00003_create_profile_on_signup.sql:4-22` (trigger `handle_new_user` lee `raw_user_meta_data ->> 'role'` y lo inserta tal cual)
  - `src/app/pages/admin-register/admin-register.page.ts:42` (invoca `signUp(...,'admin')`)
- **Descripción:** El rol del usuario se establece vía `user_metadata` del lado del cliente y el trigger de BD lo confía ciegamente. El `AdminGuard` (`auth.guard.ts:33-44`) solo protege la ruta `/admin/register` en el frontend, lo cual es trivialmente evitable.
- **Impacto:** Cualquier persona con la `anon key` (pública, embebida en el bundle) puede llamar a `supabase.auth.signUp({ email, password, options: { data: { role: 'admin' } } })` y obtener un **perfil de administrador** con acceso total a todos los CRUDs (anuncios, eventos, encuestas, aulas, FAQs, usuarios).
- **Reproducción:**
  ```bash
  curl -X POST "$SUPABASE_URL/auth/v1/signup" \
    -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
    -d '{"email":"atacante@x.com","password":"Atacante123!","data":{"role":"admin","full_name":"X","student_code":"x"}}'
  ```
- **Recomendación:**
  1. **Server-side:** modificar `handle_new_user` para que **ignore** `user_metadata.role` y siempre inserte `role = 'student'`. El rol admin solo debe poder asignarse mediante una Edge Function con `service_role` (o Supabase Auth Admin API / invites) tras verificar autorización.
  2. Crear Edge Function `create-admin` (verify_jwt=true + validación de que el solicitante es admin) que use `service_role` para hacer `UPDATE profiles SET role='admin' WHERE id=$1`.
  3. **Frontend:** `admin-register` debe invocar esa Edge Function, no `auth.signUp` con `role:'admin'`.
- **Esfuerzo estimado:** Medio (1–2 días).

#### F-02 — Tabla `recurring_exceptions` sin RLS: cualquier usuario puede cancelar/modificar instancias de eventos
- **Severidad:** CRÍTICA
- **Ubicación:** `supabase/migrations/00007_add_recurring_exceptions.sql:4-18` (crea la tabla sin `ENABLE ROW LEVEL SECURITY` ni policies).
- **Descripción:** En Supabase, las tablas nuevas en el schema `public` reciben GRANTs por defecto a `anon`/`authenticated`. Si RLS no está habilitada, la tabla es **legible, insertable, actualizable y borrable** por cualquier cliente con la `anon key`. El servicio lo escribe con `upsert` desde el cliente: `src/app/core/services/event.service.ts:178-196` (`cancelRecurringInstance`, `updateRecurringInstance`).
- **Impacto:** Un estudiante malintencionado puede `INSERT` una fila `{ event_id, exception_date, is_cancelled: true }` y **cancelar una instancia de examen o clase para todos los usuarios**; también puede modificar título/horario vía `updateRecurringInstance`. Compromete la integridad del calendario académico y la disponibilidad de exámenes.
- **Recomendación:** Nueva migración:
  ```sql
  ALTER TABLE recurring_exceptions ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users can read recurring exceptions" ON recurring_exceptions
      FOR SELECT USING (auth.uid() IS NOT NULL);
  CREATE POLICY "Admins can manage recurring exceptions" ON recurring_exceptions
      FOR ALL USING (is_admin()) WITH CHECK (is_admin());
  ```
- **Esfuerzo:** Bajo (media hora + verificación).

---

### 🟠 ALTOS

#### F-03 — Tabla `survey_reminders` sin RLS
- **Severidad:** ALTA
- **Ubicación:** `supabase/migrations/00006_add_survey_reminders.sql:4-12` (sin RLS ni policies).
- **Impacto:** Cualquier usuario puede leer `survey_reminders` (expone `user_id` → PII), insertar filas basura (bloquea reminders legítimos por la UNIQUE `survey_id,user_id`) o borrarlas. La Edge Function cron `remind-pending-surveys` quedaría saboteada.
- **Recomendación:**
  ```sql
  ALTER TABLE survey_reminders ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Admins can read survey reminders" ON survey_reminders
      FOR SELECT USING (is_admin());
  CREATE POLICY "Service role can manage reminders" ON survey_reminders
      FOR ALL USING (auth.role() = 'service_role');
  ```
- **Esfuerzo:** Bajo.

#### F-04 — Fallo sistémico de RLS: los admin CRUDs no pueden ver filas inactivas/canceladas/expiradas
- **Severidad:** ALTA (bug funcional + UX)
- **Ubicación:**
  - Causa raíz: `supabase/migrations/00002_rls_policies.sql` — las policies SELECT de `announcements`, `notices`, `surveys`, `classrooms`, `events`, `faq_entries` **solo** permiten ver filas "activas" y **no existe** una policy `SELECT` para admins que vea todo.
  - Evidencia en código:
    - `event.service.ts:223-231` `getAllEvents()` (sin filtro) → RLS filtra `is_cancelled=false`.
    - `event.service.ts:280-292` `getClassrooms()` (sin `activeOnly`) → RLS filtra `is_active=true`.
    - `survey.service.ts:69-76` `getAllSurveys()` → RLS filtra `is_active=true` + ventana de fechas.
    - `survey.service.ts:120-140` `getSurveyWithQuestions()` (`.single()`) → falla para encuestas inactivas.
    - `announcement.service.ts:28-43` `getAnnouncements()` → RLS filtra `expires_at`.
  - Páginas afectadas (usan los métodos anteriores al recargar): `admin-events.page.ts:73`, `admin-classrooms.page.ts:74`, `admin-surveys.page.ts:62`, `admin-announcements`, `admin-notices`, `admin-faq`.
- **Impacto:**
  - **Toggles irreversibles:** al desactivar un aula/encuesta/FAQ o cancelar un evento, el item **desaparece del listado admin al recargar** y no se puede re-activar/gestionar desde la UI (las páginas tienen botones "Cancelar"/"Activar" y badges "Cancelado"/"Inactiva" que nunca se muestran porque RLS oculta la fila).
  - El admin **no puede gestionar borradores, encuestas programadas/finalizadas, eventos cancelados, anuncios expirados ni FAQs inactivas**.
  - Esto contradice directamente la funcionalidad descrita en `HANDOFF.md` ("toggle activo/inactivo", "cancelar/eliminar", "ActionSheet Solo esta instancia / Toda la serie").
- **Recomendación:** Nueva migración añadiendo policies SELECT de admin para cada tabla afectada:
  ```sql
  CREATE POLICY "Admins can read all announcements" ON announcements FOR SELECT USING (is_admin());
  CREATE POLICY "Admins can read all notices"       ON notices       FOR SELECT USING (is_admin());
  CREATE POLICY "Admins can read all surveys"       ON surveys       FOR SELECT USING (is_admin());
  CREATE POLICY "Admins can read all classrooms"    ON classrooms    FOR SELECT USING (is_admin());
  CREATE POLICY "Admins can read all events"        ON events        FOR SELECT USING (is_admin());
  CREATE POLICY "Admins can read all faq_entries"   ON faq_entries   FOR SELECT USING (is_admin());
  ```
  (Las policies se combinan con OR, así que los estudiantes siguen viendo solo las activas y los admins ven todo).
- **Esfuerzo:** Bajo–Medio (media jornada + retest de cada CRUD admin).

#### F-05 — CI en rojo continuo + merges a `master` sin checks efectivos
- **Severidad:** ALTA (proceso/DevOps)
- **Ubicación:**
  - `.github/workflows/ionic-ci.yml` (workflow correcto, falla por los tests F-06/F-07).
  - `.github/workflows/supabase-ci.yml` (roto por path incorrecto + "workflow file issue").
  - Branch protection: `enforcement_level: non_admins` (el owner bypassa los status checks).
- **Evidencia:** 15 últimos runs de CI con `conclusion: failure` (desde ≥ 2026-05-22). Último commit en `master` (`8eae0a7`, 2026-06-23) mergeado con CI rojo.
- **Impacto:** Se acumula deuda de calidad sin señal de alarma. Cualquier regresión nueva pasa desapercibida. El objetivo M0#3 "branch protection" está formalmente cumplido pero **operativamente inefectivo**.
- **Recomendación:**
  1. Arreglar los tests (F-06, F-07) para que CI vuelva a verde.
  2. Arreglar `supabase-ci.yml` (F-09).
  3. Cambiar branch protection a **strict** (requerir checks para admins también) o hacer merges vía PR desde una cuenta no-admin / bot.
  4. Añadir `required_pull_request_reviews` (mín. 1 revisor) o revisión self-hosted obligatoria.
- **Esfuerzo:** Bajo (config) + dependencia de F-06/F-07/F-09.

---

### 🟡 MEDIOS

#### F-06 — Tests "time-bomb": fechas hardcodedas ya vencidas
- **Severidad:** MEDIA
- **Ubicación:** `src/app/core/services/announcement.service.spec.ts:24,31` — mock con `expires_at: '2026-06-15T00:00:00Z'`. Hoy (2026-06-30) esa fecha es pasada.
- **Síntomas:** 3 tests fallando en `announcement.service.spec.ts`:
  1. `should return data from supabase` (espera ≥2, obtiene 1)
  2. `should filter by search text client-side` (espera 1, obtiene 0)
  3. `should filter expired announcements client-side` (espera 2, obtiene 1)
- **Causa raíz:** El servicio filtra `expires_at > now` (`announcement.service.ts:50-53`). El mock data '2' venció el 2026-06-15, así que se elimina antes de las aserciones. Los tests se escribieron asumiendo "hoy < 2026-06-15".
- **Recomendación:** Usar fechas dinámicas relativas a `Date.now()`:
  ```ts
  const future = () => new Date(Date.now() + 86400_000).toISOString();
  const past   = () => new Date(Date.now() - 86400_000).toISOString();
  ```
  Reemplazar todos los `expires_at` hardcoded del spec por `future()`/`past()`. Revisar el resto de specs en busca del mismo anti-patrón.
- **Esfuerzo:** Bajo (1 hora).

#### F-07 — 2 suites de tests no cargan en Vitest (resolución ESM de `@ionic/angular/standalone`)
- **Severidad:** MEDIA
- **Ubicación:**
  - `src/app/core/services/toast.service.spec.ts` (falla al cargar)
  - `src/app/core/services/error-handler.service.spec.ts` (falla al cargar, depende de `toast.service.ts`)
  - Error: `Directory import '.../node_modules/@ionic/core/components' is not supported resolving ES modules imported from @ionic/angular/fesm2022/ionic-angular-common.mjs`
  - Config: `vitest.config.ts` (sin alias de resolución).
- **Causa raíz:** `toast.service.ts:2` importa `ToastController` de `@ionic/angular/standalone`, que internamente hace un bare directory import de `@ionic/core/components`. El resolver ESM de Vitest/jdom no lo soporta. Los mocks del spec no evitan la carga del módulo (el `import` es top-level).
- **Recomendación:** Añadir alias en `vitest.config.ts`:
  ```ts
  import { defineConfig } from 'vitest/config';
  export default defineConfig({
    test: { globals: true, environment: 'jsdom', include: ['src/**/*.spec.ts'] },
    resolve: { alias: { '@ionic/core/components': '@ionic/core/components/index.js' } },
  });
  ```
  Alternativa: mockear `@ionic/angular/standalone` con `vi.mock` a nivel de spec. Verificar que el alias no afecte al build de Angular (solo aplica a Vitest).
- **Esfuerzo:** Bajo (probar alias; si no funciona, mock manual).

#### F-08 — `validate-student-code` no se usa y su regex no coincide con el formato real
- **Severidad:** MEDIA
- **Ubicación:**
  - `supabase/functions/validate-student-code/index.ts:19` — `const CODE_REGEX = /^U\d{8}$/;`
  - Búsqueda en `src/`: **0 referencias** a `validate-student-code` o `validateStudentCode`.
  - `src/app/pages/register/register.page.ts:62` extrae el código como `email.split("@")[0]` (e.g. `01240371032`), que **no** cumple `^U\d{8}$`.
  - `HANDOFF.md` y `seed.sql` usan códigos como `01240371032` (11 dígitos).
- **Impacto:** No existe validación server-side del código estudiantil al registrarse; la validación de formato es solo client-side (`isValidInstitutionalEmail` en `register.page.ts:11-15`, que solo comprueba el dominio y `code.length >= 3`). Combinado con F-01, el registro es completamente permisivo. La Edge Function M1#14 está entregada pero **muerta**.
- **Recomendación:**
  1. Decidir el formato canónico de código (¿`U\d{8}` o `\d{11}`?) y alinear regex, seed y docs.
  2. Invocar la Edge Function (o una RPC `validate_student_code`) desde el registro antes de `signUp`.
  3. Opcional: validar contra una lista/expressión oficial de la universidad.
- **Esfuerzo:** Bajo–Medio.

#### F-09 — `supabase-ci.yml` roto: path incorrecto + error de workflow
- **Severidad:** MEDIA (DevOps)
- **Ubicación:** `.github/workflows/supabase-ci.yml`
  - `paths: supabase/edge-functions/**` (líneas 5,8) — el directorio real es `supabase/functions/`.
  - `if: hashFiles('supabase/edge-functions/**/*.ts') != ''` (línea 33) — path inexistente.
  - `deno lint supabase/edge-functions/` (línea 42) y `deno test supabase/edge-functions/` (línea 45) — fallarían.
  - GitHub reporta "This run likely failed because of a workflow file issue."
- **Impacto:** Las Edge Functions (Deno) no se lintean ni testean en CI. Cambios a `supabase/functions/` no disparan el job. El job de migraciones sí corre pero falla (ver logs).
- **Recomendación:** Reemplazar `supabase/edge-functions/` por `supabase/functions/` en todos los `paths` y comandos. Validar el YAML con `actionlint`. Añadir `deno fmt --check`. Para `supabase db lint`, asegurar `SUPABASE_ACCESS_TOKEN` en secrets o usar `--local` con un contenedor Postgres.
- **Esfuerzo:** Bajo.

#### F-10 — Edge Function `notify-on-announcement` usa FCM legacy (deprecado) y sin verificación de firma
- **Severidad:** MEDIA
- **Ubicación:** `supabase/functions/notify-on-announcement/index.ts`
  - Líneas 8,30,45-50: usa `FCM_ENDPOINT = "https://fcm.googleapis.com/fcm/send"` con `Authorization: key=${FCM_SERVER_KEY}` (Legacy HTTP API).
  - Sin verificación de firma del webhook (la función recibe cualquier POST con un payload válido).
- **Impacto:**
  - **FCM legacy fue deprecado por Firebase (junio 2024)** y se está apagando; las notificaciones push dejarán de funcionar. `FCM_SERVER_KEY` ya no se emite para proyectos nuevos.
  - Sin verificación de firma, quien conozca la URL de la función podría disparar notificaciones masivas a todos los usuarios.
- **Recomendación:**
  1. Migrar a **FCM HTTP v1 API** (`oauth2` token + `messaging.googleapis.com/v1/projects/{id}/messages:send`).
  2. Verificar la firma del webhook de Supabase (header `x-supabase-signature` con HMAC-SHA256 sobre el body usando el webhook secret) antes de procesar.
- **Esfuerzo:** Medio.

#### F-11 — Funciones `SECURITY DEFINER` sin `search_path` (inconsistencia)
- **Severidad:** MEDIA
- **Ubicación:**
  - `supabase/migrations/00002_rls_policies.sql:6-20` — `get_user_role()` e `is_admin()` son `SECURITY DEFINER` sin `SET search_path`.
  - `supabase/migrations/00009_help_bot_search_functions.sql:18,41` — `search_faq_fts`, `search_faq_trigram` sin `search_path`.
  - `supabase/migrations/00010_faq_language.sql:25,62` — versiones redefinidas siguen sin `search_path`.
  - **Contraste positivo:** `00003_create_profile_on_signup.sql:5` usa `SECURITY DEFINER SET search_path = ''` (patrón correcto).
- **Impacto:** Riesgo teórico de search_path injection en funciones que se ejecutan con privilegios elevados. En Supabase el riesgo es bajo (entorno controlado), pero es un estándar de seguridad de PostgreSQL y ya hay un ejemplo correcto en el propio proyecto.
- **Recomendación:** Recrear las funciones con `SECURITY DEFINER SET search_path = public` (o `= ''` y cualificar `public.profiles`, `public.faq_entries`). Aprovechar M8#61 (RLS audit).
- **Esfuerzo:** Bajo.

---

### 🟢 BAJOS

#### F-12 — `console.log` de debug en `auth.service.ts` (fuga de info)
- **Ubicación:** `auth.service.ts:60,72,84,98,113,121,128` — logs que incluyen `user.email`, ids, respuestas de auth.
- **Impacto:** En producción filtra emails/ids a la consola del navegador; ruido.
- **Recomendación:** Eliminar o sustituir por un `LoggerService` con niveles (desactivado en prod). M11#80 (Sentry) cubre observabilidad real.
- **Esfuerzo:** Trivial.

#### F-13 — `supabaseAnonKey` hardcoded en `environment.ts`/`environment.prod.ts`
- **Ubicación:** `src/environments/environment.ts:4-5`, `src/environments/environment.prod.ts:4-5`.
- **Impacto:** La `anon key` de Supabase **es pública por diseño** (RLS protege los datos), así que no es una fuga de secreto. **Pero:** (a) dev y prod usan el mismo proyecto/key, (b) no hay rotación fácil, (c) el `service_role` key **no** debe caer en el bundle — verificar que ninguna Edge Function la importe desde `environment` (no la he visto, está bien: se lee en Deno con `Deno.env.get`).
- **Recomendación:** Mover a variables de entorno inyectadas en build (`environment.ts` con placeholders + reemplazo en CI), o a `window.__env` runtime config. Separar proyectos dev/prod (M9#72).
- **Esfuerzo:** Bajo.

#### F-14 — Budget de bundle superado (warning)
- **Ubicación:** `angular.json` budgets: `initial.maximumWarning: 1.5MB`. Build reporta `Initial total 1.53 MB`.
- **Impacto:** Aviso; si supera 2 MB el build fallará. Initial 303.87 kB transfer (gzip) es aceptable para una PWA Ionic. Chunks lazy pesados: `survey-results` (Chart.js+jspdf 422 kB), `tab-calendar` (FullCalendar 285 kB), `html2canvas` 202 kB — ya son lazy, bien.
- **Recomendación:** Subir `maximumWarning` a 2 MB razonablemente o pre-optimizar: `caniuse`/`browserslist` moderno, dynamic import de `chart.js`/`jspdf` solo al exportar, tree-shake de `fullcalendar` (cargar solo los plugins usados). M8 (performance) / M7#58.
- **Esfuerzo:** Bajo–Medio.

#### F-15 — `manifest.webmanifest` incompleto
- **Ubicación:** `public/manifest.webmanifest`
- **Hallazgo:** Faltan `theme_color`, `background_color`, `lang`, `description`, `orientation`, `categories`. Lighthouse PWA pedirá `theme_color`/`background_color`.
- **Recomendación:** Añadir `"theme_color": "#1E3A5F"`, `"background_color": "#1E3A5F"`, `"lang": "es"`, `"description": "App universitaria UniHub"`. M10#74.
- **Esfuerzo:** Trivial.

#### F-16 — Avatar fallback expone nombres a terceros (DiceBear)
- **Ubicación:** `src/app/pages/profile/profile.page.ts:51-54` — `https://api.dicebear.com/7.x/initials/svg?seed=${full_name}`.
- **Impacto:** Cada render de avatar sin foto sube el `full_name` del usuario a `dicebear.com` en la URL (fuga de PII vía query string + dependencia externa en runtime).
- **Recomendación:** Generar iniciales localmente (un componente SVG inline con las iniciales) o pre-generar el avatar en el cliente. Eliminar la dependencia de red.
- **Esfuerzo:** Bajo.

#### F-17 — `createProfile` fallback es código muerto (sin policy INSERT en `profiles`)
- **Ubicación:**
  - `src/app/core/services/supabase.service.ts:62-64` (`createProfile` hace `insert` en `profiles`).
  - `src/app/core/services/auth.service.ts:117-123` (`ensureProfile` lo llama como fallback).
  - `supabase/migrations/00002_rls_policies.sql` — `profiles` **no tiene policy INSERT**.
- **Impacto:** Si el trigger `handle_new_user` falla, el fallback `createProfile` también falla (RLS bloquea INSERT). Ruta muerta que da falsa sensación de robustez.
- **Recomendación:** O bien añadir `CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (id = auth.uid())` (arriesgado: permite perfiles arbitrarios), o **eliminar el fallback** y confiar en el trigger + manejo explícito del error (reintentar signup o mostrar mensaje). Recomiendo lo segundo.
- **Esfuerzo:** Bajo.

#### F-18 — Hueco en la numeración de migraciones (sin `00004`)
- **Ubicación:** `supabase/migrations/` — salta de `00003` a `00005`.
- **Impacto:** Bajo, pero dificulta trazabilidad (¿se descartó una migración? ¿se aplicó manualmente?). El `HANDOFF.md` no la menciona.
- **Recomendación:** Añadir un `00004_PLACEHOLDER.sql` con un comentario explicativo, o documentar en `docs/DATABASE_SCHEMA.md` por qué no existe. Estándar: no reutilizar números ni dejar huecos silenciosos.
- **Esfuerzo:** Trivial.

#### F-19 — Webhook de `notify-on-announcement` no versionado
- **Ubicación:** La Edge Function existe pero la configuración del DB webhook (Supabase Dashboard → Database → Webhooks) no está en migraciones ni en `config.toml`.
- **Impacto:** No reproducible en otro entorno; se pierde al recrear el proyecto. M9#73 (migraciones automatizadas).
- **Recomendación:** Mover triggers/webhooks a SQL versionado (`pg_net` + `cron` o documentar el setup en `docs/EDGE_FUNCTIONS.md`).
- **Esfuerzo:** Bajo.

---

## 5. Buenas prácticas observadas (reconocimiento)

- **Arquitectura limpia:** standalone components, lazy-loading por ruta (`app.routes.ts`), separación `core/`/`pages/`/`shared/`, servicios singleton con `providedIn: 'root'`.
- **Patrón de auth correcto:** `APP_INITIALIZER` para `restoreSession()` evita race conditions con guards (`app.config.ts:24-28`).
- **Design system:** tokens centralizados (`theme/tokens.css`), partials SCSS compartidos, dark mode implementado (M6).
- **Componentes de estado reutilizables:** `EmptyState`, `ErrorState`, `SkeletonList` (M6) — buena consistencia UX.
- **Servicios transversales:** `ErrorHandlerService`, `ToastService`, `FormValidationService`, `ThemeService` — separación de cross-cutting concerns.
- **RLS en 14 tablas core** con helper `is_admin()` (aunque necesita los ajustes de F-02/F-03/F-04/F-11).
- **Trigger seguro:** `handle_new_user` usa `SECURITY DEFINER SET search_path = ''` (modelo a replicar en F-11).
- **Edge Functions con CORS** y decode manual de JWT donde `verify_jwt=true` (patrón documentado en `HANDOFF.md`, correcto).
- **Help-bot robusto:** FTS + trigram fallback, detección de idioma, log de queries con `service_role`, umbral de resolución. La función `tsQueryTerms` pre-formatea el `tsquery` correctamente (`word:*` unidos con `|`), evitando el error típico de `to_tsquery` con texto libre.
- **Tests:** 100/103 pasan; cobertura de servicios core (auth, announcement, event, help-bot, toast, error-handler, theme, form-validation, database, storage).
- **PWA:** `manifest.webmanifest` + `@angular/service-worker` + `ngsw-config.json` operativos.
- **Offline:** `OfflineManagerService` con estrategia network-first y cache en SQLite/Storage.

---

## 6. Recomendaciones de estándares de Ingeniería de Software

| Área | Recomendación | Cubre |
|------|---------------|-------|
| **Definition of Done** | Ningún PR se mergea con CI rojo, lint con errores, o tests fallando. Añadir `ng test --watch=false --ci` obligatorio. | M7, F-05 |
| **Branch protection estricta** | `enforcement_level: everyone` + `require_status_checks: strict` + `require_pull_request_reviews ≥1`. | F-05 |
| **Tests no determinísticos** | Prohibir fechas/IDs hardcoded en specs; usar factories con `Date.now()` y `crypto.randomUUID()`. Añadir un lint rule o review checklist. | F-06 |
| **Cobertura mínima** | Establecer umbral (ej. 70% statements) en `vitest` con `coverage.thresholds`. Hoy no hay config de coverage. | M7#57 |
| **Secretos** | `.env` + `angular.json` replacements para `environment*.ts`; rotar `anon key` entre dev/prod; nunca commitear `service_role`. | F-13, M9#72 |
| **Migraciones idempotentes** | Usar `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS` (ya se hace en parte), numeración sin huecos, y `supabase migration list` en CI. | F-18, M9#73 |
| **RLS como puerta por defecto** | Regla: toda nueva tabla debe venir con `ENABLE RLS` + policies en la misma migración. Añadir test automático que liste tablas sin RLS. | F-02, F-03, M8#61 |
| **Logs en producción** | Ningún `console.log` en código de prod; usar un `Logger` desactivable o Sentry. | F-12, M11#80 |
| **Accesibilidad** | Ya hay skip-link (M6); completar WCAG 2.2 AA: `aria-describedby` en errores de form, foco visible, contrastes. | M7#60, M6#49 |
| **Observabilidad backend** | Logs estructurados en Edge Functions (Deno) + Sentry; alertas de errores de cron. | M11#80, #82 |
| ** Dependencias** | `npm audit` + `dependabot` activado. `jspdf`, `chart.js`, `fullcalendar` son pesados: vigilar tamaño. | M8#65, F-14 |

---

## 7. Plan de acción sugerido (priorizado)

**Fase 0 — Bloqueantes antes de seguir desarrollando (1–3 días):**
1. **F-01** (escalación admin) — fix del trigger + Edge Function `create-admin`.
2. **F-02** (RLS `recurring_exceptions`) — migración + test.
3. **F-03** (RLS `survey_reminders`) — migración.
4. **F-04** (policies SELECT admin) — migración + retest de los 6 CRUDs admin.

**Fase 1 — Recuperar la señal de calidad (1–2 días):**
5. **F-06** (tests time-bomb) — fechas dinámicas.
6. **F-07** (Vitest alias) — config + retest.
7. **F-09** (`supabase-ci.yml`) — path + actionlint.
8. **F-05** (branch protection estricta) — tras CI verde.

**Fase 2 — Endurecimiento (M8, según roadmap):**
9. **F-08** (validación server-side de código) + invocar `validate-student-code`.
10. **F-10** (FCM v1 + webhook signature).
11. **F-11** (`search_path` en SECURITY DEFINER).
12. **F-13** (env vars), **F-16** (DiceBear), **F-12** (logs), **F-17** (dead code).

**Fase 3 — Pulido y despliegue (M7/M10):**
13. **F-14** (bundle), **F-15** (manifest), **F-18** (migraciones), **F-19** (webhook versionado).
14. Continuar M7 (coverage, E2E) y M10 (prod env, runbook).

---

## 8. Conclusión

El proyecto UniHub alcanza el 50% con **una base técnica sana y funcional**: arquitectura Angular/Ionic moderna, backend Supabase bien modelado, 6 milestones funcionales entregados y un design system consolidado. **Es viable continuar el desarrollo.**

Sin embargo, **no se debe avanzar a M7–M11 sin antes cerrar la Fase 0** (F-01 a F-04). Las dos vulnerabilidades críticas (escalación de admin y RLS ausente en `recurring_exceptions`) permiten que un estudiante comprometa la integridad del sistema y obtenga privilegios de administrador, lo que invalida cualquier confianza en los datos. El fallo sistémico de RLS (F-04) hace que media funcionalidad admin (toggles, gestión de borradores/cancelados) esté rota en la práctica.

Paralelamente, **el CI rojo prolongado y los tests time-bomb** indican que el proyecto está operando sin red de seguridad. Restaurar el verde del CI y endurecer la branch protection es urgente para no acumular regresiones en los próximos milestones.

**Luz verde: condicional**, sujeta a ejecución de la Fase 0 y Fase 1 anteriores.
