-- Seed data for development and testing
-- Run after migrations are applied.
-- Note: auth.users must be created via Supabase Auth API or dashboard first.

-- ============================================================
-- PROFILES (auth.users must exist in Supabase Auth)
-- These INSERTs will fail if auth.users don't exist. Skip if needed.
-- ============================================================

-- Admin user (replace UUID with actual auth.users id after registration)
-- INSERT INTO profiles (id, student_code, full_name, role) VALUES
-- ('00000000-0000-0000-0000-000000000001', 'ADMIN001', 'Administrador UniHub', 'admin');

-- Student users (replace UUIDs with actual auth.users ids)
-- INSERT INTO profiles (id, student_code, full_name) VALUES
-- ('00000000-0000-0000-0000-000000000002', 'U20231001', 'María García López'),
-- ('00000000-0000-0000-0000-000000000003', 'U20231002', 'Juan Pérez Martínez'),
-- ('00000000-0000-0000-0000-000000000004', 'U20231003', 'Ana Rodríguez Sánchez');

-- ============================================================
-- CLASSROOMS
-- ============================================================
INSERT INTO classrooms (id, name, building, capacity, resources) VALUES
('a0000000-0000-0000-0000-000000000001', 'Aula 101', 'Edificio A', 40, '["proyector", "pizarra", "wifi"]'),
('a0000000-0000-0000-0000-000000000002', 'Aula 201', 'Edificio A', 60, '["proyector", "pizarra", "wifi"]'),
('a0000000-0000-0000-0000-000000000003', 'Laboratorio 1', 'Edificio B', 30, '["proyector", "pizarra", "computadores", "wifi"]'),
('a0000000-0000-0000-0000-000000000004', 'Auditorio Principal', 'Edificio C', 200, '["proyector", "sonido", "wifi", "micrófono"]'),
('a0000000-0000-0000-0000-000000000005', 'Sala de Reuniones', 'Edificio A', 15, '["pantalla", "wifi", "videoconferencia"]'),
('a0000000-0000-0000-0000-000000000006', 'Aula 301', 'Edificio A', 35, '["pizarra", "wifi"]'),
('a0000000-0000-0000-0000-000000000007', 'Aula Magna', 'Edificio D', 150, '["proyector", "sonido", "wifi", "micrófono", "aire acondicionado"]')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- FAQ ENTRIES
-- ============================================================
INSERT INTO faq_entries (id, question, answer, category, sort_order) VALUES
('b0000000-0000-0000-0000-000000000001',
 '¿Cómo me registro en la aplicación?',
 'Para registrarte, necesitas tu código estudiantil (formato U########) y un correo electrónico válido. Descarga la app, selecciona "Crear cuenta", ingresa tu código y sigue las instrucciones de verificación.',
 'Cuenta', 1),

('b0000000-0000-0000-0000-000000000002',
 '¿Olvidé mi contraseña, qué hago?',
 'En la pantalla de inicio de sesión, selecciona "¿Olvidaste tu contraseña?". Te enviaremos un enlace de recuperación a tu correo electrónico registrado.',
 'Cuenta', 2),

('b0000000-0000-0000-0000-000000000003',
 '¿Cómo consulto mi horario de clases?',
 'Ve a la sección "Calendario" en el menú principal. Allí podrás ver todos los eventos y clases programados. Puedes filtrar por día, semana o mes.',
 'Calendario', 3),

('b0000000-0000-0000-0000-000000000004',
 '¿Cómo respondo una encuesta?',
 'Las encuestas activas aparecen en la sección "Encuestas" del menú. Selecciona una encuesta disponible, responde las preguntas y presiona "Enviar". Solo puedes responder una vez por encuesta.',
 'Encuestas', 4),

('b0000000-0000-0000-0000-000000000005',
 '¿Dónde veo los anuncios de la universidad?',
 'Los anuncios aparecen en la pantalla principal (Dashboard). Los anuncios urgentes se muestran al inicio con un indicador especial. También puedes filtrar por categoría.',
 'Dashboard', 5),

('b0000000-0000-0000-0000-000000000006',
 '¿Puedo cambiar mi foto de perfil?',
 'Sí, ve a tu perfil (icono en la esquina superior derecha), selecciona "Editar perfil" y toca sobre tu foto actual para cambiarla.',
 'Cuenta', 6),

('b0000000-0000-0000-0000-000000000007',
 '¿La app funciona sin conexión a internet?',
 'La app guarda localmente los anuncios, avisos y FAQ más recientes para que puedas consultarlos sin conexión. Sin embargo, para responder encuestas o ver contenido nuevo necesitas conexión.',
 'General', 7),

