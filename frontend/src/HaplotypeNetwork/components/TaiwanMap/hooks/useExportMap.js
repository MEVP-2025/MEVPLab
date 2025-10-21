import { saveAs } from "file-saver";

export default function useExportMap(filteredCityGeneData, geneColors, selectedGenes, fileName) {
  return async function handleExportPNG() {
    const mapContainer = document.getElementById("map-container");
    if (!mapContainer) return;

    const html2canvas = (await import("html2canvas")).default;
    const mapCanvas = await html2canvas(mapContainer);
    const padding = 10;
    const fontSize = 16;
    const boxSize = 14;
    const spacing = 6;
    const font = `${fontSize}px sans-serif`;
    const itemsPerColumn = 30;

    const legendItems = (selectedGenes || []).map((name) => ({ name, color: geneColors[name] || "#000000" }));
    const numCols = Math.ceil(legendItems.length / itemsPerColumn);
    const numRows = Math.min(legendItems.length, itemsPerColumn);
    const legendWidth = 180 * numCols;
    const legendHeight = padding * 2 + numRows * (fontSize + spacing);

    const canvas = document.createElement("canvas");
    canvas.width = mapCanvas.width + legendWidth;
    canvas.height = Math.max(mapCanvas.height, legendHeight);

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#f8f8f8ff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(mapCanvas, 0, 0);
    ctx.font = font;
    ctx.textBaseline = "middle";

    legendItems.forEach((item, i) => {
      const col = Math.floor(i / itemsPerColumn);
      const row = i % itemsPerColumn;
      const x = mapCanvas.width + col * 180 + padding;
      const y = padding + row * (fontSize + spacing) + fontSize / 2;

      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.arc(x + boxSize / 2, y, boxSize / 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#000";
      ctx.fillText(item.name, x + boxSize + 8, y);
    });

     canvas.toBlob((blob) => {
      if (blob) saveAs(blob, `${fileName}.png`); // 使用傳入的檔名
    });
  };
}
