// src/server.js
import compression from "compression";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

// Import routes
import analysisRoutes from "./routes/analysis.js";
import dockerRoutes from "./routes/docker.js";
import fileRoutes from "./routes/files.js";
import indexRoutes from "./routes/index.js";
import outputRoutes from "./routes/outputs.js";

// Import middleware
import { errorHandler } from "./middleware/errorHandler.js";
import { logger } from "./utils/logger.js";

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();

console.log("=== SERVER.JS STARTING ===", process.argv);

// Middleware
app.use(
  helmet({
    // Disable some restrictions for SSE to work properly
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  })
);

app.use(compression());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cache-Control"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Static file serving for uploads and outputs
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

const outputsPath =
  process.env.NODE_ENV === "production"
    ? path.join(os.homedir(), ".dna-barcode-toolkit", "outputs")
    : path.join(__dirname, "../outputs");

app.use("/outputs", express.static(outputsPath));

// Routes
app.use("/api", indexRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/analysis", analysisRoutes);
app.use("/api/outputs", outputRoutes);
app.use("/api/docker", dockerRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
    method: req.method,
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
  logger.info(
    `Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:5173"}`
  );
});

// Graceful shutdown handling
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  process.exit(0);
});

export default app;
