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

export interface IStorage {
  // Document operations
  createDocument(doc: InsertDocument): Promise<Document>;
  getDocument(id: number): Promise<Document | undefined>;
  getAllDocuments(): Promise<Document[]>;
  updateDocumentStatus(id: number, status: string, errorMessage?: string): Promise<void>;
  updateDocumentChunkCount(id: number, chunkCount: number): Promise<void>;
  deleteDocument(id: number): Promise<void>;
  
  // Document chunk operations
  createDocumentChunk(documentId: number, content: string, embedding: number[], chunkIndex: number): Promise<DocumentChunk>;
  getDocumentChunks(documentId: number): Promise<DocumentChunk[]>;
  getAllChunks(): Promise<DocumentChunk[]>;
  deleteDocumentChunks(documentId: number): Promise<void>;
  
  // Chat operations
  createChatMessage(message: InsertChatMessage & { sources?: any }): Promise<ChatMessage>;
  getChatMessages(limit?: number): Promise<ChatMessage[]>;
  clearChatHistory(): Promise<void>;
}

export class MemStorage implements IStorage {
  private documents: Map<number, Document>;
  private documentChunks: Map<number, DocumentChunk>;
  private chatMessages: Map<number, ChatMessage>;
  private currentDocId: number;
  private currentChunkId: number;
  private currentMessageId: number;

  constructor() {
    this.documents = new Map();
    this.documentChunks = new Map();
    this.chatMessages = new Map();
    this.currentDocId = 1;
    this.currentChunkId = 1;
    this.currentMessageId = 1;
  }

  async createDocument(insertDoc: InsertDocument): Promise<Document> {
    const id = this.currentDocId++;
    const doc: Document = {
      ...insertDoc,
      id,
      chunkCount: 0,
      status: "processing",
      errorMessage: null,
      createdAt: new Date(),
    };
    this.documents.set(id, doc);
    return doc;
  }

  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async getAllDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async updateDocumentStatus(id: number, status: string, errorMessage?: string): Promise<void> {
    const doc = this.documents.get(id);
    if (doc) {
      doc.status = status;
      doc.errorMessage = errorMessage || null;
      this.documents.set(id, doc);
    }
  }

  async updateDocumentChunkCount(id: number, chunkCount: number): Promise<void> {
    const doc = this.documents.get(id);
    if (doc) {
      doc.chunkCount = chunkCount;
      this.documents.set(id, doc);
    }
  }

  async deleteDocument(id: number): Promise<void> {
    this.documents.delete(id);
    await this.deleteDocumentChunks(id);
  }

  async createDocumentChunk(documentId: number, content: string, embedding: number[], chunkIndex: number): Promise<DocumentChunk> {
    const id = this.currentChunkId++;
    const chunk: DocumentChunk = {
      id,
      documentId,
      content,
      embedding: embedding as any,
      chunkIndex,
    };
    this.documentChunks.set(id, chunk);
    return chunk;
  }

  async getDocumentChunks(documentId: number): Promise<DocumentChunk[]> {
    return Array.from(this.documentChunks.values())
      .filter(chunk => chunk.documentId === documentId)
      .sort((a, b) => a.chunkIndex - b.chunkIndex);
  }

  async getAllChunks(): Promise<DocumentChunk[]> {
    return Array.from(this.documentChunks.values());
  }

  async deleteDocumentChunks(documentId: number): Promise<void> {
    const toDelete = Array.from(this.documentChunks.entries())
      .filter(([_, chunk]) => chunk.documentId === documentId)
      .map(([id, _]) => id);
    
    toDelete.forEach(id => this.documentChunks.delete(id));
  }

  async createChatMessage(message: InsertChatMessage & { sources?: any }): Promise<ChatMessage> {
    const id = this.currentMessageId++;
    const chatMessage: ChatMessage = {
      ...message,
      id,
      sources: message.sources || null,
      createdAt: new Date(),
    };
    this.chatMessages.set(id, chatMessage);
    return chatMessage;
  }

  async getChatMessages(limit: number = 50): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values())
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(-limit);
  }

  async clearChatHistory(): Promise<void> {
    this.chatMessages.clear();
  }
}

export const storage = new MemStorage();
