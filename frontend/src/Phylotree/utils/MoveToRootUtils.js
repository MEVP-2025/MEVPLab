// utils/MoveToRootUtils.js
import { phylotree } from "phylotree";
import { TreeUtils } from "./TreeUtils.js";

/**
 * 專門處理子樹操作的工具類
 * 包含移動子樹、重新定位等高級樹操作功能
 */
export class MoveToRootUtils {
  /**
   * 根據 ID 查找節點
   * @param {Object} rootNode - 根節點
   * @param {string|number} nodeId - 節點 ID
   * @returns {Object|null} 找到的節點或 null
   */
  static findNodeById(rootNode, nodeId) {
    if (!rootNode) return null;

    if (rootNode.unique_id === nodeId) return rootNode;

    if (rootNode.children) {
      for (const child of rootNode.children) {
        const found = MoveToRootUtils.findNodeById(child, nodeId);
        if (found) return found;
      }
    }

    return null;
  }

  /**
   * 判斷兩個節點是否匹配
   * @param {Object} node1 - 第一個節點
   * @param {Object} node2 - 第二個節點
   * @returns {boolean} 是否匹配
   */
  static nodesMatch(node1, node2) {
    const name1 = node1.data.name || "";
    const name2 = node2.data.name || "";

    // 如果有名稱，優先使用名稱匹配
    if (name1 && name2) {
      return name1 === name2;
    }

    // 比較分支長度
    const attr1 = node1.data.attribute || "0";
    const attr2 = node2.data.attribute || "0";

    if (attr1 && attr2) {
      const diff = Math.abs(parseFloat(attr1) - parseFloat(attr2));
      if (diff < 0.000001) {
        // 浮點數比較容差
        return true;
      }
    }

    // 如果沒有名稱，比較位置信息（需要一定的容差）
    const x1 = node1.data.abstract_x || 0;
    const x2 = node2.data.abstract_x || 0;
    const y1 = node1.data.abstract_y || 0;
    const y2 = node2.data.abstract_y || 0;

    const tolerance = 0.001;
    return Math.abs(x1 - x2) < tolerance && Math.abs(y1 - y2) < tolerance;
  }

  /**
   * 從 Newick 字符串中移除指定子樹
   * @param {string} originalNewick - 原始 Newick 字符串
   * @param {Object} targetNode - 要移除的目標節點
   * @returns {string} 移除子樹後的 Newick 字符串
   */
  static removeSubtreeFromNewick(originalNewick, targetNode) {
    const tree = new phylotree(originalNewick);

    // 簡化的節點位置計算，不使用完整的 placenodes
    let uniqueId = 0;
    const assignIds = (node) => {
      if (!node.children || node.children.length === 0) {
        node.unique_id = ++uniqueId;
      }

      if (node.children) {
        node.children.forEach(assignIds);
      }
    };

    assignIds(tree.nodes);

    // 找到要移除的節點
    let nodeToRemove = null;
    tree.traverse_and_compute((node) => {
      // 通過名稱和分支長度來匹配節點
      if (MoveToRootUtils.nodesMatch(node, targetNode)) {
        nodeToRemove = node;
        return false;
      }
      return true;
    });

    if (!nodeToRemove) {
      throw new Error("在原始樹中找不到要移除的節點");
    }

    // 從父節點的子節點列表中移除該節點
    if (nodeToRemove.parent && nodeToRemove.parent.children) {
      const siblings = nodeToRemove.parent.children;
      const index = siblings.indexOf(nodeToRemove);
      if (index > -1) {
        siblings.splice(index, 1);
      }

      // 如果父節點只剩下一個子節點，需要特殊處理
      if (siblings.length === 1) {
        const remainingChild = siblings[0];
        const grandParent = nodeToRemove.parent.parent;

        if (grandParent) {
          // 將剩餘的子節點提升到祖父節點的子節點位置
          const parentIndex = grandParent.children.indexOf(nodeToRemove.parent);
          if (parentIndex > -1) {
            // 合併分支長度
            if (
              remainingChild.data.attribute &&
              nodeToRemove.parent.data.attribute
            ) {
              remainingChild.data.attribute = (
                parseFloat(remainingChild.data.attribute) +
                parseFloat(nodeToRemove.parent.data.attribute)
              ).toString();
            }

            remainingChild.parent = grandParent;
            grandParent.children[parentIndex] = remainingChild;
          }
        } else {
          // 如果父節點是根節點，剩餘子節點成為新的根節點
          tree.nodes = remainingChild;
          remainingChild.parent = null;
        }
      } else if (siblings.length === 0) {
        // 如果移除後沒有兄弟節點，需要移除父節點
        const parent = nodeToRemove.parent;
        if (parent.parent) {
          const grandParent = parent.parent;
          const parentIndex = grandParent.children.indexOf(parent);
          if (parentIndex > -1) {
            grandParent.children.splice(parentIndex, 1);
          }
        }
      }
    }

    // 轉換回 Newick 格式
    return TreeUtils.convertToNewick(tree.nodes, new Set(), new Map());
  }

  /**
   * 將子樹移動到根節點級別
   * @param {string} modifiedNewick - 移除子樹後的 Newick 字符串
   * @param {string} subtreeNewick - 子樹的 Newick 字符串
   * @returns {string} 移動後的 Newick 字符串
   */
  static moveSubtreeToRoot(modifiedNewick, subtreeNewick) {
    // 移除原 Newick 的最後一個分號
    const cleanModifiedNewick = modifiedNewick.replace(/;$/, "");
    // 移除子樹 Newick 的最後一個分號
    const cleanSubtreeNewick = subtreeNewick.replace(/;$/, "");

    // 將子樹添加到根節點的兄弟位置
    // 格式: (子樹, 原始樹);
    return `(${cleanSubtreeNewick},${cleanModifiedNewick});`;
  }

  /**
   * 處理移動子樹到根節點的完整操作
   * @param {Object} treeInstance - 樹實例
   * @param {string} originalNewick - 原始 Newick 字符串
   * @param {string|number} nodeId - 要移動的節點 ID
   * @returns {Object} 包含操作結果的對象
   */
  static moveToRoot(treeInstance, originalNewick, nodeId) {
    if (!nodeId || !treeInstance) {
      return {
        success: false,
        error: "缺少必要信息：nodeId 或 treeInstance",
        newNewick: originalNewick,
        message: "操作失敗：缺少必要信息",
      };
    }

    try {
      // 找到要移動的節點
      const targetNode = MoveToRootUtils.findNodeById(
        treeInstance.nodes,
        nodeId
      );
      if (!targetNode) {
        return {
          success: false,
          error: "找不到目標節點",
          newNewick: originalNewick,
          message: "操作失敗：找不到目標節點",
        };
      }

      // 獲取目標子樹的 Newick 字符串
      const subtreeNewick = TreeUtils.convertToNewick(
        targetNode,
        new Set(),
        new Map()
      );

      // 從原位置移除該子樹後的 Newick
      const modifiedNewick = MoveToRootUtils.removeSubtreeFromNewick(
        originalNewick,
        targetNode
      );

      // 將子樹移動到根節點級別
      const newNewick = MoveToRootUtils.moveSubtreeToRoot(
        modifiedNewick,
        subtreeNewick
      );

      return {
        success: true,
        newNewick,
        subtreeNewick,
        modifiedNewick,
        targetNode,
        message: "成功移動子樹到根節點級別",
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        newNewick: originalNewick,
        message: `移動子樹時出錯: ${error.message}`,
      };
    }
  }
}
