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
  Upload,
} from "lucide-react";
import "katex/dist/katex.min.css";
import { MathContent } from "@/components/math-content";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/hooks/useTheme";
import { Moon, Sun } from "lucide-react";
import type { ChatMessage } from "@shared/schema";

export default function ChatInterface() {
  const [input, setInput] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme, toggleTheme } = useTheme();

  const handleUploadClick = () => {
    setShowPasswordPrompt(true);
    setPassword("");
  };

  const handlePasswordSubmit = () => {
    if (password === "upload123") {
      setShowPasswordPrompt(false);
      setPassword("");
      fileInputRef.current?.click();
    } else {
      toast({
        variant: "destructive",
        title: "Access denied",
        description: "Invalid password",
      });
      setPassword("");
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((file) => {
        if (!file.name.endsWith('.qmd')) {
          toast({
            variant: "destructive",
            title: "Invalid file type",
            description: `${file.name} is not a .qmd file`,
          });
          return;
        }
        uploadFile.mutate(file);
      });
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/messages"],
  });

  // Clear chat history on component mount to ensure fresh sessions
  useEffect(() => {
    const clearOnLoad = async () => {
      try {
        await apiRequest("DELETE", "/api/chat/clear");
        queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      } catch (error) {
        // Silently handle errors on initial clear
      }
    };
    clearOnLoad();
  }, [queryClient]);

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

  // File upload mutation
  const uploadFile = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await apiRequest("POST", "/api/documents", formData);
      return { data: response.json(), filename: file.name };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Upload successful",
        description: `${result.filename} uploaded and being processed`,
      });
    },
    onError: (error: Error, file: File) => {
      toast({
        title: "Upload failed",
        description: `${file.name}: ${error.message || "Failed to upload"}`,
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
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <div className="flex-shrink-0 bg-card border-border border-b px-6 py-4">
        <div className="flex items-center">
          <div className="flex items-center gap-3 flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept=".qmd"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleUploadClick}
              disabled={uploadFile.isPending}
              className="bg-slate-500 hover:bg-slate-600 text-white dark:bg-slate-600 dark:hover:bg-slate-500"
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploadFile.isPending ? "Uploading..." : "Upload (authors only)"}
            </Button>
          </div>
          <div className="flex items-center justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTheme}
              className="text-muted-foreground hover:text-foreground"
            >
              {theme === "light" ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4" />
              )}
            </Button>
          </div>
          <div className="flex items-center gap-2 flex-1 justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => clearHistory.mutate()}
              disabled={clearHistory.isPending}
              className="bg-slate-500 hover:bg-slate-600 text-white dark:bg-slate-600 dark:hover:bg-slate-500"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="px-6 py-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Welcome message */}
          {messages.length === 0 && !isLoading && (
            <Card className="bg-muted/50">
              <CardContent className="p-6">
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-foreground mb-2">
                    Chat about <a href="https://book.derivative-securities.org/" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 underline"><em>Pricing and Hedging Derivative Securities</em></a> with OpenAI GPT-4.1.
                  </h2>
                  <p className="text-muted-foreground">
                    Courtesy of the authors: Kerry Back, Hong Liu, and Mark Loewenstein.
                  </p>
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
                      <span className="text-sm text-muted-foreground">You</span>
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <Card className="bg-primary text-primary-foreground">
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
                      <Bot className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Assistant</span>
                    </div>
                    <Card className="bg-card border-border">
                      <CardContent className="p-4 overflow-visible">
                        <div className="overflow-visible">
                          <MathContent 
                            content={message.content} 
                            className="text-foreground" 
                          />
                        </div>
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
                  <Bot className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Assistant</span>
                </div>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <span className="text-sm text-muted-foreground ml-2">Thinking...</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 bg-card border-border border-t px-6 py-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <div className="flex-1">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                placeholder="Ask about derivative securities..."
                className="min-h-[60px] resize-none bg-background border-input text-foreground placeholder:text-muted-foreground"
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

      {/* Password Protection Dialog */}
      <Dialog open={showPasswordPrompt} onOpenChange={setShowPasswordPrompt}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Authentication</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handlePasswordSubmit();
                }
              }}
              className="w-full"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPasswordPrompt(false);
                  setPassword("");
                }}
              >
                Cancel
              </Button>
              <Button onClick={handlePasswordSubmit}>
                Submit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}