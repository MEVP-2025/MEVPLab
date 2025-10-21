// server.js
const express = require("express");
const cors = require("cors");
const { Worker } = require("worker_threads");
const path = require("path");

const app = express();
const PORT = 3000;

// 中間件設定
app.use(cors()); // 允許跨域請求
app.use(express.json({ limit: "100mb" })); // 解析 JSON，限制大小 100MB

// --- 資料暫存區 ---
// 儲存基因序列資料（key: gene name, value: sequence）
let geneSequences = {};
// 儲存基因 counts，格式扁平化（每筆包含 name, city, count）
let geneCounts = [];

/**
 * 上傳基因序列
 * 接收 JSON 內的 sequences 物件，儲存到記憶體
 */
app.post("/uploadSequences", (req, res) => {
  const { sequences } = req.body;
  if (!sequences || typeof sequences !== "object") {
    return res.status(400).json({ error: "Invalid sequences" });
  }

  geneSequences = sequences;
  console.log("✔ 已儲存 gene sequences，共", Object.keys(sequences).length, "筆");
  res.json({ message: "Gene sequences uploaded and stored." });
});

/**
 * 取得所有基因名稱與序列
 * 一次回傳所有基因名稱與對應序列
 */
app.get("/sequences", (req, res) => {
  const geneNames = Object.keys(geneSequences);
  res.json({ geneNames, sequences: geneSequences });
});

// 合併基因序列
app.post("/mergesequences", (req, res) => {
  const { sequences } = req.body;

  if (!sequences) {
    return res.status(400).json({ error: "Invalid request, sequences are required" });
  }

  // 儲存合併後的基因序列
  let mergedSequences = {};

  // 遍歷基因序列，合併基因名稱相同的序列
  for (const [name, sequence] of Object.entries(sequences)) {
    const baseName = name.replace(/_\d+$/, ''); // 去除數字後綴，保留基因名
    if (!mergedSequences[baseName]) {
      mergedSequences[baseName] = ''; // 如果該基因名稱不存在，創建一個新序列
    }
    mergedSequences[baseName] += sequence; // 合併序列
  }

  // 更新暫存的基因序列
  geneSequences = mergedSequences;

  // 提取合併後的基因名稱
  const mergedGeneNames = Object.keys(mergedSequences);

  // 格式化回傳：返回合併後的序列與名稱
  const result = [];
  for (const baseName of mergedGeneNames) {
    result.push({
      name: baseName,
      sequence: mergedSequences[baseName]
    });
  }

  res.json({ result });
});




/**
 * 基因比對（使用 Worker Thread 避免阻塞主線程）
 * 輸入目標基因名稱及序列資料，Worker 計算比對結果後回傳
 */
app.post("/compare", (req, res) => {
  const { targetName, sequences } = req.body;

  if (!targetName || !sequences || !sequences[targetName]) {
    return res.status(400).json({ error: "Invalid request" });
  }

  const worker = new Worker(path.resolve(__dirname, "./worker.js"), {
    workerData: { targetName, sequences },
  });

  // 接收 Worker 傳回的比對結果
  worker.on("message", (result) => {
    res.json(result);
  });

  // 錯誤處理
  worker.on("error", (err) => {
    console.error("❌ Worker error:", err);
    res.status(500).json({ error: "Worker error" });
  });

  // Worker 結束監控
  worker.on("exit", (code) => {
    if (code !== 0) {
      console.error(`⚠️ Worker stopped with exit code ${code}`);
    }
  });
});

// 基因序列比對
app.post("/sequencescompare", (req, res) => {
  const { targetName, sequences } = req.body;

  if (!targetName || !sequences || !sequences[targetName]) {
    return res.status(400).json({ error: "Invalid request" });
  }

  // 提取 targetName 的合併基因序列
  const baseName = targetName.replace(/_\d+$/, ''); // 去除數字後綴，保留基因名
  const targetSequence = sequences[baseName];

  if (!targetSequence) {
    return res.status(400).json({ error: `Gene sequence for ${baseName} not found` });
  }

  // 可以在這裡進行基因序列的比對處理
  // 例如，可以使用某些算法（如 Levenshtein distance）來進行比對

  // 假設我們使用簡單的字符串比對
  const comparisonResult = sequences[targetName].includes(targetSequence)
    ? "Match found"
    : "No match found";

  res.json({ comparisonResult });
});


