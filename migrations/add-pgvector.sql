-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add a proper vector column to document_chunks
ALTER TABLE document_chunks 
ADD COLUMN IF NOT EXISTS embedding_vector vector(1536);

-- Migrate existing embeddings from JSONB to vector type
UPDATE document_chunks 
SET embedding_vector = embedding::vector
WHERE embedding IS NOT NULL;

-- Create an index for fast similarity search
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx 
ON document_chunks 
USING ivfflat (embedding_vector vector_cosine_ops)
WITH (lists = 100);

-- Example query with pgvector:
-- SELECT id, content, 1 - (embedding_vector <=> $1::vector) as similarity
-- FROM document_chunks
-- WHERE embedding_vector IS NOT NULL
-- ORDER BY embedding_vector <=> $1::vector
-- LIMIT 5;