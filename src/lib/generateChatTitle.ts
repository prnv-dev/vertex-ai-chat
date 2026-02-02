/**
 * Generate a concise, meaningful chat title from user message
 * Max length: ~40 characters or 4-6 words
 */

const FILLER_WORDS = new Set([
  // Greetings & politeness
  'hi', 'hello', 'hey', 'hii', 'hiii', 'yo', 'sup',
  'please', 'pls', 'plz', 'kindly', 'thanks', 'thank', 'you',
  'bro', 'dude', 'man', 'sir', 'madam', 'dear',
  // Common request starters
  'can', 'could', 'would', 'will', 'should',
  'give', 'get', 'want', 'need', 'like',
  'me', 'i', 'my', 'we', 'our', 'us',
  'a', 'an', 'the', 'some', 'any',
  'just', 'only', 'also', 'too', 'very', 'really',
  'help', 'helping', 'show', 'tell', 'explain',
  // Filler phrases
  'know', 'how', 'what', 'where', 'when', 'why', 'which',
  'do', 'does', 'did', 'is', 'are', 'was', 'were', 'be', 'been',
  'have', 'has', 'had', 'having',
  'this', 'that', 'these', 'those', 'it', 'its',
  'about', 'for', 'with', 'without', 'from', 'to', 'of', 'in', 'on', 'at',
  'and', 'or', 'but', 'so', 'if', 'then',
  'make', 'create', 'build', 'write', 'code', 'develop',
  'full', 'complete', 'entire', 'whole', 'simple', 'basic', 'easy',
  'source', 'working', 'example', 'sample',
]);

const TECHNICAL_KEYWORDS = new Set([
  // Languages
  'javascript', 'typescript', 'python', 'java', 'html', 'css', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'c', 'cpp',
  // Frameworks
  'react', 'vue', 'angular', 'next', 'nextjs', 'node', 'nodejs', 'express', 'django', 'flask', 'spring', 'laravel',
  // Concepts
  'api', 'database', 'sql', 'mongodb', 'firebase', 'supabase', 'auth', 'authentication', 'login', 'signup', 'register',
  'array', 'arrays', 'object', 'objects', 'function', 'functions', 'class', 'classes', 'loop', 'loops',
  'component', 'components', 'hook', 'hooks', 'state', 'props', 'context', 'redux',
  'frontend', 'backend', 'fullstack', 'web', 'mobile', 'app', 'application', 'website', 'page', 'pages',
  'button', 'form', 'input', 'modal', 'dialog', 'table', 'list', 'card', 'navbar', 'sidebar', 'footer', 'header',
  'portfolio', 'dashboard', 'landing', 'blog', 'ecommerce', 'chat', 'todo', 'calculator', 'game',
  'animation', 'animations', 'transition', 'transitions', 'responsive', 'dark', 'light', 'theme',
  'error', 'bug', 'fix', 'debug', 'issue', 'problem',
  'sort', 'search', 'filter', 'pagination', 'scroll', 'drag', 'drop',
  'image', 'images', 'video', 'videos', 'file', 'files', 'upload', 'download',
]);

const FALLBACK_TITLES = [
  'New Chat',
  'Code Question',
  'Programming Help',
  'Tech Question',
];

const MAX_CHARS = 40;
const MAX_WORDS = 6;

function cleanWord(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function capitalizeWords(text: string): string {
  return text
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function truncateWithEllipsis(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  
  // Find the last space before maxLength
  const truncated = text.slice(0, maxLength - 1);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.5) {
    return truncated.slice(0, lastSpace) + '…';
  }
  
  return truncated + '…';
}

export function generateChatTitle(message: string): string {
  if (!message || !message.trim()) {
    return FALLBACK_TITLES[0];
  }

  // Clean and tokenize
  const words = message
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0);

  if (words.length === 0) {
    return FALLBACK_TITLES[0];
  }

  // Extract meaningful words (prioritize technical keywords)
  const technicalWords: string[] = [];
  const otherMeaningfulWords: string[] = [];

  for (const word of words) {
    const cleaned = cleanWord(word);
    if (!cleaned || cleaned.length < 2) continue;
    
    if (TECHNICAL_KEYWORDS.has(cleaned)) {
      if (!technicalWords.includes(cleaned)) {
        technicalWords.push(cleaned);
      }
    } else if (!FILLER_WORDS.has(cleaned) && cleaned.length >= 3) {
      if (!otherMeaningfulWords.includes(cleaned)) {
        otherMeaningfulWords.push(cleaned);
      }
    }
  }

  // Combine technical words first, then other meaningful words
  const meaningfulWords = [...technicalWords, ...otherMeaningfulWords];

  if (meaningfulWords.length === 0) {
    return FALLBACK_TITLES[0];
  }

  // Take up to MAX_WORDS
  const selectedWords = meaningfulWords.slice(0, MAX_WORDS);
  
  // Build title
  let title = capitalizeWords(selectedWords.join(' '));

  // Add context suffix for common patterns
  if (selectedWords.length <= 2) {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('explain') || lowerMessage.includes('what is') || lowerMessage.includes('how does')) {
      title += ' Explained';
    } else if (lowerMessage.includes('error') || lowerMessage.includes('bug') || lowerMessage.includes('fix')) {
      title += ' Fix';
    } else if (lowerMessage.includes('example') || lowerMessage.includes('sample')) {
      title += ' Example';
    } else if (lowerMessage.includes('tutorial') || lowerMessage.includes('learn') || lowerMessage.includes('guide')) {
      title += ' Guide';
    }
  }

  // Truncate if still too long
  title = truncateWithEllipsis(title, MAX_CHARS);

  return title || FALLBACK_TITLES[0];
}
