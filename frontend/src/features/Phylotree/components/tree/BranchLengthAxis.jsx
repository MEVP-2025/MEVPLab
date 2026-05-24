import { useState } from 'react';

/**
 * BranchLengthAxis — SVG axis showing branch-length ticks.
 * Clicking a tick fires onThresholdCollapse(tickValue) to batch-collapse
 * all internal nodes whose cumulative branch length >= that threshold.
 *
 * @param {number}   maxX                 – tree's maximum abstract_x value
 * @param {Function} xScale               – d3 scaleLinear mapping abstract_x → px
 * @param {number}   rightmost            – pixel width of the branch-drawing area
 * @param {Function} onThresholdCollapse  – called with the clicked tick value
 */
const BranchLengthAxis = ({ maxX, xScale, rightmost, onThresholdCollapse }) => {
  const [hoveredTick, setHoveredTick] = useState(null);

  const generateTicks = () => {
    const max = maxX;
    if (max <= 0) return [0];

    let interval;
    const magnitude = Math.floor(Math.log10(max));

    if (magnitude < 0) {
      interval = Math.pow(10, magnitude);
      if (max / interval > 10) interval *= 2;
    } else if (magnitude < 3) {
      interval = Math.pow(10, Math.floor(Math.log10(max / 10)));
    } else {
      interval = Math.pow(10, Math.floor(Math.log10(max / 5)));
    }

    if (interval < Number.EPSILON) interval = Number.EPSILON;

    let ticks = [];
    for (let i = 0; i <= max + Number.EPSILON; i += interval) {
      const tick = parseFloat(i.toFixed(10));
      if (tick <= max + Number.EPSILON) ticks.push(tick);
    }

    if (ticks.length > 20) {
      const step = Math.ceil(ticks.length / 20);
      ticks = ticks.filter((_, i) => i % step === 0);
    }

    const last = ticks[ticks.length - 1];
    if (last < max - Number.EPSILON) {
      const precision = interval >= 1 ? 0 : interval >= 0.1 ? 1 : interval >= 0.01 ? 2 : 3;
      ticks.push(Math.ceil(max * Math.pow(10, precision)) / Math.pow(10, precision));
    }

    return ticks;
  };

  const ticks = generateTicks();

  return (
    <g className="rp-bl-axis">
      {/* Title */}
      <text
        x={xScale(maxX / 2)}
        y={10}
        textAnchor="middle"
        alignmentBaseline="middle"
        fontSize="14px"
        fontFamily="Courier"
        fill="var(--text, #333)"
      >
        Branch Length
      </text>

      {/* Baseline */}
      <line
        x1={0}
        y1={40}
        x2={rightmost}
        y2={40}
        stroke="var(--border, #aaa)"
        strokeWidth={2}
      />

      {/* Ticks */}
      {ticks.map((tick) => {
        const px = xScale(tick);
        const isHovered = hoveredTick === tick;
        return (
          <g
            key={tick}
            transform={`translate(${px}, 40)`}
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHoveredTick(tick)}
            onMouseLeave={() => setHoveredTick(null)}
            onClick={(e) => {
              e.stopPropagation();
              onThresholdCollapse?.(tick);
            }}
          >
            {/* Clickable hit area */}
            <rect
              x={-8}
              y={-25}
              width={16}
              height={30}
              fill="transparent"
            />

            {/* Dot on axis */}
            <circle
              cy={-15}
              r={isHovered ? 5 : 3}
              fill={isHovered ? 'var(--accent, #4a9eff)' : 'var(--detail, #888)'}
              style={{ transition: 'r 0.1s, fill 0.1s' }}
            />

            {/* Tick line */}
            <line
              y1={-11}
              y2={5}
              stroke="var(--detail, #666)"
              strokeWidth={1}
            />

            {/* Label */}
            <text
              y={20}
              textAnchor="middle"
              fontSize="11px"
              fontFamily="Courier"
              fill="var(--text, #333)"
            >
              {tick % 1 === 0 ? tick.toString() : tick.toPrecision(3)}
            </text>
          </g>
        );
      })}

      {/* Tooltip hint on hover */}
      {hoveredTick !== null && (
        <text
          x={Math.min(xScale(hoveredTick) + 8, rightmost - 80)}
          y={26}
          fontSize="10px"
          fontFamily="sans-serif"
          fill="var(--accent, #4a9eff)"
          pointerEvents="none"
        >
          collapse ≥ {hoveredTick % 1 === 0 ? hoveredTick : hoveredTick.toPrecision(3)}
        </text>
      )}
    </g>
  );
};

export default BranchLengthAxis;
