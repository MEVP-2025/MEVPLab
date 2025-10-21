
/**
 * 樹狀圖提示工具容器
 * @param {Object} props - 元件屬性
 * @param {number} props.width - 容器寬度
 * @param {number} props.height - 容器高度
 * @param {number} props.tooltip_width - 提示框寬度
 * @param {number} props.tooltip_height - 提示框高度
 * @param {number} props.x - X座標
 * @param {number} props.y - Y座標
 * @param {Object} props.data - 提示資料
 * @returns {JSX.Element} 提示容器
 */
function TooltipContainer(props) {
  const {
    width, height, tooltip_width, tooltip_height, x, y, children
  } = props,
    correct_x = x < width/2 ? x : x - tooltip_width,
    correct_y = y < height/2 ? y : y - tooltip_height;
  return (<g
    transform={`translate(${correct_x}, ${correct_y})`}
  >
    {children}
  </g>);
}

export default TooltipContainer;