
import { DENSITY_PRESETS, useUI } from '../../context/UIContext.jsx';

const Branch = ({ link, xScale, yScale, onClick, onContextMenu, onMouseMove, onMouseLeave }) => {
  const { settings } = useUI();
  const { source, target } = link;

  // Calculate coordinates
  const x1 = xScale(source.x);
  const y1 = yScale(source.y);
  const x2 = xScale(target.x);
  const y2 = yScale(target.y);

  // Generate Path Data
  let d = '';
  // Default to simple line if no specific type
  // Check if we want curved or straight
  
  // Standard Rectangular Step
  d = `M ${x1} ${y1} V ${y2} H ${x2}`;


  const stroke = '#ccc';
  const strokeWidth = DENSITY_PRESETS[settings.density]?.branchWidth ?? 2;
  
  const isLeaf = !target.children || target.children.length === 0;

  return (
    <path
      className="rp-branch"
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      style={{ cursor: isLeaf ? 'default' : 'pointer' }}
      onClick={isLeaf ? undefined : onClick}
      onContextMenu={isLeaf ? undefined : onContextMenu}
      onMouseMove={onMouseMove ? (e) => onMouseMove(e, target) : undefined}
      onMouseLeave={onMouseLeave}
    />
  );
};

export default Branch;
