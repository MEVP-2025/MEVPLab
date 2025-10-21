import React, { useState, useEffect, useRef } from "react";
import TaiwanMapComponent from "./components/TaiwanMap/TaiwanMapComponent";
import FilteredTaiwanMapComponent from "./components/FilteredTaiwanMap/FilteredTaiwanMapComponent";
import HaplotypeList from "./components/HaplotypeList";
import GeneTable from "./components/GeneTable/GeneTable";
import GeneSelector from "./components/GeneSelector";
import HaplotypeNetwork from "./components/HaplotypeNetwork";
import HaplotypeReducer from "./components/HaplotypeReducer";
import './HaplotypeNetworkApp.css';

const generateColors = (num) =>
  Array.from({ length: num }, (_, i) => `hsl(${(i * 137) % 360}, 100%, 50%)`);

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
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedGene, setSelectedGene] = useState(null);
  const [activeSimilarityGroup, setActiveSimilarityGroup] = useState([]);
  const [cityUpdateFlags, setCityUpdateFlags] = useState({});
  const [cityGeneData, setCityGeneData] = useState({});
  const [totalCityGeneData, setTotalCityGeneData] = useState({});
  const [viewMode, setViewMode] = useState("total");
  const [hapColors, setHapColors] = useState({});
  const [hapHeaders, setHapHeaders] = useState([]);   // ✅ 新增
  const [hapPage, setHapPage] = useState(1);          // ✅ 新增
  const hapsPerPage = 15;                             // ✅ 固定每頁數

  // ✅ 提升到父層
  const [selectedGenes, setSelectedGenes] = useState([]);
  const [cityVisibility, setCityVisibility] = useState({});

  const [mapSettings, setMapSettings] = useState({
    imgW: 465,
    imgH: 658.5,
    lonRange: [120, 122],
    latRange: [21.5, 25.5],
  });


  // =======================
  // Refs & Constants
  // =======================
  const workerRef = useRef(null);
  const genesPerPage = 10;

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
      await fetch("/api/saveGeneCounts", {
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
          await fetch("/api/uploadSequences", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sequences }),
          });

          const res = await fetch("/api/sequences");
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
          <button onClick={() => setActiveSection("taiwanMap")}>All Sequences</button>
          <button onClick={() => setActiveSection("geneComponents")}>Sequences Components</button>
        </div>
      )}
    

    {/* ====== 區塊 1：Taiwan Map 區 ====== */}
    {activeSection === "taiwanMap" && (
      <div className="section flex-container">
        {/* --- 左邊：台灣地圖 --- */}
        <div className="map-box">
          <TaiwanMapComponent
            genes={genes}
            cityGeneData={cityGeneData}
            totalCityGeneData={totalCityGeneData}
            geneColors={viewMode === "total" ? hapColors : geneColors}
            selectedGenes={selectedGenes}
            onSelectedGenesChange={setSelectedGenes}
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
            currentPage={currentPage}
            itemsPerPage={genesPerPage}
            setCurrentPage={setCurrentPage}
            updateMapData={updateMapData}
            geneColors={viewMode === "total" ? hapColors : geneColors}
            setCityGeneData={setCityGeneData}
            setTotalCityGeneData={setTotalCityGeneData}
            onViewModeChange={setViewMode}
            onHapColorsChange={setHapColors}
            onEditGeneCount={handleEditGeneCount}
            onEditGeneCountBulk={handleEditGeneCountBulk}
            selectedGenes={selectedGenes}
            onSelectedGenesChange={setSelectedGenes}
            selectedLocations={cityVisibility}
            onSelectedLocationsChange={setCityVisibility}
            imgW={mapSettings.imgW}
            imgH={mapSettings.imgH}
            lonRange={mapSettings.lonRange}
            latRange={mapSettings.latRange}
            onHapHeadersChange={setHapHeaders}
            hapPage={hapPage}
            onHapPageChange={setHapPage}
            hapsPerPage={hapsPerPage}
          />
        </div>
      </div>
    )}

    {/* ====== 區塊 2：Gene Components 區 ====== */}
    {activeSection === "geneComponents" && (
      <div className="section flex-container">
        <div className="tables-row">
          {/* --- 左邊：Filtered Taiwan Map --- */}
          <div className="map-box">
            <FilteredTaiwanMapComponent
              genes={genes}
              cityUpdateFlags={cityUpdateFlags}
              cityGeneData={cityGeneData}
              selectedGene={selectedGene}
              activeSimilarityGroup={activeSimilarityGroup}
              onSelectedGenesChange={setSelectedGenes}
              totalCityGeneData={totalCityGeneData}
              geneColors={viewMode === "total" ? hapColors : geneColors}
              onMapSettingsChange={setMapSettings}
            />
          </div>

          {/* --- 右邊：Gene Selector --- */}
          <div className="geneselector-section">
            <GeneSelector
              genes={genes}
              selectedGene={selectedGene}
              setSelectedGene={setSelectedGene}
              showAllGenes={() => setSelectedGene(null)}
              geneColors={geneColors}
              setActiveSimilarityGroup={setActiveSimilarityGroup}
            />
          </div>

          {/* --- 隱藏用 GeneTable (僅執行資料處理，不顯示 UI) --- */}
          <div style={{ display: "none" }}>
            <GeneTable
              fileName={initialFileName}
              eDnaSampleContent={eDnaSampleContent}
              eDnaTagsContent={eDnaTagsContent}
              csvContent={csvContent}
              csvFileName={csvFileName}
              genes={genes}
              currentPage={currentPage}
              itemsPerPage={genesPerPage}
              setCurrentPage={setCurrentPage}
              updateMapData={updateMapData}
              geneColors={viewMode === "total" ? hapColors : geneColors}
              setCityGeneData={setCityGeneData}
              setTotalCityGeneData={setTotalCityGeneData}
              onViewModeChange={setViewMode}
              onHapColorsChange={setHapColors}
              onEditGeneCount={handleEditGeneCount}
              onEditGeneCountBulk={handleEditGeneCountBulk}
              selectedGenes={selectedGenes}
              onSelectedGenesChange={setSelectedGenes}
              selectedLocations={cityVisibility}
              onSelectedLocationsChange={setCityVisibility}
              imgW={mapSettings.imgW}
              imgH={mapSettings.imgH}
              lonRange={mapSettings.lonRange}
              latRange={mapSettings.latRange}
              onHapHeadersChange={setHapHeaders}
              hapPage={hapPage}
              onHapPageChange={setHapPage}
              hapsPerPage={hapsPerPage}
            />
          </div>

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
            currentPage={currentPage}
            itemsPerPage={genesPerPage}
            setCurrentPage={setCurrentPage}
            updateMapData={updateMapData}
            geneColors={viewMode === "total" ? hapColors : geneColors}
            setCityGeneData={setCityGeneData}
            setTotalCityGeneData={setTotalCityGeneData}
            onViewModeChange={setViewMode}
            onHapColorsChange={setHapColors}
            onEditGeneCount={handleEditGeneCount}
            onEditGeneCountBulk={handleEditGeneCountBulk}
            selectedGenes={selectedGenes}
            onSelectedGenesChange={setSelectedGenes}
            selectedLocations={cityVisibility}
            onSelectedLocationsChange={setCityVisibility}
            imgW={mapSettings.imgW}
            imgH={mapSettings.imgH}
            lonRange={mapSettings.lonRange}
            latRange={mapSettings.latRange}
            onHapHeadersChange={setHapHeaders}
            hapPage={hapPage}
            onHapPageChange={setHapPage}
            hapsPerPage={hapsPerPage}
          />
          </div>
      </div>
    )}
  </div>
);



};

export default HaplotypeNetworkApp;
