import { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, Plus, Trash2, X, Search, Pencil, Check, Undo2, CheckSquare, MoreHorizontal, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Chat } from "@/types/chat";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatSearch } from "./ChatSearch";
import { toast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface ChatSidebarProps {
  chats: Chat[];
  currentChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => Chat | null;
  onRestoreChat: (chat: Chat) => void;
  onRenameChat: (chatId: string, newTitle: string) => void;
  onTogglePinChat: (chatId: string) => void;
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString();
}

// Custom hook for long press detection with position tracking
function useLongPress(
  onLongPress: (position: { top: number; left: number }) => void,
  onClick?: () => void,
  { delay = 500 }: { delay?: number } = {}
) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const positionRef = useRef({ top: 0, left: 0 });

  const start = useCallback((e: React.TouchEvent) => {
    isLongPressRef.current = false;
    // Capture touch position for popup placement
    const touch = e.touches[0];
    positionRef.current = { top: touch.clientY, left: touch.clientX };
    
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      if (navigator.vibrate) navigator.vibrate(30);
      onLongPress(positionRef.current);
    }, delay);
  }, [onLongPress, delay]);

  const clear = useCallback((shouldTriggerClick = true) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (shouldTriggerClick && !isLongPressRef.current && onClick) {
      onClick();
    }
  }, [onClick]);

  return {
    onTouchStart: start,
    onTouchEnd: () => clear(true),
    onTouchCancel: () => clear(false),
    onTouchMove: () => clear(false),
  };
}

// Custom hook for swipe gesture detection
function useSwipeToDelete(
  onDelete: () => void,
  { threshold = 100 }: { threshold?: number } = {}
) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = e.touches[0].clientX;
    setIsSwiping(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwiping) return;
    
    currentXRef.current = e.touches[0].clientX;
    const diff = startXRef.current - currentXRef.current;
    
    // Only allow left swipe (positive diff) with resistance
    if (diff > 0) {
      const resistance = 0.6;
      const resistedDiff = diff * resistance;
      setSwipeOffset(Math.min(resistedDiff, 120));
    } else {
      setSwipeOffset(0);
    }
  }, [isSwiping]);

  const handleTouchEnd = useCallback(() => {
    if (swipeOffset >= threshold) {
      // Trigger haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      onDelete();
    }
    setSwipeOffset(0);
    setIsSwiping(false);
  }, [swipeOffset, threshold, onDelete]);

  const handleTouchCancel = useCallback(() => {
    setSwipeOffset(0);
    setIsSwiping(false);
  }, []);

  return {
    swipeOffset,
    isSwiping,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchCancel,
    },
  };
}

// Custom hook for swipe-to-dismiss sidebar on mobile
function useSwipeToDismiss(
  onDismiss: () => void,
  isOpen: boolean,
  { threshold = 80 }: { threshold?: number } = {}
) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const startXRef = useRef(0);
  const isSwipingRef = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    isSwipingRef.current = true;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwipingRef.current || !isOpen) return;
    
    const currentX = e.touches[0].clientX;
    const diff = startXRef.current - currentX;
    
    // Only allow left swipe (to dismiss)
    if (diff > 0) {
      setSwipeOffset(Math.min(diff, 300));
    }
  }, [isOpen]);

  const handleTouchEnd = useCallback(() => {
    if (swipeOffset >= threshold) {
      onDismiss();
      if (navigator.vibrate) {
        navigator.vibrate(30);
      }
    }
    setSwipeOffset(0);
    isSwipingRef.current = false;
  }, [swipeOffset, threshold, onDismiss]);

  const handleTouchCancel = useCallback(() => {
    setSwipeOffset(0);
    isSwipingRef.current = false;
  }, []);

  return {
    swipeOffset,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchCancel,
    },
  };
}

