import React, { useState, useMemo, useCallback } from "react";
<<<<<<< Updated upstream
import "/frontend/src/HaplotypeNetwork/components/GeneTable/GeneTable.css";
=======
import "./GeneTable.css";
>>>>>>> Stashed changes

import GeneTableControls from "./GeneTableControls";
import GeneTableContent from "./GeneTableContent";
import { useGeneTableEffects } from "./hooks/useGeneTableEffects";

const GeneTable = ({
  // ==== Data & Gene Props ====
  genes,
  geneColors,
  eDnaSampleContent,
  eDnaTagsContent,

  // ==== Pagination ====
  fileName,
  csvContent,
  csvFileName,

  // ==== Map & City Data ====
  updateMapData,
  setCityGeneData,
  setTotalCityGeneData,
  setFormattedCityGeneData,
  imgW,
  imgH,
  lonRange,
  latRange,

  // ==== Table Modes ====
  onViewModeChange,
  onHapColorsChange,

  // ==== CSV ====
  selectedGenes: externalSelectedGenes = [],
  onSelectedGenesChange,
  selectedLocations = {},
  onSelectedLocationsChange,

  // ==== Editing ====
  onEditGeneCount,
  onEditGeneCountBulk,
}) => {
  // ======================================
  // State & Memo
  // ======================================
  const [searchTerm, setSearchTerm] = useState("");  // 搜索框的关键词
  const [showOnlySelected, setShowOnlySelected] = useState(false);  // 是否仅显示已选择的基因
  const [viewMode, setViewMode] = useState("count");  // 当前显示的视图模式（例如：数量，详细信息等）
  const [currentSpecies, setCurrentSpecies] = useState("");
  const [filterMode, setFilterMode] = useState("all");  // 过滤模式（例如：全部、特定）
  const [currentPage, setCurrentPage] = useState(1);  // 当前页面
  const [hapPage, setHapPage] = useState(1);  // 当前的haplotype分页页码

  const [hapColors, setHapColors] = useState({});
  const [locations, setLocations] = useState([]);

  const [minPercentage, setMinPercentage] = useState(0.01);  // 預設最小百分比為 0
  const [maxPercentage, setMaxPercentage] = useState(100); // 預設最大百分比為 100

  const [ednaMapping, setEdnaMapping] = useState({});
  const [tagMapping, setTagMapping] = useState({});

  const [speciesOptions, setSpeciesOptions] = useState([]);

  const [onFormattedGenesChange, setFormattedGenesChange] = useState({
    genes: [],
    colors: [],
    counts: [],
  });

  // 基因分页
  const itemsPerPage = 10;  // 每页显示的基因数目
  const hapsPerPage = 15;  // 每页显示的haplotype数目

  const [hapHeaders1, setHapHeaders] = useState([]);
  const onHapHeadersChange = setHapHeaders;

  // ====== Data for Gene Table ======
  const selectedGenesSet = useMemo(() => new Set(externalSelectedGenes), [externalSelectedGenes]);
  const [totalTableData, setTotalTableData] = useState([]);  // 存储所有表格数据
  
  const totalHeaders = totalTableData[0] || [];  // 总表头
  const staticHeaders = totalHeaders.slice(0, 2);  // 固定的表头（例如：基因名称）
  const hapHeaders = useMemo(() => totalHeaders.slice(2), [totalHeaders]);  // Haplotype表头

  // 计算总页数
  const totalHapPages = Math.ceil(hapHeaders.length / hapsPerPage);
  const startHapIdx = (hapPage - 1) * hapsPerPage;
  const endHapIdx = startHapIdx + hapsPerPage;
  const currentHapHeaders = hapHeaders.slice(startHapIdx, endHapIdx);  // 当前显示的haplotype表头
  const displayedHeaders = [...staticHeaders, ...currentHapHeaders];  // 合并显示的表头
  
  // 显示的数据行
  const displayedTableData = totalTableData.map((row) =>
    displayedHeaders.map((header) => row[totalHeaders.indexOf(header)] || "")
  );

  // ====== Gene Filtering & Pagination ======
  const filteredGenes = useMemo(() => {
    let result = genes.filter((g) => g.name.toLowerCase().includes(searchTerm.toLowerCase()));

    // 如果是查看详细模式并且有物种过滤
    if (viewMode === "detail" && currentSpecies) {
      result = result.filter((g) => {
        const nameParts = g.name.split("_");
        return nameParts.includes(currentSpecies) || (fileName && fileName.startsWith(currentSpecies));
      });
    }

    if (showOnlySelected) result = result.filter((g) => selectedGenesSet.has(g.name));
    return result;
  }, [genes, searchTerm, showOnlySelected, selectedGenesSet, viewMode, currentSpecies, fileName]);

  // 分页后的基因数据
  const paginatedGenes = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredGenes.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredGenes, currentPage, itemsPerPage]);

  // 计算总页数
  const totalPages = Math.ceil(genes.length / itemsPerPage);

  // 格式化的基因分页
  const formattedGenesPaginated = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return genes.slice(startIdx, startIdx + itemsPerPage);  // 这里假设 `formattedGenes` 已经有过滤过的数据
  }, [genes, currentPage, itemsPerPage]);

  // 分页控制UI
  const handlePageChange = (direction) => {
    setCurrentPage((prevPage) => {
      const nextPage = direction === 'next' ? prevPage + 1 : prevPage - 1;
      return Math.min(Math.max(1, nextPage), totalPages);
    });
  };

 // Memoize the `handleFormattedGenesChange` callback to avoid infinite loop
  const handleFormattedGenesChange = useCallback((genes, colors, counts) => {
    setFormattedGenesChange({ genes, colors, counts });
  }, []);

  // ======================================
  // Side Effects (拆出去的 useEffect)
  // ======================================
  useGeneTableEffects({
    viewMode,
    onViewModeChange,
    csvContent,
    setTotalTableData,
    hapHeaders,
    onHapHeadersChange,
    hapColors,
    setHapColors,
    onHapColorsChange,

    onFormattedGenesChange,
    setFormattedCityGeneData,
    locations,
    genes,
    onEditGeneCountBulk,
    totalTableData,
    filterMode,
    minPercentage,
    maxPercentage,
    imgW,
    imgH,
    lonRange,
    latRange,
    geneColors,
    setCityGeneData,
    setTotalCityGeneData,
    ednaMapping,
    eDnaSampleContent,
    setEdnaMapping,
    setLocations,
    eDnaTagsContent,
    setTagMapping,
    setSpeciesOptions,
    fileName,
    speciesOptions,
    setCurrentSpecies,
  });


  
  // ======================================
  // Render
  // ======================================
  return (
    <div style={{ overflowX: "auto", padding: 10, width: "100%", justifyContent: "space-between" }}>
      <h2>Gene information table</h2>

      {/* GeneTable Controls */}
      <div style={{ width: "40%" }}>
        <GeneTableControls
          viewMode={viewMode}
          setViewMode={setViewMode}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          showOnlySelected={showOnlySelected}
          setShowOnlySelected={setShowOnlySelected}
          setFilterMode={setFilterMode}
          csvFileName={csvFileName}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          minPercentage={minPercentage} 
          maxPercentage={maxPercentage}
          setMinPercentage={setMinPercentage}
          setMaxPercentage={setMaxPercentage}
        />
      </div>

      {/* GeneTable Content */}
      <div style={{ width: "100%" }}>
        <GeneTableContent
          viewMode={viewMode}
          paginatedGenes={viewMode === "total" ? formattedGenesPaginated : paginatedGenes}
          geneColors={geneColors}
          locations={locations}
          selectedGenesSet={selectedGenesSet}
          selectedLocations={selectedLocations}
          externalSelectedGenes={externalSelectedGenes}
          onSelectedGenesChange={onSelectedGenesChange}
          onSelectedLocationsChange={onSelectedLocationsChange}
          onEditGeneCount={onEditGeneCount}
          onEditGeneCountBulk={onEditGeneCountBulk}
          updateMapData={updateMapData}
          genes={genes}
          speciesOptions={speciesOptions}
          currentSpecies={currentSpecies}
          setCurrentSpecies={setCurrentSpecies}
          tagMapping={tagMapping}
          ednaMapping={ednaMapping}
          fileName={fileName}
          displayedHeaders={displayedHeaders}
          displayedTableData={displayedTableData}
          hapColors={hapColors}

          hapPage={hapPage}
          totalHapPages={totalHapPages}
          onHapPageChange={setHapPage}

          filterMode={filterMode}
          setFilterMode={setFilterMode}
          minPercentage={minPercentage}
          maxPercentage={maxPercentage}
          setMinPercentage={setMinPercentage}
          setMaxPercentage={setMaxPercentage}

          onFormattedGenesChange={handleFormattedGenesChange}
        />
      </div>

      {/* Pagination Controls */}
      {(viewMode === "count" || viewMode === "detail") && (
        <div className="pagination">
          <button onClick={() => handlePageChange('prev')} disabled={currentPage === 1}>Prev</button>
          <span>{currentPage} / {totalPages}</span>
          <button onClick={() => handlePageChange('next')} disabled={currentPage === totalPages}>Next</button>
        </div>
      )}
    </div>
  );
};

export default GeneTable;
