import { useState } from "react";

export default function useMouseLatLon(safeImgW, safeImgH, conW, conH, lonRange, latRange) {
  const [latLon, setLatLon] = useState({ lat: 0, lon: 0 });
  const offsetX = (conW - safeImgW) / 2;
  const offsetY = (conH - safeImgH) / 2;

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - offsetX;
    const y = e.clientY - rect.top - offsetY;

    if (
      x >= 0 &&
      x <= safeImgW &&
      y >= 0 &&
      y <= safeImgH &&
      Number.isFinite(lonRange[0]) &&
      Number.isFinite(lonRange[1]) &&
      Number.isFinite(latRange[0]) &&
      Number.isFinite(latRange[1])
    ) {
      const lon = lonRange[0] + (x / safeImgW) * (lonRange[1] - lonRange[0]);
      const lat = latRange[1] - (y / safeImgH) * (latRange[1] - latRange[0]);
      setLatLon({ lat: lat.toFixed(4), lon: lon.toFixed(4) });
    }
  };

  const decimalToDegreeMinuteWithDir = (decimal, type) => {
    if (!Number.isFinite(Number(decimal))) return "-";
    const absVal = Math.abs(Number(decimal));
    const deg = Math.floor(absVal);
    const min = ((absVal - deg) * 60).toFixed(1);
    return `${deg}°${min}′ ${decimal >= 0 ? (type === "lon" ? "E" : "N") : (type === "lon" ? "W" : "S")}`;
  };

  return { latLon, handleMouseMove, decimalToDegreeMinuteWithDir };
}
