import { max } from "d3-array";
import { useMemo } from "react";

// ------------------------------------------------------------------
// 1. 補回缺失的輔助函式與變數 (從原本的 phylotree.jsx 移植)
// ------------------------------------------------------------------

// Persistent storage for threshold ID mapping (保留全域變數以維持狀態)
let persistentThresholdIdMap = {};

const defaultAccessor = (node) => +node.data.attribute;

const calculateXWithBranchLengths = (node, accessor) => {
  if (!node.parent) return 0;
  const branchLength = accessor(node);
  return branchLength + node.parent.data.abstract_x;
};

const calculateXWithoutBranchLengths = (node) => {
  return node.parent ? node.parent.data.abstract_x + 1 : 0;
};

const sortNodes = (tree, direction) => {
  tree.traverse_and_compute((node) => {
    let depth = 1;
    if (node.children?.length) {
      depth += max(node.children, (child) => child.count_depth || 0);
    }
    node.count_depth = depth;
  });

  const isAscending = direction === "ascending";
  tree.resortChildren(
    (a, b) => (a.count_depth - b.count_depth) * (isAscending ? 1 : -1)
  );
};

const setNodeAsNonLeaf = (tree, node) => {
  if (tree.isLeafNode(node)) {
    node.children = [];
  }
};

const assignThresholdIds = (tree, mergedChildrenIds) => {
  const thresholdGroups = new Map();

  tree.traverse_and_compute((node) => {
    if (!tree.isLeafNode(node)) {
      const threshold = node.data.abstract_x;
      if (!thresholdGroups.has(threshold)) {
        thresholdGroups.set(threshold, []);
      }
      thresholdGroups.get(threshold).push(node);
    }
    return true;
  });

  // Collect all IDs that are already in use (across all thresholds) to avoid collisions
  const allUsedIds = new Set();

  for (const [threshold, nodes] of thresholdGroups.entries()) {
    nodes.sort((a, b) => a.data.abstract_y - b.data.abstract_y);
    // originalIds are the IDs that were previously assigned to nodes at this threshold (from the persistent map)
    const originalIds = tree.thresholdIdMap?.[threshold] || [];
    // availableIds are the IDs that are not currently taken by merged children at this threshold
    const availableIds = originalIds.filter((id) => !mergedChildrenIds.has(id));

    nodes.forEach((node, index) => {
      if (index < availableIds.length) {
        node.unique_id = String(availableIds[index]);
      } else {
        // Generate a new unique ID for overflow nodes (more nodes than pool IDs)
        let newIndex = index;
        let newId = `${threshold}|${newIndex}`;
        while (allUsedIds.has(newId) || mergedChildrenIds.has(newId)) {
          newIndex++;
          newId = `${threshold}|${newIndex}`;
        }
        node.unique_id = newId;
      }
      allUsedIds.add(node.unique_id);
    });
  }
  return thresholdGroups;
};

const findNodeById = (tree, id) => {
  let foundNode = null;
  tree.traverse_and_compute((node) => {
    if (node.unique_id === id) {
      foundNode = node;
      return false;
    }
    return true;
  });
  return foundNode;
};

