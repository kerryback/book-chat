import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { processDocument, searchSimilarChunks } from "./services/embeddings";
import { createChatCompletion } from "./services/openai";
import { insertDocumentSchema, insertChatMessageSchema } from "@shared/schema";

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/",
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.md' || ext === '.markdown' || ext === '.qmd') {
      cb(null, true);
    } else {
      cb(new Error('Only markdown and Quarto files are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Root health check
  app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Root endpoint for Koyeb health checks
  app.get("/", (req, res, next) => {
    // Only respond with health check if it's not a browser request
    if (req.headers.accept && !req.headers.accept.includes('text/html')) {
      return res.json({ status: "ok", timestamp: new Date().toISOString() });
    }
    // Let it fall through to static file serving for browser requests
    next();
  });
  
  // Get all documents
  app.get("/api/documents", async (req, res) => {
    try {
      const documents = await storage.getAllDocuments();
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Upload document
  app.post("/api/documents", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const content = fs.readFileSync(req.file.path, 'utf-8');
      
      const documentData = {
        filename: req.file.originalname,
        content,
        size: req.file.size,
      };

      const validatedData = insertDocumentSchema.parse(documentData);
      
      // Check if document with same filename already exists
      const existingDocuments = await storage.getAllDocuments();
      const existingDoc = existingDocuments.find(doc => doc.filename === validatedData.filename);
      
      if (existingDoc) {
        // Delete existing document and its chunks
        await storage.deleteDocument(existingDoc.id);
        console.log(`Replaced existing document: ${validatedData.filename}`);
      }
      
      const document = await storage.createDocument(validatedData);

      // Clean up uploaded file
      fs.unlinkSync(req.file.path);

      // Process document asynchronously with chapter/section extraction
      processDocument(document).catch(error => {
        console.error("Background processing failed:", error);
      });

      res.status(201).json(document);
    } catch (error) {
      // Clean up file if processing failed
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(400).json({ message: error.message });
    }
  });

  // Delete document
  app.delete("/api/documents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.getDocument(id);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      await storage.deleteDocument(id);
      res.json({ message: "Document deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get chat messages
  app.get("/api/chat/messages", async (req, res) => {
    try {
      const messages = await storage.getChatMessages();
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Send chat message and get AI response
  app.post("/api/chat/messages", async (req, res) => {
    try {
      // Only validate content from request body, role is always "user" for incoming messages
      const content = req.body.message || req.body.content;
      if (!content || typeof content !== 'string' || content.trim() === '') {
        return res.status(400).json({ message: "Content is required" });
      }
      
      // Save user message
      const userMessage = await storage.createChatMessage({
        content,
        role: "user",
      });

      // Search for relevant chunks
      const searchResults = await searchSimilarChunks(content, 5);
      
      if (searchResults.length === 0) {
        const noDocsResponse = await storage.createChatMessage({
          content: "I don't have any documents to search through yet. Please upload some markdown files first.",
          role: "assistant",
        });
        return res.json({ userMessage, assistantMessage: noDocsResponse });
      }

      // Prepare context from search results with chapter/section metadata
      const context = searchResults
        .map((result, index) => {
          let source = "";
          if (result.document.chapterTitle) {
            source += `Chapter: "${result.document.chapterTitle}"`;
          }
          if (result.chunk.sectionTitle) {
            if (source) source += ", ";
            source += `Section: "${result.chunk.sectionTitle}"`;
          }
          if (!source) {
            source = `Document: ${result.document.filename}`;
          }
          
          return `From ${source}:\n${result.chunk.content}`;
        })
        .join('\n\n---\n\n');


      const sources = searchResults.map(result => ({
        filename: result.document.filename,
        chapterTitle: result.document.chapterTitle,
        sectionTitle: result.chunk.sectionTitle,
        similarity: result.similarity,
      }));

      // Generate AI response
      const aiResponse = await createChatCompletion({
        messages: [
          {
            role: "system",
            content: `You are a helpful assistant that answers questions based on the provided markdown documents about "Pricing and Hedging Derivative Securities". Use the context below to answer the user's question. 

IMPORTANT: When referencing information from the sources, you MUST use the specific chapter and section titles provided in the context, NOT generic source numbers. For example:
- Say: "According to the Black-Scholes chapter, Greeks section..."
- Say: "As discussed in the 'European Call and Put Values' section..."
- Do NOT say: "As noted in Source 1" or "According to Source 3"

Always cite the actual chapter and section names when they are provided in the source information.

If the context doesn't contain relevant information, say so clearly.

Context from documents:
${context}`
          },
          {
            role: "user",
            content: content,
          }
        ]
      });

      // Save assistant message with sources
      const assistantMessage = await storage.createChatMessage({
        content: aiResponse,
        role: "assistant",
        sources,
      });

      res.json({ userMessage, assistantMessage });
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Clear chat history
  app.delete("/api/chat/clear", async (req, res) => {
    try {
      await storage.clearChatHistory();
      res.json({ message: "Chat history cleared" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
