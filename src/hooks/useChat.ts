import { useState, useCallback, useRef } from "react";
import { Message, Chat, MessageImage, MessageVideo, GeneratedImage } from "@/types/chat";
import { toast } from "@/hooks/use-toast";
import { extractVideoFrames, formatTimestamp } from "@/lib/videoFrameExtractor";
import { generateChatTitle } from "@/lib/generateChatTitle";
import { addVertexAIWatermark } from "@/lib/addWatermark";
import { useLocalLLMContext } from "@/contexts/LocalLLMContext";
import { useOfflineMode } from "@/contexts/OfflineModeContext";
const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const STORAGE_KEY = "kadams-gemini-chats";

function generateId(): string {
  return crypto.randomUUID();
}

function loadChats(): Chat[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const chats = JSON.parse(stored);
      return chats.map((chat: Chat) => ({
        ...chat,
        createdAt: new Date(chat.createdAt),
        updatedAt: new Date(chat.updatedAt),
        messages: chat.messages.map((msg: Message) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })),
      }));
    }
  } catch (e) {
    console.error("Failed to load chats:", e);
  }
  return [];
}

function saveChats(chats: Chat[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  } catch (e) {
    console.error("Failed to save chats:", e);
  }
}

// Format message for API - handles text, images, and extracted video frames
function formatMessageForAPI(msg: Message, extractedFrames?: { frames: Array<{ dataUrl: string; timestamp: number }>; videoName: string }): { role: string; content: any } {
  const hasMedia = (msg.images && msg.images.length > 0) || (msg.videos && msg.videos.length > 0) || extractedFrames;
  
  if (hasMedia) {
    const content: any[] = [];
    
    if (msg.content.trim()) {
      content.push({ type: "text", text: msg.content });
    }
    
    if (msg.images) {
      for (const img of msg.images) {
        content.push({
          type: "image_url",
          image_url: { url: img.url },
        });
      }
    }
    
    if (extractedFrames && extractedFrames.frames.length > 0) {
      content.push({
        type: "text",
        text: `[Video: "${extractedFrames.videoName}" - ${extractedFrames.frames.length} key frames extracted at timestamps: ${extractedFrames.frames.map(f => formatTimestamp(f.timestamp)).join(', ')}]`
      });
      
      for (const frame of extractedFrames.frames) {
        content.push({
          type: "image_url",
          image_url: { 
            url: frame.dataUrl,
            detail: "high"
          },
        });
      }
    }
    
    if (!msg.content.trim() && extractedFrames) {
      content.unshift({ 
        type: "text", 
        text: "Please analyze this video. I've extracted key frames for you to examine. Describe the UI, layout, animations, colors, transitions, and provide complete working code to recreate it." 
      });
    }
    
    return { role: msg.role, content };
  }
  
  return { role: msg.role, content: msg.content };
}

