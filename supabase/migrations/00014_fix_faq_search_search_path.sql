-- Migration 00014: Add explicit search_path to FAQ search functions
-- These SECURITY DEFINER functions query public.faq_entries; without a
-- fixed search_path they are vulnerable to search_path injection.
-- This aligns them with handle_new_user which already uses SET search_path.

DROP FUNCTION IF EXISTS public.search_faq_fts(TEXT, INT, TEXT);
DROP FUNCTION IF EXISTS public.search_faq_trigram(TEXT, INT, TEXT);

-- ============================================================
-- Full-text search function
-- ============================================================
CREATE OR REPLACE FUNCTION public.search_faq_fts(
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
    FROM public.faq_entries f
    WHERE f.is_active = true
      AND f.language = query_language
      AND (
          to_tsvector(config_name, COALESCE(f.question, '')) ||
          to_tsvector(config_name, COALESCE(f.answer, ''))
      ) @@ to_tsquery(config_name, query_text)
    ORDER BY relevance_score DESC
    LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- Trigram fallback function
-- ============================================================
CREATE OR REPLACE FUNCTION public.search_faq_trigram(
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
    FROM public.faq_entries f
    WHERE f.is_active = true
      AND f.language = query_language
      AND (
          f.question % query_text
          OR similarity(f.question, query_text) > 0.1
      )
    ORDER BY similarity(f.question, query_text) DESC
    LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
