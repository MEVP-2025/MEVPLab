
import { scaleLinear } from 'd3-scale';
import { useEffect, useRef, useState } from 'react';
import { useTree } from '../../context/TreeContext.jsx';
import { DENSITY_PRESETS, useUI } from '../../context/UIContext.jsx';
import { convertToNewick, getSubtreeNewick } from '../../utils/newickUtils.js';
import { findNodeById, replaceNodeWithSubtree, rerootTree } from '../../utils/treeOps.js';
import BranchLengthAxis from '../tree/BranchLengthAxis.jsx';
import Phylotree from '../tree/Phylotree.jsx';
import ContextMenu from '../ui/ContextMenu.jsx';

const AXIS_HEIGHT  = 70;  // px — must match BranchLengthAxis SVG height
const AXIS_TRANSLATE_X = 20; // matches tree's <g transform="translate(20, 0)">

const TreeViewer = () => {
  const { state, loadNewick, loadNewFile, loadWithState, updateMergedKeys, toggleCollapse, unmergeNode, closeContextMenu, setMergedNode, renameNode, thresholdCollapse } = useTree();
  const { treeInstance, contextMenu } = state;
  const { settings, updateSetting, fitRequest } = useUI();

  // Phase 1: set by handleMoveToRoot, consumed after loadNewFile render.
  const pendingRemap = useRef(null);
  // Phase 2: set by phase 1 handler, consumed after loadWithState + handleMerged render.
  // At that point useTreeLayout has assigned the correct X|Y id to the merged node.
  const pendingKeyFix = useRef(null);

  // ── Container size (for Fit) + drag-to-pan ─────────────────────
  const outerRef  = useRef(null);   // wrapper div → ResizeObserver target
  const scrollRef = useRef(null);   // scrollable inner div
  // Ref mirror so Fit effect can read latest size without it being a dependency
  const containerSizeRef = useRef({ w: 800, h: 600 });

  // ── Axis layout (reported by Phylotree via onLayoutReady) ────────
  const [axisLayout, setAxisLayout] = useState({ maxX: 0, rightmost: 0 });
  const showAxis = settings.showBranchLengthAxis;

  // ── Axis scroll offset — mirrors tree horizontal scroll ──────────
  const [treeScrollX, setTreeScrollX] = useState(0);

  // Always-current settings snapshot for use inside native event closures
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // ── Drag-to-pan ────────────────────────────────────────────────
  const dragRef   = useRef({ active: false, startX: 0, startY: 0, scrollLeft: 0, scrollTop: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Observe outer wrapper to track container dimensions for Fit
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const next = { w: Math.max(width, 200), h: Math.max(height, 200) };
      containerSizeRef.current = next;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Respond to Fit requests from SidebarRight.
  // Use containerSizeRef (not state) so sidebar collapse doesn't re-trigger this.
  useEffect(() => {
    if (!fitRequest) return;
    const { w, h } = containerSizeRef.current;
    updateSetting('width',  Math.round(w));
    // Subtract axis height from available vertical space when axis is shown
    updateSetting('height', Math.round(showAxis ? h - AXIS_HEIGHT : h));
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
      scrollRef.current.scrollTop  = 0;
      setTreeScrollX(0);
    }
  }, [fitRequest, updateSetting, showAxis]);

  // Track tree's horizontal scroll position to shift axis SVG via transform.
  // overflow:hidden on .axis-panel blocks scrollLeft writes from JS, so we use
  // translateX on the SVG element instead.
  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    const onScroll = () => setTreeScrollX(scrollEl.scrollLeft);
    scrollEl.addEventListener('scroll', onScroll, { passive: true });
    return () => scrollEl.removeEventListener('scroll', onScroll);
  }, []);

  // Mouse-wheel zoom (native listener so we can set passive: false)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      // Fixed step per scroll tick — immune to deltaY magnitude differences across devices.
      // ZOOM_STEP: how much to scale per tick (e.g. 0.05 = 5%, 0.1 = 10%)
      const ZOOM_STEP = 0.03;
      const factor = 1 - Math.sign(e.deltaY) * ZOOM_STEP;
      const { width, height } = settingsRef.current;
      updateSetting('width',  Math.round(Math.min(Math.max(width  * factor, 200), 8000)));
      updateSetting('height', Math.round(Math.min(Math.max(height * factor, 200), 8000)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [updateSetting]);

  // Returns true if the pointer target is an interactive tree element
  const isInteractiveTarget = (el) => {
    let node = el;
    while (node) {
      const cls = node.getAttribute?.('class') || '';
      if (cls.includes('rp-node') || cls.includes('rp-branch') || cls.includes('rp-label')) return true;
      if (node.tagName === 'svg') break;
      node = node.parentElement;
    }
    return false;
  };

  const handleSvgPointerDown = (e) => {
    if (e.button !== 0) return;

    // If a rename input is focused, commit the edit and stop here
    const activeEl = document.activeElement;
    if (activeEl?.classList.contains('rp-label-input')) {
      activeEl.blur(); // triggers onBlur → finishEditing on the input component
      return;
    }

    // Blank-area left-click always closes context menu first
    if (contextMenu.visible) {
      closeContextMenu();
      return;
    }
    if (isInteractiveTarget(e.target)) return;
    const scroll = scrollRef.current;
    if (!scroll) return;
    dragRef.current = { active: true, startX: e.clientX, startY: e.clientY, scrollLeft: scroll.scrollLeft, scrollTop: scroll.scrollTop };
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const handleSvgPointerMove = (e) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const scroll = scrollRef.current;
    if (!scroll) return;
    scroll.scrollLeft = dragRef.current.scrollLeft - dx;
    scroll.scrollTop  = dragRef.current.scrollTop  - dy;
  };

  const handleSvgPointerUp = () => {
    dragRef.current.active = false;
    setIsDragging(false);
  };

  // Helper: walk child-index path from tree root, return node or null.
  const walkPath = (root, pathIndices) => {
    let node = root;
    for (const idx of pathIndices) {
      if (!node.children || idx >= node.children.length) return null;
      node = node.children[idx];
    }
    return node;
  };

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

    // ── Phase 2 ──────────────────────────────────────────────────────────────
    if (pendingKeyFix.current) {
      const { mergedPathMap, originalOldMerged } = pendingKeyFix.current;
      pendingKeyFix.current = null;

      const fixedMerged = {};
      const fixedCollapsed = new Set();
      const fixedRenamed = new Map();

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

        // Children IDs are threshold|index values assigned by useTreeLayout.
        // After reroot the whole tree is re-laid-out (entirely new abstract_x/y values),
        // so the old child IDs have no valid mapping to the new ID space.
        // They are only used as a blocklist by assignThresholdIds; clearing them is safe:
        // - The collapsed node still gets its X|Y id via parent+siblingIndex (setNodeAsNonLeaf)
        // - Unmerge uses subtreeNewick → loadNewick → initialize rebuilds IDs from scratch
        const newChildren = new Set();

        fixedMerged[newId] = { ...data, parent: newParentId, siblingIndex: newSiblingIndex, children: newChildren };
        fixedCollapsed.add(newId);
        if (data.rename) fixedRenamed.set(newId, data.rename);
      }

      console.group('── pendingKeyFix: fixed merged keys ──');
      for (const [id, data] of Object.entries(fixedMerged)) {
        console.log(`  merged id=${id} rename=${data.rename} children=[${[...data.children].join(', ')}]`);
      }
      console.groupEnd();

      updateMergedKeys(fixedMerged, fixedCollapsed, fixedRenamed);
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
  }, [treeInstance, loadWithState, updateMergedKeys]);
  
  /* Handlers */
  const handleCollapseSubtree = () => {
    const { nodeId, isNodeCollapsed } = contextMenu;
    if (!nodeId) return closeContextMenu();

    if (isNodeCollapsed) {
      // Expand (Unmerge)
      if (state.merged[nodeId]) {
        const subtreeNewick = state.merged[nodeId].subtreeNewick;
        const updatedNewick = replaceNodeWithSubtree(
          treeInstance, 
          nodeId,
          subtreeNewick
        );
        
        if (updatedNewick) {
          unmergeNode(nodeId);
          loadNewick(updatedNewick);
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
    const { treeInstance, collapsedNodes } = state;
    
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

    // 4. Create merged data object
    const mergedData = {
        children: childrenIds,
        subtreeNewick: subtreeNewick,
        rename: newName,
        parent: targetNode.parent ? targetNode.parent.unique_id : null,
        siblingIndex: siblingIndex
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

  // Build axis xScale from reported layout numbers (same domain/range as Phylotree's internal scale)
  const axisXScale = scaleLinear()
    .domain([0, axisLayout.maxX])
    .range([0, axisLayout.rightmost]);

  return (
    <div ref={outerRef} className="viewport-wrapper">

      {/* ── Branch-length axis panel (fixed, not draggable) ─────── */}
      {showAxis && treeInstance && axisLayout.maxX > 0 && (
        <div
          className="axis-panel"
          style={{ height: AXIS_HEIGHT }}
        >
          <svg
            width={settings.width}
            height={AXIS_HEIGHT}
            style={{
              display: 'block',
              transform: `translateX(-${treeScrollX}px)`,
              '--rp-font-size': `${DENSITY_PRESETS[settings.density]?.fontSize ?? 14}px`,
            }}
          >
            <g transform={`translate(${AXIS_TRANSLATE_X}, 0)`}>
              <BranchLengthAxis
                maxX={axisLayout.maxX}
                xScale={axisXScale}
                rightmost={axisLayout.rightmost}
                onThresholdCollapse={thresholdCollapse}
              />
            </g>
          </svg>
        </div>
      )}

      {/* ── Scrollable tree area ─────────────────────────────────── */}
      <div ref={scrollRef} className="viewport-scroll">
        {!treeInstance ? (
          <div className="viewport-empty">
            <p>Please upload a Newick file to start.</p>
          </div>
        ) : (
          <>
            <ContextMenu
              visible={contextMenu.visible}
              position={contextMenu.position}
              onClose={closeContextMenu}
              onCollapseSubtree={handleCollapseSubtree}
              onMoveToRoot={handleMoveToRoot}
              isNodeCollapsed={contextMenu.isNodeCollapsed}
            />
            <svg
              width={settings.width}
              height={settings.height}
              style={{
                cursor: isDragging ? 'grabbing' : 'grab',
                display: 'block',
                userSelect: 'none',
                '--rp-font-size':        `${DENSITY_PRESETS[settings.density]?.fontSize        ?? 14}px`,
                '--node-r-internal':     `${DENSITY_PRESETS[settings.density]?.nodeRInternal   ?? 4}px`,
                '--node-r-leaf':         `${DENSITY_PRESETS[settings.density]?.nodeRLeaf        ?? 3}px`,
                '--node-r-collapsed':    `${DENSITY_PRESETS[settings.density]?.nodeRCollapsed   ?? 5}px`,
              }}
              onPointerDown={handleSvgPointerDown}
              onPointerMove={handleSvgPointerMove}
              onPointerUp={handleSvgPointerUp}
            >
              <Phylotree
                onNodeRename={handleNodeRename}
                onLayoutReady={setAxisLayout}
              />
            </svg>
          </>
        )}
      </div>
    </div>
  );
};

export default TreeViewer;