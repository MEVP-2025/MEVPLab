import { mapImages } from "../../data/mapImages.js";

const MapControls = ({
  imgW, imgH,
  lonRange, latRange,
  lonDirMin, lonDirMax, latDirMin, latDirMax,
  setImgW, setImgH,
  setLonRange, setLatRange,
  setLonDirMin, setLonDirMax, setLatDirMin, setLatDirMax,
  activeMapId, setActiveMapId,
  setMapImage,
  handleImageUpload,
  handleSwitchMap
}) => {
return (
  <div
    style={{
      display: "flex",
      flexDirection: "row",
      gap: 12, // 三欄間距縮小
      alignItems: "stretch",
      width: "60%",
    }}
  >
    {/* 📁 上傳 & 地圖清單 */}
    <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label>Select Map: </label>
        <select
          value={activeMapId ?? ""}
          onChange={(e) => {
            const value = e.target.value;
            if (value === "") {
              // 選擇空白
              setActiveMapId("");
              setMapImage(null);
            } else if (value === "Customize") {
              setActiveMapId("Customize");
              setMapImage(null);
            } else {
              const map = mapImages.find((m) => m.id === value);
              if (map) handleSwitchMap(map);
            }
          }}
        >

          {/* 空白預設 */}
          <option value="">-- Select a Map --</option>

          {mapImages.map((map) => (
            <option key={map.id} value={map.id}>
              {map.name}
            </option>
          ))}
          <option value="Customize">Customize Map</option>
        </select>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ whiteSpace: "nowrap" }}>Upload Map PNG: 
        <input type="file" accept="image/png" onChange={handleImageUpload} />
        </label>
      </div>
    </div>

    {/* 🖼️ 圖片尺寸設定 */}
    <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <label  style={{ whiteSpace: "nowrap" }}>Image Width: </label>
        <input
          type="number"
          value={imgW ?? ""}
          onChange={(e) => setImgW(Number(e.target.value))}
          className="small-input"
        />     
        <label  style={{ whiteSpace: "nowrap" }}>Height: </label>
        <input
          type="number"
          value={imgH ?? ""}
          onChange={(e) => setImgH(Number(e.target.value))}
          className="small-input"
        />
      
        <button
          onClick={() => {
            setImgW(Math.round(imgW * 1.25));
            setImgH(Math.round(imgH * 1.25));
          }}
           style={{ display: "flex", alignItems: "center" , whiteSpace: "nowrap"  }}
        >
          🔍+
        </button>
        <button
          onClick={() => {
            setImgW(Math.round(imgW * 0.8));
            setImgH(Math.round(imgH * 0.8));
          }}
           style={{ display: "flex", alignItems: "center" , whiteSpace: "nowrap"  }}
        >
          🔍- 
        </button>
      </div>

<div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
      {/* 經度 */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <label style={{ whiteSpace: "nowrap" }}>Longitude Range: </label>
        <select
          value={lonDirMin}
          onChange={(e) => {
            setLonDirMin(e.target.value);
            setLonRange([Math.abs(lonRange[0]) * (e.target.value === "E" ? 1 : -1), lonRange[1]]);
          }}
        >
          <option value="E">E</option>
          <option value="W">W</option>
        </select>
        <input
          type="number"
          value={Math.abs(lonRange[0])}
          onChange={(e) =>
            setLonRange([+e.target.value * (lonDirMin === "E" ? 1 : -1), lonRange[1]])
          }
          className="small-input"
        />
        -
        <select
          value={lonDirMax}
          onChange={(e) => {
            setLonDirMax(e.target.value);
            setLonRange([lonRange[0], Math.abs(lonRange[1]) * (e.target.value === "E" ? 1 : -1)]);
          }}
        >
          <option value="E">E</option>
          <option value="W">W</option>
        </select>
        <input
          type="number"
          value={Math.abs(lonRange[1])}
          onChange={(e) =>
            setLonRange([lonRange[0], +e.target.value * (lonDirMax === "E" ? 1 : -1)])
          }
          className="small-input"
        />
      </div>

      {/* 緯度 */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <label style={{ whiteSpace: "nowrap" }}>Latitude Range: </label>
        <select
          value={latDirMin}
          onChange={(e) => {
            setLatDirMin(e.target.value);
            setLatRange([Math.abs(latRange[0]) * (e.target.value === "N" ? 1 : -1), latRange[1]]);
          }}
        >
          <option value="N">N</option>
          <option value="S">S</option>
        </select>
        <input
          type="number"
          value={Math.abs(latRange[0])}
          onChange={(e) =>
            setLatRange([+e.target.value * (latDirMin === "N" ? 1 : -1), latRange[1]])
          }
          className="small-input"
        />
        -
        <select
          value={latDirMax}
          onChange={(e) => {
            setLatDirMax(e.target.value);
            setLatRange([latRange[0], Math.abs(latRange[1]) * (e.target.value === "N" ? 1 : -1)]);
          }}
        >
          <option value="N">N</option>
          <option value="S">S</option>
        </select>
        <input
          type="number"
          value={Math.abs(latRange[1])}
          onChange={(e) =>
            setLatRange([latRange[0], +e.target.value * (latDirMax === "N" ? 1 : -1)])
          }
          className="small-input"
        />
      </div>
    </div>


    </div>

    
  </div>
);




};

export default MapControls;
