const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const NODE_VERSION = "23.5.0";
const nodeDir = path.join(process.cwd(), "node-binaries");
const extractDir = path.join(process.cwd(), "resources", "node");

if (fs.existsSync(extractDir)) {
  fs.rmSync(extractDir, { recursive: true });
}
fs.mkdirSync(extractDir, { recursive: true });

const platforms = {
  "darwin-arm64": {
    file: `node-v${NODE_VERSION}-darwin-arm64.tar.gz`,
    type: "tar.gz"
  },
  "darwin-x64": {
    file: `node-v${NODE_VERSION}-darwin-x64.tar.gz`,
    type: "tar.gz"
  },
  "win32-x64": {
    file: `node-v${NODE_VERSION}-win-x64.zip`,
    type: "zip"
  },
  "linux-x64": {
    file: `node-v${NODE_VERSION}-linux-x64.tar.xz`,
    type: "tar.xz"
  }
};

function extractArchive(archivePath, platformDir, type, platform) {
  const isWindows = process.platform === "win32";

  if (type === "zip") {
    if (isWindows) {
      const psCommand = `Expand-Archive -Path "${archivePath}" -DestinationPath "${platformDir}" -Force`;
      execSync(`powershell -Command "${psCommand}"`, { stdio: "inherit" });
    } else {
      execSync(`unzip -q "${archivePath}" -d "${platformDir}"`, { stdio: "inherit" });
    }

    const extractedDir = path.join(platformDir, `node-v${NODE_VERSION}-win-x64`);
    if (fs.existsSync(extractedDir)) {
      const files = fs.readdirSync(extractedDir);
      files.forEach((file) => {
        const src = path.join(extractedDir, file);
        const dest = path.join(platformDir, file);
        if (fs.existsSync(dest)) {
          fs.rmSync(dest, { recursive: true });
        }
        fs.renameSync(src, dest);
      });
      fs.rmdirSync(extractedDir);
    }

  } else if (type === "tar.gz" || type === "tar.xz") {
    // Skip extraction on Unix platform on Windows
    if (isWindows && (platform.startsWith("darwin") || platform.startsWith("linux"))) {
      console.log(`Skipping ${platform} extraction on Windows (will be extracted on target platform)`);
      return;
    }

    const flag = type === "tar.gz" ? "z" : "J";
    execSync(
      `tar -x${flag}f "${archivePath}" -C "${platformDir}" --strip-components=1`,
      { stdio: "inherit" }
    );
  }
}

for (const [platform, { file: filename, type }] of Object.entries(platforms)) {
  const archivePath = path.join(nodeDir, filename);
  const platformDir = path.join(extractDir, platform);

  if (!fs.existsSync(archivePath)) {
    console.log(`${filename} not found, skipping...`);
    continue;
  }

  fs.mkdirSync(platformDir, { recursive: true });

  console.log(`Extracting ${filename}...`);

  try {
    extractArchive(archivePath, platformDir, type, platform);
    console.log(`Successfully extracted ${filename}`);
  } catch (error) {
    console.error(`Failed to extract ${filename}:`, error.message);
  }
}

console.log("Extraction complete!");