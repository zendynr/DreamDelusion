import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Zap, ZoomIn, ZoomOut } from 'lucide-react';
import { Thought } from './types';
import {
  getThoughtColor,
  defaultPosition,
  defaultNodeSize,
  extractKeywords,
} from './utils/constellation';
import ThoughtDetail from './ThoughtDetail';

interface LibraryConstellationViewProps {
  thoughts: Thought[];
  selectedThoughtId: string | null;
  onSelectThought: (id: string | null) => void;
  onUpdateThought: (thought: Thought) => void;
  onDeleteThought: (id: string) => void;
  onMergeThoughts: (id1: string, id2: string) => void;
  onPinThought: (id: string) => void;
  manualLinks: { from: string; to: string }[];
  setManualLinks: React.Dispatch<React.SetStateAction<{ from: string; to: string }[]>>;
  bursts: Array<{ id: number; x: number; y: number; color: string }>;
  onStartCapture: () => void;
}

function thoughtNode(thought: Thought, index: number) {
  const pos = defaultPosition(index);
  return {
    ...thought,
    x: thought.x ?? pos.x,
    y: thought.y ?? pos.y,
    size: thought.size ?? defaultNodeSize(thought.text.length),
    color: getThoughtColor(thought),
    keywords: thought.keywords ?? extractKeywords(thought.text),
    title: thought.title ?? thought.text.slice(0, 15) + (thought.text.length > 15 ? '...' : ''),
  };
}

