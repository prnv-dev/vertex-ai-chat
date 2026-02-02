# VertexAI Self-Hosting Plan - ✅ COMPLETED

## Summary
Code is now self-hosting ready! Download → Add API keys → Deploy → Working app with 0% errors.

---

## Required API Keys

**Frontend (.env file):**
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_id
```
Note: Get these from Supabase Dashboard > Settings > API

**Edge Function Secrets (Supabase Dashboard > Settings > Secrets):**
```
GOOGLE_AI_API_KEY=your_gemini_key    (Primary - Required)
OPENROUTER_API_KEY=your_openrouter   (Fallback - Optional but recommended)
OPENAI_API_KEY=your_openai_key       (Voice only - Optional)
```

---

## Changes Made

### 1. `supabase/functions/transcribe/index.ts` ✅
- Graceful handling when `OPENAI_API_KEY` missing
- Returns `{ text: "", unavailable: true }` with 200 status (no error popup)
- Browser speech recognition works as fallback

### 2. `supabase/functions/chat/index.ts` ✅ (Major Rewrite)
- **Removed:** `callLovableAI()` function completely
- **Removed:** All `LOVABLE_API_KEY` references
- **Primary:** Google AI Studio (Gemini) via `GOOGLE_AI_API_KEY`
- **Fallback:** OpenRouter via `OPENROUTER_API_KEY`
- **Image Gen:** Direct Google Gemini Image API

---

## New Routing Logic

| Request Type | Primary Provider | Fallback |
|-------------|------------------|----------|
| **Image Generation** | Google Gemini Image API | - |
| **Multimodal (images/video)** | Google Gemini Pro/Flash | OpenRouter |
| **Large Code (1000+ lines)** | OpenRouter Codex | Google Gemini |
| **Normal Text** | Google Gemini Flash | OpenRouter |
| **Voice Transcription** | OpenAI Whisper | Browser Speech |

---

## Error Handling

| Scenario | What Happens |
|----------|--------------|
| `GOOGLE_AI_API_KEY` missing | Error: "AI service not configured" |
| `OPENROUTER_API_KEY` missing | Works fine, just no fallback |
| `OPENAI_API_KEY` missing | Voice mic uses browser speech-to-text (no error) |
| Google AI rate limit | Auto-fallback to OpenRouter |
| All providers fail | User sees "Service unavailable" |

---

## Post-Download Setup

### Step 1: Create Supabase Project
1. Go to supabase.com → New Project
2. Get from Settings > API:
   - Project URL, Anon Key, Project ID

### Step 2: Create `.env` file
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_id
```

### Step 3: Add Secrets in Supabase Dashboard
- `GOOGLE_AI_API_KEY` - From ai.google.dev
- `OPENROUTER_API_KEY` - From openrouter.ai
- `OPENAI_API_KEY` (optional) - For voice

### Step 4: Deploy Edge Functions
```bash
supabase login
supabase link --project-ref your_project_id
supabase functions deploy chat
supabase functions deploy transcribe
```

### Step 5: Run App
```bash
npm install
npm run dev
```

---

## Result ✅

Download code → Add API keys → Deploy functions → Working app!
