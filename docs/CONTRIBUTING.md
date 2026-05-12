# Cómo contribuir a UniHub

## Flujo de desarrollo

1. **Crear una rama** desde `master` con el formato `feat/issue-N-descripcion` o `fix/issue-N-descripcion`.
2. **Desarrollar** los cambios siguiendo las convenciones del proyecto.
3. **Testear** localmente:
   ```bash
   npm run lint     # ESLint
   npm test         # Unit tests (Vitest)
   npm run build    # Build de producción
   ```
4. **Crear un PR** contra `master` con un título descriptivo y checklist completo.
5. **Esperar** a que CI pase (lint + test + build).
6. **Mergear** tras aprobación.

## Convenciones de código

### TypeScript / Angular
- `kebab-case` para archivos y selectores: `auth-service.ts`, `app-login-page`
- `camelCase` para variables, funciones, métodos
- `PascalCase` para clases, interfaces, tipos
- `UPPER_SNAKE_CASE` para constantes de entorno
- Sufijos: `Page`, `Component`, `Service`, `Pipe`, `Guard`, `Interceptor`
- Estructura por feature: `src/app/pages/[feature]/[feature].page.ts`

### Estilo de commits
Usamos [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <descripción corta>

[Cuerpo opcional con detalles]
```

Tipos: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`, `style`.

Ejemplos:
```
feat: implement login with student code and email
fix: prevent duplicate survey submissions
docs: update API contract for notification endpoint
```

### SQL
- `snake_case` para tablas y columnas
- Plural para tablas: `profiles`, `announcements`, `surveys`
- Singular para claves foráneas: `created_by`, `survey_id`
- Migraciones numeradas: `00001_initial_schema.sql`

## Setup local

```bash
# Clonar
git clone https://github.com/hashernom/unihub-app.git
cd unihub-app

# Node.js 24 LTS requerido
node --version  # v24.x

# Instalar dependencias
npm install

# Iniciar Supabase local (opcional, requiere Supabase CLI)
supabase start
supabase db reset

# Iniciar servidor de desarrollo
ng serve

# Ejecutar tests
npm test
```
