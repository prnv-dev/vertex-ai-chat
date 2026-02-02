import { useOfflineMode } from "@/contexts/OfflineModeContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Wifi, WifiOff, Cpu } from "lucide-react";

export function NetworkStatusIndicator() {
  const { isOnline, shouldUseLocalAI, isModelLoaded, isModelLoading, forceOfflineMode } = useOfflineMode();

  const getStatusConfig = () => {
    if (!isOnline) {
      return {
        color: "bg-amber-500",
        icon: WifiOff,
        text: "Offline - Using Local AI",
        pulse: false,
      };
    }
    if (forceOfflineMode) {
      return {
        color: "bg-blue-500",
        icon: Cpu,
        text: "Local AI Mode (Data Saver)",
        pulse: false,
      };
    }
    return {
      color: "bg-green-500",
      icon: Wifi,
      text: "Online - Cloud AI",
      pulse: false,
    };
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5 cursor-default">
          <div className="relative">
            <div
              className={`w-2 h-2 rounded-full ${config.color} ${
                config.pulse ? "animate-pulse" : ""
              }`}
            />
            {isModelLoading && (
              <div className="absolute inset-0 w-2 h-2 rounded-full border border-primary animate-ping" />
            )}
          </div>
          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        <div className="space-y-1">
          <p className="font-medium">{config.text}</p>
          {shouldUseLocalAI && (
            <p className="text-muted-foreground">
              {isModelLoaded ? "Local model ready" : isModelLoading ? "Loading model..." : "Model not loaded"}
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
