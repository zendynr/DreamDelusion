import { useState, useMemo } from 'react';
import { Thought, ThoughtTag } from './types';
import ThoughtCard from './ThoughtCard';
import ThoughtDetail from './ThoughtDetail';

interface LibraryViewProps {
  thoughts: Thought[];
  selectedThoughtId: string | null;
  selectedTag: ThoughtTag | 'All';
  onSelectThought: (id: string | null) => void;
  onUpdateThought: (thought: Thought) => void;
  onDeleteThought: (id: string) => void;
  onDeleteAllThoughts: () => void;
  onPinThought: (id: string) => void;
  onStartCapture: () => void;
  onTagChange: (tag: ThoughtTag | 'All') => void;
}

type TimeGroup = 'Today' | 'Yesterday' | 'This Week' | 'Earlier';

interface GroupedThoughts {
  group: TimeGroup;
  thoughts: Thought[];
}

const groupThoughtsByTime = (thoughts: Thought[]): GroupedThoughts[] => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const thisWeek = new Date(today);
  thisWeek.setDate(thisWeek.getDate() - 7);

  const groups: Record<TimeGroup, Thought[]> = {
    Today: [],
    Yesterday: [],
    'This Week': [],
    Earlier: [],
  };

  thoughts.forEach((thought) => {
    const thoughtDate = new Date(thought.timestamp);
    if (thoughtDate >= today) {
      groups.Today.push(thought);
    } else if (thoughtDate >= yesterday) {
      groups.Yesterday.push(thought);
    } else if (thoughtDate >= thisWeek) {
      groups['This Week'].push(thought);
    } else {
      groups.Earlier.push(thought);
    }
  });

  // Sort thoughts within each group (newest first)
  Object.values(groups).forEach((groupThoughts) => {
    groupThoughts.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  });

  return Object.entries(groups)
    .filter(([_, thoughts]) => thoughts.length > 0)
    .map(([group, thoughts]) => ({ group: group as TimeGroup, thoughts }));
};

export default function LibraryView({
  thoughts,
  selectedThoughtId,
  selectedTag,
  onSelectThought,
  onUpdateThought,
  onDeleteThought,
  onDeleteAllThoughts,
  onPinThought,
  onStartCapture,
  onTagChange,
}: LibraryViewProps) {
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  const filteredThoughts = useMemo(() => {
    if (selectedTag === 'All') return thoughts;
    return thoughts.filter(t => t.tags.includes(selectedTag));
  }, [thoughts, selectedTag]);

  const groupedThoughts = useMemo(() => {
    // Separate pinned thoughts
    const pinned = filteredThoughts.filter(t => t.pinned);
    const unpinned = filteredThoughts.filter(t => !t.pinned);
    
    // Group unpinned thoughts
    const grouped = groupThoughtsByTime(unpinned);
    
    // Add pinned group at the top if there are any
    if (pinned.length > 0) {
      return [
        { group: 'Pinned' as any, thoughts: pinned },
        ...grouped,
      ];
    }
    
    return grouped;
  }, [filteredThoughts]);

  const selectedThought: Thought | null = selectedThoughtId
    ? thoughts.find(t => t.id === selectedThoughtId) || null
    : null;

  const filterTags: (ThoughtTag | 'All')[] = ['All', 'Idea', 'Task', 'Reflection', 'Random'];

  return (
    <div className="library-view">
      <div className="library-sidebar">
        <div className="library-filters">
          {filterTags.map((tag) => (
            <button
              key={tag}
              className={`library-filter-chip ${selectedTag === tag ? 'active' : ''}`}
              onClick={() => onTagChange(tag)}
            >
              {tag}
            </button>
          ))}
          {thoughts.length > 0 && (
            <button
              className="library-delete-all-btn"
              onClick={() => setShowDeleteAllConfirm(true)}
              title="Delete all thoughts"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>

        <div className="library-thoughts-list">
          {groupedThoughts.length === 0 ? (
            <div className="library-empty">
              <p>No thoughts yet.</p>
              <button className="library-empty-button" onClick={onStartCapture}>
                Start Capturing
              </button>
            </div>
          ) : (
            groupedThoughts.map(({ group, thoughts: groupThoughts }) => (
              <div key={group} className="library-time-group">
                <div className="library-time-group-header">{group}</div>
                {groupThoughts.map((thought) => (
                  <ThoughtCard
                    key={thought.id}
                    thought={thought}
                    isSelected={thought.id === selectedThoughtId}
                    onClick={() => onSelectThought(thought.id)}
                    onPin={onPinThought}
                    onDelete={onDeleteThought}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      {selectedThought && (
        <div className="library-detail-overlay" onClick={() => onSelectThought(null)}>
          <div className="library-detail-panel" onClick={(e) => e.stopPropagation()}>
            <ThoughtDetail
              thought={selectedThought}
              onUpdate={onUpdateThought}
              onDelete={(id) => {
                onDeleteThought(id);
                onSelectThought(null);
              }}
              onPin={onPinThought}
              onStartCapture={onStartCapture}
              onClose={() => onSelectThought(null)}
            />
          </div>
        </div>
      )}
      
      {/* Desktop detail panel - hidden on mobile */}
      <div className="library-detail-panel-desktop">
        <ThoughtDetail
          thought={selectedThought}
          onUpdate={onUpdateThought}
          onDelete={onDeleteThought}
          onPin={onPinThought}
          onStartCapture={onStartCapture}
          onClose={undefined}
        />
      </div>

      {/* Delete All Confirmation Modal */}
      {showDeleteAllConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteAllConfirm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Delete All Thoughts</h3>
            <p>Are you sure you want to delete all {thoughts.length} thought{thoughts.length !== 1 ? 's' : ''}? This action cannot be undone.</p>
            <div className="modal-actions">
              <button
                className="account-button"
                onClick={() => setShowDeleteAllConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="account-button danger"
                onClick={() => {
                  onDeleteAllThoughts();
                  setShowDeleteAllConfirm(false);
                  onSelectThought(null);
                }}
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

