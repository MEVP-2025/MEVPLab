// utils/treeOps.js
// High-level tree structural operations (reroot, graft, prune).
// These operate on live phylotree instances and may produce new Newick strings.
import { phylotree } from "phylotree";
import { convertToNewick } from "./newickUtils.js";

/**
 * Find a node in the tree by its unique_id (depth-first).
 * @param {Object}        rootNode
 * @param {string|number} nodeId
 * @returns {Object|null}
 */
export const findNodeById = (rootNode, nodeId) => {
  if (!rootNode) return null;
  if (rootNode.unique_id === nodeId) return rootNode;

  if (rootNode.children) {
    for (const child of rootNode.children) {
      const found = findNodeById(child, nodeId);
      if (found) return found;
    }
  }
  return null;
};

/**
 * Phylogenetic reroot: insert a new root on the edge leading to the target node.
 * Reverses parent-child relationships along the path from the old root to the
 * new root position, preserving all pairwise distances and tree topology.
 *
 * @param {Object}        treeInstance   - live phylotree instance
 * @param {string}        originalNewick
 * @param {string|number} nodeId         - node whose incoming edge becomes the new root
 * @returns {Object} - { success, newNewick, message }
 */
export const rerootTree = (
  treeInstance,
  originalNewick,
  nodeId,
  topLevelMergedIds = []
) => {
  if (!nodeId || !treeInstance)
    throw new Error("Missing required information: nodeId or treeInstance");

  try {
    // ── 1. Locate target in live tree & record path as child-indices ──
    const liveTarget = findNodeById(treeInstance.nodes, nodeId);
    if (!liveTarget) throw new Error("Target node not found");
    if (!liveTarget.parent) {
      return {
        success: false,
        newNewick: originalNewick,
        message: "Cannot reroot at the root node",
      };
    }

    const pathIndices = [];
    let cur = liveTarget;
    while (cur.parent) {
      const idx = cur.parent.children.indexOf(cur);
      pathIndices.unshift(idx);
      cur = cur.parent;
    }
    // pathIndices 記錄了該如何從舊的樹走到要reroot的節點

    // ── 2. Parse a fresh copy & follow the same path ──
    const freshTree = new phylotree(originalNewick);
    let targetNode = freshTree.nodes;
    for (const idx of pathIndices) {
      if (!targetNode.children || idx >= targetNode.children.length) {
        throw new Error("Path mismatch: target node not found in new tree");
      }
      targetNode = targetNode.children[idx];
    }

    // Copy unique_ids from live tree into fresh tree so that Step 9's idMap
    // can map old IDs → new IDs after re-serialisation.
    const copyIds = (liveNode, freshNode) => {
      freshNode.unique_id = liveNode.unique_id;
      const liveChildren = liveNode.children || [];
      const freshChildren = freshNode.children || [];
      for (let i = 0; i < liveChildren.length; i++) {
        copyIds(liveChildren[i], freshChildren[i]);
      }
    };
    copyIds(treeInstance.nodes, freshTree.nodes);

    // ── 3. Build path from target → root ──
    const path = []; // [target, parent, grandparent, …, root]
    cur = targetNode;
    while (cur) {
      path.push(cur);
      cur = cur.parent;
    }

    // Save original branch-lengths before any mutation
    const originalBLs = path.map((n) => n.data.attribute);

    // Edge to split
    const edgeBL = parseFloat(targetNode.data.attribute || "0");
    /* 原本：
        parent ──── 0.4 ──── target
    
    變成：
            newRoot
          /        \
        0.2        0.2
        /            \
    parent          target
    */
    const halfBL = edgeBL / 2;

    // ── 4. Remove target from its parent's children ──
    const parent = path[1];
    const removeIdx = parent.children.indexOf(targetNode);
    if (removeIdx > -1) parent.children.splice(removeIdx, 1);
    targetNode.parent = null;
    // 此時 target 是一個孤立的子樹，parent 那邊少了一個 child。

    // ── 5. Reverse edges along path[1] → path[n-1] ──
    // path 是 target → root
    // path[0] 是 targetNode，path[path.length-1] 是舊 root。兩者不動，反轉中間的 parent-child 關係。
    /*
      以 path = [C, B, Root] 為例：
      迴圈 i=1：child=B, par=Root
        → Root.children 移除 B
        → B.children.push(Root)    ← Root 變成 B 的 child
        → Root.parent = B
        → Root.data.attribute = originalBLs[1]  ← B 原本的邊長轉移到 Root 身上
    */
    for (let i = 1; i < path.length - 1; i++) {
      const child = path[i];
      const par = path[i + 1];

      // Detach child from par
      const pIdx = par.children.indexOf(child);
      if (pIdx > -1) par.children.splice(pIdx, 1);

      // Reverse: par becomes a child of child
      child.children = child.children || [];
      child.children.push(par);
      par.parent = child;

      // The edge between them keeps its length; it is now stored on par (the new child)
      par.data.attribute = originalBLs[i];
    }

    // ── 6. Create new root ──
    const newRoot = {
      data: { name: "", attribute: "" },
      children: [targetNode, parent],
      parent: null,
    };
    targetNode.parent = newRoot;
    targetNode.data.attribute = String(halfBL);
    parent.parent = newRoot;
    parent.data.attribute = String(halfBL);

    // ── 7. Collapse old root if it became a single-child node ──
    const oldRoot = path[path.length - 1];
    if (oldRoot.children && oldRoot.children.length === 1) {
      const remaining = oldRoot.children[0];
      const oldRootParent = oldRoot.parent;
      /*
        Step 5 反轉後的結構（oldRoot 還在）：
            newRoot
          /        \
          C         B
                  /  \
                  D   Root  ← 多餘，只有一個 child A
                      |
                      A
      */
      if (oldRootParent) {
        const sumBL =
          parseFloat(oldRoot.data.attribute || "0") +
          parseFloat(remaining.data.attribute || "0");
        remaining.data.attribute = String(sumBL);

        const rIdx = oldRootParent.children.indexOf(oldRoot);
        if (rIdx > -1) {
          oldRootParent.children[rIdx] = remaining;
          remaining.parent = oldRootParent;
        }
      }
    }

    // DEBUG: print both trees' id structure before serialising
    // const printTree = (node, indent = "") => {
    //   if (!node) return;
    //   console.log(
    //     `${indent}id=${node.unique_id ?? "none"} name="${
    //       node.data?.name ?? ""
    //     }" bl=${node.data?.attribute ?? ""}`
    //   );
    //   (node.children || []).forEach((c) => printTree(c, indent + "  "));
    // };
    // console.group("── treeInstance (original, old IDs) ──");
    // printTree(treeInstance.nodes);
    // console.groupEnd();
    // console.group("── newRoot (rerooted, carrying old IDs) ──");
    // printTree(newRoot);
    // console.groupEnd();

    // ── 8. Build mergedPathMap: for each top-level merged node, record the
    // child-index path from newRoot to that node. After useTreeLayout assigns
    // new ids to the rerooted tree, TreeViewer walks the same path to find the
    // new unique_id without relying on the broken parsedNew idMap approach.
    const mergedPathMap = {};
    for (const oldId of topLevelMergedIds) {
      const mergedNode = findNodeById(newRoot, oldId);
      if (!mergedNode) continue;
      const indices = [];
      let cur = mergedNode;
      while (cur.parent) {
        const idx = cur.parent.children.indexOf(cur);
        indices.unshift(idx);
        cur = cur.parent;
      }
      mergedPathMap[oldId] = indices;
    }

    console.log("rerootTree: mergedPathMap", mergedPathMap);

    // ── 9. Serialise ──
    const newNewick = convertToNewick(newRoot, new Set(), new Map());

    return {
      success: true,
      newNewick,
      mergedPathMap,
      message: "reroot successful",
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      newNewick: originalNewick,
      message: `reroot failed: ${error.message}`,
    };
  }
};

