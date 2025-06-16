import { useState } from "react";
import FileSidebar from "@/components/file-sidebar";
import ChatInterface from "@/components/chat-interface";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile Sidebar Toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          variant="outline"
          size="sm"
          className="bg-white shadow-lg"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      {/* Sidebar */}
      <div
        className={`
          w-80 bg-white border-r border-gray-200 flex flex-col
          lg:relative lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          transition-transform duration-200 ease-in-out
          lg:block fixed inset-y-0 left-0 z-40
        `}
      >
        <FileSidebar />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <ChatInterface />
      </div>
    </div>
  );
}
