# M6 — Plan de Implementación: UI/UX Polish

Milestone: **M6: UI/UX Polish**  
Issues: #46, #47, #48, #49, #50, #51, #52  
Branch: `M6`

---

## 1. Visión General

M6 es un milestone de **polish** (pulido): no agrega funcionalidad nueva, sino que mejora la experiencia de usuario de todo lo construido en M1-M5. Las 7 issues cubren 5 ejes:

| Eje | Issues |
|-----|--------|
| Fundamentos (infra) | #50 Error handling, #51 Loading/empty states |
| Movimiento | #47 Animations & transitions |
| Layout | #46 Responsive design |
| Tema | #48 Dark mode |
| Calidad | #49 Accessibility, #52 Final polish |

### Principios transversales
1. **No romper lo existente**: M1-M5 deben seguir funcionando igual o mejor.
2. **Componentes reutilizables**: todo lo que se repita en 2+ páginas debe ser un componente standalone.
3. **CSS variables**: nada hardcodeado; todo fluye desde `theme/variables.css`.
4. **Mobile-first**: el breakpoint base es 320px; se escala hacia arriba.
5. **Progressive enhancement**: a11y y animaciones funcionan sin JS; mejoran con él.

---

## 2. Estado base (qué ya existe)

| Recurso | Estado | Notas |
|---------|--------|-------|
| `theme/variables.css` | ✅ Ionic colors | Falta dark palette |
| `theme/tokens.css` | ✅ Spacing, typography | Ya tiene 8px grid |
| `_animations.scss` | ✅ Keyframes + utilidades | `fadeIn`, `scaleIn`, `stagger`, etc. |
| `_loading-states.scss` | ✅ Skeleton CSS | `.skeleton`, `.skeleton-card`, etc. |
| `_empty-states.scss` | ✅ Empty state CSS | `.empty-state`, `.empty-state-error` |
| `_dark-mode.scss` | ⚠️ Stub | Solo comentarios; sin implementar |
| `shared/components` | ⚠️ 2 cards | `announcement-card`, `notice-card` |
| Error handling global | ❌ No existe | Cada página maneja errores ad-hoc |
| Dark mode service | ❌ No existe | |
| Responsive grid | ⚠️ Parcial | Algunas páginas usan `ion-grid`, otras no |

---

## 3. Orden de ejecución

El orden resuelve dependencias: los servicios/componentes base se construyen primero; los que los consumen, después.

```
Fase 1: Infraestructura  (#50, #51)
    │
    ├── #50 ErrorHandlerService + ToastService globales
    └── #51 Reusable components: EmptyState, ErrorState, SkeletonList
            │
            ▼
Fase 2: Movimiento       (#47)
    │
    ├── Page transitions (Ionic nav)
    ├── Skeleton integration en todas las listas
    ├── Card fade-in + stagger
    └── Success animations
            │
            ▼
Fase 3: Layout           (#46)
    │
    ├── Audit responsive en 30 páginas
    ├── ion-grid breakpoints
    └── Overflow / scroll fixes
            │
            ▼
Fase 4: Tema             (#48)
    │
    ├── Dark palette en variables.css
    ├── ThemeService (toggle + persistencia)
    └── Dark class toggle en <body>
            │
            ▼
Fase 5: Calidad          (#49, #52)
    │
    ├── #49 A11y: aria-labels, focus, keyboard, contrast
    └── #52 Final polish: colores, tipografía, ortografía, botones
```

---

## 4. Plan por Issue

---

### #50 — Implement error handling and toast notifications
**Etiquetas:** `frontend`, `error-handling`  
**Dependencias:** ninguna (es la base)

#### 4.1.1 Tareas

1. **Crear `ToastService`** (`src/app/core/services/toast.service.ts`)
   - Métodos: `error(msg, duration?)`, `success(msg, duration?)`, `warning(msg, duration?)`, `info(msg, duration?)`
   - Usa `IonToastController` de Ionic (inyectado en el servicio).
   - Colores: danger (rojo), success (verde), warning (amarillo), primary (azul).
   - Posición: `top` para errores, `bottom` para success.

