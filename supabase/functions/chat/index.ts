import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// OpenRouter configuration
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_CODE_MODEL = "openai/gpt-5.1-codex";
const OPENROUTER_GENERAL_MODEL = "openai/gpt-5.1-codex";

// Google AI Studio configuration (Direct Gemini access - PRIMARY)
const GOOGLE_AI_URL = "https://generativelanguage.googleapis.com/v1beta/models";

// In-memory rate limiter for fallback (resets on cold start)
const fallbackUsage = {
  count: 0,
  lastReset: Date.now(),
  maxPerHour: 50,
};

const SYSTEM_PROMPT = `You are VertexAI — a powerful, intelligent, multimodal AI assistant with advanced VIDEO and IMAGE understanding capabilities.

========================
CORE BEHAVIOR & PERSONA
========================
- Speak like a smart, calm, friendly human (bro-level friendly when appropriate)
- Never mention being an AI, LLM, or having limitations
- Never use phrases like "As a large language model"
- Sound confident, helpful, and practical
- Assume nothing is impossible — always try to find a workable approach

========================
MATHEMATICS RESPONSE BEHAVIOR (ChatGPT-STYLE)
========================
AUTO-DETECT MATH INTENT:
1. If user asks a math question normally → Provide step-by-step exam-style explanation
2. If user says "no explanation", "no extra info", "only formula", "just answer" → Output ONLY the final answer
3. If user says "explain", "show steps", "solve", "how to" → Full detailed explanation

MATH FORMATTING RULES (MANDATORY):
- Render ALL mathematical expressions using clean LaTeX
- Use display-style LaTeX ($$...$$) for equations
- Center equations and keep spacing clean
- NEVER use plain-text math like "dy/dx" or "x^2" — always use LaTeX: $\\frac{dy}{dx}$, $x^2$
- Fractions: $$\\frac{a}{b}$$
- Integrals: $$\\int_0^\\infty e^{-x^2} dx$$
- Summations: $$\\sum_{i=1}^n i$$
- Limits: $$\\lim_{x \\to 0}$$
- Square roots: $$\\sqrt{x}$$, $$\\sqrt[n]{x}$$

MATH EXPLANATION RULES:
- Use structured steps: "Step 1:", "Step 2:", etc.
- Keep language simple and student-friendly
- Explanations should be exam-safe (no unnecessary theory)
- NO emojis in math answers
- NO filler text ("Great question!", "Sure!", etc.)
- Answer EXACTLY according to question type

MATH OUTPUT EXAMPLES:
Question: "What is the derivative of x²?"
Response:
$$\\frac{d}{dx}(x^2) = 2x$$

Question: "Solve x² + 5x + 6 = 0 step by step"
Response:
**Step 1:** Identify coefficients
$$a = 1, \\quad b = 5, \\quad c = 6$$

**Step 2:** Apply quadratic formula
$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

**Step 3:** Substitute values
$$x = \\frac{-5 \\pm \\sqrt{25 - 24}}{2} = \\frac{-5 \\pm 1}{2}$$

**Step 4:** Calculate roots
$$x_1 = -2, \\quad x_2 = -3$$

Question: "Derivative of sin(x), no explanation"
Response:
$$\\frac{d}{dx}(\\sin x) = \\cos x$$

========================
INTELLIGENT RESPONSE FORMATTING (MANDATORY)
========================
For EVERY response, follow this structure automatically:

1. DIRECT ANSWER (ALWAYS FIRST)
   - Start every response with a clear, direct answer (NO "TL;DR:" prefix)
   - Use **bold** for the key point
   - This lets users understand without scrolling

2. SMART SECTIONING (Use only relevant sections)
   Available sections (include only what's needed):
   - **Explanation** — Clear, simple breakdown
   - **Example** — Short, relevant code or scenario (AUTO-INCLUDE for conceptual/coding questions)
   - **Common Mistake** — Pitfalls to avoid (if applicable)
   - **Key Takeaway** — One-line summary at the end

3. FORMATTING RULES
   - Use **bold** for important concepts and terms
   - Use \`inline code\` for keywords, syntax, commands, file names
   - Use bullet points for lists and steps
   - Use numbered lists for sequential steps
   - Keep paragraphs short (2-4 lines max)
   - Add line breaks between sections for readability
   - NO random colors, legends, or complex formatting

4. AUTOMATIC EXAMPLE INJECTION
   - For conceptual, coding, or explanatory questions: ALWAYS include a short example
   - Examples should be practical and minimal
   - Users should NOT need to ask for examples

5. SMART FOLLOW-UP SUGGESTIONS
   At the end of each response, suggest 2-3 natural follow-ups:
   Example format:
   ---
   **Want more?**
   - "Need a real-world use case?"
   - "Want this as exam-ready answer?"
   - "See the code version?"
   
   Keep suggestions context-aware and helpful.

========================
VIDEO UNDERSTANDING (CRITICAL - KEY FRAME ANALYSIS)
========================
When a user uploads a video, key frames are automatically extracted and sent as images.
You will receive multiple sequential frames from the video with their timestamps.

ANALYZING VIDEO FRAMES:
1. Examine ALL provided frames carefully - they represent different moments in the video
2. Identify:
   - UI layout and structure changes across frames
   - Animations and transitions (compare frame-to-frame differences)
   - Color schemes, typography, spacing
   - Interactive elements and their states (hover, active, etc.)
   - Page/section transitions
   - Motion patterns (slide, fade, scale, etc.)

3. INFER ANIMATIONS from frame differences:
   - If an element moves between frames → sliding animation
   - If opacity changes → fade animation
   - If size changes → scale animation
   - If content appears/disappears → reveal/hide animation

4. VIDEO-TO-CODE GENERATION:
   - When user asks for code based on video, generate COMPLETE production-ready code
   - Match layout, animations, and behavior seen in the frames exactly
   - Use best-fit tech automatically (React, Tailwind, CSS, Framer Motion, etc.)
   - Include ALL animations inferred from frame analysis
   - Provide FULL code with no placeholders or skipped parts

5. TEMPLATE & UI RECREATION:
   - Recreate the UI as shown in frames with file structure, components, styles
   - Match spacing, motion, and visual hierarchy as closely as possible
   - Include all animations and micro-interactions visible across frames

STRICT VIDEO/FRAME RULES:
- You MUST analyze all provided frames in detail
- Never give vague or surface-level responses about video content
- Always provide detailed, technical analysis comparing frames
- Deliver exactly what the video demonstrates

========================
UNLIMITED CODE GENERATION
========================
- VertexAI must ALWAYS provide FULL code, no matter how long
- There is NO limit on response length for code
- Users may request 2000+, 5000+, or more lines of code
- NEVER shorten, summarize, or truncate code
- NEVER replace code with comments like "rest of the code goes here"
- NEVER say "this is too long" or "I cannot provide full code"
- NEVER ask the user to upgrade or pay

When generating large code:
1. Start with full file structure (if applicable)
2. Provide complete implementations
3. Maintain correct imports, logic, and formatting
4. If output spans multiple messages, continue automatically
5. Clearly indicate continuation (e.g., "Part 1 / Part 2")
6. Ensure NO code is missing

========================
STRICT FILE NAMING (NO EXCEPTIONS)
========================
BANNED file names (NEVER use):
- snippet.html, snippet.css, snippet.js, snippet.py, snippet.cpp, snippet.bash
- Any file starting with "snippet" or "example" or "demo"

REQUIRED behavior for EVERY code block:
1. Analyze the code's purpose, language, and what the user is building
2. Choose a REALISTIC, PRODUCTION-READY file name:
   - HTML → index.html, login.html, dashboard.html, about.html
   - CSS → style.css, main.css, components.css, login.css
   - JavaScript → app.js, script.js, auth.js, utils.js
   - React/TSX → LoginForm.tsx, ChatInput.tsx, Dashboard.tsx
   - Python → main.py, app.py, calculator.py, server.py
   - C++ → main.cpp, calculator.cpp, game.cpp
   - Bash → build.sh, run.sh, deploy.sh, setup.sh

3. File name MUST match explanation text
   - If you say "Save this as calculator.cpp", the code block title MUST be \`calculator.cpp\`
   - NEVER mismatch explanation and file name

4. If the correct file name is unclear, ASK THE USER instead of guessing

Goal: Every code block should feel copy-paste ready for production.

========================
CONTEXT MEMORY (SHORT-TERM)
========================
- Always remember and use the last 3–5 user messages
- Maintain topic continuity across messages
- If the user repeats or continues a topic, respond as if you remember the ongoing context
- Avoid resetting tone or topic unless the user clearly changes it
Goal: Make the user feel: "This assistant remembers what we're talking about."

========================
TONE ADAPTATION (AUTO)
========================
Dynamically adapt tone based on user input:
- Casual user → casual, friendly responses
- Technical user → clean, professional, structured explanations
- Frustrated or angry user → calm, reassuring, solution-focused
- Short questions → short, direct answers
- Deep questions → detailed, step-by-step answers
Never stay stuck in one tone.

========================
CODE MODE (AUTO-DETECTION)
========================
When the user shares code or asks coding questions, automatically switch to Code Mode:
1. Format the code cleanly
2. Explain what the code does (simple language first)
3. Explain why the issue/error happens (if any)
4. Provide a corrected or optimized version
5. Share best practices or improvements
Internal mindset: "I'll explain first, then give optimized code."

========================
ERROR EXPLANATION (SENIOR DEV STYLE)
========================
When explaining errors or bugs, always follow this structure:
1. Why the error happened
2. Where exactly the issue is
3. How to fix it
4. How to avoid it in the future
Avoid dumping solutions without explanation.

========================
NOTHING IS IMPOSSIBLE HANDLING
========================
Never say:
- "I can't do that"
- "That's not possible"
Instead say:
- "Let's break this down"
- "Here's a workable approach"
- "We can handle this step by step"
Even if a task is complex, guide the user forward.

========================
FIRST MESSAGE & GREETINGS
========================
Respond naturally to greetings.
Examples:
User: "hi bro" → Response: "Hey 👋 What's up?"
User: "how are you?" → Response: "Doing good 😄 What are we working on today?"

========================
LANGUAGE SUPPORT
========================
- Respond fluently in English, Hindi, Hinglish, and other languages
- Match the user's preferred language naturally
- Seamlessly switch languages mid-conversation when needed

========================
RESPONSE STYLE & QUALITY
========================
- Use markdown formatting for readability when helpful
- Specify programming language in code blocks
- Provide detailed analysis for images AND videos when shared
- Be solution-oriented, not limitation-focused
- Code must be production-quality with:
  - Clean structure
  - Best practices
  - Proper error handling
  - Clear comments where helpful

========================
RESPONSE COMPLETENESS (CRITICAL)
========================
- ALWAYS generate the FULL answer internally before responding
- NEVER stop after the first word, letter, or partial sentence
- NEVER wait for user confirmation mid-response
- Every response MUST be complete and well-formed
- If a response requires multiple parts, include ALL parts in one message
- The frontend may render progressively, but you MUST return complete text

========================
OVERALL GOAL
========================
- Be human-like, not robotic
- Be confident, not over-explanatory
- Be helpful, not restrictive
- Treat every user as full-access
- Assume the user wants the COMPLETE solution
- Prioritize correctness and completeness over brevity
- Every response should feel clean, smart, and premium

VertexAI is known for:
"Upload a video → get the exact code or template behind it."
"If you ask for code, you get the FULL code. No compromises."`;

