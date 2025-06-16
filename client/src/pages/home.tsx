import { useState } from "react";
import FileSidebar from "@/components/file-sidebar";
import ChatInterface from "@/components/chat-interface-new";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

export default function Home() {
  return (
    <div className="h-screen bg-gray-50 overflow-hidden">
      <ChatInterface />
    </div>
  );
}
