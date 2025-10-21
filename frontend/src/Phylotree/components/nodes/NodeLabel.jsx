import { useState } from "react";

/**
 * NodeLabel component for displaying and editing labels of phylogenetic tree nodes
 *
 * @param {Object} props - Component properties
 * @param {string} props.id - Unique identifier for the node
 * @param {number} props.x - X coordinate for the label position
 * @param {number} props.y - Y coordinate for the label position
 * @param {boolean} props.isCollapsed - Whether the node is in collapsed state
 * @param {string} props.label - Current label text
 * @param {function} props.onLabelChange - Callback when label changes
 * @param {boolean} props.internalNodeLabels - Whether to show internal node labels
 * @param {function} props.onNodeRename - Callback when edit is finished
 */
function NodeLabel({
  id,
  x,
  y,
  isCollapsed,
  label,
  onLabelChange,
  internalNodeLabels,
  onNodeRename,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState("");

  const adjustedX = internalNodeLabels ? x + 35 : x + 10;

  if (!isCollapsed) return null;

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setTempValue(newValue); // 只更新臨時值，不觸發 onLabelChange
  };

  const finishEditing = () => {
    setIsEditing(false);

    if (onLabelChange) {
      onLabelChange(id, tempValue);
    }

    if (onNodeRename) {
      onNodeRename(id, tempValue);
      console.log(`NodeLabel: 調用 onNodeRename(${id}, ${tempValue})`);
    }
  };

  return isEditing ? (
    <foreignObject
      x={adjustedX}
      y={y - 15}
      width="100"
      height="20"
      onClick={(e) => e.stopPropagation()} // 防止點擊觸發樹的事件
    >
      <input
        type="text"
        value={tempValue}
        onChange={handleInputChange}
        onBlur={finishEditing}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            finishEditing();
          }
        }}
        autoFocus
        style={{
          border: "1px solid #ccc",
          borderRadius: "3px",
          padding: "2px 5px",
        }}
      />
    </foreignObject>
  ) : (
    <text
      x={adjustedX}
      y={y}
      style={{
        cursor: "pointer",
        fontSize: "16px",
        userSelect: "none",
      }}
      onClick={(e) => e.stopPropagation()} // 防止點擊觸發樹的事件
      onDoubleClick={() => {
        setTempValue(label || "");
        setIsEditing(true);
      }}
    >
      {label || "Double click to name"}
    </text>
  );
}

export default NodeLabel;
