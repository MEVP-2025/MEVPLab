import React from "react";
import FATable from "./FATable";
import InformationTable from "./InformationTable";
import CVSTable from "./CVSTable";
import FormattedGeneFATable from "./FormattedGeneFATable";  // 引入新组件

const GeneTableContent = ({
  viewMode,
  paginatedGenes,
  geneColors,
  locations,
  selectedGenesSet,
  selectedLocations,
  externalSelectedGenes,
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
  if (viewMode === "count")
    return (
       
      <FATable
        paginatedGenes={paginatedGenes}
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
      />
    );

  if (viewMode === "formatted")
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

  if (viewMode === "detail")
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

  if (viewMode === "total" && displayedTableData.length > 0)
    return (
      <CVSTable
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
    );

  return null;
};

export default GeneTableContent;
