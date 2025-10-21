const express = require("express");
const router = express.Router();
const { runWorker } = require("../utils/workerPromise");
const storage = require("../services/storageService");

// upload sequences
router.post("/upload", (req, res) => {
  const { sequences } = req.body;
  if (!sequences || typeof sequences !== "object")
    return res.status(400).json({ error: "Invalid sequences" });
  storage.setSequences(sequences);
  res.json({ message: "Gene sequences uploaded and stored." });
});

router.get("/", (req, res) => {
  const sequences = storage.getSequences();
  res.json({ geneNames: Object.keys(sequences), sequences });
});

router.post("/merge", (req, res) => {
  const { sequences } = req.body;
  if (!sequences || typeof sequences !== "object")
    return res
      .status(400)
      .json({ error: "Invalid request, sequences required" });
  const merged = {};
  for (const [name, sequence] of Object.entries(sequences)) {
    const baseName = name.replace(/_\d+$/, "");
    merged[baseName] = (merged[baseName] || "") + sequence;
  }
  storage.setSequences(merged);
  const result = Object.entries(merged).map(([name, sequence]) => ({
    name,
    sequence,
  }));
  res.json({ result });
});

// compare using worker (wrap in promise)
router.post("/compare", async (req, res, next) => {
  try {
    const { targetName, sequences } = req.body;
    if (!targetName || !sequences || !sequences[targetName])
      return res.status(400).json({ error: "Invalid request" });
    const result = await runWorker(
      "./worker.js",
      { targetName, sequences },
      { timeout: 30000 }
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/sequencescompare", (req, res) => {
  const { targetName, sequences } = req.body;
  if (!targetName || !sequences)
    return res.status(400).json({ error: "Invalid request" });

  const baseName = targetName.replace(/_\d+$/, "");
  const targetSequence = sequences[baseName];
  const subjectSequence = sequences[targetName];

  if (!targetSequence)
    return res
      .status(400)
      .json({ error: `Gene sequence for ${baseName} not found` });
  if (!subjectSequence)
    return res
      .status(400)
      .json({ error: `Gene sequence for ${targetName} not found` });

  const comparisonResult = subjectSequence.includes(targetSequence)
    ? "Match found"
    : "No match found";
  res.json({ comparisonResult });
});

// gene counts
router.post("/saveGeneCounts", (req, res) => {
  const { genes } = req.body;
  if (!Array.isArray(genes))
    return res.status(400).json({ error: "Invalid gene data format" });

  let flattened = [];
  if (genes.length > 0 && genes[0].counts) {
    flattened = genes.flatMap(({ name, counts }) => {
      if (typeof counts !== "object") return [];
      return Object.entries(counts).map(([city, count]) => ({
        name,
        city,
        count,
      }));
    });
  } else if (genes.length > 0 && genes[0].city && genes[0].count != null) {
    flattened = genes;
  } else {
    return res.status(400).json({ error: "Unrecognized gene format" });
  }

  storage.setGeneCounts(flattened);
  res.json({ message: "Gene counts saved and normalized successfully" });
});

router.get("/counts", (req, res) => {
  res.json({ genes: storage.getGeneCounts() });
});

router.get("/formattedCounts", (req, res) => {
  const geneCounts = storage.getGeneCounts();
  const hapMap = new Map();
  let totalGeneCount = 0;
  for (const { name, city, count } of geneCounts) {
    totalGeneCount += Number(count) || 0;
    const match = name.match(/_(\d+)_\d+$/);
    const hapId = match ? `Hap_${match[1]}` : name;
    if (!hapMap.has(hapId)) hapMap.set(hapId, { id: hapId, cities: {} });
    const hap = hapMap.get(hapId);
    hap.cities[city] = (hap.cities[city] || 0) + (Number(count) || 0);
  }

  const formatted = Array.from(hapMap.values()).map((hap) => {
    const hapTotal = Object.values(hap.cities).reduce((s, v) => s + v, 0);
    const percentage =
      totalGeneCount === 0
        ? 0
        : parseFloat(((hapTotal / totalGeneCount) * 100).toFixed(2));
    return { id: `${hap.id}(${percentage}%)`, cities: hap.cities, percentage };
  });

  formatted.sort((a, b) => b.percentage - a.percentage);
  res.json({ formattedGenes: formatted });
});

module.exports = router;
