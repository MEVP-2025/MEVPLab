import React, { useState, useMemo, useEffect } from "react";

const GeneList = ({  
  genes,
  selectedGene,
  activeSimilarityGroup,
  selectedGenes,
  setSelectedGenes,
  geneColors,
  searchTerm,
  setSearchTerm,
  cityVisibility,
  onCityVisibilityChange,  // 用來控制城市圓形圖的顯示
  filteredCityGeneData,    // 用來顯示城市的數據
  onFilteredGenesChange,
   isReduced,
  setIsReduced,
}) => {
  const [showGenes, setShowGenes] = useState(true); // 控制顯示基因或城市
  
  const [currentPage, setCurrentPage] = useState(1);

  const genesPerPage = 50;

  const allGenes = useMemo(() => (genes || []).map((g) => g.name), [genes]);

  const filteredGeneList = useMemo(
    () => allGenes.filter((name) => name.toLowerCase().includes(searchTerm.toLowerCase())),
    [allGenes, searchTerm]
  );

  // 控制縮減顯示
  const reduceGeneName = (geneName) => {
    const match = geneName.match(/^([A-Za-z0-9]+_\d+)_\d+$/);
    if (match && isReduced) {
      return match[1];
    }
    return geneName;
  };

  const getDisplayGenes = (list) => {
    if (!isReduced) return list;
    const seen = new Set();
    return list.filter((name) => {
      const reduced = reduceGeneName(name);
      if (seen.has(reduced)) return false;
      seen.add(reduced);
      return true;
    });
  };

  const reducedGeneList = useMemo(() => getDisplayGenes(filteredGeneList), [filteredGeneList, isReduced]);

  const totalPages = Math.max(1, Math.ceil(reducedGeneList.length / genesPerPage));

  const getSortedGenes = () => {
    const selectableGenes = reducedGeneList.filter((name) => {
      const isEnabled =
        name === selectedGene ||
        (Array.isArray(activeSimilarityGroup) && activeSimilarityGroup.includes(name));
      return isEnabled;
    });
    
    const nonSelectableGenes = reducedGeneList.filter((name) => !selectableGenes.includes(name));
    return [...selectableGenes, ...nonSelectableGenes];
  };

  const sortedGenes = useMemo(() => getSortedGenes(), [reducedGeneList, selectedGene, activeSimilarityGroup]);

  const currentGenes = sortedGenes.slice(
    (currentPage - 1) * genesPerPage,
    currentPage * genesPerPage
  );

  const toggleGene = (name) => {
    setSelectedGenes((prev) =>
      prev.includes(name) ? prev.filter((g) => g !== name) : [...prev, name]
    );
  };

  // 控制城市圓形圖顯示/隱藏
  const toggleCityVisibility = (city) => {
    onCityVisibilityChange((prevVisibility) => ({
      ...prevVisibility,
      [city]: !prevVisibility[city],
    }));
  };

  // 分頁功能
  const goToPrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const goToNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  const handleSelectAll = () => {
    const selectableGenes = currentGenes.filter((name) => {
      const isEnabled =
        name === selectedGene ||
        (Array.isArray(activeSimilarityGroup) && activeSimilarityGroup.includes(name));
      return isEnabled;
    });
    setSelectedGenes(selectableGenes);
  };

  const handleClearAll = () => setSelectedGenes([]);

  // 在 GeneList 組件中，過濾後的基因傳遞到父組件
  useEffect(() => {
    onFilteredGenesChange(reducedGeneList); 
  }, [reducedGeneList]);

  // 控制城市搜尋框過濾
  const [citySearchTerm, setCitySearchTerm] = useState(""); // 用來過濾城市
  const filteredCities = useMemo(() => {
    return Object.keys(filteredCityGeneData).filter((city) =>
      city.toLowerCase().includes(citySearchTerm.toLowerCase())
    );
  }, [citySearchTerm, filteredCityGeneData]);

  // 控制全選和清除
  const handleCitySelectAll = () => {
    const allCities = Object.keys(filteredCityGeneData);
    onCityVisibilityChange((prevVisibility) => {
      const updatedVisibility = { ...prevVisibility };
      allCities.forEach((city) => {
        updatedVisibility[city] = true;
      });
      return updatedVisibility;
    });
  };

  const handleCityClearAll = () => {
    onCityVisibilityChange((prevVisibility) => {
      const updatedVisibility = { ...prevVisibility };
      Object.keys(filteredCityGeneData).forEach((city) => {
        updatedVisibility[city] = false;
      });
      return updatedVisibility;
    });
  };

  return (
    <div style={{ minWidth: "20%" }}>
      {/* 切換按鈕區 */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
        <button onClick={() => setShowGenes(true)} style={{ padding: "5px 10px" }}>
          Select display Genes
        </button>
        <button onClick={() => setShowGenes(false)} style={{ padding: "5px 10px" }}>
          Select display City
        </button>
      </div>

      {/* 根據 showGenes 狀態顯示對應區域 */}
      {showGenes ? (
        <>
          {/* Gene List Header */}
          <h4 style={{ whiteSpace: "nowrap" }}>Select display Genes：</h4>

          {/* Search Input */}
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search"
            className="search-input"
            style={{ width: "100%", padding: "6px", marginBottom: "8px" }}
          />

          {/* 新增縮減按鈕 */}
          <button
            onClick={() => setIsReduced(!isReduced)}
            style={{
              marginBottom: "10px",
              backgroundColor: isReduced ? "#ffcccb" : "#d0f0c0",
              padding: "5px 10px",
              border: "1px solid #aaa",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            {isReduced ? "Cancel reduction" : "Enable reduction"}
          </button>

          {/* Gene Selection Buttons */}
          <div className="flex flex-gap-5" style={{ marginBottom: "8px" }}>
            <button onClick={handleSelectAll}>Select All</button>
            <button onClick={handleClearAll}>Clear All</button>
          </div>

          {/* Genes List */}
          <div style={{ maxHeight: "800px", overflowY: "auto", paddingRight: "5px" }}>
            {currentGenes.map((name) => {
              const isEnabled =
                name === selectedGene ||
                (Array.isArray(activeSimilarityGroup) && activeSimilarityGroup.includes(name));
              return (
                <label
                  key={name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    opacity: isEnabled ? 1 : 0.3,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedGenes.includes(name)}
                    onChange={() => toggleGene(name)}
                    disabled={!isEnabled}
                    style={{ cursor: isEnabled ? "pointer" : "not-allowed" }}
                  />
                  <span style={{ color: geneColors[name] || "black" }}>
                    {reduceGeneName(name)}
                  </span>
                </label>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="pagination-controls" style={{ marginTop: "8px" }}>
            <button onClick={goToPrevPage} disabled={currentPage === 1}>
              Prev
            </button>
            <span>
              {currentPage} / {totalPages}
            </span>
            <button onClick={goToNextPage} disabled={currentPage === totalPages}>
              Next
            </button>
          </div>
        </>
      ) : (
        <>
          {/* City Pie Chart Visibility Control */}
          <div style={{ marginTop: "20px" }}>
            <h4 style={{ whiteSpace: "nowrap" }}>Select display City</h4>

            {/* City Search Input */}
            <input
              type="text"
              value={citySearchTerm}
              onChange={(e) => setCitySearchTerm(e.target.value)}
              placeholder="Search"
              className="search-input"
              style={{ width: "100%", padding: "6px", marginBottom: "8px" }}
            />

            {/* City Select All / Clear All */}
            <div style={{ marginBottom: "8px" }}>
              <button onClick={handleCitySelectAll}>Select All</button>
              <button onClick={handleCityClearAll}>Clear All</button>
            </div>

            {/* City List */}
            <div style={{ maxHeight: "300px", overflowY: "auto" }}>
              {filteredCities.map((city) => (
                <label
                  key={city}
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <input
                    type="checkbox"
                    checked={cityVisibility[city] || false}
                    onChange={() => toggleCityVisibility(city)}
                  />
                  <span>{city}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default GeneList;