/**
 * Replace a leaf node in `tree` with a parsed subtree (in-place, then re-serialise).
 * @param {Object}        tree        - live phylotree instance
 * @param {string|number} leafNodeId
 * @param {string}        newNewick   - Newick of the replacement subtree
 * @returns {string|null}             - updated full Newick, or null on failure
 */
export const replaceNodeWithSubtree = (tree, leafNodeId, newNewick) => {
  let targetNode = null;
  tree.traverse_and_compute((node) => {
    if (node.unique_id === leafNodeId) {
      targetNode = node;
      return false;
    }
    return true;
  });

  if (!targetNode) {
    console.error("target node not found");
    return null;
  }

  const parentNode = targetNode.parent;
  if (!parentNode) {
    console.error("target node has no parent, cannot replace");
    return null;
  }

  const indexInParent = parentNode.children.findIndex(
    (child) => child.unique_id === targetNode.unique_id
  );
  if (indexInParent === -1) {
    console.error("target node not found in parent's children list");
    return null;
  }

  const subtreeRoot = new phylotree(newNewick).nodes;
  subtreeRoot.parent = parentNode;
  subtreeRoot.data.attribute = targetNode.data.attribute;

  // Fix: phylotree auto-assigns "root" as the default name for the parsed root node.
  // Extract the actual root name from the Newick string to avoid introducing a stray "root" label.
  const lastParen = newNewick.lastIndexOf(")");
  if (lastParen !== -1) {
    const afterParen = newNewick.substring(lastParen + 1);
    const nameMatch = afterParen.match(/^([^:;]*)/);
    subtreeRoot.data.name = nameMatch ? nameMatch[1] : "";
  }

  parentNode.children[indexInParent] = subtreeRoot;

  return convertToNewick(tree.nodes, new Set(), new Map());
};