export function ChatSidebar({
  chats,
  currentChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onRestoreChat,
  onRenameChat,
  onTogglePinChat,
  isCollapsed,
  isMobileOpen,
  onCloseMobile,
}: ChatSidebarProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<Chat | null>(null);
  const [selectedTitleChat, setSelectedTitleChat] = useState<Chat | null>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedChatIds, setSelectedChatIds] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileMenuPosition, setMobileMenuPosition] = useState({ top: 0, left: 0 });
  const editInputRef = useRef<HTMLInputElement>(null);

  // Swipe to dismiss sidebar on mobile
  const { swipeOffset, handlers: swipeHandlers } = useSwipeToDismiss(
    onCloseMobile,
    isMobileOpen,
    { threshold: 80 }
  );

  useEffect(() => {
    if (editingChatId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingChatId]);

  const startEditing = (chat: Chat, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditingTitle(chat.title);
  };

  const saveEdit = () => {
    if (editingChatId && editingTitle.trim()) {
      onRenameChat(editingChatId, editingTitle);
    }
    setEditingChatId(null);
    setEditingTitle("");
  };

  const cancelEdit = () => {
    setEditingChatId(null);
    setEditingTitle("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      saveEdit();
    } else if (e.key === "Escape") {
      cancelEdit();
    }
  };

  const handleDeleteClick = (chat: Chat, e: React.MouseEvent) => {
    e.stopPropagation();
    setChatToDelete(chat);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (chatToDelete) {
      const deletedChat = onDeleteChat(chatToDelete.id);
      if (deletedChat) {
        toast({
          title: "Conversation deleted",
          description: (
            <div className="flex items-center gap-2">
              <span className="truncate max-w-[180px]">"{deletedChat.title}"</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-primary hover:text-primary/80 hover:bg-primary/10"
                onClick={() => {
                  onRestoreChat(deletedChat);
                  toast({
                    title: "Conversation restored",
                    description: `"${deletedChat.title}" has been restored.`,
                  });
                }}
              >
                <Undo2 className="w-3 h-3 mr-1" />
                Undo
              </Button>
            </div>
          ),
          duration: 5000,
        });
      }
    }
    setDeleteDialogOpen(false);
    setChatToDelete(null);
  };

  const handleSearchSelect = (chatId: string) => {
    onSelectChat(chatId);
    setIsSearching(false);
    onCloseMobile();
  };

  const handleChatSelect = (chatId: string) => {
    if (isSelectMode) {
      toggleChatSelection(chatId);
    } else if (editingChatId !== chatId) {
      onSelectChat(chatId);
      onCloseMobile();
    }
  };

  const toggleSelectMode = () => {
    setIsSelectMode((prev) => !prev);
    setSelectedChatIds(new Set());
  };

  const toggleChatSelection = (chatId: string) => {
    setSelectedChatIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(chatId)) {
        newSet.delete(chatId);
      } else {
        newSet.add(chatId);
      }
      return newSet;
    });
  };

  const selectAllChats = () => {
    if (selectedChatIds.size === chats.length) {
      setSelectedChatIds(new Set());
    } else {
      setSelectedChatIds(new Set(chats.map((c) => c.id)));
    }
  };

  const confirmBulkDelete = () => {
    const deletedChats: Chat[] = [];
    selectedChatIds.forEach((chatId) => {
      const deleted = onDeleteChat(chatId);
      if (deleted) deletedChats.push(deleted);
    });

    if (deletedChats.length > 0) {
      toast({
        title: `${deletedChats.length} conversation${deletedChats.length > 1 ? "s" : ""} deleted`,
        description: (
          <div className="flex items-center gap-2">
            <span>Deleted {deletedChats.length} item{deletedChats.length > 1 ? "s" : ""}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-primary hover:text-primary/80 hover:bg-primary/10"
              onClick={() => {
                deletedChats.forEach((chat) => onRestoreChat(chat));
                toast({
                  title: "Conversations restored",
                  description: `${deletedChats.length} conversation${deletedChats.length > 1 ? "s" : ""} restored.`,
                });
              }}
            >
              <Undo2 className="w-3 h-3 mr-1" />
              Undo all
            </Button>
          </div>
        ),
        duration: 6000,
      });
    }

    setBulkDeleteDialogOpen(false);
    setSelectedChatIds(new Set());
    setIsSelectMode(false);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-200"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar with swipe-to-dismiss on mobile */}
      <aside
        {...(isMobileOpen ? swipeHandlers : {})}
        className={`
          fixed lg:static inset-y-0 left-0 z-50 
          bg-card border-r border-border flex flex-col
          transition-all ease-out
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${isCollapsed ? "lg:w-0 lg:border-r-0 lg:overflow-hidden" : "w-72"}
          ${swipeOffset > 0 ? "" : "duration-200"}
        `}
        style={{ 
          width: isMobileOpen ? "18rem" : undefined,
          transform: isMobileOpen && swipeOffset > 0 
            ? `translateX(-${swipeOffset}px)` 
            : undefined,
          opacity: isMobileOpen && swipeOffset > 0 
            ? Math.max(0.3, 1 - swipeOffset / 300) 
            : undefined,
        }}
      >
        <div className={`h-14 px-4 flex items-center justify-between border-b border-border transition-opacity duration-200 ${isCollapsed && !isMobileOpen ? "lg:opacity-0" : "opacity-100"}`}>
          <span className="font-medium text-sm text-foreground whitespace-nowrap">
            {isSearching ? "Search" : isSelectMode ? `${selectedChatIds.size} selected` : "Conversations"}
          </span>
          <div className="flex items-center gap-1">
            {isSelectMode ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={selectAllChats}
                  className={`h-8 w-8 transition-colors ${
                    selectedChatIds.size === chats.length 
                      ? "text-primary hover:text-primary/80" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title={selectedChatIds.size === chats.length ? "Deselect all" : "Select all"}
                >
                  <CheckSquare className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setBulkDeleteDialogOpen(true)}
                  disabled={selectedChatIds.size === 0}
                  className="h-8 w-8 text-destructive hover:text-destructive/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Delete selected"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSelectMode}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors"
                  title="Cancel selection"
                >
                  <X className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSearching(!isSearching)}
                  className={`h-8 w-8 transition-colors ${
                    isSearching 
                      ? "text-primary hover:text-primary/80" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Search messages"
                >
                  <Search className="w-4 h-4" />
                </Button>
                {chats.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleSelectMode}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors"
                    title="Select multiple"
                  >
                    <CheckSquare className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    onNewChat();
                    // On mobile, close the sidebar immediately for clean UX
                    if (window.innerWidth < 1024) {
                      onCloseMobile();
                    }
                  }}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors"
                  title="New chat"
                >
                  <Plus className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onCloseMobile}
                  className="h-8 w-8 lg:hidden text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Close sidebar"
                >
                  <X className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        <div className={`flex-1 flex flex-col overflow-hidden transition-opacity duration-200 ${isCollapsed && !isMobileOpen ? "lg:opacity-0" : "opacity-100"}`}>
          {isSearching ? (
            <ChatSearch
              chats={chats}
              onSelectResult={handleSearchSelect}
              onClose={() => setIsSearching(false)}
            />
          ) : (
            <>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {chats.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-xs text-muted-foreground">No conversations yet</p>
                    </div>
                  ) : (
                    chats.map((chat) => {
                      const isCurrentChat = currentChatId === chat.id;
                      const isChecked = selectedChatIds.has(chat.id);
                      return (
                        <ChatItem
                          key={chat.id}
                          chat={chat}
                          isSelected={isCurrentChat}
                          isEditing={editingChatId === chat.id}
                          editingTitle={editingTitle}
                          editInputRef={editInputRef}
                          onSelect={() => handleChatSelect(chat.id)}
                          onStartEdit={(e) => startEditing(chat, e)}
                          onSaveEdit={saveEdit}
                          onDeleteClick={(e) => handleDeleteClick(chat, e)}
                          onTogglePin={() => onTogglePinChat(chat.id)}
                          onTitleChange={setEditingTitle}
                          onKeyDown={handleKeyDown}
                          onLongPress={(position: { top: number; left: number }) => {
                            if (!isSelectMode) {
                              setSelectedTitleChat(chat);
                              setMobileMenuPosition(position);
                              setMobileMenuOpen(true);
                            }
                          }}
                          onSwipeDelete={() => {
                            if (!isSelectMode) {
                              setChatToDelete(chat);
                              setDeleteDialogOpen(true);
                            }
                          }}
                          isSelectMode={isSelectMode}
                          isChecked={isChecked}
                          onToggleSelect={() => toggleChatSelection(chat.id)}
                        />
                      );
                    })
                  )}
                </div>
              </ScrollArea>

              <div className="p-3 border-t border-border">
                <p className="text-xs text-center text-muted-foreground">
                  VertexAI
                </p>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Mobile Compact Popup Menu */}
      {mobileMenuOpen && selectedTitleChat && (
        <>
          {/* Light backdrop - just to close on tap outside */}
          <div 
            className="fixed inset-0 z-[60] lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Compact popup near the chat item */}
          <div 
            className="fixed z-[70] lg:hidden animate-in fade-in-0 zoom-in-95 duration-150"
            style={{ 
              top: mobileMenuPosition.top, 
              left: Math.min(mobileMenuPosition.left, window.innerWidth - 160)
            }}
          >
            <div className="bg-popover border border-border rounded-lg shadow-lg overflow-hidden min-w-[140px]">
              <button
                className="w-full px-3 py-2.5 flex items-center gap-2 text-left text-sm hover:bg-accent active:bg-accent transition-colors"
                onClick={() => {
                  if (navigator.vibrate) navigator.vibrate(10);
                  if (selectedTitleChat) {
                    setEditingChatId(selectedTitleChat.id);
                    setEditingTitle(selectedTitleChat.title);
                  }
                  setMobileMenuOpen(false);
                }}
              >
                <Pencil className="w-4 h-4" />
                Rename
              </button>
              <button
                className="w-full px-3 py-2.5 flex items-center gap-2 text-left text-sm text-destructive hover:bg-accent active:bg-accent transition-colors"
                onClick={() => {
                  if (navigator.vibrate) navigator.vibrate(10);
                  if (selectedTitleChat) {
                    setChatToDelete(selectedTitleChat);
                    setDeleteDialogOpen(true);
                  }
                  setMobileMenuOpen(false);
                }}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete "{chatToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border hover:bg-secondary transition-colors">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedChatIds.size} conversation{selectedChatIds.size > 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete {selectedChatIds.size} selected conversation{selectedChatIds.size > 1 ? "s" : ""}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border hover:bg-secondary transition-colors">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
            >
              Delete {selectedChatIds.size}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Separate component for chat items to use the long press hook
interface ChatItemProps {
  chat: Chat;
  isSelected: boolean;
  isEditing: boolean;
  editingTitle: string;
  editInputRef: React.RefObject<HTMLInputElement>;
  onSelect: () => void;
  onStartEdit: (e: React.MouseEvent) => void;
  onSaveEdit: () => void;
  onDeleteClick: (e: React.MouseEvent) => void;
  onTogglePin: () => void;
  onTitleChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onLongPress: (position: { top: number; left: number }) => void;
  onSwipeDelete: () => void;
  isSelectMode: boolean;
  isChecked: boolean;
  onToggleSelect: () => void;
}

function ChatItem({
  chat,
  isSelected,
  isEditing,
  editingTitle,
  editInputRef,
  onSelect,
  onStartEdit,
  onSaveEdit,
  onDeleteClick,
  onTogglePin,
  onTitleChange,
  onKeyDown,
  onLongPress,
  onSwipeDelete,
  isSelectMode,
  isChecked,
  onToggleSelect,
}: ChatItemProps) {
  const longPressHandlers = useLongPress(onLongPress, undefined, { delay: 500 });
  const { swipeOffset, isSwiping, handlers: swipeHandlers } = useSwipeToDelete(onSwipeDelete, { threshold: 80 });

  const isSwipingActive = swipeOffset > 10 && !isSelectMode;

  const chatContent = (
    <div className="relative overflow-hidden rounded-lg">
      {/* Delete background revealed on swipe */}
      {!isSelectMode && isSwipingActive && (
        <div 
          className={`absolute inset-y-0 right-0 flex items-center justify-end px-4 bg-destructive transition-opacity duration-150 rounded-lg ${
            isSwipingActive ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ width: Math.max(swipeOffset + 20, 60) }}
        >
          <Trash2 className={`w-5 h-5 text-destructive-foreground transition-transform duration-150 ${
            swipeOffset >= 80 ? 'scale-110' : 'scale-100'
          }`} />
        </div>
      )}

      {/* Main chat item content */}
      <div
        className={`relative group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer bg-card ${
          isSwiping && !isSelectMode ? '' : 'transition-all duration-200 ease-out'
        } ${
          isChecked
            ? "bg-primary/5 text-foreground ring-1 ring-primary/20 scale-[0.98]"
            : isSelected
              ? "bg-secondary/30 text-foreground shadow-sm scale-[1.01]"
              : "text-muted-foreground hover:bg-secondary/20 hover:text-foreground hover:scale-[1.01] active:scale-[0.98]"
        }`}
        style={{ 
          transform: isSelectMode ? 'none' : `translateX(-${swipeOffset}px)`,
          transition: isSwiping && !isSelectMode ? 'none' : 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
        onClick={isSelectMode ? onToggleSelect : onSelect}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            if (isSelectMode) {
              onToggleSelect();
            } else {
              onSelect();
            }
          }
        }}
        {...(isSelectMode ? {} : swipeHandlers)}
      >
        {isSelectMode ? (
          <Checkbox 
            checked={isChecked}
            onCheckedChange={() => onToggleSelect()}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
        ) : (
          <div className="flex items-center gap-1">
            {chat.isPinned && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
            <MessageSquare className="w-4 h-4 shrink-0" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <Input
              ref={editInputRef}
              value={editingTitle}
              onChange={(e) => onTitleChange(e.target.value)}
              onKeyDown={onKeyDown}
              onBlur={onSaveEdit}
              className="h-6 text-sm px-1 py-0 bg-background border-primary"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <TooltipProvider delayDuration={400}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="relative overflow-hidden cursor-text touch-none"
                    onDoubleClick={onStartEdit}
                    {...longPressHandlers}
                  >
                    <p className="text-sm whitespace-nowrap truncate select-none">
                      {chat.title}
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent 
                  side="right" 
                  className="max-w-[280px] bg-popover text-popover-foreground border-border shadow-lg px-3 py-2 hidden lg:block"
                  sideOffset={12}
                >
                  <p className="text-sm break-words leading-relaxed">{chat.title}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <p className="text-xs text-muted-foreground truncate">
            {formatDate(chat.updatedAt)}
          </p>
        </div>
        {!isSelectMode && (
          isEditing ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-primary hover:text-primary/80 transition-colors shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onSaveEdit();
              }}
            >
              <Check className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-150 text-muted-foreground hover:text-foreground hidden lg:flex"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="bg-popover border-border shadow-lg z-50"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
                  className="cursor-pointer"
                >
                  <Star className={`w-4 h-4 mr-2 ${chat.isPinned ? 'text-yellow-500 fill-yellow-500' : ''}`} />
                  {chat.isPinned ? 'Unpin' : 'Pin'}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={onStartEdit}
                  className="cursor-pointer"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={onDeleteClick}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        )}
      </div>
    </div>
  );

  // Wrap with context menu for right-click support on desktop
  if (!isSelectMode && !isEditing) {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {chatContent}
        </ContextMenuTrigger>
        <ContextMenuContent className="bg-popover border-border shadow-lg z-50 hidden lg:block">
          <ContextMenuItem 
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin();
            }}
            className="cursor-pointer"
          >
            <Star className={`w-4 h-4 mr-2 ${chat.isPinned ? 'text-yellow-500 fill-yellow-500' : ''}`} />
            {chat.isPinned ? 'Unpin' : 'Pin'}
          </ContextMenuItem>
          <ContextMenuItem 
            onClick={(e) => {
              e.stopPropagation();
              onStartEdit(e as unknown as React.MouseEvent);
            }}
            className="cursor-pointer"
          >
            <Pencil className="w-4 h-4 mr-2" />
            Rename
          </ContextMenuItem>
          <ContextMenuItem 
            onClick={(e) => {
              e.stopPropagation();
              onDeleteClick(e as unknown as React.MouseEvent);
            }}
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  return chatContent;
}
