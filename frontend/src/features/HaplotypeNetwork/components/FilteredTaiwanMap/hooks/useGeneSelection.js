// hooks/useGeneSelection.js
import { useState, useEffect, useMemo } from "react";

const useGeneSelection = (genes, selectedGene, activeSimilarityGroup) => {
  const [selectedGenes, setSelectedGenes] = useState([]);

  useEffect(() => {
    const allowed = new Set([selectedGene, ...(Array.isArray(activeSimilarityGroup) ? activeSimilarityGroup : [])]);
    setSelectedGenes(Array.from(allowed).filter(Boolean));
  }, [selectedGene, activeSimilarityGroup]);

  const toggleGene = (name) => {
    setSelectedGenes((prev) =>
      prev.includes(name) ? prev.filter((g) => g !== name) : [...prev, name]
    );
  };

  return { selectedGenes, toggleGene };
};

export default useGeneSelection;
