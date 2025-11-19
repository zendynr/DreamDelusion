type Mode = 'capture' | 'library';

interface ModeToggleProps {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
}

export default function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <div className="mode-toggle">
      <button
        className={`mode-toggle-btn ${mode === 'capture' ? 'active' : ''}`}
        onClick={() => onModeChange('capture')}
      >
        Capture
      </button>
      <button
        className={`mode-toggle-btn ${mode === 'library' ? 'active' : ''}`}
        onClick={() => onModeChange('library')}
      >
        Library
      </button>
    </div>
  );
}

