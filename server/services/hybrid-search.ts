import { sql } from "drizzle-orm";
import { db } from "../db";
import { documentChunks } from "@shared/schema";
import { createEmbedding } from "./openai";

interface HybridSearchOptions {
  query: string;
  limit?: number;
  semanticWeight?: number;
  keywordWeight?: number;
  sectionFilter?: string;
}

/**
 * Hybrid search combining semantic vector search with keyword search
 */
export async function hybridSearch({
  query,
  limit = 5,
  semanticWeight = 0.7,
  keywordWeight = 0.3,
  sectionFilter
}: HybridSearchOptions) {
  // 1. Create embedding for semantic search
  const queryEmbedding = await createEmbedding(query);
  
  // 2. Perform semantic search using pgvector
  const semanticResults = await db.execute(sql`
    WITH semantic_search AS (
      SELECT 
        dc.id,
        dc.content,
        dc.section_title,
        dc.document_id,
        1 - (dc.embedding_vector <=> ${queryEmbedding}::vector) as semantic_score
      FROM document_chunks dc
      WHERE dc.embedding_vector IS NOT NULL
      ${sectionFilter ? sql`AND dc.section_title = ${sectionFilter}` : sql``}
      ORDER BY dc.embedding_vector <=> ${queryEmbedding}::vector
      LIMIT ${limit * 2}
    )
    SELECT * FROM semantic_search
  `);
  
  // 3. Perform keyword search using PostgreSQL full-text search
  const keywordResults = await db.execute(sql`
    WITH keyword_search AS (
      SELECT 
        dc.id,
        dc.content,
        dc.section_title,
        dc.document_id,
        ts_rank_cd(
          to_tsvector('english', dc.content),
          plainto_tsquery('english', ${query})
        ) as keyword_score
      FROM document_chunks dc
      WHERE to_tsvector('english', dc.content) @@ plainto_tsquery('english', ${query})
      ${sectionFilter ? sql`AND dc.section_title = ${sectionFilter}` : sql``}
      ORDER BY keyword_score DESC
      LIMIT ${limit * 2}
    )
    SELECT * FROM keyword_search
  `);
  
  // 4. Combine and re-rank results
  const combinedResults = new Map();
  
  // Add semantic results
  semanticResults.rows.forEach(row => {
    combinedResults.set(row.id, {
      ...row,
      combinedScore: row.semantic_score * semanticWeight
    });
  });
  
  // Add/update with keyword results
  keywordResults.rows.forEach(row => {
    const existing = combinedResults.get(row.id);
    if (existing) {
      existing.combinedScore += row.keyword_score * keywordWeight;
    } else {
      combinedResults.set(row.id, {
        ...row,
        combinedScore: row.keyword_score * keywordWeight
      });
    }
  });
  
  // 5. Sort by combined score and return top results
  return Array.from(combinedResults.values())
    .sort((a, b) => b.combinedScore - a.combinedScore)
    .slice(0, limit);
}

/**
 * Pre-compute text search vectors for faster keyword search
 */
export async function createTextSearchIndex() {
  await db.execute(sql`
    -- Add text search vector column
    ALTER TABLE document_chunks 
    ADD COLUMN IF NOT EXISTS search_vector tsvector;
    
    -- Update search vectors
    UPDATE document_chunks 
    SET search_vector = to_tsvector('english', content);
    
    -- Create GIN index for fast text search
    CREATE INDEX IF NOT EXISTS document_chunks_search_idx 
    ON document_chunks 
    USING GIN (search_vector);
  `);
}