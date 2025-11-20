// Helper function to get last N words for display only
export function getLastWords(text: string, count: number = 20): string {
  if (!text.trim()) return '';
  const words = text.trim().split(/\s+/);
  if (words.length <= count) return text.trim();
  return words.slice(words.length - count).join(' ');
}

// Combine text with proper spacing
export function combineText(final: string, interim: string): string {
  const finalTrimmed = final.trim();
  const interimTrimmed = interim.trim();
  
  if (!finalTrimmed) return interimTrimmed;
  if (!interimTrimmed) return finalTrimmed;
  
  return (finalTrimmed + ' ' + interimTrimmed).replace(/\s+/g, ' ').trim();
}

