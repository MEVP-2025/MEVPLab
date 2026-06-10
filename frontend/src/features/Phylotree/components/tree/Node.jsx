import { useEffect, useRef, useState } from 'react';

const LABEL_FONT_SIZE = 14;

const Node = ({ data, x, y, isCollapsed, renamedLabel, onRename, onContextMenu, showInternalLabels, alignRight = false, labelX = 0 , unique_id}) => {
  const isInternal = data.children && data.children.length > 0;
  // Show label only for:
  //   - collapsed nodes (renamed placeholder)
  //   - internal nodes when showInternalLabels is on
  // Leaf node text is handled exclusively by LeafLabel.jsx
  const showLabel = isCollapsed || (isInternal && showInternalLabels && data.data.name);
  
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState("");
  const inputRef = useRef(null);

  // Circle class drives size + colour via CSS (see .rp-node in phylotree.css)
  const nodeClass = isCollapsed
    ? 'rp-node rp-node--collapsed'
    : isInternal
      ? 'rp-node rp-node--internal'
      : 'rp-node rp-node--leaf';
  
  let labelText = data.data.name;
  let displayPlaceholder = false;

  if (renamedLabel) {
    labelText = renamedLabel;
  } else if (isCollapsed) {
    labelText = "Double click to name"; 
    displayPlaceholder = true;
  }

  // Align-right mode: internal node label gets a tracer + left-aligned text (same as leaf labels)
  // Root node (parent === null) is excluded — its label stays left at x=0
  const useAlignRight = alignRight && isInternal && showInternalLabels && !isCollapsed && labelX > x && data.parent !== null;
  // Coordinates in node-local space (origin = node position)
  // labelX is the common tracer-end (absolute); convert to local: tracerX2 = labelX - x
  const tracerX2   = useAlignRight ? Math.max(7, labelX - x) : 7;
  const textLocalX = useAlignRight ? Math.max(8, tracerX2 + 8) : 8;

  useEffect(() => {
    if (isEditing && inputRef.current) {
        inputRef.current.focus();
    }
  }, [isEditing]);

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    setIsEditing(true);
    // If it's a placeholder, start with empty string. Otherwise use the existing name.
    setTempName(displayPlaceholder ? "" : labelText);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
        finishEditing();
    } else if (e.key === 'Escape') {
        setIsEditing(false);
    }
  };

  const finishEditing = () => {
    onRename(tempName);
    setIsEditing(false);
  };

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Single Node Circle with transparent stroke for hit area - ONLY for Internal or Collapsed */}
      {(isInternal || isCollapsed) && (
        <circle
          className={nodeClass}
          stroke="transparent"
          strokeWidth="10"
          onClick={onContextMenu}
        />
      )}

      {/* Label or Input */}
      {showLabel && (
        isEditing ? (
            <foreignObject x="8" y="-10" width="150" height="24">
                <input
                    ref={inputRef}
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    onBlur={finishEditing}
                    onKeyDown={handleKeyDown}
                    className="rp-label-input"
                />
            </foreignObject>
        ) : useAlignRight ? (
            /* Align-right mode: tracer to right edge + right-aligned text */
            <g className="align-dash">
              <line
                x1={7}
                x2={tracerX2}
                y1={0}
                y2={0}
                className="rp-branch-tracer"
              />
              <text
                x={textLocalX}
                y={0}
                textAnchor="start"
                dominantBaseline="middle"
                className="rp-label"
                onDoubleClick={handleDoubleClick}
                style={{ cursor: 'text', userSelect: 'none' }}
              >
                {labelText}
              </text>
            </g>
        ) : (
            <text
              onDoubleClick={handleDoubleClick}
              x={8}
              y={4}
              className="rp-label"
              style={{ cursor: isCollapsed ? 'text' : 'default' }}
            >
              {labelText}
            </text>
        )
      )}
      {/* Threshold ID badge */}
      {/* {unique_id && (
        isInternal ? (
          <text
            x={25}
            y={3}
            fill="#e74c3c"
            textAnchor="end"
            style={{
              fontSize: '10px',
              fontWeight: 'bold',
              pointerEvents: 'none',
            }}
          >
            {unique_id}
          </text>
        ) : (
          <text
            x={5}
            y={3}
            fill="#e74c3c"
            textAnchor="end"
            style={{
              fontSize: '10px',
              fontWeight: 'bold',
              pointerEvents: 'none',
            }}
          >
            {unique_id}
          </text>
        )
      )} */}
    </g>
  );
};

export default Node;
