// Centralized API base URL configuration.
// In Electron production mode, ports are dynamically assigned and retrieved via IPC.
// In dev mode, falls back to default ports.

let _analysisBaseUrl =
  import.meta.env.VITE_API_URL || "http://localhost:3001/api";
let _vizBaseUrl =
  import.meta.env.VITE_VIZ_API_URL || "http://localhost:3000/api";
let _initialized = false;

/**
 * Initialize API URLs from Electron backend ports.
 * Call this once at app startup. Safe to call multiple times.
 */
export async function initApiConfig() {
  if (_initialized) return;

  if (window.electronAPI?.getBackendPorts) {
    try {
      const ports = await window.electronAPI.getBackendPorts();
      if (ports) {
        _analysisBaseUrl = `http://localhost:${ports.analysis}/api`;
        _vizBaseUrl = `http://localhost:${ports.viz}/api`;
        console.log(
          `API config initialized — Analysis: ${ports.analysis}, Viz: ${ports.viz}`
        );
      }
    } catch (err) {
      console.warn(
        "Failed to get backend ports from Electron, using defaults:",
        err
      );
    }
  }

  _initialized = true;
}

/**
 * Get the Analysis backend API base URL (backend-toolkit).
 * e.g. "http://localhost:3001/api"
 */
export function getAnalysisApiUrl() {
  return _analysisBaseUrl;
}

/**
 * Get the Viz backend API base URL (backend-viz).
 * e.g. "http://localhost:3000/api"
 */
export function getVizApiUrl() {
  return _vizBaseUrl;
}
