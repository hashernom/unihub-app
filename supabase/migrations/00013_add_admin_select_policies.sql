-- Migration 00013: Add admin SELECT policies for CRUD tables
-- Problem: previous SELECT policies only exposed "active" rows, so admins
-- could not see inactive/cancelled/expired/draft rows to manage them.
-- These policies combine with OR against the existing student policies.

CREATE POLICY "Admins can read all announcements" ON announcements
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can read all notices" ON notices
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can read all surveys" ON surveys
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can read all classrooms" ON classrooms
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can read all events" ON events
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can read all faq_entries" ON faq_entries
    FOR SELECT USING (public.is_admin());
