import React, { useState, useEffect } from "react";
import "../../styles/GeneTable.css";

const CVSTable = ({
  displayedHeaders,
  displayedTableData,
  hapColors,
  selectedLocations,
  onSelectedLocationsChange,
  setFilterMode,
  minPercentage,
  maxPercentage,
  setMinPercentage,
  setMaxPercentage,
}) => {
  // === Location State ===
  const [locations, setLocations] = useState([]);
  const [selectedLocationsState, setSelectedLocationsState] = useState([]);


  useEffect(() => {
    // Extract locations from the first column of your table data (or any other source)
    const locationNames = displayedTableData.map(row => row[0]); // Assuming first column is locations
    setLocations(locationNames);
  }, [displayedTableData]);

  // Handle checkbox changes
  const handleLocationChange = (location) => {
    const updatedSelection = selectedLocationsState.includes(location)
      ? selectedLocationsState.filter(loc => loc !== location)
      : [...selectedLocationsState, location];

    setSelectedLocationsState(updatedSelection);
    onSelectedLocationsChange(updatedSelection); // Pass the updated selection to parent
  };

  // === Search and Filter Logic ===
  const [showPercentage, setShowPercentage] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredHeaders = displayedHeaders.filter((header, index) =>
    index < 2 || header.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTableData = displayedTableData.map((row) =>
    row.filter((cell, colIndex) => filteredHeaders.includes(displayedHeaders[colIndex]))
  );

  const handleFilterModeChange = (mode) => {
    setFilterMode(mode);
  };

    useEffect(() => {
      if (locations.length > 0 && Object.keys(selectedLocations).length === 0) {
        const initialSelected = locations.reduce((acc, loc) => {
          acc[loc] = true;
          return acc;
        }, {});
        onSelectedLocationsChange?.(initialSelected);
      }
    }, [locations, selectedLocations, onSelectedLocationsChange]);

  return (
    <div className="CVSTable-container">
      {/* Search Box */}
      <div className="CVSTable-search-container">
        <input
          type="text"
          placeholder="Search "
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="CVSTable-search-input"
        />
      </div>

     

      <div className="CVSTable-filter-buttons">
        Show on Map:
        <button onClick={() => handleFilterModeChange("all")} 
          className={`CVSTable-button ${setFilterMode === "all" ? "active" : ""}`}
        >
          Show all
        </button>
        <button onClick={() => handleFilterModeChange("range")} 
          className={`CVSTable-button ${setFilterMode === "range" ? "active" : ""}`}
        >
          Show {minPercentage} % ~ {maxPercentage} %
        </button>
      </div>

      <h5 className="CVSTable-percentage-toggle" style={{ whiteSpace: "nowrap" }}>
        <div className="CVSTable-toggle-button">
          <button onClick={() => setShowPercentage((prev) => !prev)}>
            {showPercentage ? "Display Value" : "Display Percentage"}
          </button>
        </div>
      </h5>

      {/* Set Percentage Range */}
      <div className="CVSTable-percentage-range">
        <label>
          Min Percentage:
          <input
            type="number"
            value={minPercentage}
            onChange={(e) => setMinPercentage(Math.max(0.01, Number(e.target.value)))}
            min="0"
            max="100"
            className="CVSTable-percentage-input"
          />
        </label>
        <label>
          Max Percentage:
          <input
            type="number"
            value={maxPercentage}
            onChange={(e) => setMaxPercentage(Number(e.target.value))}
            min="0"
            max="100"
            className="CVSTable-percentage-input"
          />
        </label>
      </div>

<div className="CVSTable-gene-table-container">
  <div className="CVSTable-gene-table-wrapper">
    <table className="CVSTable-gene-table">
      <thead>
        <tr>
          
          {filteredHeaders.map((header, idx) => (
            <th key={idx}>
              {header === "hap_total"
                ? "total"
                : header.startsWith("hap_") ? (
                    <span className="CVSTable-header-hap">
                      <span
                        className="CVSTable-color-box"
                        style={{
                          backgroundColor: hapColors[header] || "#101010ff",
                        }}
                      />
                      {header}
                    </span>
                  ) : (
                    header
                  )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filteredTableData.slice(1).map((row, rowIndex) => {
          const total = parseInt(row[1]) || 0;
          const isRowTransparent = total === 0;
          return (
            <tr key={rowIndex} style={{ opacity: isRowTransparent ? 0.3 : 1 }}>
              {/* Merge checkbox with location name in the same column */}
              <td style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={selectedLocationsState.includes(row[0])}
                  onChange={() => handleLocationChange(row[0])}
                />
                <span>{row[0]}</span> {/* Location name next to checkbox */}
              </td>

              {row.slice(1).map((cell, colIndex) => {
                const isHapCol = colIndex >= 1;
                const rawValue = parseInt(cell) || 0;
                const displayValue = isHapCol
                  ? showPercentage
                    ? total > 0
                      ? `${((rawValue / total) * 100).toFixed(2)}%`
                      : "0.00%"
                    : rawValue
                  : cell;

                let bgColor = undefined;
                if (isHapCol) {
                  if (!showPercentage && rawValue > 0) {
                    bgColor = "var(--chart-4)";
                  } else if (showPercentage && total > 0) {
                    const percent = (rawValue / total) * 100;
                    if (percent >= minPercentage && percent <= maxPercentage) {
                      bgColor = "var(--chart-4)";
                    }
                  }
                }

                return (
                  <td
                    key={colIndex}
                    style={{
                      backgroundColor: bgColor,
                      textAlign: "center",
                    }}
                  >
                    {displayValue}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
</div>







    </div>
  );
};

export default CVSTable;
