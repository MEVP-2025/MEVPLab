import React, { useEffect, useState } from "react";
import "../../styles/GeneTable.css";

// 生成基因的颜色，保证每个基因都有独特的颜色
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
  onEditGeneCountBulk,
  updateMapData,
  onFormattedGenesChange,  // 传递的回调函数，用于将数据传递到父组件
  viewMode // 确保父组件传入了viewMode来决定是否显示搜索框
}) => {
  const [formattedGenes, setFormattedGenes] = useState([]);
  const [geneColors, setGeneColors] = useState({}); // 存储每个基因的颜色
  const [currentPage, setCurrentPage] = useState(1); // 当前页码
  const [genesPerPage] = useState(10); // 每页显示的基因数量
  const [searchTerm, setSearchTerm] = useState(""); // 搜索框的内容
  const selectedGenesSet = new Set(externalSelectedGenes);

  // Fetch the formatted genes from the backend
  useEffect(() => {
    const fetchFormattedGenes = async () => {
      try {
        const response = await fetch("http://localhost:3000/api/sequences/formattedCounts");
        const data = await response.json();
        setFormattedGenes(data.formattedGenes);
      } catch (error) {
        console.error("Failed to fetch formatted genes:", error);
      }
    };

    fetchFormattedGenes();
  }, []);

  // 生成基因颜色并设置
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

  // 自动全选所有基因
  useEffect(() => {
    if (formattedGenes.length > 0) {
      handleSelectAllGenes();
    }
  }, [formattedGenes]);

  // 向父组件传递 formattedGenes, geneColors 和基因数量
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

  // 搜索处理
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // 搜索时跳转到第一页
  };

  // 根据搜索关键词筛选基因
  const filteredGenes = formattedGenes.filter((gene) =>
    gene.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 计算当前页显示的基因数据
  const indexOfLastGene = currentPage * genesPerPage;
  const indexOfFirstGene = indexOfLastGene - genesPerPage;
  const currentGenes = filteredGenes.slice(indexOfFirstGene, indexOfLastGene);

  const handleSelectAllGenes = () =>
    onSelectedGenesChange?.(formattedGenes.map((g) => g.id));

  const handleClearAllGenes = () => onSelectedGenesChange?.([]);

  const handleSelectAllLocations = () =>
    onSelectedLocationsChange?.(
      locations.reduce((acc, loc) => ({ ...acc, [loc]: true }), {})
    );

  const handleClearAllLocations = () =>
    onSelectedLocationsChange?.(
      locations.reduce((acc, loc) => ({ ...acc, [loc]: false }), {})
    );

  const handleEditGeneCount = (geneId, location, newValue) => {
    const updatedCount = Math.max(0, Number(newValue) || 0);
    onEditGeneCount(geneId, location, updatedCount);
    setTimeout(() => updateMapData([location]), 0);
  };

  // 分页功能：下一页
  const nextPage = () => {
    if (currentPage < Math.ceil(filteredGenes.length / genesPerPage)) {
      setCurrentPage(currentPage + 1);
    }
  };

  // 分页功能：上一页
  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className="gene-table-container view-count">
      {/* 搜尋框 */}
      
        <div className="flex" style={{ marginBottom: 15, gap: 15, alignItems: "center" }}>
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={handleSearchChange}
            className="search-input"
            style={{ width: 200 }}
          />
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
              <tr key={gene.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedGenesSet.has(gene.id)}
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

      {/* 分页控制 */}
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
