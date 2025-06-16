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
  const yamlMatch = content.match(/^---\s*\n.*?title:\s*["']?([^"'\n]+)["']?\s*\n.*?---/s);
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

export async function searchSimilarChunks(query: string, limit: number = 5): Promise<SearchResult[]> {
  try {
    // Create embedding for the query
    const queryEmbedding = await createEmbedding(query);
    
    // Get all chunks and their documents
    const allChunks = await storage.getAllChunks();
    const results: SearchResult[] = [];
    
    for (const chunk of allChunks) {
      if (!chunk.embedding) continue;
      
      const document = await storage.getDocument(chunk.documentId);
      if (!document || document.status !== "completed") continue;
      
      const similarity = calculateCosineSimilarity(
        queryEmbedding,
        chunk.embedding as number[]
      );
      
      results.push({
        chunk,
        document,
        similarity,
      });
    }
    
    // Sort by similarity and return top results
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
      
  } catch (error) {
    console.error("Error searching similar chunks:", error);
    throw error;
  }
}