export default function LibraryConstellationView({
  thoughts,
  selectedThoughtId,
  onSelectThought,
  onUpdateThought,
  onDeleteThought,
  onMergeThoughts,
  onPinThought,
  manualLinks,
  setManualLinks,
  bursts,
  onStartCapture,
}: LibraryConstellationViewProps) {
  const [isForgeMode, setIsForgeMode] = useState(false);
  /** Forge: first click selects source, second click on another node creates link */
  const [forgeSourceId, setForgeSourceId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const ZOOM_MIN = 0.35;
  const ZOOM_MAX = 2.5;
  const ZOOM_STEP = 0.2;

  const zoomIn = useCallback(() => {
    setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP));
  }, []);
  const zoomOut = useCallback(() => {
    setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP));
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY < 0) zoomIn();
        else zoomOut();
      }
    },
    [zoomIn, zoomOut]
  );

  const nodes = thoughts.map((t, i) => thoughtNode(t, i));
  const selectedThought = thoughts.find((t) => t.id === selectedThoughtId);

  /** Forge mode: click to select source, then click another node to connect */
  const handleNodeClickForge = (e: React.MouseEvent, id: string) => {
    if (!isForgeMode) return;
    e.stopPropagation();
    if (!forgeSourceId) {
      setForgeSourceId(id);
      return;
    }
    if (forgeSourceId === id) {
      setForgeSourceId(null);
      return;
    }
    const alreadyLinked = manualLinks.some(
      (l) =>
        (l.from === forgeSourceId && l.to === id) || (l.from === id && l.to === forgeSourceId)
    );
    if (!alreadyLinked) {
      setManualLinks((prev) => [...prev, { from: forgeSourceId, to: id }]);
    }
    setForgeSourceId(null);
  };

  const handleCanvasClick = () => {
    if (isForgeMode && forgeSourceId) setForgeSourceId(null);
  };

  const removeManualLink = (index: number) => {
    setManualLinks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrag = (id: string, info: { delta: { x: number; y: number } }) => {
    const t = thoughts.find((x) => x.id === id);
    if (!t) return;
    const node = nodes.find((n) => n.id === id);
    const prevX = node?.x ?? 0;
    const prevY = node?.y ?? 0;
    onUpdateThought({
      ...t,
      x: prevX + info.delta.x,
      y: prevY + info.delta.y,
    });
  };

  const handleDragEnd = (id: string) => {
    const dragger = nodes.find((t) => t.id === id);
    if (!dragger) return;
    const target = nodes.find((t) => {
      if (t.id === id) return false;
      const dx = t.x - dragger.x;
      const dy = t.y - dragger.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      return dist < (t.size + dragger.size) / 2.5;
    });
    if (target) {
      onMergeThoughts(target.id, id);
    }
  };

  return (
    <div
      className={`library-constellation ${isForgeMode ? 'forge-mode-bg cursor-cell' : 'cursor-crosshair'}`}
      ref={containerRef}
      onClick={handleCanvasClick}
      onWheel={handleWheel}
      role="application"
      aria-label="Constellation view"
    >
      <div
        className="library-constellation-zoom-wrap"
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: '50% 50%',
        }}
      >
        <div className="library-constellation-bg" />

        <svg className="library-constellation-svg" aria-hidden>
          <defs>
            <filter id="constellation-glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g pointerEvents="none">
            {/* Automated semantic bonds */}
            {nodes.map((t1, i) =>
              nodes.slice(i + 1).map((t2) => {
                const sharedKeywords = t1.keywords.filter((k) => t2.keywords.includes(k));
                const sameEmotion = t1.emotion === t2.emotion;
                const dist = Math.sqrt(Math.pow(t2.x - t1.x, 2) + Math.pow(t2.y - t1.y, 2));
                if (sharedKeywords.length > 0 || (sameEmotion && dist < 400)) {
                  return (
                    <line
                      key={`auto-${t1.id}-${t2.id}`}
                      x1={`calc(50% + ${t1.x}px)`}
                      y1={`calc(50% + ${t1.y}px)`}
                      x2={`calc(50% + ${t2.x}px)`}
                      y2={`calc(50% + ${t2.y}px)`}
                      stroke={sharedKeywords.length > 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)'}
                      strokeWidth={sharedKeywords.length > 0 ? '1.5' : '0.5'}
                      className="bridge-line"
                      style={{ opacity: 1 - dist / 600 }}
                    />
                  );
                }
                return null;
              })
            )}
          </g>
        </svg>

        {/* Separate SVG for manual links so they can receive right-click (main SVG has pointer-events: none) */}
        <svg className="library-constellation-svg library-constellation-links-layer" aria-hidden>
          {manualLinks.map((link, idx) => {
            const t1 = nodes.find((t) => t.id === link.from);
            const t2 = nodes.find((t) => t.id === link.to);
            if (!t1 || !t2) return null;
            return (
              <g
                key={`manual-${idx}`}
                className="manual-link-group"
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  removeManualLink(idx);
                }}
              >
                <line
                  x1={`calc(50% + ${t1.x}px)`}
                  y1={`calc(50% + ${t1.y}px)`}
                  x2={`calc(50% + ${t2.x}px)`}
                  y2={`calc(50% + ${t2.y}px)`}
                  stroke="transparent"
                  strokeWidth="16"
                  strokeLinecap="round"
                />
                <line
                  x1={`calc(50% + ${t1.x}px)`}
                  y1={`calc(50% + ${t1.y}px)`}
                  x2={`calc(50% + ${t2.x}px)`}
                  y2={`calc(50% + ${t2.y}px)`}
                  stroke="cyan"
                  strokeWidth="1"
                  strokeOpacity="0.4"
                  filter="url(#constellation-glow)"
                  className="bridge-line"
                  pointerEvents="none"
                />
              </g>
            );
          })}
        </svg>

        {/* Burst particles */}
        {bursts.map((b) => (
          <div
            key={b.id}
            className="library-constellation-burst"
            style={{
              left: `calc(50% + ${b.x}px)`,
              top: `calc(50% + ${b.y}px)`,
            }}
          >
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="particle"
                style={{
                  backgroundColor: b.color,
                  ['--tw-translate-x' as string]: `${(Math.random() - 0.5) * 200}px`,
                  ['--tw-translate-y' as string]: `${(Math.random() - 0.5) * 200}px`,
                }}
              />
            ))}
          </div>
        ))}

        {/* Thought nodes: two disappear and become one on merge; merged node uses mixed emotion color */}
        <AnimatePresence>
          {nodes.map((t) => (
            <motion.div
              key={t.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              drag={!isForgeMode}
              dragMomentum={false}
              onDrag={(_, info) => !isForgeMode && handleDrag(t.id, info)}
              onDragEnd={() => !isForgeMode && handleDragEnd(t.id)}
              onClick={(e) => {
                if (isForgeMode) {
                  handleNodeClickForge(e, t.id);
                } else {
                  onSelectThought(t.id);
                }
              }}
              style={{
                x: t.x,
                y: t.y,
                width: t.size,
                height: t.size,
                marginLeft: -t.size / 2,
                marginTop: -t.size / 2,
              }}
              className={`library-constellation-node ${selectedThoughtId === t.id ? 'selected' : ''} ${isForgeMode ? 'forge-cursor' : ''} ${forgeSourceId === t.id ? 'forge-source' : ''}`}
            >
          <div
            className="aether-glow aether-glow-gradient"
            style={{
              background: `radial-gradient(circle at 50% 50%, ${t.color} 0%, transparent 70%)`,
              opacity: selectedThoughtId === t.id ? 0.5 : 0.15,
            }}
          />
          <div className="library-constellation-node-inner">
            <div
              className="library-constellation-node-dot"
              style={{ backgroundColor: t.color, boxShadow: `0 0 15px ${t.color}` }}
            />
          </div>
          <div className="library-constellation-node-title">{t.title}</div>
          {isForgeMode && <div className="library-constellation-node-forge-ring" />}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Forge mode + Zoom toolbar */}
      <div className="library-constellation-toolbar">
        <div className="library-constellation-toolbar-zoom">
          <button type="button" onClick={zoomOut} disabled={zoom <= ZOOM_MIN} aria-label="Zoom out" title="Zoom out">
            <ZoomOut className="icon-sm" />
          </button>
          <span className="library-constellation-zoom-label">{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={zoomIn} disabled={zoom >= ZOOM_MAX} aria-label="Zoom in" title="Zoom in">
            <ZoomIn className="icon-sm" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsForgeMode(!isForgeMode);
            setForgeSourceId(null);
          }}
          className={isForgeMode ? 'forge-active' : ''}
        >
          <Share2 className={isForgeMode ? 'spin-icon' : ''} />
          <span>{isForgeMode ? 'Forging Constellation' : 'Forge Mode'}</span>
        </button>
      </div>

      {/* Legend */}
      <div className="library-constellation-legend">
        <div className="library-constellation-legend-title">
          <Zap className="legend-icon" />
          Synapse Mechanics
        </div>
        <ul>
          <li>
            {isForgeMode
              ? 'Click one node, then another to FORGE a link'
              : 'DRAG thoughts to SYNTHESIZE'}
          </li>
          <li>Right-click a cyan line to remove link</li>
          <li>Ctrl+scroll or use +/- to zoom</li>
          <li>Related fragments bridge AUTOMATICALLY</li>
        </ul>
      </div>

      {/* Detail panel */}
      <AnimatePresence>
        {selectedThought && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
            className="library-constellation-detail"
          >
            <div className="library-constellation-detail-header">
              <div className="library-constellation-detail-badge">
                {(selectedThought.emotion ?? 'neutral')} Manifestation
              </div>
              <button
                type="button"
                onClick={() => onSelectThought(null)}
                className="library-constellation-detail-close"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="library-constellation-detail-body">
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
