// services/storageService.js
// Simple in-memory storage. Replaceable with DB or Redis later.
let geneSequences = {};
let geneCounts = [];

function setSequences(sequences) {
  geneSequences = sequences || {};
}

function getSequences() {
  return geneSequences;
}

function setGeneCounts(counts) {
  geneCounts = counts || [];
}

function getGeneCounts() {
  return geneCounts;
}

module.exports = { setSequences, getSequences, setGeneCounts, getGeneCounts };
