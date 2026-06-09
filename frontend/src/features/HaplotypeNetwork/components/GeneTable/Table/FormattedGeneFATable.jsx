import { useEffect, useState } from "react";
import { getVizApiUrl } from "../../../../../config/api.js";
import "../../styles/GeneTable.css";

// Utility function to generate random colors for genes
const generateColors = (num) =>
  Array.from({ length: num }, () =>
    `hsl(${Math.floor(Math.random() * 360)}, ${Math.floor(Math.random() * 50) + 25}%, ${Math.floor(Math.random() * 50) + 25}%)`
);

const FormattedGeneFATable = ({
  locations,
  selectedLocations,
  externalSelectedGenes = [],
  onSelectedGenesChange,
  onSelectedLocationsChange,
  onEditGeneCount,
  updateMapData,
  onFormattedGenesChange,
  viewMode,
}) => {
  // === State Initialization ===
  const [formattedGenes, setFormattedGenes] = useState([]);
  const [geneColors, setGeneColors] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [genesPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGenes, setSelectedGenes] = useState(new Set(externalSelectedGenes));

  const [selectedLocationsState, setSelectedLocationsState] = useState(() => {
    return locations.reduce((acc, loc) => {
      acc[loc] = true;
      return acc;
    }, {});
  });

  // === Side Effects ===

  // 1. Update selected locations when state changes
  useEffect(() => {
    onSelectedLocationsChange?.(selectedLocationsState);
  }, [selectedLocationsState, onSelectedLocationsChange]);

  // 2. Fetch formatted genes from API on mount
  useEffect(() => {
    const fetchFormattedGenes = async () => {
      try {
        const response = await fetch(`${getVizApiUrl()}/sequences/formattedCounts`);
        const data = await response.json();
        setFormattedGenes(data.formattedGenes);
      } catch (error) {
        console.error("Failed to fetch formatted genes:", error);
      }
    };

    fetchFormattedGenes();
  }, []);

  // 3. Select all genes when formattedGenes change
  useEffect(() => {
    if (formattedGenes.length > 0) {
      handleSelectAllGenes();
    }
  }, [formattedGenes]);

  // 4. Generate colors for genes when formattedGenes change
  useEffect(() => {
    if (formattedGenes.length > 0) {
      const colors = generateColors(formattedGenes.length);
      const geneColorMap = formattedGenes.reduce((acc, gene, index) => {
        acc[gene.id] = colors[index];
        return acc;
      }, {});
      setGeneColors(geneColorMap);
    }
  }, [formattedGenes]);

  // 5. Update external state when genes or gene colors change
  useEffect(() => {
    if (formattedGenes.length > 0) {
      const geneCounts = formattedGenes.map((gene) => {
        const counts = locations.reduce((acc, loc) => {
          acc[loc] = gene.cities?.[loc] || 0;
          return acc;
        }, {});
        return { id: gene.id, counts };
      });

      const geneColorMap = formattedGenes.reduce((acc, gene, index) => {
        acc[gene.id] = geneColors[gene.id] || "black";
        return acc;
      }, {});

      onFormattedGenesChange?.(formattedGenes, geneColorMap, geneCounts, locations);
    }
  }, [formattedGenes, geneColors, locations, onFormattedGenesChange]);

  // === Search Handler ===
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset pagination to the first page
  };

  // Filter genes based on search term
  const filteredGenes = formattedGenes.filter((gene) =>
    gene.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // === Pagination Logic ===
  const indexOfLastGene = currentPage * genesPerPage;
  const indexOfFirstGene = indexOfLastGene - genesPerPage;
  const currentGenes = filteredGenes.slice(indexOfFirstGene, indexOfLastGene);

  // === Gene Selection Handlers ===

  const toggleGeneSelection = (geneId) => {
    const updatedSelectedGenes = new Set(selectedGenes);
    if (updatedSelectedGenes.has(geneId)) {
      updatedSelectedGenes.delete(geneId);
    } else {
      updatedSelectedGenes.add(geneId);
    }
    setSelectedGenes(updatedSelectedGenes);
    onSelectedGenesChange?.([...updatedSelectedGenes]);
  };

  const handleSelectAllGenes = () => {
    const filteredGeneIds = filteredGenes.map((gene) => gene.id);
    const updatedSelectedGenes = new Set([...selectedGenes, ...filteredGeneIds]);
    setSelectedGenes(updatedSelectedGenes);
    onSelectedGenesChange?.([...updatedSelectedGenes]);
  };

  const handleClearAllGenes = () => {
    const filteredGeneIds = filteredGenes.map((gene) => gene.id);
    const updatedSelectedGenes = new Set(
      [...selectedGenes].filter((geneId) => !filteredGeneIds.includes(geneId))
    );
    setSelectedGenes(updatedSelectedGenes);
    onSelectedGenesChange?.([...updatedSelectedGenes]);
  };

  // === Location Selection Handlers ===
  const handleSelectAllLocations = () => {
    const allLocations = locations.reduce((acc, loc) => ({ ...acc, [loc]: true }), {});
    setSelectedLocationsState(allLocations);
  };

  const handleClearAllLocations = () => {
    const allLocations = locations.reduce((acc, loc) => ({ ...acc, [loc]: false }), {});
    setSelectedLocationsState(allLocations);
  };

  // === Edit Gene Count Handler ===
  const handleEditGeneCount = (geneId, location, newValue) => {
    const updatedCount = Math.max(0, Number(newValue) || 0);
    onEditGeneCount(geneId, location, updatedCount);
    setTimeout(() => updateMapData([location]), 0);
  };

  // === Pagination Controls ===
  const nextPage = () => {
    if (currentPage < Math.ceil(filteredGenes.length / genesPerPage)) {
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
      {/* Search Input */}
      <div className="flex" style={{ marginBottom: 15, gap: 15, alignItems: "center" }}>
        <input
          type="text"
          placeholder="Search"
          value={searchTerm}
          onChange={handleSearchChange}
          className="gene-table-inputbox"
        />
      </div>

      {/* Select and Clear Genes and Locations */}
      <div style={{ marginBottom: "8px", display: "flex", justifyContent: "space-between" }}>
        <div>
          <button onClick={handleSelectAllGenes} style={{ marginRight: "6px" }}>
            All Genes
          </button>
          <button onClick={handleClearAllGenes}>Clear </button>
        </div>
        <div>
          <button onClick={handleSelectAllLocations} style={{ marginRight: "6px" }}>
            All Locations
          </button>
          <button onClick={handleClearAllLocations}>Clear </button>
        </div>
      </div>

      {/* Gene Table */}
      <div className="gene-table-wrapper">
        <table className="gene-table">
          <thead>
            <tr>
              <th></th>
              <th>Gene</th>
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
                      checked={selectedLocationsState[loc] || false}
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
              <tr key={gene.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedGenes.has(gene.id)}
                    onChange={() => toggleGeneSelection(gene.id)}
                  />
                </td>
                <td>
                  <span
                    className="color-box"
                    style={{ backgroundColor: geneColors[gene.id] || "black" }}
                  />
                  {gene.id}
                </td>
                {locations.map((loc) => (
                  <td key={`${gene.id}-${loc}`}>
                    <input
                      type="number"
                      min="0"
                      value={gene.cities?.[loc] || 0}
                      onChange={(e) =>
                        handleEditGeneCount(gene.id, loc, e.target.value)
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
          Previous
        </button>
        <span style={{ margin: "0 10px" }}>
          {currentPage} / {Math.ceil(filteredGenes.length / genesPerPage)}
        </span>
        <button onClick={nextPage} disabled={currentPage === Math.ceil(filteredGenes.length / genesPerPage)}>
          Next
        </button>
      </div>
    </div>
  );
};

export default FormattedGeneFATable;
