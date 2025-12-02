import React, { useEffect, useRef, useState } from "react";
import "../../styles/GeneTable.css";

const FATable = ({
  paginatedGenes,
  geneColors,
  locations,
  selectedLocations,
  onSelectedLocationsChange,
  externalSelectedGenes = [],
  onSelectedGenesChange,
  onEditGeneCount,
  onEditGeneCountBulk,
  updateMapData,
  genes, // full list of genes
  viewMode,
  showOnlySelected,
  setShowOnlySelected,
}) => {
  const selectedGenesSet = new Set(externalSelectedGenes);

  // Ref to track if the "Clear" button was clicked
  const clearClicked = useRef(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const genesPerPage = 10;

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // === Filter genes if "Show selected" is checked ===
  const filteredGenes = showOnlySelected
    ? genes.filter((gene) => selectedGenesSet.has(gene.name))
    : genes;

  // === Filter genes based on search query ===
  const searchFilteredGenes = searchQuery
    ? filteredGenes.filter((gene) =>
        gene.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filteredGenes;

  // === Calculate Genes for Current Page ===
  const indexOfLastGene = currentPage * genesPerPage;
  const indexOfFirstGene = indexOfLastGene - genesPerPage;
  const currentGenes = searchFilteredGenes.slice(indexOfFirstGene, indexOfLastGene);

  
  useEffect(() => {
    if (locations.length > 0 && Object.keys(selectedLocations).length === 0) {
      const initialSelected = locations.reduce((acc, loc) => {
        acc[loc] = true;
        return acc;
      }, {});
      onSelectedLocationsChange?.(initialSelected);
    }
  }, [locations, selectedLocations, onSelectedLocationsChange]);

  useEffect(() => {
      if (genes.length > 0) {
        handleSelectAllGenes();
      }
    }, [genes]);

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

    
  const handleSelectAllGenes = () => {
    const currentlySelected = new Set(externalSelectedGenes);
    const genesToSelect = searchFilteredGenes.map((gene) => gene.name);
    const allSelectedGenes = [...currentlySelected, ...genesToSelect];
    const uniqueSelectedGenes = [...new Set(allSelectedGenes)];
    onSelectedGenesChange?.(uniqueSelectedGenes);
  };


  
  const handleClearAllGenes = () => {
    clearClicked.current = true; // 標記“Clear”按鈕被點擊過
    const genesToDeselect = searchFilteredGenes.map((gene) => gene.name);
    const genesToKeep = externalSelectedGenes.filter((gene) => !genesToDeselect.includes(gene)); // 保留未被搜尋過濾的基因
    onSelectedGenesChange?.(genesToKeep); // 更新選擇的基因，只保留未被搜尋過濾的基因
  };


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

  // === Pagination Handlers ===
  const nextPage = () => {
    if (currentPage < Math.ceil(searchFilteredGenes.length / genesPerPage)) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className="gene-table-container view-count">
      {/* Search Box */}
      <div style={{ marginBottom: "10px", display: "flex", alignItems: "center" }}>
        <input
          type="text"
          placeholder="Search Genes"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1); // Reset pagination to the first page when searching
          }}
          style={{
            padding: "6px",
            marginRight: "10px",
            borderRadius: "4px",
            border: "1px solid #ccc",
            width: "100%",
          }}
        />
        <div>
          {viewMode === "count" && (
            <label style={{fontSize: 20, display: "inline-flex", alignItems: "center" ,whiteSpace: "nowrap"}}>
              <input
                type="checkbox"
                checked={showOnlySelected}
                onChange={() => {
                  const next = !showOnlySelected;
                  if (next && setCurrentPage) setCurrentPage(1); // Reset page to 1 if "Show selected" is toggled
                  setShowOnlySelected(next);
                }}
                style={{ marginRight: 6 }}
              />
              Show selected
            </label>
          )}
        </div>
      </div>

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
              <th>Gene ID</th>
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
            {currentGenes.map((gene) => (
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

      {/* Pagination Controls */}
      <div className="pagination">
        <button onClick={prevPage} disabled={currentPage === 1}>
          Prev
        </button>
        <span style={{ margin: "0 10px" }} >
          {currentPage} / {Math.ceil(searchFilteredGenes.length / genesPerPage)}
        </span>
        <button onClick={nextPage} disabled={currentPage === Math.ceil(searchFilteredGenes.length / genesPerPage)}>
          Next
        </button>
      </div>
    </div>
  );
};

export default FATable;



