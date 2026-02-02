/**
 * Device detection utilities for mobile-safe AI model loading
 * Multi-layer detection to prevent crashes on mobile
 * Uses CSS pixels (not device pixels) for reliable sizing
 */

export interface DeviceDetectionResult {
  isMobile: boolean;
  reasons: string[];
  confidence: "high" | "medium" | "low";
  debug: {
    cssMin: number;
    dpr: number;
    hasTouch: boolean;
  };
}

/**
 * Get CSS-based minimum viewport dimension (not device pixels)
 */
function getCSSMinDimension(): number {
  if (typeof window === "undefined") return 1920;
  
  // Use visualViewport if available (most reliable on mobile Chrome)
  const vv = window.visualViewport;
  if (vv) {
    return Math.min(vv.width, vv.height);
  }
  
  // Fallback to innerWidth/innerHeight (CSS pixels)
  return Math.min(window.innerWidth, window.innerHeight);
}

/**
 * Check if device has touch capability
 */
function hasTouch(): boolean {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

/**
 * Robust mobile detection using multiple signals
 * Uses CSS pixels for sizing - works even with high-DPI screens
 */
export function detectDevice(): DeviceDetectionResult {
  if (typeof window === "undefined") {
    return { 
      isMobile: false, 
      reasons: ["SSR/Node environment"], 
      confidence: "high",
      debug: { cssMin: 1920, dpr: 1, hasTouch: false }
    };
  }

  const reasons: string[] = [];
  let mobileSignals = 0;
  let desktopSignals = 0;

  const deviceHasTouch = hasTouch();
  const cssMin = getCSSMinDimension();
  const dpr = window.devicePixelRatio || 1;

  // ========== HARD RULE: Small viewport + touch = MOBILE (no exceptions) ==========
  // This is the primary detection - catches phones even in "Desktop site" mode
  if (deviceHasTouch && cssMin <= 500) {
    // Definitely a phone (CSS width under 500px with touch)
    mobileSignals += 10; // Overwhelming signal
    reasons.push(`HARD: touch+small viewport (${Math.round(cssMin)}px CSS)`);
  } else if (deviceHasTouch && cssMin <= 900) {
    // Very likely a phone or small tablet
    mobileSignals += 5;
    reasons.push(`touch+mobile viewport (${Math.round(cssMin)}px CSS)`);
  }

  // Signal 1: userAgentData API (Chrome 90+)
  const uaData = (navigator as any).userAgentData;
  if (uaData?.mobile !== undefined) {
    if (uaData.mobile) {
      mobileSignals += 3;
      reasons.push("userAgentData.mobile=true");
    } else {
      desktopSignals += 1; // Lower weight - can be wrong with "Desktop site"
      reasons.push("userAgentData.mobile=false");
    }
  }

  // Signal 2: Touch + medium screen (tablets)
  if (deviceHasTouch && cssMin > 500 && cssMin <= 1100) {
    mobileSignals += 2;
    reasons.push(`touch+tablet viewport (${Math.round(cssMin)}px)`);
  } else if (!deviceHasTouch) {
    desktopSignals += 3;
    reasons.push("no touch capability");
  }

  // Signal 3: User agent keywords
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = ["android", "iphone", "ipad", "ipod", "mobile", "webos", "blackberry", "opera mini"];
  const hasMobileUA = mobileKeywords.some(keyword => userAgent.includes(keyword));
  
  if (hasMobileUA) {
    mobileSignals += 2;
    reasons.push("mobile user agent");
  }

  // Signal 4: iPadOS detection (reports as Macintosh but has touch)
  if (userAgent.includes("macintosh") && navigator.maxTouchPoints > 1) {
    mobileSignals += 3;
    reasons.push("iPadOS detected (Mac UA + touch)");
  }

  // Signal 5: deviceMemory API
  const memory = (navigator as any).deviceMemory;
  if (memory !== undefined) {
    if (memory <= 4) {
      mobileSignals += 1;
      reasons.push(`low memory (${memory}GB)`);
    } else if (memory >= 8) {
      desktopSignals += 1;
      reasons.push(`high memory (${memory}GB)`);
    }
  }

  // Signal 6: High DPR + small viewport is very mobile-like
  if (dpr >= 2 && cssMin <= 500) {
    mobileSignals += 2;
    reasons.push(`high DPR (${dpr}) + small viewport`);
  }

  const isMobile = mobileSignals > desktopSignals;
  const confidence = Math.abs(mobileSignals - desktopSignals) >= 5 ? "high" 
                   : Math.abs(mobileSignals - desktopSignals) >= 2 ? "medium" 
                   : "low";

  return { 
    isMobile, 
    reasons, 
    confidence,
    debug: { cssMin: Math.round(cssMin), dpr, hasTouch: deviceHasTouch }
  };
}

/**
 * Simple boolean check - use detectDevice() for detailed info
 */
export function isMobileDevice(): boolean {
  return detectDevice().isMobile;
}

export function getDeviceMemoryGB(): number {
  const memory = (navigator as any).deviceMemory;
  return memory || 4; // Default to 4GB if not available
}

export function hasEnoughMemory(requiredGB: number = 4): boolean {
  const deviceMemory = getDeviceMemoryGB();
  return deviceMemory >= requiredGB;
}

export async function checkWebGPUCapability(): Promise<{
  supported: boolean;
  adapter: unknown;
  error: string | null;
  maxBufferSize: number;
  hasShaderF16: boolean;
  features: string[];
}> {
  const gpu = (navigator as any).gpu;
  
  if (!gpu) {
    return {
      supported: false,
      adapter: null,
      error: "WebGPU not supported. Please use Chrome 113+ or Edge 113+.",
      maxBufferSize: 0,
      hasShaderF16: false,
      features: [],
    };
  }
  
  try {
    const adapter = await gpu.requestAdapter();
    
    if (!adapter) {
      return {
        supported: false,
        adapter: null,
        error: "WebGPU adapter not available. Your device may not support local AI.",
        maxBufferSize: 0,
        hasShaderF16: false,
        features: [],
      };
    }
    
    const limits = adapter.limits;
    const maxBufferSize = limits?.maxBufferSize || 0;
    
    // Check for shader-f16 support
    const features = Array.from(adapter.features || []) as string[];
    const hasShaderF16 = features.includes("shader-f16");
    
    console.log(`[WebGPU] Features: ${features.join(", ")}`);
    console.log(`[WebGPU] shader-f16 supported: ${hasShaderF16}`);
    
    return {
      supported: true,
      adapter,
      error: null,
      maxBufferSize,
      hasShaderF16,
      features,
    };
  } catch (error) {
    return {
      supported: false,
      adapter: null,
      error: "WebGPU initialization failed. Local AI not available on this device.",
      maxBufferSize: 0,
      hasShaderF16: false,
      features: [],
    };
  }
}

// Model requirements in bytes - Desktop only (mobile not supported)
export const MODEL_REQUIREMENTS = {
  desktop: {
    id: "Phi-3.5-mini-instruct-q4f16_1-MLC",
    displayName: "Phi-3.5 Mini",
    sizeGB: 1.8,
    sizeBytes: 1.8 * 1024 * 1024 * 1024,
    minBufferSize: 2 * 1024 * 1024 * 1024, // 2GB buffer needed
    minRAMGB: 4,
    requiresShaderF16: true,
  },
} as const;

/**
 * Check if offline AI is supported on current device
 * Returns false for mobile devices - offline AI is desktop only
 */
export function isOfflineAISupported(): boolean {
  return !isMobileDevice();
}

export type ModelConfig = typeof MODEL_REQUIREMENTS.desktop;

export type ModelPreference = "auto" | "lite" | "full";

const MODEL_PREF_KEY = "vertexai-model-preference";

/**
 * Get stored model preference
 */
export function getModelPreference(): ModelPreference {
  if (typeof localStorage === "undefined") return "auto";
  const stored = localStorage.getItem(MODEL_PREF_KEY);
  if (stored === "lite" || stored === "full") return stored;
  return "auto";
}

/**
 * Set model preference
 */
export function setModelPreference(pref: ModelPreference): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(MODEL_PREF_KEY, pref);
}