('b0000000-0000-0000-0000-000000000008',
 '¿Cómo reporto un problema con la app?',
 'Si encuentras un error o tienes una sugerencia, ve a "Ayuda" en el menú y usa la opción "Reportar problema". Describe el problema y nuestro equipo lo revisará.',
 'Soporte', 8),

('b0000000-0000-0000-0000-000000000009',
 '¿Cómo sé si tengo un evento próximo?',
 'La app te enviará notificaciones cuando un evento en tu calendario esté próximo a iniciar. Asegúrate de tener las notificaciones activadas en la configuración de tu dispositivo.',
 'Calendario', 9),

('b0000000-0000-0000-0000-000000000010',
 '¿Los profesores pueden ver quién respondió las encuestas?',
 'No. Las respuestas de las encuestas son anónimas. Los administradores solo pueden ver resultados agregados (estadísticas), nunca respuestas individuales vinculadas a un estudiante.',
 'Encuestas', 10),

('b0000000-0000-0000-0000-000000000011',
 '¿Cómo me pongo en contacto con un profesor?',
 'En la sección de Calendario, al ver los detalles de un evento o clase, aparece el nombre del profesor asignado. Si tienes dudas académicas, contacta al profesor por los canales oficiales de la universidad.',
 'General', 11),

('b0000000-0000-0000-0000-000000000012',
 '¿Qué hago si mi código estudiantil no es aceptado?',
 'Verifica que el código tenga el formato correcto: "U" seguido de 8 dígitos (ej: U20231001). Si el formato es correcto pero sigue sin funcionar, contacta a la administración de la universidad.',
 'Cuenta', 12)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SURVEYS (example)
-- ============================================================
INSERT INTO surveys (id, title, description, is_active, start_date, end_date) VALUES
('c0000000-0000-0000-0000-000000000001',
 'Encuesta de Satisfacción - Matemáticas I',
 'Encuesta para evaluar la calidad del curso de Matemáticas I durante el semestre actual.',
 true,
 '2026-01-15T00:00:00Z',
 '2026-06-30T23:59:59Z'),

