import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { toast } from "sonner";
import App from "./App.tsx";
import "./index.css";

// Register service worker for PWA
const updateSW = registerSW({
  onNeedRefresh() {
    // Show update available notification
    if (confirm("New version available! Reload to update?")) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    toast.success("Offline ready!", {
      description: "You can now use VertexAI without internet.",
      duration: 5000,
    });
  },
});

createRoot(document.getElementById("root")!).render(<App />);
