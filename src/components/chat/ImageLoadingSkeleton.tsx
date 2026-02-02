import { VertexAIIcon } from "@/components/VertexAIIcon";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageIcon, Sparkles } from "lucide-react";

interface ImageLoadingSkeletonProps {
  prompt?: string;
}

export function ImageLoadingSkeleton({ prompt }: ImageLoadingSkeletonProps) {
  return (
    <div className="message-container message-container-ai animate-fade-in">
      <div className="max-w-3xl mx-auto px-3 sm:px-4">
        <div className="flex gap-2.5 sm:gap-4">
          {/* Avatar */}
          <div className="flex-shrink-0 hidden xs:block">
            <VertexAIIcon size="sm" className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 sm:mb-1.5">
              <div className="xs:hidden flex-shrink-0">
                <VertexAIIcon size="sm" className="w-5 h-5" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-foreground">
                VertexAI
              </span>
            </div>

            {/* Image skeleton container */}
            <div className="relative max-w-full sm:max-w-md">
              {/* Main skeleton */}
              <div className="relative aspect-square w-full max-w-[320px] sm:max-w-[384px] rounded-xl overflow-hidden bg-gradient-to-br from-muted/80 via-muted to-muted/60">
                {/* Animated shimmer overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/5 to-transparent animate-shimmer" 
                     style={{ 
                       backgroundSize: '200% 100%',
                       animation: 'shimmer 2s infinite linear'
                     }} 
                />
                
                {/* Center content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  {/* Animated icon */}
                  <div className="relative">
                    <ImageIcon className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground/40" />
                    <Sparkles className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 text-primary/60 animate-pulse" />
                  </div>
                  
                  {/* Loading text */}
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="text-sm sm:text-base font-medium text-foreground/70">
                      Generating image...
                    </span>
                    {prompt && (
                      <span className="text-xs text-muted-foreground max-w-[200px] sm:max-w-[280px] text-center line-clamp-2">
                        "{prompt.slice(0, 60)}{prompt.length > 60 ? '...' : ''}"
                      </span>
                    )}
                  </div>
                  
                  {/* Animated dots */}
                  <div className="flex gap-1.5 mt-1">
                    <div className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>

                {/* Decorative corner elements */}
                <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-primary/20 rounded-tl-lg" />
                <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-primary/20 rounded-tr-lg" />
                <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-primary/20 rounded-bl-lg" />
                <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-primary/20 rounded-br-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
