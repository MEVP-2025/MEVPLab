import React, { useState, useEffect, useRef } from "react";
import TaiwanMapComponent from "./components/TaiwanMap/TaiwanMapComponent";
import FilteredTaiwanMapComponent from "./components/FilteredTaiwanMap/FilteredTaiwanMapComponent";

import GeneTable from "./components/GeneTable/GeneTable";

import GeneSelector from "./components/GeneSelector";
import HaplotypeNetwork from "./components/HaplotypeNetwork";
import HaplotypeReducer from "./components/HaplotypeReducer";
import './HaplotypeNetworkApp.css';

const generateColors = (num) =>
  Array.from({ length: num }, () => 
    `hsl(${Math.floor(Math.random() * 360)}, ${Math.floor(Math.random() * 50) + 25}%, ${Math.floor(Math.random() * 50) + 25}%)`
);

const HaplotypeNetworkApp = ({
  initialFileContent = "",
  initialFileName = "",
  eDnaSampleContent = "",
  eDnaTagsContent = "",
  csvContent = "",
  csvFileName = "",
}) => {
  // =======================
  // State
  // =======================
  const [activeSection, setActiveSection] = useState("taiwanMap");
  const [isLocationMapVisible, setIsLocationMapVisible] = useState(true);
  const [genes, setGenes] = useState([]);
  const [geneColors, setGeneColors] = useState({});

   const [isReduced, setIsReduced] = useState(false);
  
  const [selectedGene, setSelectedGene] = useState(null);
  const [activeSimilarityGroup, setActiveSimilarityGroup] = useState([]);
  const [cityUpdateFlags, setCityUpdateFlags] = useState({});
  const [cityGeneData, setCityGeneData] = useState({});
  const [totalCityGeneData, setTotalCityGeneData] = useState({});
  const [FormattedCityGeneData, setFormattedCityGeneData] = useState({});
  const [viewMode, setViewMode] = useState("total");
  const [hapColors, setHapColors] = useState({});
  
 
  

  const [cityVisibility, setCityVisibility] = useState({});

  const [mapSettings, setMapSettings] = useState({ imgW: 465, imgH: 658.5, lonRange: [120, 122], latRange: [21.5, 25.5], });

  // =======================
  // Refs & Constants
  // =======================
  const workerRef = useRef(null);
  

  // =======================
  // 新增的 State (方案 1)
  // =======================
  const [selectedGeneTaiwanMap, setSelectedGeneTaiwanMap] = useState(null);
  const [selectedGenesTaiwanMap, setSelectedGenesTaiwanMap] = useState([]);
  const [selectedGeneGeneComponents, setSelectedGeneGeneComponents] = useState(null);
  const [selectedGenesGeneComponents, setSelectedGenesGeneComponents] = useState([]);
  
  // =======================
  // Functions
  // =======================
  const updateMapData = (updatedCities) => {
    const partialData = {};

    updatedCities.forEach((city) => {
      const cityData = {};
      genes.forEach((gene) => {
        const count = gene.counts[city] || 0;
        if (count > 0) cityData[gene.name] = count;
      });
      partialData[city] = cityData;
    });

    setCityUpdateFlags((prev) => {
      const next = { ...prev };
      updatedCities.forEach((city) => {
        next[city] = (next[city] || 0) + 1;
      });
      return next;
    });

    if (workerRef.current) {
      workerRef.current.postMessage({ type: "update", partialData });
    }
  };

  const saveGeneCountsToBackend = async (updatedGenes) => {
    try {
      await fetch("http://localhost:3000/api/sequences/saveGeneCounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genes: updatedGenes }),
      });
    } catch (err) {
      console.error("❌ Gene counts 儲存失敗:", err);
    }
  };

  const handleEditGeneCount = (geneName, location, newValue) => {
    const updatedGenes = genes.map((gene) =>
      gene.name === geneName
        ? { ...gene, counts: { ...gene.counts, [location]: newValue ? parseInt(newValue, 10) : 0 } }
        : gene
    );
    setGenes(updatedGenes);
    saveGeneCountsToBackend(updatedGenes);
  };

  const handleEditGeneCountBulk = (updatedGenes) => {
    setGenes(updatedGenes);
    saveGeneCountsToBackend(updatedGenes);

    const updatedCities = new Set();
    updatedGenes.forEach((gene) => {
      Object.keys(gene.counts).forEach((city) => updatedCities.add(city));
    });

    updateMapData(Array.from(updatedCities));
  };

  // =======================
  // Effects
  // =======================
  useEffect(() => {
    if (window.Worker) {
      const fileWorker = new Worker(new URL("./workers/fileWorker.js", import.meta.url), {
        type: "module",
      });

      workerRef.current = fileWorker;

      fileWorker.onmessage = async (event) => {
        const { sequences } = event.data;
        try {
          await fetch("http://localhost:3000/api/sequences/uploadSequences", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sequences }),
          });

          const res = await fetch("http://localhost:3000/api/sequences/Sequences");
          const data = await res.json();

          const generatedColors = generateColors(data.geneNames.length);
          const colors = {};
          data.geneNames.forEach((name, index) => {
            colors[name] = generatedColors[index % generatedColors.length];
          });

          setGeneColors(colors);
          setGenes(data.geneNames.map((n) => ({ name: n, counts: {} })));
        } catch (error) {
          console.error("❌ 上傳或讀取基因資料失敗:", error);
        }
      };
    }
  }, []);

  useEffect(() => {
    if (initialFileContent && workerRef.current) {
      workerRef.current.postMessage({
        type: "parseFile",
        fileContent: initialFileContent,
      });
    }
  }, [initialFileContent]);

