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
  Database,
  Search,
  CheckCircle,
  Sparkles,
} from "lucide-react";
import type { ChatMessage } from "@shared/schema";

export default function ChatInterface() {
  const [input, setInput] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/messages"],
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["/api/documents"],
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", "/api/chat/messages", { content });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      setInput("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const clearChatMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/chat/messages");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      toast({
        title: "Chat cleared",
        description: "All messages have been deleted.",
      });
    },
  });

  const handleSend = () => {
    if (!input.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(input.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 150) + "px";
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const completedDocuments = documents.filter((doc: any) => doc.status === "completed");
  const hasDocuments = completedDocuments.length > 0;

  const suggestedQueries = [
    "How do I get started?",
    "What are the best practices?",
    "Troubleshooting common issues",
  ];

  return (
    <>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Chat with your documents</h1>
            <p className="text-sm text-gray-500">Ask questions about your markdown files</p>
          </div>
          <Button
            onClick={() => clearChatMutation.mutate()}
            variant="outline"
            size="sm"
            disabled={clearChatMutation.isPending || messages.length === 0}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Chat
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Welcome Message */}
        {messages.length === 0 && (
          <div className="max-w-3xl mx-auto">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-6 text-center">
                <Bot className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-blue-900 mb-2">
                  Welcome to your RAG Assistant!
                </h3>
                <p className="text-blue-700 mb-4">
                  I can help you find information from your uploaded markdown and Quarto documents.
                  {!hasDocuments && " Upload some documents first to get started."}
                </p>
                {!hasDocuments && (
                  <div className="mt-4 p-4 bg-white rounded-lg border border-blue-200">
                    <p className="text-sm text-gray-600 mb-2">
                      📱 On mobile: Tap the menu button (☰) in the top-left corner to access the upload area
                    </p>
                    <p className="text-sm text-gray-600">
                      💻 On desktop: Use the upload area in the left sidebar
                    </p>
                  </div>
                )}
                {hasDocuments && (
                  <div className="flex flex-wrap justify-center gap-2">
                    {suggestedQueries.map((query, index) => (
                      <Button
                        key={index}
                        variant="secondary"
                        size="sm"
                        className="bg-blue-100 text-blue-800 hover:bg-blue-200"
                        onClick={() => setInput(query)}
                      >
                        "{query}"
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Chat Messages */}
        {messages.map((message) => (
          <div key={message.id} className="max-w-3xl mx-auto">
            {message.role === "user" ? (
              <div className="flex justify-end">
                <div className="max-w-xs lg:max-w-md px-4 py-3 bg-primary text-primary-foreground rounded-lg">
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            ) : (
              <div className="flex">
                <div className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                  <Bot className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex-1">
                  <Card className="shadow-sm">
                    <CardContent className="p-4">
                      <div className="prose prose-sm max-w-none">
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>
                      
                      {/* Sources */}
                      {message.sources && Array.isArray(message.sources) && message.sources.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <p className="text-xs font-medium text-gray-500 mb-2">Sources:</p>
                          <div className="flex flex-wrap gap-2">
                            {message.sources.map((source: any, index: number) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                <FileText className="w-3 h-3 mr-1" />
                                {source.filename}
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

        {/* Loading Message */}
        {sendMessageMutation.isPending && (
          <div className="max-w-3xl mx-auto">
            <div className="flex">
              <div className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              </div>
              <div className="flex-1">
                <Card className="shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-500">Searching through your documents...</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={() => setIsComposing(false)}
                  placeholder={
                    hasDocuments
                      ? "Ask a question about your documents..."
                      : "Upload some markdown files first..."
                  }
                  className="resize-none min-h-[80px] pr-16"
                  disabled={!hasDocuments || sendMessageMutation.isPending}
                />
                <div className="absolute right-3 bottom-3 flex items-center space-x-2">
                  <span className="text-xs text-gray-400">⌘ + Enter</span>
                </div>
              </div>
            </div>
            <Button
              onClick={handleSend}
              disabled={!input.trim() || !hasDocuments || sendMessageMutation.isPending}
              className="px-6 py-3 h-auto"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Database className="w-3 h-3" />
                <span>{completedDocuments.length} documents indexed</span>
              </div>
              <div className="flex items-center space-x-1">
                <Search className="w-3 h-3" />
                <span>Vector search enabled</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span>OpenAI connected</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
