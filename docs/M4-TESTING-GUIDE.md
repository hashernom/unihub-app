# M4 — Calendar Module Testing Guide

## Credenciales de prueba

| Rol | Email | Contraseña |
|-----|-------|-----------|
| Admin | `admin@unihub.com` | `Admin123456!` |
| Estudiante | `01240371032@mail.udes.edu.co` | `Admin123456!` |

---

## 1. Calendario — Vista Estudiante

**Ruta**: App → Tabs → Calendario (`/tabs/calendar`)

| # | Test | Pasos | Output esperado |
|---|------|-------|----------------|
| 1.1 | Calendario carga | Ir a la pestaña Calendario | Calendario FullCalendar se renderiza con vista mensual. Sin errores en consola. |
| 1.2 | Navegación meses | Click `<` y `>` en toolbar | Cambia de mes. Título muestra mes/año correcto. |
| 1.3 | Botón Hoy | Click **Hoy** | Vuelve al mes actual. |
| 1.4 | Cambio de vista | Click **Semana** en segment | Cambia a vista semanal. Click **Día** → vista diaria. |
| 1.5 | Pull-to-refresh | Deslizar hacia abajo en calendario | Spinner de carga. Eventos se recargan. |
| 1.6 | Eventos visibles | (Precondición: admin creó eventos) | Eventos aparecen en el calendario con color según tipo. Título visible. |
| 1.7 | Colores por tipo | Tener eventos de tipo class, exam, meeting, workshop | class=🔵 azul, exam=🔴 rojo, meeting=🟢 verde, workshop=🟠 naranja, other=⚪ gris |
| 1.8 | Tap en evento | Click/tap sobre un evento en el calendario | Modal se abre con **Detalles del Evento** |
| 1.9 | Modal — info básica | Modal abierto | Muestra: tipo (badge), título, descripción si tiene |
| 1.10 | Modal — horario | Modal abierto | Sección **Horario**: fecha (ej: "miércoles 20 de mayo, 8:00 AM — 10:00 AM") |
| 1.11 | Modal — aula + capacidad | Modal abierto, evento tiene aula | Sección **Aula**: nombre, capacidad, edificio |
| 1.12 | Modal — profesor | Modal abierto, evento tiene profesor | Sección **Profesor**: nombre del profesor |
| 1.13 | Evento recurrente en calendario | Evento con RRULE | Aparece `⟳` antes del título. Múltiples instancias en días correspondientes. |
| 1.14 | Evento recurrente — modal | Modal de evento recurrente | Muestra ícono 🔄 "Evento recurrente" |

---

## 2. Filtros de Calendario

| # | Test | Pasos | Output esperado |
|---|------|-------|----------------|
| 2.1 | Filtro por tipo | Click chip **Exámenes** | Solo eventos tipo exam visibles. Chip se resalta. |
| 2.2 | Filtro por tipo — desactivar | Click chip **Todos** | Todos los eventos visibles de nuevo. |
| 2.3 | Filtro por aula | Abrir selector "Filtrar por aula" → elegir aula | Solo eventos de esa aula visibles. |
| 2.4 | Filtros combinados | Activar filtro "Clases" + aula específica | Solo eventos tipo class en esa aula. |
| 2.5 | Limpiar filtros | Click **Limpiar filtros** | Todos los filtros removidos. Todos los eventos visibles. |
| 2.6 | AC1: Filtro exam oculta exámenes | Desactivar chip exam | No se ve ningún examen en el calendario. |

---

## 3. Admin — Gestión de Aulas

**Ruta**: Admin → Aulas (`/admin/classrooms`)

| # | Test | Pasos | Output esperado |
|---|------|-------|----------------|
| 3.1 | Lista aulas vacía | Sin aulas creadas | Empty state con icono + texto "No hay aulas" + botón "Crear aula" |
| 3.2 | Crear aula | Click ➕ → llenar: nombre "A-101", edificio "Central", capacidad 30 → Guardar | Toast "Aula creada". Redirige a lista. Aula aparece con badge "Activa". |
| 3.3 | Crear aula sin nombre | Guardar con nombre vacío | Toast "El nombre del aula es obligatorio". No se crea. |
| 3.4 | Crear aula capacidad inválida | Capacidad = 0 | Toast "La capacidad debe ser mayor a 0" |
| 3.5 | Editar aula | Click ✏️ → cambiar capacidad a 35 → Guardar | Toast "Aula actualizada". Cambio reflejado. |
| 3.6 | Toggle activo/inactivo | Click toggle en aula activa | Badge cambia a "Inactiva". Aula se atenúa. |
| 3.7 | Aula inactiva en selector | Ir a crear evento → selector aula | Aula inactiva NO aparece. |
| 3.8 | Filtro por edificio | Click chip del edificio | Solo aulas de ese edificio. |
| 3.9 | Disponibilidad semanal | Click **Disponibilidad** en aula | Modal con 7 columnas. Franjas ocupadas en rojo, libres en verde "Libre". |

---

## 4. Admin — Gestión de Eventos

**Ruta**: Admin → Calendario (`/admin/events`)