/**
 * 儲存基因 counts
 * 接收扁平化前的結構並轉換成扁平化格式存入記憶體
 * 輸入格式: [{ name, counts: { city: count } }]
 * 轉換為: [{ name, city, count }]
 */
app.post("/saveGeneCounts", (req, res) => {
  const { genes } = req.body;
  if (!Array.isArray(genes)) {
    return res.status(400).json({ error: "Invalid gene data format" });
  }

  let flattened = [];

  // ✅ 自動偵測格式並轉換
  if (genes.length > 0 && genes[0].counts) {
    // 格式為 { name, counts: { city: count } }
    flattened = genes.flatMap(({ name, counts }) => {
      if (typeof counts !== "object") return [];
      return Object.entries(counts).map(([city, count]) => ({
        name,
        city,
        count,
      }));
    });
  } else if (genes.length > 0 && genes[0].city && genes[0].count != null) {
    // 格式為 { name, city, count }
    flattened = genes;
  } else {
    return res.status(400).json({ error: "Unrecognized gene format" });
  }

  // ✅ 如果你要合併而不是覆蓋，可考慮這段（可選）
  // flattened = [...geneCounts, ...flattened];

  // ✅ 預設行為：覆蓋儲存
  geneCounts = flattened;
  console.log("✔ 已儲存 gene counts（格式統一後）共", geneCounts.length, "筆");

  res.json({ message: "Gene counts saved and normalized successfully" });
});


/**
 * 取得所有基因 counts（扁平化後）
 */
app.get("/getGeneCounts", (req, res) => {
  res.json({ genes: geneCounts });
});



app.get("/getFormattedGeneCounts", (req, res) => {
  const hapMap = new Map();

  let totalGeneCount = 0; // 記錄所有基因的總數量

  // 遍歷基因 counts
  for (const { name, city, count } of geneCounts) {
    totalGeneCount += count; // 計算總基因數量

    const match = name.match(/_(\d+)_\d+$/);
    const hapId = match ? `Hap_${match[1]}` : name; // 如果沒有匹配，直接使用 name

    if (!hapMap.has(hapId)) {
      hapMap.set(hapId, { id: hapId, cities: {} });
    }

    const hap = hapMap.get(hapId);
    hap.cities[city] = (hap.cities[city] || 0) + count;
  }

  // 計算格式化後的基因資料
  const formattedGeneCounts = Array.from(hapMap.values()).map(hap => {
    const hapTotalCount = Object.values(hap.cities).reduce((sum, count) => sum + count, 0);
    const percentage = ((hapTotalCount / totalGeneCount) * 100).toFixed(2); // 計算百分比，保留兩位小數
    const idWithPercentage = `${hap.id}(${percentage}%)`; // 在 id 中顯示百分比

    return {
      id: idWithPercentage,
      cities: hap.cities,
      percentage: parseFloat(percentage), // 添加 percentage 以便排序
    };
  });

  // 按百分比從大到小排序
  const sortedGeneCounts = formattedGeneCounts.sort((a, b) => b.percentage - a.percentage);

  // 回傳格式化後的基因資料
  res.json({
    formattedGenes: sortedGeneCounts,
  });
});







// Hamming distance 計算
function hammingDistance(seq1, seq2) {
  if (seq1.length !== seq2.length) return Infinity;
  let dist = 0;
  for (let i = 0; i < seq1.length; i++) {
    if (seq1[i] !== seq2[i]) dist++;
  }
  return dist;
}

