
/**
 * 樹狀圖匯出控制元件
 * @param {Object} props - 元件屬性
 * @param {function} props.onExportNewick - 匯出Newick格式處理函數
 * @param {function} props.onExportImage - 匯出圖片處理函數
 * @returns {JSX.Element} 匯出控制UI
 */
function ExportControls({ onExportNewick, onExportImage }) {
  return (
    <div className="export-container">
      <button onClick={onExportNewick}>
        Export Newick
      </button>
      <button onClick={onExportImage}>
        Export Image
      </button>
    </div>
  );
}

export default ExportControls;