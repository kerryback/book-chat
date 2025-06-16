import { pgTable, text, serial, integer, boolean, timestamp, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  content: text("content").notNull(),
  size: integer("size").notNull(),
  chunkCount: integer("chunk_count").notNull().default(0),
  status: text("status").notNull().default("processing"), // processing, completed, error
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const documentChunks = pgTable("document_chunks", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  content: text("content").notNull(),
  embedding: jsonb("embedding"), // Store as JSON array
  chunkIndex: integer("chunk_index").notNull(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  role: text("role").notNull(), // user, assistant
  sources: jsonb("sources"), // Array of source document references
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDocumentSchema = createInsertSchema(documents).pick({
  filename: true,
  content: true,
  size: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).pick({
  content: true,
  role: true,
});

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;
export type DocumentChunk = typeof documentChunks.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
