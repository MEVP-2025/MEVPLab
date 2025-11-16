// utils/TreeUtils.js
import { phylotree } from "phylotree";

export class TreeUtils {
  /**
   * 將樹轉換為 Newick 格式
   * @param {Object} node - 樹節點
   * @param {Set} collapsedNodes - 折疊節點集合
   * @param {Map} renamedNodes - 重命名節點映射
   * @param {number} depth - 當前深度
   * @returns {string} Newick 字符串
   */
  static convertToNewick(node, collapsedNodes, renamedNodes, depth = 0) {
    if (node.unique_id && collapsedNodes.has(node.unique_id)) {
      if (renamedNodes.has(node.unique_id)) {
        const newName = renamedNodes.get(node.unique_id);
        const branchLength = node.data.attribute
          ? `:${node.data.attribute}`
          : "";
        const needQuotes = /[,;:()[\]]/g.test(newName);
        return needQuotes
          ? `'${newName}'${branchLength}`
          : `${newName}${branchLength}`;
      }
    }

    if (!node.children || node.children.length === 0) {
      const name = node.data.name || "";
      const branchLength = node.data.attribute ? `:${node.data.attribute}` : "";
      const needQuotes = /[,;:()[\]]/g.test(name);
      return needQuotes ? `'${name}'${branchLength}` : `${name}${branchLength}`;
    }

    const childrenNewick = node.children
      .map((child) =>
        TreeUtils.convertToNewick(
          child,
          collapsedNodes,
          renamedNodes,
          depth + 1
        )
      )
      .join(",");

    const name = node.data.name || "";
    const branchLength = node.data.attribute ? `:${node.data.attribute}` : "";

    if (depth === 0) {
      return `(${childrenNewick})${name}${branchLength};`;
    }

    return `(${childrenNewick})${name}${branchLength}`;
  }

  /**
   * 根據 ID 找到節點
   * @param {Object} rootNode - 根節點
   * @param {string|number} nodeId - 節點 ID
   * @returns {Object|null} 找到的節點或 null
   */
  static findNodeById(rootNode, nodeId) {
    if (!rootNode) return null;

    if (rootNode.unique_id === nodeId) return rootNode;

    if (rootNode.children) {
      for (const child of rootNode.children) {
        const found = TreeUtils.findNodeById(child, nodeId);
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

    if (name1 && name2) {
      return name1 === name2;
    }

    const attr1 = node1.data.attribute || "0";
    const attr2 = node2.data.attribute || "0";

    if (attr1 && attr2) {
      const diff = Math.abs(parseFloat(attr1) - parseFloat(attr2));
      if (diff < 0.000001) {
        return true;
      }
    }

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

    // 簡化的節點位置計算
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
      if (TreeUtils.nodesMatch(node, targetNode)) {
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

    return TreeUtils.convertToNewick(tree.nodes, new Set(), new Map());
  }

  /**
   * 將子樹移動到根節點級別
   * @param {string} modifiedNewick - 移除子樹後的 Newick 字符串
   * @param {string} subtreeNewick - 子樹的 Newick 字符串
   * @returns {string} 移動後的 Newick 字符串
   */
  static moveSubtreeToRoot(modifiedNewick, subtreeNewick) {
    const cleanModifiedNewick = modifiedNewick.replace(/;$/, "");
    const cleanSubtreeNewick = subtreeNewick.replace(/;$/, "");

    return `(${cleanSubtreeNewick},${cleanModifiedNewick});`;
  }

  /**
   * 處理移動到根節點的完整操作
   * @param {Object} treeInstance - 樹實例
   * @param {string} originalNewick - 原始 Newick 字符串
   * @param {string|number} nodeId - 要移動的節點 ID
   * @returns {Object} 包含新 Newick 字符串和操作結果的對象
   */
  static handleMoveToRoot(treeInstance, originalNewick, nodeId) {
    if (!nodeId || !treeInstance) {
      throw new Error("缺少必要信息：nodeId 或 treeInstance");
    }

    try {
      // 找到要移動的節點
      const targetNode = TreeUtils.findNodeById(treeInstance.nodes, nodeId);
      if (!targetNode) {
        throw new Error("找不到目標節點");
      }

      // 獲取目標子樹的 Newick 字符串
      const subtreeNewick = TreeUtils.convertToNewick(
        targetNode,
        new Set(),
        new Map()
      );

      // 從原位置移除該子樹後的 Newick
      const modifiedNewick = TreeUtils.removeSubtreeFromNewick(
        originalNewick,
        targetNode
      );

      // 將子樹移動到根節點級別
      const newNewick = TreeUtils.moveSubtreeToRoot(
        modifiedNewick,
        subtreeNewick
      );

      return {
        success: true,
        newNewick,
        subtreeNewick,
        modifiedNewick,
        message: "成功移動子樹到根節點級別",
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        newNewick: originalNewick, // 返回原始 Newick
        message: `移動子樹時出錯: ${error.message}`,
      };
    }
  }

  /**
   * 替換節點為子樹
   * @param {Object} tree - 樹實例
   * @param {string|number} leafNodeId - 要替換的葉節點 ID
   * @param {string} newNewick - 新的 Newick 字符串
   * @returns {string|null} 更新後的 Newick 字符串或 null
   */
  static replaceNodeWithSubtree(tree, leafNodeId, newNewick) {
    // 找到要替換的葉節點
    let targetNode = null;
    tree.traverse_and_compute((node) => {
      if (node.unique_id === leafNodeId) {
        targetNode = node;
        return false;
      }
      return true;
    });

    if (!targetNode) {
      console.error("找不到目標節點");
      return null;
    }

    // 解析新的 Newick 字符串成樹結構
    const subtree = new phylotree(newNewick);

    // 找到要替換的節點在父節點的子節點列表中的位置
    const parentNode = targetNode.parent;
    if (!parentNode) {
      console.error("目標節點沒有父節點，無法替換");
      return null;
    }

    const indexInParent = parentNode.children.findIndex(
      (child) => child.unique_id === targetNode.unique_id
    );

    if (indexInParent === -1) {
      console.error("無法在父節點的子節點列表中找到目標節點");
      return null;
    }

    // 替換父節點的子節點列表中的目標節點
    const subtreeRoot = subtree.nodes;
    subtreeRoot.parent = parentNode;
    subtreeRoot.data.attribute = targetNode.data.attribute;
    parentNode.children[indexInParent] = subtreeRoot;

    // 轉換回完整的 Newick 字符串
    return TreeUtils.convertToNewick(tree.nodes, new Set(), new Map());
  }
}
