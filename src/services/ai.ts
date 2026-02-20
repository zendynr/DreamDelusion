/**
 * Ask AI about a thought.
 * With VITE_GEMINI_API_KEY set: uses Google Gemini API.
 * Without a key: uses public demo mode (mock responses) so you can test the feature.
 */

export type AskAiMode = 'explain-10' | 'summarise';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

const DEMO_LABEL = ' (demo — add VITE_GEMINI_API_KEY for real AI)';

/** Mock responses when no API key — lets you test the UI with no sign-up */
function getDemoResponse(thoughtText: string, mode: AskAiMode): string {
  const words = thoughtText.trim().split(/\s+/).filter(Boolean);
  if (mode === 'explain-10') {
    const short = words.slice(0, 10).join(' ');
    return (short || 'A brief thought.') + DEMO_LABEL;
  }
  const summary =
    words.length <= 15
      ? `This thought is about: "${thoughtText.trim().slice(0, 120)}${thoughtText.length > 120 ? '…' : ''}".`
      : `In short: ${words.slice(0, 20).join(' ')}… (${words.length} words in total).`;
  return summary + DEMO_LABEL;
}

function getPrompt(mode: AskAiMode, thoughtText: string): string {
  const text = thoughtText.trim();
  if (mode === 'explain-10') {
    return `Explain this thought in exactly 10 words or fewer. Be concise and evocative. Reply with only the explanation, no quotes or preamble.\n\nThought: "${text}"`;
  }
  return `Summarise this thought in 1–3 short sentences. Keep the tone and key idea. Reply with only the summary.\n\nThought: "${text}"`;
}

export type AskAiResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

export async function askAiAboutThought(thoughtText: string, mode: AskAiMode): Promise<AskAiResult> {
  if (!thoughtText?.trim()) {
    return { ok: false, error: 'No thought text to analyse.' };
  }

  // No API key: use public demo mode (mock) so you can test without sign-up
  if (!GEMINI_API_KEY?.trim()) {
    await new Promise((r) => setTimeout(r, 600));
    return { ok: true, text: getDemoResponse(thoughtText, mode) };
  }

  const prompt = getPrompt(mode, thoughtText);
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: mode === 'explain-10' ? 64 : 256,
      temperature: 0.4,
    },
  };

  try {
    const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(GEMINI_API_KEY.trim())}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (!res.ok) {
      const message = data?.error?.message || data?.message || `HTTP ${res.status}`;
      return { ok: false, error: message };
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) {
      return { ok: false, error: 'No response from AI.' };
    }
    return { ok: true, text };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Network or request failed.';
    return { ok: false, error: message };
  }
}

/** Always true so Ask AI is available; uses demo mode when no API key is set */
export function isAiAvailable(): boolean {
  return true;
}
