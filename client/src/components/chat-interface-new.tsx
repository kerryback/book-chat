import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Send,
  Bot,
  User,
  FileText,
  Trash2,
  Sparkles,
} from "lucide-react";
import "katex/dist/katex.min.css";
import { MathContent } from "@/components/math-content";
import type { ChatMessage } from "@shared/schema";

export default function ChatInterface() {
  const [input, setInput] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/messages"],
  });

  // Fetch documents for context
  const { data: documents = [] } = useQuery({
    queryKey: ["/api/documents"],
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (message: string) => {
      if (!message.trim()) {
        throw new Error("Message cannot be empty");
      }
      const response = await fetch("/api/chat/messages", {
        method: "POST",
        body: JSON.stringify({ message: message.trim() }),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to send message: ${errorData}`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      setInput("");
    },
    onError: (error: Error) => {
      console.error("Chat error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Clear chat history
  const clearHistory = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/chat/clear", { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to clear history");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      toast({
        title: "Success",
        description: "Chat history cleared",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to clear history",
        variant: "destructive",
      });
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (trimmedInput && !sendMessage.isPending) {
      sendMessage.mutate(trimmedInput);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !isComposing) {
      e.preventDefault();
      const trimmedInput = input.trim();
      if (trimmedInput && !sendMessage.isPending) {
        sendMessage.mutate(trimmedInput);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-semibold">Chat Assistant</h1>
            <Badge variant="secondary">
              {Array.isArray(documents) ? documents.length : 0} documents
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => clearHistory.mutate()}
            disabled={clearHistory.isPending}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto px-6 py-4">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Welcome message */}
            {messages.length === 0 && !isLoading && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-6">
                  <div className="text-center">
                    <Bot className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      Welcome to Your Document Assistant
                    </h2>
                    <p className="text-gray-600 mb-4">
                      Ask questions about your uploaded documents. I can help analyze content, 
                      explain concepts, and provide insights based on your files.
                    </p>
                    {Array.isArray(documents) && documents.length > 0 && (
                      <div className="text-sm text-gray-500">
                        Ready to answer questions about {documents.length} document(s)
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Chat messages */}
            {messages.map((message) => (
              <div key={message.id}>
                {message.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="max-w-2xl">
                      <div className="flex items-center gap-2 mb-2 justify-end">
                        <span className="text-sm text-gray-500">You</span>
                        <User className="w-4 h-4 text-gray-500" />
                      </div>
                      <Card className="bg-blue-600 text-white">
                        <CardContent className="p-4">
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-start">
                    <div className="max-w-3xl w-full">
                      <div className="flex items-center gap-2 mb-2">
                        <Bot className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-500">Assistant</span>
                      </div>
                      <Card>
                        <CardContent className="p-4">
                          <MathContent content={message.content} />
                          
                          {/* Sources */}
                          {message.sources && Array.isArray(message.sources) && message.sources.length > 0 && (
                            <div className="mt-4 pt-4 border-t">
                              <div className="flex items-center gap-2 mb-2">
                                <FileText className="w-4 h-4 text-gray-500" />
                                <span className="text-sm font-medium text-gray-700">Sources</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {message.sources.map((source: any, index: number) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {source.document?.filename || source.filename || 'Document'}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Loading indicator */}
            {sendMessage.isPending && (
              <div className="flex justify-start">
                <div className="max-w-3xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Bot className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-500">Assistant</span>
                  </div>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <span className="text-sm text-gray-500 ml-2">Thinking...</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 bg-white border-t px-6 py-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <div className="flex-1">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                placeholder="Ask a question about your documents..."
                className="min-h-[60px] resize-none"
                disabled={sendMessage.isPending}
              />
            </div>
            <Button
              type="submit"
              disabled={!input.trim() || sendMessage.isPending}
              className="px-6"
              onClick={(e) => {
                if (!input.trim()) {
                  e.preventDefault();
                  return;
                }
              }}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}