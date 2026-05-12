# Seguridad en UniHub

UniHub implementa seguridad en múltiples capas. Este documento describe cada capa, su estado de implementación y cómo verificarla.

## Estado de Implementación (Mayo 2026)

| Capa | Estado | Milestone |
|------|:------:|-----------|
| RLS (Row Level Security) | ✅ Implementado | M0 |
| JWT via Supabase Auth | ✅ Implementado | M1 |
| Ionic Secure Storage | ✅ Implementado | M1 |
| Angular XSS sanitizer | ✅ Nativo | M0 |
| HTTPS + HSTS | ⚠️ Parcial (Supabase HTTPS, HSTS pending) | M8 |
| Content Security Policy (CSP) | ❌ Planeado | M8 |
| Rate Limiting Edge Functions | ❌ Planeado | M8 |
| Input sanitization extra | ❌ Planeado | M8 |
| npm audit / Dependabot | ⚠️ No configurado | M8 |
| Backups automatizados | ❌ Planeado | M11 |

## Arquitectura de seguridad

```
┌──────────────────────────────────────┐
│  Client Layer (PWA / App Nativa)     │
│  - Content Security Policy (CSP)     │
│  - Angular sanitizer (XSS)           │
│  - Ionic Secure Storage (tokens)     │
│  - HTTPS + HSTS                      │
├──────────────────────────────────────┤
│  Transport Layer                     │
│  - HTTPS (TLS 1.3)                   │
│  - JWT en Authorization header       │
├──────────────────────────────────────┤
│  API Gateway (Supabase)              │
│  - JWT validation                    │
│  - CORS whitelist                    │
│  - Rate Limiting en Edge Functions   │
├──────────────────────────────────────┤
│  Database Layer (PostgreSQL)         │
│  - Row Level Security (RLS)          │
│  - Prepared statements (SQL inj.)    │
│  - Point-in-time recovery (backups)  │
└──────────────────────────────────────┘
```

## 1. Row Level Security (RLS)

Todas las tablas tienen RLS habilitado con políticas para roles `student` y `admin`.

### Verificación

```sql
-- Conectar con anon key (sin autenticación)
-- Debería devolver 401 Unauthorized
curl https://[project].supabase.co/rest/v1/surveys

-- Conectar como student autenticado
-- Solo ve encuestas activas dentro del rango de fechas
SELECT * FROM surveys;

-- Conectar como admin
-- Ve todas las encuestas (CRUD completo)
```

### Políticas implementadas

| Tabla | Student | Admin |
|-------|---------|-------|
| profiles | Lectura/actualización propia | Lectura total, actualización |
| announcements | Lectura (no expiradas) | CRUD completo |
| notices | Lectura (activas) | CRUD completo |
| surveys | Lectura (activas, en fecha) | CRUD completo |
| survey_questions | Lectura (de encuestas activas) | CRUD completo |
| survey_responses | Creación propia, lectura propia | Lectura total |
| survey_answers | Creación propia, lectura propia | Lectura total |
| classrooms | Lectura (activas) | CRUD completo |
| events | Lectura (no cancelados) | CRUD completo |
| faq_entries | Lectura (activas) | CRUD completo |
| help_queries | Creación propia, lectura propia | Lectura/actualización total |
| notification_tokens | CRUD propio | Lectura total |
| student_code_blacklist | Sin acceso | CRUD completo |
| survey_results_cache | Lectura (encuestas activas) | CRUD completo |

## 2. Autenticación JWT

- JWT generado por Supabase Auth
- Almacenado en Ionic Secure Storage (cifrado a nivel dispositivo)
- Enviado en header `Authorization: Bearer <token>`
- Expiración configurable en `supabase/config.toml`
- Refresh token automático vía Supabase SDK

## 3. Content Security Policy (CSP)

Configurada en el PWA via meta tag o header HTTP. Restringe:
- Scripts solo del mismo origen y Ionic CDN
- Conexiones solo a Supabase
- Estilos solo del mismo origen y fuentes externas

## 4. Protección XSS

- Angular sanitiza automáticamente todas las bindings en templates (`{{ }}`, `[innerHTML]`)
- No se usa `bypassSecurityTrust*` sin revisión explícita
- Input sanitization en formularios vía Angular Reactive Forms

## 5. Rate Limiting

- Edge Functions implementan rate limiting por IP y por usuario
- Supabase Auth tiene rate limiting integrado (login, registro)
- Configurable via `supabase/config.toml`

## 6. Dependencias

- `npm audit` ejecutado en CI
- Dependabot configurado para PRs automáticos de seguridad
- Revisión periódica de vulnerabilidades

## Reportar un problema de seguridad

Si encuentras una vulnerabilidad, por favor crea un issue privado o contacta al administrador del proyecto.