2. **Crear `ErrorHandlerService`** (`src/app/core/services/error-handler.service.ts`)
   - `handleHttpError(error): void`
     - 401 → redirige a `/login`, toast: "Sesión expirada"
     - 403 → toast: "No tienes permiso"
     - 404 → toast: "Recurso no encontrado"
     - 500 → toast: "Error del servidor, intenta más tarde"
     - Network error → toast: "Sin conexión" + botón "Reintentar"
   - `handleFormError(fieldErrors): Map<string, string>`
     - Recibe errores de validación y devuelve mensajes amigables.
   - `handleGenericError(error): void`
     - Catch-all para errores no esperados.
     - Nunca muestra stack trace ni SQL al usuario.

3. **Crear `FormValidationService`** (`src/app/core/services/form-validation.service.ts`)
   - Mensajes predefinidos en español:
     - `required`: "Este campo es obligatorio"
     - `email`: "Ingresa un correo válido"
     - `minlength`: "Mínimo {min} caracteres"
     - `maxlength`: "Máximo {max} caracteres"
     - `pattern`: "Formato inválido"
   - Método: `getErrorMessage(controlName, errors): string`

4. **Integrar en páginas críticas** (mínimo 5 para demostrar uso):
   - `login.page.ts` → 401/403 handling
   - `survey-form.page.ts` → form validation inline
   - `faq-form.page.ts` → form validation inline
   - `tab-help.page.ts` → network error + retry
   - `admin-help-queries.page.ts` → network error + retry

5. **Crear test unitario** `toast.service.spec.ts` (Vitest, sin TestBed)

#### 4.1.2 Archivos a crear/modificar

```
NEW  src/app/core/services/toast.service.ts
NEW  src/app/core/services/toast.service.spec.ts
NEW  src/app/core/services/error-handler.service.ts
NEW  src/app/core/services/form-validation.service.ts
MOD  src/app/pages/login/login.page.ts
MOD  src/app/pages/survey-form/survey-form.page.ts
MOD  src/app/pages/faq-form/faq-form.page.ts
MOD  src/app/pages/tab-help/tab-help.page.ts
MOD  src/app/pages/admin-help-queries/admin-help-queries.page.ts
```

#### 4.1.3 Criterios de aceptación

- [ ] AC1: Error de red muestra toast con botón "Reintentar"
- [ ] AC2: Campo inválido muestra mensaje de error debajo en rojo
- [ ] AC3: Token expirado redirige a login automáticamente
- [ ] AC4: Ningún error técnico se muestra al usuario

---

### #51 — Add loading states and empty states
**Etiquetas:** `frontend`, `ux`  
**Dependencias:** #50 (para error states con retry)

#### 4.2.1 Tareas

1. **Crear `EmptyStateComponent`** (`src/app/shared/components/empty-state/`)
   - Inputs: `icon`, `title`, `message`, `actionText?`, `action?` (output)
   - Usa las clases CSS existentes de `_empty-states.scss`.
   - Variantes: `default`, `compact`, `error`.
   - Standalone component con `IonIcon`, `IonButton`, `IonLabel`.

2. **Crear `ErrorStateComponent`** (`src/app/shared/components/error-state/`)
   - Inputs: `message`, `retryText?` (default: "Reintentar"), `retry?` (output)
   - Reusa estilos de `.empty-state-error`.
   - Standalone component.

3. **Crear `SkeletonListComponent`** (`src/app/shared/components/skeleton-list/`)
   - Inputs: `count` (default: 3), `type: 'card' | 'item' | 'avatar'`
   - Usa clases CSS de `_loading-states.scss`.
   - Standalone component.

4. **Reemplazar estados hardcodeados** en todas las páginas con los nuevos componentes:
   - Páginas con lista vacía: `admin-announcements`, `admin-surveys`, `admin-events`, `admin-classrooms`, `admin-faq`, `admin-help-queries`, `tab-surveys`, `tab-calendar`, `tab-help`
   - Páginas con loading spinner: todas las anteriores + `tab-dashboard`, `admin-dashboard`, `admin-users`
   - Páginas con error de carga: las mismas listas

