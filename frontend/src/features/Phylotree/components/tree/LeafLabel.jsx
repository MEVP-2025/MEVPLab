import { useEffect, useRef, useState } from 'react';
import { estimateTextWidth } from '../../utils/textWidth';

const LABEL_FONT_SIZE = 14;
const LEFT_TIP_GAP  = 10; // gap between branch tip and text (left mode)
const TEXT_GAP      = 8;  // gap between tracer end and text start (right mode) — matches v1
const TIP_OFFSET    = 7;  // tracer start offset from branch tip

/**
 * Renders a single leaf label in one of two modes:
 *
 * alignRight=false (default, "Align Tips Left"):
 *   - No tracer line
 *   - Text left-aligned, starts at branch tip + LEFT_TIP_GAP
 *
 * alignRight=true ("Align Tips Right"):
 *   - labelX = common tracer-end for ALL leaves (= rightEdge - maxTextWidth)
 *   - Dashed tracer from branch tip to labelX
 *   - Text starts TEXT_GAP px after labelX (textAnchor="start", flows right)
 *   - All text left edges align at the same x ← consistent across all nodes
 *   - Total boundary = labelX + TEXT_GAP + maxTextWidth
 */
const LeafLabel = ({ x, y, labelX, name, renamedLabel, isHighlighted, alignRight, fontSize = 14, onRename }) => {
  const displayName = renamedLabel ?? name ?? '';

  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName]   = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) inputRef.current.focus();
  }, [isEditing]);

  // Hooks must be called before any early return
  if (!name) return null;

  const handleDoubleClick = (e) => {
    if (!onRename) return;
    e.stopPropagation();
    setTempName(displayName);
    setIsEditing(true);
  };

  const finishEditing = () => {
    onRename?.(tempName);
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter')  finishEditing();
    if (e.key === 'Escape') setIsEditing(false);
  };

  const textLength = estimateTextWidth(displayName, fontSize);

  // ── Right mode: labelX IS the common tracer-end (same for all leaves);
  //    text left-aligns at tracerEndX + TEXT_GAP — consistent across all nodes.
  const tracerEndX = alignRight ? labelX : x;
  const textX      = alignRight ? tracerEndX + TEXT_GAP : x + LEFT_TIP_GAP;
  const hasTracer  = alignRight && tracerEndX > x + TIP_OFFSET;

  // Highlight rect sized to actual font size
  const highlightWidth  = textLength + 4;
  const highlightX      = textX - 2;
  const highlightHeight = fontSize + 2;
  const highlightY      = y - fontSize / 2 - 1;

  return (
    <g className="align-dash">
      {/* Always in DOM so CSS transition can interpolate x2 */}
      <line
        x1={x + TIP_OFFSET}
        x2={hasTracer ? tracerEndX : x + TIP_OFFSET}
        y1={y}
        y2={y}
        className="rp-branch-tracer"
      />

      {isEditing ? (
        <foreignObject x={textX} y={y - 10} width="160" height="24">
          <input
            ref={inputRef}
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onBlur={finishEditing}
            onKeyDown={handleKeyDown}
            className="rp-label-input"
          />
        </foreignObject>
      ) : (
        <>
          {isHighlighted && (
            <rect
              x={highlightX}
              y={highlightY}
              width={highlightWidth}
              height={highlightHeight}
              className="rp-label-highlight"
            />
          )}
          <text
            x={textX}
            y={y}
            textAnchor="start"
            dominantBaseline="middle"
            className="rp-label"
            onDoubleClick={handleDoubleClick}
            style={isHighlighted
              ? { fill: 'black', fontWeight: 'bold' }
              : { cursor: onRename ? 'text' : 'default' }
            }
          >
            {displayName}
          </text>
        </>
      )}
    </g>
  );
};

export default LeafLabel;