/**
 * HARD safety check using CSS viewport - blocks desktop model on small touch screens
 * This check runs independently of detection algorithm
 */
export function isHardBlockedForDesktopModel(): { blocked: boolean; reason: string } {
  if (typeof window === "undefined") {
    return { blocked: false, reason: "" };
  }
  
  const deviceHasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  const vv = window.visualViewport;
  const cssMin = vv 
    ? Math.min(vv.width, vv.height)
    : Math.min(window.innerWidth, window.innerHeight);
  
  // Hard block: touch screen + small CSS viewport = phone
  if (deviceHasTouch && cssMin <= 900) {
    return { 
      blocked: true, 
      reason: `Desktop model blocked: touch screen + ${Math.round(cssMin)}px viewport (mobile device)`
    };
  }
  
  return { blocked: false, reason: "" };
}

/**
 * Get appropriate model based on device
 * Returns null for mobile devices (offline AI not supported)
 */
export function getModelForDevice(preference?: ModelPreference): ModelConfig | null {
  const detection = detectDevice();
  
  // Mobile devices don't support offline AI
  if (detection.isMobile) {
    console.log("[DeviceDetection] Mobile device - offline AI not supported");
    return null;
  }
  
  // Desktop always gets the full model
  return MODEL_REQUIREMENTS.desktop;
}

/**
 * Check if a model is safe for current device
 * Returns error message if unsafe, null if safe
 */
export function isModelSafeForDevice(modelId: string): string | null {
  const detection = detectDevice();
  
  // Mobile devices can't run any local AI models
  if (detection.isMobile) {
    return "Offline AI is only available on desktop/laptop computers.";
  }
  
  return null;
}
