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
