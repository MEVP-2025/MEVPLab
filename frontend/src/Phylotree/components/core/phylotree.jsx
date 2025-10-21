import { max } from "d3-array";
import { scaleLinear, scaleOrdinal } from "d3-scale";
import { schemeCategory10 } from "d3-scale-chromatic";
import _ from "lodash";
import { phylotree } from "phylotree";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import text_width from "../../utils/text_width.js";
import {
  collectInternalNodes,
  getHiddenBranches,
  shouldHideInternalNode,
} from "../../utils/tree-utils.js";
import BranchLengthAxis from "../axes/BranchLengthAxis.jsx";
import InternalNode from "../nodes/InternalNode.jsx";
import NodeLabel from "../nodes/NodeLabel.jsx";
import Branch from "../nodes/branch.jsx";

import "../../styles/phylotree.css";

// Constants
const DEFAULT_DIMENSIONS = { width: 500, height: 500 };
const MIN_DIMENSIONS = { width: 300, height: 300 };
const SPACING = { vertical: 20, horizontal: 25 };
const AXIS_OFFSET = 90;

// Utility functions
/**
 * Calculate x position with branch lengths
 * @param {Object} node - Tree node
 * @param {Function} accessor - Branch length accessor function
 * @returns {number} X position
 */
const calculateXWithBranchLengths = (node, accessor) => {
  if (!node.parent) return 0;
  const branchLength = accessor(node);
  return branchLength + node.parent.data.abstract_x;
};

/**
 * Calculate x position without branch lengths
 * @param {Object} node - Tree node
 * @returns {number} X position
 */
const calculateXWithoutBranchLengths = (node) => {
  return node.parent ? node.parent.data.abstract_x + 1 : 0;
};

/**
 * Default accessor for node attributes
 * @param {Object} node - Tree node
 * @returns {number} Numeric value of node attribute
 */
const defaultAccessor = (node) => +node.data.attribute;

/**
 * Sort tree nodes by depth
 * @param {Object} tree - Phylotree instance
 * @param {string} direction - 'ascending' or 'descending'
 */
const sortNodes = (tree, direction) => {
  // Calculate depth for each node
  tree.traverse_and_compute((node) => {
    let depth = 1;
    if (node.children?.length) {
      depth += max(node.children, (child) => child.count_depth || 0);
    }
    node.count_depth = depth;
  });

  const isAscending = direction === "ascending";
  tree.resortChildren((a, b) => 
    (a.count_depth - b.count_depth) * (isAscending ? 1 : -1)
  );
};

/**
 * Convert leaf node to non-leaf by adding empty children array
 * @param {Object} tree - Phylotree instance
 * @param {Object} node - Node to modify
 */
const setNodeAsNonLeaf = (tree, node) => {
  if (tree.isLeafNode(node)) {
    node.children = [];
  }
};

/**
 * Assign threshold-based IDs to nodes
 * @param {Object} tree - Phylotree instance
 * @param {Set} mergedChildrenIds - IDs of merged children
 * @returns {Map} Threshold groups
 */
const assignThresholdIds = (tree, mergedChildrenIds) => {
  const thresholdGroups = new Map();

  // Collect nodes by threshold
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

  // Assign IDs to nodes in each threshold group
  for (const [threshold, nodes] of thresholdGroups.entries()) {
    nodes.sort((a, b) => a.data.abstract_y - b.data.abstract_y);
    
    const originalIds = tree.thresholdIdMap?.[threshold] || [];
    const availableIds = originalIds.filter(id => !mergedChildrenIds.has(id));
    
    nodes.forEach((node, index) => {
      if (index < availableIds.length) {
        node.unique_id = String(availableIds[index]);
      }
    });
  }

  return thresholdGroups;
};

/**
 * Find node by ID in tree
 * @param {Object} tree - Phylotree instance
 * @param {string|number} id - Node ID to find
 * @returns {Object|null} Found node or null
 */
const findNodeById = (tree, id) => {
  let foundNode = null;
  tree.traverse_and_compute((node) => {
    if (node.unique_id === id) {
      foundNode = node;
      return false; // Stop traversal
    }
    return true;
  });
  return foundNode;
};