app.get("/HaplotypeNetwork", (req, res) => {
  // --- Step 1: 建立 hapId → 合併群組 ---
  const hapMap = new Map();

  for (const { name, city, count } of geneCounts) {
    const sequence = geneSequences[name];
    if (!sequence) continue;

    // 嘗試解析 hap 編號，例如 BbR_1077_3 → hapId = Hap_1077
    const match = name.match(/_(\d+)_\d+$/);
    const hapId = match ? `Hap_${match[1]}` : name; // ⚡ 沒 match 就直接用 name

    if (!hapMap.has(hapId)) {
      hapMap.set(hapId, {
        id: hapId,
        sequence,
        totalCount: 0,
        cities: {},
        members: [],
      });
    }

    const hap = hapMap.get(hapId);
    hap.totalCount += count;
    hap.cities[city] = (hap.cities[city] || 0) + count;
    hap.members.push({ name, city, count });
  }

  // --- Step 2: 建立 nodes ---
  const nodes = [];
  for (const hap of hapMap.values()) {
    nodes.push({
      id: hap.id,
      sequence: hap.sequence,
      count: hap.totalCount,
      cities: hap.cities,
      isRepresentative: true,
    });
  }

  const representatives = nodes;

  // --- Step 3: 建立所有代表點間的距離邊 ---
  const allEdges = [];
  for (let i = 0; i < representatives.length; i++) {
    for (let j = i + 1; j < representatives.length; j++) {
      const nodeA = representatives[i];
      const nodeB = representatives[j];
      const dist = hammingDistance(nodeA.sequence, nodeB.sequence);

      allEdges.push({
        source: nodeA.id,
        target: nodeB.id,
        distance: dist,
      });
    }
  }

  // --- Step 4: Kruskal's Algorithm：最小生成樹 ---
  const parent = {};
  const find = (x) => {
    if (parent[x] === undefined) parent[x] = x;
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  };
  const union = (x, y) => {
    const rootX = find(x);
    const rootY = find(y);
    if (rootX === rootY) return false;
    parent[rootY] = rootX;
    return true;
  };

  allEdges.sort((a, b) => a.distance - b.distance);

  const mstEdges = [];
  for (const edge of allEdges) {
    if (union(edge.source, edge.target)) {
      mstEdges.push({
        ...edge,
        isMST: true,
        style: "solid",
        color: "#000",
      });
      if (mstEdges.length === representatives.length - 1) break;
    }
  }

  // --- Step 5: 額外加上 Hamming distance 1~2 的邊 ---
  const extraEdges = [];
  const connectionCount = {};
  const cityPairs = new Set();

  for (let i = 0; i < representatives.length; i++) {
    for (let j = i + 1; j < representatives.length; j++) {
      const nodeA = representatives[i];
      const nodeB = representatives[j];
      const dist = hammingDistance(nodeA.sequence, nodeB.sequence);

      if (dist >= 1 && dist <= 300) {
        const alreadyInMST = mstEdges.some(
          (e) =>
            (e.source === nodeA.id && e.target === nodeB.id) ||
            (e.source === nodeB.id && e.target === nodeA.id)
        );

        if (!alreadyInMST) {
          if ((connectionCount[nodeA.id] || 0) >= 2) continue;
          if ((connectionCount[nodeB.id] || 0) >= 2) continue;

          const cityPairKey = [nodeA.id, nodeB.id].sort().join("-");
          if (cityPairs.has(cityPairKey)) continue;

          extraEdges.push({
            source: nodeA.id,
            target: nodeB.id,
            distance: dist,
            isMST: false,
            style: "dashed",
            color: "#34b7f1",
          });

          connectionCount[nodeA.id] =
            (connectionCount[nodeA.id] || 0) + 1;
          connectionCount[nodeB.id] =
            (connectionCount[nodeB.id] || 0) + 1;
          cityPairs.add(cityPairKey);
        }
      }
    }
  }

  // --- Step 6: 處理孤立節點 ---
  const connectedEdges = [...mstEdges, ...extraEdges];
  const isolatedEdges = [];
  for (const node of nodes) {
    const alreadyConnected = connectedEdges.some(
      (e) => e.source === node.id || e.target === node.id
    );
    if (!alreadyConnected) {
      isolatedEdges.push({
        source: node.id,
        target: node.id,
        distance: 0,
        isMST: false,
        style: "dashed",
        color: "#999",
      });
    }
  }

  // --- Step 7: 回傳結果 ---
  res.json({ nodes, edges: [...mstEdges, ...extraEdges, ...isolatedEdges] });
});



