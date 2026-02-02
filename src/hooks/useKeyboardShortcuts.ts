import { useEffect, useCallback } from "react";

interface UseKeyboardShortcutsProps {
  onNewChat: () => void;
  onShowShortcuts: () => void;
  onUndo?: () => boolean;
}

export function useKeyboardShortcuts({
  onNewChat,
  onShowShortcuts,
  onUndo,
}: UseKeyboardShortcutsProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Check if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Ctrl+K or Cmd+K for new chat
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        onNewChat();
        return;
      }

      // Ctrl+/ or Cmd+/ for shortcuts help
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        onShowShortcuts();
        return;
      }

      // Ctrl+Z or Cmd+Z for undo (only when not typing)
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !isTyping && onUndo) {
        e.preventDefault();
        onUndo();
        return;
      }
    },
    [onNewChat, onShowShortcuts, onUndo]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
