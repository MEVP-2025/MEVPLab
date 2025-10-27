// src/routes/index.js
import express from "express";

const router = express.Router();

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

// System info endpoint
router.get("/system", (req, res) => {
  res.json({
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    },
  });
});

// API info endpoint
router.get("/", (req, res) => {
  res.json({
    name: "Evolution Analysis API",
    version: "1.0.0",
    description: "Backend API for DNA sequence evolution analysis",
    endpoints: {
      health: "/api/health",
      system: "/api/system",
      files: "/api/files",
      analysis: "/api/analysis",
      outputs: "/api/outputs",
      docker: "/api/docker",
    },
  });
});

export default router;
