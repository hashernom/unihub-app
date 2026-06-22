-- Migration 00010: Add language support to FAQ entries
-- Adds a language column and updates search functions to filter by language.

-- Add language column
ALTER TABLE faq_entries ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'es';

-- Ensure existing rows have a value
UPDATE faq_entries SET language = 'es' WHERE language IS NULL;

-- Add constraint for valid languages
ALTER TABLE faq_entries DROP CONSTRAINT IF EXISTS chk_faq_language;
ALTER TABLE faq_entries ADD CONSTRAINT chk_faq_language
    CHECK (language IN ('es', 'en'));

-- Add index for language + active lookups
CREATE INDEX IF NOT EXISTS idx_faq_language_active
    ON faq_entries(language, is_active);

-- Recreate full-text index to include language filter capability
DROP INDEX IF EXISTS idx_faq_fts;
CREATE INDEX IF NOT EXISTS idx_faq_fts
    ON faq_entries USING GIN(to_tsvector('spanish', question || ' ' || answer));

-- Update search functions to accept and filter by language
DROP FUNCTION IF EXISTS search_faq_fts(TEXT, INT);
DROP FUNCTION IF EXISTS search_faq_trigram(TEXT, INT);

CREATE OR REPLACE FUNCTION search_faq_fts(
    query_text TEXT,
    result_limit INT DEFAULT 5,
    query_language TEXT DEFAULT 'es'
)
RETURNS TABLE (
    faq_id UUID,
    question TEXT,
    answer TEXT,
    category TEXT,
    language TEXT,
    relevance_score DOUBLE PRECISION
) AS $$
DECLARE
    config_name TEXT := COALESCE(query_language, 'es');
BEGIN
    RETURN QUERY
    SELECT
        f.id AS faq_id,
        f.question,
        f.answer,
        f.category,
        f.language,
        (
            ts_rank(
                setweight(to_tsvector(config_name, COALESCE(f.question, '')), 'A') ||
                setweight(to_tsvector(config_name, COALESCE(f.answer, '')), 'B'),
                to_tsquery(config_name, query_text),
                32
            ) * 10.0
        )::DOUBLE PRECISION AS relevance_score
    FROM faq_entries f
    WHERE f.is_active = true
      AND f.language = query_language
      AND (
          to_tsvector(config_name, COALESCE(f.question, '')) ||
          to_tsvector(config_name, COALESCE(f.answer, ''))
      ) @@ to_tsquery(config_name, query_text)
    ORDER BY relevance_score DESC
    LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION search_faq_trigram(
    query_text TEXT,
    result_limit INT DEFAULT 5,
    query_language TEXT DEFAULT 'es'
)
RETURNS TABLE (
    faq_id UUID,
    question TEXT,
    answer TEXT,
    category TEXT,
    language TEXT,
    relevance_score DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        f.id AS faq_id,
        f.question,
        f.answer,
        f.category,
        f.language,
        similarity(f.question, query_text)::DOUBLE PRECISION AS relevance_score
    FROM faq_entries f
    WHERE f.is_active = true
      AND f.language = query_language
      AND (
          f.question % query_text
          OR similarity(f.question, query_text) > 0.1
      )
    ORDER BY similarity(f.question, query_text) DESC
    LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