5. **Spinner en botones de submit**:
   - Revisar todos los formularios (`*-form.page.ts`) y asegurar que `[disabled]="saving"` + `ion-spinner` en el botón submit.
   - Ya está en `faq-form`, `announcement-form` — replicar en los que falten.

#### 4.2.2 Archivos a crear/modificar

```
NEW  src/app/shared/components/empty-state/empty-state.component.ts
NEW  src/app/shared/components/empty-state/empty-state.component.html
NEW  src/app/shared/components/empty-state/empty-state.component.scss
NEW  src/app/shared/components/error-state/error-state.component.ts
NEW  src/app/shared/components/error-state/error-state.component.html
NEW  src/app/shared/components/error-state/error-state.component.scss
NEW  src/app/shared/components/skeleton-list/skeleton-list.component.ts
NEW  src/app/shared/components/skeleton-list/skeleton-list.component.html
NEW  src/app/shared/components/skeleton-list/skeleton-list.component.scss
MOD  src/app/pages/*/admin-*.page.html  (9 páginas admin)
MOD  src/app/pages/tab-*/tab-*.page.html  (4 páginas tab)
MOD  src/app/pages/*-form/*-form.page.html  (formularios)
```

#### 4.2.3 Criterios de aceptación

- [ ] AC1: Lista vacía muestra ilustración y mensaje descriptivo
- [ ] AC2: Error de carga muestra botón "Reintentar" que vuelve a cargar
- [ ] AC3: Skeleton se muestra antes de que los datos lleguen
- [ ] AC4: Botón submit muestra spinner mientras se procesa

---

### #47 — Add animations and transitions
**Etiquetas:** `frontend`, `animations`  
**Dependencias:** #51 (skeletons ya implementados)

#### 4.3.1 Tareas

1. **Page transitions** (Ionic nav):
   - Configurar `IonicModule.forRoot({ navAnimation: customAnimation })` en `main.ts`.
   - `customAnimation`: fade + slight slide up (150ms) para todas las rutas.
   - Alternativa más simple: reforzar la animación existente `ion-page-enter` en `_animations.scss` para que cubra todas las transiciones de Ionic Router.

2. **Skeleton integration**: ya está en #51; asegurar que los skeletons usan `skeleton-shimmer` animation (ya existe).

3. **Card fade-in + stagger**:
   - Añadir clase `.animate-fade-in-up` a las listas de cards en:
     - `admin-dashboard` (dashboard cards)
     - `tab-dashboard` (announcements/notices)
     - `tab-surveys` (survey cards)
     - `admin-surveys`, `admin-events`, `admin-classrooms`
   - Ya existe `.animate-stagger` en `_animations.scss` — solo hay que aplicarla.

4. **Success animation**:
   - Crear `SuccessAnimationComponent` (checkmark animado con CSS) o usar `ion-toast` con icono + animación `scaleIn`.
   - Aplicar en:
     - Envío de encuesta (`survey-response.page.ts`)
     - Creación/edición de FAQ (`faq-form.page.ts`)
     - Creación de evento (`event-form.page.ts`)

5. **Pull-to-refresh**:
   - Agregar `ion-refresher` a las páginas con listas que cargan desde API:
     - `tab-dashboard`, `tab-surveys`, `tab-calendar`, `tab-help`
     - `admin-announcements`, `admin-surveys`, `admin-events`, `admin-classrooms`, `admin-faq`, `admin-help-queries`
   - Cada refresher llama al `load*()` correspondiente.

6. **Ripple effect**: ya está por default en Ionic Material Design; verificar que no se desactivó accidentalmente.

#### 4.3.2 Archivos a crear/modificar

```
MOD  src/main.ts  (page transition config si es necesario)
MOD  src/app/styles/_animations.scss  (refinar ion-page-enter)
MOD  src/app/pages/admin-dashboard/admin-dashboard.page.html
MOD  src/app/pages/tab-dashboard/tab-dashboard.page.html
MOD  src/app/pages/tab-surveys/tab-surveys.page.html
MOD  src/app/pages/admin-surveys/admin-surveys.page.html
MOD  src/app/pages/admin-events/admin-events.page.html
MOD  src/app/pages/admin-classrooms/admin-classrooms.page.html
MOD  src/app/pages/survey-response/survey-response.page.html
MOD  src/app/pages/survey-response/survey-response.page.ts
MOD  src/app/pages/faq-form/faq-form.page.ts
MOD  src/app/pages/event-form/event-form.page.ts
MOD  src/app/pages/tab-*/tab-*.page.html  (refresher)
MOD  src/app/pages/admin-*/admin-*.page.html  (refresher)
```