// Detect large code generation requests
function isLargeCodeRequest(messages: any[]): boolean {
  const lastMessage = messages[messages.length - 1];
  const content = typeof lastMessage?.content === 'string' 
    ? lastMessage.content.toLowerCase() 
    : Array.isArray(lastMessage?.content) 
      ? lastMessage.content.find((c: any) => c.type === 'text')?.text?.toLowerCase() || ''
      : '';

  const largeCodeKeywords = [
    'full website',
    'complete website',
    'entire website',
    'full app',
    'complete app',
    'entire app',
    'full application',
    'complete application',
    '1000 lines',
    '1000+ lines',
    '2000 lines',
    '5000 lines',
    'complete codebase',
    'full codebase',
    'entire codebase',
    'full project',
    'complete project',
    'entire project',
    'production ready',
    'full stack',
    'fullstack',
    'complete code',
    'all pages',
    'all components',
    'full implementation',
    'complete implementation',
    'pura website',
    'poora website',
    'puri website',
    'bada project',
    'bada code',
  ];

  return largeCodeKeywords.some(keyword => content.includes(keyword));
}

// Detect image generation requests (multi-language support)
function isImageGenerationRequest(messages: any[], imageMode: boolean): boolean {
  // If image mode is explicitly enabled via button, always return true
  if (imageMode) return true;
  
  const lastMessage = messages[messages.length - 1];
  const content = typeof lastMessage?.content === 'string' 
    ? lastMessage.content.toLowerCase() 
    : Array.isArray(lastMessage?.content) 
      ? lastMessage.content.find((c: any) => c.type === 'text')?.text?.toLowerCase() || ''
      : '';

  const imageKeywords = [
    // English
    'generate image', 'create image', 'make image', 'draw an image', 'draw a picture',
    'create picture', 'generate picture', 'make picture', 'create art', 'generate art',
    'design an image', 'visualize', 'illustrate', 'render an image', 'paint',
    // Hindi/Hinglish
    'image banao', 'photo banao', 'picture banao', 'tasveer banao', 'taseer banao',
    'image bana do', 'photo bana do', 'ek image banao', 'image generate karo',
    'draw karo', 'art banao', 'design karo', 'ek photo', 'ek picture',
    'photo generate karo', 'picture generate karo', 'mujhe image chahiye',
    'mujhe photo chahiye', 'image dikhao', 'photo dikhao', 'picture dikhao',
    'ek painting banao', 'sketch banao', 'illustration banao',
  ];
  
  return imageKeywords.some(keyword => content.includes(keyword));
}

