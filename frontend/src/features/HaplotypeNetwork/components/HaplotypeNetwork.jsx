import { Canvg } from 'canvg';
import * as d3 from "d3";
import { saveAs } from "file-saver";
import { useEffect, useRef, useState } from "react";
import { getVizApiUrl } from "../../../config/api.js";

import "./styles/HaplotypeNetwork.css";

// Utility function to convert oklch color to rgb
function oklchToRgb(L, C, H) {
  const x = C * Math.cos(H);
  const y = C * Math.sin(H);
  
  const ref = 0.2 + 0.5 * (L + 1);
  const r = ref + x;
  const g = ref - y;
  const b = ref - x;
  
  return {
    r: Math.min(255, Math.max(0, r * 255)),
    g: Math.min(255, Math.max(0, g * 255)),
    b: Math.min(255, Math.max(0, b * 255)),
  };
}

const HaplotypeNetwork = ({ width = 850, height = 850 , genes ,eDnaSampleContent }) => {
  const svgRef = useRef();
  const [data, setData] = useState(null);
  const [cityColors, setCityColors] = useState({});
  const [cityColorMap, setCityColorMap] = useState({});
  const [apiPath, setApiPath] = useState("HaplotypeNetwork");
  const [scaleFactor, setScaleFactor] = useState(1); 
  const [loading, setLoading] = useState(true);
  const [countRange, setCountRange] = useState({ min: 0, max: 100 });
  const [fetchedRange, setFetchedRange] = useState({ min: 0, max: 100 });

  // Set the API path based on gene information
  useEffect(() => {
    if (genes && genes.length > 0) {
      const geneName = genes[0].name; 
      if (geneName.includes(",") && geneName.match(/^[a-zA-Z0-9_,-]+(,hap_\d+_\d+)+$/)) {
        setApiPath("HaplotypeNetwork");
      }
      else if (geneName.includes("_") && !geneName.includes(",")) {
        setApiPath("SimplifiedHaplotypeNetwork");
      }
      else {
        setApiPath("HaplotypeNetwork");
      }
    }
  }, [genes]);

  // Fetch haplotype data when parameters change
  useEffect(() => {
    setLoading(true); 
    setData(null); 

    const min = countRange.min;
    const max = countRange.max;

    fetch(`${getVizApiUrl()}/haplotypes/${apiPath}?min=${min}&max=${max}`)
      .then((res) => res.json())
      .then((newData) => {
        setData(newData);
        setLoading(false); 
      })
      .catch(() => {
        setData({ error: true });
        setLoading(false); 
      });

  }, [apiPath, countRange, genes , eDnaSampleContent]);

  // Fetch the count range data
  useEffect(() => {
    if (apiPath) {
      fetch(`${getVizApiUrl()}/haplotypes/HaplotypeCountRange`)
        .then((res) => res.json())
        .then((countRangeData) => {
          setCountRange(countRangeData.countRange);
          setFetchedRange(countRangeData.countRange);
        })
        .catch(() => {
          console.error("Failed to fetch count range");
        });
    }
  }, [apiPath , genes , eDnaSampleContent]);

  // Reset chart and re-fetch data
  const resetChart = () => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();  

    setLoading(true); 
    setData(null); 

    fetch(`${getVizApiUrl()}/haplotypes/${apiPath}?min=${countRange.min}&max=${countRange.max}`)
      .then((res) => res.json())
      .then((newData) => {
        setData(newData); 
        setLoading(false); 
      })
      .catch(() => {
        setData({ error: true });
        setLoading(false); 
      });
  };

  // Chart initialization
  useEffect(() => {
    if (!data?.nodes || !data?.edges) return;

    const validNodes = data.nodes.filter(
      (d) => typeof d.count === "number" && d.count > 0
    );
    if (!validNodes.length) return;

    const svg = d3.select(svgRef.current).attr("cursor", "grab");
    svg.selectAll("*").remove();

    const g = svg.append("g").attr("class", "zoom-group");

    const allCities = new Set();
    validNodes.forEach((node) => {
      if (node.cities)
        Object.keys(node.cities).forEach((c) => allCities.add(c));
    });
    const cityList = Array.from(allCities);

    const usedColors = new Set();
    const cityColorScale = d3
      .scaleOrdinal()
      .domain(cityList)
      .range(
        cityList.map(() => {
          let color;
          do {
            const L = 0.1 + Math.random() * 0.2;
            const C = 0.1 + Math.random() * 0.8;
            const H = (0.1 + Math.random() * 1.8) * Math.PI;
            const { r, g, b } = oklchToRgb(L, C, H);
            color = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
          } while (usedColors.has(color));

          usedColors.add(color);
          return color;
        })
      );

    const cityColorMap = {};
    cityList.forEach((city) => (cityColorMap[city] = cityColorScale(city)));
    setCityColors(cityColorMap);

    const groupIds = Array.from(new Set(validNodes.map((d) => d.groupId)));
    const groupColorScale = d3
      .scaleOrdinal(d3.schemeTableau10)
      .domain(groupIds);
    const maxCount = d3.max(validNodes, (d) => d.count);
    const r = d3
      .scaleSqrt()
      .domain([1, maxCount || 1])
      .range([10 * scaleFactor, 30 * scaleFactor]);

    data.nodes.forEach((d) => {
      d.x = Math.random() * width;
      d.y = Math.random() * height;
    });

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

    const linkGroup = g.append("g").attr("class", "links");
    linkGroup
      .selectAll("line")
      .data(data.edges)
      .join("line")
      .attr("stroke", (d) => d.color || "var(--primary)")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", (d) => (d.style === "dotted" ? "2,2" : null))
      .attr("stroke-linecap", "round");

    const edgeLabels = linkGroup
      .selectAll("text")
      .data(data.edges)
      .join("text")
      .text((d) => d.distance)
      .attr("font-size", 10)
      .attr("fill", "var(--primary)")
      .attr("text-anchor", "middle");

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
          .attr("fill", "var(--detail)")
          .attr("stroke", "var(--primary)")
          .attr("stroke-width", borderWidth);
        return;
      }

      const arcs = pie(entries);
      const slice = group
        .selectAll("path")
        .data(arcs)
        .join("path")
        .attr("d", arc.innerRadius(0).outerRadius(radius))
        .attr(
          "fill",
          (arcData) => cityColorMap[arcData.data[0]] || "var(--detail)"
        )
        .attr("stroke", "var(--primary)")
        .attr("stroke-width", borderWidth);

      slice.append("title").text(
        (arcData) =>
          `City: ${arcData.data[0]}\nCount: ${arcData.data[1]}`
      );
    });

    node
      .append("title")
      .text(
        (d) =>
          `ID: ${d.id}\nCount: ${d.count}\n${Object.entries(d.cities || {})
            .map(([c, n]) => `${c}: ${n}`)
            .join("\n")}`
      );

    node
      .append("text")
      .text((d) => d.id)
      .attr("y", (d) => -r(d.count) - 5)
      .attr("text-anchor", "middle")
      .attr("fill", "var(--primary)")
      .attr("stroke", "var(--text)")
      .attr("stroke-width", 0.5)
      .attr("font-size", 12)
      .style("pointer-events", "none"); 

    sim.on("tick", () => {
      g.selectAll("line")
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      edgeLabels
        .attr("x", (d) => (d.source.x + d.target.x) / 2)
        .attr("y", (d) => (d.source.y + d.target.y) / 2);

      node.attr("transform", (d) => {
        const margin = 25;
        const validWidth = width - margin * 2;
        const validHeight = height - margin * 2;

        d.x = Math.max(r(d.count) + margin, Math.min(validWidth - r(d.count), d.x));
        d.y = Math.max(r(d.count) + margin, Math.min(validHeight - r(d.count), d.y));

        return `translate(${d.x},${d.y})`;
      });
    });
  }, [data, width, height, scaleFactor, cityColorMap, genes]);

  // Handle zoom in/out buttons
  const handleResize = (dir) => {
    setScaleFactor((prev) => {
      const next = dir === "in" ? prev * 1.2 : prev * 0.8;
      return Math.max(0.2, Math.min(5, next)); 
    });
  };

  // Handle min and max count changes
  const handleMinChange = (e) => {
    const value = +e.target.value;
    if (value >= 0 && value <= fetchedRange.max) {
      setCountRange((prev) => ({ ...prev, min: value }));
    }
  };

  const handleMaxChange = (e) => {
    const value = +e.target.value;
    if (value >= countRange.min && value <= fetchedRange.max) {
      setCountRange((prev) => ({ ...prev, max: value }));
    }
  };

  const handleMaxBlur = () => {
    if (countRange.max < countRange.min) {
      setCountRange({ ...countRange, max: countRange.min });
    }
  };

  // Export chart to PNG
  const exportPNG = async () => {
    const svgContainer = svgRef.current;
    const legendContainer = document.querySelector(".HaplotypeNetwork-svg-container");
    if (!svgContainer || !legendContainer) return;

    const html2canvas = (await import("html2canvas")).default;

    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      const v = await Canvg.from(ctx, svgContainer.outerHTML);
      await v.render();

      // Render the graph at a higher pixel density than its CSS size so the
      // exported PNG stays crisp (e.g. on Retina displays), instead of
      // capturing at 1x which produced a low-resolution image.
      const exportScale = Math.max(window.devicePixelRatio || 1, 2);

      const legendCanvas = await html2canvas(legendContainer, {
        ignoreElements: (el) => el.tagName === "IFRAME",
        scale: exportScale,
      });

      if (!legendCanvas) {
        console.error("Failed to capture legend content");
        return;
      }

      const padding = 10;
      const fontSize = 16;
      const boxSize = 14;
      const spacing = 6;
      const font = `${fontSize}px sans-serif`;
      const itemsPerColumn = 30;

      const legendItems = Object.entries(cityColors).map(([city, color]) => ({
        name: city,
        color: color || "block",
      }));

      const numCols = Math.ceil(legendItems.length / itemsPerColumn);
      const numRows = Math.min(legendItems.length, itemsPerColumn);
      const legendWidth = 180 * numCols + padding;
      const legendHeight = padding * 2 + numRows * (fontSize + spacing);

      const marginRight = 50;
      // CSS-pixel dimensions of the network graph (matches the SVG's
      // viewBox/width/height attributes).
      const graphWidth = svgContainer.width.baseVal.value;
      const graphHeight = svgContainer.height.baseVal.value;

      // Size the actual canvas buffer in *device* pixels (CSS size *
      // exportScale) so the high-resolution `legendCanvas` capture isn't
      // downscaled/cropped, then use ctx.scale() so all the manual drawing
      // below can keep working in CSS-pixel coordinates.
      canvas.width = (graphWidth + legendWidth) * exportScale;
      canvas.height = Math.max(graphHeight, legendHeight) * exportScale;
      ctx.scale(exportScale, exportScale);

      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, graphWidth + legendWidth, Math.max(graphHeight, legendHeight));

      // `legendCanvas` was captured at `exportScale`, i.e. its pixel size is
      // already graphWidth/graphHeight * exportScale. Drawing it into a
      // CSS-pixel-sized destination rect (under the ctx.scale() above)
      // preserves its full resolution instead of drawing 1:1 device pixels
      // into a smaller canvas, which is what caused the earlier cropping bug.
      ctx.drawImage(legendCanvas, 0, 0, graphWidth, graphHeight);

      ctx.font = font;
      ctx.textBaseline = "middle";

      legendItems.forEach((item, i) => {
        const col = Math.floor(i / itemsPerColumn);
        const row = i % itemsPerColumn;
        const x = graphWidth + col * 180 + padding;
        const y = padding + row * (fontSize + spacing) + fontSize / 2;

        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.arc(x + boxSize / 2, y, boxSize / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "black";
        ctx.fillText(item.name, x + boxSize + 8, y);
      });

      canvas.toBlob((blob) => {
        if (blob) saveAs(blob, "haplotype_network_with_legend.png");
      });
    } catch (error) {
      console.error("Error during export:", error);
    }
  };




  // Configuration and consistency checks
  const [isConfigured, setIsConfigured] = useState(false); 
  const [isLengthConsistent, setIsLengthConsistent] = useState(true); 

  useEffect(() => {
    const isAllConfigured = 
      Array.isArray(genes) && genes.length > 0 && 
      Array.isArray(eDnaSampleContent) && eDnaSampleContent.length > 0; 
    setIsConfigured(isAllConfigured);
  }, [genes, eDnaSampleContent ]);

  useEffect(() => {
    const checkGeneSequenceLengths = async () => {
      try {
        const res = await fetch(`${getVizApiUrl()}/sequences/checkSequenceLengths`);
        const data = await res.json();

        if (!data.isConsistent) {
          setIsLengthConsistent(false);
        } else {
          setIsLengthConsistent(true);
        }
      } catch (err) {
        console.error("基因序列長度檢查錯誤:", err);
        setIsLengthConsistent(true); 
      }
    };

    checkGeneSequenceLengths();
  }, [genes]);

  return (
    <div className="HaplotypeNetwork-container">
      <div className="HaplotypeNetwork-content">
        <h2 className="HaplotypeNetwork-title">Haplotype Network</h2>
        <div style={{ marginBottom: 10, position: "relative" }}>
          {/* Zoom In/Out Buttons */}
          <button
            className="HaplotypeNetwork-button HaplotypeNetwork-zoom-button"
            onClick={() => handleResize("in")}
          >
            🔍 zoom in
          </button>
          <button
            className="HaplotypeNetwork-button HaplotypeNetwork-zoom-out-button"
            onClick={() => handleResize("out")}
          >
            🔎 zoom out
          </button>

          {/* Reset Button */}
          <button
            className="HaplotypeNetwork-reset-button"
            onClick={resetChart}
          >
            🔄
          </button>

          {apiPath === "HaplotypeNetwork" && (
            <div>
              <label>Count range:</label>
              <input
                type="number"
                value={countRange.min}
                onChange={handleMinChange}
                min="0"
                max={fetchedRange.max}
              />
              <span> to </span>
              <input
                type="number"
                value={countRange.max}
                onChange={handleMaxChange}
                max={fetchedRange.max}
                onBlur={handleMaxBlur}
              />
              ({fetchedRange.min} - {fetchedRange.max})
            </div>
          )}

           <button
            className="HaplotypeNetwork-export-button"
            onClick={exportPNG}
          >
            Export as PNG
          </button>
        </div>    

        {/* Display gene sequence length inconsistency warning */}
        {!isLengthConsistent && (
          <div className="HaplotypeNetwork-warning-box">
            <p>⚠️ The gene sequence lengths are different! Please check your data.</p>
          </div>
        )}

        {!isConfigured && (
          <div className="HaplotypeNetwork-warning-box">
            <p>⚠️ Complete the following settings：</p>
            <ul>
              {(!genes || !Array.isArray(genes) || genes.length === 0) && 
                <li> Upload Fa File </li>
              }
              {(!eDnaSampleContent ) && (
                <li> Upload eDNA Sample Station (xlsx)</li>
              )}
            </ul>
          </div>
        )}

        {(isConfigured || isLengthConsistent) && (
          <div className="HaplotypeNetwork-svg-container">
            <svg
              ref={svgRef}
              viewBox="0 0 850 850"
              width={850}
              height={850}
            />
          </div>
        )}
      </div>

      {(isConfigured || isLengthConsistent) && (
        <div className="HaplotypeNetwork-container">
          {Object.keys(cityColors).length > 0 && (
            <div className="HaplotypeNetwork-city-legend">
              <h3>Location</h3>
              <div>
                <ul className="HaplotypeNetwork-city-list">
                  {Object.entries(cityColors).map(([city, color]) => (
                    <li key={city} className="HaplotypeNetwork-city-item">
                      <div
                        className="HaplotypeNetwork-city-color-box"
                        style={{ backgroundColor: color }}
                      />
                      {city}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HaplotypeNetwork;