| # | Test | Pasos | Output esperado |
|---|------|-------|----------------|
| 4.1 | Lista vacía | Sin eventos | Empty state con icono + botón "Crear evento" |
| 4.2 | Crear evento simple | Click ➕ → título, tipo Clase, aula, fechas → Guardar | Toast "Evento creado". Badge "Próximo". |
| 4.3 | Validación título | Guardar sin título | Toast "El título es obligatorio" |
| 4.4 | Validación fechas | Guardar sin fecha | Toast "Selecciona fecha de inicio y fin" |
| 4.5 | Validación end > start | Fin antes que inicio | Toast "La fecha de fin debe ser posterior a la de inicio" |
| 4.6 | Conflicto de aula | Crear evento en aula ocupada mismo horario | Toast "Conflicto de horario". No se crea. |
| 4.7 | Sin conflicto sin aula | Crear evento sin aula en mismo horario | Se crea sin problema. |
| 4.8 | Profesor selector | Abrir selector Profesor → seleccionar uno | Se guarda con el profesor asignado. |
| 4.9 | Disponibilidad inline | Seleccionar aula + fechas | Texto verde "Aula disponible" o rojo "Ocupado: [evento]" |
| 4.10 | AC4: Evento recurrente semanal | Tipo=Semanal, fecha inicio lunes | En calendario estudiante aparecen todos los lunes. |
| 4.11 | Editar evento | Click ✏️ → cambiar datos → Guardar | Toast "Evento actualizado". |
| 4.12 | Editar evento recurrente | Click ✏️ en evento con RRULE | ActionSheet: "Solo esta instancia" / "Toda la serie" |
| 4.13 | AC3: Cancelar evento | Click 🟡 → confirmar | Badge "Cancelado". No aparece en calendario estudiante. |
| 4.14 | Cancelar recurrente | Click 🟡 en evento con RRULE | ActionSheet: "Solo esta instancia" / "Toda la serie" |
| 4.15 | Eliminar evento | Click 🔴 → confirmar | Desaparece de la lista. |
| 4.16 | Badges de tipo | En lista admin | Badge coloreado por tipo. |
| 4.17 | Notificar por email | Crear evento con toggle activado | Edge function se ejecuta (ver logs Supabase). |

---

## 5. Estudiante — Visualización

| # | Test | Pasos | Output esperado |
|---|------|-------|----------------|
| 5.1 | Evento visible | Admin crea evento. Estudiante abre Calendario. | Evento visible con color, título y hora. |
| 5.2 | AC3: Cancelado NO visible | Admin cancela. Estudiante hace pull-to-refresh. | Evento cancelado no aparece. |
| 5.3 | Recurrente visible | Admin crea "Álgebra — lun, mie, vie" | Instancias cada lun/mie/vie en el rango. |
| 5.4 | AC4: RRULE con UNTIL | Evento recurrente con fecha fin | No genera instancias después de esa fecha. |

---

## 6. Notificaciones — Settings

**Ruta**: Perfil → Notificaciones (`/notification-settings`)

| # | Test | Pasos | Output esperado |
|---|------|-------|----------------|
| 6.1 | Página carga | Ir a Notificaciones desde Perfil | 4 toggles: 1h, 15min, Encuestas, Anuncios |
| 6.2 | Toggle persiste | Desactivar uno → recargar | Sigue desactivado (persiste en DB). |
| 6.3 | AC4: Usuario desactiva | Desactivar "1 hora antes" | No recibe notificaciones 1h antes. |

---

## 7. Admin Dashboard

| # | Test | Pasos | Output esperado |
|---|------|-------|----------------|
| 7.1 | Card Aulas visible | Ir a `/admin/dashboard` | Card "Aulas" con icono en la grilla. Click → `/admin/classrooms`. |

---

## 8. Regresión (M1-M3)

| # | Test | Pasos | Output esperado |
|---|------|-------|----------------|
| 8.1 | Login admin | `admin@unihub.com` / `Admin123456!` | Dashboard admin con stats. |
| 8.2 | Login estudiante | Credenciales estudiante | Dashboard estudiante. |
| 8.3 | Encuestas | Pestaña Encuestas | Lista carga sin errores. |
| 8.4 | Dashboard | Pestaña Dashboard | Anuncios, avisos, eventos próximos cargan. |

---

## 9. Backend / API

| # | Test | Output esperado |
|---|------|----------------|
| 9.1 | `check-classroom-availability` | `POST` `{start_time, end_time}` → array aulas libres |
| 9.2 | `send-event-invitation` | `POST` `{event_id}` → `{sent: N, total: N}` |
| 9.3 | CRON `remind-event-notifications` | Activo cada 15min (`cron.job`) |
| 9.4 | `recurring_exceptions` | Registros al cancelar instancia individual |
| 9.5 | `user_notification_settings` | Registro por usuario con preferencias |

---

## Resumen de rutas M4

| Ruta | Página |
|------|--------|
| `/tabs/calendar` | Calendario estudiante |
| `/admin/events` | Lista eventos admin |
| `/admin/events/new` | Crear evento |
| `/admin/events/edit/:id` | Editar evento |
| `/admin/classrooms` | Lista aulas |
| `/admin/classrooms/new` | Crear aula |
| `/admin/classrooms/edit/:id` | Editar aula |
| `/notification-settings` | Preferencias notificaciones |
