-- Migration 00007: Recurring event exceptions
-- Tracks individual instance modifications for recurring events
-- (e.g., cancel a single occurrence without cancelling the whole series)

CREATE TABLE IF NOT EXISTS recurring_exceptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    exception_date DATE NOT NULL,
    is_cancelled BOOLEAN DEFAULT true,
    new_start_time TIMESTAMPTZ,
    new_end_time TIMESTAMPTZ,
    title TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(event_id, exception_date)
);

CREATE INDEX IF NOT EXISTS idx_recurring_exceptions_event
    ON recurring_exceptions(event_id);
