import fs from "fs";

/**
 * Read the length of the first sequence in a FASTQ file.
 * Used as a UI hint only — FLASH still measures the trimmed R1 later.
 *
 * @param {string} fastqPath
 * @returns {number|null}
 */
export function detectReadLength(fastqPath) {
  if (!fastqPath || !fs.existsSync(fastqPath)) {
    return null;
  }

  try {
    // FASTQ records are 4 lines; first sequence is line 2. Read a small
    // prefix so we don't load multi-GB uploads into memory.
    const fd = fs.openSync(fastqPath, "r");
    const buffer = Buffer.alloc(8192);
    const bytesRead = fs.readSync(fd, buffer, 0, 8192, 0);
    fs.closeSync(fd);

    const text = buffer.slice(0, bytesRead).toString("utf8");
    const lines = text.split(/\r?\n/);
    if (lines.length < 2) return null;

    const seq = lines[1].trim();
    return seq ? seq.length : null;
  } catch {
    return null;
  }
}
