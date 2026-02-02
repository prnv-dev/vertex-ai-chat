import { useState, useEffect } from "react";
import { AlertTriangle, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOfflineMode } from "@/contexts/OfflineModeContext";

const DISMISSED_KEY = "vertexai-cloud-warning-dismissed";

export function CloudServiceWarning() {
  const { cloudServiceError, setCloudServiceError } = useOfflineMode();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISSED_KEY) === "true";
    } catch {
      return false;
    }
  });

  // Reset dismissed state when a new error occurs
  useEffect(() => {
    if (cloudServiceError) {
      setDismissed(false);
      try {
        localStorage.removeItem(DISMISSED_KEY);
      } catch {}
    }
  }, [cloudServiceError]);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, "true");
    } catch {}
  };

  const handleClearError = () => {
    setCloudServiceError(null);
    setDismissed(false);
    try {
      localStorage.removeItem(DISMISSED_KEY);
    } catch {}
  };

  if (!cloudServiceError || dismissed) return null;

  const getErrorMessage = () => {
    switch (cloudServiceError) {
      case "quota":
        return "Cloud AI ki quota/credits khatam ho gaye!";
      case "rate_limit":
        return "Cloud AI par rate limit lag gaya!";
      case "unavailable":
        return "Cloud AI server abhi available nahi hai!";
      default:
        return "Cloud AI mein kuch issue hai!";
    }
  };

  return (
    <div className="w-full max-w-lg mt-4 animate-fade-in">
      <div className="bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/40 rounded-xl p-4 backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground text-sm">
              {getErrorMessage()}
            </p>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              Unlimited access ke liye apna Supabase project connect karo.
            </p>
            
            <div className="flex items-center gap-3 mt-3">
              <a
                href="https://docs.lovable.dev/tips-tricks/self-hosting"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-500 hover:text-amber-400 transition-colors"
              >
                Kaise kare?
                <ExternalLink className="w-3 h-3" />
              </a>
              
              <button
                onClick={handleClearError}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Retry Cloud AI
              </button>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 hover:bg-amber-500/20"
            onClick={handleDismiss}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
