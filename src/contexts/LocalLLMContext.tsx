import { createContext, useContext, ReactNode } from "react";
import { useLocalLLM } from "@/hooks/useLocalLLM";
import type { ModelConfig } from "@/lib/deviceDetection";

interface LocalLLMContextType {
  isModelLoaded: boolean;
  isModelLoading: boolean;
  downloadProgress: number;
  error: string | null;
  isMobile: boolean;
  modelInfo: ModelConfig;
  deviceInfo: {
    reasons: string[];
    confidence: string;
    cssMin: number;
    dpr: number;
    hasTouch: boolean;
  };
  initializeModel: () => Promise<void>;
  generateResponse: (
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
    onToken?: (token: string) => void
  ) => Promise<string>;
  unloadModel: () => Promise<void>;
  isModelCached: () => Promise<boolean>;
  deleteModelCache: () => Promise<void>;
  interruptGeneration: () => void;
}

const LocalLLMContext = createContext<LocalLLMContextType | null>(null);

export function LocalLLMProvider({ children }: { children: ReactNode }) {
  const localLLM = useLocalLLM();

  return (
    <LocalLLMContext.Provider value={localLLM}>
      {children}
    </LocalLLMContext.Provider>
  );
}

export function useLocalLLMContext() {
  const context = useContext(LocalLLMContext);
  if (!context) {
    throw new Error("useLocalLLMContext must be used within a LocalLLMProvider");
  }
  return context;
}