function hammingDistance(seq1, seq2) {
  if (seq1.length !== seq2.length) return Infinity;
  let dist = 0;
  for (let i = 0; i < seq1.length; i++) {
    if (seq1[i] !== seq2[i]) dist++;
  }
  return dist;
}

app.get("/SimplifiedHaplotypeNetwork", (req, res) => { 
  const sequenceMap = new Map();

  // 與 HaplotypeNetwork 相同，建立 sequence → gene 資料群
  for (const { name, city, count } of geneCounts) {
    const sequence = geneSequences[name];
    if (!sequence) continue;

    if (!sequenceMap.has(sequence)) {
      sequenceMap.set(sequence, []);
    }
    sequenceMap.get(sequence).push({ name, city, count });
  }

  const rawNodes = [];
  const rawRepresentatives = [];
  let groupIdCounter = 0;

  for (const [sequence, geneGroup] of sequenceMap.entries()) {
    const nodeMap = new Map();

    for (const { name, city, count } of geneGroup) {
      if (!nodeMap.has(name)) {
        nodeMap.set(name, {
          id: name,
          sequence,
          count: 0,
          cities: {},
          groupId: groupIdCounter,
        });
      }
      const node = nodeMap.get(name);
      node.count += count;
      node.cities[city] = (node.cities[city] || 0) + count;
    }

    const groupNodes = Array.from(nodeMap.values());
    const representative = groupNodes.reduce((a, b) => (a.count >= b.count ? a : b));
    representative.isRepresentative = true;

    rawRepresentatives.push(representative);
    rawNodes.push(...groupNodes);
    groupIdCounter++;
  }

  // ===== 簡化處理：根據前綴合併 id，如 BbR_100_1 → BbR_100 =====
  const grouped = new Map();
  for (const node of rawRepresentatives) {
    const prefix = node.id.split("_").slice(0, 2).join("_");
    if (!grouped.has(prefix)) {
      grouped.set(prefix, []);
    }
    grouped.get(prefix).push(node);
  }

  const simplifiedNodes = [];
  for (const [prefix, group] of grouped.entries()) {
    let rep = group.find((n) => n.isRepresentative) || group[0];
    simplifiedNodes.push({
      ...rep,
      id: prefix, // 改 id 為前綴
    });
  }

  // 建立所有可能的邊（兩兩之間的 Hamming distance）
  const allEdges = [];
  for (let i = 0; i < simplifiedNodes.length; i++) {
    for (let j = i + 1; j < simplifiedNodes.length; j++) {
      const nodeA = simplifiedNodes[i];
      const nodeB = simplifiedNodes[j];
      const dist = hammingDistance(nodeA.sequence, nodeB.sequence);

      allEdges.push({
        source: nodeA.id,
        target: nodeB.id,
        distance: dist
      });
    }
  }

  // Kruskal's Algorithm：最小生成樹
  const parent = {};
  const find = (x) => {
    if (parent[x] === undefined) parent[x] = x;
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  };
  const union = (x, y) => {
    const rootX = find(x);
    const rootY = find(y);
    if (rootX === rootY) return false;
    parent[rootY] = rootX;
    return true;
  };

  // 對所有邊依照距離排序
  allEdges.sort((a, b) => a.distance - b.distance);

  // 篩選出 MST 邊
  const mstEdges = [];
  for (const edge of allEdges) {
    if (union(edge.source, edge.target)) {
      mstEdges.push({ ...edge, isMST: true, style: 'solid', color: '#000' });
      if (mstEdges.length === simplifiedNodes.length - 1) break;
    }
  }

  // 再額外加上 hammingDistance 1~3 的邊
const extraEdges = [];
const connectionCount = {}; // 記錄每個基因已經加了幾條額外連線
const cityPairs = new Set(); // 記錄已經畫過的縣市組合

for (let i = 0; i < simplifiedNodes.length; i++) {
  for (let j = i + 1; j < simplifiedNodes.length; j++) {
    const nodeA = simplifiedNodes[i];
    const nodeB = simplifiedNodes[j];
    const dist = hammingDistance(nodeA.sequence, nodeB.sequence);

    if (dist >= 0 && dist <= 3) {
      const alreadyInMST = mstEdges.some(
        e =>
          (e.source === nodeA.id && e.target === nodeB.id) ||
          (e.source === nodeB.id && e.target === nodeA.id)
      );

      if (!alreadyInMST) {
        // 限制同一個基因最多加 2 條連線
        if ((connectionCount[nodeA.id] || 0) >= 3) continue;
        if ((connectionCount[nodeB.id] || 0) >= 3) continue;

        // 限制相同縣市不能重複畫
        const cityPairKey = [nodeA.city, nodeB.city].sort().join("-");
        if (cityPairs.has(cityPairKey)) continue;

        // 通過限制 → 加入 extraEdges
        extraEdges.push({
          source: nodeA.id,
          target: nodeB.id,
          distance: dist,
          isMST: false,
          style: "dashed",
          color: "#34b7f1",
        });

        // 更新紀錄
        connectionCount[nodeA.id] = (connectionCount[nodeA.id] || 0) + 1;
        connectionCount[nodeB.id] = (connectionCount[nodeB.id] || 0) + 1;
        cityPairs.add(cityPairKey);
      }
    }
  }
}


  // 回傳 MST + 額外邊
  res.json({ nodes: simplifiedNodes, edges: [...mstEdges, ...extraEdges] });
});


