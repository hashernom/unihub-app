# Módulo 5 — Centro de Ayuda (Help Bot, FAQ y Escalación)

Resumen técnico y funcional del módulo de ayuda (issues #40-#45).

---

## 1. Propósito

Dar a los estudiantes una forma rápida de resolver dudas frecuentes mediante un asistente conversacional, y a los administradores herramientas para gestionar esas respuestas y detectar temas que aún no están cubiertos.

---

## 2. Funcionalidades entregadas

### 2.1 Chat de ayuda (estudiante)

- Interfaz de chat con burbujas, indicador de escritura y respuestas con formato markdown.
- Respuestas rápidas (chips) que se cargan **dinámicamente** desde las categorías activas de FAQ.
- Sugerencias cuando no hay una respuesta exacta.
- Fallback a caché local si falla la red.

### 2.2 Búsqueda inteligente (Edge Function)

- Función `help-bot-search` desplegada en Supabase.
- Autenticación obligatoria: rechaza peticiones sin sesión.
- Detección automática de idioma (`es` / `en`).
- Estrategia de búsqueda:
  1. Coincidencia exacta de categoría (case-insensitive, sin acentos).
  2. Búsqueda full-text (`search_faq_fts`) con operador `OR` entre palabras.
  3. Fallback trigram (`search_faq_trigram`) si FTS no devuelve nada.
  4. Búsqueda cruzada en el otro idioma si no hay resultados.
- Registro automático de cada consulta en `help_queries` para el dashboard de escalación.

### 2.3 Administrador de FAQ (admin)

- CRUD completo de preguntas frecuentes.
- Campos: pregunta, respuesta, categoría, idioma, orden, activo/inactivo.
- Preview markdown en el formulario.
- Filtrado por categoría, idioma y búsqueda de texto.
- Reordenamiento por categoría con flechas ↑ ↓.
- Toggle para activar/desactivar FAQs.

### 2.4 Escalación de consultas (admin)

- Dashboard con consultas no resueltas.
- Agrupación por similitud de texto (ignora mayúsculas, acentos y puntuación).
- Marcar una consulta o todo un grupo como resuelto.
- Gráfico de resolución semanal con Chart.js.

### 2.5 Soporte multilingüe

- Columna `language` en `faq_entries` (`es` | `en`).
- Edge Function detecta el idioma del usuario y prioriza FAQs en ese idioma.
- Fallback al otro idioma si no encuentra resultados.

---

## 3. Flujos

### Estudiante

```
Abre pestaña Ayuda
        │
        ▼
Mensaje de bienvenida + chips de categorías activas
        │
        ├─ Toca un chip ──► Edge Function busca por categoría ──► Respuesta
        │
        └─ Escribe pregunta ──► Edge Function busca FTS/trigram ──► Respuesta / sugerencias / "no encontré"
```

### Administrador

```
Panel Admin
    │
    ├─ Preguntas frecuentes ──► Crear / editar / activar / reordenar FAQ
    │
    └─ Consultas de ayuda ──► Ver no resueltas, agrupar, marcar resueltas, ver gráfico
```

---

## 4. Archivos principales

| Componente | Ruta |
|---|---|
| Chat estudiante | `src/app/pages/tab-help/tab-help.page.ts` |
| Servicio de búsqueda | `src/app/core/services/help-bot.service.ts` |
| Servicio FAQ | `src/app/core/services/faq.service.ts` |
| Servicio escalación | `src/app/core/services/help-query.service.ts` |
| Admin FAQ listado | `src/app/pages/admin-faq/admin-faq.page.ts` |
| Admin FAQ formulario | `src/app/pages/faq-form/faq-form.page.ts` |
| Admin escalación | `src/app/pages/admin-help-queries/admin-help-queries.page.ts` |
| Edge Function | `supabase/functions/help-bot-search/index.ts` |
| Migración idioma | `supabase/migrations/00010_faq_language.sql` |
| Config CLI | `supabase/config.toml` |

---

## 5. Esquema de base de datos

### `faq_entries`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | UUID | PK |
| `question` | TEXT | Pregunta visible |
| `answer` | TEXT | Respuesta (markdown soportado) |
| `category` | TEXT | Categoría libre |
| `language` | TEXT | `es` o `en` |
| `sort_order` | INT | Orden dentro de la categoría |
| `is_active` | BOOLEAN | Visible para el bot |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### `help_queries`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | Quién preguntó |
| `query_text` | TEXT | Texto enviado |
| `matched_faq_id` | UUID | FAQ usada si se resolvió |
| `resolved` | BOOLEAN | Resuelto manualmente o por FAQ |
| `created_at` | TIMESTAMPTZ | |

### Funciones de búsqueda

- `search_faq_fts(query_text TEXT, result_limit INT, query_language TEXT)`
- `search_faq_trigram(query_text TEXT, result_limit INT, query_language TEXT)`

Ambas filtran por `is_active = true` y `language = query_language`.

---

## 6. Despliegue

### Aplicar migración remota

```bash
npx supabase@latest db query --linked --file supabase/migrations/00010_faq_language.sql
```

### Desplegar Edge Function

```bash
npx supabase@latest functions deploy help-bot-search --project-ref <project-ref>
```

### Construir app

```bash
npm run build
npm run lint
```

---

## 7. Cómo probar

### Como estudiante

1. Iniciar sesión.
2. Ir a **Ayuda**.
3. Tocar cualquier chip de categoría: debe responder con FAQs de esa categoría.
4. Escribir una pregunta relacionada con una FAQ existente.
5. Probar en inglés si hay FAQs `en`.

### Como administrador

1. Iniciar sesión con rol `admin`.
2. Ir a **Panel de administración → Preguntas frecuentes**.
3. Crear/editar FAQs, cambiar categorías e idiomas.
4. Probar que el chat refleja los cambios (recargar app).
5. Ir a **Consultas de ayuda** para ver no resueltas y marcarlas resueltas.

---

## 8. Notas técnicas

- Las respuestas rápidas se cargan desde `FaqService.getActiveCategories()`.
- Si falla la carga de categorías, el chat usa un fallback fijo para no quedar vacío.
- La Edge Function usa **service role key** para buscar en la base de datos; requiere que el usuario esté autenticado.
- El chat cachea localmente las últimas FAQs consultadas (`help_bot_faq_cache`).
- El directorio de Edge Functions del proyecto es `supabase/functions/` (estándar del CLI).

---

## 9. Limitaciones conocidas

- Los íconos de Ionicons lanzan warnings `Failed to construct 'URL'` en desarrollo; no afectan la funcionalidad.
- El test runner del proyecto tiene problemas de configuración con TestBed; los tests nuevos usan Vitest sin TestBed.
