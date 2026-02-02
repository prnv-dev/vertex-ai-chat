import { memo, useState, useEffect } from "react";
import { Check, Copy, ChevronDown, ChevronUp, FileCode, Download, FileText, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Auto-detect language from code content
function detectLanguage(code: string): string {
  const trimmed = code.trim();
  const lines = trimmed.split('\n');
  const firstLine = lines[0] || '';
  
  // Check for shebang
  if (firstLine.startsWith('#!/bin/bash') || firstLine.startsWith('#!/bin/sh')) return 'bash';
  if (firstLine.startsWith('#!/usr/bin/env python')) return 'python';
  if (firstLine.startsWith('#!/usr/bin/env node')) return 'javascript';
  
  // HTML detection
  if (/<(!DOCTYPE|html|head|body|div|span|p|a|script|link|meta|table|form|input|button|img|ul|ol|li|h[1-6]|section|article|header|footer|nav|main|aside)\b/i.test(trimmed)) return 'html';
  
  // CSS detection
  if (/^(@import|@media|@keyframes|@font-face|\*|body|html|\.[\w-]+|#[\w-]+)\s*\{/m.test(trimmed) ||
      /:\s*(flex|grid|block|inline|none|absolute|relative|fixed|#[0-9a-f]{3,6}|rgb|hsl|var\(--)/i.test(trimmed)) return 'css';
  
  // JSON detection
  if (/^[\s]*[\[{]/.test(trimmed) && /[\]}][\s]*$/.test(trimmed)) {
    try { JSON.parse(trimmed); return 'json'; } catch {}
  }
  
  // TypeScript/TSX detection (before JS)
  if (/:\s*(string|number|boolean|any|void|never|unknown|React\.\w+|JSX\.Element)\b/.test(trimmed) ||
      /interface\s+\w+\s*\{/.test(trimmed) ||
      /type\s+\w+\s*=/.test(trimmed) ||
      /<\w+\s*>/.test(trimmed) && /:\s*\w+/.test(trimmed)) {
    if (/<[A-Z]\w*[\s/>]|<\/[A-Z]\w*>|className=/.test(trimmed)) return 'tsx';
    return 'typescript';
  }
  
  // JSX detection
  if (/<[A-Z]\w*[\s/>]|<\/[A-Z]\w*>|className=|onClick=|onChange=/.test(trimmed) &&
      /(import|export|const|function|=>)/.test(trimmed)) return 'jsx';
  
  // JavaScript detection
  if (/(const|let|var)\s+\w+\s*=/.test(trimmed) ||
      /function\s+\w+\s*\(/.test(trimmed) ||
      /=>\s*\{/.test(trimmed) ||
      /\bimport\s+.*\s+from\s+['"]/.test(trimmed) ||
      /\bexport\s+(default|const|function|class)/.test(trimmed) ||
      /console\.(log|error|warn)/.test(trimmed) ||
      /document\.(getElementById|querySelector|createElement)/.test(trimmed)) return 'javascript';
  
  // Python detection
  if (/^(import|from)\s+\w+/.test(trimmed) ||
      /def\s+\w+\s*\(/.test(trimmed) ||
      /class\s+\w+(\s*\(.*\))?:/.test(trimmed) ||
      /if\s+__name__\s*==\s*['"]__main__['"]/.test(trimmed) ||
      /print\s*\(/.test(trimmed) ||
      /^\s*(elif|except|lambda|with|async|await)\s/.test(trimmed)) return 'python';
  
  // C++ detection
  if (/#include\s*<[\w.]+>/.test(trimmed) ||
      /\bstd::\w+/.test(trimmed) ||
      /\bcout\s*<</.test(trimmed) ||
      /\bcin\s*>>/.test(trimmed) ||
      /int\s+main\s*\(/.test(trimmed) && /#include/.test(trimmed)) return 'cpp';
  
  // C detection (after C++)
  if (/#include\s*<[\w.]+>/.test(trimmed) ||
      /printf\s*\(/.test(trimmed) ||
      /scanf\s*\(/.test(trimmed) ||
      /int\s+main\s*\(/.test(trimmed)) return 'c';
  
  // Java detection
  if (/public\s+(class|static|void|interface)/.test(trimmed) ||
      /System\.(out|in|err)\./.test(trimmed) ||
      /import\s+java\./.test(trimmed)) return 'java';
  
  // SQL detection
  if (/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|FROM|WHERE|JOIN|ORDER BY|GROUP BY)\b/im.test(trimmed)) return 'sql';
  
  // Bash/Shell detection
  if (/^\s*(echo|cd|ls|mkdir|rm|cp|mv|chmod|chown|grep|awk|sed|cat|curl|wget)\s/.test(trimmed) ||
      /\$\{?\w+\}?/.test(trimmed) && /^\s*(if|for|while|case)\s/.test(trimmed) ||
      /^\s*(npm|yarn|pnpm|npx|pip|cargo|go|docker|git|brew)\s/.test(trimmed)) return 'bash';
  
  // YAML detection
  if (/^\w+:\s*($|\n|\w)/.test(trimmed) && /^\s+-\s+/m.test(trimmed)) return 'yaml';
  
  // Markdown detection
  if (/^#{1,6}\s+/.test(trimmed) ||
      /^\*{3,}$|^-{3,}$/m.test(trimmed) ||
      /\[.*?\]\(.*?\)/.test(trimmed) ||
      /^>\s+/.test(trimmed)) return 'markdown';
  
  // Rust detection
  if (/fn\s+\w+\s*\(/.test(trimmed) && /->/.test(trimmed) ||
      /let\s+mut\s+/.test(trimmed) ||
      /impl\s+\w+/.test(trimmed)) return 'rust';
  
  // Go detection
  if (/^package\s+\w+/.test(trimmed) ||
      /func\s+\w+\s*\(/.test(trimmed) ||
      /import\s+\(/.test(trimmed) && /fmt/.test(trimmed)) return 'go';
  
  // PHP detection
  if (/^<\?php/.test(trimmed) ||
      /\$\w+\s*=/.test(trimmed) && /;$/.test(trimmed) ||
      /function\s+\w+\s*\(.*\)\s*\{/.test(trimmed) && /\$/.test(trimmed) ||
      /\becho\s+/.test(trimmed) ||
      /->\w+\(/.test(trimmed) && /\$this/.test(trimmed) ||
      /\barray\s*\(/.test(trimmed) ||
      /namespace\s+[\w\\]+;/.test(trimmed) ||
      /use\s+[\w\\]+;/.test(trimmed)) return 'php';
  
  // Ruby detection
  if (/^require\s+['"]/.test(trimmed) ||
      /def\s+\w+/.test(trimmed) && /end$/.test(trimmed) ||
      /class\s+\w+/.test(trimmed) && /end$/.test(trimmed) ||
      /do\s*\|.*\|/.test(trimmed) ||
      /\.each\s+do/.test(trimmed) ||
      /puts\s+/.test(trimmed) ||
      /@\w+\s*=/.test(trimmed) ||
      /attr_(reader|writer|accessor)/.test(trimmed)) return 'ruby';
  
  // Swift detection
  if (/\bvar\s+\w+\s*:\s*\w+/.test(trimmed) ||
      /\blet\s+\w+\s*:\s*\w+/.test(trimmed) ||
      /func\s+\w+\s*\(.*\)\s*(->|{)/.test(trimmed) ||
      /import\s+(UIKit|Foundation|SwiftUI)/.test(trimmed) ||
      /\bguard\s+let\b/.test(trimmed) ||
      /\bif\s+let\b/.test(trimmed) ||
      /\bprint\s*\(/.test(trimmed) && /\bvar\b|\blet\b/.test(trimmed) ||
      /@IBOutlet|@IBAction|@State|@Binding/.test(trimmed) ||
      /struct\s+\w+\s*:\s*\w+/.test(trimmed)) return 'swift';
  
  // Kotlin detection
  if (/^package\s+[\w.]+/.test(trimmed) && /fun\s+\w+/.test(trimmed) ||
      /fun\s+\w+\s*\(.*\)\s*:\s*\w+/.test(trimmed) ||
      /\bval\s+\w+\s*[:=]/.test(trimmed) ||
      /\bvar\s+\w+\s*:\s*\w+/.test(trimmed) && !/swift/i.test(trimmed) ||
      /import\s+kotlin\./.test(trimmed) ||
      /import\s+android\./.test(trimmed) ||
      /println\s*\(/.test(trimmed) ||
      /data\s+class\s+\w+/.test(trimmed) ||
      /override\s+fun\s+/.test(trimmed) ||
      /@Composable/.test(trimmed)) return 'kotlin';
  
  return 'text';
}

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
}

const languageLabels: Record<string, string> = {
  html: "HTML",
  css: "CSS",
  javascript: "JavaScript",
  js: "JavaScript",
  typescript: "TypeScript",
  ts: "TypeScript",
  tsx: "TSX",
  jsx: "JSX",
  python: "Python",
  py: "Python",
  json: "JSON",
  bash: "Bash",
  shell: "Shell",
  sh: "Shell",
  sql: "SQL",
  markdown: "Markdown",
  md: "Markdown",
  yaml: "YAML",
  yml: "YAML",
  text: "Plain Text",
  php: "PHP",
  ruby: "Ruby",
  rb: "Ruby",
  swift: "Swift",
  kotlin: "Kotlin",
  kt: "Kotlin",
  rust: "Rust",
  rs: "Rust",
  go: "Go",
  c: "C",
  cpp: "C++",
  java: "Java",
};

const languageColors: Record<string, string> = {
  html: "bg-orange-500/20 text-orange-300",
  css: "bg-blue-500/20 text-blue-300",
  javascript: "bg-yellow-500/20 text-yellow-300",
  js: "bg-yellow-500/20 text-yellow-300",
  typescript: "bg-blue-600/20 text-blue-300",
  ts: "bg-blue-600/20 text-blue-300",
  tsx: "bg-blue-600/20 text-blue-300",
  jsx: "bg-yellow-500/20 text-yellow-300",
  python: "bg-green-500/20 text-green-300",
  py: "bg-green-500/20 text-green-300",
  json: "bg-amber-500/20 text-amber-300",
  bash: "bg-emerald-500/20 text-emerald-300",
  shell: "bg-emerald-500/20 text-emerald-300",
  sh: "bg-emerald-500/20 text-emerald-300",
  sql: "bg-purple-500/20 text-purple-300",
  yaml: "bg-pink-500/20 text-pink-300",
  yml: "bg-pink-500/20 text-pink-300",
  php: "bg-indigo-500/20 text-indigo-300",
  ruby: "bg-red-500/20 text-red-300",
  rb: "bg-red-500/20 text-red-300",
  swift: "bg-orange-600/20 text-orange-300",
  kotlin: "bg-violet-500/20 text-violet-300",
  kt: "bg-violet-500/20 text-violet-300",
  rust: "bg-orange-700/20 text-orange-300",
  rs: "bg-orange-700/20 text-orange-300",
  go: "bg-cyan-500/20 text-cyan-300",
  c: "bg-slate-500/20 text-slate-300",
  cpp: "bg-blue-700/20 text-blue-300",
  java: "bg-red-600/20 text-red-300",
};

const defaultFilenameByLanguage: Record<string, string> = {
  html: "index.html",
  css: "style.css",
  javascript: "app.js",
  js: "app.js",
  typescript: "app.ts",
  ts: "app.ts",
  tsx: "App.tsx",
  jsx: "App.jsx",
  python: "main.py",
  py: "main.py",
  json: "data.json",
  bash: "run.sh",
  shell: "run.sh",
  sh: "run.sh",
  sql: "query.sql",
  yaml: "config.yml",
  yml: "config.yml",
  cpp: "main.cpp",
  c: "main.c",
  markdown: "README.md",
  md: "README.md",
  text: "notes.txt",
  php: "index.php",
  ruby: "main.rb",
  rb: "main.rb",
  swift: "main.swift",
  kotlin: "Main.kt",
  kt: "Main.kt",
  rust: "main.rs",
  rs: "main.rs",
  go: "main.go",
  java: "Main.java",
};

// Compact header for mobile - max 40px height with dropdown menu
const MobileCodeHeader = memo(function MobileCodeHeader({
  filename,
  displayLanguage,
  lineCount,
  copied,
  copiedAs,
  onCopy,
  onCopyAsFile,
  onDownload,
  isCollapsed,
  onToggleExpand,
  isDark,
}: {
  filename?: string;
  displayLanguage: string;
  lineCount: number;
  copied: boolean;
  copiedAs: 'code' | 'file' | null;
  onCopy: () => void;
  onCopyAsFile: () => void;
  onDownload: () => void;
  isCollapsed: boolean;
  onToggleExpand: () => void;
  isDark: boolean;
}) {
  const colorClass = languageColors[displayLanguage] || "bg-muted/50 text-muted-foreground";
  const label = languageLabels[displayLanguage] || displayLanguage.toUpperCase();
  const displayFilename = filename || defaultFilenameByLanguage[displayLanguage] || `code.${displayLanguage}`;

  return (
    <div 
      className={cn(
        "flex items-center justify-between px-2 py-1.5 border-b",
        isDark ? "bg-[#1a1a1a] border-[#2d2d2d]" : "bg-gray-100 border-gray-200"
      )}
      style={{ height: '36px', maxHeight: '36px' }}
    >
      <div 
        className="flex items-center gap-1.5 min-w-0 flex-1 cursor-pointer active:opacity-70"
        onClick={onToggleExpand}
      >
        <FileCode className={cn("w-3 h-3 flex-shrink-0", isDark ? "text-[#858585]" : "text-gray-500")} />
        <span className={cn("text-[11px] font-medium truncate max-w-[120px]", isDark ? "text-[#cccccc]" : "text-gray-800")}>
          {displayFilename}
        </span>
        <span className={cn(
          "px-1 py-0.5 text-[9px] font-medium rounded flex-shrink-0",
          colorClass
        )}>
          {label}
        </span>
        <span className={cn("text-[9px] ml-auto", isDark ? "text-[#6b6b6b]" : "text-gray-500")}>
          {lineCount}L
        </span>
      </div>

      <div className="flex items-center gap-0.5 flex-shrink-0">
        {/* Dropdown menu for copy/download options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 w-8 p-0",
                copied
                  ? "text-green-400 bg-green-500/10"
                  : isDark ? "text-[#858585] active:bg-[#2d2d2d]" : "text-gray-500 active:bg-gray-200"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {copied ? (
                <Check className="w-4 h-4" />
              ) : (
                <MoreVertical className="w-4 h-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className={isDark ? "bg-[#1a1a1a] border-[#2d2d2d]" : "bg-white border-gray-200"}>
            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); onCopy(); }}
              className={cn("cursor-pointer", isDark ? "text-[#cccccc] hover:bg-[#2d2d2d]" : "text-gray-800 hover:bg-gray-100")}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy code
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); onCopyAsFile(); }}
              className={cn("cursor-pointer", isDark ? "text-[#cccccc] hover:bg-[#2d2d2d]" : "text-gray-800 hover:bg-gray-100")}
            >
              <FileText className="w-4 h-4 mr-2" />
              Copy as file
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); onDownload(); }}
              className={cn("cursor-pointer", isDark ? "text-[#cccccc] hover:bg-[#2d2d2d]" : "text-gray-800 hover:bg-gray-100")}
            >
              <Download className="w-4 h-4 mr-2" />
              Download file
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Expand/collapse indicator */}
        <div 
          className={cn("h-8 w-8 flex items-center justify-center", isDark ? "text-[#858585]" : "text-gray-500")}
          onClick={onToggleExpand}
        >
          {isCollapsed ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronUp className="w-4 h-4" />
          )}
        </div>
      </div>
    </div>
  );
});

// Desktop header with dropdown menu for copy options
const DesktopCodeHeader = memo(function DesktopCodeHeader({
  filename,
  displayLanguage,
  lineCount,
  copied,
  copiedAs,
  onCopy,
  onCopyAsFile,
  onDownload,
  isCollapsed,
  onToggleCollapse,
  isLongCode,
  isDark,
}: {
  filename?: string;
  displayLanguage: string;
  lineCount: number;
  copied: boolean;
  copiedAs: 'code' | 'file' | null;
  onCopy: () => void;
  onCopyAsFile: () => void;
  onDownload: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isLongCode: boolean;
  isDark: boolean;
}) {
  const colorClass = languageColors[displayLanguage] || "bg-muted/50 text-muted-foreground";
  const label = languageLabels[displayLanguage] || displayLanguage.toUpperCase();
  const displayFilename = filename || defaultFilenameByLanguage[displayLanguage] || `code.${displayLanguage}`;

  return (
    <div className={cn(
      "sticky top-0 z-10 flex items-center justify-between px-4 py-2.5 border-b",
      isDark ? "bg-[#1a1a1a] border-[#2d2d2d]" : "bg-gray-100 border-gray-200"
    )}>
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode className={cn("w-4 h-4 flex-shrink-0", isDark ? "text-[#858585]" : "text-gray-500")} />
          <span className={cn("text-sm font-medium truncate", isDark ? "text-[#cccccc]" : "text-gray-800")}>
            {displayFilename}
          </span>
        </div>
        <span className={cn(
          "px-2 py-0.5 text-xs font-medium rounded-md flex-shrink-0",
          colorClass
        )}>
          {label}
        </span>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className={cn("text-xs font-mono mr-2", isDark ? "text-[#6b6b6b]" : "text-gray-500")}>
          {lineCount} {lineCount === 1 ? 'line' : 'lines'}
        </span>

        {isLongCode && (
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 w-7 p-0",
              isDark ? "text-[#6b6b6b] hover:text-[#cccccc] hover:bg-[#2d2d2d]" : "text-gray-500 hover:text-gray-800 hover:bg-gray-200"
            )}
            onClick={onToggleCollapse}
            title={isCollapsed ? "Expand code" : "Collapse code"}
          >
            {isCollapsed ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-2.5 text-xs font-medium transition-all duration-150",
                copied
                  ? "text-green-400 bg-green-500/10"
                  : isDark ? "text-[#6b6b6b] hover:text-[#cccccc] hover:bg-[#2d2d2d]" : "text-gray-500 hover:text-gray-800 hover:bg-gray-200"
              )}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1" />
                  {copiedAs === 'file' ? 'Copied as file' : 'Copied'}
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-1" />
                  Copy
                  <ChevronDown className="w-3 h-3 ml-1" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className={isDark ? "bg-[#1a1a1a] border-[#2d2d2d]" : "bg-white border-gray-200"}>
            <DropdownMenuItem 
              onClick={onCopy}
              className={cn("cursor-pointer", isDark ? "text-[#cccccc] hover:bg-[#2d2d2d]" : "text-gray-800 hover:bg-gray-100")}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy code
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={onCopyAsFile}
              className={cn("cursor-pointer", isDark ? "text-[#cccccc] hover:bg-[#2d2d2d]" : "text-gray-800 hover:bg-gray-100")}
            >
              <FileText className="w-4 h-4 mr-2" />
              Copy as file
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={onDownload}
              className={cn("cursor-pointer", isDark ? "text-[#cccccc] hover:bg-[#2d2d2d]" : "text-gray-800 hover:bg-gray-100")}
            >
              <Download className="w-4 h-4 mr-2" />
              Download {displayFilename}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

// Mobile code content - vertical scroll only, no horizontal, fully readable
const MobileCodeContent = memo(function MobileCodeContent({
  code,
  displayLanguage,
  maxHeight = "100%",
  isDark,
}: {
  code: string;
  displayLanguage: string;
  maxHeight?: string;
  isDark: boolean;
}) {
  return (
    <div 
      className="overflow-y-auto overflow-x-hidden overscroll-contain"
      style={{ 
        maxHeight,
        WebkitOverflowScrolling: 'touch',
        width: '100%',
      }}
    >
      <SyntaxHighlighter
        style={isDark ? oneDark : oneLight}
        language={displayLanguage}
        PreTag="div"
        showLineNumbers={false}
        wrapLines={true}
        wrapLongLines={true}
        customStyle={{
          margin: 0,
          borderRadius: 0,
          background: isDark ? "#0d0d0d" : "#fafafa",
          fontSize: "12px",
          lineHeight: "1.5",
          padding: "12px",
          fontFamily: "'SF Mono', 'Menlo', 'Monaco', 'Consolas', monospace",
          overflowX: "hidden",
          width: "100%",
          maxWidth: "100%",
          wordBreak: "break-all",
          overflowWrap: "break-word",
          boxShadow: "none",
        }}
        codeTagProps={{
          style: {
            fontFamily: "'SF Mono', 'Menlo', 'Monaco', 'Consolas', monospace",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
            overflowWrap: "break-word",
            display: "block",
            width: "100%",
            maxWidth: "100%",
          }
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
});

// Desktop code content - with horizontal scroll and line numbers
const DesktopCodeContent = memo(function DesktopCodeContent({
  code,
  displayLanguage,
  maxHeight = "400px",
  showLineNumbers = true,
  isDark,
}: {
  code: string;
  displayLanguage: string;
  maxHeight?: string;
  showLineNumbers?: boolean;
  isDark: boolean;
}) {
  return (
    <div 
      className={cn(
        "overflow-auto scrollbar-thin scrollbar-track-transparent",
        isDark ? "scrollbar-thumb-[#3d3d3d]" : "scrollbar-thumb-gray-300"
      )}
      style={{ maxHeight }}
    >
      <SyntaxHighlighter
        style={isDark ? oneDark : oneLight}
        language={displayLanguage}
        PreTag="div"
        showLineNumbers={showLineNumbers}
        wrapLines={true}
        lineNumberStyle={{
          minWidth: "2.5em",
          paddingRight: "0.75em",
          color: isDark ? "#4d4d4d" : "#999999",
          textAlign: "right",
          userSelect: "none",
          fontSize: "0.75rem",
        }}
        customStyle={{
          margin: 0,
          borderRadius: 0,
          background: isDark ? "#0d0d0d" : "#fafafa",
          fontSize: "0.8125rem",
          lineHeight: "1.6",
          padding: "0.75rem 0",
          fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace",
        }}
        codeTagProps={{
          style: {
            fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace",
            whiteSpace: "pre",
          }
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
});

export const CodeBlock = memo(function CodeBlock({
  code,
  language = "text",
  filename
}: CodeBlockProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  
  const [copied, setCopied] = useState(false);
  const [copiedAs, setCopiedAs] = useState<'code' | 'file' | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const lineCount = code.split("\n").length;
  const isLongCode = lineCount > 25;
  
  // Desktop: expand by default for short code, collapse for long
  // Mobile: always collapsed by default
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(isLongCode);
  
  // Detect mobile on client side
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-detect language if not specified or is generic "text"
  const rawLang = language.toLowerCase();
  const displayLanguage = (!language || rawLang === 'text' || rawLang === 'plaintext' || rawLang === '') 
    ? detectLanguage(code) 
    : rawLang;

  const displayFilename = filename || defaultFilenameByLanguage[displayLanguage] || `code.${displayLanguage}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setCopiedAs('code');
    setTimeout(() => { setCopied(false); setCopiedAs(null); }, 2000);
  };

  const handleCopyAsFile = async () => {
    const header = `// File: ${displayFilename}\n// Generated by VertexAI\n\n`;
    await navigator.clipboard.writeText(header + code);
    setCopied(true);
    setCopiedAs('file');
    setTimeout(() => { setCopied(false); setCopiedAs(null); }, 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = displayFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Mobile rendering
  if (isMobile) {
    return (
      <>
        {/* Mobile container - full width, no horizontal scroll */}
        <div 
          className={cn(
            "my-2 -mx-2 border-y",
            isDark ? "border-[#2d2d2d] bg-[#0d0d0d]" : "border-gray-200 bg-gray-50"
          )}
          style={{ 
            maxWidth: '100vw',
            width: 'calc(100% + 1rem)',
            overflowX: 'hidden',
          }}
        >
          <MobileCodeHeader
            filename={displayFilename}
            displayLanguage={displayLanguage}
            lineCount={lineCount}
            copied={copied}
            copiedAs={copiedAs}
            onCopy={handleCopy}
            onCopyAsFile={handleCopyAsFile}
            onDownload={handleDownload}
            isCollapsed={true}
            onToggleExpand={() => setIsDrawerOpen(true)}
            isDark={isDark}
          />

          {/* Collapsed preview - tap to expand */}
          <div
            className={cn(
              "px-2 py-2",
              isDark ? "bg-[#0d0d0d] active:bg-[#141414]" : "bg-gray-50 active:bg-gray-100"
            )}
            onClick={() => setIsDrawerOpen(true)}
          >
            <div className={cn("text-[11px] flex items-center gap-1.5", isDark ? "text-[#6b6b6b]" : "text-gray-500")}>
              <FileCode className="w-3 h-3" />
              <span>Tap to view {lineCount} lines</span>
            </div>
          </div>
        </div>

        {/* Mobile bottom sheet drawer for full code view */}
        <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <DrawerContent 
            className={cn(
              "max-h-[90vh] border-t",
              isDark ? "bg-[#0d0d0d] border-[#2d2d2d]" : "bg-white border-gray-200"
            )}
            style={{ 
              boxShadow: 'none',
              animation: 'none',
            }}
          >
            <DrawerHeader className={cn("p-0 border-b", isDark ? "border-[#2d2d2d]" : "border-gray-200")}>
              <DrawerTitle className="sr-only">
                {displayFilename}
              </DrawerTitle>
              <MobileCodeHeader
                filename={displayFilename}
                displayLanguage={displayLanguage}
                lineCount={lineCount}
                copied={copied}
                copiedAs={copiedAs}
                onCopy={handleCopy}
                onCopyAsFile={handleCopyAsFile}
                onDownload={handleDownload}
                isCollapsed={false}
                onToggleExpand={() => setIsDrawerOpen(false)}
                isDark={isDark}
              />
            </DrawerHeader>
            <div 
              className="flex-1 overflow-hidden"
              style={{ 
                maxHeight: 'calc(90vh - 60px)',
                overflowX: 'hidden',
              }}
            >
              <MobileCodeContent 
                code={code} 
                displayLanguage={displayLanguage}
                maxHeight="calc(90vh - 60px)"
                isDark={isDark}
              />
            </div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  // Desktop rendering
  return (
    <>
      <div className={cn(
        "my-4 rounded-lg overflow-hidden border",
        isDark ? "border-[#2d2d2d] bg-[#0d0d0d]" : "border-gray-200 bg-gray-50"
      )}>
        <DesktopCodeHeader
          filename={displayFilename}
          displayLanguage={displayLanguage}
          lineCount={lineCount}
          copied={copied}
          copiedAs={copiedAs}
          onCopy={handleCopy}
          onCopyAsFile={handleCopyAsFile}
          onDownload={handleDownload}
          isCollapsed={isDesktopCollapsed}
          onToggleCollapse={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
          isLongCode={isLongCode}
          isDark={isDark}
        />

        {isDesktopCollapsed ? (
          <div
            className={cn(
              "px-4 py-3 cursor-pointer transition-colors",
              isDark ? "bg-[#0d0d0d] hover:bg-[#141414]" : "bg-gray-50 hover:bg-gray-100"
            )}
            onClick={() => setIsDesktopCollapsed(false)}
          >
            <div className={cn("flex items-center gap-2 text-sm", isDark ? "text-[#6b6b6b]" : "text-gray-500")}>
              <FileCode className="w-4 h-4" />
              <span>Click to expand {lineCount} lines</span>
            </div>
          </div>
        ) : (
          <DesktopCodeContent 
            code={code} 
            displayLanguage={displayLanguage} 
            maxHeight="350px"
            showLineNumbers={lineCount <= 500}
            isDark={isDark}
          />
        )}
      </div>

      {/* Desktop fullscreen dialog (optional, kept for consistency) */}
      <Dialog open={false}>
        <DialogContent className={cn(
          "max-w-[90vw] w-[90vw] max-h-[90vh] h-[90vh] p-0 overflow-hidden rounded-lg border",
          isDark ? "bg-[#0d0d0d] border-[#2d2d2d]" : "bg-white border-gray-200"
        )}>
          <DialogHeader className="sr-only">
            <DialogTitle>{filename || defaultFilenameByLanguage[displayLanguage] || `code.${displayLanguage}`}</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
});