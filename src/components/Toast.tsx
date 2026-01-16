import { useEffect, useRef } from 'react';
import { animations } from '../utils/animations';

interface ToastProps {
  message: string | null;
}

export default function Toast({ message }: ToastProps) {
  const toastRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message && toastRef.current) {
      // Animate in
      animations.toastIn(toastRef.current);
    } else if (toastRef.current && !message) {
      // Animate out
      animations.toastOut(toastRef.current);
    }
  }, [message]);

  if (!message) return null;
  
  return (
    <div ref={toastRef} className="toast-message">
      {message}
    </div>
  );
}