const multer = require("multer");
const { exec } = require("child_process");
const fs = require("fs");


const upload = multer({ dest: "uploads/" });

app.post("/reduceHaplotypes", upload.fields([
  { name: "hapFastaFile" },
  { name: "excelFile" }
]), (req, res) => {
  const reduceSize = req.body.reduceSize;
  const outputFilename = req.body.outputFilename;

  if (!reduceSize || !outputFilename) {
    return res.status(400).json({ error: "缺少 reduceSize 或 outputFilename" });
  }

  const hapFastaPath = req.files.hapFastaFile?.[0]?.path;
  const excelPath = req.files.excelFile?.[0]?.path;

  if (!hapFastaPath || !excelPath) {
    return res.status(400).json({ error: "請上傳 FASTA 和 Excel 檔案" });
  }

  const outputsDir = path.join(__dirname, "outputs");
  fs.mkdirSync(outputsDir, { recursive: true });

  const outputPath = path.join(outputsDir, outputFilename);
  const scriptPath = path.join(__dirname, "reduce_hap_size_py3.py");

  // Python 執行命令
  const command = `python "${scriptPath}" "${hapFastaPath}" ${reduceSize} "${excelPath}" "${outputPath}"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error("❌ 執行 Python 失敗:", error);
      console.error("stderr:", stderr);
      console.error("stdout:", stdout);
      return res.status(500).json({
        error: "執行腳本錯誤",
        details: { message: error.message, stderr, stdout }
      });
    }

    console.log("✅ Python 執行完成:", stdout);

    // 下載 .reduce.fa
    res.download(outputPath, outputFilename, (err) => {
      if (err) {
        console.error("❌ 檔案下載失敗:", err);
        res.status(500).json({ error: "下載失敗" });
      }

      // 清理上傳暫存檔案
      fs.unlink(hapFastaPath, () => {});
      fs.unlink(excelPath, () => {});

      // 額外刪除 asv.fa 和 asv.list
      const asvFa = path.join(outputsDir, "asv.fa");
      const asvList = path.join(outputsDir, "asv.list");
      fs.unlink(asvFa, () => {});
      fs.unlink(asvList, () => {});
    });
  });
});


/**
 * 啟動 Express Server
 */
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});