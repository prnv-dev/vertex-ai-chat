import { useRef, useEffect, useState, useCallback } from "react";
import { useChat } from "@/hooks/useChat";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { ChatHeader } from "./ChatHeader";
import { ChatSidebar } from "./ChatSidebar";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { TypingIndicator } from "./TypingIndicator";
import { ImageLoadingSkeleton } from "./ImageLoadingSkeleton";
import { WelcomeScreen } from "./WelcomeScreen";
import { KeyboardShortcutsModal } from "./KeyboardShortcutsModal";
import { AnimatedBackground } from "./AnimatedBackground";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageImage, MessageVideo } from "@/types/chat";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ChatContainer() {
  // Desktop sidebar collapsed state (persisted)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("vertex-sidebar-collapsed");
    return saved === "true";
  });
  // Mobile sidebar open state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const isUserNearBottomRef = useRef(true);
  const prevMessagesLengthRef = useRef(0);
  const mobileScrolledForMessageRef = useRef<string | null>(null);
  const mobileManualScrollRef = useRef(false);
  const prevChatIdRef = useRef<string | null>(null);
  const hasScrolledOnChatOpenRef = useRef(false);

  const {
    chats,
    currentChatId,
    currentChat,
    messages,
    isLoading,
    isStreaming,
    isRegenerating,
    isImageMode,
    setCurrentChatId,
    createNewChat,
    deleteChat,
    restoreChat,
    undoLastDelete,
    clearCurrentChat,
    renameChat,
    togglePinChat,
    toggleImageMode,
    sendMessage,
    stopGeneration,
    regenerateLastResponse,
    editMessage,
  } = useChat();

  useKeyboardShortcuts({
    onNewChat: createNewChat,
    onShowShortcuts: () => setShortcutsOpen(true),
    onUndo: undoLastDelete,
  });

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check if offline (for UI purposes like send button icon)
  const isOfflineUI = typeof navigator !== 'undefined' && (!navigator.onLine || localStorage.getItem("vertexai-force-offline") === "true");

  // Persist sidebar collapsed state
  useEffect(() => {
    localStorage.setItem("vertex-sidebar-collapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Get the viewport element from ScrollArea
  const getViewport = useCallback(() => {
    return scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
  }, []);

  // Check if user is near bottom (within threshold)
  const checkIfNearBottom = useCallback(() => {
    const viewport = getViewport();
    if (!viewport) return true;
    
    const { scrollTop, scrollHeight, clientHeight } = viewport;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    return distanceFromBottom < 100;
  }, [getViewport]);

  // Scroll to bottom using sentinel
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (bottomSentinelRef.current) {
      bottomSentinelRef.current.scrollIntoView({ behavior, block: 'end' });
    }
  }, []);

  // Track scroll position and update nearBottom state
  const handleScroll = useCallback(() => {
    const viewport = getViewport();
    if (!viewport) return;
    
    const { scrollTop, scrollHeight, clientHeight } = viewport;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    // Update near-bottom state
    isUserNearBottomRef.current = distanceFromBottom < 100;
    
    // Show button when scrolled up more than 200px from bottom
    setShowScrollButton(distanceFromBottom > 200);
    
    // Mobile: detect manual scroll up during streaming
    if (isMobile && isLoading && distanceFromBottom > 150) {
      mobileManualScrollRef.current = true;
    }
  }, [getViewport, isMobile, isLoading]);

  // Attach scroll listener to ScrollArea viewport
  useEffect(() => {
    const viewport = getViewport();
    if (!viewport) return;

    viewport.addEventListener('scroll', handleScroll, { passive: true });
    return () => viewport.removeEventListener('scroll', handleScroll);
  }, [handleScroll, getViewport, messages.length]);

  // Smooth scroll to bottom when switching chats (not during streaming)
  useEffect(() => {
    const chatChanged = currentChatId !== prevChatIdRef.current;
    
    if (chatChanged && currentChatId) {
      // Reset flags on chat change
      hasScrolledOnChatOpenRef.current = false;
      mobileManualScrollRef.current = false;
      isUserNearBottomRef.current = true;
      
      // Only scroll if not currently streaming and has messages
      if (!isLoading && messages.length > 0 && !hasScrolledOnChatOpenRef.current) {
        hasScrolledOnChatOpenRef.current = true;
        // Small delay to ensure DOM is ready after chat switch
        requestAnimationFrame(() => {
          scrollToBottom('smooth');
        });
      }
    }
    
    prevChatIdRef.current = currentChatId;
  }, [currentChatId, isLoading, messages.length, scrollToBottom]);

  // Track message count changes - NO auto-scroll here
  useEffect(() => {
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length]);

  // Handle mobile keyboard - use visualViewport to adjust layout
  useEffect(() => {
    if (!isMobile) return;

    const handleViewportResize = () => {
      // When keyboard opens, the visualViewport height shrinks
      // The flex layout will automatically compress the hero section
      if (window.visualViewport) {
        const vh = window.visualViewport.height;
        document.documentElement.style.setProperty('--mobile-vh', `${vh}px`);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportResize);
      handleViewportResize(); // Initial call
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportResize);
      }
      document.documentElement.style.removeProperty('--mobile-vh');
    };
  }, [isMobile]);

  const handleSendMessage = async (content: string, images?: MessageImage[], videos?: MessageVideo[]) => {
    // Scroll to bottom ONLY when user sends a message
    scrollToBottom('smooth');
    await sendMessage(content, images, videos);
  };

  const toggleDesktopSidebar = () => {
    setSidebarCollapsed((prev) => !prev);
  };

  const openMobileSidebar = () => {
    setMobileSidebarOpen(true);
  };

  const closeMobileSidebar = () => {
    setMobileSidebarOpen(false);
  };

  return (
    <div className={`flex bg-background relative ${isMobile ? 'h-[100svh] overflow-hidden' : 'h-screen'}`}>
      <AnimatedBackground />
      <ChatSidebar
        chats={chats}
        currentChatId={currentChatId}
        onSelectChat={setCurrentChatId}
        onNewChat={createNewChat}
        onDeleteChat={deleteChat}
        onRestoreChat={restoreChat}
        onRenameChat={renameChat}
        onTogglePinChat={togglePinChat}
        isCollapsed={sidebarCollapsed}
        isMobileOpen={mobileSidebarOpen}
        onCloseMobile={closeMobileSidebar}
      />

      <main className={`flex-1 flex flex-col min-w-0 relative ${isMobile ? 'h-[100svh] overflow-hidden' : ''}`}>
        {/* Header - auto height */}
        <ChatHeader
          onNewChat={createNewChat}
          onClearChat={clearCurrentChat}
          onToggleSidebar={toggleDesktopSidebar}
          onOpenMobileSidebar={openMobileSidebar}
          isSidebarCollapsed={sidebarCollapsed}
          hasMessages={messages.length > 0}
          currentChat={currentChat}
        />

        {/* Content area - flex-1 for messages or welcome screen */}
        {messages.length === 0 ? (
          /* Welcome screen - flex column layout for mobile */
          <div 
            className={`flex-1 flex flex-col overflow-hidden ${isMobile ? 'min-h-0' : ''}`}
            style={isMobile ? { 
              flex: '1 1 0',
              minHeight: 0,
            } : undefined}
          >
            {/* Hero section - flex-1 with content pushed to bottom on mobile */}
            <div 
              className={`flex-1 flex flex-col overflow-hidden ${isMobile ? 'min-h-0 justify-end' : 'justify-center'}`}
              style={isMobile ? { 
                flex: '1 1 auto',
                minHeight: 0,
              } : undefined}
            >
              <WelcomeScreen 
                onSuggestionClick={(content) => handleSendMessage(content)} 
              />
            </div>

            {/* Input bar - directly attached on mobile, no gap */}
            <div 
              className={`
                w-full shrink-0
                ${isMobile 
                  ? 'bg-background/95 backdrop-blur-sm' 
                  : 'max-w-3xl mx-auto p-4'
                }
              `}
              style={isMobile ? { 
                paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
                paddingTop: '8px',
                paddingLeft: '10px',
                paddingRight: '10px',
              } : undefined}
            >
              <div className={isMobile ? 'max-w-3xl mx-auto' : ''}>
                <ChatInput 
                  onSend={(content, images, videos) => handleSendMessage(content, images, videos)} 
                  isLoading={isLoading}
                  isStreaming={isStreaming}
                  onStopGeneration={stopGeneration}
                  isImageMode={isImageMode}
                  onToggleImageMode={toggleImageMode}
                  isOfflineUI={isOfflineUI}
                />
              </div>
            </div>
          </div>
        ) : (
          /* Messages view with slide-in animation */
          <>
            <div 
              key={currentChatId}
              className="flex-1 overflow-hidden relative animate-in slide-in-from-right-4 fade-in duration-300"
              style={isMobile ? { 
                flex: '1 1 0',
                minHeight: 0,
              } : undefined}
            >
              <ScrollArea 
                className="h-full overscroll-contain" 
                ref={scrollRef}
              >
                <div className={`pb-4 ${isMobile ? 'pb-20' : ''}`}>
                  {messages.map((message, index) => {
                    // Find if this is the last assistant message
                    const isLastAssistantMessage = 
                      message.role === "assistant" &&
                      !messages.slice(index + 1).some(m => m.role === "assistant");
                    
                    return (
                      <ChatMessage 
                        key={message.id} 
                        message={message}
                        isLastAssistantMessage={isLastAssistantMessage}
                        onRegenerate={regenerateLastResponse}
                        isLoading={isLoading}
                      />
                    );
                  })}
                  {isLoading && messages[messages.length - 1]?.role === "user" && (
                    isImageMode ? (
                      <ImageLoadingSkeleton prompt={messages[messages.length - 1]?.content} />
                    ) : (
                      <TypingIndicator isRegenerating={isRegenerating} />
                    )
                  )}
                  {/* Bottom sentinel for scroll targeting */}
                  <div ref={bottomSentinelRef} className="h-px" />
                </div>
              </ScrollArea>

              {/* Scroll to bottom button - desktop and mobile */}
              {showScrollButton && (
                <Button
                  onClick={() => scrollToBottom('smooth')}
                  size="icon"
                  className={`absolute rounded-full bg-muted/95 hover:bg-muted text-foreground shadow-md backdrop-blur-sm z-40 transition-opacity duration-200 ${
                    isMobile 
                      ? 'bottom-20 right-4 h-10 w-10' 
                      : 'bottom-6 right-6 h-9 w-9'
                  }`}
                  aria-label="Scroll to bottom"
                >
                  <ChevronDown className={isMobile ? 'w-5 h-5' : 'w-4 h-4'} />
                </Button>
              )}
            </div>

            {/* Input bar - sticky on mobile with keyboard handling */}
            <div 
              className={`
                w-full shrink-0
                ${isMobile 
                  ? 'bg-background/95 backdrop-blur-sm border-t border-border' 
                  : 'max-w-3xl mx-auto p-4'
                }
              `}
              style={isMobile ? { 
                paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
                paddingTop: '10px',
                paddingLeft: '10px',
                paddingRight: '10px',
              } : undefined}
            >
              <div className={isMobile ? 'max-w-3xl mx-auto' : ''}>
                <ChatInput 
                  onSend={(content, images, videos) => handleSendMessage(content, images, videos)} 
                  isLoading={isLoading}
                  isStreaming={isStreaming}
                  onStopGeneration={stopGeneration}
                  isImageMode={isImageMode}
                  onToggleImageMode={toggleImageMode}
                  isOfflineUI={isOfflineUI}
                />
              </div>
            </div>
          </>
        )}
      </main>

      <KeyboardShortcutsModal
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
      />
    </div>
  );
}
