import { useEffect, useRef } from 'react';
import { animations } from '../utils/animations';

interface AnimatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export default function AnimatedModal({ isOpen, onClose, children, title }: AnimatedModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (overlayRef.current) {
        animations.fadeInScale(overlayRef.current, 0);
      }
      if (contentRef.current) {
        animations.modalIn(contentRef.current);
      }
    } else {
      if (overlayRef.current) {
        animations.fadeOut(overlayRef.current, 0.2);
      }
      if (contentRef.current) {
        animations.fadeOut(contentRef.current, 0.2);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      ref={overlayRef}
      className="modal-overlay" 
      onClick={onClose}
      style={{ opacity: 0 }}
    >
      <div 
        ref={contentRef}
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ opacity: 0 }}
      >
        {title && <h3>{title}</h3>}
        {children}
      </div>
    </div>
  );
}
