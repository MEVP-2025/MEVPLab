import { useEffect, useMemo, useState } from "react";
import { generateCityCoordinates } from "../../../data/cityCoordinates3";

export const useTaiwanMapState = ({
  genes,
  cityGeneData,
  totalCityGeneData,
  selectedGenes,
  onSelectedGenesChange,
  cityVisibility,
  onCityVisibilityChange,
  coordinateOverrides = {},
  onMapSettingsChange,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const [latLon, setLatLon] = useState({ lat: 0, lon: 0 });
  const [mapPage, setMapPage] = useState(0);
  const [citySearchTerm, setCitySearchTerm] = useState("");
  const [selectedChart, setSelectedChart] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);

  // 地圖設定
  const [activeMapId, setActiveMapId] = useState(null);
  const [mapImage, setMapImage] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [imgW, setImgW] = useState(null);
  const [imgH, setImgH] = useState(null);
  const [lonRange, setLonRange] = useState([null, null]);
  const [latRange, setLatRange] = useState([null, null]);
  const [lonDirMin, setLonDirMin] = useState("E");
  const [lonDirMax, setLonDirMax] = useState("E");
  const [latDirMin, setLatDirMin] = useState("N");
  const [latDirMax, setLatDirMax] = useState("N");

  // container 大小
  const conW = imgW + 350;
  const conH = imgH + 350;

  // 回傳父層地圖設定
  useEffect(() => {
    onMapSettingsChange?.({ imgW, imgH, lonRange, latRange });
  }, [imgW, imgH, lonRange, latRange]);

  // gene list
  const allGenes = useMemo(() => (genes || []).map((g) => g.name), [genes]);

  useEffect(() => {
    if (!initialized && allGenes.length > 0) {
      onSelectedGenesChange?.(allGenes);
      setInitialized(true);
    }
  }, [allGenes, initialized, onSelectedGenesChange]);

  // 初始化城市顯示
  const activeCityGeneData = mapPage === 0 ? cityGeneData : totalCityGeneData;
  useEffect(() => {
    if (!activeCityGeneData) return;
    const initialVisibility = Object.keys(activeCityGeneData).reduce(
      (acc, city) => {
        acc[city] = true;
        return acc;
      },
      {}
    );
    onCityVisibilityChange?.(initialVisibility);
  }, [activeCityGeneData, onCityVisibilityChange]);

  // 過濾 gene
  const filteredGeneList = useMemo(
    () =>
      allGenes.filter((name) =>
        name.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [allGenes, searchTerm]
  );

  const currentGenes = filteredGeneList.slice(
    currentPage * 10,
    (currentPage + 1) * 10
  );
  const totalPages = Math.max(1, Math.ceil(filteredGeneList.length / 10));

  const toggleGene = (name) => {
    const updated = selectedGenes.includes(name)
      ? selectedGenes.filter((g) => g !== name)
      : [...selectedGenes, name];
    onSelectedGenesChange?.(updated);
  };
  const handleSelectAll = () => onSelectedGenesChange?.(filteredGeneList);
  const handleClearAll = () => onSelectedGenesChange?.([]);

  // 城市座標
  const [cityCoordinates3, setCityCoordinates3] = useState([]);
  useEffect(() => {
    setCityCoordinates3(generateCityCoordinates(imgW, imgH, 200, 75));
  }, [imgW, imgH]);

  const offsetX = (conW - imgW) / 2;
  const offsetY = (conH - imgH) / 2;
  const adjustCoordinatesToContainer = (cx, cy) => ({
    cx: cx + offsetX,
    cy: cy + offsetY,
  });

  return {
    searchTerm,
    setSearchTerm,
    currentPage,
    setCurrentPage,
    latLon,
    setLatLon,
    mapPage,
    setMapPage,
    citySearchTerm,
    setCitySearchTerm,
    selectedChart,
    setSelectedChart,
    selectedCity,
    setSelectedCity,
    activeMapId,
    setActiveMapId,
    mapImage,
    setMapImage,
    mapLoaded,
    setMapLoaded,
    imgW,
    setImgW,
    imgH,
    setImgH,
    lonRange,
    setLonRange,
    latRange,
    setLatRange,
    lonDirMin,
    setLonDirMin,
    lonDirMax,
    setLonDirMax,
    latDirMin,
    setLatDirMin,
    latDirMax,
    setLatDirMax,
    conW,
    conH,
    filteredGeneList,
    currentGenes,
    totalPages,
    toggleGene,
    handleSelectAll,
    handleClearAll,
    cityCoordinates3,
    adjustCoordinatesToContainer,
    activeCityGeneData,
    allGenes,
  };
};
