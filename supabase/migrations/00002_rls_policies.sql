-- Migration 00002: Row Level Security policies
-- Enables RLS on all tables and defines policies for 'student' and 'admin' roles.

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role FROM profiles WHERE id = auth.uid();
    RETURN COALESCE(user_role, 'student');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Helper: check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================
-- ENABLE RLS
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_code_blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_results_cache ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLICIES
-- ============================================================

-- ---------------
-- profiles
-- ---------------
-- Students: read own profile
CREATE POLICY "Students can read own profile" ON profiles
    FOR SELECT USING (id = auth.uid());

-- Students: update own profile
CREATE POLICY "Students can update own profile" ON profiles
    FOR UPDATE USING (id = auth.uid())
    WITH CHECK (id = auth.uid() AND role = 'student');

-- Admins: read all profiles
CREATE POLICY "Admins can read all profiles" ON profiles
    FOR SELECT USING (is_admin());

-- Admins: update any profile
CREATE POLICY "Admins can update any profile" ON profiles
    FOR UPDATE USING (is_admin());

-- ---------------
-- announcements
-- ---------------
-- All authenticated users: read active, non-expired announcements
CREATE POLICY "Users can read active announcements" ON announcements
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL
        AND (expires_at IS NULL OR expires_at > now())
    );

-- Admins: full CRUD
CREATE POLICY "Admins can create announcements" ON announcements
    FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update announcements" ON announcements
    FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete announcements" ON announcements
    FOR DELETE USING (is_admin());

-- ---------------
-- notices
-- ---------------
-- All authenticated users: read active notices
CREATE POLICY "Users can read active notices" ON notices
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL
        AND is_active = true
    );

-- Admins: full CRUD
CREATE POLICY "Admins can create notices" ON notices
    FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update notices" ON notices
    FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete notices" ON notices
    FOR DELETE USING (is_admin());

-- ---------------
-- surveys
-- ---------------
-- Students: read only active surveys within date range
CREATE POLICY "Users can read active surveys" ON surveys
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL
        AND is_active = true
        AND (start_date IS NULL OR start_date <= now())
        AND (end_date IS NULL OR end_date >= now())
    );

-- Admins: full CRUD
CREATE POLICY "Admins can create surveys" ON surveys
    FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update surveys" ON surveys
    FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete surveys" ON surveys
    FOR DELETE USING (is_admin());

-- ---------------
-- survey_questions
-- ---------------
-- Students: read questions of active surveys they can see
CREATE POLICY "Users can read questions of active surveys" ON survey_questions
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM surveys s
            WHERE s.id = survey_id
              AND s.is_active = true
              AND (s.start_date IS NULL OR s.start_date <= now())
              AND (s.end_date IS NULL OR s.end_date >= now())
        )
    );

-- Admins: full CRUD
CREATE POLICY "Admins can manage survey questions" ON survey_questions
    FOR ALL USING (is_admin());

-- ---------------
-- survey_responses
-- ---------------
-- Students: create their own responses
CREATE POLICY "Users can create own survey responses" ON survey_responses
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND NOT is_admin()
    );

-- Students: read their own responses
CREATE POLICY "Users can read own survey responses" ON survey_responses
    FOR SELECT USING (user_id = auth.uid());

-- Admins: read all responses
CREATE POLICY "Admins can read all survey responses" ON survey_responses
    FOR SELECT USING (is_admin());

-- ---------------
-- survey_answers
-- ---------------
-- Students: create answers for their own responses
CREATE POLICY "Users can create answers for own responses" ON survey_answers
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM survey_responses r
            WHERE r.id = response_id
              AND r.user_id = auth.uid()
        )
    );

-- Students: read their own answers
CREATE POLICY "Users can read own survey answers" ON survey_answers
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM survey_responses r
            WHERE r.id = response_id
              AND r.user_id = auth.uid()
        )
    );

-- Admins: read all answers
CREATE POLICY "Admins can read all survey answers" ON survey_answers
    FOR SELECT USING (is_admin());

-- ---------------
-- classrooms
-- ---------------
-- All authenticated users: read active classrooms
CREATE POLICY "Users can read active classrooms" ON classrooms
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL
        AND is_active = true
    );

-- Admins: full CRUD
CREATE POLICY "Admins can create classrooms" ON classrooms
    FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update classrooms" ON classrooms
    FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete classrooms" ON classrooms
    FOR DELETE USING (is_admin());

-- ---------------
-- events
-- ---------------
-- All authenticated users: read non-cancelled events
CREATE POLICY "Users can read events" ON events
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL
        AND is_cancelled = false
    );

-- Admins: full CRUD
CREATE POLICY "Admins can create events" ON events
    FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update events" ON events
    FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete events" ON events
    FOR DELETE USING (is_admin());

-- ---------------
-- faq_entries
-- ---------------
-- All authenticated users: read active FAQ entries
CREATE POLICY "Users can read active FAQ entries" ON faq_entries
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL
        AND is_active = true
    );

-- Admins: full CRUD
CREATE POLICY "Admins can create FAQ entries" ON faq_entries
    FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update FAQ entries" ON faq_entries
    FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete FAQ entries" ON faq_entries
    FOR DELETE USING (is_admin());

-- ---------------
-- help_queries
-- ---------------
-- Students: create their own queries
CREATE POLICY "Users can create own help queries" ON help_queries
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Students: read their own queries
CREATE POLICY "Users can read own help queries" ON help_queries
    FOR SELECT USING (user_id = auth.uid());

-- Admins: read and update all queries
CREATE POLICY "Admins can read all help queries" ON help_queries
    FOR SELECT USING (is_admin());

CREATE POLICY "Admins can update help queries" ON help_queries
    FOR UPDATE USING (is_admin());

-- ---------------
-- notification_tokens
-- ---------------
-- Users: manage their own tokens
CREATE POLICY "Users can insert own notification tokens" ON notification_tokens
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read own notification tokens" ON notification_tokens
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notification tokens" ON notification_tokens
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own notification tokens" ON notification_tokens
    FOR DELETE USING (user_id = auth.uid());

-- Admins: read all tokens (for sending notifications)
CREATE POLICY "Admins can read all notification tokens" ON notification_tokens
    FOR SELECT USING (is_admin());

-- ---------------
-- student_code_blacklist
-- ---------------
-- Only admins can access the blacklist
CREATE POLICY "Admins can manage blacklist" ON student_code_blacklist
    FOR ALL USING (is_admin());

-- ---------------
-- survey_results_cache
-- ---------------
-- Admins: full access
CREATE POLICY "Admins can manage survey results cache" ON survey_results_cache
    FOR ALL USING (is_admin());

-- Students: read cached results of surveys they can access
CREATE POLICY "Users can read survey results cache" ON survey_results_cache
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM surveys s
            WHERE s.id = survey_id
              AND s.is_active = true
        )
    );
