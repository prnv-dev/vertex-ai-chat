interface VertexAIIconProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "w-6 h-6",
  md: "w-8 h-8",
  lg: "w-12 h-12",
  xl: "w-16 h-16",
};

export function VertexAIIcon({ className = "", size = "md" }: VertexAIIconProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={`${sizeClasses[size]} ${className}`}
    >
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "#0f172a" }} />
          <stop offset="50%" style={{ stopColor: "#1e3a5f" }} />
          <stop offset="100%" style={{ stopColor: "#0f172a" }} />
        </linearGradient>

        <linearGradient id="vGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "#3b82f6" }} />
          <stop offset="50%" style={{ stopColor: "#06b6d4" }} />
          <stop offset="100%" style={{ stopColor: "#3b82f6" }} />
        </linearGradient>

        <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" style={{ stopColor: "#06b6d4", stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: "#3b82f6", stopOpacity: 0.8 }} />
        </radialGradient>

        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Rounded square background */}
      <rect width="100" height="100" rx="22" fill="url(#bgGrad)" />

      {/* Neural network connection lines */}
      <g stroke="#3b82f6" strokeWidth="1" opacity="0.3">
        <line x1="32" y1="28" x2="50" y2="72" />
        <line x1="68" y1="28" x2="50" y2="72" />
        <line x1="38" y1="42" x2="62" y2="42" />
        <line x1="42" y1="54" x2="58" y2="54" />
      </g>

      {/* Main V shape */}
      <path
        d="M 24 22 L 50 78"
        stroke="url(#vGrad)"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 76 22 L 50 78"
        stroke="url(#vGrad)"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />

      {/* Vertex nodes */}
      <g filter="url(#glow)">
        <circle cx="24" cy="22" r="5" fill="url(#nodeGlow)" />
        <circle cx="76" cy="22" r="5" fill="url(#nodeGlow)" />
        <circle cx="50" cy="78" r="6" fill="url(#nodeGlow)" />
        <circle cx="36" cy="40" r="3" fill="#3b82f6" opacity="0.7" />
        <circle cx="64" cy="40" r="3" fill="#3b82f6" opacity="0.7" />
        <circle cx="43" cy="55" r="2.5" fill="#06b6d4" opacity="0.6" />
        <circle cx="57" cy="55" r="2.5" fill="#06b6d4" opacity="0.6" />
      </g>
    </svg>
  );
}
