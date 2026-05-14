# Frontend Guide — Cómo modificar sin romper

## Arquitectura de estilos

```
src/
├── theme/
│   ├── variables.css    → Colores Ionic (primary=navy, tertiary=gold, etc.)
│   └── tokens.css       → Design tokens (spacing, fonts, shadows, surfaces)
├── styles.scss          → Global: importa tokens + partials, resets
└── app/
    ├── app.scss         → Headings globales (h1-h4), links, focus
    └── styles/
        ├── _cards.scss       → %card-base con barra de acento lateral
        ├── _auth.scss        → Full-bleed auth layout + floating card
        ├── _animations.scss  → Keyframes: fadeIn, skeleton-pulse, stagger
        ├── _badges.scss      → .badge-pill, .badge-count, .badge-status
        ├── _dashboard.scss   → .metrics-row, .metric-card
        ├── _empty-states.scss → .empty-state con icono + textos
        ├── _forms.scss       → .form-actions, .required-star, .stars-container
        └── _loading-states.scss → .loading-spinner, .skeleton* con shimmer
```

## Reglas de oro

1. **Nunca escribas CSS inline en el TS** — usa `styleUrl: './page.scss'`
2. **Nunca valores hardcodeados** — usa tokens: `var(--space-4)` no `16px`
3. **Para estilos nuevos** usa `read` + `edit`, no PowerShell ni `Set-Content`

## Cómo cambiar

### Color global (toda la app)
```css
/* theme/tokens.css */
--ion-color-primary: #1E3A5F;
--color-gold: #D4A843;
```

### Cards (todas)
```scss
/* app/styles/_cards.scss */
%card-base {
  margin: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  box-shadow: var(--card-shadow);
  background: var(--surface-gradient-card);
}
```

### Una página específica
```scss
/* pages/mi-pagina/mi-pagina.page.scss */
.mi-clase {
  color: var(--text-primary);
  padding: var(--space-4);
}
```

### Tipografía
```html
<!-- index.html → Google Fonts link -->
```
```css
/* theme/tokens.css → --font-sans, --font-display */
```

## Layout hero (dashboard/admin)
```html
<div class="hero"><div class="hero-bg"></div><div class="hero-content">...</div></div>
```
Requiere copiar estilos `.hero { }` al SCSS de la página (no son globales).

## Checklist antes de commit
- [ ] `npm run build` sin errores
- [ ] Caracteres españoles (ó, ñ, é) se ven bien
