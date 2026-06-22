# UniHub - Edge Functions (Supabase / Deno)

Edge Functions son funciones serverless escritas en TypeScript que corren en el runtime Deno de Supabase. Se ejecutan en respuesta a eventos de base de datos (triggers) o llamadas HTTP directas desde la app.

---

## Estado de Implementación

| Función | Estado | Milestone |
|---------|:------:|-----------|
| `validate-student-code` | ✅ Implementada | M1 |
| `notify-on-announcement` | ✅ Implementada | M2 |
| `process-survey-results` | ✅ Implementada | M3 |
| `help-bot-search` | ✅ Implementada | M5 |
| `deactivate-expired-surveys` | ✅ Implementada | M3 |
| `remind-pending-surveys` | ✅ Implementada | M3 |
| `check-classroom-availability` | ✅ Implementada | M4 |
| `send-event-invitation` | ✅ Implementada | M4 |
| `export-survey-results` | ✅ Implementada | M3 |
| `remind-event-notifications` | ✅ Implementada | M4 |

---

## 1. `notify-on-announcement` ❌ Planeada

**Trigger**: Database Webhook (INSERT en `announcements`)

**Propósito**: Enviar notificación push a todos los estudiantes cuando se crea un anuncio urgente o general.

**Contract**:
```typescript
// Input (payload from Supabase webhook)
interface AnnouncementPayload {
  type: "INSERT";
  table: "announcements";
  record: {
    id: string;
    title: string;
    body: string;
    category: "general" | "academic" | "event" | "urgent";
    is_pinned: boolean;
    created_by: string;
  };
}

// Output
interface NotificationResult {
  sent: number;       // notificaciones enviadas
  failed: number;     // fallos
  skipped: number;    // usuarios sin token FCM
}
```

**Lógica**:
1. Recibe webhook de INSERT en announcements
2. Si `category === 'urgent'` → notificar a todos los estudiantes
3. Si `category` es otra → notificar solo a usuarios con preferencias activas
4. Consulta `profiles` para obtener tokens FCM de los estudiantes
5. Envía push notification via FCM HTTP v1 API
6. Loguea resultado en tabla `notification_logs` (si existe)

**Rate Limiting**: Máximo 1 notificación por anuncio (idempotente por `announcement.id`)

---

## 2. `process-survey-results` ❌ Planeada

**Trigger**: HTTP llamada desde la app (admin dashboard)

**Propósito**: Generar estadísticas agregadas de una encuesta: conteo de respuestas, distribución de opciones, promedios de rating.

**Contract**:
```typescript
// Input (POST body)
interface SurveyResultsRequest {
  survey_id: string;
}

// Output
interface SurveyResultsResponse {
  survey_id: string;
  title: string;
  total_responses: number;
  questions: QuestionResult[];
}

interface QuestionResult {
  question_id: string;
  question_text: string;
  question_type: "text" | "single_choice" | "multiple_choice" | "rating";
  // Para text
  text_responses?: string[];
  // Para single_choice / multiple_choice
  option_counts?: Record<string, number>; // { "Opción A": 15, "Opción B": 8 }
  // Para rating
  average_rating?: number;
  rating_distribution?: Record<number, number>; // { 1: 2, 2: 5, 3: 10, 4: 8, 5: 15 }
}
```

**Lógica**:
1. Valida que el survey_id exista y el usuario sea admin
2. Cuenta total_responses
3. Itera sobre cada pregunta:
   - `text`: retorna lista de textos (anonimizados, sin user_id)
   - `single_choice`: agrupa por opción → conteo
   - `multiple_choice`: agrupa por opción → conteo (una respuesta puede tener múltiples opciones)
   - `rating`: calcula promedio y distribución
4. Retorna resultados agregados

**Optimización**: Materializar resultados precalculados en tabla `survey_results_cache` si la encuesta tiene > 1000 respuestas, con TTL de 1 hora.

---

## 3. `help-bot-search` ✅ Implementada

**Trigger**: HTTP llamada desde la app (help bot screen)

**Propósito**: Búsqueda full-text en `faq_entries` con ranking de relevancia y fallback a sugerencias. Si no encuentra match, registra la consulta para escalación.

