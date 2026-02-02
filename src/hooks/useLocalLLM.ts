import { useState, useCallback, useRef, useEffect } from "react";
import * as webllm from "@mlc-ai/web-llm";
import {
  detectDevice,
  getDeviceMemoryGB,
  checkWebGPUCapability,
  getModelForDevice,
  isModelSafeForDevice,
  MODEL_REQUIREMENTS,
  type ModelConfig,
} from "@/lib/deviceDetection";
import { toast } from "@/hooks/use-toast";

interface LocalLLMState {
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
}

// Emit status to context
function emitStatus(status: Partial<LocalLLMState>) {
  window.dispatchEvent(
    new CustomEvent("localLLMStatus", { detail: status })
  );
}

/**
 * Get current model ID - desktop only
 */
function getCurrentModelId(): string {
  return MODEL_REQUIREMENTS.desktop.id;
}

export function useLocalLLM() {
  // Compute device info at hook initialization
  const deviceDetection = detectDevice();
  const initialModelConfig = getModelForDevice();
  
  const [state, setState] = useState<LocalLLMState>({
    isModelLoaded: false,
    isModelLoading: false,
    downloadProgress: 0,
    error: null,
    isMobile: deviceDetection.isMobile,
    modelInfo: initialModelConfig || MODEL_REQUIREMENTS.desktop,
    deviceInfo: {
      reasons: deviceDetection.reasons,
      confidence: deviceDetection.confidence,
      cssMin: deviceDetection.debug.cssMin,
      dpr: deviceDetection.debug.dpr,
      hasTouch: deviceDetection.debug.hasTouch,
    },
  });
  
  const engineRef = useRef<webllm.MLCEngine | null>(null);
  const initializingRef = useRef(false);
  // Track which model is actually loaded
  const loadedModelIdRef = useRef<string | null>(null);

  const updateState = useCallback((updates: Partial<LocalLLMState>) => {
    setState(prev => {
      const newState = { ...prev, ...updates };
      emitStatus(updates);
      return newState;
    });
  }, []);

  const initializeModel = useCallback(async () => {
    if (initializingRef.current || state.isModelLoaded) {
      return;
    }

    initializingRef.current = true;
    updateState({ isModelLoading: true, error: null, downloadProgress: 0 });

    try {
      // Get fresh device detection at runtime
      const detection = detectDevice();
      
      // Block mobile devices - offline AI is desktop only
      if (detection.isMobile) {
        toast({
          title: "Offline AI Not Available",
          description: "Offline AI is only supported on desktop/laptop computers. Please use cloud AI on mobile.",
          variant: "destructive",
        });
        throw new Error("Offline AI is only available on desktop/laptop computers.");
      }
      
      const currentModel = MODEL_REQUIREMENTS.desktop;
      
      console.log(`[LocalLLM] Device detection:`, detection);
      console.log(`[LocalLLM] Debug: cssMin=${detection.debug.cssMin}px, dpr=${detection.debug.dpr}, touch=${detection.debug.hasTouch}`);
      console.log(`[LocalLLM] Selected model: ${currentModel.id} (${currentModel.sizeGB}GB)`);
      
      // Safety check
      const safetyCheck = isModelSafeForDevice(currentModel.id);
      if (safetyCheck) {
        throw new Error(safetyCheck);
      }
      
      // Check device memory
      const deviceMemory = getDeviceMemoryGB();
      console.log(`[LocalLLM] Device memory: ${deviceMemory}GB, Required: ${currentModel.minRAMGB}GB`);
      
      if (deviceMemory < currentModel.minRAMGB) {
        throw new Error(
          `Insufficient memory. Your device has ~${deviceMemory}GB RAM, but ${currentModel.displayName} needs at least ${currentModel.minRAMGB}GB. ${
            detection.isMobile ? "Try on a desktop/laptop instead." : ""
          }`
        );
      }

      // Check WebGPU support with detailed capability check
      const webgpuCheck = await checkWebGPUCapability();
      
      if (!webgpuCheck.supported) {
        throw new Error(webgpuCheck.error || "WebGPU not supported");
      }

      console.log(`[LocalLLM] WebGPU check: shader-f16=${webgpuCheck.hasShaderF16}, buffer=${Math.round(webgpuCheck.maxBufferSize / (1024 * 1024))}MB`);

      console.log(`[LocalLLM] Loading model: ${currentModel.id} (${currentModel.sizeGB}GB)`);

      // Validate model ID exists in prebuiltAppConfig before loading
      const availableModels = webllm.prebuiltAppConfig.model_list.map(m => m.model_id);
      if (!availableModels.includes(currentModel.id)) {
        console.error(`[LocalLLM] Model ID not found in library: ${currentModel.id}`);
        console.log(`[LocalLLM] Available models:`, availableModels.filter(id => id.toLowerCase().includes('smol') || id.toLowerCase().includes('phi')));
        throw new Error(
          `Model "${currentModel.id}" not found in web-llm library. Please check for a valid model ID.`
        );
      }

      // Progress callback
      const progressCallback = (report: { progress: number; text: string }) => {
        const percent = Math.round(report.progress * 100);
        updateState({ downloadProgress: percent });
        console.log(`[LocalLLM] Progress: ${percent}% - ${report.text}`);
      };

      const engine = await webllm.CreateMLCEngine(currentModel.id, {
        initProgressCallback: progressCallback,
      });

      engineRef.current = engine;
      loadedModelIdRef.current = currentModel.id;
      
      updateState({ 
        isModelLoaded: true, 
        isModelLoading: false, 
        downloadProgress: 100,
        modelInfo: currentModel,
        isMobile: detection.isMobile,
        deviceInfo: {
          reasons: detection.reasons,
          confidence: detection.confidence,
          cssMin: detection.debug.cssMin,
          dpr: detection.debug.dpr,
          hasTouch: detection.debug.hasTouch,
        },
      });
      console.log(`[LocalLLM] Model loaded successfully: ${currentModel.displayName}`);
    } catch (error) {
      console.error("[LocalLLM] Failed to initialize:", error);
      updateState({
        isModelLoading: false,
        error: error instanceof Error ? error.message : "Failed to load model",
      });
    } finally {
      initializingRef.current = false;
    }
  }, [state.isModelLoaded, updateState]);

  // Ref to track if generation was interrupted
  const interruptedRef = useRef(false);

  const interruptGeneration = useCallback(() => {
    if (engineRef.current) {
      try {
        interruptedRef.current = true;
        engineRef.current.interruptGenerate();
        console.log("Local LLM generation interrupted");
      } catch (error) {
        console.error("Failed to interrupt generation:", error);
      }
    }
  }, []);

  const generateResponse = useCallback(
    async (
      messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
      onToken?: (token: string) => void
    ): Promise<string> => {
      if (!engineRef.current) {
        throw new Error("Model not loaded. Please wait for initialization.");
      }

      // Reset interrupted flag at start
      interruptedRef.current = false;

      try {
        // Only use last 8 messages to reduce context and speed up generation
        const recentMessages = messages.slice(-8);
        
        const formattedMessages = [
          {
            role: "system" as const,
            content: `You are a helpful assistant running locally in the browser.
You can understand and respond in multiple languages including Hindi and English.
Keep responses concise and helpful.`,
          },
          ...recentMessages.map(m => ({
            role: m.role as "user" | "assistant" | "system",
            content: m.content,
          })),
        ];

        if (onToken) {
          // Streaming mode
          let fullResponse = "";
          const chunks = await engineRef.current.chat.completions.create({
            messages: formattedMessages,
            stream: true,
            max_tokens: 512,
            temperature: 0.6,
            top_p: 0.9,
          });

          for await (const chunk of chunks) {
            // Check if interrupted
            if (interruptedRef.current) {
              console.log("Generation loop detected interrupt, stopping");
              break;
            }
            const delta = chunk.choices[0]?.delta?.content || "";
            if (delta) {
              fullResponse += delta;
              onToken(delta);
            }
          }
          return fullResponse;
        } else {
          // Non-streaming mode
          const response = await engineRef.current.chat.completions.create({
            messages: formattedMessages,
            max_tokens: 512,
            temperature: 0.6,
            top_p: 0.9,
          });

          return response.choices[0]?.message?.content || "";
        }
      } catch (error) {
        // Check if this was an intentional interrupt
        if (interruptedRef.current) {
          console.log("Generation was interrupted by user");
          return ""; // Return empty on interrupt
        }
        console.error("Local LLM generation error:", error);
        throw error;
      }
    },
    []
  );

  const unloadModel = useCallback(async () => {
    if (engineRef.current) {
      try {
        await engineRef.current.unload();
        engineRef.current = null;
        updateState({ isModelLoaded: false, downloadProgress: 0 });
        console.log("Model unloaded");
      } catch (error) {
        console.error("Failed to unload model:", error);
      }
    }
  }, [updateState]);

  // Check if model is cached - check CURRENT device's model
  const isModelCached = useCallback(async (): Promise<boolean> => {
    try {
      const currentModelId = getCurrentModelId();
      const cacheStatus = await webllm.hasModelInCache(currentModelId);
      console.log(`[LocalLLM] Cache check for ${currentModelId}: ${cacheStatus}`);
      return cacheStatus;
    } catch {
      return false;
    }
  }, []);

  // Delete cached model - desktop model only
  const deleteModelCache = useCallback(async () => {
    try {
      const currentModelId = getCurrentModelId();
      console.log(`[LocalLLM] Deleting cache for: ${currentModelId}`);
      await webllm.deleteModelAllInfoInCache(currentModelId);
      
      updateState({ isModelLoaded: false, downloadProgress: 0 });
      engineRef.current = null;
      loadedModelIdRef.current = null;
      console.log("[LocalLLM] Model cache deleted");
    } catch (error) {
      console.error("[LocalLLM] Failed to delete model cache:", error);
    }
  }, [updateState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.unload().catch(console.error);
      }
    };
  }, []);

  return {
    ...state,
    initializeModel,
    generateResponse,
    unloadModel,
    isModelCached,
    deleteModelCache,
    interruptGeneration,
  };
}
