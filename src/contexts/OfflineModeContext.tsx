import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { toast } from "@/hooks/use-toast";
import { isMobileDevice } from "@/lib/deviceDetection";

interface OfflineModeContextType {
  isOnline: boolean;
  isModelLoaded: boolean;
  isModelLoading: boolean;
  downloadProgress: number;
  modelError: string | null;
  forceOfflineMode: boolean;
  setForceOfflineMode: (value: boolean, manual?: boolean) => void;
  shouldUseLocalAI: boolean;
  isManuallySet: boolean;
  cloudServiceError: string | null;
  setCloudServiceError: (error: string | null) => void;
}

const OfflineModeContext = createContext<OfflineModeContextType | undefined>(undefined);

const FORCE_OFFLINE_KEY = "vertexai-force-offline";
const MANUAL_OVERRIDE_KEY = "vertexai-manual-override";
const CLOUD_ERROR_KEY = "vertexai-cloud-service-error";

export function OfflineModeProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [modelError, setModelError] = useState<string | null>(null);
  const [forceOfflineMode, setForceOfflineModeState] = useState(() => {
    try {
      return localStorage.getItem(FORCE_OFFLINE_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [isManuallySet, setIsManuallySet] = useState(() => {
    try {
      return localStorage.getItem(MANUAL_OVERRIDE_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [previousOnlineState, setPreviousOnlineState] = useState(navigator.onLine);
  const [cloudServiceError, setCloudServiceErrorState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(CLOUD_ERROR_KEY);
    } catch {
      return null;
    }
  });

  const setCloudServiceError = useCallback((error: string | null) => {
    setCloudServiceErrorState(error);
    try {
      if (error) {
        localStorage.setItem(CLOUD_ERROR_KEY, error);
      } else {
        localStorage.removeItem(CLOUD_ERROR_KEY);
      }
    } catch (e) {
      console.error("Failed to save cloud error state:", e);
    }
  }, []);
  
  // Use ref to access latest state in event handlers
  const stateRef = useRef({ forceOfflineMode, isManuallySet });
  useEffect(() => {
    stateRef.current = { forceOfflineMode, isManuallySet };
  }, [forceOfflineMode, isManuallySet]);

  // Initial network status check on mount
  useEffect(() => {
    const isMobile = isMobileDevice();
    const isCurrentlyOnline = navigator.onLine;
    
    // Mobile devices don't support offline AI - never auto-enable offline mode
    if (isMobile) {
      if (stateRef.current.forceOfflineMode) {
        setForceOfflineModeState(false);
        try {
          localStorage.setItem(FORCE_OFFLINE_KEY, "false");
        } catch (e) {
          console.error("Failed to save offline preference:", e);
        }
      }
      return;
    }
    
    // Desktop: If offline on initial load, auto-enable offline mode
    if (!isCurrentlyOnline && !stateRef.current.forceOfflineMode) {
      setForceOfflineModeState(true);
      try {
        localStorage.setItem(FORCE_OFFLINE_KEY, "true");
      } catch (e) {
        console.error("Failed to save offline preference:", e);
      }
    }
    
    // If online on initial load and offline mode was auto-set (not manual), disable it
    if (isCurrentlyOnline && stateRef.current.forceOfflineMode && !stateRef.current.isManuallySet) {
      setForceOfflineModeState(false);
      try {
        localStorage.setItem(FORCE_OFFLINE_KEY, "false");
      } catch (e) {
        console.error("Failed to save offline preference:", e);
      }
    }
  }, []); // Empty dependency - runs only once on mount

  const setForceOfflineMode = useCallback((value: boolean, manual: boolean = true) => {
    setForceOfflineModeState(value);
    
    // Track if user manually set this
    if (manual) {
      setIsManuallySet(value); // true if turning ON manually, false if turning OFF
      try {
        localStorage.setItem(MANUAL_OVERRIDE_KEY, String(value));
      } catch (e) {
        console.error("Failed to save manual override preference:", e);
      }
    }
    
    try {
      localStorage.setItem(FORCE_OFFLINE_KEY, String(value));
    } catch (e) {
      console.error("Failed to save offline preference:", e);
    }
  }, []);

  // Network status detection with auto-toggle
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      
      const { forceOfflineMode: currentOfflineMode, isManuallySet: currentManual } = stateRef.current;
      
      // Auto-disable offline mode when internet returns
      // BUT only if it wasn't manually enabled by user
      if (currentOfflineMode && !currentManual) {
        setForceOfflineModeState(false);
        try {
          localStorage.setItem(FORCE_OFFLINE_KEY, "false");
        } catch (e) {
          console.error("Failed to save offline preference:", e);
        }
      }
      
      // Only show toast on desktop
      const isMobile = isMobileDevice();
      if (!previousOnlineState && !isMobile) {
        toast({
          title: "Back Online",
          description: currentManual 
            ? "Cloud AI available. Offline mode still ON (manual)." 
            : "Switching to Cloud AI...",
          className: "bg-card border-green-500/50",
        });
      }
      setPreviousOnlineState(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
      
      const isMobile = isMobileDevice();
      const { forceOfflineMode: currentOfflineMode } = stateRef.current;
      
      // Mobile devices don't support offline AI - silently ignore, no toasts
      if (isMobile) {
        setPreviousOnlineState(false);
        return;
      }
      
      // Desktop: Auto-enable offline mode when internet goes offline
      if (!currentOfflineMode) {
        setForceOfflineModeState(true);
        try {
          localStorage.setItem(FORCE_OFFLINE_KEY, "true");
        } catch (e) {
          console.error("Failed to save offline preference:", e);
        }
      }
      
      if (previousOnlineState) {
        toast({
          title: "You're Offline",
          description: (
            <div className="mt-1 space-y-1 text-xs">
              <div className="font-medium text-primary">Switching to Local AI...</div>
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Chat with Local AI</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>View & search chats</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Export conversations</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">✗</span>
                <span className="text-muted-foreground">Image generation</span>
              </div>
            </div>
          ),
          duration: 5000,
        });
      }
      setPreviousOnlineState(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [previousOnlineState]);

  // Listen for model status updates from the hook
  useEffect(() => {
    const handleModelStatus = (event: CustomEvent) => {
      const { isModelLoaded, isModelLoading, downloadProgress, error } = event.detail;
      if (isModelLoaded !== undefined) setIsModelLoaded(isModelLoaded);
      if (isModelLoading !== undefined) setIsModelLoading(isModelLoading);
      if (downloadProgress !== undefined) setDownloadProgress(downloadProgress);
      if (error !== undefined) setModelError(error);
    };

    window.addEventListener("localLLMStatus" as any, handleModelStatus);
    return () => {
      window.removeEventListener("localLLMStatus" as any, handleModelStatus);
    };
  }, []);

  // Listen for cloud service error events
  useEffect(() => {
    const handleCloudError = (event: CustomEvent) => {
      setCloudServiceError(event.detail.error);
    };

    window.addEventListener("cloudServiceError" as any, handleCloudError);
    return () => {
      window.removeEventListener("cloudServiceError" as any, handleCloudError);
    };
  }, [setCloudServiceError]);

  // Mobile devices never use local AI
  const isMobile = isMobileDevice();
  const shouldUseLocalAI = isMobile ? false : (!isOnline || forceOfflineMode);

  return (
    <OfflineModeContext.Provider
      value={{
        isOnline,
        isModelLoaded,
        isModelLoading,
        downloadProgress,
        modelError,
        forceOfflineMode,
        setForceOfflineMode,
        shouldUseLocalAI,
        isManuallySet,
        cloudServiceError,
        setCloudServiceError,
      }}
    >
      {children}
    </OfflineModeContext.Provider>
  );
}

export function useOfflineMode() {
  const context = useContext(OfflineModeContext);
  if (context === undefined) {
    throw new Error("useOfflineMode must be used within an OfflineModeProvider");
  }
  return context;
}
