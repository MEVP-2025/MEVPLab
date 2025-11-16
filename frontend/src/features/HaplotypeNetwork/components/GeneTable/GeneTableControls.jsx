import React from "react";

const GeneTableControls = ({
  viewMode,
  setViewMode,
  searchTerm,
  setSearchTerm,
  showOnlySelected,
  setShowOnlySelected,
  
  csvFileName,
  currentPage,
  setCurrentPage, 

  
  
}) => {
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    if (setCurrentPage) setCurrentPage(1);
  };

  return (
    <div style={{ position: "relative" }}>
      {/* 表格切換 */}
      <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'flex-start' }}>
        <button
          onClick={() => setViewMode("total")}
          style={{
            marginRight: 8,
            padding: "6px 12px", // 調整內邊距來控制按鈕的大小
            lineHeight: "normal", // 保證文字垂直居中
          }}
        >
          Summary_table
        </button>
        <button
          onClick={() => setViewMode("count")}
          style={{
            marginRight: 8,
            padding: "6px 12px",
            lineHeight: "normal",
          }}
        >
          FA_table
        </button>
        <button
          onClick={() => setViewMode("formatted")}
          style={{
            marginRight: 8,
            padding: "6px 12px",
            lineHeight: "normal",
          }}
        >
          MergeFA_table
        </button>
        <button
          onClick={() => setViewMode("detail")}
          style={{
            marginRight: 8,
            padding: "6px 12px",
            lineHeight: "normal",
          }}
        >
          Information_table
        </button>       
      </div>




      {/* 搜尋 & 篩選：只在 count 和 detail 模式下顯示 */}
      {(viewMode === "count" || viewMode === "detail" ) && (
        <div className="flex" style={{ marginBottom: 15, gap: 15, alignItems: "center" }}>
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={handleSearchChange}
            className="search-input"
            style={{ width: 200 }}
          />
        </div>
      )}

      {/* 篩選設定 */}
      <div>        
        {viewMode === "count" && (
          <label style={{ marginLeft: "auto", fontSize: 14 }}>
            <input
              type="checkbox"
              checked={showOnlySelected}
              onChange={() => {
                const next = !showOnlySelected;
                if (next && setCurrentPage) setCurrentPage(1);
                setShowOnlySelected(next);
              }}
              style={{ marginRight: 6 }}
            />
            Show selected
          </label>
        )}
      </div>
    </div>
  );
};

export default GeneTableControls;
