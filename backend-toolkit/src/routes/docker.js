import express from "express";
import { DockerService } from "../services/dockerService.js";

const router = express.Router();
const dockerService = new DockerService();

router.get("/check", async (req, res) => {
  try {
    const result = await dockerService.checkEnvironment();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      checks: {
        dockerInstalled: false,
        dockerRunning: false,
        imageAvailable: false,
      },
      message: error.message,
    });
  }
});

router.get("/installed", async (req, res) => {
  try {
    const installed = await dockerService.checkDockerAvailable();
    res.json({ installed });
  } catch (error) {
    res.status(500).json({ installed: false, error: error.message });
  }
});

router.get("/running", async (req, res) => {
  try {
    const running = await dockerService.checkDockerRunning();
    res.json({ running });
  } catch (error) {
    res.status(500).json({ running: false, error: error.message });
  }
});

export default router;
