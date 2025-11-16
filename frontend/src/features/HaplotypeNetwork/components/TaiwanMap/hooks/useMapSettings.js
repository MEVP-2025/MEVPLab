import { useState, useEffect } from "react";

export default function useMapSettings(onMapSettingsChange) {
  const [activeMapId, setActiveMapId] = useState("");
  const [mapImage, setMapImage] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const [imgW, setImgW] = useState(null);
  const [imgH, setImgH] = useState(null);

  const [lonRange, setLonRange] = useState([0, 0]);
  const [latRange, setLatRange] = useState([0, 0]);
  const [lonDirMin, setLonDirMin] = useState("E");
  const [lonDirMax, setLonDirMax] = useState("E");
  const [latDirMin, setLatDirMin] = useState("N");
  const [latDirMax, setLatDirMax] = useState("N");

  const safeImgW = Number(imgW || 0);
  const safeImgH = Number(imgH || 0);

  const conW = safeImgW + 350;
  const conH = safeImgH + 350;

  // notify parent
  useEffect(() => {
    onMapSettingsChange?.({ imgW: safeImgW, imgH: safeImgH, lonRange, latRange });
  }, [safeImgW, safeImgH, lonRange, latRange, onMapSettingsChange]);

  const handleSwitchMap = (map) => {
    if (!map) return;
    if (map.id === "Customize") {
      setActiveMapId("Customize");
      setMapImage(null);
      setMapLoaded(false);
      return;
    }

    const img = new Image();
    img.src = map.src;
    img.onload = () => {
      let newWidth = img.naturalWidth;
      let newHeight = img.naturalHeight;
      const maxSize = 500;
      if (Math.max(newWidth, newHeight) > maxSize) {
        const scale = maxSize / Math.max(newWidth, newHeight);
        newWidth = Math.round(newWidth * scale);
        newHeight = Math.round(newHeight * scale);
      }

      setActiveMapId(map.id);
      setMapImage(map.src);
      setImgW(newWidth);
      setImgH(newHeight);

      if (map.defaultLonRange) {
        setLonRange([
          Math.abs(map.defaultLonRange[0]) * (map.lonDirMin === "W" ? -1 : 1),
          Math.abs(map.defaultLonRange[1]) * (map.lonDirMax === "W" ? -1 : 1),
        ]);
      }
      if (map.defaultLatRange) {
        setLatRange([
          Math.abs(map.defaultLatRange[0]) * (map.latDirMin === "S" ? -1 : 1),
          Math.abs(map.defaultLatRange[1]) * (map.latDirMax === "S" ? -1 : 1),
        ]);
      }
      setLonDirMin(map.lonDirMin || "E");
      setLonDirMax(map.lonDirMax || "E");
      setLatDirMin(map.latDirMin || "N");
      setLatDirMax(map.latDirMax || "N");

      setMapLoaded(true);
    };
    img.onerror = () => setMapLoaded(false);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      let newWidth = img.naturalWidth;
      let newHeight = img.naturalHeight;
      const maxSize = 500;
      if (Math.max(newWidth, newHeight) > maxSize) {
        const scale = maxSize / Math.max(newWidth, newHeight);
        newWidth = Math.round(newWidth * scale);
        newHeight = Math.round(newHeight * scale);
      }
      setActiveMapId("Customize");
      setMapImage(url);
      setImgW(newWidth);
      setImgH(newHeight);
      setMapLoaded(true);
    };
    img.onerror = () => setMapLoaded(false);
    img.src = url;
  };

  return {
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
  };
}