**Contract**:
```typescript
// Input (POST body)
interface HelpSearchRequest {
  query: string;        // texto del usuario
  user_id: string;      // para registrar help_queries
  max_results?: number; // default 5
  language?: string;    // 'es' | 'en' (auto-detectado si no se envía)
}

// Output
interface HelpSearchResponse {
  query: string;
  language: string;        // idioma detectado o enviado
  results: FaqMatch[];
  is_resolved: boolean;    // true si encontró match con score > umbral
  suggestions?: string[];  // "¿Intentaste con...?" si no hay match exacto
  fallback_language?: string; // idioma usado si hubo fallback
}

interface FaqMatch {
  faq_id: string;
  question: string;
  answer: string;
  category: string;
  language: string;
  relevance_score: number;  // 0.0 - 1.0
}
```

**Lógica**:
1. Detecta idioma de la query (es/en) por stopwords y caracteres si no se envía `language`
2. Realiza búsqueda `tsquery` en `faq_entries` filtrando por `language` y `is_active = true`
3. Ranking: `ts_rank()` con peso 2x para matches en `question`, 1x para `answer`
4. Si no hay resultados en el idioma detectado, hace fallback al otro idioma
5. Si `max(relevance_score) < 0.3` → guarda `help_queries` (no resuelta) y retorna sugerencias con `pg_trgm` similarity
6. Si hay match → guarda `help_queries` con `matched_faq_id` y `resolved = true`

**Índices requeridos**:
```sql
CREATE INDEX idx_faq_fts ON faq_entries USING GIN(to_tsvector('spanish', question || ' ' || answer));
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_faq_trgm ON faq_entries USING GIN(question gin_trgm_ops);
CREATE INDEX idx_faq_language_active ON faq_entries(language, is_active);
```

---

## 4. `validate-student-code` ✅ Implementada

**Trigger**: HTTP llamada desde la app (registro de usuario)

**Propósito**: Validar que el código estudiantil sigue el formato institucional y no está duplicado. Se ejecuta en el backend para evitar que el cliente pueda manipular la validación.

**Contract**:
```typescript
// Input (POST body)
interface ValidateCodeRequest {
  student_code: string;
}

// Output
interface ValidateCodeResponse {
  valid: boolean;
  error?: "INVALID_FORMAT" | "ALREADY_EXISTS" | "BLACKLISTED";
  message?: string;  // mensaje amigable para el usuario
}
```

**Reglas de validación**:
1. Formato: `U` + 8 dígitos (ej: `U20231001`), validado con regex `/^U\d{8}$/`
2. Unicidad: no puede estar ya registrado en `profiles.student_code`
3. Blacklist: no puede estar en `student_code_blacklist` (códigos reservados/inactivos)

**Lógica**:
1. Valida regex de formato
2. Si formato inválido → retorna `{ valid: false, error: "INVALID_FORMAT" }`
3. Verifica duplicado en `profiles`
4. Si duplicado → retorna `{ valid: false, error: "ALREADY_EXISTS" }`
5. Verifica blacklist
6. Si blacklisteado → retorna `{ valid: false, error: "BLACKLISTED" }`
7. Todo OK → retorna `{ valid: true }`

---

## Estructura de Archivos

```
supabase/functions/
├── notify-on-announcement/
│   ├── index.ts        # handler principal
│   ├── fcm.ts          # Firebase Cloud Messaging client
│   └── test.ts         # deno test
├── process-survey-results/
│   ├── index.ts
│   └── test.ts
├── help-bot-search/
│   ├── index.ts
│   └── test.ts
├── validate-student-code/
│   ├── index.ts
│   └── test.ts
└── _shared/
    ├── cors.ts         # CORS headers
    ├── auth.ts         # JWT verification helper
    └── supabase.ts     # Supabase client factory
```

## Convenciones

- Todas las funciones retornan CORS headers para ser llamadas desde la app Android
- Autenticación vía JWT en `Authorization: Bearer <token>`
- Logging estructurado: `console.log(JSON.stringify({ event, ...data }))`
- Tests unitarios con `Deno.test()` + mocks de Supabase client
