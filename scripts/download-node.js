const fs = require("fs");
const { createWriteStream } = require("fs");
const path = require("path");
const { pipeline } = require("stream/promises");

const NODE_VERSION = "23.5.0";
const platforms = {
  "darwin-arm64": `node-v${NODE_VERSION}-darwin-arm64.tar.gz`,
  "darwin-x64": `node-v${NODE_VERSION}-darwin-x64.tar.gz`,
  "win32-x64": `node-v${NODE_VERSION}-win-x64.zip`,
  "linux-x64": `node-v${NODE_VERSION}-linux-x64.tar.xz`,
};

async function downloadNode() {
  const nodeDir = path.join(process.cwd(), "node-binaries");

  if (!fs.existsSync(nodeDir)) {
    fs.mkdirSync(nodeDir, { recursive: true });
  }

  for (const [platform, filename] of Object.entries(platforms)) {
    const url = `https://nodejs.org/dist/v${NODE_VERSION}/${filename}`;
    const outputPath = path.join(nodeDir, filename);

    if (fs.existsSync(outputPath)) {
      console.log(`${filename} already exists, skipping...`);
      continue;
    }

    console.log(`Downloading ${filename}...`);

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to download ${url}`);

    await pipeline(response.body, createWriteStream(outputPath));
    console.log(`Downloaded ${filename}`);
  }
}

downloadNode().catch(console.error);