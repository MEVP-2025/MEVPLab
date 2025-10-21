/**
 * 收集樹中的所有內部節點
 *
 * @param {Object} tree - 系統發生樹對象
 * @returns {Map} - 包含所有內部節點的Map
 */
// 修改後的函數，收集所有節點
export function collectInternalNodes(tree) {
  const allNodes = new Map();

  // 遍歷樹中的所有連接
  tree.links.forEach((link) => {
    // 處理源節點（通常是內部節點）
    const source = link.source;
    if (!allNodes.has(source.unique_id)) {
      allNodes.set(source.unique_id, {
        x: source.data.abstract_x,
        y: source.data.abstract_y,
        node: source,
        isLeaf: source.children.length === 0,
      });
    }

    // 處理目標節點（可能是葉節點或內部節點）
    const target = link.target;
    if (!allNodes.has(target.unique_id)) {
      allNodes.set(target.unique_id, {
        x: target.data.abstract_x,
        y: target.data.abstract_y,
        node: target,
        isLeaf: !target.children || target.children.length === 0,
      });
    }
  });

  return allNodes;
}

/**
 * 計算被隱藏的分支
 *
 * @param {Object} tree - 系統發生樹對象
 * @param {Set} collapsedNodes - 折疊節點集合
 * @returns {Set} - 被隱藏的分支集合
 */
export function getHiddenBranches(tree, collapsedNodes) {
  if (!collapsedNodes || collapsedNodes.size === 0) {
    return new Set();
  }

  const hiddenNodes = new Set();

  function traverse(node, isParentCollapsed = false) {
    if (isParentCollapsed) {
      if (node.children) {
        node.children.forEach((child) => {
          hiddenNodes.add(child.unique_id);
          traverse(child, true);
        });
      }
    } else if (collapsedNodes && collapsedNodes.has(node.unique_id)) {
      if (node.children) {
        node.children.forEach((child) => {
          hiddenNodes.add(child.unique_id);
          traverse(child, true);
        });
      }
    } else if (node.children) {
      node.children.forEach((child) => traverse(child, false));
    }
  }

  traverse(tree.nodes);
  return hiddenNodes;
}

/**
 * 檢查一個內部節點是否應該被隱藏
 *
 * @param {string} nodeId - 節點ID
 * @param {Object} nodeInfo - 節點信息
 * @param {Set} collapsedNodes - 折疊節點集合
 * @returns {boolean} - 是否應該隱藏
 */
export function shouldHideInternalNode(nodeId, nodeInfo, collapsedNodes) {
  // 首先检查是否有折叠的父节点
  if (!collapsedNodes || collapsedNodes.size === 0) {
    return false;
  }

  let currentNode = nodeInfo.node;
  while (currentNode.parent) {
    if (collapsedNodes && collapsedNodes.has(currentNode.parent.unique_id)) {
      return true;
    }
    currentNode = currentNode.parent;
  }

  //如果启用了隐藏非叶子节点的选项，且当前节点不是叶子节点，则隐藏
  if (!nodeInfo.node.children) {
    return true;
  }

  return false;
}
/**
 * 按指定閾值折疊樹的分支
 *
 * @param {Object} tree - 系統發生樹對象
 * @param {number} threshold - 分支長度閾值
 * @param {function} accessor - 獲取分支長度的函數
 * @returns {Set} - 應被折疊的節點集合
 */
export function collapseTreeByThreshold(tree, threshold, accessor) {
  const nodesToCollapse = new Set();

  function traverse(node) {
    if (!node.parent) return;

    const branchLength = accessor(node);

    if (branchLength <= threshold) {
      nodesToCollapse.add(node.unique_id);
    }

    if (node.children) {
      node.children.forEach(traverse);
    }
  }

  // 從根節點開始遍歷
  if (tree.nodes.children) {
    tree.nodes.children.forEach(traverse);
  }

  return nodesToCollapse;
}
