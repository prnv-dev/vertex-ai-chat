import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SplashScreen } from "@/components/SplashScreen";
import { OfflineModeProvider } from "@/contexts/OfflineModeContext";
import { LocalLLMProvider } from "@/contexts/LocalLLMContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";import FreeAiTools from "./pages/seo/free-ai-tools";
import AiChat from "./pages/seo/ai-chat";
import AiChatFree from "./pages/seo/ai-chat-free";
import AiCodingAssistant from "./pages/seo/ai-coding-assistant";
import BuildAiProjects from "./pages/seo/build-ai-projects";
import VideoToCodeAi from "./pages/seo/video-to-code-ai";
import AiForStudents from "./pages/seo/ai-for-students";
import AiForDevelopers from "./pages/seo/ai-for-developers";
import AiToolsOnline from "./pages/seo/ai-tools-online";
import SeoDynamicPage from "./pages/seo/SeoDynamicPage";

import { toast } from "sonner";

const queryClient = new QueryClient();

// App version for cache busting
const APP_VERSION = "2.0.13";

// Force cache clear on version mismatch - runs BEFORE React renders
if (typeof window !== 'undefined') {
  const storedVersion = localStorage.getItem("vertexai-app-version");
  if (storedVersion && storedVersion !== APP_VERSION) {
    console.log(`[CacheBust] Version mismatch: ${storedVersion} -> ${APP_VERSION}`);
    
    // Clear everything immediately
    localStorage.clear();
    sessionStorage.clear();
    
    // Set new version
    localStorage.setItem("vertexai-app-version", APP_VERSION);
    
    // Clear IndexedDB (web-llm model cache)
    if (window.indexedDB && typeof indexedDB.databases === 'function') {
      indexedDB.databases().then(dbs => {
        dbs.forEach(db => {
          if (db.name) {
            console.log(`[CacheBust] Deleting IndexedDB: ${db.name}`);
            indexedDB.deleteDatabase(db.name);
          }
        });
      }).catch(() => {});
    }
    
    // Force reload
    console.log('[CacheBust] Reloading page...');
    window.location.reload();
  } else if (!storedVersion) {
    localStorage.setItem("vertexai-app-version", APP_VERSION);
  }
}

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  // Check for app updates and force refresh if needed
  useEffect(() => {
    const storedVersion = localStorage.getItem("vertexai-app-version");
    
    if (storedVersion !== APP_VERSION) {
      console.log(`[App] Version change detected: ${storedVersion} -> ${APP_VERSION}`);
      
      // Unregister ALL service workers first
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(registration => {
            registration.unregister();
            console.log('[App] Unregistered service worker');
          });
        });
      }
      
      // Clear ALL caches aggressively
      if ('caches' in window) {
        caches.keys().then(names => {
          Promise.all(names.map(name => {
            console.log(`[App] Clearing cache: ${name}`);
            return caches.delete(name);
          })).then(() => {
            console.log('[App] All caches cleared, reloading...');
            localStorage.setItem("vertexai-app-version", APP_VERSION);
            // Force reload to get fresh code
            if (storedVersion) {
              window.location.reload();
            }
          });
        });
      } else {
        localStorage.setItem("vertexai-app-version", APP_VERSION);
      }
      
      // Show update notice if not reloading
      if (storedVersion) {
        toast.success("App updated!", {
          description: "You're now using the latest version.",
          duration: 3000,
        });
      }
    }

    // Listen for service worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[App] Service worker updated, reloading...');
        window.location.reload();
      });
    }
  }, []);

  return (
    <HelmetProvider>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <QueryClientProvider client={queryClient}>
          <LocalLLMProvider>
            <OfflineModeProvider>
              <TooltipProvider>
                {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
                <Toaster />
                <Sonner />
                <BrowserRouter>
  <Routes>
    {/* Main App */}
    <Route path="/" element={<Index />} />

    {/* SEO Pages */}
    <Route path="/free-ai-tools" element={<FreeAiTools />} />
    <Route path="/ai-chat" element={<AiChat />} />
    <Route path="/ai-chat-free" element={<AiChatFree />} />
    <Route path="/ai-coding-assistant" element={<AiCodingAssistant />} />
    <Route path="/build-ai-projects" element={<BuildAiProjects />} />
    <Route path="/video-to-code-ai" element={<VideoToCodeAi />} />
    <Route path="/ai-for-students" element={<AiForStudents />} />
    <Route path="/ai-for-developers" element={<AiForDevelopers />} />
    <Route path="/ai-tools-online" element={<AiToolsOnline />} />
    <Route path="/:slug" element={<SeoDynamicPage />} />


    {/* Fallback */}
    <Route path="*" element={<NotFound />} />
  </Routes>
</BrowserRouter>
              </TooltipProvider>
            </OfflineModeProvider>
          </LocalLLMProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
};

export default App;
