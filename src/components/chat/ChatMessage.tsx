import { memo, useMemo, useState, useDeferredValue } from "react";
import { Message } from "@/types/chat";
import { Check, Copy, User, Video, RefreshCw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { VertexAIIcon } from "@/components/VertexAIIcon";
import { CodeBlock } from "./CodeBlock";
import { SemanticHighlight } from "./SemanticHighlight";
import { MermaidDiagram } from "./MermaidDiagram";
import { LocalAIBadge } from "./LocalAIBadge";
import { toast } from "@/hooks/use-toast";

interface ChatMessageProps {
  message: Message;
  isLastAssistantMessage?: boolean;
  onRegenerate?: () => void;
  isLoading?: boolean;
}

function extractInlineFilenameCandidates(markdown: string): string[] {
  const out: string[] = [];

  // Prefer backticked file names: `calculator.cpp`
  const backtickRe = /`([^`\n]+\.[a-z0-9]{1,8})`/gi;
  let m: RegExpExecArray | null;
  while ((m = backtickRe.exec(markdown))) {
    out.push(m[1]);
  }

  // Also catch plain filenames (e.g. in compile commands), but keep it conservative
  const plainRe = /\b([a-z0-9_./-]+\.(?:cpp|cc|cxx|c|h|hpp|py|js|ts|tsx|jsx|html|css|json|yml|yaml|sh|bash|sql|md|txt))\b/gi;
  while ((m = plainRe.exec(markdown))) {
    out.push(m[1]);
  }

  // De-dupe while preserving order
  return out.filter((v, i) => out.indexOf(v) === i);
}

function pickFilenameForLanguage(candidates: string[], language: string): string | undefined {
  const lang = language.toLowerCase();
  const preferredExts: Record<string, string[]> = {
    cpp: ["cpp", "cc", "cxx", "hpp", "h"],
    c: ["c", "h"],
    python: ["py"],
    py: ["py"],
    javascript: ["js"],
    js: ["js"],
    typescript: ["ts"],
    ts: ["ts"],
    tsx: ["tsx"],
    jsx: ["jsx"],
    html: ["html"],
    css: ["css"],
    bash: ["sh", "bash"],
    sh: ["sh"],
    shell: ["sh"],
    sql: ["sql"],
    markdown: ["md"],
    md: ["md"],
    json: ["json"],
    yaml: ["yml", "yaml"],
    yml: ["yml"],
  };

  const exts = preferredExts[lang];
  if (!exts) return candidates[0];

  return candidates.find((c) => {
    const ext = c.split(".").pop()?.toLowerCase();
    return !!ext && exts.includes(ext);
  }) || candidates[0];
}

function extractFilenameFromMeta(meta?: string): string | undefined {
  if (!meta) return undefined;

  // filename=calculator.cpp OR file=calculator.cpp
  const keyMatch = meta.match(/\b(?:filename|file)\s*=\s*([^\s]+)/i);
  if (keyMatch?.[1]) return keyMatch[1].trim();

  // If meta is just a filename
  const bareMatch = meta.match(/\b([^\s]+\.[a-z0-9]{1,8})\b/i);
  return bareMatch?.[1]?.trim();
}

export const ChatMessage = memo(function ChatMessage({ 
  message,
  isLastAssistantMessage,
  onRegenerate,
  isLoading 
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [copiedImage, setCopiedImage] = useState<number | null>(null);
  const isUser = message.role === "user";

  // Defer markdown content so incoming tokens don't block the render cycle
  const deferredContent = useDeferredValue(message.content);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadImage = (imageUrl: string, prompt: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `vertexai-${prompt.slice(0, 30).replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
      title: "Image downloaded",
      description: "Your generated image has been saved.",
    });
  };

  const handleCopyImage = async (imageUrl: string, index: number) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      setCopiedImage(index);
      setTimeout(() => setCopiedImage(null), 2000);
      toast({
        title: "Image copied",
        description: "Image copied to clipboard.",
      });
    } catch (err) {
      console.error("Failed to copy image:", err);
      toast({
        title: "Copy failed",
        description: "Could not copy image to clipboard.",
        variant: "destructive",
      });
    }
  };

  const fencedCodeBlockCount = useMemo(() => {
    const ticks = (deferredContent.match(/```/g) || []).length;
    return Math.floor(ticks / 2);
  }, [deferredContent]);

  const inlineFilenameCandidates = useMemo(
    () => extractInlineFilenameCandidates(deferredContent),
    [deferredContent]
  );

  return (
    <div
      className={`${
        isUser ? "py-3 px-2 sm:py-4 sm:px-4" : "message-container message-container-ai"
      } animate-message-bounce-in`}
    >
      <div className={`max-w-3xl mx-auto px-3 sm:px-4 ${isUser ? "flex justify-end" : ""}`}>
        <div className={`flex gap-2.5 sm:gap-4 ${isUser ? "flex-row-reverse max-w-[85%]" : ""}`}>
          {/* Avatar - only show for AI messages */}
          {!isUser && (
            <div className="flex-shrink-0 hidden xs:block">
              <VertexAIIcon size="sm" className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
          )}

          <div className={`flex-1 min-w-0 overflow-hidden ${isUser ? "bg-primary/10 border border-primary/20 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 animate-slide-in-right" : ""}`}>
            {/* Header with name - only show for AI messages */}
            {!isUser && (
              <div className="flex items-center gap-2 mb-1 sm:mb-1.5">
                <div className="xs:hidden flex-shrink-0">
                  <VertexAIIcon size="sm" className="w-5 h-5" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-foreground">
                  VertexAI
                </span>
                {message.isLocalResponse && <LocalAIBadge />}
              </div>
            )}

            {/* Display images if present */}
            {message.images && message.images.length > 0 && (
              <div className="flex gap-2 mb-3 flex-wrap">
                {message.images.map((img, idx) => (
                  <img
                    key={idx}
                    src={img.url}
                    alt={img.name || "Uploaded image"}
                    className="max-w-32 max-h-32 sm:max-w-48 sm:max-h-48 rounded-lg object-cover border border-border"
                  />
                ))}
              </div>
            )}

            {/* Display videos if present */}
            {message.videos && message.videos.length > 0 && (
              <div className="flex gap-2 mb-3 flex-wrap">
                {message.videos.map((vid, idx) => (
                  <div
                    key={idx}
                    className="relative rounded-lg overflow-hidden border border-border bg-secondary"
                  >
                    <video
                      src={vid.url}
                      controls
                      className="max-w-48 sm:max-w-64 max-h-32 sm:max-h-48 rounded-lg"
                    />
                    <div className="absolute top-2 left-2 bg-background/80 rounded px-2 py-1 flex items-center gap-1">
                      <Video className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground truncate max-w-[80px] sm:max-w-[100px]">
                        {vid.name || "Video"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isUser ? (
              <p className="text-foreground whitespace-pre-wrap text-sm sm:text-[15px] leading-relaxed sm:leading-[1.7] break-words">
                {message.content}
              </p>
            ) : (
              <div className="prose-content text-foreground overflow-hidden">
                {/* Lightweight render during streaming for performance */}
                {message.isStreaming ? (
                  <pre className="whitespace-pre-wrap font-sans text-sm sm:text-[15px] leading-relaxed sm:leading-[1.75] text-foreground/90 break-words m-0 p-0 bg-transparent">
                    {deferredContent}
                    <span className="inline-block w-1.5 h-4 bg-primary/70 animate-pulse ml-0.5 align-middle" />
                  </pre>
                ) : (
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      code({ node, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || "");
                        const isInline = !match && !className;

                        if (isInline) {
                          return <SemanticHighlight>{children}</SemanticHighlight>;
                        }

                        const rawCode = String(children).replace(/\n$/, "");
                        const language = match?.[1] || "text";

                        // Handle mermaid diagrams
                        if (language === "mermaid") {
                          return <MermaidDiagram code={rawCode} />;
                        }

                        // 1) Try explicit meta from the fenced code info string
                        const meta = typeof (node as any)?.meta === "string" ? (node as any).meta : undefined;
                        const metaFilename = extractFilenameFromMeta(meta);

                        // 2) Try first non-empty line inside the code block (e.g. "// File: calculator.cpp")
                        const lines = rawCode.split("\n");
                        const firstMeaningfulIdx = lines.findIndex((l) => l.trim() !== "");
                        const firstMeaningfulLine = firstMeaningfulIdx >= 0 ? lines[firstMeaningfulIdx].trim() : "";
                        const commentFilenameMatch = firstMeaningfulLine.match(
                          /^(?:\/\/|#|<!--|\/\*)\s*(?:file(?:name)?\s*:?\s*)?([^\s]+\.[a-z0-9]{1,8})/i
                        );
                        const commentFilename = commentFilenameMatch?.[1];

                        // If the filename is embedded as a comment line, strip that line from the displayed code
                        let codeString = rawCode;
                        if (commentFilename && firstMeaningfulIdx >= 0) {
                          const stripped = [...lines];
                          stripped.splice(firstMeaningfulIdx, 1);
                          codeString = stripped.join("\n").replace(/^\n+/, "");
                        }

                        // 3) Fallback: if the message text references a filename (e.g. `calculator.cpp`) and this response
                        //    only has 1 code block, use that.
                        const inferredFilename =
                          fencedCodeBlockCount === 1
                            ? pickFilenameForLanguage(inlineFilenameCandidates, language)
                            : pickFilenameForLanguage(inlineFilenameCandidates, language);

                        const filename = metaFilename || commentFilename || inferredFilename;

                        return (
                          <CodeBlock
                            code={codeString}
                            language={language}
                            filename={filename}
                          />
                        );
                      },
                      p: ({ children, node }) => {
                        // Detect math-only paragraphs and render them as centered display blocks
                        const childArray = Array.isArray(children) ? children : [children];
                        const isMathOnly = childArray.length === 1 && 
                          typeof childArray[0] === 'object' && 
                          childArray[0] !== null &&
                          (childArray[0] as any)?.props?.className?.includes?.('katex');
                        
                        if (isMathOnly) {
                          return (
                            <div className="my-5 flex justify-center overflow-x-auto math-display-block">
                              {children}
                            </div>
                          );
                        }
                        
                        return (
                          <p className="mb-3 sm:mb-4 last:mb-0 text-sm sm:text-[15px] leading-relaxed sm:leading-[1.75] text-foreground/90 break-words">
                            {children}
                          </p>
                        );
                      },
                      ul: ({ children }) => (
                        <ul className="list-disc mb-3 sm:mb-4 ml-4 sm:ml-5 space-y-1.5 sm:space-y-2 text-sm sm:text-[15px] leading-relaxed sm:leading-[1.7]">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal mb-3 sm:mb-4 ml-4 sm:ml-5 space-y-1.5 sm:space-y-2 text-sm sm:text-[15px] leading-relaxed sm:leading-[1.7]">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li className="text-foreground/90 pl-0.5 sm:pl-1 break-words">
                          {children}
                        </li>
                      ),
                      h1: ({ children }) => (
                        <h1 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3 mt-4 sm:mt-6 first:mt-0 text-foreground tracking-tight">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 mt-4 sm:mt-5 first:mt-0 text-foreground tracking-tight">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-sm sm:text-base font-medium mb-1.5 sm:mb-2 mt-3 sm:mt-4 first:mt-0 text-foreground">
                          {children}
                        </h3>
                      ),
                      h4: ({ children }) => (
                        <h4 className="text-sm sm:text-[15px] font-medium mb-1.5 sm:mb-2 mt-2.5 sm:mt-3 first:mt-0 text-foreground">
                          {children}
                        </h4>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold text-foreground">
                          {children}
                        </strong>
                      ),
                      em: ({ children }) => (
                        <em className="italic text-foreground/80">{children}</em>
                      ),
                      a: ({ href, children }) => (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80 underline underline-offset-2 decoration-primary/40 hover:decoration-primary/60 transition-colors break-all"
                        >
                          {children}
                        </a>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-2 sm:border-l-3 border-primary/30 pl-3 sm:pl-4 py-1 my-3 sm:my-4 text-muted-foreground italic bg-secondary/30 rounded-r-lg text-sm sm:text-base">
                          {children}
                        </blockquote>
                      ),
                      hr: () => <hr className="my-4 sm:my-6 border-t border-border/50" />,
                      table: ({ children }) => (
                        <div className="my-3 sm:my-4 overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
                          <table className="w-full text-xs sm:text-[14px] border-collapse min-w-max">{children}</table>
                        </div>
                      ),
                      th: ({ children }) => (
                        <th className="text-left font-semibold py-1.5 sm:py-2 px-2 sm:px-3 border-b border-border bg-secondary/50 whitespace-nowrap">
                          {children}
                        </th>
                      ),
                      td: ({ children }) => (
                        <td className="py-1.5 sm:py-2 px-2 sm:px-3 border-b border-border/50">{children}</td>
                      ),
                    }}
                  >
                    {deferredContent}
                  </ReactMarkdown>
                )}

                {/* Generated Images Display */}
                {message.generatedImages && message.generatedImages.length > 0 && (
                  <div className="mt-4 space-y-4">
                    {message.generatedImages.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img 
                          src={img.url} 
                          alt={`Generated: ${img.prompt.slice(0, 50)}...`}
                          className="max-w-full sm:max-w-md rounded-xl"
                        />
                        
                        {/* Action buttons on hover */}
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                          <Button 
                            size="sm" 
                            variant="secondary" 
                            className="h-8 px-2 bg-neutral-800 text-white hover:bg-neutral-700 backdrop-blur-sm shadow-md"
                            onClick={() => handleDownloadImage(img.url, img.prompt)}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            <span className="text-xs">Download</span>
                          </Button>
                          <Button 
                            size="sm" 
                            variant="secondary" 
                            className="h-8 px-2 bg-neutral-800 text-white hover:bg-neutral-700 backdrop-blur-sm shadow-md"
                            onClick={() => handleCopyImage(img.url, idx)}
                          >
                            {copiedImage === idx ? (
                              <>
                                <Check className="w-4 h-4 mr-1" />
                                <span className="text-xs">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4 mr-1" />
                                <span className="text-xs">Copy</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!isUser && message.content && (
              <div className="mt-2 sm:mt-3 flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 sm:h-7 px-1.5 sm:px-2 text-muted-foreground hover:text-foreground"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
                      <span className="text-[10px] sm:text-xs">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
                      <span className="text-[10px] sm:text-xs">Copy</span>
                    </>
                  )}
                </Button>

                {isLastAssistantMessage && !isLoading && onRegenerate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 sm:h-7 px-1.5 sm:px-2 text-muted-foreground hover:text-foreground"
                    onClick={onRegenerate}
                  >
                    <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
                    <span className="text-[10px] sm:text-xs">Regenerate</span>
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
