// utils/FileUtils.js
export class FileUtils {
  /**
   * 下載文本文件
   * @param {string} content - 文件內容
   * @param {string} filename - 文件名
   */
  static downloadTextFile(content, filename) {
    const element = document.createElement("a");
    const file = new Blob([content], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  /**
   * 將 SVG 轉換為圖片並下載
   * @param {string} svgSelector - SVG 選擇器
   * @param {string} filename - 文件名
   * @param {number} scaleFactor - 縮放因子
   */
  static async exportSvgAsImage(svgSelector, filename, scaleFactor = 5) {
    const svgElement = document.querySelector(svgSelector);
    if (!svgElement) {
      throw new Error("無法找到 SVG 元素");
    }

    return new Promise((resolve, reject) => {
      const svgClone = svgElement.cloneNode(true);

      // 設置白色背景
      const rect = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "rect"
      );
      rect.setAttribute("width", "100%");
      rect.setAttribute("height", "100%");
      rect.setAttribute("fill", "white");
      svgClone.insertBefore(rect, svgClone.firstChild);

      const svgData = new XMLSerializer().serializeToString(svgClone);
      const svgBlob = new Blob([svgData], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = svgElement.width.baseVal.value * scaleFactor;
          canvas.height = svgElement.height.baseVal.value * scaleFactor;

          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.scale(scaleFactor, scaleFactor);
          ctx.drawImage(img, 0, 0);

          const imgURL = canvas.toDataURL("image/png");
          const downloadLink = document.createElement("a");
          downloadLink.download = filename;
          downloadLink.href = imgURL;
          downloadLink.click();

          URL.revokeObjectURL(url);
          resolve();
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("無法從 SVG 創建圖像"));
      };

      img.src = url;
    });
  }
}
