import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Upload,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2,
  Database,
  Zap,
} from "lucide-react";
import type { Document } from "@shared/schema";

export default function FileSidebar() {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await apiRequest("POST", "/api/documents", formData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Upload successful",
        description: "Document is being processed for search.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Document deleted",
        description: "The document has been removed from your knowledge base.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.type === "text/markdown" || file.name.endsWith(".md") || file.name.endsWith(".markdown")) {
        uploadMutation.mutate(file);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload only markdown (.md) files.",
          variant: "destructive",
        });
      }
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      case "error":
        return <AlertCircle className="w-3 h-3 text-red-500" />;
      case "processing":
        return <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />;
      default:
        return <Loader2 className="w-3 h-3 text-gray-400 animate-spin" />;
    }
  };

  const completedDocs = documents.filter(doc => doc.status === "completed");
  const totalStorage = documents.reduce((sum, doc) => sum + doc.size, 0);

  return (
    <>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <FileText className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">RAG Assistant</h1>
            <p className="text-sm text-gray-500">Markdown Knowledge Base</p>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-sm font-medium text-gray-900 mb-3">Upload Documents</h2>
        
        <div
          className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
            ${dragOver ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary"}
          `}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 mb-1">Drop markdown files here</p>
          <p className="text-xs text-gray-500">or click to browse</p>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            accept=".md,.markdown,text/markdown"
            onChange={(e) => handleFileSelect(e.target.files)}
          />
        </div>

        {uploadMutation.isPending && (
          <Card className="mt-4 p-3 bg-blue-50 border-blue-200">
            <div className="flex items-center">
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin mr-2" />
              <span className="text-sm text-blue-800">Processing embeddings...</span>
            </div>
          </Card>
        )}
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-900">Documents</h2>
            <span className="text-xs text-gray-500">{documents.length} files</span>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-gray-100 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No documents uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <FileText className="w-4 h-4 text-gray-400 mr-3 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {doc.filename}
                    </p>
                    <p className="text-xs text-gray-500">
                      {doc.status === "completed" ? (
                        `${formatFileSize(doc.size)} • ${doc.chunkCount} chunks`
                      ) : doc.status === "error" ? (
                        doc.errorMessage || "Processing failed"
                      ) : (
                        "Processing..."
                      )}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 ml-2">
                    {getStatusIcon(doc.status)}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                      onClick={() => deleteMutation.mutate(doc.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <Database className="w-3 h-3" />
            <span>Storage: {formatFileSize(totalStorage)}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Zap className="w-3 h-3" />
            <span>{completedDocs.length} indexed</span>
          </div>
        </div>
      </div>
    </>
  );
}
