-- Increase embedding dimensions from 512 to 1024 for better similarity precision
-- Drop old index and function that reference vector(512)
DROP INDEX IF EXISTS photos_embedding_hnsw;
DROP FUNCTION IF EXISTS search_similar_photos;

-- Clear existing embeddings (they'll be regenerated with 1024 dims)
UPDATE photos SET embedding = NULL;

-- Change column type
ALTER TABLE photos ALTER COLUMN embedding TYPE vector(1024);

-- Recreate HNSW index with new dimensions
CREATE INDEX photos_embedding_hnsw
  ON photos USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Recreate similarity search function with vector(1024)
CREATE OR REPLACE FUNCTION search_similar_photos(
  query_embedding vector(1024),
  match_count     int DEFAULT 10,
  filter_collection_id uuid DEFAULT null
)
RETURNS TABLE (
  item_id         uuid,
  photo_id        uuid,
  url             text,
  distance        float,
  description     text,
  collection_id   uuid,
  collection_name text
)
LANGUAGE sql STABLE
AS $$
  SELECT
    i.id            AS item_id,
    p.id            AS photo_id,
    p.url           AS url,
    p.embedding <=> query_embedding AS distance,
    i.description,
    i.collection_id,
    c.name          AS collection_name
  FROM photos p
  JOIN items i ON i.id = p.item_id
  JOIN collections c ON c.id = i.collection_id
  WHERE p.embedding IS NOT NULL
    AND (filter_collection_id IS NULL OR i.collection_id = filter_collection_id)
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
$$;
