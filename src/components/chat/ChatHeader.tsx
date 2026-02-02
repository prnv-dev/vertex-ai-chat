import { Download, FileText, Menu, Plus, Trash2, PanelLeftClose, PanelLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { VertexAIIcon } from "@/components/VertexAIIcon";
import { NetworkStatusIndicator } from "./NetworkStatusIndicator";
import { OfflineModeToggle } from "./OfflineModeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Chat } from "@/types/chat";
import { exportAsMarkdown, exportAsPDF } from "@/lib/exportChat";
import { toast } from "@/hooks/use-toast";

interface ChatHeaderProps {
  onNewChat: () => void;
  onClearChat: () => void;
  onToggleSidebar: () => void;
  onOpenMobileSidebar: () => void;
  isSidebarCollapsed: boolean;
  hasMessages: boolean;
  currentChat: Chat | null;
}

export function ChatHeader({
  onNewChat,
  onClearChat,
  onToggleSidebar,
  onOpenMobileSidebar,
  isSidebarCollapsed,
  hasMessages,
  currentChat,
}: ChatHeaderProps) {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const handleExportMarkdown = () => {
    if (!currentChat || currentChat.messages.length === 0) return;
    exportAsMarkdown(currentChat);
    toast({
      title: "Exported",
      description: "Chat exported as Markdown file",
    });
  };

  const handleExportPDF = () => {
    if (!currentChat || currentChat.messages.length === 0) return;
    exportAsPDF(currentChat);
    toast({
      title: "Export Ready",
      description: "Print dialog opened for PDF export",
    });
  };

  return (
    <header className="h-14 px-2 sm:px-4 flex items-center justify-between border-b border-border bg-card overflow-hidden">
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenMobileSidebar}
          className="lg:hidden h-8 w-8 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="w-4 h-4" />
        </Button>
        
        {/* Desktop sidebar toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="hidden lg:flex text-muted-foreground hover:text-foreground transition-colors"
          aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isSidebarCollapsed ? (
            <PanelLeft className="w-5 h-5" />
          ) : (
            <PanelLeftClose className="w-5 h-5" />
          )}
        </Button>
        
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
          <VertexAIIcon size="sm" />
          <h1 className="text-sm sm:text-base font-semibold text-foreground truncate">
            VertexAI
          </h1>
          {!isMobile && <NetworkStatusIndicator />}
        </div>
      </div>

      <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
        <OfflineModeToggle />
        <ThemeToggle />
        
        {hasMessages && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="hidden sm:flex h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleExportMarkdown}>
                <FileText className="w-4 h-4 mr-2" />
                Export as Markdown
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF}>
                <Download className="w-4 h-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        
        {hasMessages && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClearChat}
            className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Button>
        )}
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onNewChat}
          className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </Button>
      </div>
    </header>
  );
}
