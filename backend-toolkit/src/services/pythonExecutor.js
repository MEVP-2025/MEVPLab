// backend/src/services/pythonExecutor.js
import fs from "fs-extra";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { analysisLogger, logger } from "../utils/logger.js";
import { DockerService } from "./dockerService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PythonExecutor {
  constructor() {
    this.dockerService = new DockerService();

    if (process.env.NODE_ENV === "production") {
      this.workingDir = path.join(os.homedir(), ".dna-barcode-toolkit");
      this.outputsDir = path.join(this.workingDir, "outputs");
      this.uploadsDir = path.join(this.workingDir, "uploads");
      this.backendRootDir = this.workingDir;

      // ensure that directories exist
      fs.ensureDirSync(this.workingDir);
      fs.ensureDirSync(this.outputsDir);
      fs.ensureDirSync(this.uploadsDir);

      const sourcePythonScripts = path.join(__dirname, "../../python_scripts");
      const destPythonScripts = path.join(this.workingDir, "python_scripts");

      if (fs.existsSync(sourcePythonScripts)) {
        fs.copySync(sourcePythonScripts, destPythonScripts);
        console.log("Python scripts copied to working directory");
      }
    } else {
      this.outputsDir = path.join(__dirname, "../../outputs");
      this.backendRootDir = path.join(__dirname, "../../");
      this.uploadsDir = path.join(__dirname, "../../uploads");
    }

    this.standardPipeline = [
      {
        name: "trim and rename",
        script: "Step1/rename_trim.py",
        requiredFiles: ["R1", "R2", "barcode", "qualityConfig"],
        outputDirs: ["rename", "trim"],
      },
      {
        name: "pear",
        script: "Step2/joinPear.py",
        requiredFiles: [],
        outputDirs: ["pear"],
      },
      {
        name: "length filter",
        script: "Step2/lenFilter.py",
        requiredFiles: ["minLength", "maxLength"],
        outputDirs: ["filter", "filter_del"],
      },
      {
        name: "blast",
        script: "Step3/joinBlast.py",
        requiredFiles: ["ncbiReference"],
        outputDirs: ["blast"],
      },
      {
        name: "assign species",
        script: "Step3/assign_species.py",
        requiredFiles: ["keyword", "identity"],
        outputDirs: ["assign"],
      },
      {
        name: "species classifier",
        script: "Step3/speciesClassifier.py",
        requiredFiles: [],
        outputDirs: ["classifier"],
      },
      {
        name: "MAFFT",
        script: "Step4/joinMAFFT.py",
        requiredFiles: [],
        outputDirs: ["mafft"],
      },
      {
        name: "tab formatter",
        script: "Step4/tabFormatter.py",
        requiredFiles: [],
        outputDirs: ["tab_formatter"],
      },
      {
        name: "trim gaps",
        script: "Step4/trim_gaps.py",
        requiredFiles: [],
        outputDirs: ["trimmed"],
      },
      {
        name: "separate reads",
        script: "Step5/separate_reads.py",
        requiredFiles: ["copyNumber"],
        outputDirs: ["separated"],
      },
      {
        name: "generate location-haplotype table",
        script: "Step6/get_loc_hap_table.py",
        requiredFiles: ["barcode"],
        outputDirs: ["table"],
      },
    ];
  }

  /**
   * Check Docker environment, throw error if not available
   */
  async checkEnvironment() {
    try {
      const dockerCheck = await this.dockerService.checkEnvironment();
      if (dockerCheck.success) {
        logger.info("Docker environment verified successfully");
        return { ready: true, dockerInfo: dockerCheck };
      } else {
        const errorMsg = `Docker environment is required but not available: ${dockerCheck.message}`;
        logger.error(errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error) {
      const errorMsg = `Docker environment check failed: ${error.message}`;
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }
  }

  /**
   * Clear all output directories before starting new analysis
   */
  async clearOutputDirectories() {
    try {
      const allOutputDirs = this.standardPipeline.flatMap(
        (step) => step.outputDirs || []
      );
      const uniqueDirs = [...new Set(allOutputDirs)];

      for (const dirName of uniqueDirs) {
        const dirPath = path.join(this.outputsDir, dirName);
        await fs.remove(dirPath);
        await fs.ensureDir(dirPath);
      }

      logger.info("Output directories cleared successfully");
    } catch (error) {
      logger.error("Failed to clear output directories:", error);
      throw error;
    }
  }

  /**
   * Create quality configuration file
   * @private
   */
  async _createQualityConfigFile(qualityConfig) {
    try {
      const configFileName = `quality_config_${Date.now()}.json`;
      const configFilePath = path.join(this.uploadsDir, configFileName);

      await fs.writeJson(configFilePath, qualityConfig, { spaces: 2 });

      logger.info(
        `Created quality config file: ${configFileName}`,
        qualityConfig
      );
      return configFileName;
    } catch (error) {
      logger.error("Failed to create quality config file:", error);
      throw new Error(`Failed to create quality config file: ${error.message}`);
    }
  }

  /**
   * Execute integrated pipeline with Docker only
   */
  async executePipeline(
    params,
    progressCallback = null,
    processCallback = null
  ) {
    const {
      r1File,
      r2File,
      barcodeFile,
      qualityConfig = {},
      minLength = 200,
      maxLength = null,
      ncbiReferenceFile,
      keyword,
      identity,
      copyNumber,
    } = params;

    try {
      // -- check Docker environment
      const envCheck = await this.checkEnvironment();

      await this.clearOutputDirectories();

      // -- create quality config json file
      const qualityConfigFileName = await this._createQualityConfigFile(
        qualityConfig
      );

      logger.info("Starting integrated pipeline with Docker", {
        r1File,
        r2File,
        barcodeFile,
        qualityConfig,
        minLength,
        maxLength,
        ncbiReferenceFile,
        keyword,
        identity,
        copyNumber,
        steps: this.standardPipeline.map((s) => s.name),
      });

      // 發送初始進度
      if (progressCallback) {
        progressCallback({
          type: "start",
          message: "Starting DNA analysis pipeline with Docker...",
        });
      }

      const stepResults = {};

      for (let i = 0; i < this.standardPipeline.length; i++) {
        const step = this.standardPipeline[i];

        if (progressCallback) {
          progressCallback({
            type: "step_start",
            message: `Starting ${step.name}...`,
            stepName: step.name,
          });
        }

        const stepResult = await this._executeStep(
          step,
          {
            r1File,
            r2File,
            barcodeFile,
            qualityConfigFile: qualityConfigFileName,
            minLength,
            maxLength,
            ncbiReferenceFile,
            keyword,
            identity,
            copyNumber,
          },
          progressCallback,
          processCallback
        );

        stepResults[step.name] = stepResult;

        if (progressCallback) {
          progressCallback({
            type: "step_complete",
            message: `Completed ${step.name}`,
            stepName: step.name,
          });
        }
      }

      // 清理臨時配置檔案
      try {
        await fs.remove(path.join(this.uploadsDir, qualityConfigFileName));
      } catch (cleanupError) {
        logger.warn("Failed to cleanup quality config file:", cleanupError);
      }

      logger.info("Docker pipeline completed successfully");

      if (progressCallback) {
        progressCallback({
          type: "complete",
          message: "Analysis completed!",
        });
      }

      return {
        status: "completed",
        executionMode: "docker",
      };
    } catch (error) {
      logger.error("Docker pipeline failed", error);

      if (progressCallback) {
        progressCallback({
          type: "error",
          message: `Analysis failed: ${error.message}`,
          error: error.message,
        });
      }

      throw error;
    }
  }

  /**
   * Execute pipeline using Docker
   * @private
   */
  async _executeStep(step, params, progressCallback, processCallback) {
    const {
      r1File,
      r2File,
      barcodeFile,
      qualityConfigFile,
      minLength,
      maxLength,
      ncbiReferenceFile,
      keyword,
      identity,
      copyNumber,
    } = params;

    const containerArgs = [`/app/data/python_scripts/${step.script}`];

    for (const requiredFile of step.requiredFiles) {
      switch (requiredFile) {
        case "R1":
          containerArgs.push(`/app/data/uploads/${path.basename(r1File)}`);
          break;
        case "R2":
          containerArgs.push(`/app/data/uploads/${path.basename(r2File)}`);
          break;
        case "barcode":
          containerArgs.push(`/app/data/uploads/${path.basename(barcodeFile)}`);
          break;
        case "qualityConfig":
          containerArgs.push(`/app/data/uploads/${qualityConfigFile}`);
          break;
        case "minLength":
          containerArgs.push(parseInt(minLength));
          break;
        case "maxLength":
          if (maxLength !== null && maxLength !== undefined) {
            containerArgs.push(parseInt(maxLength));
          }
          break;
        case "ncbiReference":
          containerArgs.push(
            `/app/data/uploads/${path.basename(ncbiReferenceFile)}`
          );
          break;
        case "keyword":
          containerArgs.push(keyword ? keyword.toString() : "");
          break;
        case "identity":
          containerArgs.push(parseInt(identity));
          break;
        case "copyNumber":
          containerArgs.push(parseInt(copyNumber));
          break;
      }
    }

    // -- Docker
    const result = await this.dockerService.runContainer({
      workDir: this.backendRootDir,
      command: "python3",
      args: containerArgs,
      onStdout: (chunk) => {
        analysisLogger.info(`Docker: ${chunk.trim()}`);
        if (progressCallback) {
          const lines = chunk.split(/\r?\n/);
          lines.forEach((line) => {
            if (line.trim()) {
              progressCallback({
                type: "progress",
                message: line.trim(),
              });
            }
          });
        }
      },
      onStderr: (chunk) => {
        analysisLogger.error(`Docker ERROR: ${chunk.trim()}`);
        if (progressCallback) {
          progressCallback({
            type: "error",
            message: `Docker error: ${chunk.trim()}`,
          });
        }
      },
      onExit: (code, signal) => {
        if (processCallback) {
          processCallback(null); // clear process reference
        }
      },
    });

    return {
      stepName: step.name,
      script: step.script,
      status: "completed",
    };
  }
}
