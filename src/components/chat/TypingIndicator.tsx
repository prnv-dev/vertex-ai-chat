import { VertexAIIcon } from "@/components/VertexAIIcon";

interface TypingIndicatorProps {
  isRegenerating?: boolean;
}

export function TypingIndicator({ isRegenerating = false }: TypingIndicatorProps) {
  return (
    <div className="message-container message-container-ai animate-fade-in">
      <div className="max-w-3xl mx-auto">
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <VertexAIIcon size="sm" className="w-7 h-7" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm font-medium text-foreground">VertexAI</span>
            </div>
            {isRegenerating ? (
              <div className="flex items-center gap-2 py-1 text-sm text-muted-foreground">
                <span>Regenerating...</span>
                <div className="flex gap-1">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              </div>
            ) : (
              <div className="flex gap-1.5 py-1">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
