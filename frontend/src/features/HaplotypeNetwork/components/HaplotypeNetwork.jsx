// HaplotypeNetwork.jsx
// 使用 D3 建立帶城市分群與連線距離的單倍型網絡圖視覺化

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import "../components/AppStyles.css";

const HaplotypeNetwork = ({ width = 800, height = 800 }) => {
  const svgRef = useRef();
  const [data, setData] = useState(null);
  const [cityColors, setCityColors] = useState({});
  const [apiPath, setApiPath] = useState("HaplotypeNetwork");
  const [scaleFactor, setScaleFactor] = useState(1); // 控制節點與距離的縮放

  // 載入資料
  useEffect(() => {
    setData(null); // 清空，顯示 loading
    fetch(`http://localhost:3000/api/haplotypes/${apiPath}`)
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData({ error: true }));
  }, [apiPath]);

  // 初始化圖表
  useEffect(() => {
    if (!data?.nodes || !data?.edges) return;

    const validNodes = data.nodes.filter(
      (d) => typeof d.count === "number" && d.count > 0
    );
    if (!validNodes.length) return;

    const svg = d3.select(svgRef.current).attr("cursor", "grab");
    svg.selectAll("*").remove();

    const g = svg.append("g").attr("class", "zoom-group");

    // 城市顏色分配
    const allCities = new Set();
    validNodes.forEach((node) => {
      if (node.cities)
        Object.keys(node.cities).forEach((c) => allCities.add(c));
    });
    const cityList = Array.from(allCities);
    const cityColorScale = d3
      .scaleOrdinal(d3.schemeCategory10)
      .domain(cityList);
    const cityColorMap = {};
    cityList.forEach((city) => (cityColorMap[city] = cityColorScale(city)));
    setCityColors(cityColorMap);

    // 群組顏色 + 節點半徑
    const groupIds = Array.from(new Set(validNodes.map((d) => d.groupId)));
    const groupColorScale = d3
      .scaleOrdinal(d3.schemeTableau10)
      .domain(groupIds);
    const maxCount = d3.max(validNodes, (d) => d.count);
    const r = d3
      .scaleSqrt()
      .domain([1, maxCount || 1])
      .range([10 * scaleFactor, 30 * scaleFactor]); // 半徑隨 scaleFactor 改變


    // ⚡ 隨機初始位置，避免所有節點一開始擠在中心
    data.nodes.forEach((d) => {
      d.x = Math.random() * width;
      d.y = Math.random() * height;
    });

    // 力導向模擬
    const sim = d3
      .forceSimulation(data.nodes)
      .force(
        "link",
        d3
          .forceLink(data.edges)
          .id((d) => d.id)
          .distance((d) => {
            if (d.source.groupId === d.target.groupId) return 25 * scaleFactor;

              let value = 50 + d.distance * 50;
              if (value > 400) value = 400;
              return value * scaleFactor;
          })
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collide",
        d3.forceCollide().radius((d) => r(d.count) + 2 * scaleFactor)
      );

    // 繪製邊線與距離文字
    const linkGroup = g.append("g").attr("class", "links");
    linkGroup
      .selectAll("line")
      .data(data.edges)
      .join("line")
      .attr("stroke", (d) => d.color || "#030303ff")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", (d) =>
        d.style === "dotted" ? "2,2" : null
      )
      .attr("stroke-linecap", "round");

    const edgeLabels = linkGroup
      .selectAll("text")
      .data(data.edges)
      .join("text")
      .text((d) => d.distance)
      .attr("font-size", 10)
      .attr("fill", "#666")
      .attr("text-anchor", "middle");

    // 節點群組
    const node = g
      .append("g")
      .selectAll("g")
      .data(data.nodes)
      .join("g")
      .call(
        d3
          .drag()
          .on("start", (event, d) => {
            if (!event.active) sim.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) sim.alphaTarget(0);
            d.fx = d.fy = null;
          })
      );

    // 繪製節點圓餅圖
    const pie = d3.pie().value(([_, value]) => value);
    const arc = d3.arc();

    node.each(function (d) {
      const group = d3.select(this);
      const radius = r(d.count);
      const entries = d.cities ? Object.entries(d.cities) : [];

      const borderWidth = d.isRepresentative ? 1 : 1;

      if (!entries.length) {
        group
          .append("circle")
          .attr("r", radius)
          .attr("fill", "#ccc")
          .attr("stroke", "#000")
          .attr("stroke-width", borderWidth);
        return;
      }

      const arcs = pie(entries);
      group
        .selectAll("path")
        .data(arcs)
        .join("path")
        .attr("d", arc.innerRadius(0).outerRadius(radius))
        .attr(
          "fill",
          (arcData) => cityColorMap[arcData.data[0]] || "#999"
        )
        .attr("stroke", "#0a0a0aff")
        .attr("stroke-width", borderWidth);
        
    });

    // tooltip 與 label
    node
      .append("title")
      .text(
        (d) =>
          `ID: ${d.id}\nCount: ${d.count}\n${Object.entries(
            d.cities || {}
          )
            .map(([c, n]) => `${c}: ${n}`)
            .join("\n")}`
      );

    node
      .append("text")
      .text((d) => d.id)
      .attr("y", (d) => -r(d.count) - 5)
      .attr("text-anchor", "middle")
      .attr("fill", "#fff")
      .attr("stroke", "#000")
      .attr("stroke-width", 0.5)
      .attr("font-size", 12);

    // tick 更新圖形位置
    sim.on("tick", () => {
      g.selectAll("line")
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      edgeLabels
        .attr("x", (d) => (d.source.x + d.target.x) / 2)
        .attr("y", (d) => (d.source.y + d.target.y) / 2);

      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });
  }, [data, width, height, scaleFactor]); // scaleFactor 改變時重新渲染

  // 手動縮放控制
  const handleResize = (dir) => {
    setScaleFactor((prev) => {
      const next = dir === "in" ? prev * 1.2 : prev * 0.8;
      return Math.max(0.2, Math.min(5, next)); // 限制縮放範圍
    });
  };

  return (
    <div className="flex" style={{ gap: 20, fontFamily: "sans-serif" }}>
      <div>
        <h2 style={{ margin: "10px 0" }}>Haplotype Network</h2>
        {!data && <p>Loading...</p>}
        {data?.error && (
          <p style={{ color: "red" }}>Unable to load data</p>
        )}

        

        <div style={{ marginBottom: 10 }}>
          <button
            className="button"
            style={{
              marginRight: 10,
              backgroundColor:
                apiPath === "HaplotypeNetwork" ? "#007bff" : "#ccc",
              color: "#fff",
            }}
            onClick={() => setApiPath("HaplotypeNetwork")}
          >
            All information
          </button>
          <button
            className="button"
            style={{
              backgroundColor:
                apiPath === "SimplifiedHaplotypeNetwork"
                  ? "#007bff"
                  : "#ccc",
              color: "#fff",
              marginRight: 10,
            }}
            onClick={() => setApiPath("SimplifiedHaplotypeNetwork")}
          >
            reduce
          </button>
          <button
            className="button"
            style={{
              backgroundColor: "#1976d2",
              color: "#fff",
              marginRight: 10,
            }}
            onClick={() => handleResize("in")}
          >
            🔍 zoom in
          </button>
          <button
            className="button"
            style={{ backgroundColor: "#424242", color: "#fff" }}
            onClick={() => handleResize("out")}
          >
            🔎 zoom out
          </button>
        </div>

        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          style={{
            border: "1px solid #ccc",
            borderRadius: 10,
            boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
            backgroundColor: "#fafafa",
          }}
        />
      </div>

      {/* 城市圖例 */}
      {Object.keys(cityColors).length > 0 && (
        <div
          style={{
            padding: 50,
            border: "1px solid #ccc",
            borderRadius: 80,
            backgroundColor: "#fff",
            boxShadow: "0 2px 60px rgba(0,0,0,0.1)",
            height: "fit-content",
             marginTop: "100px"
          }}
          >
            <h3 style={{ marginTop: 10 }}>location</h3>
            <div
              style={{
                maxHeight: "600px", // 设置最大高度
                overflowY: "auto", // 使其可以滚动
              }}
            >
            <ul
              style={{
                listStyle: "none",
                paddingLeft: 0,
                margin:0,
              }}
            >
              {Object.entries(cityColors).map(([city, color]) => (
                <li
                  key={city}
                  style={{
                    marginBottom: 6,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: 50,
                      height: 50,
                      backgroundColor: color,
                      marginRight: 8,
                      border: "1px solid #000",
                    }}
                  />
                  {city}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default HaplotypeNetwork;