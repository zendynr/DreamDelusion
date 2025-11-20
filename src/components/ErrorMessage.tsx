interface ErrorMessageProps {
  error: string | null;
  onDismiss: () => void;
}

export default function ErrorMessage({ error, onDismiss }: ErrorMessageProps) {
  if (!error) return null;

  return (
    <div className="error-message" style={{ 
      position: 'fixed', 
      bottom: '20px', 
      left: '50%', 
      transform: 'translateX(-50%)', 
      zIndex: 100 
    }}>
      {error}
      <button
        className="error-dismiss"
        onClick={onDismiss}
        title="Dismiss"
        aria-label="Dismiss error"
      >
        ×
      </button>
    </div>
  );
}

