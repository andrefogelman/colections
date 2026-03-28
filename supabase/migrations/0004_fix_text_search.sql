-- Replace full-text search with ILIKE for more flexible matching
-- FTS only matches whole words/stems, ILIKE matches partial text
CREATE OR REPLACE FUNCTION search_items_text(
  query_text text,
  filter_collection_id uuid DEFAULT null
)
RETURNS TABLE (
  id            uuid,
  collection_id uuid,
  description   text,
  created_at    timestamptz
)
LANGUAGE sql STABLE
AS $$
  SELECT i.id, i.collection_id, i.description, i.created_at
  FROM items i
  WHERE i.description ILIKE '%' || query_text || '%'
    AND (filter_collection_id IS NULL OR i.collection_id = filter_collection_id)
  ORDER BY
    -- Exact match first, then starts-with, then contains
    CASE
      WHEN i.description ILIKE query_text THEN 0
      WHEN i.description ILIKE query_text || '%' THEN 1
      ELSE 2
    END,
    i.created_at DESC;
$$;
