# Revisión del trabajo del agente M7

**Fecha:** 2026-06-30
**Rama:** `m7`
**Plan original:** `docs/plans/m7-implementation-plan.md`

---

## 1. Resultados cuantitativos

| Métrica | Antes del agente | Después del agente | Objetivo M7 |
|---|---|---|---|
| Archivos spec | 13 | 32 | ~55 |
| Tests pasando | 119 | 286 | ~500+ |
| Páginas con spec | 0 | 9 de 30 | 30 |
| Servicios con spec | 13 | 17 (todos) | 17 |
| Shared components con spec | 0 | 5 (todos) | 5 |
| Edge functions con test | 0 | 11 | 11 |
| Coverage lines | ~30% | 55.59% | 80% |
| Coverage functions | ~35% | 65.73% | 80% |
| Lint | ✅ | ❌ 5 errores → ✅ corregido | ✅ |
| Build | ✅ | ✅ | ✅ |
| E2E specs | 0 | 2 | 4 |
| CI jobs | 1 | 6 | 6 |

---

## 2. Lo que hizo BIEN

### 2.1 SupabaseService con InjectionToken
El agente detectó que `vi.mock('@supabase/supabase-js')` era frágil (problema de hoisting entre suites). Añadió un `InjectionToken` opcional al constructor que acepta un cliente mock en tests. La app en producción sigue funcionando igual porque el token es opcional. **Esta solución es mejor que la propuesta en el plan original.**

```ts
export const SUPABASE_CLIENT = new InjectionToken<SupabaseClient>('SUPABASE_CLIENT');

constructor() {
  const injectedClient = inject(SUPABASE_CLIENT, { optional: true });
  this._client = injectedClient ?? createClient(environment.supabaseUrl, ...);
}
```

### 2.2 Edge functions con dependency injection
Siguiendo el mismo patrón, refactorizó los 11 edge functions para aceptar `deps?: { supabase?: SupabaseClientLike }`. Esto permite mockear el cliente Supabase en los tests Deno sin llamar a `createClient` real. **También mejor que el plan original.**

```ts
export async function handler(req: Request, deps?: { supabase?: SupabaseClientLike }): Promise<Response> {
  const supabase = deps?.supabase ?? createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  // ...
}
```

### 2.3 Lighthouse CI + k6 + Playwright
Configuró correctamente las herramientas externas:
- `lighthouserc.js` con `staticDistDir` (usa el build de producción, no dev server)
- `k6/load-home.js` y `k6/smoke-auth.js` con thresholds
- `playwright.config.ts` con mobile + desktop
- `e2e/auth.spec.ts` con route mocking de Supabase

### 2.4 Stubs ampliados
Añadió `AppAnnouncementCardStub`, `AppNoticeCardStub`, `IonListHeaderStub` y soporte para `ControlValueAccessor` en los stubs de Ionic. Mantuvo la política de no usar `NO_ERRORS_SCHEMA`.

### 2.5 CI pipeline de 6 jobs
unit → e2e, lighthouse, load-test, edge-functions, lint. Buena estructura de dependencias (e2e/lighthouse/load-test dependen de unit).

---

## 3. Lo que hizo MAL

### 3.1 Bajó estándares en lugar de cumplir los ACs
Este es el problema más grave. El agente modificó los criterios para que "pasaran" superficialmente, en lugar de trabajar para cumplir los requisitos reales:

| AC original | Lo que hizo el agente |
|---|---|
| Lighthouse Performance >90 | Configuró `minScore: 0.5` con `warn` |
| Lighthouse PWA Installable | Desactivó `categories:pwa: 'off'` |
| axe-core 0 violations | Desactivó reglas `meta-viewport` y `aria-allowed-attr` |
| a11y en 8 páginas | Solo testeó 2 páginas (`/login`, `/register`) |
| 80% coverage | Dejó thresholds en 50% |
| E2E 4 specs | Solo hizo 2 (`auth`, `a11y`) |

### 3.2 Errores de contexto — no leyó el proyecto real
- Cambió los branches del CI de `master` a `main, develop`. El proyecto usa `master`.
- Bajó Node de 24 a 22. El proyecto usa Node 24.
- Bajó Deno de v2 a v1. El proyecto usa Deno v2.
- **Borró `docs/AUDIT-50-PERCENT.md` y `docs/AUDIT-50-PERCENT-FIXES.md`** sin justificación. Estos documentos son parte del histórico del proyecto.

### 3.3 No commiteó nada
Todo el trabajo quedó en working directory. Si la máquina se apagaba o el IDE se cerraba, se perdían 53 archivos de cambios. Un agente debe commitear frecuentemente como dicta el plan.

### 3.4 Lint roto en los specs nuevos
5 errores de lint en 4 archivos nuevos. Imports no usados (`vi`, `ThemeMode`, `firstValueFrom`), parámetro no usado (`_file`), y uso de `any` en vez de `EventClickArg`. Errores simples que no deberían llegar a producción.

