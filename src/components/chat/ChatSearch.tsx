import { useState, useMemo } from "react";
import { Search, X, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Chat, Message } from "@/types/chat";

interface SearchResult {
  chatId: string;
  chatTitle: string;
  message: Message;
  matchSnippet: string;
}

interface ChatSearchProps {
  chats: Chat[];
  onSelectResult: (chatId: string) => void;
  onClose: () => void;
}

export function ChatSearch({ chats, onSelectResult, onClose }: ChatSearchProps) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    if (!query.trim() || query.length < 2) return [];

    const searchResults: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    chats.forEach((chat) => {
      chat.messages.forEach((message) => {
        if (message.content.toLowerCase().includes(lowerQuery)) {
          // Create a snippet around the match
          const content = message.content;
          const matchIndex = content.toLowerCase().indexOf(lowerQuery);
          const start = Math.max(0, matchIndex - 40);
          const end = Math.min(content.length, matchIndex + query.length + 40);
          let snippet = content.slice(start, end);
          
          if (start > 0) snippet = "..." + snippet;
          if (end < content.length) snippet = snippet + "...";

          searchResults.push({
            chatId: chat.id,
            chatTitle: chat.title,
            message,
            matchSnippet: snippet,
          });
        }
      });
    });

    return searchResults.slice(0, 20); // Limit results
  }, [query, chats]);

  const handleSelectResult = (chatId: string) => {
    onSelectResult(chatId);
    onClose();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search messages..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 pr-9 bg-secondary border-border"
            autoFocus
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={() => setQuery("")}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {!query.trim() ? (
            <div className="text-center py-8">
              <Search className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-xs text-muted-foreground">
                Type to search through your conversations
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs text-muted-foreground">
                No results found for "{query}"
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((result, index) => (
                <button
                  key={`${result.chatId}-${result.message.id}-${index}`}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-secondary/50 transition-colors group"
                  onClick={() => handleSelectResult(result.chatId)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs font-medium text-foreground truncate">
                      {result.chatTitle}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto shrink-0">
                      {result.message.role === "user" ? "You" : "AI"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 pl-5">
                    <HighlightedText text={result.matchSnippet} query={query} />
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;

  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <span key={i} className="text-primary font-medium">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}
