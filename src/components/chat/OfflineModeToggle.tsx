import { useState, useEffect } from "react";
import { useOfflineMode } from "@/contexts/OfflineModeContext";
import { useLocalLLMContext } from "@/contexts/LocalLLMContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plane, Download, Trash2, Cpu, Cloud, HardDrive, Monitor, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { 
  detectDevice, 
  getDeviceMemoryGB, 
  checkWebGPUCapability,
  MODEL_REQUIREMENTS,
} from "@/lib/deviceDetection";

export function OfflineModeToggle() {
  // Check if device supports offline AI (desktop only)
  const detection = detectDevice();
  
  // Hide entire component on mobile - offline AI is desktop only
  if (detection.isMobile) {
    return null;
  }

  const {
    isOnline,
    isModelLoaded,
    isModelLoading,
    downloadProgress,
    forceOfflineMode,
    setForceOfflineMode,
    modelError,
    isManuallySet,
  } = useOfflineMode();

  const { initializeModel, deleteModelCache, isModelCached } = useLocalLLMContext();
  const [isCached, setIsCached] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showAttention, setShowAttention] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [webgpuStatus, setWebgpuStatus] = useState<{
    checked: boolean;
    supported: boolean;
    hasShaderF16: boolean;
    error: string | null;
  }>({ checked: false, supported: true, hasShaderF16: true, error: null });
  
  const modelInfo = MODEL_REQUIREMENTS.desktop;
  const deviceMemory = getDeviceMemoryGB();

  // Check WebGPU on mount
  useEffect(() => {
    checkWebGPUCapability().then(result => {
      setWebgpuStatus({
        checked: true,
        supported: result.supported,
        hasShaderF16: result.hasShaderF16,
        error: result.error,
      });
      console.log(`[OfflineToggle] WebGPU: supported=${result.supported}, shader-f16=${result.hasShaderF16}`);
    });
  }, []);

  useEffect(() => {
    isModelCached().then(setIsCached);
  }, [isModelCached, isModelLoaded]);
  
  // Reset downloadStarted when loading completes or errors
  useEffect(() => {
    if (!isModelLoading && downloadStarted) {
      const timer = setTimeout(() => setDownloadStarted(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isModelLoading, downloadStarted]);

  // Show completion notification when download finishes successfully
  useEffect(() => {
    if (!isModelLoading && isModelLoaded && downloadStarted) {
      toast({
        title: "Offline AI Ready!",
        description: "Your AI model is ready. You can now use the app without internet.",
        duration: 5000,
      });
    }
  }, [isModelLoading, isModelLoaded, downloadStarted]);

  // Listen for download prompt events
  useEffect(() => {
    const handleShowPrompt = () => {
      setShowAttention(true);
      setIsOpen(true);
    };
    window.addEventListener("showModelDownloadPrompt", handleShowPrompt);
    return () => window.removeEventListener("showModelDownloadPrompt", handleShowPrompt);
  }, []);

  // Auto-prompt on first offline detection without model
  useEffect(() => {
    const hasPromptedBefore = localStorage.getItem("vertexai-offline-prompted");
    if (!isOnline && !isModelLoaded && !isModelLoading && !hasPromptedBefore) {
      localStorage.setItem("vertexai-offline-prompted", "true");
      setShowAttention(true);
      toast({
        title: "Enable Offline AI?",
        description: `Download the local AI model (~${modelInfo.sizeGB}GB) to chat without internet. Click the airplane icon to download.`,
        duration: 8000,
      });
    }
  }, [isOnline, isModelLoaded, isModelLoading, modelInfo.sizeGB]);

  const handleToggleOfflineMode = (enabled: boolean) => {
    setForceOfflineMode(enabled, true);
    if (enabled && !isModelLoaded && !isModelLoading) {
      setIsOpen(false); // Close popover for background download
      startDownload();
    }
  };

  const startDownload = () => {
    setDownloadStarted(true);
    toast({
      title: "Download Started",
      description: "AI model downloading in background. Continue using the app!",
      duration: 3000,
    });
    initializeModel();
  };

  const handleDownloadModel = async () => {
    setShowAttention(false);
    setIsOpen(false); // Close popover - let user continue using app
    if (!isModelLoaded && !isModelLoading) {
      startDownload();
    }
  };

  const handleDeleteModel = async () => {
    await deleteModelCache();
    setIsCached(false);
    setForceOfflineMode(false, true);
    toast({
      title: "Model Deleted",
      description: "Local AI model has been removed to free up storage.",
    });
  };

  const needsDownload = !isModelLoaded && !isModelLoading && !isCached;
  const sizeText = `~${modelInfo.sizeGB}GB`;

  return (
    <TooltipProvider>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`text-muted-foreground hover:text-foreground transition-colors relative ${
                  forceOfflineMode ? "text-primary" : ""
                } ${showAttention && needsDownload ? "animate-pulse" : ""}`}
              >
                <Plane className="w-4 h-4" />
                
                {/* Background download progress ring */}
                {isModelLoading && (
                  <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                    <circle
                      cx="50%" cy="50%" r="40%"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-primary/20"
                    />
                    <circle
                      cx="50%" cy="50%" r="40%"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeDasharray={`${downloadProgress * 2.51} 251`}
                      className="text-primary transition-all duration-300"
                    />
                  </svg>
                )}
                
                {needsDownload && !isModelLoading && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-500 rounded-full flex items-center justify-center">
                    <Download className="w-1.5 h-1.5 text-white" />
                  </span>
                )}
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs">
              {isModelLoaded
                ? "Offline AI Ready"
                : isModelLoading
                ? `Downloading... ${downloadProgress}%`
                : needsDownload
                ? "Download Offline AI"
                : "Manage Offline Mode"}
            </p>
          </TooltipContent>
        </Tooltip>
        <PopoverContent align="end" className="w-72 p-4">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plane className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">Offline Mode</span>
                {isManuallySet && isOnline && (
                  <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                    Manual
                  </span>
                )}
              </div>
              <Switch
                checked={forceOfflineMode}
                onCheckedChange={handleToggleOfflineMode}
                disabled={isModelLoading}
              />
            </div>

            {/* Device Info Badge - Desktop only */}
            <div className="flex items-center gap-2 text-xs bg-muted/50 rounded px-2 py-1.5">
              <Monitor className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Desktop</span>
              <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded ml-auto">
                Full Model
              </span>
            </div>

            {/* Status */}
            <div className="bg-secondary/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs">
                {isOnline ? (
                  <>
                    <Cloud className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-green-600 dark:text-green-400">Connected</span>
                  </>
                ) : (
                  <>
                    <Cloud className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-amber-600 dark:text-amber-400">Offline</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Cpu className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {isModelLoaded
                    ? "Local AI Ready"
                    : isModelLoading
                    ? "Loading..."
                    : isCached
                    ? "Cached (not loaded)"
                    : "Not downloaded"}
                </span>
              </div>
              {deviceMemory && (
                <div className="flex items-center gap-2 text-xs">
                  <HardDrive className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    RAM: ~{deviceMemory}GB
                  </span>
                </div>
              )}
            </div>

            {/* WebGPU Warning */}
            {webgpuStatus.checked && !webgpuStatus.supported && (
              <div className="flex items-start gap-2 text-xs bg-destructive/10 text-destructive rounded p-2">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>WebGPU not supported. Please use Chrome 113+ or Edge 113+.</span>
              </div>
            )}

            {/* Stylish Download Progress */}
            {(isModelLoading || downloadStarted) && (
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/30 border border-primary/20 p-4">
                {/* Animated background shimmer */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" 
                  style={{ animation: 'shimmer 2s infinite' }} />
                
                <div className="relative space-y-3">
                  {/* Header with animated icon */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="absolute inset-0 bg-primary/30 rounded-full blur-md animate-pulse" />
                        <div className="relative w-8 h-8 bg-gradient-to-br from-primary to-primary/70 rounded-full flex items-center justify-center">
                          <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" />
                        </div>
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground">
                          {downloadProgress === 0 ? "Preparing..." : "Downloading AI"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{modelInfo.displayName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                        {downloadProgress}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Gradient Progress Bar */}
                  <div className="relative h-3 bg-secondary/50 rounded-full overflow-hidden">
                    <div 
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-primary/80 to-primary/60 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${downloadProgress}%` }}
                    />
                    <div 
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-white/20 to-transparent rounded-full transition-all duration-300"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                  
                  {/* Status message */}
                  <p className="text-xs text-muted-foreground text-center">
                    {downloadProgress === 0 
                      ? "Initializing WebGPU..."
                      : downloadProgress < 50 
                      ? "Downloading model weights..."
                      : downloadProgress < 100
                      ? "Loading into GPU memory..."
                      : "✓ Model ready!"}
                  </p>
                </div>
              </div>
            )}

            {/* Error */}
            {modelError && (
              <p className="text-xs text-destructive bg-destructive/10 rounded p-2">
                {modelError}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              {!isModelLoaded && !isModelLoading && !downloadStarted && (
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs"
                  onClick={handleDownloadModel}
                  disabled={webgpuStatus.checked && !webgpuStatus.supported}
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Download ({sizeText})
                </Button>
              )}
              {(isCached || isModelLoaded) && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs text-destructive hover:text-destructive"
                  onClick={handleDeleteModel}
                  disabled={isModelLoading}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Delete
                </Button>
              )}
            </div>

            {/* Clear Cache Button */}
            <Button
              size="sm"
              variant="ghost"
              className="w-full text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
                if ('caches' in window) {
                  caches.keys().then(names => {
                    names.forEach(name => {
                      // Skip WebLLM/AI model caches - these are large and expensive to re-download
                      const lowerName = name.toLowerCase();
                      if (!lowerName.includes('webllm') && 
                          !lowerName.includes('model') &&
                          !lowerName.includes('transformers')) {
                        caches.delete(name);
                      }
                    });
                  });
                }
                toast({
                  title: "Cache Cleared",
                  description: "AI model preserved. Reloading...",
                });
                setTimeout(() => window.location.reload(), 500);
              }}
            >
              Clear App Cache & Reload
            </Button>

            {/* Version display */}
            <div className="text-[10px] text-muted-foreground text-center pt-2 border-t">
              App v2.0.12
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
}