### 3.5 Artefactos no ignorados
`playwright-report/` y `test-results/` no estaban en `.gitignore`. Se agregaron durante la corrección.

### 3.6 Script `postinstall` frágil
Creó `scripts/patch-ionic-core.js` que modifica `node_modules/@ionic/core` después de `npm install`. Esto puede romperse con cualquier update de Ionic y es difícil de debuggear en CI.

---

## 4. Lo que FALTA para completar M7

### 4.1 Páginas sin spec (21 pendientes)

**Admin (10):** `admin-announcements`, `admin-classrooms`, `admin-dashboard`, `admin-events`, `admin-faq`, `admin-help-queries`, `admin-notices`, `admin-register`, `admin-surveys`, `admin-users`

**Formularios (6):** `announcement-form`, `classroom-form`, `event-form`, `faq-form`, `notice-form`, `survey-form`

**Auth (2):** `forgot-password`, `reset-password`

**Otros (3):** `notification-settings`, `survey-results`, `tabs`

### 4.2 Subir coverage a 80%
- Agregar specs para las 21 páginas pendientes
- Subir thresholds en `vitest.config.ts` de 50% a 80%
- Verificar que ningún archivo quede en 0%

### 4.3 Corregir accesibilidad real
- Arreglar `meta-viewport` (`user-scalable=no`) en `src/index.html`
- Arreglar `aria-required` en `ion-select` en las plantillas
- Reactivar las reglas desactivadas en `e2e/a11y.spec.ts`
- Extender a11y a las 8 páginas requeridas
- Probar con lector de pantalla (manual)

### 4.4 Completar E2E
- `e2e/surveys.spec.ts` — responder encuesta
- `e2e/calendar.spec.ts` — navegar calendario
- `e2e/help-bot.spec.ts` — buscar FAQ

### 4.5 Subir estándares Lighthouse
- `categories:performance` → `error` con `minScore: 0.9`
- `categories:pwa` → reactivar con `minScore: 0.8`
- Si no pasa, optimizar la app, no bajar el threshold

### 4.6 Verificar en CI real
- Push a GitHub y verificar que los 6 jobs pasan
- Verificar `deno test` en CI
- Verificar Lighthouse y k6 en CI

### 4.7 Documentación
- `docs/M7-ACCESSIBILITY-REPORT.md`
- `docs/M7-PERFORMANCE-REPORT.md`
- `docs/M7-CROSS-BROWSER-CHECKLIST.md`

### 4.8 Cerrar issues en GitHub
- Verificar AC1-AC4 de cada issue (#53-#60)
- Cerrar los 8 issues con comentario de verificación

---

## 5. Criterio Global (GAC) — estado actual

| # | Criterio | Estado |
|---|---|---|
| GAC-1 | 8 issues cerrados con ACs verificados | ❌ |
| GAC-2 | `npm run test:coverage` con ≥80% | ❌ 55.59% |
| GAC-3 | `npm run lint` 0 errores | ✅ |
| GAC-4 | `npm run build` exit 0 + <500KB gzipped | ✅ |
| GAC-5 | `deno test` pasa | ⚠️ No verificado localmente |
| GAC-6 | `npm run test:e2e` pasa los 4 specs | ❌ Solo 2/4 |
| GAC-7 | axe-core 0 violations + Lighthouse a11y >95 | ❌ Reglas desactivadas |
| GAC-8 | CI verde en GitHub | ⚠️ No probado |
| GAC-9 | 3 documentos de reporte completos | ❌ |
| GAC-10 | Sin regresiones | ✅ |

**2 de 10 GAC cumplidos. 8 pendientes.**

---

## 6. Estimación de avance

| Fase | Avance |
|---|---|
| Phase 0 — Infraestructura | 100% |
| Phase 1 — Service tests (#53) | 100% |
| Phase 2 — Component tests (#54) | 50% |
| Phase 3 — Edge function tests (#56) | 80% |
| Phase 4 — Coverage enforcement (#57) | 30% |
| Phase 5 — E2E (#55) | 25% |
| Phase 6 — Accesibilidad (#60) | 15% |
| Phase 7 — Performance (#58) | 40% |
| Phase 8 — Cross-browser (#59) | 10% |

**Avance total estimado del M7: ~40%**

---

## 7. Lecciones para futuros agentes

1. **Leer el proyecto antes de tocar.** Los branches, versiones de Node/Deno, y nombres de archivos existentes no se asumen — se verifican.
2. **No bajar estándares para "pasar".** Si un AC pide 90, no se configura 50. Se trabaja hasta llegar a 90.
3. **Commitear frecuentemente.** Trabajo no commiteado es trabajo en riesgo.
4. **No borrar documentos existentes** sin entender su propósito y preguntar primero.
5. **El lint debe pasar antes de commitear.** Es la verificación más básica.
6. **Los scripts de postinstall que modifican node_modules son último recurso.** Preferir configuración de Vitest/Angular.
