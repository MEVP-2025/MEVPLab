import { useMemo, useState } from "react";

import "./GeneTable.css";

import GeneTableContent from "./GeneTableContent";
import GeneTableControls from "./GeneTableControls";
import { useGeneTableEffects } from "./hooks/useGeneTableEffects";

const GeneTable = ({
  // ==== Data & Gene Props ====
  genes,
  geneColors,
  eDnaSampleContent,
  eDnaTagsContent,

  // ==== Pagination ====
  currentPage,
  itemsPerPage,
  setCurrentPage,

  // ==== Map & City Data ====
  updateMapData,
  setCityGeneData,
  setTotalCityGeneData,
  imgW,
  imgH,
  lonRange,
  latRange,

  // ==== Table Modes ====
  onViewModeChange,
  onHapColorsChange,
  onHapHeadersChange,

  // ==== Hap Pagination ====
  hapPage,
  onHapPageChange,
  hapsPerPage = 10,

  // ==== CSV ====
  fileName,
  csvContent,
  csvFileName,

  // ==== Selection ====
  selectedGenes: externalSelectedGenes = [],
  onSelectedGenesChange,
  selectedLocations = {},
  onSelectedLocationsChange,

  // ==== Editing ====
  onEditGeneCount,
  onEditGeneCountBulk,
}) => {
  // ======================================
  //  State & Memo
  // ======================================
  const [searchTerm, setSearchTerm] = useState("");
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [viewMode, setViewMode] = useState("count");
  const [ednaMapping, setEdnaMapping] = useState({});
  const [tagMapping, setTagMapping] = useState({});
  const [locations, setLocations] = useState([]);
  const [totalTableData, setTotalTableData] = useState([]);

  const [filterMode, setFilterMode] = useState("all");
  const [hapColors, setHapColors] = useState({});
  const [speciesOptions, setSpeciesOptions] = useState([]);
  const [currentSpecies, setCurrentSpecies] = useState("");

  const [minPercentage, setMinPercentage] = useState(0.01);  // 預設最小百分比為 0
  const [maxPercentage, setMaxPercentage] = useState(100); // 預設最大百分比為 100


  const selectedGenesSet = useMemo(() => new Set(externalSelectedGenes), [externalSelectedGenes]);

  const HAPS_PER_PAGE = hapsPerPage;
  const totalHeaders = totalTableData[0] || [];
  const staticHeaders = totalHeaders.slice(0, 2);
  const hapHeaders = useMemo(() => totalHeaders.slice(2), [totalHeaders]);

  const totalHapPages = Math.ceil(hapHeaders.length / HAPS_PER_PAGE);
  const startHapIdx = (hapPage - 1) * HAPS_PER_PAGE;
  const endHapIdx = startHapIdx + HAPS_PER_PAGE;
  const currentHapHeaders = hapHeaders.slice(startHapIdx, endHapIdx);
  const displayedHeaders = [...staticHeaders, ...currentHapHeaders];

  const displayedTableData = totalTableData.map((row) =>
    displayedHeaders.map((header) => row[totalHeaders.indexOf(header)] || "")
  );

  const filteredGenes = useMemo(() => {
    let result = genes.filter((g) => g.name.toLowerCase().includes(searchTerm.toLowerCase()));

    if (viewMode === "detail" && currentSpecies) {
      result = result.filter((g) => {
        const nameParts = g.name.split("_");
        return nameParts.includes(currentSpecies) || (fileName && fileName.startsWith(currentSpecies));
      });
    }

    if (showOnlySelected) result = result.filter((g) => selectedGenesSet.has(g.name));
    return result;
  }, [genes, searchTerm, showOnlySelected, selectedGenesSet, viewMode, currentSpecies, fileName]);

  const paginatedGenes = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredGenes.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredGenes, currentPage, itemsPerPage]);


   // 分頁邏輯
  const totalPages = Math.ceil(genes.length / itemsPerPage);

    // 處理 formattedGenes 的分頁
  const formattedGenesPaginated = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return genes.slice(startIdx, startIdx + itemsPerPage); // 這裡假設 `formattedGenes` 是已經有過濾的數據
  }, [genes, currentPage, itemsPerPage]);

  // 分頁控制 UI
  const handlePageChange = (direction) => {
    setCurrentPage((prevPage) => {
      const nextPage = direction === 'next' ? prevPage + 1 : prevPage - 1;
      return Math.min(Math.max(1, nextPage), totalPages);
    });
  };


  // ======================================
  //  Side Effects (拆出去的 useEffect)
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
  //  Render
  // ======================================
  return (
    
    <div 
      style=
      {{ 
        overflowX: "auto",
          padding: 10,
          width: "100%",
           
          justifyContent: "space-between", // 在兩個組件之間保持間距
        }}>

        
      <h2>Gene information table</h2>
      
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
      <div style={{ width: "100%" }}>
      <GeneTableContent
        viewMode={viewMode}
        paginatedGenes={viewMode === "total" ? formattedGenesPaginated : paginatedGenes} // 根據 viewMode 顯示對應的基因數據
        
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
        onHapPageChange={onHapPageChange}
        filterMode={filterMode}
        setFilterMode={setFilterMode}
        minPercentage={minPercentage} 
        maxPercentage={maxPercentage}
        setMinPercentage={setMinPercentage}
        setMaxPercentage={setMaxPercentage}
        
      />
      </div>

    {/* 分頁控制 */}
    {(viewMode === "count" || viewMode === "detail")&& (
       <div className="pagination">
        <button onClick={() => handlePageChange('prev')} disabled={currentPage === 1}>
          Prev
        </button>
        <span>{currentPage} / {totalPages}</span>
        <button onClick={() => handlePageChange('next')} disabled={currentPage === totalPages}>
          Next
        </button>
      </div>
    )}


    </div>
    
  );
};

export default GeneTable;
