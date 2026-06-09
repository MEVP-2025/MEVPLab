import { useEffect, useState } from "react";
import { FixedSizeList as List } from "react-window";
import { getVizApiUrl } from "../../../config/api.js";
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
      return match[1]; 
    }
    return geneName; 
  };

  // 過濾出要顯示的基因名稱，並去除重複的基因
  const getDisplayGenes = (genes) => {
    const geneMap = {}; 
    const displayGenes = []; 

    genes.forEach((gene) => {
      const reducedName = reduceGeneName(gene.name); 

      if (!geneMap[reducedName]) {
        geneMap[reducedName] = true; 
        displayGenes.push(gene); 
      }
    });

    return displayGenes; 
  };

  // 當選擇了基因後，過濾掉結果中的選擇基因名稱（即選中的基因不顯示）
  const filterResults = (results, selectedGene) => {
    const seen = {}; 
    return results.filter((result) => {
      const reducedName = reduceGeneName(result.name);
      if (seen[reducedName]) {
        return false; 
      }
      seen[reducedName] = true;
      return reduceGeneName(result.name) !== reduceGeneName(selectedGene);
    });
  };

  // 分頁設定
  const pageSize = 15;
  const displayGenes = getDisplayGenes(filteredGenes); 
  const totalPages = Math.ceil(displayGenes.length / pageSize);
  const currentGenes = displayGenes.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  const resultsPerPage = 100;
  const resultsTotalPages = Math.ceil(results.length / resultsPerPage);
  const currentResults = filterResults(results, selectedGene).slice(resultsPage * resultsPerPage, (resultsPage + 1) * resultsPerPage);

  

  // Reset selection and related states
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
      selectedGeneName = geneName.replace(/_\d+$/, "_0");
    }
    resetSelection(); 
    setSelectedGene(selectedGeneName); 
    filterBySimilarity(100, 100);
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
    setActiveSimilarityGroup([]); 

    try {
      const res = await fetch(`${getVizApiUrl()}/sequences/sequences`);
      const { sequences } = await res.json();

      const response = await fetch(`${getVizApiUrl()}/sequences/compare`, {
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

      setActiveSimilarityGroup(filtered.map((g) => g.name));

      onSimilarityResults?.(filtered.map((g) => g.name));
      setProgress(null);
    } catch (err) {
      console.error("比对错误:", err);
      setProgress(null);
    }
  };

  const [isConfigured, setIsConfigured] = useState(false);
  const [isLengthConsistent, setIsLengthConsistent] = useState(true);

  useEffect(() => {
    if (selectedGene) {
      filterBySimilarity(100, 100); // 根據需要的相似度範圍調用
    }
  }, [selectedGene]); 

  useEffect(() => {
    const isAllConfigured =
      Array.isArray(genes) && genes.length > 0 &&
      Array.isArray(eDnaSampleContent) && eDnaSampleContent.length > 0;
    setIsConfigured(isAllConfigured);
  }, [genes, eDnaSampleContent]);

  useEffect(() => {
    const checkGeneSequenceLengths = async () => {
      try {
        const res = await fetch(`${getVizApiUrl()}/sequences/checkSequenceLengths`);
        const data = await res.json();

        if (!data.isConsistent) {
          setIsLengthConsistent(false);
        } else {
          setIsLengthConsistent(true);
        }
      } catch (err) {
        console.error("基因序列長度檢查錯誤:", err);
        setIsLengthConsistent(true);
      }
    };

    checkGeneSequenceLengths();
  }, [genes]);

  return (
    <div className="container">

      {/* 顯示基因序列長度不一致的提示 */}
      {!isLengthConsistent && (
        <div className="GeneSelector-warning-box">
          <p>⚠️ The ASV sequence lengths are different! Please check your data.</p>
        </div>
      )}

      {!isConfigured && (
        <div className="GeneSelector-warning-box">
          <p>⚠️ Complete the following settings：</p>
          <ul>
            {(!genes || !Array.isArray(genes) || genes.length === 0) && 
              <li> Upload Fa File </li>
            }
            {(!eDnaSampleContent ) && (
              <li> Upload eDNA Sample Station (xlsx)</li>
            )}
          </ul>
        </div>
      )}

      {/* 如果基因序列長度一致，顯示其他內容 */}
      {isLengthConsistent && isConfigured && (
        <div className="flex-container">
          <div className="flex-column-container">
            <div
              className="gene-selector-header"
              onClick={() => { resetSelection(); showAllGenes(); }}
            >
            </div>

            <input
              type="text"
              placeholder="Search ASV"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input" 
            />

             {/* 缩减按钮 
            <button 
              onClick={() => setIsReduced(!isReduced)} 
              className={`reduction-button ${isReduced ? 'reduced' : ''}`}  // 使用CSS類別
              style={{ 
                backgroundColor: isReduced ? "var(--chart-1)" : "#d0f0c0",
              }}
            >
              {isReduced ? "Cancel reduction" : "Enable reduction"}
            </button>
            */}

            {/* 渲染基因列表 */}
            {currentGenes.map((gene) => (
              <div
                key={gene.name}
                onClick={() => handleSelect(gene.name)}
                className={`gene-list-item ${selectedGene === gene.name ? 'selected' : ''}`}
              >
                <div className="gene-color-box"
                  style={{
                    backgroundColor: getGeneColor(gene.name),
                  }}
                ></div>
                <span className="gene-name">
                  {reduceGeneName(gene.name)} 
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
                className="GeneSelector-Search-button"
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
                        <span style={{ color: geneColors[name] || "#000" }}>
                          {reduceGeneName(name)}
                        </span> — {similarity.toFixed(1)}%
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

            {(customMin > customMax && customMin !== 0 && customMax !== 100) && (
              <div className="range-warning">
                <p>⚠️ Min should be ≤ Max. Please adjust.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GeneSelector;
