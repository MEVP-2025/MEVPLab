import  { useState, useEffect } from "react";
import { FixedSizeList as List } from "react-window";
import "./styles/GeneSelector.css";

const GeneSelector = ({
  genes,
  eDnaSampleContent,
  selectedGene,
  setSelectedGene,
  showAllGenes,
  geneColors,
  setActiveSimilarityGroup,
  onSimilarityResults,
  isReduced, 
  setIsReduced,

}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [customMin, setCustomMin] = useState(0);
  const [customMax, setCustomMax] = useState(100);
  const [progress, setProgress] = useState(null);
  const [results, setResults] = useState([]);
  const [resultsPage, setResultsPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState(""); 
  

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

 // 當用戶選擇基因時，根據是否啟用縮減來處理選擇
  const handleSelect = (geneName) => {
    let selectedGeneName = geneName;

    if (isReduced) {
      // 如果啟用縮減，將選擇的基因名稱替換為後綴為 _0 的基因名稱
      selectedGeneName = geneName.replace(/_\d+$/, "_0");
    }

    setSelectedGene(selectedGeneName); // 更新選中的基因
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
    const res = await fetch("http://localhost:3000/api/sequences/sequences");
    const { sequences } = await res.json();

    const response = await fetch("http://localhost:3000/api/sequences/compare", {
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

   const [isConfigured, setIsConfigured] = useState(false); // 用來判斷是否完成設定

   useEffect(() => {
       // 根據不同的 viewMode 設定所需的檔案是否完成
       const isAllConfigured = 
          Array.isArray(genes) && genes.length > 0 && 
          Array.isArray(eDnaSampleContent) && eDnaSampleContent.length > 0; 
       setIsConfigured(isAllConfigured);
     }, [genes, eDnaSampleContent]);


  return (
    <div className="container">

      {/* 如果沒有完成設定，顯示提示 */}
      {!isConfigured && (
        <div className="MapMainView-warning-box">
          <p>⚠️ Complete the following settings：</p>
          <ul>
            {(!genes || Array.isArray(genes) && genes.length === 0) && <li> Upload Fa File</li>}
            {(!eDnaSampleContent || Array.isArray(eDnaSampleContent) && eDnaSampleContent.length === 0) && <li> Upload eDNA Sample Station (xlsx)</li>}
          </ul>
        </div>
      )}

       {/* 如果設定完成，顯示原本的內容 */}
      {isConfigured && (
        <>
          <div className="flex-container">
            <div className="flex-column-container">
              <div
                className="gene-selector-header"
                onClick={() => { resetSelection(); showAllGenes(); }}
              >
                Select genes
              </div>

              <input
                type="text"
                placeholder="Search genes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"  // 使用CSS類別
              />

              {/* 缩减按钮 */}
              <button 
                onClick={() => setIsReduced(!isReduced)} 
                className={`reduction-button ${isReduced ? 'reduced' : ''}`}  // 使用CSS類別
                style=
                {{ 
                  backgroundColor: isReduced ? "var(--chart-1) " : "#d0f0c0",
                }}
              >
                {isReduced ? "Cancel reduction" : "Enable reduction"}
              </button>

              {/* 渲染基因列表 */}
              {currentGenes.map((gene) => (
                <div
                  key={gene.name}
                  onClick={() => handleSelect(gene.name)}
                  className={`gene-list-item ${selectedGene === gene.name ? 'selected' : ''}`}  // 添加選中樣式
                  style={{ backgroundColor: getGeneColor(gene.name) }}  
                >
                  <span className="gene-name">
                    {reduceGeneName(gene.name)} {/* 顯示縮減後的基因名稱 */}
                  </span>
                </div>
              ))}

              <div className="pagination-controls">
                <button onClick={() => handlePageChange("prev")} disabled={currentPage === 0}>Prev</button>
                <span>{currentPage + 1} / {totalPages}</span>
                <button onClick={() => handlePageChange("next")} disabled={currentPage === totalPages - 1}>Next</button>
              </div>
            </div>

            <div className="flex-column-container" style={{ flex: 1 }}>
              <strong>Select comparison range：</strong>

              <div className="button-group">
                <button onClick={() => filterBySimilarity(100, 100)}>100%</button>
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
                  className="range-input"
                />
                <span>~</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={customMax}
                  onChange={(e) => setCustomMax(Number(e.target.value))}
                  className="range-input"
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

              {progress && <p className="comparing-text">Comparing...</p>}

              {results.length > 0 && (
                <div className="results-container">
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
                  <div className="pagination-controls">
                    <button onClick={() => handleResultsPageChange("prev")} disabled={resultsPage === 0}>Prev</button>
                    <span> {resultsPage + 1} / {resultsTotalPages} </span>
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
                <div className="no-results">No similar genes</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default GeneSelector;

