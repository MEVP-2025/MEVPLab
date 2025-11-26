import "../styles/GeneTable.css";

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
      {/* 表格切換：上方的兩個按鈕 */}
      <div  style={{ marginBottom: 10, display: "flex", justifyContent: "flex-start" }}>
        <button
          onClick={() => setViewMode("total")}
          className={`GeneTable-button ${viewMode === "total" ? "active" : ""}`}
        >
          Summary_table
        </button>
        <button
          onClick={() => setViewMode("count")}
          className={`GeneTable-button ${viewMode === "count" ? "active" : ""}`}
        >
          FA_table
        </button>
      </div>

      {/* FA_table 內的三個表格：下方的三個按鈕 */}
      {(  viewMode === "count" || viewMode === "formatted" || viewMode === "detail") && (
        <div className="button-groupS bottom" style={{ marginBottom: 10, display: "flex", justifyContent: "flex-start" }}>
          {/*
          <button
            onClick={() => setViewMode("count")}
            className="btn btn-fa"
          >
            FA_table
          </button>
          */}
          
          <button
            onClick={() => setViewMode("formatted")}
            className={`GeneTable-button ${viewMode === "formatted" ? "active" : ""}`}
          >
            MergeFA_table
          </button>
          <button
            onClick={() => setViewMode("detail")}
            className="btn btn-info1"
            style={{ display: "none" }}
          >
            Information_table
          </button>
        </div>
      )}

      {/* 搜尋 & 篩選：只在 count 和 detail 模式下顯示 
      {( viewMode === "detail") && (
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
      */}
      
    </div>
  );
};

export default GeneTableControls;
