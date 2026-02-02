import { useState, useRef, useEffect } from "react";
import { ImagePlus, X, Mic, Square, Loader2, Video, Sparkles, Send } from "lucide-react";
import sendButtonIcon from "@/assets/send-button.png";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageImage, MessageVideo } from "@/types/chat";
import { toast } from "@/hooks/use-toast";

interface ChatInputProps {
  onSend: (message: string, images?: MessageImage[], videos?: MessageVideo[]) => void;
  isLoading: boolean;
  isStreaming?: boolean;
  onStopGeneration?: () => void;
  isImageMode?: boolean;
  onToggleImageMode?: () => void;
  isOfflineUI?: boolean;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB for videos
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];
const TRANSCRIBE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe`;

export function ChatInput({ onSend, isLoading, isStreaming, onStopGeneration, isImageMode, onToggleImageMode, isOfflineUI }: ChatInputProps) {
  const [sendIconError, setSendIconError] = useState(false);
  const [input, setInput] = useState("");
  const [images, setImages] = useState<MessageImage[]>([]);
  const [videos, setVideos] = useState<MessageVideo[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [shouldBounce, setShouldBounce] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [processingFiles, setProcessingFiles] = useState<{ id: string; name: string; type: 'image' | 'video'; progress: number }[]>([]);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  const updateProgress = (id: string, progress: number) => {
    setProcessingFiles(prev => prev.map(p => p.id === id ? { ...p, progress } : p));
  };

  const cancelProcessing = (id: string) => {
    const controller = abortControllersRef.current.get(id);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(id);
    }
    setProcessingFiles(prev => prev.filter(p => p.id !== id));
    toast({
      title: "Upload cancelled",
      description: "File processing was cancelled.",
    });
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const speechRecognitionRef = useRef<any>(null);
  const recordingModeRef = useRef<"browser" | "upload" | null>(null);
  const dictationBaseRef = useRef("");
  const dictationFinalRef = useRef("");
  const wasDisabledRef = useRef(true);

  const isDisabled = (!input.trim() && images.length === 0 && videos.length === 0) || isLoading || isRecording;

  useEffect(() => {
    if (wasDisabledRef.current && !isDisabled) {
      setShouldBounce(true);
      const timeout = setTimeout(() => setShouldBounce(false), 140);
      return () => clearTimeout(timeout);
    }
    wasDisabledRef.current = isDisabled;
  }, [isDisabled]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  }, [input]);

  const handleSubmit = () => {
    if ((!input.trim() && images.length === 0 && videos.length === 0) || isLoading) return;
    onSend(
      input,
      images.length > 0 ? images : undefined,
      videos.length > 0 ? videos : undefined
    );
    setInput("");
    setImages([]);
    setVideos([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Handle paste from clipboard (Ctrl+V / Cmd+V)
  const handlePaste = async (e: React.ClipboardEvent) => {
    const clipboardItems = e.clipboardData?.items;
    if (!clipboardItems) return;

    const imageItems: DataTransferItem[] = [];
    let hasText = false;

    // Separate images and text
    for (const item of Array.from(clipboardItems)) {
      if (item.type.startsWith("image/")) {
        imageItems.push(item);
      } else if (item.type === "text/plain") {
        hasText = true;
      }
    }

    // If images found, handle them (prevent default text paste if we're handling images)
    if (imageItems.length > 0) {
      e.preventDefault();
      
      for (const item of imageItems) {
        const file = item.getAsFile();
        if (!file) continue;

        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
          toast({
            title: "Invalid image type",
            description: "Please paste JPG, PNG, GIF, or WebP images.",
            variant: "destructive",
          });
          continue;
        }

        if (file.size > MAX_IMAGE_SIZE) {
          toast({
            title: "Image too large",
            description: "Pasted images must be under 10MB.",
            variant: "destructive",
          });
          continue;
        }

        const processingId = `paste-${Date.now()}-${Math.random()}`;
        setProcessingFiles(prev => [...prev, { id: processingId, name: file.name || "Pasted image", type: 'image', progress: 0 }]);

        try {
          const base64 = await fileToBase64(file, (progress) => updateProgress(processingId, progress));
          setProcessingFiles(prev => prev.filter(p => p.id !== processingId));
          setImages((prev) => {
            if (prev.length >= 4) {
              toast({
                title: "Maximum images reached",
                description: "You can only attach up to 4 images.",
                variant: "destructive",
              });
              return prev;
            }
            return [...prev, { url: base64, name: file.name || "Pasted image" }];
          });
          
          toast({
            title: "Image pasted",
            description: "Screenshot/image added from clipboard.",
          });
        } catch (err) {
          setProcessingFiles(prev => prev.filter(p => p.id !== processingId));
          console.error("Failed to paste image:", err);
        }
      }
    }
    // Text paste is handled automatically by the textarea
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we're leaving the container entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (isLoading) return;

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    let addedImages = 0;
    let addedVideos = 0;

    for (const file of Array.from(files)) {
      const processingId = `drop-${Date.now()}-${Math.random()}`;
      
      // Handle images
      if (ALLOWED_IMAGE_TYPES.includes(file.type)) {
        if (file.size > MAX_IMAGE_SIZE) {
          toast({
            title: "Image too large",
            description: `${file.name} exceeds 10MB limit.`,
            variant: "destructive",
          });
          continue;
        }

        setProcessingFiles(prev => [...prev, { id: processingId, name: file.name, type: 'image', progress: 0 }]);

        try {
          const base64 = await fileToBase64(file, (progress) => updateProgress(processingId, progress));
          setProcessingFiles(prev => prev.filter(p => p.id !== processingId));
          setImages((prev) => {
            if (prev.length >= 4) {
              if (addedImages === 0) {
                toast({
                  title: "Maximum images reached",
                  description: "You can only attach up to 4 images.",
                  variant: "destructive",
                });
              }
              return prev;
            }
            addedImages++;
            return [...prev, { url: base64, name: file.name }];
          });
        } catch (err) {
          setProcessingFiles(prev => prev.filter(p => p.id !== processingId));
          console.error("Failed to process dropped image:", err);
        }
      }
      // Handle videos
      else if (ALLOWED_VIDEO_TYPES.includes(file.type)) {
        if (file.size > MAX_FILE_SIZE) {
          toast({
            title: "Video too large",
            description: `${file.name} exceeds 20MB limit.`,
            variant: "destructive",
          });
          continue;
        }

        setProcessingFiles(prev => [...prev, { id: processingId, name: file.name, type: 'video', progress: 0 }]);

        try {
          const base64 = await fileToBase64(file, (progress) => updateProgress(processingId, progress));
          setProcessingFiles(prev => prev.filter(p => p.id !== processingId));
          setVideos((prev) => {
            if (prev.length >= 2) {
              if (addedVideos === 0) {
                toast({
                  title: "Maximum videos reached",
                  description: "You can only attach up to 2 videos.",
                  variant: "destructive",
                });
              }
              return prev;
            }
            addedVideos++;
            return [...prev, { url: base64, name: file.name, mimeType: file.type }];
          });
        } catch (err) {
          setProcessingFiles(prev => prev.filter(p => p.id !== processingId));
          console.error("Failed to process dropped video:", err);
        }
      }
      // Unsupported file type
      else {
        toast({
          title: "Unsupported file type",
          description: `${file.name} is not a supported image or video format.`,
          variant: "destructive",
        });
      }
    }

    if (addedImages > 0 || addedVideos > 0) {
      toast({
        title: "Files added",
        description: `Added ${addedImages > 0 ? `${addedImages} image${addedImages > 1 ? 's' : ''}` : ''}${addedImages > 0 && addedVideos > 0 ? ' and ' : ''}${addedVideos > 0 ? `${addedVideos} video${addedVideos > 1 ? 's' : ''}` : ''}.`,
      });
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: MessageImage[] = [];

    for (const file of Array.from(files)) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload JPG, PNG, GIF, or WebP images.",
          variant: "destructive",
        });
        continue;
      }

      if (file.size > MAX_IMAGE_SIZE) {
        toast({
          title: "File too large",
          description: "Images must be under 10MB.",
          variant: "destructive",
        });
        continue;
      }

      try {
        const base64 = await fileToBase64(file);
        newImages.push({
          url: base64,
          name: file.name,
        });
      } catch (err) {
        console.error("Failed to read file:", err);
      }
    }

    if (newImages.length > 0) {
      setImages((prev) => [...prev, ...newImages].slice(0, 4));
    }

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newVideos: MessageVideo[] = [];

    for (const file of Array.from(files)) {
      if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
        toast({
          title: "Invalid video format",
          description: "Please upload MP4, WebM, MOV, or AVI videos.",
          variant: "destructive",
        });
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "Video too large",
          description: "Videos must be under 20MB.",
          variant: "destructive",
        });
        continue;
      }

      try {
        const base64 = await fileToBase64(file);
        newVideos.push({
          url: base64,
          name: file.name,
          mimeType: file.type,
        });
        toast({
          title: "Video uploaded",
          description: `${file.name} ready for analysis.`,
        });
      } catch (err) {
        console.error("Failed to read video:", err);
        toast({
          title: "Upload failed",
          description: "Could not process the video file.",
          variant: "destructive",
        });
      }
    }

    if (newVideos.length > 0) {
      setVideos((prev) => [...prev, ...newVideos].slice(0, 2));
    }

    if (videoInputRef.current) {
      videoInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeVideo = (index: number) => {
    setVideos((prev) => prev.filter((_, i) => i !== index));
  };

  const startRecording = async () => {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognitionCtor) {
      try {
        const recognition = new SpeechRecognitionCtor();
        speechRecognitionRef.current = recognition;
        recordingModeRef.current = "browser";
        dictationBaseRef.current = input;
        dictationFinalRef.current = "";

        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
          let interim = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const t = event.results[i]?.[0]?.transcript ?? "";
            if (event.results[i].isFinal) {
              dictationFinalRef.current += t + " ";
            } else {
              interim += t;
            }
          }

          const base = dictationBaseRef.current.trim();
          const finalText = dictationFinalRef.current.trim();
          const next = [base, finalText, interim.trim()].filter(Boolean).join(" ");
          setInput(next);
        };

        recognition.onerror = (event: any) => {
          console.error("SpeechRecognition error:", event);
          try {
            recognition.stop?.();
          } catch {
            // ignore
          }
          setIsRecording(false);
          recordingModeRef.current = null;
          toast({
            title: "Voice input error",
            description: "Browser dictation failed. Try again or use Chrome.",
            variant: "destructive",
          });
        };

        recognition.onend = () => {
          setIsRecording(false);
          recordingModeRef.current = null;
        };

        recognition.start();
        setIsRecording(true);
        toast({
          title: "Listening",
          description: "Speak now. Click stop when finished.",
        });
        return;
      } catch (error) {
        console.error("Failed to start SpeechRecognition:", error);
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });

      recordingModeRef.current = "upload";
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await transcribeAudio(audioBlob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);

      toast({
        title: "Recording",
        description: "Speak now. Click stop when finished.",
      });
    } catch (error) {
      console.error("Failed to start recording:", error);
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to use voice input.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;

    if (recordingModeRef.current === "browser") {
      try {
        speechRecognitionRef.current?.stop?.();
      } catch {
        // ignore
      }
      setIsRecording(false);
      recordingModeRef.current = null;
      return;
    }

    if (recordingModeRef.current === "upload" && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);

    try {
      const base64 = await blobToBase64(audioBlob);
      const audioData = base64.split(",")[1];

      const response = await fetch(TRANSCRIBE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ audio: audioData }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const msg = errorBody.error || "Transcription failed";
        const err: any = new Error(msg);
        err.status = response.status;
        throw err;
      }

      const result = await response.json();

      if (result.text) {
        setInput((prev) => (prev ? `${prev} ${result.text}` : result.text));
        toast({
          title: "Transcription complete",
          description: "Your speech has been converted to text.",
        });
      }
    } catch (error) {
      console.error("Transcription error:", error);
      const status = (error as any)?.status as number | undefined;
      toast({
        title:
          status === 402
            ? "Voice transcription unavailable"
            : status === 429
            ? "Voice transcription rate-limited"
            : "Transcription failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div 
      className={`border rounded-xl bg-card shadow-sm transition-colors relative ${isDragging ? 'border-primary border-2 bg-primary/5' : 'border-border'}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded-xl z-10 pointer-events-none">
          <p className="text-primary font-medium text-sm">Drop files here</p>
        </div>
      )}
      
      {/* Processing files preview */}
      {processingFiles.length > 0 && (
        <div className="flex gap-2 p-3 pb-0 flex-wrap">
          {processingFiles.map((file) => (
            <div
              key={file.id}
              className={`relative rounded-lg overflow-hidden border border-border bg-secondary flex items-center justify-center ${
                file.type === 'image' ? 'w-14 h-14' : 'w-24 h-16'
              }`}
            >
              {/* Progress ring */}
              <svg className="w-8 h-8" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  className="stroke-muted"
                  strokeWidth="3"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  className={file.type === 'image' ? 'stroke-blue-500' : 'stroke-purple-500'}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${file.progress * 0.88} 88`}
                  transform="rotate(-90 18 18)"
                  style={{ transition: 'stroke-dasharray 0.3s ease-out' }}
                />
                <text
                  x="18"
                  y="18"
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-foreground text-[8px] font-medium"
                >
                  {file.progress}%
                </text>
              </svg>
              <span className="absolute bottom-0.5 left-1 text-[8px] text-muted-foreground truncate max-w-[60%]">
                {file.name}
              </span>
              {/* Cancel button */}
              <button
                onClick={() => cancelProcessing(file.id)}
                className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-destructive/90 hover:bg-destructive flex items-center justify-center transition-colors"
                title="Cancel upload"
              >
                <X className="w-2.5 h-2.5 text-destructive-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* Images preview */}
      {images.length > 0 && (
        <div className="flex gap-2 p-3 pb-0 flex-wrap">
          {images.map((img, index) => {
            // Extract format from base64 data URL or filename
            const formatMatch = img.url.match(/data:image\/(\w+);/) || img.name?.match(/\.(\w+)$/i);
            const format = formatMatch ? formatMatch[1].toUpperCase() : 'IMG';
            const displayFormat = format === 'JPEG' ? 'JPG' : format;
            
            return (
              <div
                key={index}
                className="relative w-14 h-14 rounded-lg overflow-hidden border border-border group"
              >
                <img
                  src={img.url}
                  alt={img.name || "Upload"}
                  className="w-full h-full object-cover"
                />
                {/* Format badge - blue for images */}
                <span className="absolute top-0.5 left-0.5 px-1 py-0.5 text-[8px] font-semibold bg-blue-500/90 text-white rounded">
                  {displayFormat}
                </span>
                <button
                  onClick={() => removeImage(index)}
                  className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-destructive" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Videos preview */}
      {videos.length > 0 && (
        <div className="flex gap-2 p-3 pb-0 flex-wrap">
          {videos.map((vid, index) => {
            // Extract format from mimeType or filename
            const mimeFormat = vid.mimeType?.split('/')[1]?.toUpperCase();
            const nameMatch = vid.name?.match(/\.(\w+)$/i);
            const format = mimeFormat || (nameMatch ? nameMatch[1].toUpperCase() : 'VID');
            const displayFormat = format === 'QUICKTIME' ? 'MOV' : format === 'X-MSVIDEO' ? 'AVI' : format;
            
            return (
              <div
                key={index}
                className="relative w-24 h-16 rounded-lg overflow-hidden border border-border group bg-secondary"
              >
                <video
                  src={vid.url}
                  className="w-full h-full object-cover"
                  muted
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Video className="w-5 h-5 text-muted-foreground" />
                </div>
                {/* Format badge - purple for videos */}
                <span className="absolute top-0.5 left-0.5 px-1 py-0.5 text-[8px] font-semibold bg-purple-500/90 text-white rounded">
                  {displayFormat}
                </span>
                <button
                  onClick={() => removeVideo(index)}
                  className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-destructive" />
                </button>
                <span className="absolute bottom-0.5 left-1 text-[10px] text-muted-foreground truncate max-w-[80px]">
                  {vid.name}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-2 p-3 md:flex-row md:items-end">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          multiple
          className="hidden"
          onChange={handleImageSelect}
        />

        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
          className="hidden"
          onChange={handleVideoSelect}
        />

        {/* Input row - textarea + send button */}
        <div className="flex items-end gap-2 w-full order-first md:order-last md:flex-1">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={
              isRecording
                ? "Listening..."
                : isImageMode
                ? "Describe image..."
                : videos.length > 0
                ? "Ask about video..."
                : "Message VertexAI..."
            }
            className="flex-1 min-h-[40px] max-h-[200px] resize-none bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground scrollbar-thin text-sm"
            disabled={isLoading || isRecording}
            rows={1}
          />

          {isStreaming ? (
            <button
              onClick={onStopGeneration}
              className="h-9 w-9 shrink-0 flex items-center justify-center text-destructive hover:text-destructive/80 transition-all hover:opacity-80 active:scale-95"
              title="Stop generating"
            >
              <Square className="w-5 h-5 fill-current" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isDisabled}
              className={`h-9 w-9 shrink-0 flex items-center justify-center disabled:opacity-40 transition-all hover:opacity-80 active:scale-95 ${shouldBounce ? 'animate-subtle-bounce' : ''}`}
            >
              {isOfflineUI || sendIconError ? (
                <Send className="w-6 h-6 text-primary" />
              ) : (
                <img 
                  src={sendButtonIcon} 
                  alt="Send" 
                  className="w-9 h-9 dark:invert" 
                  onError={() => setSendIconError(true)}
                />
              )}
            </button>
          )}
        </div>

        {/* Buttons row - action buttons */}
        <div className="flex items-center gap-1 md:gap-2 order-last md:order-first">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => imageInputRef.current?.click()}
            className="h-8 w-8 md:h-9 md:w-9 text-muted-foreground hover:text-foreground shrink-0"
            disabled={isLoading || images.length >= 4}
            title="Upload images"
          >
            <ImagePlus className="w-4 h-4 md:w-5 md:h-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => videoInputRef.current?.click()}
            className="h-8 w-8 md:h-9 md:w-9 text-muted-foreground hover:text-foreground shrink-0"
            disabled={isLoading || videos.length >= 2}
            title="Upload video for analysis"
          >
            <Video className="w-4 h-4 md:w-5 md:h-5" />
          </Button>

          {/* Image Generation Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleImageMode}
            className={`h-8 w-8 md:h-9 md:w-9 shrink-0 transition-all rounded-full ${
              isImageMode 
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 shadow-md shadow-blue-500/20' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
            disabled={isLoading}
            title={isImageMode ? "Image generation ON" : "Generate image"}
          >
            <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
          </Button>

          {isRecording ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={stopRecording}
              className="h-8 w-8 md:h-9 md:w-9 text-destructive hover:text-destructive/80 shrink-0"
            >
              <Square className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </Button>
          ) : isTranscribing ? (
            <Button
              variant="ghost"
              size="icon"
              disabled
              className="h-8 w-8 md:h-9 md:w-9 text-muted-foreground shrink-0"
            >
              <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={startRecording}
              className="h-8 w-8 md:h-9 md:w-9 text-muted-foreground hover:text-foreground shrink-0"
              disabled={isLoading}
            >
              <Mic className="w-4 h-4 md:w-5 md:h-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function fileToBase64(file: File, onProgress?: (progress: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}