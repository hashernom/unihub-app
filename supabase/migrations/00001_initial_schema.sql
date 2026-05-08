-- Migration 00001: Initial schema
-- Creates all core tables with constraints, defaults, and relationships.

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- TABLES
-- ============================================================

-- Profiles (linked to auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    student_code TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT CHECK (role IN ('student', 'admin')) DEFAULT 'student',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Announcements
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    category TEXT CHECK (category IN ('general', 'academic', 'event', 'urgent')) DEFAULT 'general',
    is_pinned BOOLEAN DEFAULT false,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Notices
CREATE TABLE notices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Surveys
CREATE TABLE surveys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    allow_multiple_responses BOOLEAN DEFAULT false,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Survey Questions
CREATE TABLE survey_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE NOT NULL,
    question_text TEXT NOT NULL,
    question_type TEXT CHECK (question_type IN ('text', 'single_choice', 'multiple_choice', 'rating')) DEFAULT 'text',
    options JSONB,           -- For single_choice/multiple_choice: ["Option A", "Option B"]
    is_required BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Survey Responses (one per user per survey, unless allow_multiple_responses is true)
CREATE TABLE survey_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    submitted_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_survey_user UNIQUE (survey_id, user_id),
    CONSTRAINT fk_survey_active CHECK (
        EXISTS (
            SELECT 1 FROM surveys s
            WHERE s.id = survey_id
              AND s.is_active = true
              AND (s.start_date IS NULL OR s.start_date <= now())
              AND (s.end_date IS NULL OR s.end_date >= now())
        )
    )
);

-- Survey Answers
CREATE TABLE survey_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    response_id UUID REFERENCES survey_responses(id) ON DELETE CASCADE NOT NULL,
    question_id UUID REFERENCES survey_questions(id) ON DELETE CASCADE NOT NULL,
    answer_text TEXT,
    answer_options JSONB,   -- Selected options for choice questions
    answer_rating INT CHECK (answer_rating >= 1 AND answer_rating <= 5),
    UNIQUE (response_id, question_id)
);

-- Classrooms
CREATE TABLE classrooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    building TEXT,
    capacity INT CHECK (capacity > 0),
    resources JSONB,        -- ["projector", "whiteboard", "computers"]
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Events
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT CHECK (event_type IN ('class', 'exam', 'meeting', 'workshop', 'other')) DEFAULT 'other',
    classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL,
    professor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    recurring_rule TEXT,    -- RRULE format for repeating events
    color TEXT DEFAULT '#3B82F6',
    is_cancelled BOOLEAN DEFAULT false,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT chk_end_after_start CHECK (end_time > start_time)
);

-- Exclusion constraint: no overlapping events in the same classroom
-- Requires btree_gist extension
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'btree_gist') THEN
        ALTER TABLE events ADD CONSTRAINT ex_no_overlap
            EXCLUDE USING GIST (
                classroom_id WITH =,
                tstzrange(start_time, end_time) WITH &&
            ) WHERE (classroom_id IS NOT NULL AND is_cancelled = false);
    END IF;
END $$;

-- FAQ Entries
CREATE TABLE faq_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Help Queries (user search history for help bot)
CREATE TABLE help_queries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    query_text TEXT NOT NULL,
    matched_faq_id UUID REFERENCES faq_entries(id) ON DELETE SET NULL,
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Notification tokens (FCM)
CREATE TABLE notification_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    fcm_token TEXT NOT NULL,
    device_info TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, fcm_token)
);

-- Student code blacklist (for validate-student-code edge function)
CREATE TABLE student_code_blacklist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_code TEXT UNIQUE NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Survey results cache (materialized for performance)
CREATE TABLE survey_results_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE NOT NULL,
    results JSONB NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '1 hour')
);

-- ============================================================
-- TRIGGERS for updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_announcements_updated_at BEFORE UPDATE ON announcements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_notices_updated_at BEFORE UPDATE ON notices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_surveys_updated_at BEFORE UPDATE ON surveys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_classrooms_updated_at BEFORE UPDATE ON classrooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_faq_entries_updated_at BEFORE UPDATE ON faq_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_notification_tokens_updated_at BEFORE UPDATE ON notification_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- INDEXES
-- ============================================================

-- Profiles
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_student_code ON profiles(student_code);

-- Announcements
CREATE INDEX idx_announcements_category ON announcements(category);
CREATE INDEX idx_announcements_created_at ON announcements(created_at DESC);
CREATE INDEX idx_announcements_expires_at ON announcements(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_announcements_pinned ON announcements(is_pinned) WHERE is_pinned = true;

-- Notices
CREATE INDEX idx_notices_priority ON notices(priority);
CREATE INDEX idx_notices_active ON notices(is_active) WHERE is_active = true;

-- Surveys
CREATE INDEX idx_surveys_active ON surveys(is_active) WHERE is_active = true;
CREATE INDEX idx_surveys_end_date ON surveys(end_date) WHERE end_date IS NOT NULL;

-- Survey Questions
CREATE INDEX idx_survey_questions_survey ON survey_questions(survey_id, sort_order);

-- Survey Responses
CREATE INDEX idx_survey_responses_survey ON survey_responses(survey_id);
CREATE INDEX idx_survey_responses_user ON survey_responses(user_id);

-- Survey Answers
CREATE INDEX idx_survey_answers_response ON survey_answers(response_id);
CREATE INDEX idx_survey_answers_question ON survey_answers(question_id);

-- Events
CREATE INDEX idx_events_start_time ON events(start_time);
CREATE INDEX idx_events_classroom ON events(classroom_id);
CREATE INDEX idx_events_professor ON events(professor_id);
CREATE INDEX idx_events_date_range ON events(start_time, end_time);

-- FAQ Entries (for full-text search in help-bot)
CREATE INDEX idx_faq_fts ON faq_entries USING GIN(to_tsvector('spanish', question || ' ' || answer));
CREATE INDEX idx_faq_active ON faq_entries(is_active) WHERE is_active = true;
CREATE INDEX idx_faq_trgm ON faq_entries USING GIN(question gin_trgm_ops);

-- Help Queries
CREATE INDEX idx_help_queries_user ON help_queries(user_id);
CREATE INDEX idx_help_queries_resolved ON help_queries(resolved);

-- Notification Tokens
CREATE INDEX idx_notification_tokens_user ON notification_tokens(user_id);
CREATE INDEX idx_notification_tokens_active ON notification_tokens(is_active) WHERE is_active = true;

-- Survey Results Cache
CREATE INDEX idx_survey_cache_survey ON survey_results_cache(survey_id);
CREATE INDEX idx_survey_cache_expires ON survey_results_cache(expires_at);
