import { memo, ReactNode } from "react";

interface SemanticHighlightProps {
  children: ReactNode;
}

export const SemanticHighlight = memo(function SemanticHighlight({
  children,
}: SemanticHighlightProps) {
  return (
    <code className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-[0.85em] break-words">
      {children}
    </code>
  );
});
