import React from "react";
import "..//GeneTable.css";
// import { riverToCityMap } from "../../data/riverToCityMap.js";

// InformationTable.jsx

const InformationTable = ({
  paginatedGenes,
  geneColors,
  speciesOptions,
  currentSpecies,
  setCurrentSpecies,
  tagMapping,
  ednaMapping,
  fileName,
}) => {
  // === 專屬方法：從 geneName 找到 sample info ===
  const getSampleInfo = (geneName) => {
    let sampleId = null;

    // 嘗試從 geneName 找物種與地點
    const match = geneName.match(/(ZpDL|CypDL|xworm)_[A-Za-z0-9-]+/);
    if (match) sampleId = match[0];

    // 如果找不到，再用 fileName 推測
    if (!sampleId && fileName) {
      const speciesPrefix = speciesOptions.find((prefix) =>
        fileName.startsWith(prefix)
      );
      const nameParts = geneName.split("_");
      if (speciesPrefix && nameParts.length > 0) {
        sampleId = `${speciesPrefix}_${nameParts[0]}`;
      }
    }

    // tag info
    const tag = sampleId ? tagMapping[sampleId] : null;

    // eDNA info (用 sampleId 的最後一段當作 ID)
    const shortId = sampleId?.split("_").slice(-1)[0];
    const info = shortId ? ednaMapping[shortId] : null;

    return { tag, info };
  };



  return (
    <>
      {/* 物種切換區 */}
      {speciesOptions.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <b>Species:</b>
          {speciesOptions.map((s) => (
            <button
              key={s}
              onClick={() => setCurrentSpecies(s)}
              style={{
                marginLeft: 10,
                backgroundColor: currentSpecies === s ? "#007bff" : "#d0d0d0ff",
                color: currentSpecies === s ? "white" : "black",
                borderRadius: 4,
                padding: "4px 10px",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Gene 詳細資訊表 */}
      <div className="gene-table-container view-detail">
        <div className="gene-table-wrapper">
          <table className="gene-table">
            <thead>
              <tr>
                <th>Gene name</th>
                <th>Sampling point number</th>
                <th>Forward Barcode</th>
                <th>Forward Primer</th>
                <th>Reverse Barcode</th>
                <th>Reverse Primer</th>
                <th>longitude</th>
                <th>latitude</th>
                <th>river</th>
                <th>sample area</th>
                
              </tr>
            </thead>
            <tbody>
              {paginatedGenes.map((gene) => {
                const { tag, info } = getSampleInfo(gene.name);

                return (
                  <tr key={gene.name}>
                    <td>
                      <span
                        className="color-box"
                        style={{
                          backgroundColor: geneColors[gene.name] || "black",
                        }}
                      />
                      {gene.name}
                    </td>
                    <td>{tag?.sampleId || "No information"}</td>
                    <td>{tag?.barcodeF || "No information"}</td>
                    <td>{tag?.primerF || "No information"}</td>
                    <td>{tag?.barcodeR || "No information"}</td>
                    <td>{tag?.primerR || "No information"}</td>
                    <td>{info?.Celong1 || "No information"}</td>
                    <td>{info?.Celat2 || "No information"}</td>
                    <td>{info?.river || "No information"}</td>
                    <td>{info?.site || "No information"}</td>
                    
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default InformationTable;
