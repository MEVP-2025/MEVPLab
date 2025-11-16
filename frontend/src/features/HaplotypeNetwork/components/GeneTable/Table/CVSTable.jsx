import React, { useState } from "react";
import "../GeneTable.css";

const CVSTable = ({
  displayedHeaders,
  displayedTableData,
  hapColors,
  hapPage,
  totalHapPages,
  onHapPageChange,
  setFilterMode,
  minPercentage,
  maxPercentage,
  setMinPercentage,
  setMaxPercentage,
}) => {
  // === 狀態搬進來：只屬於 CSV Table ===
  const [showPercentage, setShowPercentage] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");  // 新增搜尋框的狀態

   
// 只在 headers 中搜尋，排除前兩列的 header（例如 location）
  const filteredHeaders = displayedHeaders.filter((header, index) =>
    index < 2 || header.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 根據篩選過的 headers 显示相关的数据
  const filteredTableData = displayedTableData.map((row) =>
    row.filter((cell, colIndex) => filteredHeaders.includes(displayedHeaders[colIndex]))
  );



  // 更新 filterMode 和 percentage
  const handleFilterModeChange = (mode) => {
    setFilterMode(mode);
  };

  const handleMinPercentageChange = (e) => {
    setMinPercentage(Number(e.target.value));
  };

  const handleMaxPercentageChange = (e) => {
    setMaxPercentage(Number(e.target.value));
  };

  return (
    <div style={{ marginTop: "30px" }}>
      {/* 搜尋框 */}
      <div style={{ marginBottom: "10px" }}>
        <input
          type="text"
          placeholder="Search table headers"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ padding: "5px", width: "500px" }}
        />
      </div>

      <div style={{ marginRight: 50 }}>
        Show on Map: 
        <button onClick={() => handleFilterModeChange("all")}
          style={{
            marginLeft: 8,
            marginRight: 8,
            padding: "3px 6px", // 調整內邊距來控制按鈕的大小 
          }}
          >
          Show all
          
        </button>
        <button onClick={() => handleFilterModeChange("range")}
          style={{
            marginLeft: 8,
            marginRight: 8,
            padding: "3px 6px", // 調整內邊距來控制按鈕的大小 
          }}
          >
          Show {minPercentage} % ~ {maxPercentage} %
        </button>
      </div>

      <h5
        style={{
          marginTop: "10px" ,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div className="percentage-toggle">
          <button onClick={() => setShowPercentage((prev) => !prev)}>
            {showPercentage ? "Display Value" : "Display Percentage"}
          </button>
        </div>
      </h5>

      {/* 設定百分比範圍 */}
      <div>
        <label>
          Min Percentage: 
          <input
            type="number"
            value={minPercentage}
            onChange={(e) => setMinPercentage(Math.max(0.01, Number(e.target.value)))}
            min="0"
            max="100"
          />
        </label>
        <label>
          Max Percentage: 
          <input
            type="number"
            value={maxPercentage}
            onChange={(e) => setMaxPercentage(Number(e.target.value))}
            min="0"
            max="100"
          />
        </label>
      </div>

      <div className="gene-table-container view-total">
        <div className="gene-table-wrapper">
          <table className="gene-table">
            <thead>
              <tr>
                {filteredHeaders.map((header, idx) => (
                  <th key={idx}>
                    {header.startsWith("hap_") ? (
                      <span
                        style={{ display: "inline-flex", alignItems: "center" }}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            width: 12,
                            height: 12,
                            backgroundColor: hapColors[header] || "#101010ff",
                            marginRight: 6,
                            borderRadius: 2,
                          }}
                        />
                        {header}
                      </span>
                    ) : (
                      header
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTableData.slice(1).map((row, rowIndex) => {
                const total = parseInt(row[1]) || 0; // 第二欄是總數
                const isRowTransparent = total === 0; // 如果總數為 0，整行變透明

                return (
                  <tr
                    key={rowIndex}
                    style={{
                      opacity: isRowTransparent ? 0.3 : 1, // 根據 total 來設置透明度
                    }}
                  >
                    {row.map((cell, colIndex) => {
                      const isHapCol = colIndex >= 2;
                      const rawValue = parseInt(cell) || 0;
                      const displayValue = isHapCol
                        ? showPercentage
                          ? total > 0
                            ? `${((rawValue / total) * 100).toFixed(2)}%`
                            : "0.00%"
                          : rawValue
                        : cell;

                      // ✅ 設定背景色
                      let bgColor = undefined;
                      if (isHapCol) {
                        if (!showPercentage && rawValue > 0) {
                          bgColor = "yellow";
                        } else if (showPercentage && total > 0) {
                          const percent = (rawValue / total) * 100;
                          if (percent >= minPercentage && percent <= maxPercentage) {
                            bgColor = "yellow";
                          }
                        }
                      }

                      return (
                        <td
                          key={colIndex}
                          style={{
                            backgroundColor: bgColor,
                            textAlign: "center",
                          }}
                        >
                          {displayValue}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* CVS table 翻頁按鈕 */}
        <div className="pagination" style={{ marginTop: "10px" }}>
          <button
            onClick={() => onHapPageChange?.(Math.max(1, hapPage - 1))}
            disabled={hapPage === 1}
          >
            Prev
          </button>
          <span>
            {hapPage} / {totalHapPages}
          </span>
          <button
            onClick={() =>
              onHapPageChange?.(Math.min(totalHapPages, hapPage + 1))
            }
            disabled={hapPage === totalHapPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default CVSTable;