const LayoutAlgorithms = {
  standard: (node, xCalculator, accessor, state) => {
    if (!node.children?.length) {
      state.uniqueId = node.unique_id = state.uniqueId + 1;
    }

    node.data.abstract_x = xCalculator(node, accessor);
    state.tree.max_x = Math.max(state.tree.max_x, node.data.abstract_x);

    if (node.children?.length) {
      node.data.abstract_y =
        node.children
          .map((child) =>
            LayoutAlgorithms.standard(child, xCalculator, accessor, state)
          )
          .reduce((sum, y) => sum + y, 0) / node.children.length;
    } else {
      state.currentLeafHeight = node.data.abstract_y =
        state.currentLeafHeight + 1;
    }

    return node.data.abstract_y;
  },

  // when show internal labels is true
  internal: (node, xCalculator, accessor, state) => {
    if (!node.children?.length) {
      state.uniqueId = node.unique_id = state.uniqueId + 1;
    }

    node.data.abstract_x = xCalculator(node, accessor);
    state.tree.max_x = Math.max(state.tree.max_x, node.data.abstract_x);

    if (!state.tree.isLeafNode(node)) {
      node.children?.forEach((child) =>
        LayoutAlgorithms.internal(child, xCalculator, accessor, state)
      );
    }

    if (node.data.abstract_y == null && node.data.name !== "root") {
      state.currentLeafHeight = node.data.abstract_y =
        state.currentLeafHeight + 1;
      state.tree.node_order.push(node.data.name);
    }

    if (
      node.parent &&
      node.parent.data.abstract_y == null &&
      node.data.name !== "root"
    ) {
      if (node.parent.data.name !== "root") {
        state.currentLeafHeight = node.parent.data.abstract_y =
          state.currentLeafHeight + 1;
        state.tree.node_order.push(node.parent.data.name);
      }
    }

    state.tree.max_y = Math.max(state.tree.max_y, state.currentLeafHeight);
  },
};

const ThresholdIdManager = {
  initialize: (tree, thresholdGroups) => {
    for (const [threshold, nodes] of thresholdGroups.entries()) {
      nodes.sort((a, b) => a.data.abstract_y - b.data.abstract_y);
      nodes.forEach((node, index) => {
        node.unique_id = `${threshold}|${index}`;
      });
    }

    const thresholdIdMap = {};
    tree.traverse_and_compute((node) => {
      if (!tree.isLeafNode(node) && typeof node.unique_id === "string") {
        const [threshold] = String(node.unique_id).split("|");
        if (!thresholdIdMap[threshold]) {
          thresholdIdMap[threshold] = [];
        }
        thresholdIdMap[threshold].push(node.unique_id);
      }
      return true;
    });

    persistentThresholdIdMap = thresholdIdMap;
  },

  handleMerged: (tree, mergedNodes) => {
    const mergedChildrenIds = new Set();
    const mergedIds = {};

    Object.entries(mergedNodes).forEach(([mergedId, mergedInfo]) => {
      mergedIds[mergedId] = {
        parent: mergedInfo.parent,
        siblingIndex: mergedInfo.siblingIndex,
      };

      if (mergedInfo.children) {
        mergedInfo.children.forEach((childId) => {
          mergedChildrenIds.add(childId);
        });
      }
    });

    assignThresholdIds(tree, mergedChildrenIds);

    const sortedMergedIds = Object.entries(mergedIds).sort((a, b) => {
      const getThreshold = (id) => parseFloat(id.split("|")[0]);
      const getYValue = (id) => parseInt(id.split("|")[1], 10);
      const thresholdDiff = getThreshold(a[0]) - getThreshold(b[0]);
      return thresholdDiff !== 0
        ? thresholdDiff
        : getYValue(a[0]) - getYValue(b[0]);
    });

    // Step 2: Convert all merged leaf nodes back to pseudo-internal
    sortedMergedIds.forEach(([mergedId, mergedInfo]) => {
      const parentNode = findNodeById(tree, mergedInfo.parent);
      if (parentNode?.children) {
        const nodeToModify = parentNode.children[mergedInfo.siblingIndex];
        if (nodeToModify) {
          setNodeAsNonLeaf(tree, nodeToModify);
        }
      }
    });

    // Step 3: Final ID assignment with all nodes properly categorized
    assignThresholdIds(tree, mergedChildrenIds);

    // Step 4: Sync persistentThresholdIdMap so subsequent renders have the full pool
    const updatedMap = {};
    tree.traverse_and_compute((node) => {
      if (!tree.isLeafNode(node) && typeof node.unique_id === "string") {
        const [threshold] = String(node.unique_id).split("|");
        if (!updatedMap[threshold]) {
          updatedMap[threshold] = [];
        }
        updatedMap[threshold].push(node.unique_id);
      }
      return true;
    });
    persistentThresholdIdMap = updatedMap;
    tree.thresholdIdMap = updatedMap;
  },
};

