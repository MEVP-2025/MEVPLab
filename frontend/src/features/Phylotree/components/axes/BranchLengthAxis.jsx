import React from "react";

/**
 * BranchLengthAxis component for displaying branch length axis with ticks
 * 
 * @param {Object} props - Component properties
 * @param {number} props.maxX - Maximum X value (maximum branch length)
 * @param {function} props.x_scale - D3 scale function for X axis
 * @param {number} props.rightmost - Rightmost position for the axis
 * @param {number|null} props.hoveredTick - Currently hovered tick value
 * @param {function} props.setHoveredTick - Function to set hovered tick
 * @param {function} props.onThresholdCollapse - Callback when a tick is clicked for threshold collapse
 */
function BranchLengthAxis({ 
  maxX, 
  x_scale, 
  rightmost, 
  hoveredTick, 
  setHoveredTick, 
  onThresholdCollapse 
}) {
  // 生成刻度點
  const generateTicks = () => {
    // 計算適當的刻度間隔
    const max = maxX;
    let interval;
    
    if (max === 0) {
      interval = 0.1;
    } else {
      // 獲取數量級（即10的幾次方）
      const magnitude = Math.floor(Math.log10(max));
      
      if (magnitude < -10) {
        interval = Math.pow(10, magnitude) * 0.1;
      } else if (magnitude < 0) {
        interval = Math.pow(10, magnitude);
        
        if (max / interval > 10) {
          interval *= 2;
        }
      } else if (magnitude < 3) {
        interval = Math.pow(10, Math.floor(Math.log10(max / 10)));
      } else {
        interval = Math.pow(10, Math.floor(Math.log10(max / 5)));
      }
    }
    
    // 確保間隔不會過小導致浮點精度問題
    if (interval < Number.EPSILON) {
      interval = Number.EPSILON;
    }
    
    // 確保不會產生過多刻度
    const estimatedTickCount = max / interval;
    if (estimatedTickCount > 20) {
      interval = max / 20;
    }
    
    // 生成刻度點
    let ticks = [];
    for (let i = 0; i <= max; i += interval) {
      // 修正浮點數精度問題
      const tick = parseFloat(i.toFixed(10));
      if (tick <= max) {
        ticks.push(tick);
      }
    }
    
    // 如果刻度過多，可以限制數量
    if (ticks.length > 20) {
      const step = Math.ceil(ticks.length / 20);
      ticks = ticks.filter((_, i) => i % step === 0);
    }
    
    // 添加最後一個刻度點（最大值）
    if (ticks[ticks.length - 1] < max) {
      const precision = interval >= 1 ? 0 :
                        interval >= 0.1 ? 1 :
                        interval >= 0.01 ? 2 : 3;

      const roundedMax = Math.ceil(max * Math.pow(10, precision)) / Math.pow(10, precision);
      ticks.push(roundedMax);
    }
    
    return ticks;
  };

  return (
    <g>
      <text
        x={x_scale(maxX/2)}
        y={10}
        alignmentBaseline='middle'
        textAnchor='middle'
        fontFamily='Courier'
      >
        Branch Length
      </text>
      
      {/* 軸線 */}
      <line
        x1={0}
        y1={40}
        x2={rightmost}
        y2={40}
        stroke="#aaa"
        strokeWidth={1}
      />
      
      {/* 刻度與標籤 */}
      {generateTicks().map(tick => (
        <g key={tick} transform={`translate(${x_scale(tick)}, 40)`}>
          {/* 添加節點形式的標記 */}
          <circle 
            cy={-15}
            r={hoveredTick === tick ? 5 : 3}
            className={hoveredTick === tick ? "hovered" : ""}
            onMouseEnter={() => setHoveredTick(tick)}
            onMouseLeave={() => setHoveredTick(null)}
            onClick={(e) => {
              e.stopPropagation();
              if (onThresholdCollapse) {
                onThresholdCollapse(tick);
              }
            }}
          />
          
          {/* 添加刻度線 */}
          <line
            y1={-11}
            y2={5}
            stroke="#333"
            strokeWidth={1}
          />
          
          {/* 添加刻度值文字 */}
          <text
            y={20}
            textAnchor="middle"
            fontSize="12px"
            fill="#333"
          >
            {tick.toString()}
          </text>
        </g>
      ))}
    </g>
  );
}

export default BranchLengthAxis;