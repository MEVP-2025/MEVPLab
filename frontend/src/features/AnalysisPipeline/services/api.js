// src/services/api.js
import axios from "axios";
import { getAnalysisApiUrl } from "../../../config/api.js";

// Use a getter so the URL is resolved after initApiConfig() completes
const getBaseUrl = () => getAnalysisApiUrl();

const apiClient = axios.create({
  timeout: 600000, // 10 minutes for large file uploads
});

// Dynamic baseURL interceptor — resolves the URL at request time
apiClient.interceptors.request.use((config) => {
  config.baseURL = getBaseUrl();
  return config;
});

// Simple API methods
export const api = {
  // Check docker environment
  docker: {
    checkEnvironment: () => apiClient.get("/docker/check"),

    /**
     * Open an SSE stream to pull the Docker image.
     * @param {Object} callbacks - { onProgress(msg), onDone(), onError(msg) }
     * @returns {EventSource} - call .close() to abort
     */
    pullImage: (callbacks = {}) => {
      const { onProgress, onDone, onError } = callbacks;
      const es = new EventSource(`${getBaseUrl()}/docker/pull`);

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "done") {
            es.close();
            if (onDone) onDone();
          } else if (data.type === "error") {
            es.close();
            if (onError) onError(data.message);
          } else if (data.type === "progress" || data.type === "start") {
            if (onProgress) onProgress(data.message);
          }
        } catch {
          // ignore parse errors
        }
      };

      es.onerror = () => {
        es.close();
        if (onError) onError("Connection to server lost");
      };

      return es;
    },
  },

  // File upload
  files: {
    uploadPaired: (formData, onUploadProgress) => {
      return apiClient.post("/files/upload/paired", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress,
      });
    },

    uploadSingle: (formData, onUploadProgress) => {
      return apiClient.post("/files/upload/single", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress,
      });
    },
  },

  // Analysis
  analysis: {
    pipeline: {
      // 物種檢測
      detectSpecies: (params) =>
        apiClient.post("/analysis/pipeline/detect-species", params),

      // Start analysis
      start: (params) => apiClient.post("/analysis/pipeline/start", params),

      // Get analysis status
      getStatus: () => apiClient.get("/analysis/pipeline/status"),

      // Get analysis results
      getResults: () => apiClient.get("/analysis/pipeline/results"),

      // Check current analysis
      getCurrent: () => apiClient.get("/analysis/current"),

      // 清除當前分析
      clear: () => apiClient.delete("/analysis/clear"),

      stop: () => apiClient.post("/analysis/pipeline/stop"),

      // Docker environment check
      // checkDooker: () => apiClient.get("/analysis/docker/check"),

      // SSE listen
      watchProgress: (callbacks) => {
        const eventSource = new EventSource(
          `${getBaseUrl()}/analysis/pipeline/progress`
        );

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("SSE message received:", data);

            // 根據訊息類型呼叫對應的回調
            switch (data.type) {
              case "start":
                callbacks.onStart?.(data);
                break;
              case "step_start":
                callbacks.onStepStart?.(data);
                break;
              case "step_complete":
                callbacks.onStepComplete?.(data);
                break;
              case "progress":
                callbacks.onProgress?.(data);
                break;
              case "complete":
                callbacks.onComplete?.(data);
                eventSource.close();
                break;
              case "error":
                callbacks.onError?.(data);
                eventSource.close();
                break;
              default:
                callbacks.onMessage?.(data);
            }
          } catch (error) {
            console.error("Failed to parse SSE data: ", error);
            callbacks.onSSEError?.({
              message: "Data format error",
              error: error.message,
            });
          }
        };

        eventSource.onerror = (error) => {
          console.error("SSE connection error: ", error);
          callbacks.onSSEError?.({
            message: "Connection lost, reconnecting...",
            error: "Connection lost",
          });
        };

        eventSource.onopen = () => {
          console.log("SSE connection established");
          callbacks.onConnect?.();
        };

        // 返回EventSource實例，讓呼叫者可以手動關閉
        return eventSource;
      },

      // 便利方法：取得 SSE URL (用於除錯)
      getSSEUrl: () => `${getBaseUrl()}/analysis/pipeline/progress`,
    },
  },

  // Outputs
  outputs: {
    list: () => apiClient.get("outputs/list"),

    previewFile: (category, species, fileName) => {
      return apiClient.post(
        `outputs/preview/${category}/${species}/${fileName}`
      );
    },

    getDownloadUrl: (category, species, fileName) => {
      return `${getBaseUrl()}/outputs/download/${category}/${species}/${fileName}`;
    },

    getDownloadAllSpeciesUrl: (species) => {
      return `${getBaseUrl()}/outputs/download-species/${species}`;
    },

    getDownloadAllFilesUrl: (project) => {
      return `${getBaseUrl()}/outputs/download-all-files?project=${
        project || ""
      }`;
    },
  },
};

export default api;
