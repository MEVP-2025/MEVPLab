// utils/hamming.js
function hammingDistance(seq1, seq2) {
  if (!seq1 || !seq2) return Infinity;
  if (seq1.length !== seq2.length) return Infinity;
  let dist = 0;
  for (let i = 0; i < seq1.length; i++) {
    if (seq1[i] !== seq2[i]) dist++;
  }
  return dist;
}

module.exports = { hammingDistance };
