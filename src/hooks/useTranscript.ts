// Custom hook to manage transcript state and operations
let finalTranscript = '';
let lastProcessedFinalText = '';
let currentInterimText = '';

export function useTranscript() {
  const resetTranscript = () => {
    finalTranscript = '';
    lastProcessedFinalText = '';
    currentInterimText = '';
  };

  const addFinalText = (text: string): boolean => {
    const newText = text.trim();
    if (!newText) return false;

    // Prevent duplicates
    const isDuplicate = newText === lastProcessedFinalText || 
                       (finalTranscript && finalTranscript.endsWith(newText));
    
    if (!isDuplicate) {
      finalTranscript = finalTranscript 
        ? (finalTranscript + ' ' + newText).replace(/\s+/g, ' ').trim()
        : newText;
      lastProcessedFinalText = newText;
      return true;
    }
    return false;
  };

  const setInterimText = (text: string) => {
    currentInterimText = text.trim();
  };

  const clearInterimText = () => {
    currentInterimText = '';
  };

  const getCompleteText = (): string => {
    let completeText = finalTranscript.trim();
    if (currentInterimText.trim()) {
      completeText = completeText 
        ? (completeText + ' ' + currentInterimText.trim()).replace(/\s+/g, ' ').trim()
        : currentInterimText.trim();
    }
    return completeText;
  };

  const getFinalTranscript = (): string => finalTranscript;

  return {
    resetTranscript,
    addFinalText,
    setInterimText,
    clearInterimText,
    getCompleteText,
    getFinalTranscript,
  };
}

