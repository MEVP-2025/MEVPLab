
import { useEffect, useRef } from 'react';
import { useTree } from '../../context/TreeContext.jsx';
import { useUI } from '../../context/UIContext.jsx';
import { convertToNewick, getSubtreeNewick } from '../../utils/newickUtils.js';
import { findNodeById, replaceNodeWithSubtree, rerootTree } from '../../utils/treeOps.js';
import Phylotree from '../tree/Phylotree.jsx';
import ContextMenu from '../ui/ContextMenu.jsx';

// Pure helper: walk a child-index path from a tree root node.
const walkPath = (root, pathIndices) => {
  let node = root;
  for (const idx of pathIndices) {
    if (!node.children || idx >= node.children.length) return null;
    node = node.children[idx];
  }
  return node;
};

// Pure helper: DFS find by data.name. Used after subtree-restore when a
// previously-merged node reappears as a named leaf in the Newick.
const findNodeByName = (root, name) => {
  if (root.data?.name === name) return root;
  for (const child of (root.children || [])) {
    const found = findNodeByName(child, name);
    if (found) return found;
  }
  return null;
};

const TreeViewer = () => {
  const { state, loadNewick, loadNewFile, loadWithState, updateMergedKeys, toggleCollapse, unmergeNode, closeContextMenu, setMergedNode, renameNode } = useTree();
  const { treeInstance, contextMenu } = state;
  const { settings } = useUI();

  // Phase 1: set by handleMoveToRoot, consumed after loadNewFile render.
  const pendingRemap = useRef(null);
  // Phase 2: set by phase 1 handler, consumed after loadWithState + handleMerged render.
  // At that point useTreeLayout has assigned the correct X|Y id to the merged node.
  const pendingKeyFix = useRef(null);
  // Set by handleCollapseSubtree when unmerging a node that has nested merged children.
  // Consumed in useEffect Phase U1 after loadNewFile gives all nodes fresh IDs.
  const pendingNestedRestore = useRef(null);

  // After reroot: two-phase useEffect to correctly remap merged-node state.
  //
  // Phase 1 (pendingRemap) fires after loadNewFile.  The merged node is a
  // plain-numeric leaf at this point, so newId will be e.g. "1".  We pass
  // this to loadWithState so that useTreeLayout.handleMerged can convert it
  // back to a pseudo-internal node with an X|Y id.
  //
  // Phase 2 (pendingKeyFix) fires after loadWithState + handleMerged.  The
  // merged node now has its correct X|Y id.  We re-walk the same paths to get
  // the new ids and call updateMergedKeys (no re-parse) to fix state.merged.
  useEffect(() => {
    if (!treeInstance) return;

    // ── Phase 2: fix merged keys after handleMerged has assigned X|Y ids ────────
    // Two sub-modes:
    //   (no mode / 'path') Reroot path-map approach
    //   'rename'           Unmerge nested-restore name-lookup approach
    if (pendingKeyFix.current) {
      const pf = pendingKeyFix.current;
      pendingKeyFix.current = null;

      const fixedMerged = {};
      const fixedCollapsed = new Set();
      const fixedRenamed = new Map();

      if (pf.mode === 'rename') {
        // Find each restored entry by its rename name (it's a leaf named after the rename).
        for (const { rename, origData } of pf.allToRestore) {
          const node = findNodeByName(treeInstance.nodes, rename);
          if (!node || node.unique_id == null) { console.warn(`[Phase U2] not found: ${rename}`); continue; }

          const newId = String(node.unique_id);
          const newParentId = node.parent?.unique_id != null
            ? String(node.parent.unique_id)
            : origData.parent;
          const newSiblingIndex = node.parent?.children?.findIndex(c => c === node) ?? origData.siblingIndex;

          fixedMerged[newId] = { ...origData, parent: newParentId, siblingIndex: newSiblingIndex, children: new Set() };
          fixedCollapsed.add(newId);
          if (origData.rename) fixedRenamed.set(newId, origData.rename);
        }
      } else {
        // Reroot path-walk mode.
        const { mergedPathMap, originalOldMerged } = pf;
        for (const [origId, data] of Object.entries(originalOldMerged)) {
          const pathIndices = mergedPathMap[String(origId)] ?? mergedPathMap[Number(origId)];
          if (!pathIndices) continue;

          const node = walkPath(treeInstance.nodes, pathIndices);
          if (!node || node.unique_id == null) continue;

          const newId = String(node.unique_id);
          const newParentId = node.parent?.unique_id != null
            ? String(node.parent.unique_id)
            : data.parent;
          const newSiblingIndex = node.parent?.children?.findIndex(c => c === node) ?? data.siblingIndex;

          fixedMerged[newId] = { ...data, parent: newParentId, siblingIndex: newSiblingIndex, children: new Set() };
          fixedCollapsed.add(newId);
          if (data.rename) fixedRenamed.set(newId, data.rename);
        }
      }

      console.group('── pendingKeyFix: fixed merged keys ──');
      for (const [id, data] of Object.entries(fixedMerged)) {
        console.log(`  merged id=${id} rename=${data.rename}`);
      }
      console.groupEnd();

      updateMergedKeys(fixedMerged, fixedCollapsed, fixedRenamed);
      return;
    }

    // ── Phase U1: restore nested + sibling merged nodes after loadNewFile parse ─
    // loadNewFile forced initialize → all nodes have fresh IDs, so parent.unique_id
    // is valid and can be passed to handleMerged in the next re-parse.
    if (pendingNestedRestore.current) {
      const { nestedMerged, siblingMerged, updatedNewick } = pendingNestedRestore.current;
      pendingNestedRestore.current = null;

      // Build a flat list of all entries to restore, keyed by rename.
      // nestedMerged   = entries that were inside the unmerged node's subtree.
      // siblingMerged  = other top-level merged entries (lost when loadNewFile cleared state).
      const allToRestore = [
        ...Object.entries(nestedMerged),
        ...Object.values(siblingMerged).map(data => [data.rename, data]),
      ];

      for (const [rename, data] of allToRestore) {
        const node = findNodeByName(treeInstance.nodes, rename);
        if (!node || node.unique_id == null) {
          console.warn(`[Phase U1] node not found for rename: ${rename}`);
          continue;
        }
        const newParentId = node.parent?.unique_id != null
          ? String(node.parent.unique_id)
          : data.parent;
        const newSiblingIndex = node.parent?.children?.findIndex(c => c === node) ?? data.siblingIndex;

        // Use the plain leaf id as a temporary key; Phase U2 will fix it to X|Y.
        // getNodeByName finds the node, setMergedNode + renameNode register it.
        // handleMerged only needs parent+siblingIndex (not the key) to call setNodeAsNonLeaf.
        setMergedNode(String(node.unique_id), { ...data, parent: newParentId, siblingIndex: newSiblingIndex, children: new Set() });
        renameNode(String(node.unique_id), data.rename);
      }

      // Phase U2 will run after handleMerged assigns X|Y ids in the next re-parse.
      pendingKeyFix.current = {
        mode: 'rename',
        allToRestore: allToRestore.map(([rename, origData]) => ({ rename, origData })),
      };
      loadNewick(updatedNewick);
      return;
    }

    // ── Phase 1 ──────────────────────────────────────────────────────────────
    if (!pendingRemap.current) return;
    const { mergedPathMap, oldMerged, newNewick } = pendingRemap.current;
    pendingRemap.current = null;

    const newMerged = {};
    const newCollapsed = new Set();
    const newRenamed = new Map();

    for (const [oldId, data] of Object.entries(oldMerged)) {
      const pathIndices = mergedPathMap[String(oldId)] ?? mergedPathMap[Number(oldId)];
      if (!pathIndices) { console.warn(`[phase1 skip] oldId=${oldId}: no pathIndices`); continue; }

      const targetNode = walkPath(treeInstance.nodes, pathIndices);
      if (!targetNode || targetNode.unique_id == null) { console.warn(`[phase1 skip] oldId=${oldId}: path walk failed`); continue; }

      const newId = String(targetNode.unique_id);
      const newParentId = targetNode.parent?.unique_id != null
        ? String(targetNode.parent.unique_id)
        : data.parent;
      const newSiblingIndex = targetNode.parent?.children?.findIndex(c => c === targetNode) ?? data.siblingIndex;

      console.log(`[phase1] oldId=${oldId} → newId=${newId} (plain leaf) parent=${newParentId} sibIdx=${newSiblingIndex}`);

      // Pass empty children — old IDs are invalid in the new tree layout.
      // handleMerged only needs parent+siblingIndex to call setNodeAsNonLeaf.
      // Phase 2 will write the final empty Set as well (children are cleared after reroot).
      newMerged[newId] = { ...data, parent: newParentId, siblingIndex: newSiblingIndex, children: new Set() };
      newCollapsed.add(newId);
      if (data.rename) newRenamed.set(newId, data.rename);
    }

    // Stash original merged data for phase 2 (children offset remap needs origId X|Y)
    pendingKeyFix.current = { mergedPathMap, originalOldMerged: oldMerged };

    loadWithState(newNewick, newMerged, newCollapsed, newRenamed);
  }, [treeInstance, loadWithState, updateMergedKeys, loadNewick, setMergedNode, renameNode]);
  
  if (!treeInstance) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <p style={{ color: '#888' }}>Please upload a Newick file to start.</p>
      </div>
    );
  }

  /* Handlers */
  const handleCollapseSubtree = () => {
    const { nodeId, isNodeCollapsed } = contextMenu;
    if (!nodeId) return closeContextMenu();

    if (isNodeCollapsed) {
      // Expand (Unmerge)
      if (state.merged[nodeId]) {
        const mergedEntry = state.merged[nodeId];
        const subtreeNewick = mergedEntry.subtreeNewick;
        const nestedMerged = mergedEntry.nestedMerged || {};

        const updatedNewick = replaceNodeWithSubtree(
          treeInstance,
          nodeId,
          subtreeNewick
        );

        if (updatedNewick) {
          if (Object.keys(nestedMerged).length > 0) {
            // Subtree contains nested merged nodes. Use loadNewFile to force
            // initialize so ALL nodes (including newly-restored ones) receive
            // fresh IDs. Phase U1 will then re-register nested + sibling merged
            // entries with the correct parent/siblingIndex before Phase U2 fixes
            // the keys from plain-leaf ids to X|Y ids.
            const siblingMerged = Object.fromEntries(
              Object.entries(state.merged).filter(([id]) => id !== nodeId)
            );
            pendingNestedRestore.current = { nestedMerged, siblingMerged, updatedNewick };
            loadNewFile(updatedNewick);
          } else {
            // No nested merged nodes: simple restore.
            // handleMerged handles any sibling merged nodes automatically.
            unmergeNode(nodeId);
            loadNewick(updatedNewick);
          }
        }
      } else {
        toggleCollapse(nodeId);
      }
    } else {
      // Collapse (Merge)
      // Logic to calculate subtreeNewick for merge is complex, usually done in NodeRename but here we just collapse visually if no rename
      // If we want detailed Merge like v1, we need to replicate handleNodeRename logic or similar
      // For now, simple toggle
      toggleCollapse(nodeId);
    }
    closeContextMenu();
  };

  const handleMoveToRoot = () => {
    const { nodeId } = contextMenu;
    if (!nodeId) return closeContextMenu();

    const { merged } = state;

    // Identify top-level merged nodes: those NOT nested inside another merged node's subtree
    const allChildrenIds = new Set();
    // allChildrenIds collects the IDs of all nodes that are children of any merged node
    for (const data of Object.values(merged)) {
      data.children.forEach(id => allChildrenIds.add(String(id)));
    }
    const topLevelMergedIds = Object.keys(merged).filter(id => !allChildrenIds.has(String(id)));

    const result = rerootTree(treeInstance, state.newick, nodeId, topLevelMergedIds);
    if (!result.success) {
      console.error(result.message);
      closeContextMenu();
      return;
    }

    // If there are merged nodes, stash remap data; the useEffect will apply it
    // once useTreeLayout has assigned new ids to the rerooted treeInstance.
    if (Object.keys(merged).length > 0) {
      pendingRemap.current = {
        mergedPathMap: result.mergedPathMap,
        oldMerged: merged,
        newNewick: result.newNewick,
      };
    }

    loadNewFile(result.newNewick);
    closeContextMenu();
  };

  const handleNodeRename = (nodeId, newName) => {
    const { treeInstance, collapsedNodes, merged } = state;
    
    // Find the node
    const targetNode = findNodeById(treeInstance.nodes, nodeId);
    if (!targetNode) return;

    const isCollapsed = collapsedNodes.has(nodeId);

    // 1. 處理空字串：恢復預設名稱 
    // 目前根本不會進來
    if (newName.trim() === "") {
      renameNode(nodeId, ""); 
    
      if (isCollapsed) {
        // 準備未來的 renamedNodes 狀態以供生成 Newick
        const nextRenamed = new Map(state.renamedNodes);
        nextRenamed.delete(nodeId);

        const newNewick = convertToNewick(treeInstance.nodes, collapsedNodes, nextRenamed);
        if (newNewick) {
          loadNewick(newNewick);
        }
      }
      return;
    }

    // 2. 如果節點「尚未被折疊」（包含末端葉節點），則單純重新命名，不啟動收合
    if (!isCollapsed) {
      renameNode(nodeId, newName);
      return;
    }

    // 3. 節點已折疊且有新名稱，執行「重新命名並打包成 Merged」的邏輯
    // 1. Collect children IDs
    const childrenIds = new Set();
    const collectChildrenIds = (childNode) => {
      if (!childNode) return;
      if (childNode.unique_id && childNode !== targetNode) {
        childrenIds.add(childNode.unique_id);
      }
      if (childNode.children) {
        childNode.children.forEach(collectChildrenIds);
      }
    };
    if (targetNode.children) {
      targetNode.children.forEach(collectChildrenIds);
    }

    // 2. Calculate Subtree Newick
    const subtreeNewick = getSubtreeNewick(targetNode);

    // 3. Find index in parent (for restoring later)
    let siblingIndex = -1;
    if (targetNode.parent && targetNode.parent.children) {
        siblingIndex = targetNode.parent.children.findIndex(child => child.unique_id === targetNode.unique_id);
    }

    // 4. Collect nested merged nodes: any entry in state.merged whose id is
    //    inside this subtree. Keyed by rename (not by id) because ids are
    //    reassigned on every re-parse and the rename is the stable identity.
    const nestedMerged = {};
    for (const [mergedId, mergedEntry] of Object.entries(state.merged)) {
      if (childrenIds.has(mergedId)) {
        nestedMerged[mergedEntry.rename] = mergedEntry;
      }
    }

    // 5. Create merged data object
    const mergedData = {
        children: childrenIds,
        subtreeNewick: subtreeNewick,
        rename: newName,
        parent: targetNode.parent ? targetNode.parent.unique_id : null,
        siblingIndex: siblingIndex,
        nestedMerged: nestedMerged,
    };

    // 5. Update state: Set merged data, add to collapsed, and set rename
    // We update the state locally first to generate the new Newick string immediately
    // imitating V1 behavior where merge triggers a tree reload to fix layout issues.
    
    // Prepare next state for conversion
    const nextCollapsed = new Set(collapsedNodes);
    nextCollapsed.add(nodeId);
    
    const nextRenamed = new Map(state.renamedNodes);
    nextRenamed.set(nodeId, newName);

    // Update Context State
    setMergedNode(nodeId, mergedData); 
    renameNode(nodeId, newName);

    // Generate new Newick string with the node collapsed (treated as leaf)
    // and reload the tree
    const newNewick = convertToNewick(treeInstance.nodes, nextCollapsed, nextRenamed);
    if (newNewick) {
      loadNewick(newNewick);
    }
  };

  return (
    <div className="viewport-container" style={{ padding: '20px', minWidth: '100%', minHeight: '100%', position: 'relative' }}>
      <ContextMenu 
        visible={contextMenu.visible}
        position={contextMenu.position}
        onClose={closeContextMenu}
        onCollapseSubtree={handleCollapseSubtree}
        onMoveToRoot={handleMoveToRoot}
        isNodeCollapsed={contextMenu.isNodeCollapsed}
      />
      <svg width={settings.width} height={settings.height}>
        <Phylotree onNodeRename={handleNodeRename} />
      </svg>
    </div>
  );
};

export default TreeViewer;