#### 4.3.3 Criterios de aceptación

- [ ] AC1: Navegación entre páginas tiene transición suave
- [ ] AC2: Skeletons se muestran durante carga en todas las listas
- [ ] AC3: Envío de encuesta muestra animación de confirmación
- [ ] AC4: Pull-to-refresh muestra spinner y feedback táctil

---

### #46 — Implement responsive design for all pages
**Etiquetas:** `frontend`, `responsive`  
**Dependencias:** #51, #47

#### 4.4.1 Tareas

1. **Audit viewport breakpoints** en Chrome DevTools (o manual):
   - Mobile: 320px – 767px
   - Tablet: 768px – 1023px
   - Desktop: 1024px+

2. **Ionic grid en páginas críticas**:
   - `admin-dashboard`: `size="6" size-md="4"` en cards (ya existe; verificar)
   - `tab-dashboard`: anuncios en 1 col mobile, 2 col tablet+
   - `admin-surveys`, `admin-events`, `admin-classrooms`, `admin-users`: tabla/lista que se expande
   - `tab-calendar`: calendario que se adapta

3. **Formularios**: asegurar que inputs no desbordan en 320px.
   - Revisar todos los `*-form.page.scss`:
     - `min-width` en inputs
     - `word-break` en textos largos
     - Padding/margins que no sean fijos en px

4. **Navegación adaptativa**:
   - Mobile: tabs (ya existe)
   - Tablet+: evaluar si se necesita side menu; si no, al menos que los tabs se vean bien con icono + label
   - Desktop: tabs con más espacio entre elementos

5. **Overflow audit**:
   - Revisar `overflow-x: hidden` en `body`/`ion-content`.
   - Asegurar que `ion-textarea` y `ion-input` no generan scroll horizontal.
   - Tablas (si las hay) con scroll horizontal controlado.

6. **Tamaños de fuente relativos**:
   - Verificar que no hay `font-size` fijos en px (excepto en `html { font-size: 16px }`).
   - Todo debe usar `var(--text-sm)`, `var(--text-base)`, etc.

#### 4.4.2 Archivos a crear/modificar

```
MOD  src/app/pages/admin-dashboard/admin-dashboard.page.html
MOD  src/app/pages/admin-dashboard/admin-dashboard.page.scss
MOD  src/app/pages/tab-dashboard/tab-dashboard.page.html
MOD  src/app/pages/tab-dashboard/tab-dashboard.page.scss
MOD  src/app/pages/tab-surveys/tab-surveys.page.html
MOD  src/app/pages/tab-surveys/tab-surveys.page.scss
MOD  src/app/pages/tab-calendar/tab-calendar.page.html
MOD  src/app/pages/tab-calendar/tab-calendar.page.scss
MOD  src/app/pages/admin-*/admin-*.page.html  (todas)
MOD  src/app/pages/admin-*/admin-*.page.scss  (todas)
MOD  src/app/pages/*-form/*-form.page.scss  (todos)
MOD  src/app/pages/tabs/tabs.page.scss
```

#### 4.4.3 Criterios de aceptación

- [ ] AC1: Todas las páginas usables en 320px sin scroll horizontal
- [ ] AC2: Dashboard muestra 2 columnas en tablet, 1 en mobile
- [ ] AC3: Formularios no se cortan en ningún viewport
- [ ] AC4: Navegación se adapta (tabs en mobile, side menu opcional en desktop)

---

### #48 — Implement dark mode support
**Etiquetas:** `frontend`, `dark-mode`  
**Dependencias:** #46 (layout estable antes de cambiar colores)

#### 4.5.1 Tareas

