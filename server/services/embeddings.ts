import { storage } from "../storage";
import { createEmbedding, calculateCosineSimilarity } from "./openai";
import type { Document, DocumentChunk } from "@shared/schema";

const CHUNK_SIZE = 1000; // Characters per chunk
const CHUNK_OVERLAP = 200; // Overlap between chunks

export interface ChunkWithMetadata {
  content: string;
  sectionTitle?: string;
}

export function extractChapterTitle(content: string): string | null {
  // Look for YAML frontmatter title or first # heading
  const yamlMatch = content.match(/^---[\s\S]*?title:\s*["']?([^"'\n]+)["']?[\s\S]*?---/m);
  if (yamlMatch) {
    return yamlMatch[1].trim();
  }

  // Look for first # heading (chapter title)
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) {
    return h1Match[1].trim();
  }

  return null;
}

export function chunkTextWithMetadata(text: string): ChunkWithMetadata[] {
  const chunks: ChunkWithMetadata[] = [];
  let start = 0;
  
  // Extract all section headings (## and ###) with their positions
  const sectionHeadings: { position: number; title: string; level: number }[] = [];
  const headingRegex = /^(#{2,})\s+(.+)$/gm;
  let match;
  
  while ((match = headingRegex.exec(text)) !== null) {
    sectionHeadings.push({
      position: match.index,
      title: match[2].trim(),
      level: match[1].length
    });
  }

  while (start < text.length) {
    let end = start + CHUNK_SIZE;
    
    // If we're not at the end of the text, try to break at a sentence or paragraph
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('.', end);
      const lastNewline = text.lastIndexOf('\n', end);
      const breakPoint = Math.max(lastPeriod, lastNewline);
      
      if (breakPoint > start + CHUNK_SIZE / 2) {
        end = breakPoint + 1;
      }
    }

    const chunkContent = text.slice(start, end).trim();
    if (chunkContent.length > 0) {
      // Find the most recent section heading before this chunk
      let sectionTitle: string | undefined;
      for (let i = sectionHeadings.length - 1; i >= 0; i--) {
        if (sectionHeadings[i].position <= start) {
          sectionTitle = sectionHeadings[i].title;
          break;
        }
      }

      chunks.push({
        content: chunkContent,
        sectionTitle
      });
    }
    
    start = end - CHUNK_OVERLAP;
  }

  return chunks;
}

export async function processDocument(document: Document): Promise<void> {
  try {
    console.log(`Processing document: ${document.filename}`);
    
    // Extract chapter title and update document
    const chapterTitle = extractChapterTitle(document.content);
    if (chapterTitle) {
      await storage.updateDocumentChapterTitle(document.id, chapterTitle);
    }
    
    // Clear any existing chunks for this document
    await storage.deleteDocumentChunks(document.id);
    
    // Chunk the document content with metadata
    const chunks = chunkTextWithMetadata(document.content);
    console.log(`Created ${chunks.length} chunks for ${document.filename}`);
    
    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`Processing chunk ${i + 1}/${chunks.length} for ${document.filename}`);
      
      try {
        const embedding = await createEmbedding(chunk.content);
        await storage.createDocumentChunkWithMetadata(
          document.id, 
          chunk.content, 
          embedding, 
          i, 
          chunk.sectionTitle
        );
      } catch (error) {
        console.error(`Failed to process chunk ${i + 1} for ${document.filename}:`, error);
        throw error;
      }
    }
    
    // Update document status
    await storage.updateDocumentChunkCount(document.id, chunks.length);
    await storage.updateDocumentStatus(document.id, "completed");
    
    // Invalidate cache after processing new document
    invalidateEmbeddingsCache();
    
    console.log(`Successfully processed ${document.filename}`);
  } catch (error) {
    console.error(`Error processing document ${document.filename}:`, error);
    await storage.updateDocumentStatus(document.id, "error", error.message);
    throw error;
  }
}

export interface SearchResult {
  chunk: DocumentChunk;
  document: Document;
  similarity: number;
}

// Cache for chunks and documents to avoid repeated database queries
let chunksCache: { 
  chunks: DocumentChunk[], 
  documents: Map<number, Document>, 
  lastUpdate: number 
} | null = null;

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

async function getCachedChunksAndDocs() {
  const now = Date.now();
  
  // Return cached data if still valid
  if (chunksCache && (now - chunksCache.lastUpdate) < CACHE_TTL) {
    return chunksCache;
  }
  
  console.log("[Embeddings] Loading chunks and documents into cache...");
  const startTime = Date.now();
  
  // Get all documents and create a map for O(1) lookup
  const allDocs = await storage.getAllDocuments();
  const docsMap = new Map(
    allDocs
      .filter(doc => doc.status === "completed")
      .map(doc => [doc.id, doc])
  );
  
  // Get all chunks with embeddings
  const allChunks = await storage.getAllChunks();
  const chunksWithEmbeddings = allChunks.filter(chunk => 
    chunk.embedding && docsMap.has(chunk.documentId)
  );
  
  chunksCache = {
    chunks: chunksWithEmbeddings,
    documents: docsMap,
    lastUpdate: now
  };
  
  console.log(`[Embeddings] Cache loaded in ${Date.now() - startTime}ms (${chunksWithEmbeddings.length} chunks)`);
  return chunksCache;
}

// Call this when documents are added/updated to invalidate cache
export function invalidateEmbeddingsCache() {
  chunksCache = null;
}

export async function searchSimilarChunks(query: string, limit: number = 5): Promise<SearchResult[]> {
  try {
    const startTime = Date.now();
    
    // Create embedding for the query
    const queryEmbedding = await createEmbedding(query);
    console.log(`[Embeddings] Query embedding created in ${Date.now() - startTime}ms`);
    
    // Get cached chunks and documents
    const { chunks, documents } = await getCachedChunksAndDocs();
    
    // Process chunks in batches to avoid blocking
    const results: SearchResult[] = [];
    const BATCH_SIZE = 100;
    const similarityThreshold = 0.3; // Ignore very dissimilar results
    
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, Math.min(i + BATCH_SIZE, chunks.length));
      
      const batchResults = batch
        .map(chunk => {
          const similarity = calculateCosineSimilarity(
            queryEmbedding,
            chunk.embedding as number[]
          );
          
          return {
            chunk,
            document: documents.get(chunk.documentId)!,
            similarity
          };
        })
        .filter(result => result.similarity > similarityThreshold);
      
      results.push(...batchResults);
    }
    
    // Sort by similarity and return top results
    const topResults = results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
    
    console.log(`[Embeddings] Search completed in ${Date.now() - startTime}ms (found ${topResults.length} results)`);
    return topResults;
      
  } catch (error) {
    console.error("Error searching similar chunks:", error);
    throw error;
  }
}
