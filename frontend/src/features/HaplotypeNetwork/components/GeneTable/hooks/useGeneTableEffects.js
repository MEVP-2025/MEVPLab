import { useEffect, useRef } from "react";

// 用於將字符串哈希化為數字，生成穩定的色相
const hashStringToNumber = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash = hash & hash; // 強制轉為 32 位整數
  }
  return Math.abs(hash); // 返回正數
};

export const useGeneTableEffects = ({
  viewMode,
  onViewModeChange,
  csvContent,
  setTotalTableData,
  hapHeaders,
  onHapHeadersChange,
  hapColors,
  setHapColors,
  onHapColorsChange,

  onFormattedGenesChange,
  setFormattedCityGeneData, // 用來設置格式化基因數據的函式
  locations,
  genes,
  onEditGeneCountBulk,
  totalTableData,
  filterMode,
  minPercentage,
  maxPercentage,
  imgW,
  imgH,
  lonRange,
  latRange,
  geneColors,
  setCityGeneData,
  setTotalCityGeneData,
  ednaMapping,
  eDnaSampleContent,
  setEdnaMapping,
  setLocations,
  eDnaTagsContent,
  setTagMapping,
  setSpeciesOptions,
  fileName,
  speciesOptions,
  setCurrentSpecies,
}) => {
  // 1️⃣ viewMode 改變
  useEffect(() => {
    onViewModeChange?.(viewMode);
  }, [viewMode, onViewModeChange]);

  // 2️⃣ CSV 內容更新
  useEffect(() => {
    if (!csvContent) return;

    const rawText = csvContent.trim();
    const lines = rawText.split("\n");
    const originalHeaders = lines[0].split(",").map((h) => h.trim());
    const headers = ["locations", ...originalHeaders.slice(1).map((h) => `hap_${h}`)];
    const rows = lines.slice(1).map((line) => {
      const cells = line.split(",");
      return headers.map((_, idx) => cells[idx] || "");
    });

    setTotalTableData([headers, ...rows]);
  }, [csvContent, setTotalTableData]);

  // 3️⃣ Hap headers 改變
  const prevHapHeadersRef = useRef();
  useEffect(() => {
    if (JSON.stringify(prevHapHeadersRef.current) !== JSON.stringify(hapHeaders)) {
      onHapHeadersChange?.(hapHeaders);
      prevHapHeadersRef.current = hapHeaders;
    }
  }, [hapHeaders, onHapHeadersChange]);

  // 4️⃣ Hap 顏色設定
  useEffect(() => {
    if (viewMode !== "total" || hapHeaders.length === 0) return;

    // 使用 hap 的名稱生成穩定的顏色
    const colors = Array.from({ length: hapHeaders.length }, (_, i) => {
      const seed = hapHeaders[i];  // 根據 hap 名稱生成穩定的色相
      const hue = (hashStringToNumber(seed) * 137) % 360;  // 哈希值轉為色相
      const saturation = Math.floor(Math.random() * 51) + 25;  // 隨機飽和度（25%-75%）
      const lightness = Math.floor(Math.random() * 51) + 25;  // 隨機亮度（25%-75%）
      return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    });

    const mapping = {};
    hapHeaders.forEach((hap, idx) => (mapping[hap] = colors[idx]));

    // 檢查顏色是否需要更新
    const isSame =
      Object.keys(mapping).length === Object.keys(hapColors).length &&
      Object.keys(mapping).every((key) => mapping[key] === hapColors[key]);

    // 只在顏色有變化時才更新狀態，避免觸發無限渲染
    if (!isSame) {
      setHapColors(mapping); // 只在顏色更新時觸發 setState
      onHapColorsChange?.(mapping);
    }
  }, [hapHeaders, viewMode, setHapColors, onHapColorsChange]);  // 刪除了 hapColors，不讓其觸發更新


  // 5️⃣ 更新 genes counts
  useEffect(() => {
    if (locations.length === 0) return;

    const updatedGenes = genes.map((gene) => {
      const newCounts = { ...gene.counts };
      let modified = false;
      locations.forEach((loc) => {
        if (gene.name.includes(loc) && !newCounts[loc]) {
          newCounts[loc] = 1;
          modified = true;
        }
      });
      return modified ? { ...gene, counts: newCounts } : gene;
    });

    const hasChanges = updatedGenes.some((gene, idx) => gene !== genes[idx]);
    if (hasChanges) onEditGeneCountBulk(updatedGenes);
  }, [genes, locations, onEditGeneCountBulk]);

  // 6️⃣ Map 座標計算 & 基因資料
  // 更新 Map 座標計算 & 基因資料

   useEffect(() => {

    if (!locations || locations.length === 0) return;

    const cityMap = {};
    locations.forEach((loc) => {
      const edna = ednaMapping[loc] || {};
      let cx = null,
        cy = null;

      if (!isNaN(parseFloat(edna.Celong1Value)) && !isNaN(parseFloat(edna.Celat2Value))) {
        cx = ((edna.Celong1Value - lonRange[0]) / (lonRange[1] - lonRange[0])) * imgW;
        cy = ((latRange[1] - edna.Celat2Value) / (latRange[1] - latRange[0])) * imgH;
      }

      cityMap[loc] = { coordinates: { cx, cy }, genes: [] };
    });

    if (viewMode === "formatted") {
    const formattedCityMap = {}; // 用來儲存格式化後的基因數據

    onFormattedGenesChange.genes.forEach((gene) => {
     

      locations.forEach((loc) => {
        const count = gene.cities[loc] || 0; // 從 gene.cities 中獲取對應城市的計數
       

        if (count > 0) {
          if (!formattedCityMap[loc]) {
            // 在這裡加入坐標資料
            formattedCityMap[loc] = {
              coordinates: cityMap[loc].coordinates, // 使用之前已設置的城市坐標
              genes: [],
            };
          }
          formattedCityMap[loc]?.genes.push({
            name: gene.id,
            color: onFormattedGenesChange.colors[gene.id] || "#000", // 使用顏色映射
            value: count,
          });
        }
      });
    });

    console.log("Formatted City Map:", formattedCityMap);  // 查看填充後的 cityMap
    setFormattedCityGeneData?.(formattedCityMap); // 傳遞格式化的 cityMap
  }
    else if (viewMode === "total" && totalTableData.length > 1) {
      // 當 viewMode 是 "total" 時，處理原始的基因數據
      const headers = totalTableData[0];
      const rows = totalTableData.slice(1);
      const hapHeaders = headers.slice(2);

      rows.forEach((row) => {
        const loc = row[0];
        const total = parseInt(row[1]) || 0;
        hapHeaders.forEach((hap, idx) => {
          const value = parseInt(row[idx + 2]) || 0;
          const percent = total > 0 ? (value / total) * 100 : 0;

          // 根據 filterMode 進行過濾
          const shouldInclude =
            filterMode === "all" ? value > 0 :
            filterMode === "range" ? percent >= minPercentage && percent <= maxPercentage :
            value > 0 && percent >= 1;

          if (shouldInclude) {
            cityMap[loc]?.genes.push({
              name: hap,
              color: hapColors[hap] || "#000",
              value,
            });
          }
        });
      });

      setTotalCityGeneData?.(cityMap); // 傳遞過濾後的 cityMap
    } else {
      // 如果不是 "formatted" 或 "total"，使用原始的 genes 和 locations 更新 cityMap
      genes.forEach((gene) => {
        locations.forEach((loc) => {
          const count = gene.counts?.[loc] || 0;
          if (count > 0) {
            cityMap[loc]?.genes.push({
              name: gene.name,
              color: geneColors[gene.name] || "#000",
              value: count,
            });
          }
        });
      });

      setCityGeneData?.(cityMap); // 傳遞未過濾的 cityMap
    }

   
  }, [
    viewMode,
    totalTableData,
    hapColors,
    genes,
    geneColors,
    locations,
    ednaMapping,
    filterMode,
    minPercentage,
    maxPercentage,
    imgW,
    imgH,
    lonRange,
    latRange,
    setCityGeneData,
    setTotalCityGeneData,
    setFormattedCityGeneData, // 監聽 setFormattedCityGeneData
    onFormattedGenesChange, // 監聽 onFormattedGenesChange
  ]);




  useEffect(() => {
  
  // 如果需要，也可以在這裡加入其他過濾邏輯
}, [filterMode]);  // 這會在 filterMode 改變時觸發





  // 7️⃣ eDNA Mapping
  useEffect(() => {
    if (!eDnaSampleContent || eDnaSampleContent.length === 0) return;

    const mapping = {};
    const ids = new Set();

    eDnaSampleContent.forEach((row) => {
      const id = String(row["eDNA_ID"]).trim();
      if (!id) return;
      ids.add(id);

      const parsedLon = parseFloat(row["Celong1"]) || null;
      const parsedLat = parseFloat(row["Celat2"]) || null;

      mapping[id] = {
        river: row["river"] || "No information",
        site: row["sample area"] || "No information",
        Celong1Value: parsedLon,
        Celat2Value: parsedLat,
        Celong1: parsedLon !== null ? `${Math.abs(parsedLon)}${parsedLon >= 0 ? "E" : "W"}` : "No information",
        Celat2: parsedLat !== null ? `${Math.abs(parsedLat)}${parsedLat >= 0 ? "N" : "S"}` : "No information",
      };
    });

    setEdnaMapping(mapping);
    setLocations(Array.from(ids));
  }, [eDnaSampleContent, setEdnaMapping, setLocations]);

  // 8️⃣ Tag Mapping
 useEffect(() => {
  if (!eDnaTagsContent || eDnaTagsContent.length === 0) return;

  console.log("eDnaTagsContent:", eDnaTagsContent);
  console.log("eDnaTagsContent type:", typeof eDnaTagsContent); // 顯示類型
  console.log("Is it an array?", Array.isArray(eDnaTagsContent)); // 確認是否為陣列

  const speciesSet = new Set();
  const mapping = {};

  // 先檢查是否為陣列
  if (Array.isArray(eDnaTagsContent)) {
    // 判斷資料是否有標題行，假設如果有標題行則是 .xlsx 資料
    const firstRow = eDnaTagsContent[0];

    // 檢查首行是否包含已知標題欄位
    if (firstRow.hasOwnProperty("sample_ID") && firstRow.hasOwnProperty("barcode-F(5'-3')")) {
      console.log("进入处理 .xlsx 数据的分支");
      eDnaTagsContent.forEach((row) => {
        const id = String(row["sample_ID"]).trim();
        const prefix = id.split("_")[0];
        if (prefix && prefix.toLowerCase() !== "sample") speciesSet.add(prefix);

        mapping[id] = {
          sampleId: row["sample_ID"] || "No information",
          barcodeF: row["barcode-F(5'-3')"] || "No information",
          primerF: row["primer-F(5'-3')"] || "No information",
          barcodeR: row["barcode-R(5'-3')"] || "No information",
          primerR: row["primer-R(5'-3')"] || "No information",
        };
      });
    } else {
      console.log("进入处理 .csv 数据的分支");
      // 如果首行没有标头信息，則視為 CSV 格式
      eDnaTagsContent.forEach((row) => {
        if (row.length < 7) return;  // 确保每行至少有 7 列

        const sampleId = row[0];
        const barcodeF = row[3];
        const primerF = row[4];
        const barcodeR = row[5];
        const primerR = row[6];

        const species = sampleId.split("_")[0];

        if (species && species.toLowerCase() !== "sample") speciesSet.add(species);

        mapping[sampleId] = {
          sampleId: sampleId || "No information",
          barcodeF: barcodeF || "No information",
          primerF: primerF || "No information",
          barcodeR: barcodeR || "No information",
          primerR: primerR || "No information",
        };
      });
    }
  } else {
    console.log("未知的資料類型:", typeof eDnaTagsContent); // 顯示未知資料類型
  }

  setTagMapping(mapping);
  setSpeciesOptions(Array.from(speciesSet));
}, [eDnaTagsContent, setTagMapping, setSpeciesOptions]);


  // 9️⃣ 自動選擇 species
  useEffect(() => {
    if (!fileName || speciesOptions.length === 0) return;
    const match = speciesOptions.find((species) => fileName.startsWith(species));
    if (match) setCurrentSpecies(match);
  }, [fileName, speciesOptions, setCurrentSpecies]);

};
