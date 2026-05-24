// utils/newickUtils.js
// Newick format serialization & string-level tree manipulation
import { phylotree } from "phylotree";

/**
 * Format a node name for Newick output, quoting if necessary.
 * @param {string} name
 * @param {string} branchLength
 * @returns {string}
 */
const formatNewickToken = (name, branchLength) => {
  const needQuotes = /[,;:()[\]]/g.test(name);
  return needQuotes ? `'${name}'${branchLength}` : `${name}${branchLength}`;
};

/**
 * Convert a tree node (and its subtree) to a Newick string.
 * @param {Object} node
 * @param {Set}   collapsedNodes
 * @param {Map}   renamedNodes
 * @param {number} depth
 * @returns {string}
 */
export const convertToNewick = (
  node,
  collapsedNodes,
  renamedNodes,
  depth = 0
) => {
  if (node.unique_id && collapsedNodes.has(node.unique_id)) {
    if (renamedNodes.has(node.unique_id)) {
      const newName = renamedNodes.get(node.unique_id) || "";
      const branchLength = node.data.attribute ? `:${node.data.attribute}` : "";
      return formatNewickToken(newName, branchLength);
    }
  }

  if (!node.children || node.children.length === 0) {
    const name = node.data?.name || "";
    const branchLength = node.data?.attribute ? `:${node.data.attribute}` : "";
    return formatNewickToken(name, branchLength);
  }

  const childrenNewick = node.children
    .map((child) =>
      convertToNewick(child, collapsedNodes, renamedNodes, depth + 1)
    )
    .join(",");

  const name = node.data?.name || "";
  const branchLength = node.data?.attribute ? `:${node.data.attribute}` : "";
  const suffix = `${name}${branchLength}`;

  return depth === 0
    ? `(${childrenNewick})${suffix};`
    : `(${childrenNewick})${suffix}`;
};

/**
 * Get the Newick string for a subtree rooted at `node`
 * (no collapsed/renamed state — raw structure only).
 * @param {Object} node
 * @returns {string}
 */
export const getSubtreeNewick = (node) =>
  convertToNewick(node, new Set(), new Map());

/**
 * Heuristic equality check between two nodes (name → branch length → position).
 * Used internally when re-locating a node in a freshly-parsed tree.
 * @param {Object} node1
 * @param {Object} node2
 * @returns {boolean}
 */
export const nodesMatch = (node1, node2) => {
  const name1 = node1.data.name || "";
  const name2 = node2.data.name || "";
  if (name1 && name2) return name1 === name2;

  const attr1 = node1.data.attribute || "0";
  const attr2 = node2.data.attribute || "0";
  if (attr1 && attr2 && Math.abs(parseFloat(attr1) - parseFloat(attr2)) < 1e-6)
    return true;

  const tol = 0.001;
  return (
    Math.abs((node1.data.abstract_x || 0) - (node2.data.abstract_x || 0)) <
      tol &&
    Math.abs((node1.data.abstract_y || 0) - (node2.data.abstract_y || 0)) < tol
  );
};

/**
 * Remove a subtree from a Newick string.
 * Parses the Newick, locates the matching node, splices it out, then re-serialises.
 * @param {string} originalNewick
 * @param {Object} targetNode  - node to match against (from the live tree)
 * @returns {string}
 */
export const removeSubtreeFromNewick = (originalNewick, targetNode) => {
  const tree = new phylotree(originalNewick);

  let nodeToRemove = null;
  tree.traverse_and_compute((node) => {
    if (nodesMatch(node, targetNode)) {
      nodeToRemove = node;
      return false;
    }
    return true;
  });

  if (!nodeToRemove) throw new Error("在原始樹中找不到要移除的節點");

  if (nodeToRemove.parent && nodeToRemove.parent.children) {
    const siblings = nodeToRemove.parent.children;
    const index = siblings.indexOf(nodeToRemove);
    if (index > -1) siblings.splice(index, 1);

    if (siblings.length === 1) {
      const remainingChild = siblings[0];
      const grandParent = nodeToRemove.parent.parent;

      if (grandParent) {
        const parentIndex = grandParent.children.indexOf(nodeToRemove.parent);
        if (parentIndex > -1) {
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
        tree.nodes = remainingChild;
        remainingChild.parent = null;
      }
    } else if (siblings.length === 0) {
      const parent = nodeToRemove.parent;
      if (parent.parent) {
        const grandParent = parent.parent;
        const parentIndex = grandParent.children.indexOf(parent);
        if (parentIndex > -1) grandParent.children.splice(parentIndex, 1);
      }
    }
  }

  return convertToNewick(tree.nodes, new Set(), new Map());
};

/**
 * Graft a subtree Newick onto the root of a modified Newick.
 * @param {string} modifiedNewick
 * @param {string} subtreeNewick
 * @returns {string}
 */
export const moveSubtreeToRoot = (modifiedNewick, subtreeNewick) => {
  const base = modifiedNewick.replace(/;$/, "");
  const subtree = subtreeNewick.replace(/;$/, "");
  return `(${subtree},${base});`;
};
