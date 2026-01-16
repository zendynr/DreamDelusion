import { useState } from 'react';
import { Thought, ThoughtTag } from './types';

interface ThoughtDetailProps {
  thought: Thought | null;
  onUpdate: (thought: Thought) => void;
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
  onStartCapture: () => void;
  onClose?: () => void;
}

const allTags: ThoughtTag[] = ['Idea', 'Task', 'Reflection', 'Random'];

const formatDateTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds} seconds`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (secs === 0) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  return `${minutes}m ${secs}s`;
};

export default function ThoughtDetail({
  thought,
  onUpdate,
  onDelete,
  onPin,
  onStartCapture,
  onClose,
}: ThoughtDetailProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!thought) {
    return (
      <div className="thought-detail-empty">
        <div className="thought-detail-empty-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
          </svg>
        </div>
        <h3 className="thought-detail-empty-title">Select a thought</h3>
        <p className="thought-detail-empty-text">
          Select a thought on the left or start capturing a new one.
        </p>
        <button className="thought-detail-empty-button" onClick={onStartCapture}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          Start Capturing Thought
        </button>
      </div>
    );
  }

  const handleTitleEdit = () => {
    setTitleValue(thought.title || thought.text.substring(0, 50));
    setEditingTitle(true);
  };

  const handleTitleSave = () => {
    if (titleValue.trim()) {
      onUpdate({
        ...thought,
        title: titleValue.trim(),
      });
    }
    setEditingTitle(false);
  };

  const handleTitleCancel = () => {
    setEditingTitle(false);
    setTitleValue('');
  };

  const toggleTag = (tag: ThoughtTag) => {
    const newTags = thought.tags.includes(tag)
      ? thought.tags.filter(t => t !== tag)
      : [...thought.tags, tag];
    onUpdate({
      ...thought,
      tags: newTags,
    });
  };

  return (
    <div className="thought-detail">
      {onClose && (
        <div className="thought-detail-top-actions">
          <button
            className="thought-detail-back-btn"
            onClick={onClose}
            aria-label="Back"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            className="thought-detail-delete-top-btn"
            onClick={() => setShowDeleteConfirm(true)}
            aria-label="Delete"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}
      
      <div className="thought-detail-header">
        {editingTitle ? (
          <div className="thought-detail-title-edit">
            <input
              type="text"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSave();
                if (e.key === 'Escape') handleTitleCancel();
              }}
              autoFocus
              className="thought-detail-title-input"
            />
          </div>
        ) : (
          <h2 className="thought-detail-title" onClick={handleTitleEdit}>
            {thought.title || thought.text.substring(0, 50)}
          </h2>
        )}
      </div>

      <div className="thought-detail-meta">
        <div className="thought-detail-meta-item">
          <span className="thought-detail-meta-label">Time:</span>
          <span className="thought-detail-meta-value">{formatDateTime(thought.timestamp)}</span>
        </div>
        <div className="thought-detail-meta-item">
          <span className="thought-detail-meta-label">Duration:</span>
          <span className="thought-detail-meta-value">{formatDuration(thought.durationSeconds)}</span>
        </div>
      </div>

      <div className="thought-detail-tags-section">
        <div className="thought-detail-tags-label">Tags:</div>
        <div className="thought-detail-tags">
          {allTags.map((tag) => (
            <button
              key={tag}
              className={`thought-detail-tag ${thought.tags.includes(tag) ? 'active' : ''}`}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Audio Player */}
      {thought.audioUrl && (
        <div className="thought-detail-media" style={{
          marginBottom: '24px',
          padding: '16px',
          background: 'var(--bg-secondary, rgba(0,0,0,0.05))',
          borderRadius: '8px',
        }}>
          <div className="thought-detail-media-label" style={{
            marginBottom: '12px',
            fontWeight: '500',
            fontSize: '0.875rem',
            color: 'var(--text-secondary)',
          }}>
            Voice Note:
          </div>
          <audio
            controls
            src={thought.audioUrl}
            style={{
              width: '100%',
              height: '40px',
            }}
          >
            Your browser does not support the audio element.
          </audio>
        </div>
      )}

      {/* Video Player */}
      {thought.videoUrl && (
        <div className="thought-detail-media" style={{
          marginBottom: '24px',
          padding: '16px',
          background: 'var(--bg-secondary, rgba(0,0,0,0.05))',
          borderRadius: '8px',
        }}>
          <div className="thought-detail-media-label" style={{
            marginBottom: '12px',
            fontWeight: '500',
            fontSize: '0.875rem',
            color: 'var(--text-secondary)',
          }}>
            Screen Recording:
          </div>
          <video
            controls
            src={thought.videoUrl}
            style={{
              width: '100%',
              maxHeight: '400px',
              borderRadius: '4px',
            }}
          >
            Your browser does not support the video element.
          </video>
        </div>
      )}

      <div className="thought-detail-transcript">
        <div className="thought-detail-transcript-label">
          {thought.recordingType === 'transcription' ? 'Transcript:' : 'Notes:'}
        </div>
        <div className="thought-detail-transcript-text">{thought.text}</div>
      </div>

      <div className="thought-detail-actions">
        <button
          className="thought-detail-action-btn"
          onClick={() => onPin(thought.id)}
        >
          {thought.pinned ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '16px', height: '16px', marginRight: '6px' }}>
                <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
              </svg>
              Unpin
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px', marginRight: '6px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
              Pin
            </>
          )}
        </button>
        <button
          className="thought-detail-action-btn"
          onClick={() => {
            // Placeholder for AI feature
            alert('AI feature coming soon!');
          }}
        >
          Ask AI about this thought
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Thought</h3>
            <p>Are you sure you want to delete this thought? This action cannot be undone.</p>
            <div className="modal-actions">
              <button
                className="account-button"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="account-button danger"
                onClick={() => {
                  onDelete(thought.id);
                  setShowDeleteConfirm(false);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

