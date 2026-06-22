-- Migration 00009: Help bot search functions
-- Adds RPC functions used by the help-bot-search Edge Function.
-- Includes full-text search (weighted) and trigram fallback.

-- Ensure extensions exist
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- Full-text search function
-- Weight: question=2x, answer=1x
-- ============================================================
CREATE OR REPLACE FUNCTION search_faq_fts(query_text TEXT, result_limit INT DEFAULT 5)
RETURNS TABLE (
    faq_id UUID,
    question TEXT,
    answer TEXT,
    category TEXT,
    relevance_score DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        f.id AS faq_id,
        f.question,
        f.answer,
        f.category,
        (
            ts_rank(
                setweight(to_tsvector('spanish', COALESCE(f.question, '')), 'A') ||
                setweight(to_tsvector('spanish', COALESCE(f.answer, '')), 'B'),
                to_tsquery('spanish', query_text),
                32
            ) * 10.0
        )::DOUBLE PRECISION AS relevance_score
    FROM faq_entries f
    WHERE f.is_active = true
      AND (
          to_tsvector('spanish', COALESCE(f.question, '')) ||
          to_tsvector('spanish', COALESCE(f.answer, ''))
      ) @@ to_tsquery('spanish', query_text)
    ORDER BY relevance_score DESC
    LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Trigram fallback function
-- ============================================================
CREATE OR REPLACE FUNCTION search_faq_trigram(query_text TEXT, result_limit INT DEFAULT 5)
RETURNS TABLE (
    faq_id UUID,
    question TEXT,
    answer TEXT,
    category TEXT,
    relevance_score DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        f.id AS faq_id,
        f.question,
        f.answer,
        f.category,
        similarity(f.question, query_text)::DOUBLE PRECISION AS relevance_score
    FROM faq_entries f
    WHERE f.is_active = true
      AND (
          f.question % query_text
          OR similarity(f.question, query_text) > 0.1
      )
    ORDER BY similarity(f.question, query_text) DESC
    LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Ensure indexes are in place
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_faq_fts ON faq_entries
    USING GIN(to_tsvector('spanish', question || ' ' || answer));
CREATE INDEX IF NOT EXISTS idx_faq_trgm ON faq_entries
    USING GIN(question gin_trgm_ops);
