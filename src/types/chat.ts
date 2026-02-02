export interface MessageImage {
  url: string; // base64 data URL
  name?: string;
}

export interface MessageVideo {
  url: string; // base64 data URL
  name?: string;
  mimeType: string;
}

export interface GeneratedImage {
  url: string;
  prompt: string;
  modelUsed?: string;
  modelId?: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  images?: MessageImage[];
  videos?: MessageVideo[];
  generatedImages?: GeneratedImage[];
  timestamp: Date;
  isLocalResponse?: boolean; // Added for offline mode indicator
  isStreaming?: boolean; // For lightweight render during streaming
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  isPinned?: boolean;
}
