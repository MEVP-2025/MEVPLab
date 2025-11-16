import React, { useState, useEffect, useMemo } from "react";

import MapControls from "./MapControls";
import MapMainView from "./MapMainView";
import GeneList from "./GeneList";

import useMapSettings from "./hooks/useMapSettings";
import useMouseLatLon from "./hooks/useMouseLatLon";
import useCityGeneData from "./hooks/useCityGeneData";
import useExportMap from "./hooks/useExportMap";
import useGeneSelection from "./hooks/useGeneSelection";

const TaiwanMapComponent = ({
  genes,
  cityGeneData,
  totalCityGeneData,
  geneColors,
  onSelectedGenesChange,
  onMapSettingsChange,
  selectedGene,
  activeSimilarityGroup,
   isReduced, 
   setIsReduced,

}) => {
  const [searchTerm, setSearchTerm] = useState(""); 
  
  const [selectedGenes, setSelectedGenes] = useState([]);
  const [cityVisibility, setCityVisibility] = useState({});

   const [filteredGeneList, setFilteredGeneList] = useState([]);

  const onFilteredGenesChange = (filteredGenes) => {
    setFilteredGeneList(filteredGenes);
  };

  // 在此處設置 cityVisibility 的初始狀態
  useEffect(() => {
    const initialVisibility = Object.keys(cityGeneData).reduce((acc, city) => {
      acc[city] = true; // 默認所有城市都顯示
      return acc;
    }, {});
    setCityVisibility(initialVisibility);
  }, [cityGeneData]);

  const onCityVisibilityChange = (newVisibility) => {
    setCityVisibility(newVisibility);  // 更新城市可見性
  };


  // 初始化 selectedGenes
  useEffect(() => {
    const allowed = new Set([
      selectedGene,
      ...(Array.isArray(activeSimilarityGroup) ? activeSimilarityGroup : []),
    ]);
    setSelectedGenes(Array.from(allowed).filter(Boolean));
  }, [selectedGene, activeSimilarityGroup]);

  useEffect(() => {
    onSelectedGenesChange?.(selectedGenes);
  }, [selectedGenes, onSelectedGenesChange]);


  
  // ===== Map Settings =====
  const {
    imgW,
    imgH,
    safeImgW,
    safeImgH,
    lonRange,
    latRange,
    lonDirMin,
    lonDirMax,
    latDirMin,
    latDirMax,
    activeMapId,
    mapImage,
    mapLoaded,
    setImgW,
    setImgH,
    setLonRange,
    setLatRange,
    setLonDirMin,
    setLonDirMax,
    setLatDirMin,
    setLatDirMax,
    setActiveMapId,
    setMapImage,
    handleSwitchMap,
    handleImageUpload,
    conW,
    conH,
  } = useMapSettings(onMapSettingsChange);

  // ===== Mouse Lat/Lon =====
  const { latLon, handleMouseMove, decimalToDegreeMinuteWithDir } = useMouseLatLon(
    safeImgW,
    safeImgH,
    conW,
    conH,
    lonRange,
    latRange
  );

  // ===== Filtered City Gene Data =====

 const [mapPage, setMapPage] = useState(0);



  useEffect(() => {
    if (cityGeneData && Object.keys(cityGeneData).length > 0) setMapPage(0);
  }, [cityGeneData]);

  useEffect(() => {
    if (totalCityGeneData && Object.keys(totalCityGeneData).length > 0) setMapPage(1);
  }, [totalCityGeneData]);

  const { filteredCityGeneData, selectedCity, setSelectedCity } = useCityGeneData({
    cityGeneData,
    totalCityGeneData,
    selectedGenes,
    mapPage,
    safeImgW,
    safeImgH,
    conW,
    conH
  });

  // ===== Export Map =====
  const handleExportPNG = useExportMap(filteredCityGeneData, geneColors, selectedGenes);

  // ===== Render =====
  return (
  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    {/* MapControls - The controls component on top */}
    <div
      style={{
        minWidth: "100%",
       
        background: "#ffffff",
        padding: "15px",
        boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
        overflow: "auto",
        border: "2px solid #ccc",
        borderRadius: "12px",
      }}
    >
      <MapControls
        imgW={imgW}
        imgH={imgH}
        lonRange={lonRange}
        latRange={latRange}
        lonDirMin={lonDirMin}
        lonDirMax={lonDirMax}
        latDirMin={latDirMin}
        latDirMax={latDirMax}
        setImgW={setImgW}
        setImgH={setImgH}
        setLonRange={setLonRange}
        setLatRange={setLatRange}
        setLonDirMin={setLonDirMin}
        setLonDirMax={setLonDirMax}
        setLatDirMin={setLatDirMin}
        setLatDirMax={setLatDirMax}
        activeMapId={activeMapId}
        setActiveMapId={setActiveMapId}
        setMapImage={setMapImage}
        handleImageUpload={handleImageUpload}
        handleSwitchMap={handleSwitchMap}
      />
    </div>

    
    <div style={{ display: "flex", gap: "10px",minWidth: "100%", }}>
      {/* MapMainView - The main map view on the bottom */}
      <div
        style={{
          minWidth: "60%",
          flex: 2,
          background: "#ffffffff",
          padding: "6px",
          boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
          overflow: "auto",
          border: "8px solid #e9e4e4ff",
          borderRadius: "12px",
        }}
      >
        <MapMainView
          conW={conW}
          conH={conH}
          mapImage={mapImage}
          imgW={safeImgW}
          imgH={safeImgH}
          filteredCityGeneData={filteredCityGeneData}
          cityVisibility={cityVisibility}
          selectedCity={selectedCity}
          setSelectedCity={setSelectedCity}
          geneColors={geneColors}
          latLon={latLon}
          handleMouseMove={handleMouseMove}
          decimalToDegreeMinuteWithDir={decimalToDegreeMinuteWithDir}
          handleExportPNG={handleExportPNG}
          mapLoaded={mapLoaded}
           filteredGeneList={filteredGeneList}
        />
      </div>

      {/* GeneList */}
        <GeneList
          
          genes={genes}
          selectedGene={selectedGene}
          activeSimilarityGroup={activeSimilarityGroup}
          selectedGenes={selectedGenes}
          setSelectedGenes={setSelectedGenes}
          geneColors={geneColors}
          searchTerm={searchTerm} 
          setSearchTerm={setSearchTerm}
          
          cityVisibility={cityVisibility}
          onCityVisibilityChange={onCityVisibilityChange}
          filteredCityGeneData={filteredCityGeneData}
          onFilteredGenesChange={onFilteredGenesChange}
           isReduced={isReduced}
           setIsReduced={setIsReduced}
        />

    </div>  
  </div>
);

};

export default TaiwanMapComponent;

