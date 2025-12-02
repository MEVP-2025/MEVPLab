import React, { useState, useEffect } from "react";
import FATable from "./Table/FATable";
import InformationTable from "./Table/InformationTable";
import CVSTable from "./Table/CVSTable";
import FormattedGeneFATable from "./Table/FormattedGeneFATable";  

const GeneTableContent = ({
  viewMode,
  paginatedGenes,
  geneColors,
  locations,
  selectedGenesSet,
  selectedLocations,
  externalSelectedGenes,
  showOnlySelected,
  setShowOnlySelected,
  onSelectedGenesChange,
  onSelectedLocationsChange,
  onEditGeneCount,
  onEditGeneCountBulk,
  onFormattedGenesChange,
  updateMapData,
  genes,
  speciesOptions,
  currentSpecies,
  setCurrentSpecies,
  tagMapping,
  ednaMapping,
  fileName,
  displayedHeaders,
  displayedTableData,
  hapColors,
  hapPage,
  totalHapPages,
  onHapPageChange,
  filterMode,
  setFilterMode,
  minPercentage,
  maxPercentage,
  setMinPercentage,
  setMaxPercentage,
  
}) => {

  const [isConfigured, setIsConfigured] = useState(false); // 用來判斷是否完成設定

  useEffect(() => {
    // 根據不同的 viewMode 設定所需的檔案是否完成
    const isAllConfigured = 
      (viewMode === "count" && Array.isArray(genes) && genes.length > 0 && Array.isArray(locations) && locations.length > 0) ||
      (viewMode === "formatted" && Array.isArray(locations) && locations.length > 0) ||
      (viewMode === "detail" && (Array.isArray(genes) && genes.length === 0 || Array.isArray(genes) && genes.length > 0 ) && Array.isArray(locations) && locations.length > 0 && typeof tagMapping === "object" && tagMapping !== null && Object.keys(tagMapping).length > 0) ||
      (viewMode === "total" && Array.isArray(displayedHeaders) && displayedHeaders.length > 0) && Array.isArray(locations) && locations.length > 0;
      
    setIsConfigured(isAllConfigured);
  }, [genes, locations, tagMapping, ednaMapping, displayedHeaders, viewMode]);



  // 定義顯示資料缺失的提示函式
  const renderUploadWarning = () => (
    <div className ="GeneTable-warning-box"
    >
      <p>⚠️ Complete the following settings：</p>
      <ul>
        {viewMode === "" && (
          <>
            {(!viewMode) && <li> Select Summary_table or FA_table</li>}
          </>  
        )}
        {viewMode === "count" && (
          <>
            {(!genes || Array.isArray(genes) && genes.length === 0) && <li> Upload Fa File</li>}
            {(!locations || Array.isArray(locations) && locations.length === 0)&& <li> Upload eDNA Sample Station (xlsx)</li>}
          </>
        )}
        {viewMode === "formatted" && (
          <>
            {(!genes || Array.isArray(genes) && genes.length === 0) && <li> Upload Fa File</li>}
            {(!locations || Array.isArray(locations) && locations.length === 0)&& <li> Upload eDNA Sample Station (xlsx)</li>}
          </>
        )}
        {/*
        {viewMode === "detail" && (
          <>
            {(!paginatedGenes || Array.isArray(paginatedGenes) && paginatedGenes.length === 0) && <li> Upload Fa File</li>}
            {(!locations || Array.isArray(locations) && locations.length === 0) && <li> Upload eDNA Sample Station (xlsx)</li>}
            {(!tagMapping || (typeof tagMapping === "object" && Object.keys(tagMapping).length === 0)) && <li> Upload eDNA_tags (xlsx, cvs)</li>}
          </>
        )}
        */}
        {viewMode === "total" && (
          <>
            {(!displayedHeaders || Array.isArray(displayedHeaders) && displayedHeaders.length === 0) && <li> Upload Cvs File</li>}
            {(!locations || Array.isArray(locations) && locations.length === 0)&& <li> Upload eDNA Sample Station (xlsx)</li>}
          </>
        )}
      </ul>
    </div>
  );

  // 根據資料檢查來顯示提示
  if (!isConfigured) {
    return renderUploadWarning();
  }


  if (viewMode === "count") {
    return (
      <FATable
       
        geneColors={geneColors}
        locations={locations}
        selectedGenesSet={selectedGenesSet}
        externalSelectedGenes={externalSelectedGenes}
        onSelectedGenesChange={onSelectedGenesChange}
        selectedLocations={selectedLocations}
        onSelectedLocationsChange={onSelectedLocationsChange}
        onEditGeneCount={onEditGeneCount}
        onEditGeneCountBulk={onEditGeneCountBulk}
        updateMapData={updateMapData}
        genes={genes}
        viewMode={viewMode}

        showOnlySelected={showOnlySelected}
        setShowOnlySelected={setShowOnlySelected}
      />
    );
  }

  if (viewMode === "formatted") {
    return (
      <FormattedGeneFATable
        locations={locations}
        selectedLocations={selectedLocations}
        externalSelectedGenes={externalSelectedGenes}
        onSelectedGenesChange={onSelectedGenesChange}
        onSelectedLocationsChange={onSelectedLocationsChange}
        onEditGeneCount={onEditGeneCount}
        onEditGeneCountBulk={onEditGeneCountBulk}
        updateMapData={updateMapData}
        onFormattedGenesChange={onFormattedGenesChange}
      />
    );
  }

  {/*  
  if (viewMode === "detail") {
    return (
      <InformationTable
        paginatedGenes={paginatedGenes}
        geneColors={geneColors}
        speciesOptions={speciesOptions}
        currentSpecies={currentSpecies}
        setCurrentSpecies={setCurrentSpecies}
        tagMapping={tagMapping}
        ednaMapping={ednaMapping}
        fileName={fileName}
      />
    );
  }
  */}

  if (viewMode === "total" && displayedTableData.length > 0) {
    return (
      <CVSTable
        displayedHeaders={displayedHeaders}
        displayedTableData={displayedTableData}
        hapColors={hapColors}
        selectedLocations={selectedLocations}
        onSelectedLocationsChange={onSelectedLocationsChange}       
        filterMode={filterMode}
        setFilterMode={setFilterMode}
        minPercentage={minPercentage}
        maxPercentage={maxPercentage}
        setMinPercentage={setMinPercentage}
        setMaxPercentage={setMaxPercentage}
      />
    );
  }

  return null;
};

export default GeneTableContent;
