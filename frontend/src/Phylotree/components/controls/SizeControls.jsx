import React from "react";

/**
 * 樹狀圖尺寸控制元件
 * @param {Object} props - 元件屬性
 * @param {number} props.width - 當前寬度
 * @param {number} props.height - 當前高度
 * @param {function} props.onWidthChange - 寬度變更處理函數
 * @param {function} props.onHeightChange - 高度變更處理函數
 * @returns {JSX.Element} 尺寸控制UI
 */
function SizeControls({ width, height, onWidthChange, onHeightChange }) {
  return (
    <div className="controls-container">
      <div className="width-control">
        <label>Width: {width}px</label>
        <input
          type="range"
          min="300"
          max="2000"
          value={width}
          step="10"
          onChange={(e) => onWidthChange(parseInt(e.target.value, 10))}
          style={{ marginTop: 10 }}
        />
      </div>
      <div className="height-control">
        <label>Height: {height}px</label>
        <input
          type="range"
          min="300"
          max="2000"
          value={height}
          step="10"
          onChange={(e) => onHeightChange(parseInt(e.target.value, 10))}
        />
      </div>
    </div>
  );
}

export default SizeControls;