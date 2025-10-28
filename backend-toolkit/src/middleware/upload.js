// src/middleware/upload.js
import fs from "fs";
import multer from "multer";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload directory exists
const uploadDir = process.env.NODE_ENV === 'production'
  ? path.join(os.homedir(), '.dna-barcode-toolkit', 'uploads')
  : path.join(__dirname, "../../uploads");

// const uploadDir = path.join(__dirname, "../../uploads");
// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir, { recursive: true });
// }

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 直接使用原始檔名
    cb(null, file.originalname);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedExtensions = [".fq", ".fastq", ".fa", ".fasta", ".csv"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `File type not allowed. Allowed types: ${allowedExtensions.join(", ")}`
      ),
      false
    );
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 1073741824, // 1GB default
    files: 5, // Maximum 5 files at once
  },
});

// 清空資料夾的 middleware
export const clearUploadsDir = async (req, res, next) => {
  try {
    if (fs.existsSync(uploadDir)) {
      await fs.promises.rm(uploadDir, { recursive: true, force: true });
    }
    await fs.promises.mkdir(uploadDir, { recursive: true });
    console.log("Upload directory prepared");
    next();
  } catch (error) {
    console.error("Error handling upload directory:", error);
    next(error);
  }
};

// Middleware for paired-end file upload
export const uploadPairedFiles = upload.fields([
  { name: "R1", maxCount: 1 },
  { name: "R2", maxCount: 1 },
  { name: "barcode", maxCount: 1 },
]);

// Middleware for single file upload
export const uploadSingleFile = upload.single("file");

// Middleware for multiple files
export const uploadMultipleFiles = upload.array("files", 10);
