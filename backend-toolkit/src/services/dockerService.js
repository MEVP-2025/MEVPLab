import { exec, spawn } from "child_process";
import { promisify } from "util";
import { logger } from "../utils/logger.js";

const execAsync = promisify(exec);

export class DockerService {
  constructor() {
    this.authorName = "uiskskkekekk";
    this.imageName = "mevp-2025";
    this.imageTag = "latest";
    this.fullImageName = `${this.authorName}/${this.imageName}:${this.imageTag}`;
  }

  // Check if Docker is installed and running
  async checkDockerAvailable() {
    try {
      const { stdout } = await execAsync("docker --version");
      logger.info(`Docker version: ${stdout.trim()}`);
      return true;
    } catch (error) {
      logger.error("Docker is not installed or not in PATH:", error.message);
      return false;
    }
  }

  // Check Docker daemon status
  async checkDockerRunning() {
    try {
      await execAsync("docker info");
      logger.info("Docker daemon is running");
      return true;
    } catch (error) {
      logger.error("Docker daemon is not running:", error.message);
      return false;
    }
  }

  // Check if a specific Docker image exists
  async checkImageExists(imageName = this.fullImageName) {
    try {
      const { stdout } = await execAsync(
        `docker images ${imageName} --format "{{.Repository}}:{{.Tag}}"`
      );
      const exists = stdout.trim().includes(imageName);
      logger.info(`Image ${imageName} exists: ${exists}`);
      return exists;
    } catch (error) {
      logger.error(`Failed to check image ${imageName}:`, error.message);
      return false;
    }
  }

  // pull Docker image if it doesn't exist
  async pullImageIfNeeded(imageName = this.fullImageName) {
    try {
      const exists = await this.checkImageExists(imageName);
      if (exists) {
        logger.info(`Image ${imageName} already exists`);
        return true;
      }

      logger.info(`Pulling image ${imageName}...`);
      await execAsync(`docker pull ${imageName}`);
      logger.info(`Successfully pulled image ${imageName}`);
      return true;
    } catch (error) {
      logger.error(`Failed to pull image ${imageName}:`, error.message);
      return false;
    }
  }

  /**
   * Run Docker container
   * @param {Object} options - Execution options
   * @param {string} options.workDir - Working directory path
   * @param {string} options.command - Command to execute
   * @param {Array} options.args - Command arguments
   * @param {Function} options.onStdout - Callback for stdout
   * @param {Function} options.onStderr - Callback for stderr
   * @param {Function} options.onExit - Exit callback
   */
  async runContainer(options) {
    const {
      workDir,
      command = "python3",
      args = [],
      onStdout,
      onStderr,
      onExit,
      imageName = this.fullImageName,
    } = options;

    return new Promise((resolve, reject) => {
      // 構建 Docker 命令
      const dockerArgs = [
        "run",
        "--rm", // 容器退出後自動刪除
        "-v",
        `${workDir}:/app/data`, // 掛載工作目錄
        imageName,
        command,
        ...args,
      ];

      logger.info(`Running Docker command: docker ${dockerArgs.join(" ")}`);

      const dockerProcess = spawn("docker", dockerArgs, {
        stdio: ["pipe", "pipe", "pipe"],
      });

      let output = "";
      let errorOutput = "";

      // 處理 stdout
      dockerProcess.stdout.on("data", (data) => {
        const chunk = data.toString();
        output += chunk;
        if (onStdout) {
          onStdout(chunk);
        }
      });

      // 處理 stderr
      dockerProcess.stderr.on("data", (data) => {
        const chunk = data.toString();
        errorOutput += chunk;
        if (onStderr) {
          onStderr(chunk);
        }
      });

      // 處理程序結束
      dockerProcess.on("close", (code, signal) => {
        if (onExit) {
          onExit(code, signal);
        }

        if (code === 0) {
          resolve({
            success: true,
            output,
            exitCode: code,
          });
        } else {
          reject(
            new Error(
              `Docker container exited with code ${code}: ${errorOutput}`
            )
          );
        }
      });

      // 處理程序錯誤
      dockerProcess.on("error", (error) => {
        logger.error("Docker process error:", error);
        reject(new Error(`Failed to start Docker container: ${error.message}`));
      });

      // 返回進程句柄以便外部控制
      return dockerProcess;
    });
  }

  /**
   * 完整的環境檢查
   */
  async checkEnvironment() {
    const checks = {
      dockerInstalled: false,
      dockerRunning: false,
      imageAvailable: false,
    };

    try {
      // -- Check Docker installation
      checks.dockerInstalled = await this.checkDockerAvailable();
      if (!checks.dockerInstalled) {
        return { success: false, checks, message: "Docker is not installed" };
      }

      // -- Check Docker daemon
      checks.dockerRunning = await this.checkDockerRunning();
      if (!checks.dockerRunning) {
        return {
          success: false,
          checks,
          message: "Docker daemon is not running",
        };
      }

      // -- Check/Pull image
      checks.imageAvailable = await this.pullImageIfNeeded();
      if (!checks.imageAvailable) {
        return {
          success: false,
          checks,
          message: `Failed to get image ${this.fullImageName}`,
        };
      }

      return { success: true, checks, message: "Docker environment is ready" };
    } catch (error) {
      logger.error("Docker environment check failed:", error);
      return { success: false, checks, message: error.message };
    }
  }
}
