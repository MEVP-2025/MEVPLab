// services/ExportService.js
import { FileUtils } from "../utils/FileUtils.js";
import { TreeUtils } from "../utils/TreeUtils.js";

/**
 * 樹狀圖匯出服務
 * 提供統一的匯出接口和錯誤處理
 */
export class ExportService {
  /**
   * 匯出 Newick 格式文件
   * @param {Object} options - 匯出配置
   * @param {Object} options.treeInstance - 樹實例
   * @param {Set} options.collapsedNodes - 折疊節點
   * @param {Map} options.renamedNodes - 重命名節點
   * @param {string} options.filename - 文件名
   * @returns {Promise<void>}
   */
  static async exportNewick({
    treeInstance,
    collapsedNodes,
    renamedNodes,
    filename = "exported_tree.nwk",
  }) {
    // 驗證輸入
    if (!treeInstance) {
      throw new Error("沒有可用的樹數據進行匯出");
    }

    if (!treeInstance.nodes) {
      throw new Error("樹結構無效");
    }

    try {
      console.log("🚀 開始匯出 Newick 格式...");

      // 轉換樹為 Newick 格式
      const newickContent = TreeUtils.convertToNewick(
        treeInstance.nodes,
        collapsedNodes || new Set(),
        renamedNodes || new Map()
      );

      // 驗證生成的內容
      if (!newickContent || newickContent.trim() === "") {
        throw new Error("生成的 Newick 內容為空");
      }

      console.log(
        "📄 Newick 內容生成成功:",
        newickContent.substring(0, 100) + "..."
      );

      // 下載文件
      FileUtils.downloadTextFile(newickContent, filename);

      console.log("✅ Newick 文件匯出成功");

      return {
        success: true,
        message: "Newick 文件匯出成功",
        content: newickContent,
      };
    } catch (error) {
      console.error("❌ Newick 匯出失敗:", error);
      throw new Error(`Newick 匯出失敗: ${error.message}`);
    }
  }

  /**
   * 匯出樹狀圖為圖片
   * @param {Object} options - 匯出配置
   * @param {string} options.svgSelector - SVG 選擇器
   * @param {string} options.filename - 文件名
   * @param {number} options.scaleFactor - 縮放因子
   * @returns {Promise<void>}
   */
  static async exportImage({
    svgSelector = ".tree_container svg",
    filename = "phylotree.png",
    scaleFactor = 5,
  }) {
    try {
      console.log("🚀 開始匯出圖片...");

      // 檢查 SVG 是否存在
      const svgElement = document.querySelector(svgSelector);
      if (!svgElement) {
        throw new Error(`找不到 SVG 元素: ${svgSelector}`);
      }

      console.log("🎨 SVG 元素找到，開始轉換為圖片...");

      // 匯出圖片
      await FileUtils.exportSvgAsImage(svgSelector, filename, scaleFactor);

      console.log("✅ 圖片匯出成功");

      return {
        success: true,
        message: "圖片匯出成功",
        filename: filename,
      };
    } catch (error) {
      console.error("❌ 圖片匯出失敗:", error);
      throw new Error(`圖片匯出失敗: ${error.message}`);
    }
  }
}
