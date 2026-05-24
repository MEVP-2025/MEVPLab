const FONT_SIZE = 11;
const CHAR_WIDTH = FONT_SIZE * 0.601; // Courier monospace: each char is ~60% of font-size
const MIN_WIDTH = 110;
const PADDING = 10;
const LINE_HEIGHT = 18;
const OFFSET = 12;

const estimateRowWidth = (label, value) =>
  Math.ceil(`${label}: ${value}`.length * CHAR_WIDTH) + PADDING * 2;

/**
 * Builds the list of rows to show in the tooltip based on node data.
 *
 * Rules:
 *  - Leaf node  → show "Name" row (species name)
 *  - Internal node + name is numeric → show "Support" row (bootstrap value)
 *  - Internal node + name is non-numeric text → show "Name" row
 *  - Internal node + name is empty → skip name row entirely
 *  - Branch length exists and is non-zero → show "Branch" row
 */
const buildRows = (data) => {
  const rows = [];
  const isLeaf = !data.children || data.children.length === 0;
  const name = data?.data?.name ?? '';
  const attribute = data?.data?.attribute ?? null;

  if (isLeaf) {
    if (name) rows.push({ label: 'Name', value: name.length > 24 ? name.slice(0, 24) + '…' : name });
  } else {
    if (name) {
      const isNumeric = !isNaN(+name) && name.trim() !== '';
      rows.push({
        label: isNumeric ? 'Support' : 'Name',
        value: isNumeric ? name : (name.length > 24 ? name.slice(0, 24) + '…' : name),
      });
    }
  }

  const branchLenNum = attribute != null ? +attribute : NaN;
  if (!isNaN(branchLenNum) && branchLenNum !== 0) {
    rows.push({ label: 'Branch', value: branchLenNum.toFixed(5) });
  }

  return rows;
};

/**
 * SVG-native tooltip rendered inside the tree's <svg>.
 * Height is dynamic (only as tall as the rows being shown).
 * Automatically flips so it never overflows the SVG canvas.
 *
 * @param {{ tooltip: object|null, svgWidth: number, svgHeight: number }} props
 */
const BranchTooltip = ({ tooltip, svgWidth, svgHeight }) => {
  if (!tooltip?.visible) return null;

  const { x, y, data } = tooltip;
  const rows = buildRows(data);

  // Nothing meaningful to show
  if (rows.length === 0) return null;

  const tooltipWidth = Math.max(
    MIN_WIDTH,
    ...rows.map(r => estimateRowWidth(r.label, r.value))
  );
  const tooltipHeight = PADDING * 2 + rows.length * LINE_HEIGHT;

  // Flip horizontally / vertically when near SVG edges
  const tooltipX = x + OFFSET + tooltipWidth > svgWidth
    ? x - tooltipWidth - OFFSET
    : x + OFFSET;

  const tooltipY = y + OFFSET + tooltipHeight > svgHeight
    ? y - tooltipHeight - OFFSET
    : y + OFFSET;

  return (
    <g className="rp-tooltip">
      {/* Background — position/size stay as attributes; colors come from CSS */}
      <rect
        x={tooltipX}
        y={tooltipY}
        width={tooltipWidth}
        height={tooltipHeight}
        rx={4}
        ry={4}
      />

      {/* Rows — only positional attrs here; font/color come from CSS */}
      {rows.map((row, i) => (
        <text
          key={row.label}
          x={tooltipX + PADDING}
          y={tooltipY + PADDING + (i + 1) * LINE_HEIGHT - 5}
        >
          <tspan className="tooltip-label">{row.label}: </tspan>
          <tspan className="tooltip-value">{row.value}</tspan>
        </text>
      ))}
    </g>
  );
};

export default BranchTooltip;

