# UniHub — Plan de Rediseño Frontend

> **Versión**: 1.0
> **Fecha**: Mayo 2026
> **Stack**: Ionic 8.8.6 + Angular 21.2 + SCSS
> **Alcance**: CSS/Theme refactor. Cero cambios de lógica. 6–8 horas de trabajo.

---

## Tabla de Contenidos

1. [Contexto y Estado Actual](#1-contexto-y-estado-actual)
2. [Sistema de Design Tokens](#2-sistema-de-design-tokens)
3. [Estrategia Tipográfica](#3-estrategia-tipográfica)
4. [Paleta de Color Mejorada](#4-paleta-de-color-mejorada)
5. [Arquitectura de Archivos] (#5-arquitectura-de-archivos)
6. [Mixins y Partials SCSS](#6-mixins-y-partials-scss)
7. [Plan de Consolidación de Componentes](#7-plan-de-consolidación-de-componentes)
8. [Dark Mode](#8-dark-mode)
9. [Animaciones y Micro-interacciones](#9-animaciones-y-micro-interacciones)
10. [Estrategia de Migración](#10-estrategia-de-migración)
11. [Checklist de Ejecución](#11-checklist-de-ejecución)
12. [Riesgos y Mitigaciones](#12-riesgos-y-mitigaciones)

---

## 1. Contexto y Estado Actual

### 1.1 Hallazgos del Audit

| Problema | Impacto | Severidad |
|----------|---------|-----------|
| Inter declarada pero nunca cargada | App renderiza con fuente del sistema | **Crítico** |
| 13/22 páginas sin archivo `.scss` (estilos inline) | CSS duplicado, difícil de mantener | **Alto** |
| 10+ ubicaciones con estilos de card duplicados | Inconsistencia visual, viola DRY | **Alto** |
| 4 implementaciones diferentes de empty-state | Experiencia de usuario fragmentada | **Medio** |
| 3 patrones de loading distintos (skeleton/spinner/text) | Inconsistencia de UX | **Medio** |
| `.auth-container` duplicado en 4 páginas con variaciones | Difícil mantener consistencia visual | **Medio** |
| Patrón de Toast duplicado ~15 páginas (`showToast` + `toastMessage`) | Boilerplate innecesario | **Bajo** |
| No existe design system formal | Cada página reinventa estilos | **Alto** |
| 5 páginas placeholder sin ningún estilo | M4/M5 no tendrán base | **Medio** |
| `app.scss` completamente vacío | Oportunidad perdida para estilos globales | **Medio** |

### 1.2 Principios Rectores del Rediseño

1. **Zero breaking changes** — solo CSS/tema, sin tocar lógica de componentes
2. **Mobile-first** — diseñado para pantallas 360–430px, adaptable a tablet
3. **Progressive enhancement** — empezar con lo que existe, mejorar sin reescribir
4. **Design tokens sobre valores hardcodeados** — cada valor repetido se convierte en token
5. **Convención sobre configuración** — un solo lugar para cada tipo de estilo

---

## 2. Sistema de Design Tokens

### 2.1 Filosofía

Tres capas de tokens:
- **Capa 1 — Primitivos de marca**: colores base, no cambian
- **Capa 2 — Tokens semánticos**: qué representan (`--surface-card`, `--text-primary`)
- **Capa 3 — Tokens de componente**: específicos de Ionic (`--ion-color-*`)

### 2.2 Archivo: `src/theme/tokens.css`

```css
/* ============================================
   UniHub Design Tokens v1.0
   Carga: importado desde theme/variables.css
   ============================================ */

:root {
  /* ── Espaciado (8px grid system) ── */
  --space-0:   0;
  --space-1:   4px;
  --space-2:   8px;
  --space-3:   12px;
  --space-4:   16px;
  --space-5:   20px;
  --space-6:   24px;
  --space-8:   32px;
  --space-10:  40px;
  --space-12:  48px;

  /* ── Tipografía ── */
  --font-sans:  'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono:  'SF Mono', 'Fira Code', 'Cascadia Code', monospace;

  /* Type scale (1.25 ratio — Major Third) */
  --text-xs:    0.75rem;    /* 12px — labels, badges */
  --text-sm:    0.8125rem;  /* 13px — secondary text */
  --text-base:  0.9375rem;  /* 15px — body (mobile-optimized) */
  --text-md:    1rem;       /* 16px — card titles, buttons */
  --text-lg:    1.125rem;   /* 18px — section headers */
  --text-xl:    1.25rem;    /* 20px — page subtitles */
  --text-2xl:   1.5rem;     /* 24px — page titles */
  --text-3xl:   2rem;       /* 32px — hero/auth titles */

  /* Font weights */
  --weight-normal: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700;

  /* Line heights */
  --leading-tight:   1.2;
  --leading-normal:  1.5;
  --leading-relaxed: 1.65;

  /* ── Border Radius ── */
  --radius-sm:    8px;    /* inputs, chips, small buttons */
  --radius-md:    12px;   /* cards, modals (default) */
  --radius-lg:    16px;   /* large cards, sheets */
  --radius-full:  9999px; /* badges, avatars, pills */

  /* ── Sombras (elevation tokens) ── */
  --shadow-none:  0 0 0 rgba(0,0,0,0);
  --shadow-xs:    0 1px 2px rgba(0,0,0,0.05);
  --shadow-sm:    0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06);
  --shadow-md:    0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06);
  --shadow-lg:    0 10px 15px rgba(0,0,0,0.06), 0 4px 6px rgba(0,0,0,0.05);
  --shadow-xl:    0 20px 25px rgba(0,0,0,0.08), 0 8px 10px rgba(0,0,0,0.05);

  /* Card shadow (tokens used by _cards.scss) */
  --card-shadow:  var(--shadow-sm);
  --card-shadow-hover: var(--shadow-md);

  /* ── Transiciones ── */
  --transition-fast:    150ms ease;
  --transition-base:    250ms ease;
  --transition-slow:    350ms ease;
  --transition-page:    300ms cubic-bezier(0.4, 0, 0.2, 1);

  /* ── Z-Index Scale ── */
  --z-dropdown: 100;
  --z-sticky:   200;
  --z-overlay:  300;
  --z-modal:    400;
  --z-toast:    500;

  /* ── Semantic Surface Colors ── */
  --surface-page:       var(--ion-color-light);
  --surface-card:       #ffffff;
  --surface-card-hover: #fafbfc;
  --surface-input:      #f5f6f8;
  --surface-skeleton:   #e8ebef;
  --surface-overlay:    rgba(44, 62, 80, 0.4); /* dark at 40% */

  /* ── Semantic Border Colors ── */
  --border-subtle:  var(--ion-color-light-shade);   /* #dadbdc */
  --border-default: var(--ion-color-step-200, #e0e0e0);
  --border-strong:  var(--ion-color-step-400, #b0b0b0);
  --border-focus:   var(--ion-color-primary, #1E3A5F);

  /* ── Semantic Text Colors ── */
  --text-primary:    var(--ion-color-dark);            /* #2C3E50 */
  --text-secondary:  var(--ion-color-medium);          /* #95A5A6 */
  --text-tertiary:   var(--ion-color-step-500, #888);  /* placeholder/muted */
  --text-on-primary: var(--ion-color-primary-contrast); /* white */
  --text-link:       var(--ion-color-secondary);       /* #4A90D9 */

  /* ── Semantic Feedback Colors ── */
  --feedback-success-bg: #edf7f1;
  --feedback-warning-bg: #fef8e7;
  --feedback-danger-bg:  #fdedeb;
  --feedback-info-bg:    #edf2f9;

  /* ── Layout ── */
  --content-max-width: 480px;   /* mobile max width centered */
  --content-padding:   var(--space-4);  /* 16px default padding */
  --header-height:     56px;     /* ion-toolbar height reference */
  --bottom-tab-height: 56px;
}
```

### 2.3 Archivo: `src/theme/tokens.css` — Capa de Componentes

```css
/* ============================================
   Component Tokens — mapean diseño a Ionic
   ============================================ */

:root {
  /* ── IonCard overrides ── */
  --ion-card-border-radius: var(--radius-md);
  --ion-card-box-shadow:    var(--card-shadow);
  --ion-card-margin:        var(--space-2) var(--space-4);

  /* ── IonButton overrides ── */
  --ion-button-border-radius: var(--radius-md);
  --ion-button-font-weight:   var(--weight-semibold);
  --ion-button-font-size:     var(--text-base);

  /* ── IonBadge overrides ── */
  --ion-badge-border-radius: var(--radius-full);
  --ion-badge-font-size:     var(--text-xs);

  /* ── IonInput / IonTextarea overrides ── */
  --ion-input-border-radius: var(--radius-sm);
  --ion-input-background:    var(--surface-input);

  /* ── IonToolbar / IonHeader overrides ── */
  --ion-toolbar-background: var(--ion-color-primary);
  --ion-toolbar-color:      var(--text-on-primary);

  /* ── IonTabBar overrides ── */
  --ion-tab-bar-background: #ffffff;
  --ion-tab-bar-border-color: var(--border-subtle);
}
```

### 2.4 Archivo: `src/theme/utilities.css`

```css
/* ============================================
   Utility Classes — atomic helpers
   Usa con moderación (preferir mixins/partials)
   ============================================ */

/* ── Layout ── */
.u-flex-center { display: flex; align-items: center; justify-content: center; }
.u-flex-between { display: flex; align-items: center; justify-content: space-between; }
.u-flex-col { display: flex; flex-direction: column; }
.u-gap-1 { gap: var(--space-1); }
.u-gap-2 { gap: var(--space-2); }
.u-gap-3 { gap: var(--space-3); }
.u-gap-4 { gap: var(--space-4); }

/* ── Text ── */
.u-text-center { text-align: center; }
.u-text-secondary { color: var(--text-secondary); }
.u-text-xs { font-size: var(--text-xs); }
.u-text-sm { font-size: var(--text-sm); }

/* ── Spacing ── */
.u-p-4 { padding: var(--space-4); }
.u-px-4 { padding-left: var(--space-4); padding-right: var(--space-4); }
.u-py-4 { padding-top: var(--space-4); padding-bottom: var(--space-4); }
.u-mt-2 { margin-top: var(--space-2); }
.u-mt-4 { margin-top: var(--space-4); }
.u-mb-4 { margin-bottom: var(--space-4); }

/* ── Visibility ── */
.u-sr-only { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); }
.u-hidden { display: none !important; }
```

---

## 3. Estrategia Tipográfica

### 3.1 Carga de Inter

**Problema**: `--ion-font-family` referencia Inter pero nunca se carga. La app usa fallback del sistema.

**Solución**: Cargar Inter vía `<link>` en `index.html`, con `font-display: swap` para evitar FOIT.

```html
<!-- Agregar en <head> de src/index.html, ANTES de </head> -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

**Pesos cargados**: 400, 500, 600, 700 (sin italics, sin pesos extra — budget consciente).

**Trade-off**: Google Fonts añade ~40KB (woff2 cacheado). Alternativa sería self-host con `@fontsource/inter` (npm), pero añade dependencia. Google Fonts CDN es más simple y tiene cache cross-site.

### 3.2 Escala Tipográfica Aplicada

| Token | Tamaño | Uso |
|-------|--------|-----|
| `--text-xs` | 12px | Badges, labels pequeños, `.card-date` |
| `--text-sm` | 13px | Texto secundario, metadata |
| `--text-base` | 15px | Body text (optimizado mobile) |
| `--text-md` | 16px | Títulos de card, botones |
| `--text-lg` | 18px | Section headers |
| `--text-xl` | 20px | Subtítulos de página |
| `--text-2xl` | 24px | Títulos de página |
| `--text-3xl` | 32px | Títulos hero/auth |

### 3.3 Convención de Headings

```scss
// En app.scss — estandarizar headings globales
h1, .h1 { font-size: var(--text-2xl); font-weight: var(--weight-bold); line-height: var(--leading-tight); }
h2, .h2 { font-size: var(--text-lg); font-weight: var(--weight-semibold); line-height: var(--leading-tight); }
h3, .h3 { font-size: var(--text-md); font-weight: var(--weight-semibold); }
```

---

## 4. Paleta de Color Mejorada

### 4.1 Colores Existentes (Se Preservan)

```css
/* -- NO SE MODIFICAN -- */
--ion-color-primary:    #1E3A5F  /* dark navy */
--ion-color-secondary:  #4A90D9  /* sky blue */
--ion-color-tertiary:   #6C5CE7  /* purple */
--ion-color-success:    #27AE60
--ion-color-warning:    #F39C12
--ion-color-danger:     #E74C3C
--ion-color-dark:       #2C3E50
--ion-color-medium:     #95A5A6
--ion-color-light:      #F8F9FA
```

### 4.2 Tokens Semánticos Adicionales

```css
/* Agregar a src/theme/variables.css */

:root {
  /* ── Step colors para gradientes finos (Ionic built-in) ── */
  --ion-color-primary-step-50:  #e8ecf1;
  --ion-color-primary-step-100: #d1d9e3;
  --ion-color-primary-step-200: #a3b3c8;
  --ion-color-primary-step-300: #768dac;
  --ion-color-primary-step-400: #486791;
  --ion-color-primary-step-500: #1E3A5F;  /* = primary */
  --ion-color-primary-step-600: #1a3354;
  --ion-color-primary-step-700: #162b49;
  --ion-color-primary-step-800: #12243e;
  --ion-color-primary-step-900: #0e1c33;

  /* ── Neutral step colors ── */
  --ion-color-step-50:   #fafafa;
  --ion-color-step-100:  #f5f5f5;
  --ion-color-step-150:  #eeeeee;
  --ion-color-step-200:  #e0e0e0;
  --ion-color-step-300:  #c0c0c0;
  --ion-color-step-400:  #b0b0b0;
  --ion-color-step-500:  #888888;
  --ion-color-step-600:  #666666;
  --ion-color-step-700:  #444444;
  --ion-color-step-800:  #333333;
  --ion-color-step-900:  #1a1a1a;
}
```

### 4.3 Colores Semánticos de Feedback

```css
/* Agregar a tokens.css */
:root {
  --color-success-light: #edf7f1;
  --color-success-border: #a3d9b1;
  --color-warning-light: #fef8e7;
  --color-warning-border: #f9d77e;
  --color-danger-light: #fdedeb;
  --color-danger-border: #f5b7b1;
  --color-info-light: #edf2f9;
  --color-info-border: #b3cbe8;
}
```

---

## 5. Arquitectura de Archivos

### 5.1 Estructura Propuesta

```
src/
├── index.html                          # [MODIFICAR] Agregar Google Fonts <link>
├── styles.scss                         # [MODIFICAR] Agregar @import de nuevos partials
├── theme/
│   ├── variables.css                   # [MODIFICAR] Agregar step colors
│   ├── tokens.css                      # [NUEVO] Design tokens
│   └── utilities.css                   # [NUEVO] Clases utilitarias
├── app/
│   ├── app.scss                        # [MODIFICAR] Estilos globales de app
│   └── styles/
│       ├── _index.scss                 # [NUEVO] Barrel file para partials
│       ├── _cards.scss                 # [NUEVO] Estilos de card compartidos
│       ├── _empty-states.scss          # [NUEVO] Estados vacíos
│       ├── _loading-states.scss        # [NUEVO] Estados de carga
│       ├── _auth.scss                  # [NUEVO] Contenedores de auth forms
│       ├── _forms.scss                 # [NUEVO] Formularios
│       ├── _badges.scss                # [NUEVO] Badges, chips, etiquetas
│       ├── _dashboard.scss             # [NUEVO] Dashboard widgets (metric cards)
│       ├── _animations.scss            # [NUEVO] Keyframes y clases de animación
│       └── _dark-mode.scss             # [NUEVO] Tema oscuro (opcional M5)
```

### 5.2 Archivos a MODIFICAR (en orden)

| # | Archivo | Cambio |
|---|---------|--------|
| 1 | `src/index.html` | Agregar `<link>` Google Fonts |
| 2 | `src/theme/variables.css` | Agregar step colors |
| 3 | `src/theme/tokens.css` | **NUEVO** — Design tokens |
| 4 | `src/theme/utilities.css` | **NUEVO** — Utilidades |
| 5 | `src/styles.scss` | Importar tokens, utilities, y styles/_index |
| 6 | `src/app/app.scss` | Estilos base globales (headings, scroll, safe-area) |
| 7 | `src/app/styles/_cards.scss` | **NUEVO** |
| 8 | `src/app/styles/_empty-states.scss` | **NUEVO** |
| 9 | `src/app/styles/_loading-states.scss` | **NUEVO** |
| 10 | `src/app/styles/_auth.scss` | **NUEVO** |
| 11 | `src/app/styles/_forms.scss` | **NUEVO** |
| 12 | `src/app/styles/_badges.scss` | **NUEVO** |
| 13 | `src/app/styles/_dashboard.scss` | **NUEVO** |
| 14 | `src/app/styles/_animations.scss` | **NUEVO** |
| 15 | `src/app/styles/_index.scss` | **NUEVO** — barrel |
| 16 | **Páginas con inline styles** (10 archivos) | Extraer a `.scss` |
| 17 | **Páginas con `.scss` existente** (10 archivos) | Refactorizar para usar partials |
| 18 | **Shared components** (2 archivos) | Refactorizar para usar partials |

---

## 6. Mixins y Partials SCSS

### 6.1 `src/app/styles/_cards.scss`

```scss
/* ============================================
   Card System — unifica .admin-card, .survey-card,
   .event-card, .question-card, .announcement-card,
   .notice-card, .dashboard-card
   ============================================ */

/* ── Base Card ── */
%card-base {
  margin: var(--space-2) 0;
  border-radius: var(--radius-md);
  box-shadow: var(--card-shadow);
}

.card {
  @extend %card-base;
}

/* ── Card Variants ── */
.card-admin {
  @extend %card-base;
}

.card-survey {
  @extend %card-base;
}

.card-event {
  @extend %card-base;
}

.card-question {
  @extend %card-base;
  margin: var(--space-3) 0;
}

.card-dashboard {
  @extend %card-base;
  text-align: center;
  cursor: pointer;
  --background: var(--card-color);
  --color: #fff;
}

.card-high-priority {
  @extend %card-base;
  border-left: 4px solid var(--ion-color-danger);
}

.card-expired {
  opacity: 0.6;
}

.card-disabled {
  opacity: 0.7;
  pointer-events: none;
}

/* ── Card Meta (metadata row inside card header) ── */
.card-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-1);
}

/* ── Card Date (small muted date text) ── */
.card-date {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

/* ── Card Body (pre-line content) ── */
.card-body {
  white-space: pre-line;
  line-height: var(--leading-normal);
  color: var(--ion-color-step-600, #666);
}

.card-body-clamped {
  @extend .card-body;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

/* ── Card Actions (button row at bottom) ── */
.card-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-1);
  margin-top: var(--space-2);
}

/* ── Card Icons ── */
.card-icon-pinned {
  color: var(--ion-color-warning);
  margin-right: var(--space-1);
  vertical-align: middle;
}

.card-icon-alert {
  color: var(--ion-color-danger);
  margin-right: var(--space-1);
  vertical-align: middle;
}

.card-icon-large {
  font-size: var(--text-3xl);
  margin-bottom: var(--space-2);
}

/* ── Card Title ── */
.card-title-sm {
  font-size: var(--text-md);
  font-weight: var(--weight-semibold);
}
```

### 6.2 `src/app/styles/_empty-states.scss`

```scss
/* ============================================
   Empty State System — unifica 4 implementaciones
   ============================================ */

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--space-8) var(--space-6);
  color: var(--text-secondary);
  min-height: 200px;

  /* Icono central */
  .empty-state-icon {
    font-size: 3rem;
    margin-bottom: var(--space-4);
    color: var(--ion-color-step-300, #c0c0c0);
  }

  /* Texto principal */
  .empty-state-text {
    font-size: var(--text-lg);
    font-weight: var(--weight-medium);
    color: var(--text-secondary);
    margin-bottom: var(--space-2);
  }

  /* Texto secundario */
  .empty-state-subtext {
    font-size: var(--text-sm);
    color: var(--ion-color-step-500, #888);
    margin-bottom: var(--space-4);
  }
}

/* Variante compacta (usada en listas) */
.empty-state-compact {
  @extend .empty-state;
  min-height: auto;
  padding: var(--space-6) var(--space-4);
}

/* Variante para cuando hay error */
.empty-state-error {
  @extend .empty-state;
  color: var(--ion-color-danger);

  .empty-state-icon {
    color: var(--ion-color-danger);
  }
}
```

### 6.3 `src/app/styles/_loading-states.scss`

```scss
/* ============================================
   Loading State System — unifica skeleton/spinner/text
   ============================================ */

/* ── Spinner Centered ── */
.loading-spinner {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  padding: var(--space-12) 0;
}

/* ── Skeleton Pulse Animation (defined in _animations.scss) ── */

.skeleton {
  background: var(--surface-skeleton);
  border-radius: var(--radius-sm);
  animation: skeleton-pulse 1.5s ease-in-out infinite;

  &-text {
    height: var(--text-base);
    margin-bottom: var(--space-2);
    width: 100%;
  }

  &-text-sm {
    height: var(--text-sm);
    width: 60%;
    margin-bottom: var(--space-2);
  }

  &-title {
    height: var(--text-lg);
    width: 80%;
    margin-bottom: var(--space-3);
  }

  &-card {
    height: 120px;
    margin-bottom: var(--space-3);
    border-radius: var(--radius-md);
  }

  &-avatar {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-full);
  }
}

/* ── Skeleton Card (completa) ── */
.skeleton-card {
  margin: var(--space-2) 0;
  border-radius: var(--radius-md);
  padding: var(--space-4);
  background: var(--surface-card);
  box-shadow: var(--card-shadow);
}
```

### 6.4 `src/app/styles/_auth.scss`

```scss
/* ============================================
   Auth Layout — unifica .auth-container x4
   ============================================ */

.auth-container {
  max-width: var(--content-max-width);
  margin: var(--space-8) auto;
  padding: 0 var(--space-4);
  text-align: center;

  h1 {
    font-size: var(--text-3xl);
    font-weight: var(--weight-bold);
    color: var(--ion-color-primary);
    margin-bottom: var(--space-1);
    line-height: var(--leading-tight);
  }

  .subtitle {
    color: var(--text-secondary);
    margin-bottom: var(--space-8);
    font-size: var(--text-base);
  }

  form {
    text-align: left;
  }
}

.auth-links {
  margin-top: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  align-items: center;

  a, .auth-link {
    color: var(--text-link);
    text-decoration: none;
    font-weight: var(--weight-medium);
    font-size: var(--text-sm);

    &:hover, &:active {
      text-decoration: underline;
    }
  }
}

/* Mensaje de éxito post-acción (ej. forgot password) */
.auth-success {
  padding: var(--space-4);

  p {
    color: var(--text-secondary);
    margin-bottom: var(--space-4);
    text-align: center;
  }
}
```

### 6.5 `src/app/styles/_forms.scss`

```scss
/* ============================================
   Form System — unifica form-actions, option-row
   ============================================ */

/* ── Form Actions (botones al final del form) ── */
.form-actions {
  padding: var(--space-4) 0;
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

/* ── Section Title dentro de forms ── */
.form-section-title {
  font-size: var(--text-lg);
  font-weight: var(--weight-semibold);
  margin: var(--space-4) 0 var(--space-2);
  color: var(--ion-color-primary);
}

/* ── Required Star ── */
.required-star {
  color: var(--ion-color-danger);
  margin-left: 2px;
}

/* ── Option Row (para opciones de preguntas) ── */
.option-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: var(--space-1) 0;

  ion-input {
    flex: 1;
  }
}

/* ── Form Error Text ── */
.form-error {
  font-size: var(--text-sm);
  color: var(--ion-color-danger);
  margin-bottom: var(--space-2);
}

/* ── ion-item sin bordes (para radio/checkbox en surveys) ── */
.item-borderless {
  --border-style: none;
  --padding-start: 0;
}

/* ── Rating Stars ── */
.stars-container {
  display: flex;
  gap: var(--space-2);
  justify-content: center;
  font-size: 2rem;
  padding: var(--space-2) 0;

  ion-icon {
    cursor: pointer;
    color: var(--ion-color-warning);
    transition: transform var(--transition-fast);
  }

  ion-icon:hover {
    transform: scale(1.2);
  }

  ion-icon.selected {
    color: var(--ion-color-warning-shade);
  }
}
```

### 6.6 `src/app/styles/_badges.scss`

```scss
/* ============================================
   Badge System
   ============================================ */

.badge-pill {
  font-size: var(--text-xs);
  padding: var(--space-1) 10px;
  border-radius: var(--radius-full);
  font-weight: var(--weight-medium);
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}

.badge-count {
  background: var(--ion-color-primary);
  color: #fff;
  font-size: var(--text-xs);
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  font-weight: var(--weight-semibold);
  display: inline-block;
}

.badge-status {
  @extend .badge-pill;

  &--active   { background: var(--color-success-light); color: var(--ion-color-success); }
  &--expired  { background: var(--color-danger-light);  color: var(--ion-color-danger); }
  &--draft    { background: var(--color-warning-light);  color: var(--ion-color-warning); }
}
```

### 6.7 `src/app/styles/_dashboard.scss`

```scss
/* ============================================
   Dashboard Widgets — admin + tab dashboard
   ============================================ */

/* ── Métricas en fila ── */
.metrics-row {
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-6);
  flex-wrap: wrap;
}

.metric-card {
  flex: 1;
  min-width: 100px;
  background: var(--surface-card);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  text-align: center;
  box-shadow: var(--shadow-xs);
}

.metric-value {
  display: block;
  font-size: var(--text-xl);
  font-weight: var(--weight-bold);
  color: var(--ion-color-primary);
}

.metric-label {
  display: block;
  font-size: var(--text-xs);
  color: var(--text-secondary);
  margin-top: var(--space-1);
}

/* ── Dashboard sections ── */
.dashboard-section {
  padding: var(--space-3) var(--space-4);

  + .dashboard-section {
    border-top: 1px solid var(--border-subtle);
  }
}

.dashboard-section-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);

  h2 {
    font-size: var(--text-lg);
    font-weight: var(--weight-semibold);
    margin: 0;
    flex: 1;
  }
}

.dashboard-section-icon {
  font-size: var(--text-lg);
  color: var(--text-secondary);
}

/* ── Filter Chips (horizontal scroll) ── */
.filter-chips {
  display: flex;
  gap: var(--space-1);
  overflow-x: auto;
  padding-bottom: var(--space-2);

  &::-webkit-scrollbar { display: none; }
  -ms-overflow-style: none;
  scrollbar-width: none;
}
```

### 6.8 `src/app/styles/_animations.scss`

```scss
/* ============================================
   Animation System
   ============================================ */

/* ── Fade In (page elements) ── */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes fadeOut {
  from { opacity: 1; }
  to   { opacity: 0; }
}

/* ── Skeleton Pulse ── */
@keyframes skeleton-pulse {
  0%   { opacity: 0.6; }
  50%  { opacity: 1; }
  100% { opacity: 0.6; }
}

/* ── Scale In (modals, dialogs) ── */
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1); }
}

/* ── Slide In (sheets, toasts) ── */
@keyframes slideInUp {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}

@keyframes slideInDown {
  from { transform: translateY(-100%); }
  to   { transform: translateY(0); }
}

/* ── Utility Animation Classes ── */
.animate-fade-in {
  animation: fadeIn var(--transition-base) ease forwards;
}

.animate-fade-in-up {
  animation: fadeInUp var(--transition-slow) ease forwards;
}

/* ── Stagger children ── */
.animate-stagger > * {
  opacity: 0;
  animation: fadeIn var(--transition-base) ease forwards;
}

.animate-stagger > *:nth-child(1) { animation-delay: 0ms; }
.animate-stagger > *:nth-child(2) { animation-delay: 50ms; }
.animate-stagger > *:nth-child(3) { animation-delay: 100ms; }
.animate-stagger > *:nth-child(4) { animation-delay: 150ms; }
.animate-stagger > *:nth-child(5) { animation-delay: 200ms; }
.animate-stagger > *:nth-child(6) { animation-delay: 250ms; }
.animate-stagger > *:nth-child(7) { animation-delay: 300ms; }
.animate-stagger > *:nth-child(8) { animation-delay: 350ms; }

/* ── Hover/Press micro-interactions ── */
@media (hover: hover) {
  .card-pressable {
    transition: transform var(--transition-fast), box-shadow var(--transition-fast);

    &:hover {
      transform: translateY(-1px);
      box-shadow: var(--card-shadow-hover);
    }

    &:active {
      transform: scale(0.98);
    }
  }
}

/* ── Reduced Motion ── */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 6.9 `src/app/styles/_index.scss` (Barrel)

```scss
/* ============================================
   UniHub Styles — Barrel File
   Importa todos los partials en orden de dependencia
   ============================================ */

@import 'animations';       /* keyframes primero (otros dependen) */
@import 'cards';
@import 'auth';
@import 'forms';
@import 'badges';
@import 'dashboard';
@import 'empty-states';
@import 'loading-states';
```

### 6.10 `src/styles.scss` (Modificaciones)

```scss
/* ── Tema y tokens (deben cargar primero) ── */
@import 'theme/variables.css';
@import 'theme/tokens.css';
@import 'theme/utilities.css';

/* ── Partials de diseño ── */
@import 'app/styles/index';

/* ── Resets y fixes globales ── */
.ion-page.ion-page-hidden,
app-login.ion-page-hidden,
app-register.ion-page-hidden {
  display: none !important;
}

app-root {
  display: block;
  position: absolute;
  top: 0; right: 0; bottom: 0; left: 0;
  z-index: 0;
}

html {
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  margin: 0;
  padding: 0;
  font-family: var(--font-sans);
  color: var(--text-primary);
  background: var(--surface-page);
}

ion-content {
  --padding-top: var(--ion-safe-area-top, 0);
  --padding-bottom: var(--ion-safe-area-bottom, 0);
}

/* ── Scrollbar hide for horizontal scroll containers ── */
.hide-scrollbar {
  &::-webkit-scrollbar { display: none; }
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* ── Safe area aware ── */
.safe-area-bottom {
  padding-bottom: var(--ion-safe-area-bottom, var(--space-4));
}
```

### 6.11 `src/app/app.scss` (Nuevo Contenido)

```scss
/* ============================================
   App Root Styles
   ============================================ */

/* ── Global heading resets ── */
h1 { font-size: var(--text-2xl); font-weight: var(--weight-bold); line-height: var(--leading-tight); }
h2 { font-size: var(--text-lg); font-weight: var(--weight-semibold); }
h3 { font-size: var(--text-md); font-weight: var(--weight-semibold); }
h4 { font-size: var(--text-base); font-weight: var(--weight-medium); }

/* ── Link defaults ── */
a {
  color: var(--text-link);
  text-decoration: none;

  &:hover { text-decoration: underline; }
}

/* ── Focus visible (accessibility) ── */
:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 2px;
}

/* ── Selection color ── */
::selection {
  background: var(--ion-color-primary);
  color: var(--text-on-primary);
}
```

---

## 7. Plan de Consolidación de Componentes

### 7.1 Páginas con `styles:` Inline → Extraer a `.scss`

Cada página que actualmente usa `styles:` inline debe:

1. **Crear** archivo `.page.scss` vacío en su directorio
2. **Mover** el contenido de `styles:` al `.page.scss`
3. **Reemplazar** `styles: `...`` por `styleUrl: './nombre.page.scss'`
4. **Reemplazar** valores hardcodeados por tokens y clases de partials

**Lista de páginas a migrar (10 archivos):**

| # | Página | Líneas inline | Prioridad |
|---|--------|---------------|-----------|
| 1 | `admin-announcements` | 9 reglas | Alta |
| 2 | `admin-notices` | 8 reglas | Alta |
| 3 | `admin-surveys` | 9 reglas | Alta |
| 4 | `survey-form` | 17 reglas | Alta |
| 5 | `survey-response` | 18 reglas | Alta |
| 6 | `survey-results` | 12 reglas | Alta |
| 7 | `announcement-form` | 1 regla | Media |
| 8 | `notice-form` | 1 regla | Media |
| 9 | `admin-events` | 0 (stub) | Baja |
| 10 | `admin-faq` | 0 (stub) | Baja |

### 7.2 Shared Components → Usar Partials

| Componente | Cambio |
|------------|--------|
| `AnnouncementCard` | Extraer `styles:` a `.component.scss`. Usar `@extend %card-base;` de `_cards.scss`. |
| `NoticeCard` | Extraer `styles:` a `.component.scss`. Usar `@extend %card-base;` de `_cards.scss`. |

### 7.3 Páginas con `.scss` Existente → Refactorizar

| Página | Duplicaciones a eliminar |
|--------|--------------------------|
| `tab-dashboard` | `.empty-state`, `.event-card`, `.survey-card`, `.card-meta` → usar `_cards.scss` |
| `tab-surveys` | `.survey-card`, `.card-meta`, `.empty-state` → usar partials |
| `login` | `.auth-container`, `.auth-links` → usar `_auth.scss` |
| `register` | `.auth-container`, `.auth-links` → usar `_auth.scss` |
| `forgot-password` | `.auth-container`, `.subtitle` → usar `_auth.scss` |
| `reset-password` | `.auth-container` → usar `_auth.scss` |
| `admin-dashboard` | `.dashboard-card`, `.metric-card` → usar `_dashboard.scss` |
| `admin-register` | Mínimo — verificar si aplica `_auth.scss` |

### 7.4 Stub Pages → Agregar Estilos Base

| Página | Acción |
|--------|--------|
| `tab-calendar` | Agregar `.empty-state` y estructura base para M4 |
| `tab-help` | Agregar `.empty-state` y estructura base para M5 |
| `admin-events` | Agregar `.empty-state` con mensaje "Módulo en construcción" |
| `admin-faq` | Agregar `.empty-state` con mensaje "Módulo en construcción" |
| `admin-users` | Agregar `.empty-state` con mensaje "Módulo en construcción" |

---

## 8. Dark Mode

### 8.1 Decisión: **Deferir a M5**

**Razonamiento**:
- Agregar dark mode correctamente requiere auditar cada pantalla (contraste, imágenes, chart.js colores)
- El `meta[name="color-scheme"]` ya está presente
- Las variables CSS actuales NO están preparadas para dark mode
- Hacerlo bien tomaría 3–4 horas adicionales (fuera del budget de 6–8h)

### 8.2 Preparación Ahora (Bajo Costo)

Crear `src/app/styles/_dark-mode.scss` como stub:

```scss
/* ============================================
   Dark Mode — Preparación para M5
   ============================================ */
/* 
 * Para activar en M5, descomentar y completar:
 *
 * @media (prefers-color-scheme: dark) {
 *   :root {
 *     --surface-page: #121212;
 *     --surface-card: #1e1e1e;
 *     --surface-input: #2a2a2a;
 *     --text-primary: #e0e0e0;
 *     --text-secondary: #a0a0a0;
 *     --border-subtle: #333;
 *   }
 * }
 */
```

### 8.3 Lo Que Sí Hacemos Ahora

- Usar tokens semánticos (`--surface-card`, `--text-primary`) en todos los partials
- Cuando se active dark mode, solo hay que redefinir los tokens, no tocar componentes
- El diseño queda "dark-mode ready" sin costo adicional

---

## 9. Animaciones y Micro-interacciones

### 9.1 Estrategia

| Tipo | Implementación | Donde |
|------|----------------|-------|
| **Page transitions** | Ionic native (`ios`/`md` mode) — no se modifican | Automático |
| **Card hover** | `transform: translateY(-1px)` + shadow boost | `_animations.scss` → `.card-pressable` |
| **Skeleton pulse** | `animation: skeleton-pulse 1.5s ease-in-out infinite` | `_loading-states.scss` |
| **Stagger list** | `animation-delay` incremental en hijos | `_animations.scss` → `.animate-stagger` |
| **Fade in content** | `fadeIn` keyframe al cargar | `_animations.scss` |
| **Star rating hover** | Ya existe en `survey-response` inline → se preserva | Mover a `_forms.scss` |
| **Badge/status pulse** | Opcional — para "new" badges | No implementar aún |
| **Tab switch ripple** | Ionic maneja nativamente | Automático |

### 9.2 Preferencia por `prefers-reduced-motion`

```scss
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```
Agregar a `_animations.scss`.

---

## 10. Estrategia de Migración

### 10.1 Principio de No-Ruptura

Cada paso debe dejar la app en estado funcional. Se trabaja en ramas con verificación visual entre pasos.

### 10.2 Fases

```
FASE 0: Preparación (30 min)
├── Crear rama `redesign/design-system`
├── Crear estructura de directorios (app/styles/)
└── Verificar build actual funciona

FASE 1: Infraestructura (1 hora)
├── Agregar Google Fonts link en index.html
├── Agregar step colors en variables.css
├── Crear tokens.css con todos los design tokens
├── Crear utilities.css
├── Modificar styles.scss para importar todo
└── Agregar estilos base en app.scss
    └── BUILD VERIFICATION: `npm run build` debe pasar

FASE 2: Partials (1.5 horas)
├── Crear _animations.scss (primero, los demás lo usan)
├── Crear _cards.scss
├── Crear _auth.scss
├── Crear _forms.scss
├── Crear _badges.scss
├── Crear _dashboard.scss
├── Crear _empty-states.scss
├── Crear _loading-states.scss
├── Crear _index.scss (barrel)
└── BUILD VERIFICATION

FASE 3: Shared Components (30 min)
├── AnnouncementCard: extraer inline → component.scss, usar partials
├── NoticeCard: extraer inline → component.scss, usar partials
└── VISUAL VERIFICATION: dashboard debe verse igual o mejor

FASE 4: Páginas con SCSS existente (1.5 horas)
├── login → refactorizar para usar _auth.scss
├── register → refactorizar para usar _auth.scss
├── forgot-password → refactorizar para usar _auth.scss
├── reset-password → refactorizar para usar _auth.scss
├── tab-dashboard → refactorizar para usar _cards, _empty-states, _dashboard
├── tab-surveys → refactorizar para usar _cards, _empty-states
├── admin-dashboard → refactorizar para usar _dashboard
├── admin-register → revisar y refactorizar
└── VISUAL VERIFICATION por página

FASE 5: Páginas inline → SCSS (1.5 horas)
├── admin-announcements → crear .scss, usar _cards
├── admin-notices → crear .scss, usar _cards
├── admin-surveys → crear .scss, usar _cards
├── survey-form → crear .scss, usar _forms
├── survey-response → crear .scss, usar _forms
├── survey-results → crear .scss, usar _cards
├── announcement-form → crear .scss, usar _forms
├── notice-form → crear .scss, usar _forms
└── VISUAL VERIFICATION por página

FASE 6: Stub pages (30 min)
├── tab-calendar → agregar .scss con empty-state base
├── tab-help → agregar .scss con empty-state base
├── admin-events → agregar .scss con empty-state
├── admin-faq → agregar .scss con empty-state
├── admin-users → agregar .scss con empty-state
└── BUILD VERIFICATION

FASE 7: Polish & QA (1 hora)
├── Revisar todos los empty-states sean consistentes
├── Revisar todas las cards tengan misma sombra y border-radius
├── Verificar carga de Inter en iOS y Android
├── Verificar responsive en 360px y 768px
├── Pasar ESLint y Prettier
├── Build producción sin warnings
└── PR + code review
```

### 10.3 Tiempo Total Estimado

| Fase | Tiempo |
|------|--------|
| Fase 0: Preparación | 30 min |
| Fase 1: Infraestructura | 60 min |
| Fase 2: Partials | 90 min |
| Fase 3: Shared Components | 30 min |
| Fase 4: SCSS existente | 90 min |
| Fase 5: Inline → SCSS | 90 min |
| Fase 6: Stub pages | 30 min |
| Fase 7: Polish & QA | 60 min |
| **Total** | **~8 horas** |

---

## 11. Checklist de Ejecución

### 11.1 Pre-flight

- [ ] `git checkout -b redesign/design-system`
- [ ] `npm run build` — confirmar build limpio actual
- [ ] `npm run lint` — confirmar sin errores
- [ ] Tomar screenshots de referencia (5–6 pantallas clave)

### 11.2 Fase 1: Infraestructura

- [ ] Agregar `<link>` Google Fonts en `index.html`
- [ ] Agregar step colors en `variables.css`
- [ ] Crear `src/theme/tokens.css`
- [ ] Crear `src/theme/utilities.css`
- [ ] Modificar `src/styles.scss`
- [ ] Agregar contenido a `src/app/app.scss`
- [ ] Build verification

### 11.3 Fase 2: Partials

- [ ] `src/app/styles/_animations.scss`
- [ ] `src/app/styles/_cards.scss`
- [ ] `src/app/styles/_auth.scss`
- [ ] `src/app/styles/_forms.scss`
- [ ] `src/app/styles/_badges.scss`
- [ ] `src/app/styles/_dashboard.scss`
- [ ] `src/app/styles/_empty-states.scss`
- [ ] `src/app/styles/_loading-states.scss`
- [ ] `src/app/styles/_index.scss`
- [ ] Build verification

### 11.4 Fase 3: Shared Components

- [ ] `announcement-card.component.ts` — extraer `styles:` a `.component.scss`
- [ ] `notice-card.component.ts` — extraer `styles:` a `.component.scss`
- [ ] Verificar visualmente en dashboard

### 11.5 Fase 4: Páginas SCSS Existentes

- [ ] `login.page.scss` → usar `_auth.scss`
- [ ] `register.page.scss` → usar `_auth.scss`
- [ ] `forgot-password.page.scss` → usar `_auth.scss`
- [ ] `reset-password.page.scss` → usar `_auth.scss`
- [ ] `tab-dashboard.page.scss` → usar partials
- [ ] `tab-surveys.page.scss` → usar partials
- [ ] `admin-dashboard.page.scss` → usar `_dashboard.scss`
- [ ] `admin-register.page.scss` → revisar

### 11.6 Fase 5: Inline → SCSS

- [ ] `admin-announcements` → `.page.scss` + partials
- [ ] `admin-notices` → `.page.scss` + partials
- [ ] `admin-surveys` → `.page.scss` + partials
- [ ] `survey-form` → `.page.scss` + `_forms`
- [ ] `survey-response` → `.page.scss` + `_forms`
- [ ] `survey-results` → `.page.scss` + partials
- [ ] `announcement-form` → `.page.scss` + `_forms`
- [ ] `notice-form` → `.page.scss` + `_forms`

### 11.7 Fase 6: Stub Pages

- [ ] `tab-calendar.page.scss` → estructura base
- [ ] `tab-help.page.scss` → estructura base
- [ ] `admin-events.page.scss` → empty-state
- [ ] `admin-faq.page.scss` → empty-state
- [ ] `admin-users.page.scss` → empty-state

### 11.8 Fase 7: QA Final

- [ ] `npm run build --configuration=production` sin errores
- [ ] `npm run lint` sin nuevos errores
- [ ] Verificar Inter cargando (DevTools > Computed > font-family)
- [ ] Revisar `.card-meta`, `.card-date`, `.empty-state` en 3+ páginas
- [ ] Verificar responsive en Chrome DevTools (iPhone SE, iPhone 14, iPad)
- [ ] Verificar no haya regresiones visuales vs screenshots de referencia
- [ ] Commit final y PR

---

## 12. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| CSS specificity conflict con Ionic interno | Baja | Medio | Usar `%placeholders` en vez de clases donde haya riesgo. No usar `!important`. |
| Regresión visual no detectada | Media | Alto | Screenshots de referencia + verificación manual por fase |
| Inline styles difíciles de extraer (lógica mezclada) | Baja | Bajo | Solo movemos `styles:` a `.scss` — el template no se toca |
| Google Fonts CDN bloqueado en red universitaria | Baja | Medio | El fallback `-apple-system, ...` está en el font stack. La app funciona sin Inter. |
| Presupuesto de style de componente excedido (8kB error) | Media | Medio | Al mover a `.scss`, el CSS se comparte mejor. Monitorear tamaño de bundle. |
| Partials no se cargan en orden correcto | Baja | Alto | El barrel `_index.scss` controla el orden. Verificar en build. |
| Dark mode `prefers-color-scheme` se active sin querer | Baja | Bajo | No implementamos reglas dark mode aún. Solo dejamos stub. |
| `@extend` dentro de media queries falla | Baja | Medio | No usamos `@extend` dentro de `@media`. Solo en scope global. |

---

## Apéndice A: Mapa de Duplicaciones → Partials

| Clase/fragmento duplicado | Veces | Partial destino |
|---|---|---|
| `margin: 8px 0; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08)` | 10+ | `_cards.scss` → `%card-base` |
| `.card-meta { display: flex; align-items: center; gap: 8px; margin-top: 6px; }` | 6 | `_cards.scss` → `.card-meta` |
| `.card-date { font-size: 0.8rem; color: var(--ion-color-medium); }` | 8 | `_cards.scss` → `.card-date` |
| `.card-actions { display: flex; justify-content: flex-end; gap: 4px; margin-top: 8px; }` | 4 | `_cards.scss` → `.card-actions` |
| `.card-body { white-space: pre-line; line-height: 1.5; color: ... }` | 4 | `_cards.scss` → `.card-body` |
| `.empty-state { text-align: center; padding: ...; color: var(--ion-color-medium); display: flex; flex-direction: column; align-items: center; }` | 4 | `_empty-states.scss` → `.empty-state` |
| `.auth-container { max-width: 400px; margin: 2rem auto; text-align: center; h1 { ... } .subtitle { ... } form { ... } }` | 4 | `_auth.scss` → `.auth-container` |
| `.auth-links { margin-top: 1.5rem; ... a { color: var(--ion-color-secondary); } }` | 2 | `_auth.scss` → `.auth-links` |
| `.loading-text / .loading-container` | 5 | `_loading-states.scss` |
| `.form-actions { padding: 16px 0; }` | 3 | `_forms.scss` → `.form-actions` |
| `.question-card { margin: 12px 0; border-radius: 12px; box-shadow: ... }` | 2 | `_cards.scss` → `.card-question` |
| `.badge-pill { font-size: 0.75rem; padding: 4px 10px; border-radius: 20px; }` | 3 | `_badges.scss` → `.badge-pill` |
| `.metric-card` / `.metric-value` / `.metric-label` | 2 | `_dashboard.scss` |
| Toast pattern (`showToast` + `toastMessage` + método `toast()`) | ~15 | Fuera de alcance (requiere refactor lógico) |

---

## Apéndice B: Convenciones de Nomenclatura

| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| **Clases de partial** | `kebab-case` descriptivo | `.card-meta`, `.empty-state`, `.form-actions` |
| **Placeholder selectors** | `%kebab-case` | `%card-base` |
| **Tokens CSS** | `--category-name` | `--space-4`, `--text-lg`, `--shadow-md` |
| **Archivos partial** | `_kebab-case.scss` | `_cards.scss`, `_empty-states.scss` |
| **Clases utilitarias** | `u-kebab-case` | `.u-flex-center`, `.u-text-center` |
| **Component SCSS** | `kebab-case.component.scss` | `announcement-card.component.scss` |
| **Page SCSS** | `kebab-case.page.scss` | `admin-announcements.page.scss` |

---

*Documento generado para guiar la implementación del rediseño frontend de UniHub.*
*Revisar cada fase con el equipo antes de avanzar a la siguiente.*