export function useChat() {
  const [chats, setChats] = useState<Chat[]>(loadChats);
  const [currentChatId, setCurrentChatId] = useState<string | null>(
    chats.length > 0 ? chats[0].id : null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isImageMode, setIsImageMode] = useState(false);
  const lastDeletedChatRef = useRef<Chat | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeGenerationRef = useRef<"local" | "cloud" | null>(null);
  const localCancelledRef = useRef(false);
  
  // Local LLM integration (shared context instance)
  const localLLM = useLocalLLMContext();
  
  // Offline mode context - single source of truth for shouldUseLocalAI
  const { shouldUseLocalAI } = useOfflineMode();
  const currentChat = chats.find((c) => c.id === currentChatId) || null;
  const messages = currentChat?.messages || [];

  const updateChats = useCallback((updater: (prev: Chat[]) => Chat[]) => {
    setChats((prev) => {
      const updated = updater(prev);
      saveChats(updated);
      return updated;
    });
  }, []);

  const createNewChat = useCallback(() => {
    // Check if current chat is empty - if so, don't create new one
    const existingEmptyChat = chats.find(
      (c) => c.id === currentChatId && c.messages.length === 0
    );
    
    if (existingEmptyChat) {
      // Already on an empty chat, no need to create new one
      return existingEmptyChat.id;
    }
    
    // Also check if there's any empty chat at all, switch to it
    const anyEmptyChat = chats.find((c) => c.messages.length === 0);
    if (anyEmptyChat) {
      setCurrentChatId(anyEmptyChat.id);
      return anyEmptyChat.id;
    }
    
    // No empty chat exists, create new one
    const newChat: Chat = {
      id: generateId(),
      title: "New Chat",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    updateChats((prev) => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    return newChat.id;
  }, [updateChats, chats, currentChatId]);

  const deleteChat = useCallback(
    (chatId: string): Chat | null => {
      const chatToDelete = chats.find((c) => c.id === chatId);
      if (chatToDelete) {
        lastDeletedChatRef.current = chatToDelete;
      }
      updateChats((prev) => prev.filter((c) => c.id !== chatId));
      if (currentChatId === chatId) {
        setCurrentChatId((prev) => {
          const remaining = chats.filter((c) => c.id !== chatId);
          return remaining.length > 0 ? remaining[0].id : null;
        });
      }
      return chatToDelete || null;
    },
    [currentChatId, chats, updateChats]
  );

  const restoreChat = useCallback(
    (chat: Chat) => {
      updateChats((prev) => {
        const newChats = [...prev, chat].sort(
          (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
        );
        return newChats;
      });
      setCurrentChatId(chat.id);
      if (lastDeletedChatRef.current?.id === chat.id) {
        lastDeletedChatRef.current = null;
      }
    },
    [updateChats]
  );

  const undoLastDelete = useCallback(() => {
    const chat = lastDeletedChatRef.current;
    if (chat) {
      restoreChat(chat);
      lastDeletedChatRef.current = null;
      toast({
        title: "Conversation restored",
        description: `"${chat.title}" has been restored.`,
      });
      return true;
    }
    return false;
  }, [restoreChat]);

  const clearCurrentChat = useCallback(() => {
    if (!currentChatId) return;
    updateChats((prev) =>
      prev.map((chat) =>
        chat.id === currentChatId
          ? { ...chat, messages: [], title: "New Chat", updatedAt: new Date() }
          : chat
      )
    );
  }, [currentChatId, updateChats]);

  const renameChat = useCallback(
    (chatId: string, newTitle: string) => {
      if (!newTitle.trim()) return;
      updateChats((prev) =>
        prev.map((chat) =>
          chat.id === chatId
            ? { ...chat, title: newTitle.trim(), updatedAt: new Date() }
            : chat
        )
      );
    },
    [updateChats]
  );

  const togglePinChat = useCallback(
    (chatId: string) => {
      updateChats((prev) =>
        prev.map((chat) =>
          chat.id === chatId
            ? { ...chat, isPinned: !chat.isPinned, updatedAt: new Date() }
            : chat
        ).sort((a, b) => {
          // Pinned chats come first
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          // Then sort by updatedAt
          return b.updatedAt.getTime() - a.updatedAt.getTime();
        })
      );
    },
    [updateChats]
  );

  const toggleImageMode = useCallback(() => {
    setIsImageMode(prev => !prev);
  }, []);

  const stopGeneration = useCallback(() => {
    // Stop cloud generation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    // Stop local generation
    if (activeGenerationRef.current === "local") {
      localCancelledRef.current = true;
      localLLM.interruptGeneration();
    }
    activeGenerationRef.current = null;
    setIsLoading(false);
    setIsStreaming(false);
  }, [localLLM]);

  const sendMessage = useCallback(
    async (content: string, images?: MessageImage[], videos?: MessageVideo[]) => {
      const hasContent = content.trim() || (images && images.length > 0) || (videos && videos.length > 0);
      if (!hasContent || isLoading) return;

      let chatId = currentChatId;
      if (!chatId) {
        chatId = createNewChat();
      }

      const userMessage: Message = {
        id: generateId(),
        role: "user",
        content: content.trim(),
        images,
        videos,
        timestamp: new Date(),
      };

      let chatTitle = "New Chat";
      if (content.trim()) {
        chatTitle = generateChatTitle(content.trim());
      } else if (videos && videos.length > 0) {
        chatTitle = "Video Analysis";
      } else if (images && images.length > 0) {
        chatTitle = "Image Analysis";
      }

      updateChats((prev) =>
        prev.map((chat) => {
          if (chat.id !== chatId) return chat;
          const isFirst = chat.messages.length === 0;
          return {
            ...chat,
            messages: [...chat.messages, userMessage],
            title: isFirst ? chatTitle : chat.title,
            updatedAt: new Date(),
          };
        })
      );

      setIsLoading(true);
      setIsStreaming(true);
      abortControllerRef.current = new AbortController();

      try {
        // shouldUseLocalAI comes from OfflineModeContext - single source of truth
        console.log("[Chat] Mode check:", { 
          shouldUseLocalAI, 
          isOnline: navigator.onLine, 
          isModelLoaded: localLLM.isModelLoaded,
          isModelLoading: localLLM.isModelLoading,
          isImageMode 
        });
        if (shouldUseLocalAI && !isImageMode) {
          // Use local LLM
          console.log("[Chat] Using LOCAL AI mode");
          activeGenerationRef.current = "local";
          localCancelledRef.current = false;
          
          if (!localLLM.isModelLoaded) {
            console.log("[Chat] Local model not loaded, checking loading state...");
            if (!localLLM.isModelLoading) {
              // Dispatch event to trigger download prompt
              window.dispatchEvent(new CustomEvent("showModelDownloadPrompt"));
              toast({
                title: "Local AI Not Ready",
                description: "Click the airplane icon in the header to download the offline AI model (~1.8GB).",
                duration: 6000,
              });
              setIsLoading(false);
              setIsStreaming(false);
              activeGenerationRef.current = null;
              return;
            } else {
              toast({
                title: "Model Loading",
                description: `Downloading... ${localLLM.downloadProgress}% complete`,
              });
              setIsLoading(false);
              setIsStreaming(false);
              activeGenerationRef.current = null;
              return;
            }
          }

          console.log("[Chat] Local model is loaded, preparing messages...");
          
          const localMessages = [...messages, userMessage].map(m => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          }));

          // Create placeholder assistant message for streaming
          const assistantMessageId = generateId();
          const placeholderMessage: Message = {
            id: assistantMessageId,
            role: "assistant",
            content: "",
            timestamp: new Date(),
            isLocalResponse: true,
            isStreaming: true,
          };

          // Add placeholder message immediately
          updateChats((prev) =>
            prev.map((chat) =>
              chat.id === chatId
                ? { ...chat, messages: [...chat.messages, placeholderMessage], updatedAt: new Date() }
                : chat
            )
          );

          console.log("[Chat] Starting local LLM generation with streaming...");
          let streamedContent = "";
          let pendingBuffer = "";
          let rafId: number | null = null;
          let lastFlushTime = 0;
          const FLUSH_INTERVAL = 200; // Larger interval for bigger chunks
          const MIN_CHUNK_SIZE = 50; // Minimum chars before flushing

          // Batched flush function
          const flushBuffer = () => {
            if (pendingBuffer && !localCancelledRef.current) {
              streamedContent += pendingBuffer;
              pendingBuffer = "";
              updateChats((prev) =>
                prev.map((chat) => {
                  if (chat.id !== chatId) return chat;
                  return {
                    ...chat,
                    messages: chat.messages.map((msg) =>
                      msg.id === assistantMessageId
                        ? { ...msg, content: streamedContent }
                        : msg
                    ),
                    updatedAt: new Date(),
                  };
                })
              );
            }
            rafId = null;
          };

          try {
            let localResponse = await localLLM.generateResponse(localMessages, (token: string) => {
              // Check if cancelled
              if (localCancelledRef.current) return;
              
              // Accumulate tokens in buffer
              pendingBuffer += token;
              
              // Throttle UI updates - flush when buffer is big enough OR time elapsed
              const now = performance.now();
              const shouldFlush = pendingBuffer.length >= MIN_CHUNK_SIZE || (now - lastFlushTime >= FLUSH_INTERVAL && pendingBuffer.length > 0);
              if (!rafId && shouldFlush) {
                lastFlushTime = now;
                rafId = requestAnimationFrame(flushBuffer);
              }
            });

            // Cancel any pending RAF and flush remaining buffer
            if (rafId) {
              cancelAnimationFrame(rafId);
            }
            
            // Handle cancellation case
            if (localCancelledRef.current) {
              console.log("[Chat] Local generation was cancelled");
              // Keep partial content, just mark streaming done
              updateChats((prev) =>
                prev.map((chat) => {
                  if (chat.id !== chatId) return chat;
                  return {
                    ...chat,
                    messages: chat.messages.map((msg) =>
                      msg.id === assistantMessageId
                        ? { ...msg, content: streamedContent || "(Generation stopped)", isStreaming: false }
                        : msg
                    ),
                    updatedAt: new Date(),
                  };
                })
              );
            } else {
              flushBuffer();
              console.log("[Chat] Local LLM generation complete, response length:", localResponse.length);

              // Retry with simpler prompt if response is empty
              if (!localResponse || !localResponse.trim()) {
                console.warn("[Chat] Empty response, trying fallback with simpler prompt...");
                const simplifiedContent = userMessage.content.slice(0, 150) + (userMessage.content.length > 150 ? "..." : "");
                const fallbackMessages = [
                  { role: "user" as const, content: `Please respond briefly: ${simplifiedContent}` }
                ];
                
                try {
                  const fallbackResponse = await localLLM.generateResponse(fallbackMessages);
                  if (fallbackResponse && fallbackResponse.trim()) {
                    console.log("[Chat] Fallback response successful");
                    localResponse = fallbackResponse;
                  }
                } catch (fallbackErr) {
                  console.warn("[Chat] Fallback also failed:", fallbackErr);
                }
              }

              // Final update with complete response (mark streaming done)
              if (localResponse && localResponse.trim()) {
                updateChats((prev) =>
                  prev.map((chat) => {
                    if (chat.id !== chatId) return chat;
                    return {
                      ...chat,
                      messages: chat.messages.map((msg) =>
                        msg.id === assistantMessageId
                          ? { ...msg, content: localResponse, isStreaming: false }
                          : msg
                      ),
                      updatedAt: new Date(),
                    };
                  })
                );
              } else {
                // Empty response - show helpful error state
                console.warn("[Chat] Local LLM returned empty response even after retry");
                updateChats((prev) =>
                  prev.map((chat) => {
                    if (chat.id !== chatId) return chat;
                    return {
                      ...chat,
                      messages: chat.messages.map((msg) =>
                        msg.id === assistantMessageId
                          ? { ...msg, content: "I couldn't generate a response. The offline AI model is compact and works best with simple English questions. Try rephrasing or use cloud mode when online.", isStreaming: false }
                          : msg
                      ),
                      updatedAt: new Date(),
                    };
                  })
                );
                toast({
                  title: "Limited Offline Response",
                  description: "Try simpler questions in English for better results. Hindi support is limited in offline mode.",
                });
              }
            }
            
            activeGenerationRef.current = null;
          } catch (localError) {
            console.error("[Chat] Local LLM generation failed:", localError);
            activeGenerationRef.current = null;
            
            // Don't show error toast if cancelled
            if (localCancelledRef.current) {
              updateChats((prev) =>
                prev.map((chat) => {
                  if (chat.id !== chatId) return chat;
                  return {
                    ...chat,
                    messages: chat.messages.map((msg) =>
                      msg.id === assistantMessageId
                        ? { ...msg, content: streamedContent || "(Generation stopped)", isStreaming: false }
                        : msg
                    ),
                    updatedAt: new Date(),
                  };
                })
              );
            } else {
              // Update placeholder with error
              updateChats((prev) =>
                prev.map((chat) => {
                  if (chat.id !== chatId) return chat;
                  return {
                    ...chat,
                    messages: chat.messages.map((msg) =>
                      msg.id === assistantMessageId
                        ? { ...msg, content: `(Local AI error: ${localError instanceof Error ? localError.message : "Generation failed"})`, isStreaming: false }
                        : msg
                    ),
                    updatedAt: new Date(),
                  };
                })
              );
              toast({
                title: "Local AI Error",
                description: localError instanceof Error ? localError.message : "Failed to generate response",
                variant: "destructive",
              });
            }
          }
        } else {
          // Use cloud API (existing logic)
          activeGenerationRef.current = "cloud";
          let extractedFramesData: { frames: Array<{ dataUrl: string; timestamp: number }>; videoName: string } | undefined;
          
          if (videos && videos.length > 0) {
            toast({
              title: "Processing video",
              description: "Extracting key frames for analysis...",
            });
            
            try {
              const frames = await extractVideoFrames(videos[0].url, 8);
              extractedFramesData = {
                frames,
                videoName: videos[0].name || "uploaded_video"
              };
              console.log(`Extracted ${frames.length} frames from video`);
            } catch (err) {
              console.error("Frame extraction failed:", err);
              toast({
                title: "Frame extraction issue",
                description: "Could not extract frames. Sending video directly.",
                variant: "destructive",
              });
            }
          }
          
          const allMessages = [...messages, userMessage];
          const chatMessages = allMessages.map((msg, idx) => {
            if (idx === allMessages.length - 1 && extractedFramesData) {
              return formatMessageForAPI(msg, extractedFramesData);
            }
            return formatMessageForAPI(msg);
          });

          const resp = await fetch(CHAT_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ 
              messages: chatMessages,
              imageMode: isImageMode,
            }),
            signal: abortControllerRef.current.signal,
          });

          if (!resp.ok) {
            // Dispatch cloud service error event for rate limits/quota/unavailable
            if (resp.status === 402 || resp.status === 429 || resp.status === 503) {
              const errorType = resp.status === 402 ? "quota" : resp.status === 429 ? "rate_limit" : "unavailable";
              window.dispatchEvent(new CustomEvent("cloudServiceError", { 
                detail: { error: errorType }
              }));
            }
            const errorData = await resp.json().catch(() => ({}));
            throw new Error(errorData.error || `Request failed: ${resp.status}`);
          }
          
          // Clear cloud service error on successful response
          window.dispatchEvent(new CustomEvent("cloudServiceError", { 
            detail: { error: null }
          }));

          const data = await resp.json();
          
          const assistantContent =
            data?.choices?.[0]?.message?.content ??
            data?.choices?.[0]?.text ??
            data?.generatedText ??
            "";

          let generatedImages: GeneratedImage[] | undefined;
          const rawGeneratedImages = data?.choices?.[0]?.message?.generatedImages;
          
          if (rawGeneratedImages && rawGeneratedImages.length > 0) {
            generatedImages = await Promise.all(
              rawGeneratedImages.map(async (img: GeneratedImage) => ({
                ...img,
                url: await addVertexAIWatermark(img.url)
              }))
            );
          }

          if (!assistantContent && !generatedImages) {
            throw new Error("Empty response from AI service");
          }

          const assistantMessage: Message = {
            id: generateId(),
            role: "assistant",
            content: generatedImages ? "" : assistantContent,
            generatedImages: generatedImages,
            timestamp: new Date(),
            isLocalResponse: false,
          };

          if (isImageMode && !generatedImages) {
            toast({
              title: "Image generate nahi hui",
              description: "Prompt ko rephrase karo ya different description try karo.",
              variant: "destructive",
            });
          }

          updateChats((prev) =>
            prev.map((chat) =>
              chat.id === chatId
                ? { ...chat, messages: [...chat.messages, assistantMessage], updatedAt: new Date() }
                : chat
            )
          );
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.log("Generation stopped by user");
        } else {
          console.error("Chat error:", error);
          toast({
            title: "Error",
            description: error instanceof Error ? error.message : "Failed to send message",
            variant: "destructive",
          });
        }
      } finally {
        setIsLoading(false);
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [currentChatId, messages, isLoading, isImageMode, createNewChat, updateChats, localLLM, shouldUseLocalAI]
  );

  const regenerateLastResponse = useCallback(async () => {
    if (isLoading || messages.length === 0 || !currentChatId) return;

    let lastUserMessageIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        lastUserMessageIndex = i;
        break;
      }
    }

    if (lastUserMessageIndex === -1) return;

    const messagesForRegeneration = messages.slice(0, lastUserMessageIndex + 1);

    updateChats((prev) =>
      prev.map((chat) => {
        if (chat.id !== currentChatId) return chat;
        return {
          ...chat,
          messages: messagesForRegeneration,
          updatedAt: new Date(),
        };
      })
    );

    setIsLoading(true);
    setIsStreaming(true);
    setIsRegenerating(true);
    abortControllerRef.current = new AbortController();

    try {
      // Check if should use local AI
      if (shouldUseLocalAI) {
        console.log("[Chat] Regenerating with LOCAL AI");
        activeGenerationRef.current = "local";
        localCancelledRef.current = false;

        if (!localLLM.isModelLoaded) {
          if (!localLLM.isModelLoading) {
            window.dispatchEvent(new CustomEvent("showModelDownloadPrompt"));
            toast({
              title: "Local AI Not Ready",
              description: "Click the airplane icon to download the offline AI model.",
              duration: 6000,
            });
            setIsLoading(false);
            setIsStreaming(false);
            setIsRegenerating(false);
            activeGenerationRef.current = null;
            return;
          }
          toast({
            title: "Model Loading",
            description: `Downloading... ${localLLM.downloadProgress}% complete`,
          });
          setIsLoading(false);
          setIsStreaming(false);
          setIsRegenerating(false);
          activeGenerationRef.current = null;
          return;
        }

        const localMessages = messagesForRegeneration.map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

        // Add regeneration instruction
        localMessages.push({
          role: "user" as const,
          content: "[SYSTEM: Generate a completely fresh, alternative response. Use different wording, structure, or approach.]",
        });

        const assistantMessageId = generateId();
        const placeholderMessage: Message = {
          id: assistantMessageId,
          role: "assistant",
          content: "",
          timestamp: new Date(),
          isLocalResponse: true,
          isStreaming: true,
        };

        updateChats((prev) =>
          prev.map((chat) =>
            chat.id === currentChatId
              ? { ...chat, messages: [...chat.messages, placeholderMessage], updatedAt: new Date() }
              : chat
          )
        );

        let streamedContent = "";
        const localResponse = await localLLM.generateResponse(localMessages, (token: string) => {
          if (localCancelledRef.current) return;
          streamedContent += token;
          updateChats((prev) =>
            prev.map((chat) => {
              if (chat.id !== currentChatId) return chat;
              return {
                ...chat,
                messages: chat.messages.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: streamedContent }
                    : msg
                ),
                updatedAt: new Date(),
              };
            })
          );
        });

        updateChats((prev) =>
          prev.map((chat) => {
            if (chat.id !== currentChatId) return chat;
            return {
              ...chat,
              messages: chat.messages.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: localResponse || streamedContent, isStreaming: false }
                  : msg
              ),
              updatedAt: new Date(),
            };
          })
        );
        activeGenerationRef.current = null;
      } else {
        // Use cloud API
        activeGenerationRef.current = "cloud";
        const chatMessages = messagesForRegeneration.map((msg) => formatMessageForAPI(msg));
        
        const regenerationInstruction = {
          role: "system",
          content: "REGENERATION REQUEST: Generate a completely fresh, alternative response to the user's last query. Use different wording, structure, examples, or approach than before. For code responses, vary variable names, formatting, or implementation details while keeping the same functionality."
        };

        const resp = await fetch(CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            messages: [...chatMessages, regenerationInstruction]
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!resp.ok) {
          const errorData = await resp.json().catch(() => ({}));
          throw new Error(errorData.error || `Request failed: ${resp.status}`);
        }

        const data = await resp.json();

        const assistantContent =
          data?.choices?.[0]?.message?.content ??
          data?.choices?.[0]?.text ??
          data?.generatedText ??
          "";

        if (!assistantContent) {
          throw new Error("Empty response from AI service");
        }

        const assistantMessage: Message = {
          id: generateId(),
          role: "assistant",
          content: assistantContent,
          timestamp: new Date(),
        };

        updateChats((prev) =>
          prev.map((chat) =>
            chat.id === currentChatId
              ? { ...chat, messages: [...chat.messages, assistantMessage], updatedAt: new Date() }
              : chat
          )
        );
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log("Regeneration stopped by user");
      } else {
        console.error("Regeneration error:", error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to regenerate response",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      setIsRegenerating(false);
      abortControllerRef.current = null;
    }
  }, [currentChatId, messages, isLoading, updateChats, shouldUseLocalAI, localLLM]);

  const editMessage = useCallback(
    async (messageId: string, newContent: string) => {
      if (isLoading || !currentChatId) return;

      const messageIndex = messages.findIndex((m) => m.id === messageId);
      if (messageIndex === -1 || messages[messageIndex].role !== "user") return;

      const updatedMessages = messages.slice(0, messageIndex + 1).map((msg, idx) =>
        idx === messageIndex ? { ...msg, content: newContent, timestamp: new Date() } : msg
      );

      updateChats((prev) =>
        prev.map((chat) =>
          chat.id === currentChatId
            ? { ...chat, messages: updatedMessages, updatedAt: new Date() }
            : chat
        )
      );

      setIsLoading(true);
      setIsStreaming(true);
      abortControllerRef.current = new AbortController();

      try {
        // Check if should use local AI
        if (shouldUseLocalAI) {
          console.log("[Chat] Editing with LOCAL AI");
          activeGenerationRef.current = "local";
          localCancelledRef.current = false;

          if (!localLLM.isModelLoaded) {
            if (!localLLM.isModelLoading) {
              window.dispatchEvent(new CustomEvent("showModelDownloadPrompt"));
              toast({
                title: "Local AI Not Ready",
                description: "Click the airplane icon to download the offline AI model.",
                duration: 6000,
              });
              setIsLoading(false);
              setIsStreaming(false);
              activeGenerationRef.current = null;
              return;
            }
            toast({
              title: "Model Loading",
              description: `Downloading... ${localLLM.downloadProgress}% complete`,
            });
            setIsLoading(false);
            setIsStreaming(false);
            activeGenerationRef.current = null;
            return;
          }

          const localMessages = updatedMessages.map(m => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          }));

          const assistantMessageId = generateId();
          const placeholderMessage: Message = {
            id: assistantMessageId,
            role: "assistant",
            content: "",
            timestamp: new Date(),
            isLocalResponse: true,
            isStreaming: true,
          };

          updateChats((prev) =>
            prev.map((chat) =>
              chat.id === currentChatId
                ? { ...chat, messages: [...updatedMessages, placeholderMessage], updatedAt: new Date() }
                : chat
            )
          );

          let streamedContent = "";
          const localResponse = await localLLM.generateResponse(localMessages, (token: string) => {
            if (localCancelledRef.current) return;
            streamedContent += token;
            updateChats((prev) =>
              prev.map((chat) => {
                if (chat.id !== currentChatId) return chat;
                return {
                  ...chat,
                  messages: chat.messages.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: streamedContent }
                      : msg
                  ),
                  updatedAt: new Date(),
                };
              })
            );
          });

          updateChats((prev) =>
            prev.map((chat) => {
              if (chat.id !== currentChatId) return chat;
              return {
                ...chat,
                messages: chat.messages.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: localResponse || streamedContent, isStreaming: false }
                    : msg
                ),
                updatedAt: new Date(),
              };
            })
          );
          activeGenerationRef.current = null;
        } else {
          // Use cloud API
          activeGenerationRef.current = "cloud";
          const chatMessages = updatedMessages.map((msg) => formatMessageForAPI(msg));

          const resp = await fetch(CHAT_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ messages: chatMessages }),
            signal: abortControllerRef.current.signal,
          });

          if (!resp.ok) {
            const errorData = await resp.json().catch(() => ({}));
            throw new Error(errorData.error || `Request failed: ${resp.status}`);
          }

          const data = await resp.json();

          const assistantContent =
            data?.choices?.[0]?.message?.content ??
            data?.choices?.[0]?.text ??
            data?.generatedText ??
            "";

          if (!assistantContent) {
            throw new Error("Empty response from AI service");
          }

          const assistantMessage: Message = {
            id: generateId(),
            role: "assistant",
            content: assistantContent,
            timestamp: new Date(),
          };

          updateChats((prev) =>
            prev.map((chat) =>
              chat.id === currentChatId
                ? { ...chat, messages: [...updatedMessages, assistantMessage], updatedAt: new Date() }
                : chat
            )
          );
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          console.log("Edit regeneration stopped by user");
        } else {
          console.error("Edit error:", error);
          toast({
            title: "Error",
            description: error instanceof Error ? error.message : "Failed to regenerate after edit",
            variant: "destructive",
          });
        }
      } finally {
        setIsLoading(false);
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [currentChatId, messages, isLoading, updateChats, shouldUseLocalAI, localLLM]
  );

  return {
    chats,
    currentChatId,
    currentChat,
    messages,
    isLoading,
    isStreaming,
    isRegenerating,
    isImageMode,
    setCurrentChatId,
    createNewChat,
    deleteChat,
    restoreChat,
    undoLastDelete,
    clearCurrentChat,
    renameChat,
    togglePinChat,
    toggleImageMode,
    sendMessage,
    stopGeneration,
    regenerateLastResponse,
    editMessage,
  };
}