// ------------------------------------------------------------------
// 2. 原本的 placenodes 核心邏輯
// ------------------------------------------------------------------

const placenodes = (
  tree,
  performInternalLayout,
  accessor = defaultAccessor,
  sort,
  mergedNodes = {}
) => {
  const state = {
    tree,
    currentLeafHeight: -1,
    uniqueId: 0,
  };

  tree.max_x = 0;

  const hasBranchLengths = Boolean(accessor(tree.getTips()[0]));
  const xCalculator = hasBranchLengths
    ? calculateXWithBranchLengths
    : calculateXWithoutBranchLengths;

  if (sort) {
    sortNodes(tree, sort);
  }

  if (performInternalLayout) {
    tree.max_y = 0;
    tree.node_order = [];
    // Reset abstract_y on all nodes before running internal layout.
    // The internal algorithm uses `!node.data.abstract_y` as a falsy guard to decide
    // whether to assign a new Y position. If a previous `standard` run left positive
    // abstract_y values on nodes, the guard would never trigger, currentLeafHeight
    // would never increment, tree.max_y would stay 0, and the yScale domain would
    // degenerate to [0,0] → all Y coords become NaN → every node collapses to a
    // single horizontal line.
    tree.traverse_and_compute((node) => {
      node.data.abstract_y = undefined;
      return true;
    });
    LayoutAlgorithms.internal(tree.nodes, xCalculator, accessor, state);

    const root = tree.getNodeByName("root");
    if (root?.children?.length) {
      root.data.abstract_y =
        root.children
          .map((child) => child.data.abstract_y)
          .reduce((sum, y) => sum + y, 0) / root.children.length;
    }
  } else {
    LayoutAlgorithms.standard(tree.nodes, xCalculator, accessor, state);
    tree.max_y = state.currentLeafHeight;
  }

  const thresholdGroups = new Map();
  const collectThresholdGroups = (node) => {
    if (!node) return;
    if (!tree.isLeafNode(node)) {
      const threshold = node.data.abstract_x;
      if (!thresholdGroups.has(threshold)) {
        thresholdGroups.set(threshold, []);
      }
      thresholdGroups.get(threshold).push(node);
    }
    node.children?.forEach(collectThresholdGroups);
  };

  collectThresholdGroups(tree.nodes);

  if (Object.keys(mergedNodes).length === 0) {
    persistentThresholdIdMap = {};
  }

  tree.thresholdIdMap = persistentThresholdIdMap;
  const isFirstRender = Object.keys(tree.thresholdIdMap).length === 0;

  if (isFirstRender) {
    ThresholdIdManager.initialize(tree, thresholdGroups);
  } else {
    ThresholdIdManager.handleMerged(tree, mergedNodes);
  }
};

// ------------------------------------------------------------------
// 3. 匯出 Hook
// ------------------------------------------------------------------

export const useTreeLayout = (
  treeInstance,
  settings,
  collapsedNodes,
  merged = {}
) => {
  return useMemo(() => {
    if (!treeInstance) return null;

    placenodes(
      treeInstance,
      settings.showInternalLabels, // Use internal layout algorithm when showing internal labels (aligns with v1 behavior)
      (node) => +node.data.attribute,
      settings.sort,
      merged
    );

    return treeInstance;
    // NOTE: `collapsedNodes` is intentionally excluded — it is NOT used inside
    // placenodes and only affects visibility filtering (handled by Phylotree.jsx).
    // Including it here causes placenodes to run on a STALE treeInstance when
    // collapsedNodes/merged are updated but treeInstance hasn't been re-parsed yet
    // (useEffect fires after render), producing duplicate unique_ids.
    // `merged` always changes in the same event as `loadNewick`, so by the time
    // a new treeInstance arrives, merged is already correct in the closure.
    // `settings.width` and `settings.height` are used in Phylotree.jsx (scales,
    // rightEdge) and TreeViewer.jsx (SVG dimensions), not in placenodes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treeInstance, settings.sort, settings.showInternalLabels]);
};
