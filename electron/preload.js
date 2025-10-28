// import { contextBridge, ipcRenderer } from "electron";
const { contextBridge, ipcRenderer } = require("electron");

// 暴露安全的 API 給前端使用
contextBridge.exposeInMainWorld("electronAPI", {
  reinitializeBackend: () => ipcRenderer.invoke("reinitialize-backend"),

  // 環境資訊
  isElectron: true,
  platform: process.platform,

  // 版本資訊
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
});

// 錯誤處理
window.addEventListener("DOMContentLoaded", () => {
  console.log("Electron preload script loaded");
  console.log("Platform:", process.platform);
  console.log("Electron version:", process.versions.electron);
});
