import { useEffect ,useState } from "react";

import MapControls from "./MapControls";
import MapMainView from "./MapMainView";

import useMapSettings from "./hooks/useMapSettings";
import useMouseLatLon from "./hooks/useMouseLatLon";
import useCityGeneData from "./hooks/useCityGeneData";
import useExportMap from "./hooks/useExportMap";

import "../styles/TaiwanMapComponent.css"; 

const TaiwanMapComponent = ({
  genes,
  cityGeneData,
  totalCityGeneData,
  FormattedCityGeneData,
  geneColors,
  selectedGenes = [],
  onSelectedGenesChange,
  cityVisibility = {},
  onCityVisibilityChange,
  onMapSettingsChange
}) => {

   const [fileName, setFileName] = useState("Map"); // 管理檔名狀態
   

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

  useEffect(() => {
    if (FormattedCityGeneData && Object.keys(FormattedCityGeneData).length > 0) setMapPage(2);
  }, [FormattedCityGeneData]);



  const { filteredCityGeneData, selectedCity, setSelectedCity } = useCityGeneData({
    cityGeneData,
    totalCityGeneData,
    FormattedCityGeneData,
    selectedGenes,
    mapPage,
    safeImgW,
    safeImgH,
    conW,
    conH
  });

  // ===== Export Map =====
  const handleExportPNG = useExportMap(filteredCityGeneData, geneColors, selectedGenes, fileName);

  // ===== Render =====
  return (
  <div className="map-container">
    {/* MapControls - The controls component on top */}
    <div className="map-controls">
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
    <div className="map-main-view">
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
        setFileName={setFileName}
      />
    </div>
  </div>
);

};

export default TaiwanMapComponent;