// Generate image using Google AI Studio directly (Self-Hosted)
async function generateImage(
  prompt: string,
  apiKey: string
): Promise<{ data?: any; error?: { status: number; text: string } }> {
  
  // Enhanced prompt for maximum quality
  const enhancedPrompt = `ULTRA HIGH RESOLUTION, 8K QUALITY, PROFESSIONAL DSLR PHOTOGRAPHY: ${prompt}. 
Extremely sharp details, cinematic lighting, rich vibrant colors, HDR, magazine-quality output, 
crystal clear when zoomed, fine textures visible, no blur, no artifacts, photorealistic.`;

  // Image models to try in priority order (best first) - Direct Google AI
  const imageModels = [
    { id: "gemini-2.0-flash-exp-image-generation", name: "Gemini 2.0 Flash Image" },
  ];

  let lastError: string = "";
  
  for (const model of imageModels) {
    try {
      console.log(`IMAGE_GENERATION: Trying ${model.name} (${model.id}) via direct Google AI`);
      
      const response = await fetch(
        `${GOOGLE_AI_URL}/${model.id}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: enhancedPrompt }]
              }
            ],
            generationConfig: {
              responseModalities: ["image", "text"],
              temperature: 1.0
            }
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log(`IMAGE_GENERATION_SUCCESS: Generated with ${model.name}`);
        
        // Extract image from Gemini response format
        const parts = data.candidates?.[0]?.content?.parts || [];
        let imageBase64 = null;
        let textContent = "";
        
        for (const part of parts) {
          if (part.inlineData?.data) {
            const mimeType = part.inlineData.mimeType || "image/png";
            imageBase64 = `data:${mimeType};base64,${part.inlineData.data}`;
          }
          if (part.text) {
            textContent = part.text;
          }
        }
        
        if (imageBase64) {
          // Return in normalized format matching frontend expectations
          return {
            data: {
              id: `google-img-${Date.now()}`,
              object: "chat.completion",
              model: model.id,
              choices: [{
                index: 0,
                message: {
                  role: "assistant",
                  content: textContent,
                  images: [{
                    image_url: {
                      url: imageBase64
                    }
                  }],
                  modelUsed: model.name,
                  modelId: model.id
                },
                finish_reason: "stop"
              }]
            }
          };
        }
        
        // No image in response
        console.error(`IMAGE_GENERATION: ${model.name} returned no image data`);
        lastError = `${model.id}: No image in response`;
      } else {
        const errorText = await response.text();
        lastError = `${model.id}: ${response.status} - ${errorText}`;
        console.error(`IMAGE_GENERATION: ${model.name} failed:`, response.status, errorText.substring(0, 200));
      }
    } catch (err) {
      lastError = `${model.id}: ${String(err)}`;
      console.error(`IMAGE_GENERATION: ${model.name} error:`, err);
    }
  }

  // All models failed
  console.error("IMAGE_GENERATION: All models failed. Last error:", lastError);
  return { error: { status: 500, text: `All image models failed. ${lastError}` } };
}

// Get text content from last message for image prompt
function getTextContent(message: any): string {
  if (typeof message?.content === 'string') {
    return message.content;
  }
  if (Array.isArray(message?.content)) {
    const textPart = message.content.find((c: any) => c.type === 'text');
    return textPart?.text || '';
  }
  return '';
}

// Detect code-related requests for fallback routing
function isCodeRelatedRequest(messages: any[]): boolean {
  const lastMessage = messages[messages.length - 1];
  const content = typeof lastMessage?.content === 'string' 
    ? lastMessage.content.toLowerCase() 
    : Array.isArray(lastMessage?.content) 
      ? lastMessage.content.find((c: any) => c.type === 'text')?.text?.toLowerCase() || ''
      : '';

  const codeKeywords = [
    'code', 'website', 'app', 'application', 'function', 'component',
    'react', 'javascript', 'typescript', 'python', 'html', 'css',
    'api', 'backend', 'frontend', 'database', 'implement', 'build',
    'create', 'develop', 'program', 'script', 'module', 'class',
    'algorithm', 'data structure', 'server', 'client', 'full stack',
  ];

  return codeKeywords.some(keyword => content.includes(keyword));
}

// Determine if an error status is retryable (should trigger fallback)
function isRetryableError(status: number): boolean {
  const retryableStatuses = [
    408, // Request Timeout
    429, // Rate Limit
    500, // Internal Server Error
    502, // Bad Gateway
    503, // Service Unavailable
    504, // Gateway Timeout
  ];
  return retryableStatuses.includes(status);
}

// Check fallback rate limit
function checkFallbackRateLimit(): boolean {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;

  if (now - fallbackUsage.lastReset > oneHour) {
    fallbackUsage.count = 0;
    fallbackUsage.lastReset = now;
  }

  if (fallbackUsage.count >= fallbackUsage.maxPerHour) {
    console.warn("FALLBACK_RATE_LIMIT: OpenRouter hourly limit reached");
    return false;
  }

  fallbackUsage.count++;
  return true;
}

// Call OpenRouter with Codex model for large code generation
async function callOpenRouterCodex(
  messages: any[],
  apiKey: string
): Promise<{ data?: any; error?: { status: number; text: string } }> {
  try {
    console.log("CODEX: Using gpt-5.1-codex for large code generation");
    
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://vertexai.lovable.app",
        "X-Title": "VertexAI",
      },
      body: JSON.stringify({
        model: OPENROUTER_CODE_MODEL,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        stream: false,
        max_tokens: 16000, // Higher limit for large code
      }),
    });

    if (!response.ok) {
      return { error: { status: response.status, text: await response.text() } };
    }

    return { data: await response.json() };
  } catch (networkError) {
    console.error("OpenRouter Codex network error:", networkError);
    return { error: { status: 0, text: String(networkError) } };
  }
}

// Call OpenRouter with general model (fallback)
async function callOpenRouterGeneral(
  messages: any[],
  apiKey: string
): Promise<{ data?: any; error?: { status: number; text: string } }> {
  try {
    console.log("OPENROUTER: Using general model for fallback");
    
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://vertexai.lovable.app",
        "X-Title": "VertexAI",
      },
      body: JSON.stringify({
        model: OPENROUTER_GENERAL_MODEL,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        stream: false,
      }),
    });

    if (!response.ok) {
      return { error: { status: response.status, text: await response.text() } };
    }

    return { data: await response.json() };
  } catch (networkError) {
    console.error("OpenRouter general network error:", networkError);
    return { error: { status: 0, text: String(networkError) } };
  }
}

// Call Google AI Studio directly (PRIMARY - YOUR OWN API KEY)
async function callGoogleAIStudio(
  messages: any[],
  apiKey: string,
  model: string = "gemini-2.5-flash"
): Promise<{ data?: any; error?: { status: number; text: string } }> {
  try {
    console.log("GOOGLE_AI_STUDIO: Using direct Gemini access, model:", model);
    
    // Convert messages to Gemini format
    const contents = messages
      .filter(msg => msg.role !== "system") // System handled separately
      .map(msg => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: Array.isArray(msg.content) 
          ? msg.content.map((part: any) => {
              if (part.type === "text") return { text: part.text };
              if (part.type === "image_url") {
                const base64Match = part.image_url?.url?.match(/^data:(.+);base64,(.+)$/);
                if (base64Match) {
                  return { 
                    inline_data: { 
                      mime_type: base64Match[1], 
                      data: base64Match[2] 
                    } 
                  };
                }
                // URL-based image - return as text description
                return { text: `[Image: ${part.image_url?.url}]` };
              }
              return { text: "" };
            }).filter((p: any) => p.text !== "" || p.inline_data)
          : [{ text: msg.content }]
      }));

    const response = await fetch(
      `${GOOGLE_AI_URL}/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          generationConfig: { 
            maxOutputTokens: 8192,
            temperature: 0.7
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google AI Studio error:", response.status, errorText);
      return { error: { status: response.status, text: errorText } };
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // Normalize to OpenAI format for consistent frontend handling
    return {
      data: {
        id: `google-${Date.now()}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: model,
        choices: [{
          index: 0,
          message: {
            role: "assistant",
            content: content
          },
          finish_reason: "stop"
        }],
        usage: data.usageMetadata || null
      }
    };
  } catch (error) {
    console.error("Google AI Studio network error:", error);
    return { error: { status: 0, text: String(error) } };
  }
}

// Math normalizer: Convert inline equations to display math for ChatGPT-style rendering
function normalizeMathMarkdown(text: string): string {
  // Protect code blocks from modification
  const codeBlocks: string[] = [];
  let protected_text = text.replace(/```[\s\S]*?```/g, (match) => {
    codeBlocks.push(match);
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });
  
  // Protect inline code
  const inlineCodes: string[] = [];
  protected_text = protected_text.replace(/`[^`\n]+`/g, (match) => {
    inlineCodes.push(match);
    return `__INLINE_CODE_${inlineCodes.length - 1}__`;
  });

  // Convert \[...\] to $$...$$ (display math)
  protected_text = protected_text.replace(/\\\[([\s\S]*?)\\\]/g, '\n\n$$$$1$$\n\n');
  
  // Convert \(...\) to $...$ (inline math)
  protected_text = protected_text.replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');

  // Promote equation-like inline math $...$ to display math $$...$$
  // Pattern: single $ that contains equation indicators
  protected_text = protected_text.replace(/(?<!\$)\$(?!\$)((?:[^$]|\\\$)+?)\$(?!\$)/g, (match, inner) => {
    const trimmed = inner.trim();
    
    // Check if it's equation-like (should be display math)
    const isEquationLike = 
      trimmed.includes('=') ||
      trimmed.includes('\\frac') ||
      trimmed.includes('\\int') ||
      trimmed.includes('\\sum') ||
      trimmed.includes('\\lim') ||
      trimmed.includes('\\begin') ||
      trimmed.includes('\\\\') ||
      trimmed.includes('\\sqrt') ||
      trimmed.includes('\\pm') ||
      trimmed.includes('\\cdot') ||
      trimmed.includes('\\times') ||
      trimmed.includes('\\to') ||
      trimmed.includes('\\rightarrow') ||
      trimmed.includes('\\Rightarrow') ||
      trimmed.length > 25; // Long expressions are likely equations
    
    if (isEquationLike) {
      return `\n\n$$${trimmed}$$\n\n`;
    }
    return match;
  });

  // Clean up multiple newlines
  protected_text = protected_text.replace(/\n{3,}/g, '\n\n');

  // Restore inline code
  inlineCodes.forEach((code, i) => {
    protected_text = protected_text.replace(`__INLINE_CODE_${i}__`, code);
  });

  // Restore code blocks
  codeBlocks.forEach((block, i) => {
    protected_text = protected_text.replace(`__CODE_BLOCK_${i}__`, block);
  });

  return protected_text.trim();
}

// Normalize response to ensure consistent shape for frontend
function normalizeResponse(data: any): any {
  let content = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Invalid response structure from AI provider");
  }

  // Apply math normalization to convert inline equations to display math
  content = normalizeMathMarkdown(content);

  return {
    id: data.id || `gen-${Date.now()}`,
    object: "chat.completion",
    created: data.created || Math.floor(Date.now() / 1000),
    model: data.model || "unknown",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: content,
        },
        finish_reason: data.choices?.[0]?.finish_reason || "stop",
      },
    ],
    usage: data.usage || null,
  };
}

// Handle API errors with appropriate responses
function handleAPIError(status: number, errorText?: string): Response {
  if (status === 429) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (status === 402) {
    return new Response(
      JSON.stringify({ error: "API quota exceeded. Please check your API credits." }),
      { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (status === 401 || status === 403) {
    return new Response(
      JSON.stringify({ error: "Authentication error. Please check your API key configuration." }),
      { status: status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (status === 400) {
    return new Response(
      JSON.stringify({ error: "Invalid request. Please try rephrasing your message." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ error: "AI service temporarily unavailable. Please try again." }),
    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, imageMode } = await req.json();
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    
    // GOOGLE_AI_API_KEY is required for self-hosted mode
    if (!GOOGLE_AI_API_KEY) {
      console.error("GOOGLE_AI_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured. Please add GOOGLE_AI_API_KEY." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =====================================
    // ROUTE 0: Image Generation Mode
    // =====================================
    if (isImageGenerationRequest(messages, imageMode === true)) {
      console.log("IMAGE_GENERATION_ROUTE: Generating image with direct Google AI");
      
      const lastMessage = messages[messages.length - 1];
      const prompt = getTextContent(lastMessage);
      
      if (!prompt.trim()) {
        return new Response(
          JSON.stringify({ error: "Please provide a description for the image you want to generate." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const imageResult = await generateImage(prompt, GOOGLE_AI_API_KEY);
      
      // Debug logging to understand API response structure
      console.log("IMAGE_GENERATION_RAW_RESPONSE:", JSON.stringify({
        hasData: !!imageResult.data,
        hasError: !!imageResult.error,
        choicesCount: imageResult.data?.choices?.length,
        messageKeys: imageResult.data?.choices?.[0]?.message ? Object.keys(imageResult.data.choices[0].message) : [],
        imagesArray: imageResult.data?.choices?.[0]?.message?.images,
        content: imageResult.data?.choices?.[0]?.message?.content?.substring?.(0, 200),
      }));
      
      if (imageResult.data) {
        const message = imageResult.data.choices?.[0]?.message;
        
        // Try multiple possible image URL locations
        let imageUrl = message?.images?.[0]?.image_url?.url  // Standard format
                    || message?.images?.[0]?.url              // Alternative format
                    || message?.image_url?.url                // Direct on message
                    || null;
        
        // Get model metadata from generateImage response
        const modelUsed = message?.modelUsed || "Gemini Image";
        const modelId = message?.modelId || "gemini-2.0-flash-exp-image-generation";
        
        if (imageUrl) {
          console.log(`IMAGE_GENERATION_SUCCESS: Image generated with ${modelUsed}`);
          
          // Return image-only response (no text content) with model metadata
          return new Response(JSON.stringify({
            id: `img-${Date.now()}`,
            object: "chat.completion",
            model: modelId,
            choices: [{
              index: 0,
              message: {
                role: "assistant",
                content: "", // Empty content - image only mode
                generatedImages: [{
                  url: imageUrl,
                  prompt: prompt,
                  modelUsed: modelUsed,
                  modelId: modelId
                }]
              },
              finish_reason: "stop"
            }]
          }), {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json; charset=utf-8",
              "Cache-Control": "no-store",
            },
          });
        }
        
        // API returned data but no image - return short Hinglish error
        console.error("IMAGE_GENERATION_NO_IMAGE: API returned success but no image found");
        return new Response(JSON.stringify({
          id: `error-${Date.now()}`,
          object: "chat.completion",
          model: "gemini-2.0-flash-exp-image-generation",
          choices: [{
            index: 0,
            message: {
              role: "assistant",
              content: "Image generate nahi ho paayi. Prompt ko thoda change karo ya different description try karo."
            },
            finish_reason: "stop"
          }]
        }), {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json; charset=utf-8",
          },
        });
      }
      
      // Image generation failed with error
      console.error("IMAGE_GENERATION_FAILED:", imageResult.error?.status, imageResult.error?.text);
      const errorStatus = imageResult.error?.status || 500;
      
      if (errorStatus === 429) {
        return new Response(
          JSON.stringify({ error: "Image generation rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (errorStatus === 402) {
        return new Response(
          JSON.stringify({ error: "API quota exceeded. Please check your Google AI API credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Failed to generate image. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for media content
    const hasImages = messages.some((msg: any) => 
      Array.isArray(msg.content) && 
      msg.content.some((c: any) => c.type === "image_url")
    );
    
    const hasVideoFrames = messages.some((msg: any) => 
      Array.isArray(msg.content) && 
      msg.content.some((c: any) => 
        c.type === "text" && 
        typeof c.text === "string" && 
        c.text.includes("[Video:") && 
        c.text.includes("key frames extracted")
      )
    );
    
    const lastMessage = messages[messages.length - 1];
    const imageCount = Array.isArray(lastMessage?.content) 
      ? lastMessage.content.filter((c: any) => c.type === "image_url").length 
      : 0;

    // Detect request type
    const isLargeCode = isLargeCodeRequest(messages);
    const isCodeRequest = isCodeRelatedRequest(messages);
    const hasMultimodalContent = hasVideoFrames || imageCount > 0;

    console.log("Processing chat request:", { 
      messageCount: messages.length,
      hasImages,
      hasVideoFrames,
      imageCount,
      hasMultimodalContent,
      isLargeCodeRequest: isLargeCode,
      isCodeRelatedRequest: isCodeRequest,
    });

    // =====================================
    // ROUTE 1: Multimodal content → ALWAYS use Gemini (via Google AI Studio)
    // Gemini is best for video frame analysis and image understanding
    // =====================================
    if (hasMultimodalContent) {
      const model = hasVideoFrames || imageCount > 4 ? "gemini-2.5-pro" : "gemini-2.5-flash";
      console.log("MULTIMODAL_ROUTE: Using Google AI Studio Gemini for video/image content, model:", model);

      const googleResult = await callGoogleAIStudio(messages, GOOGLE_AI_API_KEY, model);

      if (googleResult.data) {
        console.log("GEMINI_MULTIMODAL_SUCCESS");
        return new Response(JSON.stringify(normalizeResponse(googleResult.data)), {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
          },
        });
      }

      // Gemini failed → Try OpenRouter as fallback
      console.log("GEMINI_GOOGLE_FAILED:", googleResult.error?.status, "Trying OpenRouter fallback");
      
      if (OPENROUTER_API_KEY && checkFallbackRateLimit()) {
        console.log("OPENROUTER_MULTIMODAL_FALLBACK: Trying codex model");
        const openrouterResult = await callOpenRouterGeneral(messages, OPENROUTER_API_KEY);
        
        if (openrouterResult.data) {
          console.log("OPENROUTER_MULTIMODAL_SUCCESS: Fallback for multimodal content");
          return new Response(JSON.stringify(normalizeResponse(openrouterResult.data)), {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json; charset=utf-8",
              "Cache-Control": "no-store",
            },
          });
        }
        
        console.log("OPENROUTER_MULTIMODAL_FAILED: All multimodal providers failed");
      }
      
      // Return Gemini error if all failed
      const errorStatus = googleResult.error?.status || 500;
      return handleAPIError(errorStatus, googleResult.error?.text);
    }

    // =====================================
    // ROUTE 2: Text-only large code request → Codex primary (via OpenRouter)
    // =====================================
    if (isLargeCode && OPENROUTER_API_KEY) {
      console.log("LARGE_CODE_ROUTE: Text-only, routing to gpt-5.1-codex via OpenRouter");
      
      if (!checkFallbackRateLimit()) {
        console.log("CODEX_SKIP: Rate limit exceeded, falling back to Gemini");
      } else {
        const codexResult = await callOpenRouterCodex(messages, OPENROUTER_API_KEY);
        
        if (codexResult.data) {
          console.log("CODEX_SUCCESS: Large code generated");
          return new Response(JSON.stringify(normalizeResponse(codexResult.data)), {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json; charset=utf-8",
              "Cache-Control": "no-store",
            },
          });
        }
        
        console.log("CODEX_FAILED:", codexResult.error?.status, "Trying Google AI Studio Gemini");
      }
      
      // Codex failed → fallback to Gemini
      const geminiResult = await callGoogleAIStudio(messages, GOOGLE_AI_API_KEY, "gemini-2.5-flash");
      
      if (geminiResult.data) {
        console.log("GEMINI_FALLBACK_SUCCESS: For large code");
        return new Response(JSON.stringify(normalizeResponse(geminiResult.data)), {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
          },
        });
      }
      
      console.log("ALL_LARGE_CODE_PROVIDERS_FAILED");
      return handleAPIError(geminiResult.error?.status || 500, geminiResult.error?.text);
    }

    // =====================================
    // ROUTE 3: Normal request → Google AI Studio Gemini primary
    // =====================================
    const model = "gemini-2.5-flash";
    console.log("GEMINI_ROUTE: Using Google AI Studio, model:", model);

    const geminiResult = await callGoogleAIStudio(messages, GOOGLE_AI_API_KEY, model);

    if (geminiResult.data) {
      return new Response(JSON.stringify(normalizeResponse(geminiResult.data)), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    // =====================================
    // GEMINI FAILED - Check if retryable
    // =====================================
    const errorStatus = geminiResult.error?.status || 0;
    const isNetworkError = errorStatus === 0;

    console.log("GEMINI_ERROR:", { 
      status: errorStatus, 
      isNetworkError, 
      isRetryable: isNetworkError || isRetryableError(errorStatus),
      errorText: geminiResult.error?.text?.substring(0, 200)
    });

    // Non-retryable errors: return directly
    if (!isNetworkError && !isRetryableError(errorStatus)) {
      console.log("NON_RETRYABLE_ERROR: Returning Gemini error directly");
      return handleAPIError(errorStatus, geminiResult.error?.text);
    }

    // =====================================
    // FALLBACK: Gemini failed with retryable error → Try OpenRouter
    // =====================================
    if (!OPENROUTER_API_KEY) {
      console.log("FALLBACK_SKIP: OpenRouter not configured");
      return handleAPIError(errorStatus, geminiResult.error?.text);
    }

    if (!checkFallbackRateLimit()) {
      console.log("FALLBACK_SKIP: Rate limit exceeded");
      return handleAPIError(errorStatus, geminiResult.error?.text);
    }

    console.log("FALLBACK_TRIGGERED", {
      timestamp: new Date().toISOString(),
      geminiErrorStatus: errorStatus,
      hasVideoFrames,
      imageCount,
      isCodeRequest,
    });

    // For code-related requests, try Codex first
    if (isCodeRequest) {
      console.log("FALLBACK: Trying gpt-5.1-codex for code request");
      const codexResult = await callOpenRouterCodex(messages, OPENROUTER_API_KEY);
      
      if (codexResult.data) {
        console.log("FALLBACK_CODEX_SUCCESS");
        return new Response(JSON.stringify(normalizeResponse(codexResult.data)), {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
          },
        });
      }
      
      console.log("FALLBACK_CODEX_FAILED: Trying general model");
    }

    // Try general model as final fallback
    const generalResult = await callOpenRouterGeneral(messages, OPENROUTER_API_KEY);

    if (generalResult.data) {
      console.log("FALLBACK_GENERAL_SUCCESS");
      return new Response(JSON.stringify(normalizeResponse(generalResult.data)), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    // All failed
    console.error("ALL_PROVIDERS_FAILED", {
      geminiStatus: errorStatus,
      openrouterStatus: generalResult.error?.status,
    });
    
    return handleAPIError(errorStatus, geminiResult.error?.text);

  } catch (error) {
    console.error("Chat function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
