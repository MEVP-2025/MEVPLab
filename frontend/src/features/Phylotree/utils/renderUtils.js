// utils/renderUtils.js
// Helpers for tree rendering: visibility filtering and node collection.
// These are consumed exclusively by Phylotree.jsx and related render components.

/**
 * Traverse the tree and collect ALL nodes into a Map.
 * Also copies abstract_x / abstract_y onto node.x / node.y for convenient access.
 * @param {Object} tree - root node of the processed tree
 * @returns {Map}
 */
export const collectInternalNodes = (tree) => {
  const map = new Map();
  if (!tree) return map;

  const traverse = (node) => {
    if (node.unique_id) {
      node.x = node.data.abstract_x;
      node.y = node.data.abstract_y;
      map.set(node.unique_id, node);
    }
    node.children?.forEach(traverse);
  };

  traverse(tree);
  return map;
};

/**
 * Return a Set of node IDs whose branches should be hidden.
 * A branch is hidden when its target is a descendant of a collapsed node.
 * @param {Object} tree
 * @param {Set} collapsedNodes
 * @returns {Set}
 */
export const getHiddenBranches = (tree, collapsedNodes) => {
  const hidden = new Set();
  if (!tree) return hidden;

  const traverse = (node, isHidden) => {
    if (isHidden) hidden.add(node.unique_id);
    const nextHidden = isHidden || collapsedNodes.has(node.unique_id);
    node.children?.forEach((child) => traverse(child, nextHidden));
  };

  traverse(tree, false);
  return hidden;
};

/**
 * Return true if any ancestor of `node` is in `collapsedNodes`.
 * Used to suppress rendering of internal nodes that are inside a collapsed subtree.
 * @param {string} nodeId - unused, kept for call-site symmetry
 * @param {Object} node
 * @param {Set}    collapsedNodes
 * @returns {boolean}
 */
export const shouldHideInternalNode = (nodeId, node, collapsedNodes) => {
  let current = node.parent;
  while (current) {
    if (collapsedNodes.has(current.unique_id)) return true;
    current = current.parent;
  }
  return false;
};
