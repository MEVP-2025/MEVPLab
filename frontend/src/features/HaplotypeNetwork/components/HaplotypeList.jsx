import React from "react";

const HaplotypeList = ({
  viewMode,
  paginatedGenes = [],
  geneColors = {},
  hapHeaders = [],
  hapColors = {},
  hapPage = 1,
  hapsPerPage = 10,
}) => {
  let displayItems = [];

  if (viewMode === "count") {
    displayItems = paginatedGenes.map((gene) => ({
      name: gene.name,
      color: geneColors[gene.name] || "black",
    }));
  } else if (viewMode === "total") {
    const startIdx = (hapPage - 1) * hapsPerPage;
    const endIdx = startIdx + hapsPerPage;
    const currentHaps = hapHeaders.slice(startIdx, endIdx);

    displayItems = currentHaps.map((hap) => ({
      name: hap,
      color: hapColors[hap] || "black",
    }));
  }

  return (
    <div
      style={{
        
        width: "250px",
      }}
    >
      <h2>Haplotype List</h2>
      <ul>
        {displayItems.map((item, index) => (
          <li key={index} style={{ color: item.color }}>
            {item.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default HaplotypeList;