1. **Dark palette** en `src/theme/variables.css`:
   - Agregar sección `:root` con modo oscuro (ya existe stub en `_dark-mode.scss`; mover a `variables.css`).
   - Colores mínimos necesarios:
     ```css
     [data-theme="dark"] {
       --surface-page: #0f172a;
       --surface-card: #1e293b;
       --surface-input: #334155;
       --text-primary: #f1f5f9;
       --text-secondary: #94a3b8;
       --text-tertiary: #64748b;
       --border-subtle: #334155;
       --ion-color-primary: #3b82f6;
       --ion-color-primary-contrast: #ffffff;
       /* ... */
     }
     ```
   - Verificar contraste WCAG AA para todos los pares texto/fondo.

2. **Crear `ThemeService`** (`src/app/core/services/theme.service.ts`):
   - `toggleDarkMode(): void` — alterna clase `dark` en `<body>` o atributo `data-theme="dark"`.
   - `initializeTheme(): void` — lee `prefers-color-scheme` y storage al iniciar.
   - `setTheme(mode: 'light' | 'dark' | 'system'): void`
   - Persistencia en `StorageService` (key: `app_theme`).
   - Test unitario `theme.service.spec.ts`.

3. **Toggle en settings**:
   - Modificar `notification-settings.page.ts` → renombrar a `settings.page.ts` o agregar sección "Apariencia".
   - Toggle `ion-toggle` con label "Modo oscuro".
   - Opción "Seguir sistema" (default).

4. **Aplicar tema sin recargar**:
   - En `app.component.ts` (o `main.ts`): suscribirse a cambios de tema y aplicar clase al `<html>` o `<body>`.
   - CSS custom properties reaccionan automáticamente.

5. **Dark mode overrides en SCSS**:
   - Revisar `_cards.scss`, `_forms.scss`, `_dashboard.scss` para hardcoded colors.
   - Asegurar que imágenes/íconos no se vuelven invisibles (usar `currentColor` o filtros).

#### 4.5.2 Archivos a crear/modificar

```
NEW  src/app/core/services/theme.service.ts
NEW  src/app/core/services/theme.service.spec.ts
MOD  src/theme/variables.css  (dark palette)
MOD  src/app/styles/_dark-mode.scss  (completar)
MOD  src/app/pages/notification-settings/notification-settings.page.ts
MOD  src/app/pages/notification-settings/notification-settings.page.html
MOD  src/app/app.component.ts  (inicializar tema)
MOD  src/app/styles/_cards.scss
MOD  src/app/styles/_forms.scss
MOD  src/app/styles/_dashboard.scss
```

#### 4.5.3 Criterios de aceptación

- [ ] AC1: Activar dark mode cambia todos los colores inmediatamente
- [ ] AC2: Preferencia se guarda y persiste al reabrir
- [ ] AC3: Sistema en dark → app inicia en dark automáticamente
- [ ] AC4: Texto tiene contraste suficiente en ambos temas (WCAG AA)

---

### #49 — Implement accessibility (a11y) improvements
**Etiquetas:** `frontend`, `accessibility`  
**Dependencias:** #46, #48 (layout y tema estables)

#### 4.6.1 Tareas

1. **ARIA labels en inputs, botones, íconos**:
   - Auditar todas las páginas: buscar `<ion-button>`, `<ion-icon>`, `<ion-input>`, `<ion-toggle>` sin `aria-label` o texto visible.
   - Regla: si un ícono es el único contenido de un botón, debe tener `aria-label`.
   - Regla: todo `ion-input` debe tener `label` o `aria-label`.

2. **Orden de tabulación lógico**:
   - Verificar `tabindex` (no debe haber valores positivos; usar DOM order).
   - Formularios: el orden de los campos en el DOM debe ser el orden visual.

3. **Focus visible**:
   - Asegurar que `:focus-visible` tiene outline o box-shadow visible en:
     - `ion-button`, `ion-item`, `ion-input`, `ion-textarea`, `ion-select`, `ion-chip`
   - Añadir en `styles.scss`:
     ```css
     :focus-visible {
       outline: 2px solid var(--ion-color-primary);
       outline-offset: 2px;
     }
     ```

