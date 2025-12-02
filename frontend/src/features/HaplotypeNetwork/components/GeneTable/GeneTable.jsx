import { useState, useMemo, useCallback, useEffect } from "react";
import "../styles/GeneTable.css";

import GeneTableControls from "./GeneTableControls";
import GeneTableContent from "./GeneTableContent";
import { useGeneTableEffects } from "./hooks/useGeneTableEffects";
import { usePagination } from "./hooks/pagination";

const GeneTable = ({
  activeSection,
  // ==== Data & Gene Props ====
  genes,
  geneColors,
  onFormattedGeneColorsChange,
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
  selectedLocations = [],
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
  const [viewMode, setViewMode] = useState(() => {
    if (activeSection === "geneComponents" || activeSection === "haplotypeNetwork") {
      return "count";
    }
    return "total";
  });  
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
  const [, setFormattedGeneColors] = useState([]);

  // 基因分页
  const itemsPerPage = 10;  // 每页显示的基因数目
  const hapsPerPage = 15;  // 每页显示的haplotype数目

  const [ ,setHapHeaders] = useState([]);
  const onHapHeadersChange = setHapHeaders;

  // ====== Data for Gene Table ======
  const selectedGenesSet = useMemo(() => new Set(externalSelectedGenes), [externalSelectedGenes]);
  const [totalTableData, setTotalTableData] = useState([]);  // 存储所有表格数据
  
  const totalHeaders = totalTableData[0] || [];  // 总表头
  const hapHeaders = useMemo(() => totalHeaders.slice(0), [totalHeaders]);  // Haplotype表头

  

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

  

 // Memoize the `handleFormattedGenesChange` callback to avoid infinite loop
  const handleFormattedGenesChange = useCallback((genes, colors, counts) => {
  setFormattedGenesChange({ genes, colors, counts });
  setFormattedGeneColors(colors);

  // Call the parent callback to send the colors up
  if (onFormattedGeneColorsChange) {
    onFormattedGeneColorsChange(colors);
  }
}, [onFormattedGeneColorsChange]);

  useEffect(() => {
    if (activeSection === "geneComponents" || activeSection === "haplotypeNetwork") {
      setViewMode("count");
    } else {
      setViewMode("total");
    }
  }, [activeSection]);

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
          // 基本配置
          viewMode={viewMode}
          
          // 基因數據
          
          geneColors={geneColors}
          genes={genes}

          // haplotype 顏色
          hapColors={hapColors}
          
          // 地點相關
          locations={locations}
          selectedLocations={selectedLocations}
          onSelectedLocationsChange={onSelectedLocationsChange}
          
          // 基因選擇相關
          selectedGenesSet={selectedGenesSet}
          externalSelectedGenes={externalSelectedGenes}
          onSelectedGenesChange={onSelectedGenesChange}

          showOnlySelected={showOnlySelected}
          setShowOnlySelected={setShowOnlySelected}
          
          // 基因數量相關
          onEditGeneCount={onEditGeneCount}
          onEditGeneCountBulk={onEditGeneCountBulk}

          // 地圖更新
          updateMapData={updateMapData}

          // 物種相關
          speciesOptions={speciesOptions}
          currentSpecies={currentSpecies}
          setCurrentSpecies={setCurrentSpecies}

          // 標籤映射
          tagMapping={tagMapping}
          ednaMapping={ednaMapping}
          
          // 檔案名稱
          fileName={fileName}
          
          // 表格顯示相關
          displayedHeaders={hapHeaders}
          displayedTableData={totalTableData}        
          
          // 分頁控制
          hapPage={hapPage}
          
          onHapPageChange={setHapPage}
          
          // 過濾條件
          filterMode={filterMode}
          setFilterMode={setFilterMode}
          minPercentage={minPercentage}
          maxPercentage={maxPercentage}
          setMinPercentage={setMinPercentage}
          setMaxPercentage={setMaxPercentage}

          // 格式化基因變更
          onFormattedGenesChange={handleFormattedGenesChange}
        />


      </div>

      {/* Pagination Controls      
      {( viewMode === "detail") && (
        <div className="pagination">
          <button onClick={() => handlePageChange('prev')} disabled={currentPage === 1}>Prev</button>
          <span>{currentPage} / {totalPages}</span>
          <button onClick={() => handlePageChange('next')} disabled={currentPage === totalPages}>Next</button>
        </div>
      )}
      */}
      
    </div>
  );
};

export default GeneTable;
