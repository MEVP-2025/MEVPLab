const express = require("express");
const router = express.Router();
const storage = require("../services/storageService");
const { hammingDistance } = require("../utils/hamming");

function buildMST(nodes, distFn) {
  const allEdges = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      allEdges.push({
        source: nodes[i].id,
        target: nodes[j].id,
        distance: distFn(nodes[i], nodes[j]),
      });
    }
  }

  allEdges.sort((a, b) => a.distance - b.distance);
  const parent = {};
  const find = (x) => {
    if (parent[x] === undefined) parent[x] = x;
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  };
  const union = (x, y) => {
    const rx = find(x),
      ry = find(y);
    if (rx === ry) return false;
    parent[ry] = rx;
    return true;
  };

  const mst = [];
  for (const e of allEdges) {
    if (union(e.source, e.target))
      mst.push({ ...e, isMST: true, style: "solid", color: "#000" });
    if (mst.length === nodes.length - 1) break;
  }
  return { mst, allEdges };
}

router.get("/HaplotypeNetwork", (req, res) => {
  const geneCounts = storage.getGeneCounts();
  const geneSequences = storage.getSequences();

  const hapMap = new Map();
  for (const { name, city, count } of geneCounts) {
    const sequence = geneSequences[name];
    if (!sequence) continue;
    const match = name.match(/_(\d+)_\d+$/);
    const hapId = match ? `Hap_${match[1]}` : name;
    if (!hapMap.has(hapId))
      hapMap.set(hapId, {
        id: hapId,
        sequence,
        totalCount: 0,
        cities: {},
        members: [],
      });
    const hap = hapMap.get(hapId);
    hap.totalCount += Number(count) || 0;
    hap.cities[city] = (hap.cities[city] || 0) + (Number(count) || 0);
    hap.members.push({ name, city, count });
  }

  const nodes = Array.from(hapMap.values()).map((hap) => ({
    id: hap.id,
    sequence: hap.sequence,
    count: hap.totalCount,
    cities: hap.cities,
  }));

  const distFn = (a, b) => {
    if (!a.sequence || !b.sequence) return Infinity;
    return hammingDistance(a.sequence, b.sequence);
  };

  const { mst } = buildMST(nodes, distFn);

  // extra edges with some heuristic (distance 1..300) and simple connection cap
  const extraEdges = [];
  const connectionCount = {};
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i],
        b = nodes[j];
      const dist = distFn(a, b);
      if (dist >= 1 && dist <= 300) {
        const inMST = mst.some(
          (e) =>
            (e.source === a.id && e.target === b.id) ||
            (e.source === b.id && e.target === a.id)
        );
        if (inMST) continue;
        if ((connectionCount[a.id] || 0) >= 2) continue;
        if ((connectionCount[b.id] || 0) >= 2) continue;
        extraEdges.push({
          source: a.id,
          target: b.id,
          distance: dist,
          isMST: false,
          style: "dashed",
          color: "#34b7f1",
        });
        connectionCount[a.id] = (connectionCount[a.id] || 0) + 1;
        connectionCount[b.id] = (connectionCount[b.id] || 0) + 1;
      }
    }
  }

  const connectedEdges = [...mst, ...extraEdges];
  const isolatedEdges = [];
  for (const node of nodes) {
    const connected = connectedEdges.some(
      (e) => e.source === node.id || e.target === node.id
    );
    if (!connected)
      isolatedEdges.push({
        source: node.id,
        target: node.id,
        distance: 0,
        isMST: false,
        style: "dashed",
        color: "#999",
      });
  }

  res.json({ nodes, edges: [...mst, ...extraEdges, ...isolatedEdges] });
});

router.get("/SimplifiedHaplotypeNetwork", (req, res) => {
  const geneCounts = storage.getGeneCounts();
  const geneSequences = storage.getSequences();

  const sequenceMap = new Map();
  for (const { name, city, count } of geneCounts) {
    const sequence = geneSequences[name];
    if (!sequence) continue;
    if (!sequenceMap.has(sequence)) sequenceMap.set(sequence, []);
    sequenceMap.get(sequence).push({ name, city, count });
  }

  const rawRepresentatives = [];
  for (const [sequence, group] of sequenceMap.entries()) {
    const nodeMap = new Map();
    for (const { name, city, count } of group) {
      if (!nodeMap.has(name))
        nodeMap.set(name, { id: name, sequence, count: 0, cities: {} });
      const node = nodeMap.get(name);
      node.count += Number(count) || 0;
      node.cities[city] = (node.cities[city] || 0) + (Number(count) || 0);
    }
    const groupNodes = Array.from(nodeMap.values());
    const rep = groupNodes.reduce((a, b) => (a.count >= b.count ? a : b));
    rep.isRepresentative = true;
    rawRepresentatives.push(rep);
  }

  const grouped = new Map();
  for (const node of rawRepresentatives) {
    const prefix = node.id.split("_").slice(0, 2).join("_");
    if (!grouped.has(prefix)) grouped.set(prefix, []);
    grouped.get(prefix).push(node);
  }

  const simplifiedNodes = [];
  for (const [prefix, group] of grouped.entries()) {
    const rep = group.find((n) => n.isRepresentative) || group[0];
    simplifiedNodes.push({ ...rep, id: prefix });
  }

  const distFn = (a, b) => {
    if (!a.sequence || !b.sequence) return Infinity;
    return hammingDistance(a.sequence, b.sequence);
  };

  const { mst } = buildMST(simplifiedNodes, distFn);

  const extraEdges = [];
  const connectionCount = {};
  for (let i = 0; i < simplifiedNodes.length; i++) {
    for (let j = i + 1; j < simplifiedNodes.length; j++) {
      const a = simplifiedNodes[i],
        b = simplifiedNodes[j];
      const dist = distFn(a, b);
      if (dist >= 0 && dist <= 3) {
        const inMST = mst.some(
          (e) =>
            (e.source === a.id && e.target === b.id) ||
            (e.source === b.id && e.target === a.id)
        );
        if (inMST) continue;
        if ((connectionCount[a.id] || 0) >= 3) continue;
        if ((connectionCount[b.id] || 0) >= 3) continue;
        extraEdges.push({
          source: a.id,
          target: b.id,
          distance: dist,
          isMST: false,
          style: "dashed",
          color: "#34b7f1",
        });
        connectionCount[a.id] = (connectionCount[a.id] || 0) + 1;
        connectionCount[b.id] = (connectionCount[b.id] || 0) + 1;
      }
    }
  }

  res.json({ nodes: simplifiedNodes, edges: [...mst, ...extraEdges] });
});

module.exports = router;