4. **Contraste de color**:
   - Usar `axe DevTools` (o revisión manual) en al menos 5 páginas representativas.
   - Corregir pares con ratio < 4.5:1.
   - Prioridad: texto sobre fondos (`text-primary` sobre `surface-page`, `surface-card`, etc.).

5. **Textos alternativos**:
   - Avatares: `alt="Avatar de {nombre}"`.
   - Íconos decorativos: `aria-hidden="true"`.
   - Íconos interactivos: `aria-label="{acción}"`.

6. **Skip-to-content link** (opcional para M6, nice-to-have):
   - En `app.component.html`: link oculto que aparece al focus (`sr-only` + `focus:not(:active)`).
   - Salta al `<ion-router-outlet>`.

7. **Keyboard navigation**:
   - Probar que se puede completar login y registro usando solo Tab + Enter.
   - Asegurar que `ion-select` se abre con Space/Enter.
   - Asegurar que `ion-toggle` se activa con Space.

#### 4.6.2 Archivos a crear/modificar

```
MOD  src/styles.scss  (focus-visible styles)
MOD  src/app/pages/login/login.page.html
MOD  src/app/pages/register/register.page.html
MOD  src/app/pages/*-form/*-form.page.html  (todos los formularios)
MOD  src/app/pages/admin-*/admin-*.page.html  (aria-labels en botones/iconos)
MOD  src/app/pages/tab-*/tab-*.page.html  (aria-labels)
MOD  src/app/app.component.html  (skip link opcional)
```

#### 4.6.3 Criterios de aceptación

- [ ] AC1: axe DevTools reporta 0 critical / 0 serious issues
- [ ] AC2: Se puede completar registro y login usando solo teclado
- [ ] AC3: VoiceOver/TalkBack lee correctamente elementos interactivos
- [ ] AC4: Focus es visible y lógico en todos los formularios

---

### #52 — Final UI polish and consistency check
**Etiquetas:** `frontend`, `polish`  
**Dependencias:** #46, #47, #48, #49, #50, #51 (último)

#### 4.7.1 Tareas

1. **Consistencia de colores**:
   - Buscar valores hex/rgb hardcodeados en todos los `.scss`:
     ```bash
     grep -r "#[0-9a-fA-F]\{3,6\}\|rgba\?\|rgb(" src/app/pages/ --include="*.scss" | grep -v "variables"
     ```
   - Reemplazar por CSS variables.
   - Excepciones: colores de animaciones con opacidad pueden usar rgba sobre variables.

2. **Tipografía**:
   - Verificar que todas las páginas usan `var(--font-sans)`.
   - Jerarquía: `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`.
   - No hay `font-size` fijos en px excepto root.

3. **Espaciado (8px grid)**:
   - Revisar márgenes/paddings que usen valores arbitrarios (`13px`, `17px`, etc.).
   - Convertir a `var(--space-*)` (múltiplos de 4 o 8).

4. **Iconografía**:
   - Verificar que todos los íconos vienen de Ionicons.
   - Consistencia de tamaño: `slot="icon-only"` usa tamaños default; íconos inline usan `font-size` consistente.

5. **Labels y textos**:
   - Revisión ortográfica manual de todas las páginas (buscar textos hardcodeados en HTML).
   - Asegurar consistencia: "Iniciar sesión" vs "Login", "Encuesta" vs "Survey", etc.
   - Usar mayúsculas consistentes (título vs oración).

6. **Botones**:
   - Todos los botones primarios usan `expand="block"` o `shape="round"` de forma consistente.
   - Altura consistente (Ionic default es buena).
   - `border-radius` consistente (usar `var(--radius-md)`, `var(--radius-lg)`).

7. **Dark mode consistency check**:
   - Recorrer todas las páginas en dark mode y anotar elementos con colores incorrectos.
   - Corregir.

#### 4.7.2 Archivos a crear/modificar

```
MOD  src/app/pages/*/*.scss  (todas las páginas)
MOD  src/app/pages/*/*.html  (textos hardcodeados)
MOD  src/app/styles/*.scss   (consistencia global)
```

#### 4.7.3 Criterios de aceptación

