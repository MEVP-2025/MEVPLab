import { useEffect, useMemo, useState } from "react";
import { generateCityCoordinates } from "../../../data/cityCoordinates3.js";

export default function useCityGeneData({
  cityGeneData,
  totalCityGeneData,
  selectedGenes,
  mapPage,
  safeImgW,
  safeImgH,
  conW,
  conH,
}) {
  const [cityCoordinates3, setCityCoordinates3] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);

  const activeCityGeneData = mapPage === 1 ? totalCityGeneData : cityGeneData;

  useEffect(() => {
    setCityCoordinates3(generateCityCoordinates(safeImgW, safeImgH, 200, 75));
  }, [safeImgW, safeImgH]);

  const RED_LEFT = (safeImgW - 465) / 2;
  const RED_RIGHT = RED_LEFT + 465;
  const RED_TOP = (safeImgH - 658.5) / 2;
  const RED_BOTTOM = RED_TOP + 658.5;

  const getNewCoordinates = (originalCoordinates, usedCoordinates) => {
    // safety: if no pool or missing img dims, just return original
    if (
      !cityCoordinates3 ||
      cityCoordinates3.length === 0 ||
      !safeImgW ||
      !safeImgH
    ) {
      return originalCoordinates;
    }
    const { cx, cy } = originalCoordinates;
    let availableCoordinates = [];

    // decide candidate pool based on where city sits
    if (cy < safeImgH / 3) {
      availableCoordinates = cityCoordinates3.filter(
        (coord) => coord.cy <= safeImgH / 3
      );
    } else if (cy > (safeImgH / 3) * 2) {
      availableCoordinates = cityCoordinates3.filter(
        (coord) => coord.cy >= (safeImgH / 3) * 2
      );
    } else if (cx < safeImgW / 2) {
      availableCoordinates = cityCoordinates3.filter((coord) => coord.cx <= 0);
    } else if (cx > safeImgW / 2) {
      availableCoordinates = cityCoordinates3.filter(
        (coord) => coord.cx >= safeImgW
      );
    } else {
      const distTop = cy - RED_TOP;
      const distBottom = RED_BOTTOM - cy;
      const distLeft = cx - RED_LEFT;
      const distRight = RED_RIGHT - cx;
      const minDist = Math.min(distTop, distBottom, distLeft, distRight);

      if (minDist === distLeft) {
        availableCoordinates = cityCoordinates3.filter(
          (coord) => coord.cx <= 0 || coord.cy <= 0 || coord.cy >= safeImgH
        );
      } else if (minDist === distRight) {
        availableCoordinates = cityCoordinates3.filter(
          (coord) =>
            coord.cx >= safeImgW || coord.cy <= 0 || coord.cy >= safeImgH
        );
      } else if (minDist === distTop) {
        availableCoordinates = cityCoordinates3.filter(
          (coord) => coord.cy <= 0 || coord.cx <= 0 || coord.cx >= safeImgW
        );
      } else {
        availableCoordinates = cityCoordinates3.filter(
          (coord) =>
            coord.cy >= safeImgH || coord.cx <= 0 || coord.cx >= safeImgW
        );
      }
    }

    // sort by distance to original point and pick the first unused
    const sortedAvailableCoordinates = availableCoordinates
      .map((coord) => ({
        coord,
        distance: Math.hypot(cx - coord.cx, cy - coord.cy),
      }))
      .sort((a, b) => a.distance - b.distance);

    for (const { coord } of sortedAvailableCoordinates) {
      if (
        !usedCoordinates.some((u) => u.cx === coord.cx && u.cy === coord.cy)
      ) {
        return coord;
      }
    }

    // if none available, return original
    return originalCoordinates;
  };

  const filteredCityGeneData = useMemo(() => {
    if (!activeCityGeneData) return {};
    const usedCoordinates = [];
    const originalCoordinatesList = Object.entries(activeCityGeneData).map(
      ([city, content]) => ({
        city,
        coords: { cx: content.coordinates.cx, cy: content.coordinates.cy },
      })
    );
    const offsetX_local = (conW - safeImgW) / 2;
    const offsetY_local = (conH - safeImgH) / 2;
    const adjustLocal = (c) => ({
      cx: c.cx + offsetX_local,
      cy: c.cy + offsetY_local,
    });

    return Object.entries(activeCityGeneData).reduce((acc, [city, content]) => {
      const genesList =
        mapPage === 1
          ? content.genes
          : (content.genes || []).filter((g) => selectedGenes.includes(g.name));
      if (!genesList || genesList.length === 0) return acc;

      const totalCount = genesList.reduce((sum, g) => sum + (g.value || 0), 0);
      const originalImgCoords = {
        cx: content.coordinates.cx,
        cy: content.coordinates.cy,
      };
      const originalContainerCoords = adjustLocal(originalImgCoords);

      let finalImgCoords = originalImgCoords;

      // 擠位邏輯
      if (totalCount < 25) {
        const hasNearby = originalCoordinatesList.some((item) => {
          if (item.city === city) return false;
          const dist = Math.hypot(
            originalImgCoords.cx - item.coords.cx,
            originalImgCoords.cy - item.coords.cy
          );
          return dist <= 50;
        });
        if (hasNearby)
          finalImgCoords = getNewCoordinates(
            originalImgCoords,
            usedCoordinates
          );
      } else if (totalCount > 25) {
        finalImgCoords = getNewCoordinates(originalImgCoords, usedCoordinates);
      }

      const finalContainerCoords = adjustLocal(finalImgCoords);
      const line =
        finalImgCoords.cx !== originalImgCoords.cx ||
        finalImgCoords.cy !== originalImgCoords.cy
          ? { from: originalContainerCoords, to: finalContainerCoords }
          : null;

      usedCoordinates.push({ cx: finalImgCoords.cx, cy: finalImgCoords.cy });

      acc[city] = {
        data: genesList,
        totalCount,
        imgCoordinates: finalImgCoords,
        containerCoordinates: finalContainerCoords,
        originalContainerCoordinates: originalContainerCoords,
        line,
      };

      return acc;
    }, {});
  }, [
    activeCityGeneData,
    selectedGenes,
    mapPage,
    safeImgW,
    safeImgH,
    conW,
    conH,
    cityCoordinates3,
  ]);

  return { filteredCityGeneData, selectedCity, setSelectedCity };
}
