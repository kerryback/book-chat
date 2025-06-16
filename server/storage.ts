import { 
  documents, 
  documentChunks, 
  chatMessages,
  type Document, 
  type DocumentChunk,
  type ChatMessage,
  type InsertDocument,
  type InsertChatMessage
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Document operations
  createDocument(doc: InsertDocument): Promise<Document>;
  getDocument(id: number): Promise<Document | undefined>;
  getAllDocuments(): Promise<Document[]>;
  updateDocumentStatus(id: number, status: string, errorMessage?: string): Promise<void>;
  updateDocumentChunkCount(id: number, chunkCount: number): Promise<void>;
  updateDocumentChapterTitle(id: number, chapterTitle: string): Promise<void>;
  deleteDocument(id: number): Promise<void>;
  
  // Document chunk operations
  createDocumentChunk(documentId: number, content: string, embedding: number[], chunkIndex: number): Promise<DocumentChunk>;
  createDocumentChunkWithMetadata(documentId: number, content: string, embedding: number[], chunkIndex: number, sectionTitle?: string): Promise<DocumentChunk>;
  getDocumentChunks(documentId: number): Promise<DocumentChunk[]>;
  getAllChunks(): Promise<DocumentChunk[]>;
  deleteDocumentChunks(documentId: number): Promise<void>;
  
  // Chat operations
  createChatMessage(message: InsertChatMessage & { sources?: any }): Promise<ChatMessage>;
  getChatMessages(limit?: number): Promise<ChatMessage[]>;
  clearChatHistory(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async createDocument(insertDoc: InsertDocument): Promise<Document> {
    const [document] = await db
      .insert(documents)
      .values(insertDoc)
      .returning();
    return document;
  }

  async getDocument(id: number): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document || undefined;
  }

  async getAllDocuments(): Promise<Document[]> {
    return await db.select().from(documents).orderBy(documents.createdAt);
  }

  async updateDocumentStatus(id: number, status: string, errorMessage?: string): Promise<void> {
    await db
      .update(documents)
      .set({ status, errorMessage })
      .where(eq(documents.id, id));
  }

  async updateDocumentChunkCount(id: number, chunkCount: number): Promise<void> {
    await db
      .update(documents)
      .set({ chunkCount })
      .where(eq(documents.id, id));
  }

  async updateDocumentChapterTitle(id: number, chapterTitle: string): Promise<void> {
    await db
      .update(documents)
      .set({ chapterTitle })
      .where(eq(documents.id, id));
  }

  async deleteDocument(id: number): Promise<void> {
    await this.deleteDocumentChunks(id);
    await db.delete(documents).where(eq(documents.id, id));
  }

  async createDocumentChunk(documentId: number, content: string, embedding: number[], chunkIndex: number): Promise<DocumentChunk> {
    const [chunk] = await db
      .insert(documentChunks)
      .values({
        documentId,
        content,
        embedding: embedding as any,
        chunkIndex,
      })
      .returning();
    return chunk;
  }

  async getDocumentChunks(documentId: number): Promise<DocumentChunk[]> {
    return await db
      .select()
      .from(documentChunks)
      .where(eq(documentChunks.documentId, documentId))
      .orderBy(documentChunks.chunkIndex);
  }

  async getAllChunks(): Promise<DocumentChunk[]> {
    return await db.select().from(documentChunks);
  }

  async deleteDocumentChunks(documentId: number): Promise<void> {
    await db.delete(documentChunks).where(eq(documentChunks.documentId, documentId));
  }

  async createChatMessage(message: InsertChatMessage & { sources?: any }): Promise<ChatMessage> {
    const [chatMessage] = await db
      .insert(chatMessages)
      .values({
        content: message.content,
        role: message.role,
        sources: message.sources || null,
      })
      .returning();
    return chatMessage;
  }

  async getChatMessages(limit: number = 50): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .orderBy(chatMessages.createdAt)
      .limit(limit);
  }

  async clearChatHistory(): Promise<void> {
    await db.delete(chatMessages);
  }
}

export const storage = new DatabaseStorage();
