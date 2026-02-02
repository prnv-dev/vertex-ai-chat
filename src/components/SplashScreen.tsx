import { useEffect, useState } from "react";

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState<"enter" | "visible" | "exit">("enter");

  useEffect(() => {
    // Phase 1: Enter animation (immediate)
    const enterTimer = setTimeout(() => setPhase("visible"), 100);
    // Phase 2: Start exit after 1.8s
    const exitTimer = setTimeout(() => setPhase("exit"), 1800);
    // Phase 3: Complete and unmount after exit animation
    const completeTimer = setTimeout(() => onComplete(), 2300);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 w-screen h-screen flex flex-col items-center justify-center transition-all duration-500 ease-out ${
        phase === "exit" ? "opacity-0 scale-105" : "opacity-100 scale-100"
      }`}
      style={{
        zIndex: 99999,
        background: "linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)",
      }}
    >
      {/* Animated background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute w-[500px] h-[500px] rounded-full blur-[120px] animate-pulse"
          style={{
            top: "20%",
            left: "30%",
            background: "radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)",
          }}
        />
        <div 
          className="absolute w-[600px] h-[600px] rounded-full blur-[140px] animate-pulse"
          style={{
            bottom: "10%",
            right: "20%",
            background: "radial-gradient(circle, rgba(6, 182, 212, 0.1) 0%, transparent 70%)",
            animationDelay: "500ms",
          }}
        />

        {/* Floating particles */}
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-[floatUp_6s_ease-in-out_infinite]"
            style={{
              width: `${Math.random() * 4 + 2}px`,
              height: `${Math.random() * 4 + 2}px`,
              left: `${8 + i * 8}%`,
              bottom: `-${Math.random() * 20}%`,
              background: i % 2 === 0 
                ? "rgba(59, 130, 246, 0.5)" 
                : "rgba(6, 182, 212, 0.5)",
              animationDelay: `${i * 0.5}s`,
              boxShadow: i % 2 === 0
                ? "0 0 6px rgba(59, 130, 246, 0.4)"
                : "0 0 6px rgba(6, 182, 212, 0.4)",
            }}
          />
        ))}
      </div>

      {/* Centered content container */}
      <div className="relative flex flex-col items-center justify-center">
        {/* Logo with glow */}
        <div 
          className={`relative transition-all duration-700 ease-out ${
            phase === "enter" ? "opacity-0 scale-75" : "opacity-100 scale-100"
          }`}
          style={{ transitionDelay: "100ms" }}
        >
          {/* Outer glow ring */}
          <div 
            className="absolute inset-0 -m-6 rounded-3xl blur-2xl animate-pulse"
            style={{
              background: "linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(6, 182, 212, 0.3), rgba(59, 130, 246, 0.3))",
            }}
          />
          
          {/* Logo SVG */}
          <svg
            viewBox="0 0 100 100"
            className="w-28 h-28 md:w-36 md:h-36 relative"
          >
            <defs>
              <linearGradient id="splashBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: "#0f172a" }} />
                <stop offset="50%" style={{ stopColor: "#1e3a5f" }} />
                <stop offset="100%" style={{ stopColor: "#0f172a" }} />
              </linearGradient>

              <linearGradient id="splashVGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: "#3b82f6" }} />
                <stop offset="50%" style={{ stopColor: "#06b6d4" }} />
                <stop offset="100%" style={{ stopColor: "#3b82f6" }} />
              </linearGradient>

              <radialGradient id="splashNodeGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" style={{ stopColor: "#06b6d4", stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: "#3b82f6", stopOpacity: 0.8 }} />
              </radialGradient>

              <filter id="splashGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Rounded square background */}
            <rect width="100" height="100" rx="22" fill="url(#splashBgGrad)" />

            {/* Neural network connection lines */}
            <g stroke="#3b82f6" strokeWidth="1" opacity="0.4">
              <line x1="32" y1="28" x2="50" y2="72" />
              <line x1="68" y1="28" x2="50" y2="72" />
              <line x1="38" y1="42" x2="62" y2="42" />
              <line x1="42" y1="54" x2="58" y2="54" />
            </g>

            {/* Main V shape */}
            <path
              d="M 24 22 L 50 78"
              stroke="url(#splashVGrad)"
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 76 22 L 50 78"
              stroke="url(#splashVGrad)"
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
            />

            {/* Vertex nodes with glow */}
            <g filter="url(#splashGlow)">
              <circle cx="24" cy="22" r="5" fill="url(#splashNodeGlow)" />
              <circle cx="76" cy="22" r="5" fill="url(#splashNodeGlow)" />
              <circle cx="50" cy="78" r="6" fill="url(#splashNodeGlow)" />
              <circle cx="36" cy="40" r="3" fill="#3b82f6" opacity="0.7" />
              <circle cx="64" cy="40" r="3" fill="#3b82f6" opacity="0.7" />
              <circle cx="43" cy="55" r="2.5" fill="#06b6d4" opacity="0.6" />
              <circle cx="57" cy="55" r="2.5" fill="#06b6d4" opacity="0.6" />
            </g>
          </svg>
        </div>

        {/* Brand text - staggered animation */}
        <div 
          className={`mt-8 flex flex-col items-center transition-all duration-700 ease-out ${
            phase === "enter" ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
          }`}
          style={{ transitionDelay: "250ms" }}
        >
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-white">
            Vertex<span className="text-cyan-400">AI</span>
          </h1>
          <p className="mt-2 text-sm md:text-base text-slate-400 tracking-wide">
            Intelligent Assistant
          </p>
        </div>

        {/* Loading dots - staggered animation */}
        <div 
          className={`mt-12 flex gap-2 transition-all duration-700 ease-out ${
            phase === "enter" ? "opacity-0" : "opacity-100"
          }`}
          style={{ transitionDelay: "400ms" }}
        >
          <div 
            className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" 
            style={{ animationDelay: "0ms" }} 
          />
          <div 
            className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" 
            style={{ animationDelay: "150ms" }} 
          />
          <div 
            className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" 
            style={{ animationDelay: "300ms" }} 
          />
        </div>
      </div>

      {/* Creator credit - bottom positioned */}
      <div 
        className={`absolute bottom-8 md:bottom-12 left-0 right-0 flex flex-col items-center gap-1 transition-all duration-700 ease-out ${
          phase === "enter" ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
        }`}
        style={{ transitionDelay: "550ms" }}
      >
        <p className="text-xs md:text-sm text-slate-500 tracking-wide">
          Created by{" "}
          <span 
            className="text-cyan-400 font-medium animate-[glowPulse_2s_ease-in-out_infinite]"
          >
            Pranav
          </span>
        </p>
        <span className="text-[10px] md:text-xs text-slate-600 tracking-wider">
          v1.5
        </span>
        <span className="text-[9px] md:text-[10px] text-slate-600/70 tracking-widest uppercase mt-1">
          Powered by AI
        </span>
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes glowPulse {
          0%, 100% {
            text-shadow: 0 0 8px rgba(6, 182, 212, 0.6), 0 0 16px rgba(6, 182, 212, 0.3);
          }
          50% {
            text-shadow: 0 0 12px rgba(6, 182, 212, 0.9), 0 0 24px rgba(6, 182, 212, 0.5), 0 0 32px rgba(6, 182, 212, 0.2);
          }
        }
        @keyframes floatUp {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0;
          }
          10% {
            opacity: 0.8;
          }
          90% {
            opacity: 0.6;
          }
          100% {
            transform: translateY(-100vh) scale(0.5);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
