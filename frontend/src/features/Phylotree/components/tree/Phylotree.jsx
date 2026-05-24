import { scaleLinear } from 'd3-scale';
import { useEffect, useMemo } from 'react';
import { useTree } from '../../context/TreeContext';
import { DENSITY_PRESETS, useUI } from '../../context/UIContext';
import { useTooltip } from '../../hooks/useTooltip';
import { useTreeLayout } from '../../hooks/useTreeLayout';
import { estimateTextWidth } from '../../utils/textWidth';
import BranchTooltip from '../ui/BranchTooltip';
import Branch from './Branch';
import LeafLabel from './LeafLabel';
import Node from './Node';

import { collectInternalNodes, getHiddenBranches, shouldHideInternalNode } from '../../utils/renderUtils';

// Layout constants — single source of truth used throughout this file
const TRANSLATE_X   = 20;  // matches <g transform="translate(20, 0)">
const RIGHT_MARGIN  = 30;  // breathing room from SVG right edge
const LABEL_GAP     = 5;   // px between tracer end and text

const Phylotree = ({ onNodeRename, onLayoutReady }) => {
  const { state: { treeInstance, collapsedNodes, renamedNodes, merged }, openContextMenu } = useTree();
  const { settings, searchTerm } = useUI();
  const { tooltip, showTooltip, hideTooltip } = useTooltip();

  // Font size driven by density preset
  const labelFontSize = DENSITY_PRESETS[settings.density]?.fontSize ?? 14;

  // 1. 計算佈局 (這會給每個節點加上 x, y 座標)
  const processedTree = useTreeLayout(treeInstance, settings, collapsedNodes, merged);

  // Align-right positioning — derived from settings, used in useMemo and JSX
  const alignRight = settings.alignTips === 'right';

  const { xScale, yScale, nodes, links, leafLabelData, commonLabelX, rightmost } = useMemo(() => {
    if (!processedTree) return { nodes: [], links: [], leafLabelData: new Map(), commonLabelX: 0, rightmost: 0 };

    const padding = 20;

    // rightEdge is in the g's local coordinate system
    const rightEdge = settings.width - TRANSLATE_X - RIGHT_MARGIN;

    // --- Per-leaf text widths ---
    const allLinks = processedTree.links;
    const leafLinks = allLinks.filter(
      l => !l.target.children || l.target.children.length === 0
    );

    const textWidths = new Map();
    leafLinks.forEach(link => {
      const name = link.target.data?.name ?? '';
      textWidths.set(link.target.unique_id, estimateTextWidth(name, labelFontSize));
    });

    // --- maxTextWidth: widest leaf label ---
    const maxTextWidth = textWidths.size > 0 ? Math.max(...textWidths.values()) : 0;

    // --- rightmost: branch drawing area width ---
    // alignRight: all tips share one common tracer-end at (rightEdge - maxTextWidth),
    //             so rightmost = rightEdge - maxTextWidth - LABEL_GAP
    // left mode:  each tip + its own text width must fit within rightEdge (per-leaf)
    let rightmost = rightEdge;
    if (processedTree.max_x > 0 && leafLinks.length > 0) {
      if (alignRight) {
        // Uniform constraint — only the longest label defines the boundary
        rightmost = Math.max(50, rightEdge - maxTextWidth - LABEL_GAP);
      } else {
        const candidates = leafLinks
          .filter(l => (l.target.x ?? l.target.data?.abstract_x) > 0)
          .map(l => {
            const tw = textWidths.get(l.target.unique_id) ?? 0;
            const ax = l.target.x ?? l.target.data?.abstract_x;
            return ((rightEdge - tw - LABEL_GAP) * processedTree.max_x) / ax;
          });
        if (candidates.length > 0) {
          rightmost = Math.max(50, Math.min(...candidates));
        }
      }
    }

    // --- Scales ---
    const xScale = scaleLinear()
      .domain([0, processedTree.max_x])
      .range([0, rightmost]);

    const yScale = scaleLinear()
      .domain([0, processedTree.max_y])
      .range([padding, settings.height - padding]);

    // --- leafLabelData: pixel positions per leaf ---
    const leafLabelData = new Map();
    leafLinks.forEach(link => {
      const name = link.target.data?.name ?? '';
      if (!name) return;
      const tipX = xScale(link.target.x ?? link.target.data?.abstract_x ?? 0);
      leafLabelData.set(link.target.unique_id, {
        name,
        // alignRight: labelX = common tracer-end for all leaves (= rightEdge - maxTextWidth)
        // left mode:  labelX = tipX (unused in left mode)
        labelX: alignRight ? (rightEdge - maxTextWidth) : tipX,
      });
    });

    // --- Visible links & nodes ---
    const hiddenBranches = getHiddenBranches(processedTree.nodes, collapsedNodes);
    const visibleLinks = processedTree.links.filter(
      link => !hiddenBranches.has(link.target.unique_id)
    );

    const internalNodesMap = collectInternalNodes(processedTree.nodes);
    const visibleNodes = Array.from(internalNodesMap.entries())
      .filter(([id, nodeInfo]) => !shouldHideInternalNode(id, nodeInfo, collapsedNodes));

    // commonLabelX: single tracer-end shared by ALL labels (leaf + internal) in right-align mode
    const commonLabelX = alignRight ? (rightEdge - maxTextWidth) : 0;

    return { xScale, yScale, nodes: visibleNodes, links: visibleLinks, leafLabelData, commonLabelX, rightmost };
  }, [processedTree, settings, collapsedNodes, alignRight, labelFontSize]);

  // Report layout numbers to parent (for axis panel in TreeViewer)
  const maxX = processedTree?.max_x ?? 0;
  useEffect(() => {
    onLayoutReady?.({ maxX, rightmost: rightmost ?? 0 });
  }, [maxX, rightmost, onLayoutReady]);

  if (!processedTree) return null;

  return (
    <g transform="translate(20, 0)">
      {/* 繪製分支 */}
      {links.map((link) => (
        <Branch 
          key={`branch-${link.source.unique_id}-${link.target.unique_id}`}
          link={link}
          xScale={xScale}
          yScale={yScale}
          onClick={() => console.log('Branch clicked', link)}
          onContextMenu={(e) => openContextMenu(e, link.target.unique_id, link.target, false)}
          onMouseMove={(e, targetNode) => {
            const svg = e.currentTarget.ownerSVGElement;
            const rect = svg.getBoundingClientRect();
            showTooltip(e.clientX - rect.left, e.clientY - rect.top, targetNode);
          }}
          onMouseLeave={hideTooltip}
        />
      ))}

      {/* 繪製節點 (內部節點 + 葉子節點) */}
      {nodes.map(([id, nodeInfo]) => (
        <Node
          key={`node-${id}`}
          id={id}
          data={nodeInfo}
          x={xScale(nodeInfo.x)}
          y={yScale(nodeInfo.y)}
          isCollapsed={collapsedNodes.has(id)}
          renamedLabel={renamedNodes.get(id)}
          showInternalLabels={settings.showInternalLabels}
          alignRight={alignRight}
          labelX={commonLabelX}
          onRename={(newName) => onNodeRename(id, newName)}
          onContextMenu={(e) => openContextMenu(e, id, nodeInfo, collapsedNodes.has(id))}
          unique_id={id}
        />
      ))}

      {/* 繪製葉節點 Labels (tracer + text) */}
      {links
        .filter(link => !link.target.children || link.target.children.length === 0)
        .filter(link => !collapsedNodes.has(link.target.unique_id))  // collapsed 節點由 Node.jsx 處理，避免重疊
        .map(link => {
          const info = leafLabelData.get(link.target.unique_id);
          if (!info?.name) return null;
          const renamedLabel = renamedNodes.get(link.target.unique_id);
          const displayName  = renamedLabel ?? info.name;
          const isHighlighted = !!(searchTerm && displayName.toLowerCase().includes(searchTerm.toLowerCase()));
          return (
            <LeafLabel
              key={`label-${link.target.unique_id}`}
              x={xScale(link.target.x ?? link.target.data?.abstract_x ?? 0)}
              y={yScale(link.target.y ?? link.target.data?.abstract_y ?? 0)}
              labelX={info.labelX}
              name={info.name}
              renamedLabel={renamedLabel}
              isHighlighted={isHighlighted}
              alignRight={settings.alignTips === 'right'}
              fontSize={labelFontSize}
              onRename={(newName) => onNodeRename(link.target.unique_id, newName)}
            />
          );
        })}

      {/* Tooltip — 永遠渲染在最上層 */}
      <BranchTooltip
        tooltip={tooltip}
        svgWidth={settings.width}
        svgHeight={settings.height}
      />
    </g>
  );
};

export default Phylotree;