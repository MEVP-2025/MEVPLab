import React, { useEffect } from "react";
import "../GeneTable.css";

const FATable = ({
  paginatedGenes,
  geneColors,
  locations,
  selectedLocations,
  externalSelectedGenes = [],
  onSelectedGenesChange,
  onSelectedLocationsChange,
  onEditGeneCount,
  onEditGeneCountBulk,
  updateMapData,
  genes = [], // 傳進來完整基因列表
}) => {
  const selectedGenesSet = new Set(externalSelectedGenes);

  // === 自動比對基因名與地名 ===
  useEffect(() => {
    if (!genes || locations.length === 0) return;

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
    if (hasChanges) onEditGeneCountBulk?.(updatedGenes);
  }, [genes, locations, onEditGeneCountBulk]);

  // === 自動全選新進來的 Genes (避免無限循環) ===
  useEffect(() => {
    if (genes.length > 0 && externalSelectedGenes.length === 0) {
      onSelectedGenesChange?.(genes.map((g) => g.name));
    }
    // 只依賴 genes.length 和 onSelectedGenesChange
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genes.length, onSelectedGenesChange]);


  useEffect(() => {
  if (locations.length > 0 && Object.keys(selectedLocations).length === 0) {
    const initialSelected = locations.reduce((acc, loc) => {
      acc[loc] = true;
      return acc;
    }, {});
    onSelectedLocationsChange?.(initialSelected);
  }
}, [locations, selectedLocations, onSelectedLocationsChange]);


  const toggleGeneSelection = (geneName) => {
    const currentSelected = externalSelectedGenes || [];
    const newSelected = selectedGenesSet.has(geneName)
      ? currentSelected.filter((name) => name !== geneName)
      : [...currentSelected, geneName];
    onSelectedGenesChange?.(newSelected);
  };

  const toggleLocationSelection = (loc) => {
    const updated = { ...selectedLocations };
    updated[loc] = !updated[loc];
    onSelectedLocationsChange?.(updated);
  };

  const handleSelectAllGenes = () =>
    onSelectedGenesChange?.(genes.map((g) => g.name));

  const handleClearAllGenes = () => onSelectedGenesChange?.([]);

  const handleSelectAllLocations = () =>
    onSelectedLocationsChange?.(
      locations.reduce((acc, loc) => ({ ...acc, [loc]: true }), {})
    );

  const handleClearAllLocations = () =>
    onSelectedLocationsChange?.(
      locations.reduce((acc, loc) => ({ ...acc, [loc]: false }), {})
    );

  const handleEditGeneCount = (geneName, location, newValue) => {
    const updatedCount = Math.max(0, Number(newValue) || 0);
    onEditGeneCount(geneName, location, updatedCount);
    setTimeout(() => updateMapData([location]), 0);
  };

  return (
    <div className="gene-table-container view-count">
      <div
        style={{
          marginBottom: "8px",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <div>
          <button onClick={handleSelectAllGenes} style={{ marginRight: "6px" }}>
            All Gene
          </button>
          <button onClick={handleClearAllGenes}>Clear</button>
        </div>
        <div>
          <button
            onClick={handleSelectAllLocations}
            style={{ marginRight: "6px" }}
          >
            All Location
          </button>
          <button onClick={handleClearAllLocations}>Clear</button>
        </div>
      </div>

      <div className="gene-table-wrapper">
        <table className="gene-table">
          <thead>
            <tr>
              <th></th>
              <th>Gene name</th>
              {locations.map((loc) => (
                <th key={loc}>
                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!selectedLocations[loc]}
                      onChange={() => toggleLocationSelection(loc)}
                    />
                    <span>{loc}</span>
                  </label>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedGenes.map((gene) => (
              <tr key={gene.name}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedGenesSet.has(gene.name)}
                    onChange={() => toggleGeneSelection(gene.name)}
                  />
                </td>
                <td>
                  <span
                    className="color-box"
                    style={{ backgroundColor: geneColors[gene.name] || "black" }}
                  />
                  {gene.name}
                </td>
                {locations.map((loc) => (
                  <td key={`${gene.name}-${loc}`}>
                    <input
                      type="number"
                      min="0"
                      value={gene.counts?.[loc] || 0}
                      onChange={(e) =>
                        handleEditGeneCount(gene.name, loc, e.target.value)
                      }
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FATable;