// Persistent storage for threshold ID mapping
let persistentThresholdIdMap = {};

/**
 * Layout algorithms for tree nodes
 */
const LayoutAlgorithms = {
  /**
   * Standard node layout
   * @param {Object} node - Current node
   * @param {Function} xCalculator - X position calculator
   * @param {Function} accessor - Branch length accessor
   * @param {Object} state - Layout state
   * @returns {number} Y position
   */
  standard: (node, xCalculator, accessor, state) => {
    // Assign ID only to leaf nodes
    if (!node.children?.length) {
      state.uniqueId = node.unique_id = state.uniqueId + 1;
    }

    node.data.abstract_x = xCalculator(node, accessor);
    state.tree.max_x = Math.max(state.tree.max_x, node.data.abstract_x);

    if (node.children?.length) {
      node.data.abstract_y = node.children
        .map(child => LayoutAlgorithms.standard(child, xCalculator, accessor, state))
        .reduce((sum, y) => sum + y, 0) / node.children.length;
    } else {
      state.currentLeafHeight = node.data.abstract_y = state.currentLeafHeight + 1;
    }

    return node.data.abstract_y;
  },

  /**
   * Internal node layout with labels
   * @param {Object} node - Current node
   * @param {Function} xCalculator - X position calculator
   * @param {Function} accessor - Branch length accessor
   * @param {Object} state - Layout state
   */
  internal: (node, xCalculator, accessor, state) => {
    // Assign ID only to leaf nodes
    if (!node.children?.length) {
      state.uniqueId = node.unique_id = state.uniqueId + 1;
    }

    node.data.abstract_x = xCalculator(node, accessor);
    state.tree.max_x = Math.max(state.tree.max_x, node.data.abstract_x);

    if (!state.tree.isLeafNode(node)) {
      node.children?.forEach(child => 
        LayoutAlgorithms.internal(child, xCalculator, accessor, state)
      );
    }

    if (!node.data.abstract_y && node.data.name !== "root") {
      state.currentLeafHeight = node.data.abstract_y = state.currentLeafHeight + 1;
      state.tree.node_order.push(node.data.name);
    }

    if (node.parent && !node.parent.data.abstract_y && node.data.name !== "root") {
      if (node.parent.data.name !== "root") {
        state.currentLeafHeight = node.parent.data.abstract_y = state.currentLeafHeight + 1;
        state.tree.node_order.push(node.parent.data.name);
      }
    }

    state.tree.max_y = Math.max(state.tree.max_y, state.currentLeafHeight);
  }
};

/**
 * Threshold ID management utilities
 */
const ThresholdIdManager = {
  /**
   * Initialize threshold IDs for first render
   * @param {Object} tree - Phylotree instance
   * @param {Map} thresholdGroups - Threshold groups
   */
  initialize: (tree, thresholdGroups) => {
    // Assign initial IDs based on threshold and position
    for (const [threshold, nodes] of thresholdGroups.entries()) {
      nodes.sort((a, b) => a.data.abstract_y - b.data.abstract_y);
      nodes.forEach((node, index) => {
        node.unique_id = `${threshold}-${index}`;
      });
    }

    // Build threshold ID map
    const thresholdIdMap = {};
    tree.traverse_and_compute((node) => {
      if (!tree.isLeafNode(node) && typeof node.unique_id === "string") {
        const [threshold] = String(node.unique_id).split("-");
        
        if (!thresholdIdMap[threshold]) {
          thresholdIdMap[threshold] = [];
        }
        
        thresholdIdMap[threshold].push(node.unique_id);
      }
      return true;
    });

    persistentThresholdIdMap = thresholdIdMap;
  },

  /**
   * Handle subsequent renders with merged nodes
   * @param {Object} tree - Phylotree instance
   * @param {Object} mergedNodes - Merged node information
   */
  handleMerged: (tree, mergedNodes) => {
    const mergedChildrenIds = new Set();
    const mergedIds = {};

    // Collect merged node information
    Object.entries(mergedNodes).forEach(([mergedId, mergedInfo]) => {
      mergedIds[mergedId] = {
        parent: mergedInfo.parent,
        siblingIndex: mergedInfo.siblingIndex,
      };

      if (mergedInfo.children) {
        mergedInfo.children.forEach(childId => {
          mergedChildrenIds.add(childId);
        });
      }
    });

    assignThresholdIds(tree, mergedChildrenIds);

    // Sort merged IDs by threshold and position
    const sortedMergedIds = Object.entries(mergedIds).sort((a, b) => {
      const getThreshold = id => parseInt(id.split("-")[0], 10);
      const getYValue = id => parseInt(id.split("-")[1], 10);
      
      const thresholdDiff = getThreshold(a[0]) - getThreshold(b[0]);
      return thresholdDiff !== 0 ? thresholdDiff : getYValue(a[0]) - getYValue(b[0]);
    });

    // Process sorted merged IDs
    sortedMergedIds.forEach(([mergedId, mergedInfo]) => {
      const parentNode = findNodeById(tree, mergedInfo.parent);
      
      if (parentNode?.children) {
        const nodeToModify = parentNode.children[mergedInfo.siblingIndex];
        
        if (nodeToModify) {
          setNodeAsNonLeaf(tree, nodeToModify);
          assignThresholdIds(tree, mergedChildrenIds);
        }
      }
    });
  }
};

