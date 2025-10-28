// src/routes/files.js
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import {
  clearUploadsDir,
  uploadPairedFiles,
  uploadSingleFile,
} from "../middleware/upload.js";
import { logger } from "../utils/logger.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Upload paired-end files (R1, R2, and optional barcode file)
router.post(
  "/upload/paired",
  clearUploadsDir,
  uploadPairedFiles,
  async (req, res, next) => {
    try {
      const { R1, R2, barcode } = req.files;

      // Validate required files
      if (!R1 || !R2 || !barcode) {
        return res.status(400).json({
          error: "R1, R2, and barcode files are required",
        });
      }

      const uploadedFiles = {
        R1: {
          id: uuidv4(), // 生成新的唯一ID
          originalName: R1[0].originalname,
          filename: R1[0].filename,
          path: R1[0].path,
          size: R1[0].size,
          uploadTime: new Date().toISOString(),
        },
        R2: {
          id: uuidv4(), // 生成新的唯一ID
          originalName: R2[0].originalname,
          filename: R2[0].filename,
          path: R2[0].path,
          size: R2[0].size,
          uploadTime: new Date().toISOString(),
        },
        barcode: {
          id: uuidv4(), // 生成新的唯一ID
          originalName: barcode[0].originalname,
          filename: barcode[0].filename,
          path: barcode[0].path,
          size: barcode[0].size,
          uploadTime: new Date().toISOString(),
        },
      };

      logger.info("Paired files uploaded successfully", {
        R1: uploadedFiles.R1.originalName,
        R2: uploadedFiles.R2.originalName,
        barcode: uploadedFiles.barcode.originalName,
      });

      res.json({
        message: "Files uploaded successfully",
        files: uploadedFiles,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post("/upload/single", uploadSingleFile, (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const uploadedFile = {
      id: uuidv4(),
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      uploadTime: new Date().toISOString(),
    };

    logger.info("Single file uploaded:", uploadedFile.originalName);

    res.json({
      success: true,
      message: "File uploaded successfully",
      filename: uploadedFile.filename, // -- file name required by front-end
      file: uploadedFile,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
