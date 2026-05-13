-- Migration 00005: Enable Realtime for dashboard tables
-- Allows the client to subscribe to real-time changes.

-- Add tables to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE notices;
