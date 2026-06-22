-- Migration 00008: User notification settings
-- Allows users to control which notifications they receive

CREATE TABLE IF NOT EXISTS user_notification_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
    event_reminder_1h BOOLEAN DEFAULT true,
    event_reminder_15m BOOLEAN DEFAULT true,
    survey_reminders BOOLEAN DEFAULT true,
    announcement_notifications BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_user_notification_settings_updated_at
    BEFORE UPDATE ON user_notification_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE user_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notification settings"
    ON user_notification_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own notification settings"
    ON user_notification_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification settings"
    ON user_notification_settings FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can read all settings"
    ON user_notification_settings FOR SELECT
    USING (auth.role() = 'service_role');
