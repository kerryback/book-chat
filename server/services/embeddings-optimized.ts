import { storage } from "./storage";
import { createEmbedding, calculateCosineSimilarity } from "./openai";
import type { Document, DocumentChunk } from "@shared/schema";
import memoize from "memoizee";

interface SearchResult {
  chunk: DocumentChunk;
  document: Document;
  similarity: number;
}

// Cache embeddings in memory for frequently accessed queries
const memoizedCreateEmbedding = memoize(createEmbedding, {
  maxAge: 1000 * 60 * 60, // 1 hour
  max: 100, // Maximum 100 cached embeddings
  normalizer: ([query]) => query.toLowerCase().trim()
});

// Pre-load and cache all chunks with their documents
let chunksCache: Array<{
  chunk: DocumentChunk;
  document: Document;
  embedding: number[];
}> | null = null;

async function loadChunksCache() {
  if (chunksCache) return chunksCache;
  
  console.log("Loading chunks cache...");
  const startTime = Date.now();
  
  // Get all completed documents first
  const documents = await storage.getAllDocuments();
  const completedDocs = documents.filter(doc => doc.status === "completed");
  const docMap = new Map(completedDocs.map(doc => [doc.id, doc]));
  
  // Get all chunks with embeddings in one query
  const allChunks = await storage.getAllChunks();
  
  chunksCache = allChunks
    .filter(chunk => chunk.embedding && docMap.has(chunk.documentId))
    .map(chunk => ({
      chunk,
      document: docMap.get(chunk.documentId)!,
      embedding: chunk.embedding as number[]
    }));
  
  console.log(`Chunks cache loaded in ${Date.now() - startTime}ms (${chunksCache.length} chunks)`);
  return chunksCache;
}

// Reload cache when documents are updated
export function invalidateChunksCache() {
  chunksCache = null;
}

export async function searchSimilarChunksOptimized(
  query: string,
  limit: number = 5,
  threshold: number = 0.5
): Promise<SearchResult[]> {
  const startTime = Date.now();
  
  // Create embedding for the query (with caching)
  const queryEmbedding = await memoizedCreateEmbedding(query);
  
  // Load chunks from cache
  const chunks = await loadChunksCache();
  
  // Calculate similarities in parallel batches
  const BATCH_SIZE = 100;
  const results: SearchResult[] = [];
  
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    
    const batchResults = batch.map(({ chunk, document, embedding }) => {
      const similarity = calculateCosineSimilarity(queryEmbedding, embedding);
      return { chunk, document, similarity };
    });
    
    // Only keep results above threshold to reduce memory usage
    results.push(...batchResults.filter(r => r.similarity >= threshold));
  }
  
  // Sort and return top results
  const topResults = results
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
  
  console.log(`Search completed in ${Date.now() - startTime}ms`);
  return topResults;
}

// Precompute and store normalized embeddings for faster cosine similarity
export function normalizeEmbedding(embedding: number[]): number[] {
  const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => val / norm);
}

// Optimized cosine similarity for normalized vectors (just dot product)
export function dotProduct(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}