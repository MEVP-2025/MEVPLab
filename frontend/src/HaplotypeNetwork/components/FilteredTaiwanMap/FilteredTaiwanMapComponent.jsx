import React, { useState, useEffect, useMemo } from "react";

import MapControls from "./MapControls";
import MapMainView from "./MapMainView";

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
  cityVisibility = {},
  onCityVisibilityChange,
  onMapSettingsChange,

  selectedGene,
  activeSimilarityGroup,
  

}) => {

  const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(0);
    const [selectedGenes, setSelectedGenes] = useState([]);
    const genesPerPage = 50;




// 初始化 selectedGenes
  const allGenes = useMemo(() => (genes || []).map((g) => g.name), [genes]);
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

  const filteredGeneList = useMemo(
    () => allGenes.filter((name) => name.toLowerCase().includes(searchTerm.toLowerCase())),
    [allGenes, searchTerm]
  );

  const currentGenes = filteredGeneList.slice(
    currentPage * genesPerPage,
    (currentPage + 1) * genesPerPage
  );
  const totalPages = Math.max(1, Math.ceil(filteredGeneList.length / genesPerPage));

  const toggleGene = (name) => {
    setSelectedGenes((prev) =>
      prev.includes(name) ? prev.filter((g) => g !== name) : [...prev, name]
    );
  };

  const handleSelectAll = () => setSelectedGenes(filteredGeneList);
  const handleClearAll = () => setSelectedGenes([]);


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

    

    {/* MapMainView - The main map view on the bottom */}
    <div
      style={{
        minWidth: "100%",
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
      />
    </div>



      {/* --- 基因清單 --- */}
      <div style={{ width: 300 }}>
        <h4>Select display genes：</h4>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search"
          className="search-input"
        />

        <div className="flex flex-gap-5" style={{ marginBottom: "8px" }}>
          <button onClick={handleSelectAll}>All</button>
          <button onClick={handleClearAll}>Clear</button>
        </div>

        {/* 基因清單 */}
        <div
          style={{ maxHeight: "460px", overflowY: "auto", paddingRight: "5px" }}
        >
          {currentGenes.map((name) => {
            const isEnabled =
              name === selectedGene ||
              (Array.isArray(activeSimilarityGroup) &&
                activeSimilarityGroup.includes(name));
            return (
              <label
                key={name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  opacity: isEnabled ? 1 : 0.4,
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedGenes.includes(name)}
                  onChange={() => toggleGene(name)}
                  disabled={!isEnabled}
                />
                <span style={{ color: geneColors[name] || "black" }}>{name}</span>
              </label>
            );
          })}
        </div>

        {/* 分頁控制 */}
        <div className="pagination-controls" style={{ marginTop: "8px" }}>
          <button
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
          >
            Previous page
          </button>
          <span>
            {" "}
            {currentPage + 1} / {totalPages}{" "}
          </span>
          <button
            onClick={() =>
              setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
            }
            disabled={currentPage >= totalPages - 1}
          >
            Next page
          </button>
        </div>
      </div>
  </div>
);

};

export default TaiwanMapComponent;