/**
 * Main node placement function
 * @param {Object} tree - Phylotree instance
 * @param {boolean} performInternalLayout - Whether to perform internal layout
 * @param {Function} accessor - Branch length accessor
 * @param {string} sort - Sort direction
 * @param {Object} mergedNodes - Merged node information
 */
const placenodes = (tree, performInternalLayout, accessor = defaultAccessor, sort, mergedNodes = {}) => {
  // Initialize state
  const state = {
    tree,
    currentLeafHeight: -1,
    uniqueId: 0
  };
  
  tree.max_x = 0;

  // Determine position calculation method
  const hasBranchLengths = Boolean(accessor(tree.getTips()[0]));
  const xCalculator = hasBranchLengths ? calculateXWithBranchLengths : calculateXWithoutBranchLengths;

  // Apply sorting if requested
  if (sort) {
    sortNodes(tree, sort);
  }

  // Perform layout calculation
  if (performInternalLayout) {
    tree.max_y = 0;
    tree.node_order = [];
    LayoutAlgorithms.internal(tree.nodes, xCalculator, accessor, state);
    
    // Calculate root position
    const root = tree.getNodeByName("root");
    if (root?.children?.length) {
      root.data.abstract_y = root.children
        .map(child => child.data.abstract_y)
        .reduce((sum, y) => sum + y, 0) / root.children.length;
    }
  } else {
    LayoutAlgorithms.standard(tree.nodes, xCalculator, accessor, state);
    tree.max_y = state.currentLeafHeight;
  }

  // Collect nodes by threshold
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

  // Reset threshold map if no merged nodes
  if (Object.keys(mergedNodes).length === 0) {
    persistentThresholdIdMap = {};
  }

  tree.thresholdIdMap = persistentThresholdIdMap;
  const isFirstRender = Object.keys(tree.thresholdIdMap).length === 0;

  // Handle threshold ID assignment
  if (isFirstRender) {
    ThresholdIdManager.initialize(tree, thresholdGroups);
  } else {
    ThresholdIdManager.handleMerged(tree, mergedNodes);
  }
};

/**
 * Get color scale for branches
 * @param {Object} tree - Phylotree instance
 * @param {boolean|Object} highlightBranches - Highlight configuration
 * @returns {Function|null} Color scale function
 */
const getColorScale = (tree, highlightBranches) => {
  if (!highlightBranches) return null;
  
  if (typeof highlightBranches === "boolean") {
    return tree.parsed_tags && highlightBranches
      ? scaleOrdinal().domain(tree.parsed_tags).range(schemeCategory10)
      : null;
  }
  
  const pairs = _.pairs(highlightBranches);
  return scaleOrdinal()
    .domain(pairs.map(p => p[0]))
    .range(pairs.map(p => p[1]));
};

/**
 * Calculate optimal dimensions for tree display
 * @param {Object} tree - Phylotree instance
 * @returns {Object} Optimal width and height
 */
