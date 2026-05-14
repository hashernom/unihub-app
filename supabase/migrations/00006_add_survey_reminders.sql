-- Migration 00006: Add survey_reminders table
-- Prevents duplicate reminder notifications per user per survey.

CREATE TABLE survey_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (survey_id, user_id)
);

CREATE INDEX idx_survey_reminders_survey ON survey_reminders(survey_id);
CREATE INDEX idx_survey_reminders_user ON survey_reminders(user_id);
