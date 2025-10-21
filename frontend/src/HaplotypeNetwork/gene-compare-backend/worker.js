// worker.js
const { parentPort, workerData } = require("worker_threads");

const { targetName, sequences } = workerData;

const compareSequences = (seq1, seq2) => {
  let matches = 0;
  const len = Math.min(seq1.length, seq2.length);
  for (let i = 0; i < len; i++) {
    if (seq1[i] === seq2[i]) matches++;
  }
  return (matches / len) * 100;
};

const targetSeq = sequences[targetName];
const results = [];

Object.entries(sequences).forEach(([name, seq]) => {
  if (name === targetName) return;
  const similarity = compareSequences(targetSeq, seq);
  results.push({ name, similarity });
});

results.sort((a, b) => b.similarity - a.similarity);
parentPort.postMessage(results);
