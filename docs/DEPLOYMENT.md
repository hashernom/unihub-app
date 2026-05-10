# Deploy de UniHub

## Stack de deploy

| Componente | Proveedor |
|-----------|-----------|
| PWA (Web) | Vercel / Netlify |
| iOS App | App Store (via Capacitor + Xcode) |
| Android App | Play Store (via Capacitor + Android Studio) |
| Backend | Supabase (PostgreSQL + Auth + Edge Functions) |
| Errores | Sentry |
| Monitoreo | Supabase Logs + Sentry |

---

## 1. PWA (Web)

### Requisitos
- Node.js 22 LTS
- Angular CLI (`npm install -g @angular/cli`)
- Proyecto compilado: `npm run build`

### Deploy a Vercel

```bash
# Instalar Vercel CLI
npm install -g vercel

# Deploy
vercel --prod

# O deploy desde GitHub:
# 1. Conectar repo en https://vercel.com
# 2. Framework: Angular
# 3. Build command: npm run build
# 4. Output: dist/unihub-app
# 5. Auto-deploy en cada push a master
```

### Deploy a Netlify

```bash
# Instalar Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist/unihub-app

# O desde GitHub:
# 1. Conectar repo en https://netlify.com
# 2. Build command: npm run build
# 3. Publish directory: dist/unihub-app
# 4. Add _redirects: /* /index.html 200
```

### Verificar PWA

```bash
# Lighthouse audit
npm run build
npx lighthouse http://localhost:4200 --view

# Checks:
# - Installable: sí
# - HTTPS: sí
# - Service Worker: registrado
# - Offline: contenido cacheado
```

---

## 2. iOS (App Store)

### Requisitos
- macOS + Xcode 16+
- Apple Developer account ($99/año)
- Capacitor CLI

### Build y deploy

```bash
# 1. Build web
npm run build

# 2. Sincronizar con iOS
npx cap sync ios

# 3. Abrir en Xcode
npx cap open ios

# 4. En Xcode:
#    - Configurar Bundle Identifier (ej: com.unihub.app)
#    - Configurar Signing & Capabilities
#    - Product → Archive
#    - Distribuir a App Store

# 5. Publicar en App Store Connect
```

### Requisitos App Store
- Icono: 1024x1024px
- Splash screen: configurado en capacitor.config.ts
- Privacy policy: URL en App Store Connect
- Soporte iOS 16+

---

## 3. Android (Play Store)

### Requisitos
- Android Studio
- Google Play Developer account ($25 única vez)
- Capacitor CLI

### Build y deploy

```bash
# 1. Build web
npm run build

# 2. Sincronizar con Android
npx cap sync android

# 3. Abrir en Android Studio
npx cap open android

# 4. En Android Studio:
#    - Build → Generate Signed Bundle/APK
#    - Crear keystore (guardar en lugar seguro)
#    - Build release

# 5. Subir a Google Play Console
#    - Crear nueva aplicación
#    - Rellenar ficha (descripción, screenshots, categoría)
#    - Subir AAB firmado
#    - Revisión y publicación
```

### Requisitos Play Store
- Icono: 512x512px
- Feature graphic: 1024x500px
- Screenshots: 2-8 capturas por dispositivo
- Política de privacidad: enlace en ficha
- API level mínimo: Android 8.0 (API 26)

---

## 4. Supabase (Producción)

### Crear proyecto

```bash
# Via dashboard: https://supabase.com
# O via CLI:
supabase projects create unihub-prod --org-id <org>
```

### Aplicar migraciones

```bash
supabase db push --db-url "postgresql://..."
# O via dashboard: SQL Editor → pegar migraciones
```

### Configurar RLS y seed data

```sql
-- Ejecutar migraciones en orden:
-- 1. 00001_initial_schema.sql
-- 2. 00002_rls_policies.sql
-- 3. seed.sql (solo datos esenciales)
```

### Verificar

- [ ] Supabase Studio muestra 14 tablas
- [ ] RLS policies activas (40+)
- [ ] Bucket avatars creado
- [ ] Auth configurado (email confirm, JWT expiry)

---

## 5. Rollback

### PWA (Vercel)
```bash
vercel rollback
# O desde dashboard: Deployments → ⋮ → Rollback
```

### iOS
```bash
# App Store Connect → Versiones anteriores → Restaurar
# Puede tomar 1-2 días hábiles para aprobación
```

### Android
```bash
# Play Console → Production → Release → Retirar
# Subir versión anterior con código superior
```

### Supabase
```bash
# PITR: restaurar a punto anterior
supabase db restore --db-url "..." --to "2026-01-01T00:00:00Z"
```

---

## 6. Contactos de emergencia

| Rol | Contacto |
|-----|----------|
| Admin del proyecto | @hashernom |
| DevOps | @hashernom |
| Soporte Supabase | support@supabase.com |