useEffect(() => {
 console.log("FormattedCityGeneData:", FormattedCityGeneData); 
  }, [FormattedCityGeneData]);

  useEffect(() => {
 console.log("cityGeneData:", cityGeneData); 
  }, [cityGeneData]);

  // =======================
  // Render
  // =======================
  return (
    <div className="app-container">
      {/* ====== 上方區域：Section 切換按鈕 ====== */}
      <div className="button-group">
        <button onClick={() => { setActiveSection("locationMap"); setIsLocationMapVisible(true); }}>
          Location Map
        </button>
        <button onClick={() => setActiveSection("haplotypeNetwork")}>
          Haplotype Network
        </button>
      </div>

      {/* ====== Location Map 區域的兩個切換按鈕 ====== */}
      {(activeSection === "locationMap" || activeSection === "taiwanMap" || activeSection === "geneComponents") && (
        <div className="location-map-buttons">
          <button onClick={() => setActiveSection("taiwanMap")}>Genes Display</button>
          <button onClick={() => setActiveSection("geneComponents")}>Genes Sequences Components</button>
        </div>
      )}

      {/* ====== 區塊 1：Taiwan Map 區 ====== */}
      {activeSection === "taiwanMap" && (
        <div className="section flex-container">
          {/* --- 左邊：台灣地圖 --- */}
          <div className="map-box">
            <TaiwanMapComponent
              
              cityGeneData={cityGeneData}
              totalCityGeneData={totalCityGeneData}
              FormattedCityGeneData={FormattedCityGeneData}
              geneColors={viewMode === "total" ? hapColors : geneColors}
              selectedGenes={selectedGenesTaiwanMap}
              onSelectedGenesChange={setSelectedGenesTaiwanMap}
              cityVisibility={cityVisibility}
              onCityVisibilityChange={setCityVisibility}
              cityUpdateFlags={cityUpdateFlags}
              onMapSettingsChange={setMapSettings}
            />
          </div>

          {/* --- 右邊：GeneTable 區 --- */}
          <div className="gene-section">
            <GeneTable
              fileName={initialFileName}
              eDnaSampleContent={eDnaSampleContent}
              eDnaTagsContent={eDnaTagsContent}
              csvContent={csvContent}
              csvFileName={csvFileName}
              genes={genes}

              updateMapData={updateMapData}
              geneColors={viewMode === "total" ? hapColors : geneColors}
              setCityGeneData={setCityGeneData}
              setTotalCityGeneData={setTotalCityGeneData}
              setFormattedCityGeneData={setFormattedCityGeneData}
              onViewModeChange={setViewMode}
              onHapColorsChange={setHapColors}
              onEditGeneCount={handleEditGeneCount}
              onEditGeneCountBulk={handleEditGeneCountBulk}
              selectedGenes={selectedGenesTaiwanMap}
              onSelectedGenesChange={setSelectedGenesTaiwanMap}
              selectedLocations={cityVisibility}
              onSelectedLocationsChange={setCityVisibility}
              imgW={mapSettings.imgW}
              imgH={mapSettings.imgH}
              lonRange={mapSettings.lonRange}
              latRange={mapSettings.latRange}
              
              
              
            />
          </div>
        </div>
      )}

      {/* ====== 區塊 2：Gene Components 區 ====== */}
      {activeSection === "geneComponents" && (
        <div className="section flex-container" style={{ display: "flex", flexDirection: "column" }}>
          {/* --- 上方：Filtered Taiwan Map 和 Gene Selector --- */}
          <div className="tables-row" >
            {/* 左邊：Filtered Taiwan Map */}
            <div className="map-Filteredbox">
              <FilteredTaiwanMapComponent
                genes={genes}
                cityUpdateFlags={cityUpdateFlags}
                cityGeneData={cityGeneData}
                selectedGene={selectedGeneGeneComponents}
                activeSimilarityGroup={activeSimilarityGroup}
                onSelectedGenesChange={setSelectedGenesGeneComponents}
                totalCityGeneData={totalCityGeneData}
                geneColors={viewMode === "total" ? hapColors : geneColors}
                onMapSettingsChange={setMapSettings}
                isReduced={isReduced} 
                setIsReduced={setIsReduced}
              />
            </div>

            {/* 右邊：Gene Selector */}
            <div className="geneselector-section">
              <GeneSelector
                genes={genes}
                selectedGene={selectedGeneGeneComponents}
                setSelectedGene={setSelectedGeneGeneComponents}
                showAllGenes={() => setSelectedGeneGeneComponents(null)}
                geneColors={geneColors}
                setActiveSimilarityGroup={setActiveSimilarityGroup}
                isReduced={isReduced} 
                setIsReduced={setIsReduced}
              />
            </div>
          </div>

          {/* --- 下方：Gene Table --- */}
          <div style={{ display: "none" }}>
            <GeneTable
              fileName={initialFileName}
              eDnaSampleContent={eDnaSampleContent}
              eDnaTagsContent={eDnaTagsContent}
              csvContent={csvContent}
              csvFileName={csvFileName}
              genes={genes}

              updateMapData={updateMapData}
              geneColors={viewMode === "total" ? hapColors : geneColors}
              setCityGeneData={setCityGeneData}
              setTotalCityGeneData={setTotalCityGeneData}
              onViewModeChange={setViewMode}
              onHapColorsChange={setHapColors}
              onEditGeneCount={handleEditGeneCount}
              onEditGeneCountBulk={handleEditGeneCountBulk}
              selectedGenes={selectedGenesGeneComponents}
              onSelectedGenesChange={setSelectedGenesGeneComponents}
              selectedLocations={cityVisibility}
              onSelectedLocationsChange={setCityVisibility}
              imgW={mapSettings.imgW}
              imgH={mapSettings.imgH}
              lonRange={mapSettings.lonRange}
              latRange={mapSettings.latRange}
              
             
              
            />
          </div>
        </div>
      )}

      {/* ====== 區塊 3：Haplotype Network 區 ====== */}
      {activeSection === "haplotypeNetwork" && (
        <div className="section">
          <HaplotypeReducer />
          <HaplotypeNetwork />
          {/* --- 隱藏用 GeneTable (僅執行資料處理，不顯示 UI) --- */}
          <div style={{ display: "none" }}>
            <GeneTable
              fileName={initialFileName}
              eDnaSampleContent={eDnaSampleContent}
              eDnaTagsContent={eDnaTagsContent}
              csvContent={csvContent}
              csvFileName={csvFileName}
              genes={genes}

              updateMapData={updateMapData}
              geneColors={viewMode === "total" ? hapColors : geneColors}
              setCityGeneData={setCityGeneData}
              setTotalCityGeneData={setTotalCityGeneData}
              onViewModeChange={setViewMode}
              onHapColorsChange={setHapColors}
              onEditGeneCount={handleEditGeneCount}
              onEditGeneCountBulk={handleEditGeneCountBulk}
              
              selectedLocations={cityVisibility}
              onSelectedLocationsChange={setCityVisibility}
              imgW={mapSettings.imgW}
              imgH={mapSettings.imgH}
              lonRange={mapSettings.lonRange}
              latRange={mapSettings.latRange}
              
              
              
            />
          </div>
        </div>
      )}

      </div>
  );
};

export default HaplotypeNetworkApp;
