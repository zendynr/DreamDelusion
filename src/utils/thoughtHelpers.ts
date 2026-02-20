import { Thought, ThoughtTag } from '../types';
import type { EmotionKey } from '../types';
import {
  EMOTION_KEYS,
  emotionToVector,
  mergeEmotionVectors,
  getThoughtEmotionVector,
  mixEmotionColor,
  extractKeywords,
  defaultNodeSize,
} from './constellation';

// Generate a unique ID for a thought
export function generateThoughtId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

// Create a new thought from text. Emotion can be set when finishing (stored as one-hot emotionVector).
export function createThought(
  text: string,
  tags: ThoughtTag[] = [],
  durationSeconds: number = 0,
  emotion?: EmotionKey
): Thought {
  const trimmed = text.trim();
  const chosenEmotion = emotion ?? (EMOTION_KEYS[Math.floor(Math.random() * EMOTION_KEYS.length)] as EmotionKey);
  const emotionVector = emotionToVector(chosenEmotion);
  return {
    id: generateThoughtId(),
    timestamp: new Date().toISOString(),
    text: trimmed,
    title: trimmed.substring(0, 50) + (trimmed.length > 50 ? '...' : ''),
    tags,
    pinned: false,
    durationSeconds,
    emotion: chosenEmotion,
    emotionVector,
    x: (Math.random() - 0.5) * 200,
    y: (Math.random() - 0.5) * 200,
    size: defaultNodeSize(trimmed.length),
    color: mixEmotionColor(emotionVector),
    keywords: extractKeywords(trimmed),
  };
}

/** Merge two thoughts into one: merged content + blended emotion vector. Caller must delete A & B and transfer links. */
export function mergeTwoThoughts(t1: Thought, t2: Thought): Thought {
  const mergedX = ((t1.x ?? 0) + (t2.x ?? 0)) / 2;
  const mergedY = ((t1.y ?? 0) + (t2.y ?? 0)) / 2;
  const vec1 = getThoughtEmotionVector(t1);
  const vec2 = getThoughtEmotionVector(t2);
  const mergedVector = mergeEmotionVectors(vec1, vec2);
  const mergedColor = mixEmotionColor(mergedVector);
  const dominant = ((): EmotionKey => {
    let maxK: EmotionKey = 'neutral';
    let maxV = 0;
    for (const k of EMOTION_KEYS as EmotionKey[]) {
      const v = mergedVector[k] ?? 0;
      if (v > maxV) {
        maxV = v;
        maxK = k;
      }
    }
    return maxK;
  })();
  const size1 = t1.size ?? defaultNodeSize(t1.text.length);
  const size2 = t2.size ?? defaultNodeSize(t2.text.length);
  const title1 = (t1.title || t1.text).split(/\s+/)[0] || 'A';
  const title2 = (t2.title || t2.text).split(/\s+/)[0] || 'B';
  const keywords = Array.from(new Set([...(t1.keywords ?? []), ...(t2.keywords ?? [])]));
  const mergedText = `${t1.text} — ${t2.text}`;
  return {
    id: generateThoughtId(),
    timestamp: new Date().toISOString(),
    text: mergedText,
    title: `Synthesis: ${title1} & ${title2}`,
    tags: Array.from(new Set([...t1.tags, ...t2.tags])),
    pinned: t1.pinned || t2.pinned,
    durationSeconds: t1.durationSeconds + t2.durationSeconds,
    emotion: dominant,
    emotionVector: mergedVector,
    x: mergedX,
    y: mergedY,
    size: Math.min(180, size1 + size2 * 0.4),
    color: mergedColor,
    keywords,
  };
}

// Merge thoughts arrays, prioritizing Firebase thoughts
export function mergeThoughts(firebaseThoughts: Thought[], localThoughts: Thought[]): Thought[] {
  const firebaseMap = new Map(firebaseThoughts.map(t => [t.id, t]));

  localThoughts.forEach(localThought => {
    if (!firebaseMap.has(localThought.id)) {
      firebaseThoughts.push(localThought);
    }
  });

  return firebaseThoughts.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

/** Transfer all graph connections from id1 and id2 to mergedId (rewire then remove originals). */
export function transferConnections(
  links: { from: string; to: string }[],
  id1: string,
  id2: string,
  mergedId: string
): { from: string; to: string }[] {
  const removed = new Set([id1, id2]);
  const others = new Set<string>();
  for (const l of links) {
    if (removed.has(l.from) || removed.has(l.to)) {
      const other = l.from === id1 || l.from === id2 ? l.to : l.from;
      if (other !== mergedId) others.add(other);
    }
  }
  const kept = links.filter(l => !removed.has(l.from) && !removed.has(l.to));
  const canonical = (a: string, b: string) => (a < b ? [a, b] : [b, a]).join(',');
  const seen = new Set(kept.map(l => canonical(l.from, l.to)));
  for (const other of others) {
    const key = canonical(mergedId, other);
    if (!seen.has(key)) {
      seen.add(key);
      kept.push({ from: mergedId, to: other });
    }
  }
  return kept;
}
