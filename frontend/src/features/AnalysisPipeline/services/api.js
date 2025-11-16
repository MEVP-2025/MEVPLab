// src/services/api.js
import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 600000, // 10 minutes for large file uploads
});

// Simple API methods
export const api = {
  // Check docker environment
  docker: {
    checkEnvironment: () => apiClient.get("/docker/check"),
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
      // 物種檢測 (新增)
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
          `${API_BASE_URL}/analysis/pipeline/progress`
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
      getSSEUrl: () => `${API_BASE_URL}/analysis/pipeline/progress`,
    },
  },

  // Outputs
  outputs: {
    list: () => apiClient.get("outputs/list"),

    getDownloadUrl: (category, species, fileName) => {
      return `${API_BASE_URL}/outputs/download/${category}/${species}/${fileName}`;
    },

    getDownloadAllSpeciesUrl: (species) => {
      return `${API_BASE_URL}/outputs/download-species/${species}`;
    },
  },
};

export default api;