- [ ] AC1: Mismo componente se ve idéntico en diferentes páginas
- [ ] AC2: Colores usan variables CSS, no valores hardcodeados
- [ ] AC3: Sin errores ortográficos en la interfaz
- [ ] AC4: Dark mode no tiene elementos con colores incorrectos

---

## 5. Componentes reutilizables a crear

| Componente | Ruta | Usado en |
|------------|------|----------|
| `EmptyStateComponent` | `shared/components/empty-state/` | Todas las listas vacías |
| `ErrorStateComponent` | `shared/components/error-state/` | Todas las cargas con error |
| `SkeletonListComponent` | `shared/components/skeleton-list/` | Todas las listas en loading |

---

## 6. Servicios a crear

| Servicio | Ruta | Responsabilidad |
|----------|------|-----------------|
| `ToastService` | `core/services/toast.service.ts` | Toasts globales (error/success/warning/info) |
| `ErrorHandlerService` | `core/services/error-handler.service.ts` | Manejo uniforme de errores HTTP |
| `FormValidationService` | `core/services/form-validation.service.ts` | Mensajes de validación en español |
| `ThemeService` | `core/services/theme.service.ts` | Dark mode toggle + persistencia |

---

## 7. Testing Strategy

### 7.1 Tests unitarios (Vitest)

| Servicio/Componente | Tests |
|---------------------|-------|
| `ToastService` | 4 tests (error, success, warning, info) |
| `ErrorHandlerService` | 5 tests (401, 403, 404, 500, network) |
| `FormValidationService` | 5 tests (required, email, minlength, maxlength, pattern) |
| `ThemeService` | 4 tests (toggle, init, persist, system) |
| `EmptyStateComponent` | 2 tests (render, action click) |
| `ErrorStateComponent` | 2 tests (render, retry click) |
| `SkeletonListComponent` | 2 tests (render count, type variant) |

**Total mínimo: 24 tests nuevos.**

### 7.2 Tests manuales / visual

- [ ] 320px viewport: todas las páginas sin scroll horizontal
- [ ] 768px viewport: grids de 2 columnas
- [ ] 1024px viewport: navegación adaptada
- [ ] Dark mode: recorrido completo de login → dashboard → cada módulo
- [ ] Keyboard: completar login, registro, y crear FAQ sin mouse
- [ ] axe DevTools: 0 critical + 0 serious en 5 páginas representativas

---

## 8. Estrategia de commits

Cada issue es un commit (o un grupo de commits pequeños por issue). Ejemplo:

```
feat(M6): #50 error handling and toast notifications
feat(M6): #51 loading states and empty states
feat(M6): #47 animations and transitions
feat(M6): #46 responsive design for all pages
feat(M6): #48 dark mode support
feat(M6): #49 accessibility improvements
feat(M6): #52 final UI polish and consistency
```

---

## 9. Definition of Done (M6 completo)

- [ ] Las 7 issues de GitHub están cerradas
- [ ] Todos los ACs de cada issue están verificados
- [ ] `ng lint` pasa sin errores
- [ ] Todos los tests unitarios pasan (24+ nuevos + 24 existentes)
- [ ] Build de producción (`npm run build`) compila sin errores
- [ ] Recorrido manual en 3 viewports (320, 768, 1024) sin scroll horizontal
- [ ] Dark mode recorrido completo sin colores rotos
- [ ] axe DevTools: 0 critical, 0 serious
- [ ] Commit final en `M6`, merge a `master`, push

---

## 10. Riesgos y mitigaciones

| Riesgo | Prob. | Impacto | Mitigación |
|--------|-------|---------|------------|
| Cambiar 30 páginas genera regresiones | Media | Alto | Cambios atómicos por issue; testear cada issue antes de pasar al siguiente |
| Dark mode rompe colores de M3-M5 | Media | Medio | Probar página por página; mantener lista de verificación |
| A11y requiere cambios estructurales (DOM) | Baja | Medio | Aplicar solo donde no afecte funcionalidad; evitar tabindex positivos |
| Responsive design requiere rediseño de tablas/listas | Baja | Medio | Usar `overflow-x: auto` como fallback temporal |

---

*Plan creado el 2026-06-22 para la rama `M6`.*