('c0000000-0000-0000-0000-000000000002',
 'Disponibilidad Horaria - Próximo Semestre',
 'Ayúdanos a planificar los horarios del próximo semestre indicando tu disponibilidad.',
 true,
 '2026-05-01T00:00:00Z',
 '2026-05-31T23:59:59Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SURVEY QUESTIONS
-- ============================================================
INSERT INTO survey_questions (id, survey_id, question_text, question_type, options, is_required, sort_order) VALUES
-- Survey 1: Matemáticas I
('d0000000-0000-0000-0000-000000000001',
 'c0000000-0000-0000-0000-000000000001',
 '¿Cómo calificarías la calidad de las clases?',
 'rating', NULL, true, 1),

('d0000000-0000-0000-0000-000000000002',
 'c0000000-0000-0000-0000-000000000001',
 'El material de estudio fue adecuado',
 'single_choice',
 '["Totalmente de acuerdo", "De acuerdo", "Neutral", "En desacuerdo", "Totalmente en desacuerdo"]',
 true, 2),

('d0000000-0000-0000-0000-000000000003',
 'c0000000-0000-0000-0000-000000000001',
 '¿Qué temas te gustaría reforzar?',
 'multiple_choice',
 '["Álgebra lineal", "Cálculo diferencial", "Cálculo integral", "Ecuaciones diferenciales", "Probabilidad"]',
 false, 3),

('d0000000-0000-0000-0000-000000000004',
 'c0000000-0000-0000-0000-000000000001',
 'Comentarios adicionales',
 'text', NULL, false, 4),

-- Survey 2: Disponibilidad Horaria
('d0000000-0000-0000-0000-000000000005',
 'c0000000-0000-0000-0000-000000000002',
 '¿Cuál es tu preferencia de horario?',
 'single_choice',
 '["Mañana (7am-12pm)", "Tarde (12pm-6pm)", "Noche (6pm-10pm)"]',
 true, 1),

('d0000000-0000-0000-0000-000000000006',
 'c0000000-0000-0000-0000-000000000002',
 '¿Qué días prefieres?',
 'multiple_choice',
 '["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]',
 true, 2),

('d0000000-0000-0000-0000-000000000007',
 'c0000000-0000-0000-0000-000000000002',
 '¿Cuántas materias planeas inscribir?',
 'single_choice',
 '["1-2", "3-4", "5-6", "7+"]',
 true, 3)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STUDENT CODE BLACKLIST (reserved/unused codes)
-- ============================================================
INSERT INTO student_code_blacklist (id, student_code, reason) VALUES
('e0000000-0000-0000-0000-000000000001', 'U00000000', 'Código de prueba - no válido para estudiantes reales'),
('e0000000-0000-0000-0000-000000000002', 'U99999999', 'Código de prueba - no válido para estudiantes reales')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- EVENTS
-- Nota: created_by y professor_id se dejan NULL porque dependen
-- de profiles vinculados a auth.users.
-- ============================================================

-- 1. Álgebra Lineal — Lun/Mie/Vie 08:00-10:00, Aula 101
--    Recurre semanal desde el 20 de abril
INSERT INTO events (id, title, description, event_type, classroom_id, professor_id, start_time, end_time, recurring_rule, color)
VALUES (
  'f0000000-0000-0000-0000-000000000001',
  'Álgebra Lineal',
  'Curso de álgebra lineal: matrices, determinantes, espacios vectoriales y transformaciones lineales.',
  'class',
  'a0000000-0000-0000-0000-000000000001',
  NULL,
  '2026-04-20T08:00:00-05:00',
  '2026-04-20T10:00:00-05:00',
  'FREQ=WEEKLY;BYDAY=MO,WE,FR',
  '#3B82F6'
) ON CONFLICT (id) DO NOTHING;

-- 2. Programación I — Lun/Mie 10:00-12:00, Laboratorio 1
--    Recurre semanal desde el 27 de abril
INSERT INTO events (id, title, description, event_type, classroom_id, professor_id, start_time, end_time, recurring_rule, color)
VALUES (
  'f0000000-0000-0000-0000-000000000002',
  'Programación I',
  'Fundamentos de programación en Python: variables, ciclos, funciones, estructuras de datos y algoritmos básicos.',
  'class',
  'a0000000-0000-0000-0000-000000000003',
  NULL,
  '2026-04-27T10:00:00-05:00',
  '2026-04-27T12:00:00-05:00',
  'FREQ=WEEKLY;BYDAY=MO,WE',
  '#3B82F6'
) ON CONFLICT (id) DO NOTHING;

-- 3. Cálculo Diferencial — Mar/Jue 14:00-16:00, Aula 201
--    Recurre semanal desde el 21 de abril
INSERT INTO events (id, title, description, event_type, classroom_id, professor_id, start_time, end_time, recurring_rule, color)
VALUES (
  'f0000000-0000-0000-0000-000000000003',
  'Cálculo Diferencial',
  'Límites, derivadas, aplicaciones de la derivada e introducción a integrales.',
  'class',
  'a0000000-0000-0000-0000-000000000002',
  NULL,
  '2026-04-21T14:00:00-05:00',
  '2026-04-21T16:00:00-05:00',
  'FREQ=WEEKLY;BYDAY=TU,TH',
  '#3B82F6'
) ON CONFLICT (id) DO NOTHING;

-- 4. Física Mecánica — Mié 07:00-10:00, Aula 301
--    Recurre semanal desde el 22 de abril
INSERT INTO events (id, title, description, event_type, classroom_id, professor_id, start_time, end_time, recurring_rule, color)
VALUES (
  'f0000000-0000-0000-0000-000000000004',
  'Física Mecánica',
  'Cinemática, dinámica, leyes de Newton, trabajo y energía, conservación del momento.',
  'class',
  'a0000000-0000-0000-0000-000000000006',
  NULL,
  '2026-04-22T07:00:00-05:00',
  '2026-04-22T10:00:00-05:00',
  'FREQ=WEEKLY;BYDAY=WE',
  '#3B82F6'
) ON CONFLICT (id) DO NOTHING;

-- 5. Inglés Técnico — Jue 09:00-11:00, Aula 101
--    Recurre semanal desde el 23 de abril
INSERT INTO events (id, title, description, event_type, classroom_id, professor_id, start_time, end_time, recurring_rule, color)
VALUES (
  'f0000000-0000-0000-0000-000000000005',
  'Inglés Técnico',
  'Vocabulario técnico en inglés para ingeniería, comprensión de lectura técnica y redacción de informes.',
  'class',
  'a0000000-0000-0000-0000-000000000001',
  NULL,
  '2026-04-23T09:00:00-05:00',
  '2026-04-23T11:00:00-05:00',
  'FREQ=WEEKLY;BYDAY=TH',
  '#3B82F6'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- ONE-TIME EVENTS
-- ============================================================

-- 6. Examen Parcial de Cálculo — Aula Magna
INSERT INTO events (id, title, description, event_type, classroom_id, start_time, end_time, color)
VALUES (
  'f0000000-0000-0000-0000-000000000006',
  'Parcial de Cálculo Diferencial',
  'Primer examen parcial. Temas: límites, continuidad y derivadas. No se permite calculadora gráfica.',
  'exam',
  'a0000000-0000-0000-0000-000000000007',
  '2026-05-12T08:00:00-05:00',
  '2026-05-12T11:00:00-05:00',
  '#EF4444'
) ON CONFLICT (id) DO NOTHING;

-- 7. Charla — IA en la Educación
INSERT INTO events (id, title, description, event_type, classroom_id, start_time, end_time, color)
VALUES (
  'f0000000-0000-0000-0000-000000000007',
  'Charla: Inteligencia Artificial en la Educación',
  'Charla abierta sobre el impacto de la IA en procesos educativos. Invitado: Dr. Andrés Mendoza (Universidad de los Andes).',
  'workshop',
  'a0000000-0000-0000-0000-000000000004',
  '2026-05-15T10:00:00-05:00',
  '2026-05-15T12:00:00-05:00',
  '#F97316'
) ON CONFLICT (id) DO NOTHING;

-- 8. Sustentación de Proyectos
INSERT INTO events (id, title, description, event_type, classroom_id, start_time, end_time, color)
VALUES (
  'f0000000-0000-0000-0000-000000000008',
  'Sustentación de Proyectos de Grado',
  'Sustentación pública de los proyectos de grado de los estudiantes de último semestre. Entrada libre.',
  'meeting',
  'a0000000-0000-0000-0000-000000000004',
  '2026-05-25T14:00:00-05:00',
  '2026-05-25T17:00:00-05:00',
  '#22C55E'
) ON CONFLICT (id) DO NOTHING;

-- 9. Taller de Machine Learning
INSERT INTO events (id, title, description, event_type, classroom_id, start_time, end_time, color)
VALUES (
  'f0000000-0000-0000-0000-000000000009',
  'Taller de Machine Learning con Python',
  'Taller práctico introductorio a machine learning usando scikit-learn. Cupo limitado a 30 personas.',
  'workshop',
  'a0000000-0000-0000-0000-000000000003',
  '2026-05-30T09:00:00-05:00',
  '2026-05-30T13:00:00-05:00',
  '#F97316'
) ON CONFLICT (id) DO NOTHING;

-- 10. Cierre de Notas — Fin de Semestre
INSERT INTO events (id, title, description, event_type, classroom_id, start_time, end_time, color)
VALUES (
  'f0000000-0000-0000-0000-000000000010',
  'Cierre de Notas — Fin de Semestre',
  'Reunión de docentes para el cierre y validación de notas del semestre.',
  'other',
  'a0000000-0000-0000-0000-000000000002',
  '2026-06-01T10:00:00-05:00',
  '2026-06-01T12:00:00-05:00',
  '#6B7280'
) ON CONFLICT (id) DO NOTHING;

-- 11. Reunión de Facultad
INSERT INTO events (id, title, description, event_type, classroom_id, start_time, end_time, color)
VALUES (
  'f0000000-0000-0000-0000-000000000011',
  'Reunión de Facultad de Ingeniería',
  'Reunión mensual del cuerpo docente para tratar temas administrativos y académicos.',
  'meeting',
  'a0000000-0000-0000-0000-000000000005',
  '2026-06-05T15:00:00-05:00',
  '2026-06-05T16:30:00-05:00',
  '#22C55E'
) ON CONFLICT (id) DO NOTHING;

-- 12. Semana de Repaso — Aula 301
INSERT INTO events (id, title, description, event_type, classroom_id, start_time, end_time, color)
VALUES (
  'f0000000-0000-0000-0000-000000000012',
  'Semana de Repaso — Física',
  'Sesión especial de repaso general previa al examen final de Física Mecánica.',
  'class',
  'a0000000-0000-0000-0000-000000000006',
  '2026-06-08T07:00:00-05:00',
  '2026-06-08T09:00:00-05:00',
  '#3B82F6'
) ON CONFLICT (id) DO NOTHING;

-- 13. Examen Ordinario de Física
INSERT INTO events (id, title, description, event_type, classroom_id, start_time, end_time, color)
VALUES (
  'f0000000-0000-0000-0000-000000000013',
  'Examen Ordinario — Física Mecánica',
  'Examen final ordinario (segunda oportunidad). Temas: todo el semestre. Calculadora permitida.',
  'exam',
  'a0000000-0000-0000-0000-000000000002',
  '2026-06-10T14:00:00-05:00',
  '2026-06-10T16:00:00-05:00',
  '#EF4444'
) ON CONFLICT (id) DO NOTHING;

-- 14. Examen Final de Álgebra
INSERT INTO events (id, title, description, event_type, classroom_id, start_time, end_time, color)
VALUES (
  'f0000000-0000-0000-0000-000000000014',
  'Examen Final — Álgebra Lineal',
  'Examen final del curso. Temas: todo el semestre. No se permite calculadora.',
  'exam',
  'a0000000-0000-0000-0000-000000000004',
  '2026-06-15T08:00:00-05:00',
  '2026-06-15T11:00:00-05:00',
  '#EF4444'
) ON CONFLICT (id) DO NOTHING;
