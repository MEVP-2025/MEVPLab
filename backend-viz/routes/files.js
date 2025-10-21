const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

const uploadDir = path.join(__dirname, "..", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir });

router.post(
  "/reduceHaplotypes",
  upload.fields([{ name: "hapFastaFile" }, { name: "excelFile" }]),
  (req, res, next) => {
    try {
      const reduceSize = parseInt(req.body.reduceSize, 10);
      const outputFilename = req.body.outputFilename;
      if (!Number.isInteger(reduceSize) || reduceSize <= 0)
        return res.status(400).json({ error: "Invalid reduceSize" });
      if (!outputFilename)
        return res.status(400).json({ error: "Missing outputFilename" });

      const hapFastaPath = req.files.hapFastaFile?.[0]?.path;
      const excelPath = req.files.excelFile?.[0]?.path;
      if (!hapFastaPath || !excelPath)
        return res
          .status(400)
          .json({ error: "Please upload FASTA and Excel files" });

      const outputsDir = path.join(__dirname, "..", "outputs");
      fs.mkdirSync(outputsDir, { recursive: true });
      const outputPath = path.join(outputsDir, outputFilename);
      const scriptPath = path.join(__dirname, "..", "reduce_hap_size_py3.py");

      // Use spawn to avoid shell interpolation
      const python = process.env.PYTHON_CMD || "python3";
      const args = [
        scriptPath,
        hapFastaPath,
        String(reduceSize),
        excelPath,
        outputPath,
      ];
      const proc = spawn(python, args);

      let stdout = "";
      let stderr = "";
      proc.stdout.on("data", (d) => {
        stdout += d.toString();
      });
      proc.stderr.on("data", (d) => {
        stderr += d.toString();
      });

      proc.on("close", (code) => {
        if (code !== 0) {
          console.error("Python failed", code, stderr);
          return res
            .status(500)
            .json({ error: "Script error", details: stderr || stdout });
        }

        res.download(outputPath, outputFilename, (err) => {
          // best-effort cleanup
          try {
            fs.unlinkSync(hapFastaPath);
          } catch (e) {}
          try {
            fs.unlinkSync(excelPath);
          } catch (e) {}
          try {
            fs.unlinkSync(path.join(outputsDir, "asv.fa"));
          } catch (e) {}
          try {
            fs.unlinkSync(path.join(outputsDir, "asv.list"));
          } catch (e) {}
          if (err) return next(err);
        });
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