const calculateOptimalDimensions = (tree) => {
  const leafNodes = tree.getTips();
  const optimalHeight = leafNodes.length * SPACING.vertical;

  let maxPathLength = 0;
  let maxLabelWidth = 0;

  tree.traverse_and_compute((node) => {
    if (node.data.abstract_x > maxPathLength) {
      maxPathLength = node.data.abstract_x;
    }
    
    if (node.data.name) {
      const labelWidth = text_width(node.data.name, 14, 100);
      if (labelWidth > maxLabelWidth) {
        maxLabelWidth = labelWidth;
      }
    }
  });

  const optimalWidth = maxPathLength * SPACING.horizontal + maxLabelWidth + 100;

  return {
    width: Math.max(MIN_DIMENSIONS.width, Math.round(optimalWidth)),
    height: Math.max(MIN_DIMENSIONS.height, Math.round(optimalHeight)),
  };
};

/**
 * Modern Phylotree component
 */
const Phylotree = (props) => {
  // State management
  const [tooltip, setTooltip] = useState(false);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [nodeLabels, setNodeLabels] = useState(new Map());
  const [dimensions, setDimensions] = useState(null);
  const [hoveredTick, setHoveredTick] = useState(null);

  const svgRef = useRef(null);
  const { 
    maxLabelWidth, 
    collapsedNodes, 
    renamedNodes, 
    onNodeRename,
    tree: propTree,
    newick,
    skipPlacement,
    internalNodeLabels,
    accessor,
    sort,
    merged,
    onTreeReady,
    showLabels,
    onDimensionsChange,
    highlightedNodes = new Set(),
  } = props;

  // Memoized tree creation and processing
  const processedTree = useMemo(() => {
    let tree = propTree;
    if (!tree && newick) {
      tree = new phylotree(newick);
    }

    if (tree && !skipPlacement) {
      placenodes(tree, internalNodeLabels, accessor, sort, merged);
      
      if (onTreeReady) {
        onTreeReady(tree);
      }
    }

    return tree;
  }, [propTree, newick, skipPlacement, internalNodeLabels, accessor, sort, merged, onTreeReady]);

  // Calculate dimensions when tree changes
  useEffect(() => {
    if (processedTree) {
      const optimalDims = calculateOptimalDimensions(processedTree);
      
      if (!dimensions || 
          dimensions.width !== optimalDims.width || 
          dimensions.height !== optimalDims.height) {
        setDimensions(optimalDims);
        onDimensionsChange?.(optimalDims);
      }
    }
  }, [processedTree, showLabels, onDimensionsChange, dimensions]);

  // Event handlers
  const handleNodeClick = useCallback((e, id, nodeInfo) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.ownerSVGElement.getBoundingClientRect();
    const position = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    const isNodeCollapsed = collapsedNodes?.has(id);

    props.onContextMenuEvent?.({
      visible: true,
      position,
      nodeId: id,
      nodeData: nodeInfo,
      isNodeCollapsed,
    });
  }, [collapsedNodes, props.onContextMenuEvent]);

  const handleLabelChange = useCallback((id, newLabel) => {
    setNodeLabels(prevLabels => new Map(prevLabels).set(id, newLabel));
    onNodeRename?.(id, newLabel);
  }, [onNodeRename]);

  // Early return if no tree data
  if (!processedTree) {
    return <g />;
  }

  // Calculate dimensions and scales
  const actualWidth = props.width || dimensions?.width || DEFAULT_DIMENSIONS.width;
  const actualHeight = props.height || dimensions?.height || DEFAULT_DIMENSIONS.height;

  // Attach text width to nodes
  const attachTextWidth = (node) => {
    node.data.text_width = text_width(node.data.name, 14, maxLabelWidth);
    node.children?.forEach(attachTextWidth);
  };
  attachTextWidth(processedTree.nodes);

  // Calculate rightmost position for labels
  const sortedTips = processedTree.getTips()
    .sort((a, b) => b.data.abstract_x - a.data.abstract_x);

  let rightmost = actualWidth;
  if (props.showLabels) {
    for (const tip of sortedTips) {
      rightmost = actualWidth - tip.data.text_width;
      const scale = rightmost / tip.data.abstract_x;
      
      const noneOverlap = sortedTips.every(tipNode => {
        const tipX = tipNode.data.abstract_x * scale;
        const textX = actualWidth - tipNode.data.text_width;
        return Math.floor(tipX) < Math.ceil(textX);
      });
      
      if (noneOverlap) break;
    }
  }

  // Create scales
  const xScale = scaleLinear()
    .domain([0, processedTree.max_x])
    .range([0, rightmost]);
    
  const yScale = scaleLinear()
    .domain([0, processedTree.max_y])
    .range([props.includeBLAxis ? AXIS_OFFSET : 0, actualHeight]);

  const colorScale = getColorScale(processedTree, props.highlightBranches);
  const hiddenBranches = getHiddenBranches(processedTree, collapsedNodes);
  const internalNodes = collectInternalNodes(processedTree);
  // const isHighlighted = highlightedNodes.has(link.target.unique_id);

  return (
    <g ref={svgRef} transform={props.transform}>
      {props.includeBLAxis && (
        <BranchLengthAxis
          maxX={processedTree.max_x}
          x_scale={xScale}
          rightmost={rightmost}
          hoveredTick={hoveredTick}
          setHoveredTick={setHoveredTick}
          onThresholdCollapse={props.onThresholdCollapse}
        />
      )}

      {/* Render branches */}
      {processedTree.links
        .filter(link => !hiddenBranches.has(link.target.unique_id))
        .map((link, index) => (
          <Branch
            key={`${link.source.unique_id}-${link.target.unique_id}-${index}`}
            xScale={xScale}
            yScale={yScale}
            colorScale={colorScale}
            link={link}
            showLabel={props.internalNodeLabels || processedTree.isLeafNode(link.target)}
            maxLabelWidth={maxLabelWidth}
            width={actualWidth}
            alignTips={props.alignTips}
            branchStyler={props.branchStyler}
            labelStyler={props.labelStyler}
            tooltip={props.tooltip}
            setTooltip={setTooltip}
            onClick={props.onBranchClick}
            isCollapsed={collapsedNodes?.has(link.target.unique_id)}
            isHighlighted={props.highlightedNodes?.has(link.target.unique_id)}
            searchTerm={props.searchTerm}
          />
        ))}

      {/* Render internal nodes */}
      {Array.from(internalNodes.entries())
        .filter(([id, nodeInfo]) => 
          !shouldHideInternalNode(id, nodeInfo, collapsedNodes))
        .map(([id, nodeInfo]) => (
          <InternalNode
            key={`internal-${id}`}
            id={id}
            x={xScale(nodeInfo.x)}
            y={yScale(nodeInfo.y)}
            isHovered={hoveredNode === id}
            onNodeClick={(e) => handleNodeClick(e, id, nodeInfo)}
            onMouseEnter={() => setHoveredNode(id)}
            onMouseLeave={() => setHoveredNode(null)}
          />
        ))}

      {/* Render node labels */}
      {Array.from(internalNodes.entries())
        .filter(([id, nodeInfo]) => 
          !shouldHideInternalNode(id, nodeInfo, collapsedNodes))
        .map(([id, nodeInfo]) => (
          <NodeLabel
            key={`label-${id}`}
            id={id}
            x={xScale(nodeInfo.x)}
            y={yScale(nodeInfo.y) + 5}
            isCollapsed={collapsedNodes?.has(id)}
            label={nodeLabels.get(id)}
            onLabelChange={handleLabelChange}
            internalNodeLabels={props.internalNodeLabels}
            onNodeRename={onNodeRename}
          />
        ))}
    </g>
  );
};

// Default props
Phylotree.defaultProps = {
  showLabels: true,
  skipPlacement: false,
  maxLabelWidth: 20,
  alignTips: "left",
  accessor: defaultAccessor,
  branchStyler: null,
  labelStyler: null,
  tooltip: null,
  sort: null,
  includeBLAxis: false,
  onBranchClick: () => null,
  onContextMenuEvent: null,
  onNodeClick: null,
  collapsedNodes: new Set(),
  renamedNodes: new Map(),
  onNodeRename: null,
};

export default Phylotree;
export { calculateOptimalDimensions, placenodes };
