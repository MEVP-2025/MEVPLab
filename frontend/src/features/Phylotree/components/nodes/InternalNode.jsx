
/**
 * InternalNode component for rendering internal nodes of phylogenetic tree
 *
 * @param {Object} props - Component properties
 * @param {string} props.id - Unique identifier for the node
 * @param {number} props.x - X coordinate
 * @param {number} props.y - Y coordinate
 * @param {boolean} props.isHovered - Whether the node is currently hovered
 * @param {function} props.onNodeClick - Callback when node is clicked
 * @param {function} props.onMouseEnter - Callback when mouse enters node
 * @param {function} props.onMouseLeave - Callback when mouse leaves node
 */
function InternalNode({
  id,
  x,
  y,
  isHovered,
  onNodeClick,
  onMouseEnter,
  onMouseLeave,
}) {
  return (
    <g
      className="internal-node"
      transform={`translate(${x},${y})`}
      onClick={onNodeClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <circle r={isHovered ? 5 : 3} className={isHovered ? "hovered" : ""} />

      {/* <text
        x="8"
        y="4"
        fill="red"
        style={{
          fontSize: "10px",
          fontWeight: "bold",
        }}
      >
        {id}
      </text> */}
    </g>
  );
}

export default InternalNode;
