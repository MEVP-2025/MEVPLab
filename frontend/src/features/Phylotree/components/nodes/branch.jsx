import { line } from "d3-shape";

function Branch(props) {
  const {
    xScale,
    yScale,
    colorScale,
    showLabel = false,
    setTooltip,
    isCollapsed,
    branchStyle = { strokeWidth: 2, stroke: "grey" },
    labelStyle = {},
    isHighlighted = false,
  } = props;
  
  const { source, target } = props.link;

  const source_x = xScale(source.data.abstract_x);
  const source_y = yScale(source.data.abstract_y);
  const target_x = xScale(target.data.abstract_x);
  const target_y = yScale(target.data.abstract_y);
  const tracer_x2 =
    props.alignTips == "right"
      ? props.width - (target.data.text_width || 0)
      : target_x;

  const data = [
    [source_x, source_y],
    [source_x, target_y],
    [target_x, target_y],
  ];

  const branch_line = line()
    .x((d) => d[0])
    .y((d) => d[1]);

  const computed_branch_styles = props.branchStyler
    ? props.branchStyler(target.data)
    : target.data.annotation && colorScale
    ? {
        stroke: colorScale(target.data.annotation),
      }
    : {};

  const all_branch_styles = Object.assign(
    {},
    branchStyle,
    computed_branch_styles
  );

  const label_style =
    target.data.name && props.labelStyler ? props.labelStyler(target.data) : {};

  const calculateTextWidth = (text, fontSize = 14) => {
    const charWidth = fontSize * 0.6; // 大部分字體的平均字元寬度
    return text.length * charWidth + 8; // 加一些 padding
  };

  return (
    <g className="node">
      <path
        className="rp-branch"
        fill="none"
        d={branch_line(data)}
        onClick={() => props.onClick && props.onClick(props.link)}
        {...all_branch_styles}
        onMouseMove={
          props.tooltip
            ? (e) => {
                setTooltip({
                  x: e.nativeEvent.offsetX,
                  y: e.nativeEvent.offsetY,
                  data: target.data,
                });
              }
            : undefined
        }
        onMouseOut={props.tooltip ? () => setTooltip(false) : undefined}
      />

      {showLabel && (
        <>
          <line
            x1={target_x}
            x2={tracer_x2}
            y1={target_y}
            y2={target_y}
            className="rp-branch-tracer"
          />
          
          {/* 如果高亮，先畫黃色背景矩形 */}
          {isHighlighted && target.data.name && (
            <rect
              x={tracer_x2 + 5}
              y={target_y - 10}
              width={
                target.data.text_width || 
                calculateTextWidth(
                  target.data.name.slice(0, props.maxLabelWidth || target.data.name.length)
                )
              }
              height={18}
              fill="yellow"
              // stroke="#ffd700"
              strokeWidth="1"
              // rx="1"
              // ry="3"
            />
          )}
          
          <text
            x={tracer_x2 + 8}
            y={target_y}
            textAnchor="start"
            alignmentBaseline="middle"
            {...Object.assign({}, props.labelStyle, label_style)}
            className="rp-label"
            style={isHighlighted ? { fill: 'black', fontWeight: 'bold' } : {}}
          >
            {target.data.name && target.data.name.slice(0, props.maxLabelWidth)}
          </text>
        </>
      )}
    </g>
  );
}

export default Branch;