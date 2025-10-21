import React, { useState, useMemo } from "react";
import { FixedSizeList as List } from "react-window";
import "../components/AppStyles.css";

const GeneSelector = ({
  genes,
  selectedGene,
  setSelectedGene,
  showAllGenes,
  geneColors,
  setActiveSimilarityGroup,
  onSimilarityResults,
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [customMin, setCustomMin] = useState(95);
  const [customMax, setCustomMax] = useState(100);
  const [progress, setProgress] = useState(null);
  const [results, setResults] = useState([]);
  const [resultsPage, setResultsPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState(""); 
  const [isReduced, setIsReduced] = useState(false); // 追蹤縮減狀態

  // Filter genes based on search query
  const filteredGenes = genes.filter((gene) =>
    gene.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 判斷是否需要縮減基因名稱，只保留基因名稱的前綴（去掉 _1, _2, _3 以上的數字）
  const reduceGeneName = (geneName) => {
    const match = geneName.match(/^([A-Za-z0-9]+_\d+)_\d+$/);
    if (match && isReduced) {
      return match[1]; // 返回合併後的名稱（去掉最後的數字）
    }
    return geneName; // 若無法縮減，返回原名
  };



  // 過濾出要顯示的基因名稱，並去除重複的基因
const getDisplayGenes = (genes) => {
  const geneMap = {}; // 用來追蹤已經顯示過的縮減名稱
  const displayGenes = []; // 最終顯示的基因列表

  genes.forEach((gene) => {
    const reducedName = reduceGeneName(gene.name); // 根據縮減邏輯獲取縮減後的基因名稱

    // 確保每個縮減名稱只顯示一次，不管它在哪一頁
    if (!geneMap[reducedName]) {
      geneMap[reducedName] = true; // 標記這個基因名稱已經顯示過
      displayGenes.push(gene); // 添加到顯示的基因列表
    }
  });

  return displayGenes; // 返回過濾後的顯示基因列表
};

// 當選擇了基因後，過濾掉結果中的選擇基因名稱（即選中的基因不顯示）
// 發送比對請求後，過濾掉已選擇的基因名稱，並只顯示每個基因名稱的第一次出現
const filterResults = (results, selectedGene) => {
  const seen = {}; // 用來記錄已經出現過的基因名稱
  return results.filter(result => {
    const reducedName = reduceGeneName(result.name);
    if (seen[reducedName]) {
      return false; // 如果基因名稱已經出現過，就不再顯示
    }
    seen[reducedName] = true;
    return reduceGeneName(result.name) !== reduceGeneName(selectedGene); // 過濾掉選中的基因
  });
};





  // 分頁設定
  const pageSize = 15;
  const displayGenes = getDisplayGenes(filteredGenes); // 使用過濾後的基因名稱進行分頁
  const totalPages = Math.ceil(displayGenes.length / pageSize);
  const currentGenes = displayGenes.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  const resultsPerPage = 100;
  const resultsTotalPages = Math.ceil(results.length / resultsPerPage);
  const currentResults = filterResults(results, selectedGene).slice(resultsPage * resultsPerPage, (resultsPage + 1) * resultsPerPage);

  const resetSelection = () => {
    setSelectedGene(null);
    setResults([]);
    setResultsPage(0);
    setActiveSimilarityGroup([]);
    setProgress(null);
  };

  const handleSelect = (geneName) => {
    const isSameGene = selectedGene === geneName;
    resetSelection();
    isSameGene ? showAllGenes() : setSelectedGene(geneName);
  };

  const handlePageChange = (dir) => {
    setCurrentPage((prev) =>
      dir === "prev" ? Math.max(prev - 1, 0) : Math.min(prev + 1, totalPages - 1)
    );
  };

  const handleResultsPageChange = (dir) => {
    setResultsPage((prev) =>
      dir === "prev" ? Math.max(prev - 1, 0) : Math.min(prev + 1, resultsTotalPages - 1)
    );
  };

  const getGeneColor = (geneName) => {
    const reducedGeneName = reduceGeneName(geneName);
    return geneColors[reducedGeneName] || geneColors[geneName] || "#fff";
  };





  // 發送比對請求
  const filterBySimilarity = async (min, max) => {
  if (!selectedGene) return;

  setProgress({ completed: 0, total: 0 });
  setResults([]); 
  setResultsPage(0); 
  setActiveSimilarityGroup([]); // 重置选中的相似组

  try {
    const res = await fetch("http://localhost:3000/sequences");
    const { sequences } = await res.json();

    const response = await fetch("http://localhost:3000/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetName: selectedGene, sequences }),
    });

    if (!response.ok) throw new Error("比对请求失败");

    const data = await response.json();

    const filtered = data
      .filter(({ similarity }) => similarity >= min && similarity <= max)
      .sort((a, b) => b.similarity - a.similarity);

    setResults(filtered);
    setResultsPage(0);
    
    // 在设置相似组时仍然保留完整的基因名称（带后缀）
    setActiveSimilarityGroup(filtered.map((g) => g.name));

    onSimilarityResults?.(filtered.map((g) => g.name));
    setProgress(null);
  } catch (err) {
    console.error("比对错误:", err);
    setProgress(null);
  }
};


  return (
    <div className="flex flex-gap-20 align-start">
      <div className="flex flex-column flex-gap-5" style={{ minWidth: "220px", marginRight: "10px" }}>
        <div
          className="gene-selector-header"
          onClick={() => { resetSelection(); showAllGenes(); }}
          style={{ cursor: 'pointer', color: 'blue' }}
        >
          Select genes
        </div>

        <input
          type="text"
          placeholder="Search genes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            marginBottom: "10px",
            padding: "5px",
            border: "1px solid #aaa",
            borderRadius: "4px",
            width: "100%",
          }}
        />

        {/* 缩减按钮 */}
        <button onClick={() => setIsReduced(!isReduced)} style={{ marginBottom: "10px" }}>
          {isReduced ? "Cancel reduction" : "Enable reduction"}
        </button>

        {/* 渲染基因列表 */}
        {currentGenes.map((gene) => (
          <div
            key={gene.name}
            onClick={() => handleSelect(gene.name)}
            className="gene-list-item"
            style={{
              backgroundColor: getGeneColor(gene.name), // 保持基因颜色背景不变
              border: "1px solid #aaa",
              padding: "4px 10px",
              color: "#000",
              cursor: "pointer",
              borderRadius: "4px",
              margin: "2px 0",
              boxShadow: selectedGene === gene.name ? "0 0 5px 5px #1d1d1dff" : "none", // 选中时添加边框
            }}
          >
            <span
              style={{
                backgroundColor: "#fff", // 基因名的背景颜色
                padding: "0 5px",
                borderRadius: "4px",
              }}
            >
              {reduceGeneName(gene.name)} {/* 显示缩减后的基因名称 */}
            </span>
          </div>
        ))}

        <div className="pagination-controls">
          <button onClick={() => handlePageChange("prev")} disabled={currentPage === 0}>Prev</button>
          <span>{currentPage + 1}  / {totalPages} </span>
          <button onClick={() => handlePageChange("next")} disabled={currentPage === totalPages - 1}>Next</button>
        </div>
      </div>

      <div className="flex-column flex-gap-10" style={{ flex: 1 }}>
        <strong>Comparison of similar genes：</strong>

        <div className="button-group">
          <button onClick={() => filterBySimilarity(100, 100)}>100% </button>
          <button onClick={() => filterBySimilarity(90, 99.99)}>90%~99.99%</button>
          <button onClick={() => filterBySimilarity(80, 89.99)}>80%~89.99%</button>
        </div>

        <div className="flex flex-gap-10 align-center">
          <span>Range：</span>
          <input
            type="number"
            min={0}
            max={100}
            value={customMin}
            onChange={(e) => setCustomMin(Number(e.target.value))}
            style={{ width: "60px" }}
          />
          <span>~</span>
          <input
            type="number"
            min={0}
            max={100}
            value={customMax}
            onChange={(e) => setCustomMax(Number(e.target.value))}
            style={{ width: "60px" }}
          />
          <button
            onClick={() => {
              if (customMin <= customMax) {
                filterBySimilarity(customMin, customMax);
              } else {
                alert("請確認相似度範圍有效（最小 <= 最大）");
              }
            }}
          >
            Search
          </button>
        </div>

        {progress && <p style={{ marginTop: "10px", color: "blue" }}>Comparing...</p>}

        {results.length > 0 && (
          <div style={{ marginTop: "10px", borderTop: "1px solid #ccc", paddingTop: "10px" }}>
            <strong>results：</strong>
            <List height={400} width={400} itemCount={currentResults.length} itemSize={35}>
            {({ index, style }) => {
              const { name, similarity } = currentResults[index];
              return (
                <div key={name} style={style}>
                  <span style={{ color: geneColors[name] || "#000" }}>{reduceGeneName(name)}</span> — {similarity.toFixed(1)}%
                </div>
              );
            }}
          </List>
            <div className="pagination">
              <button onClick={() => handleResultsPageChange("prev")} disabled={resultsPage === 0}>Prev</button>
              <span> {resultsPage + 1}  /  {resultsTotalPages} </span>
              <button
                onClick={() => handleResultsPageChange("next")}
                disabled={resultsPage >= resultsTotalPages - 1}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {results.length === 0 && selectedGene && progress === null && (
          <div style={{ marginTop: "10px", color: "gray" }}>
            No similar genes
          </div>
        )}
      </div>
    </div>
  );
};

export default GeneSelector;

