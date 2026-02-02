import { VertexAIIcon } from "@/components/VertexAIIcon";
import { Code, Lightbulb, MessageCircle, Sparkles, Zap, Plane } from "lucide-react";
import { useState, useEffect } from "react";
import { CloudServiceWarning } from "./CloudServiceWarning";
interface WelcomeScreenProps {
  onSuggestionClick: (text: string) => void;
}

// Desktop suggestions (2x2 grid on desktop)
const desktopSuggestions = [{
  icon: Sparkles,
  greeting: "🎥 UI Video → Code",
  description: "Upload a UI video and get clean, production-ready code.",
  prompt: "I have a UI video I'd like to convert into code. Can you help me generate the layout and components?"
}, {
  icon: Code,
  greeting: "🎨 Design → Code",
  description: "Turn designs or screenshots into pixel-perfect code.",
  prompt: "I have a design I'd like to convert into production-ready code."
}, {
  icon: Lightbulb,
  greeting: "🧠 Debug Code",
  description: "Paste errors or code and get precise fixes.",
  prompt: "I have some code with errors that I need help debugging."
}, {
  icon: MessageCircle,
  greeting: "🏗 Build Systems",
  description: "Generate full projects or complex logic.",
  prompt: "I want to build a complete system from scratch. Can you help me plan and generate the full project?"
}];

// Mobile suggestions (3 cards optimized for mobile use)
const mobileSuggestions = [{
  icon: MessageCircle,
  greeting: "Hey! What's up?",
  description: "Just say hi, I'm here to chat",
  prompt: "Hey, how are you?"
}, {
  icon: Lightbulb,
  greeting: "Got an idea? Let's build it",
  description: "From concept to reality",
  prompt: "I have an app idea I want to discuss"
}, {
  icon: Zap,
  greeting: "Quick question? ⚡",
  description: "Get fast answers on the go",
  prompt: "Give me a quick tip for staying productive today"
}];
const greetingText = "Hey! I'm VertexAI 👋";
export function WelcomeScreen({
  onSuggestionClick
}: WelcomeScreenProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  useEffect(() => {
    let currentIndex = 0;
    const typingInterval = setInterval(() => {
      if (currentIndex < greetingText.length) {
        setDisplayedText(greetingText.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
        setIsTypingComplete(true);
        setTimeout(() => setShowCursor(false), 1000);
      }
    }, 80);
    return () => clearInterval(typingInterval);
  }, []);
  const suggestions = isMobile ? mobileSuggestions : desktopSuggestions;
  return <div className={`flex flex-col items-center px-4 animate-fade-in ${isMobile ? 'justify-center flex-1' : 'justify-center py-12 flex-1'}`}>
      <VertexAIIcon size={isMobile ? "md" : "lg"} className={isMobile ? "mb-3" : "mb-5"} />

      <h2 className={`font-semibold text-foreground mb-1 flex items-center ${isMobile ? 'text-xl' : 'text-2xl h-8'}`}>
        <span>{displayedText}</span>
        {showCursor && <span className={`ml-0.5 w-0.5 bg-primary inline-block ${isMobile ? 'h-5' : 'h-6'} ${isTypingComplete ? 'animate-pulse' : ''}`} style={{
        animation: isTypingComplete ? undefined : 'none'
      }} />}
      </h2>

      <p className={`text-muted-foreground text-center max-w-md transition-opacity duration-500 ${isMobile ? 'text-sm px-4' : 'text-sm'} ${isTypingComplete ? 'opacity-100' : 'opacity-0'}`}>
        Your friendly AI assistant. Ask me anything — coding, ideas, debugging, or just chat.
      </p>

      {/* Cloud Service Warning - desktop only */}
      {!isMobile && isTypingComplete && <CloudServiceWarning />}

      {/* Offline mode hint - desktop only */}
      {!isMobile && (
        <div className={`flex items-center gap-2.5 mt-3 px-4 py-2.5 rounded-full bg-gradient-to-r from-primary/10 to-secondary/50 border border-primary/20 shadow-sm transition-opacity duration-500 ${isTypingComplete ? 'opacity-100' : 'opacity-0'}`}>
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
            <Plane className="w-3 h-3 text-primary shrink-0" />
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="text-foreground font-medium">Go Offline-Ready</span> — Perfect for travel or backup • Runs locally on device
          </p>
        </div>
      )}

      {/* Suggestion cards - desktop only */}
      {!isMobile && <div className={`grid gap-3 w-full max-w-lg transition-all duration-500 grid-cols-1 sm:grid-cols-2 mt-8 ${isTypingComplete ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {desktopSuggestions.map((suggestion, index) => <button key={index} onClick={() => onSuggestionClick(suggestion.prompt)} style={{
        transitionDelay: isTypingComplete ? `${index * 100}ms` : '0ms'
      }} className="group flex items-start gap-3 rounded-xl border border-border/50 hover:border-primary/30 transition-all duration-200 text-left hover:scale-[1.02] p-4 h-[88px] bg-accent">
              <div className="rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors shrink-0 p-2">
                <suggestion.icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm">
                  {suggestion.greeting}
                </p>
                <p className="text-muted-foreground text-xs mt-1 leading-relaxed line-clamp-2">
                  {suggestion.description}
                </p>
              </div>
            </button>)}
        </div>}
    </div>;
}