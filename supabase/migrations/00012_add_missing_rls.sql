-- Migration 00012: Enable RLS on tables created without it
-- recurring_exceptions (M4) and survey_reminders (M3) were missing RLS,
-- leaving them open to reads/writes by any authenticated or anon client.

-- ============================================================
-- recurring_exceptions
-- ============================================================
ALTER TABLE recurring_exceptions ENABLE ROW LEVEL SECURITY;

-- Students need to read exceptions to render the calendar correctly,
-- but only admins can create/modify/delete them.
CREATE POLICY "Users can read recurring exceptions" ON recurring_exceptions
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage recurring exceptions" ON recurring_exceptions
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- survey_reminders
-- ============================================================
ALTER TABLE survey_reminders ENABLE ROW LEVEL SECURITY;

-- Only cron/edge functions (service_role) should write reminders.
-- Admins may read them for debugging/monitoring.
CREATE POLICY "Admins can read survey reminders" ON survey_reminders
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Service role can manage survey reminders" ON survey_reminders
    FOR ALL USING (auth.role() = 'service_role');
