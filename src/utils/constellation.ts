import type { EmotionKey } from '../types';
import type { EmotionVector } from '../types';

/** Base colors as RGB [r, g, b] for weighted blending (color engine) */
export const EMOTION_COLORS_RGB: Record<EmotionKey, [number, number, number]> = {
  joy: [255, 204, 0],
  sadness: [80, 120, 255],
  anxiety: [255, 80, 80],
  hope: [80, 255, 120],
  love: [255, 80, 180],
  curiosity: [160, 120, 255],
  peace: [80, 200, 255],
  neutral: [180, 180, 180],
};

/** Hex fallback for labels / single-emotion UI */
export const EMOTION_COLORS: Record<EmotionKey, string> = {
  joy: '#ffcc00',
  sadness: '#5078ff',
  anxiety: '#ff5050',
  hope: '#50ff78',
  love: '#ff50b4',
  curiosity: '#a078ff',
  peace: '#50c8ff',
  neutral: '#b4b4b4',
};

/** Human-readable labels for emotion picker and display */
export const EMOTION_LABELS: Record<EmotionKey, string> = {
  joy: 'Joy',
  sadness: 'Sadness',
  anxiety: 'Anxiety',
  hope: 'Hope',
  love: 'Love',
  curiosity: 'Curiosity',
  peace: 'Peace',
  neutral: 'Neutral',
};

export const EMOTION_KEYS: EmotionKey[] = [
  'joy', 'sadness', 'anxiety', 'hope', 'love', 'curiosity', 'peace', 'neutral',
];

/** Blend color from weighted emotion vector (e.g. Joy 0.7 + Sadness 0.3 → greenish). */
export function mixEmotionColor(vector: EmotionVector): string {
  let r = 0, g = 0, b = 0;
  let total = 0;
  const keys = EMOTION_KEYS as EmotionKey[];
  for (const emotion of keys) {
    const weight = vector[emotion] ?? 0;
    if (weight <= 0) continue;
    const [cr, cg, cb] = EMOTION_COLORS_RGB[emotion];
    r += cr * weight;
    g += cg * weight;
    b += cb * weight;
    total += weight;
  }
  if (total <= 0) {
    const [nr, ng, nb] = EMOTION_COLORS_RGB.neutral;
    return `rgb(${nr}, ${ng}, ${nb})`;
  }
  return `rgb(${Math.round(r / total)}, ${Math.round(g / total)}, ${Math.round(b / total)})`;
}

/** Merge two emotion vectors (average weights, then normalize so sum = 1). */
export function mergeEmotionVectors(a: EmotionVector, b: EmotionVector): EmotionVector {
  const keys = new Set<EmotionKey>([
    ...(EMOTION_KEYS as EmotionKey[]),
    ...(Object.keys(a) as EmotionKey[]),
    ...(Object.keys(b) as EmotionKey[]),
  ]);
  const out: EmotionVector = {};
  let sum = 0;
  for (const k of keys) {
    const va = a[k] ?? 0;
    const vb = b[k] ?? 0;
    const v = (va + vb) / 2;
    if (v > 0) {
      out[k] = v;
      sum += v;
    }
  }
  if (sum <= 0) {
    out.neutral = 1;
    return out;
  }
  for (const k of Object.keys(out) as EmotionKey[]) {
    out[k] = (out[k]! / sum);
  }
  return out;
}

/** One-hot vector for a single emotion (for picker / new thoughts). */
export function emotionToVector(emotion: EmotionKey): EmotionVector {
  const v: EmotionVector = {};
  for (const k of EMOTION_KEYS as EmotionKey[]) {
    v[k] = k === emotion ? 1 : 0;
  }
  return v;
}

/** Get effective emotion vector from a thought (emotionVector or legacy emotion → one-hot). */
export function getThoughtEmotionVector(thought: { emotionVector?: EmotionVector; emotion?: EmotionKey }): EmotionVector {
  if (thought.emotionVector && Object.keys(thought.emotionVector).length > 0) {
    return thought.emotionVector;
  }
  return emotionToVector(thought.emotion ?? 'neutral');
}

/** Get display color for a thought (from vector blend or legacy color). */
export function getThoughtColor(thought: { emotionVector?: EmotionVector; emotion?: EmotionKey; color?: string }): string {
  if (thought.emotionVector && Object.keys(thought.emotionVector).length > 0) {
    return mixEmotionColor(thought.emotionVector);
  }
  if (thought.color) return thought.color;
  return mixEmotionColor(emotionToVector(thought.emotion ?? 'neutral'));
}

export function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [120, 120, 120];
}

/** Legacy: mix two hex/rgb colors (equal weight). Prefer mixEmotionColor for vectors. */
export function mixColors(c1: string, c2: string): string {
  const rgb1 = c1.startsWith('rgb')
    ? (c1.match(/\d+/g) || []).map(Number) as [number, number, number]
    : hexToRgb(c1);
  const rgb2 = c2.startsWith('rgb')
    ? (c2.match(/\d+/g) || []).map(Number) as [number, number, number]
    : hexToRgb(c2);
  const mixed = rgb1.map((v, i) => Math.round((v + rgb2[i]) / 2)) as [number, number, number];
  return `rgb(${mixed[0]}, ${mixed[1]}, ${mixed[2]})`;
}

/** Extract keywords from text (words longer than 4 chars, max 3) */
export function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 4)
    .slice(0, 3);
}

/** Default size for a thought node from text length */
export function defaultNodeSize(textLength: number): number {
  return 60 + Math.min(Math.floor(textLength / 4), 50);
}

/** Default position for a thought by index (spiral layout) */
export function defaultPosition(index: number): { x: number; y: number } {
  const angle = index * 0.8;
  const r = 80 + index * 25;
  return {
    x: Math.cos(angle) * r,
    y: Math.sin(angle) * r,
  };
}
