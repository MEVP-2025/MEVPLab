import { phylotree } from 'phylotree';
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';

const TreeContext = createContext();

const initialState = {
  newick: "",
  treeInstance: null,
  collapsedNodes: new Set(),
  renamedNodes: new Map(),
  merged: {},
  loading: false,
  error: null,
  contextMenu: {
    visible: false,
    position: { x: 0, y: 0 },
    nodeId: null,
    nodeData: null,
    isNodeCollapsed: false,
  },
}

const treeReducer = (state, action) => {
  switch (action.type) {
    case 'SET_NEWICK':
      return { ...state, newick: action.payload, loading: true };
    case 'LOAD_NEW_FILE':
      return {
        ...initialState,
        newick: action.payload,
        loading: true,
      };
    case 'LOAD_WITH_STATE':
      return {
        ...initialState,
        newick: action.payload.newick,
        collapsedNodes: action.payload.collapsedNodes,
        renamedNodes: action.payload.renamedNodes,
        merged: action.payload.merged,
        loading: true,
      };
    case 'PARSE_SUCCESS':
      return { ...state, treeInstance: action.payload, loading: false, error: null };
    case 'PARSE_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'TOGGLE_COLLAPSE': {
      const newSet = new Set(state.collapsedNodes);
      if (newSet.has(action.payload)) newSet.delete(action.payload);
      else newSet.add(action.payload);
      return { ...state, collapsedNodes: newSet };
    }
    case 'RENAME_NODE': {
      const newMap = new Map(state.renamedNodes);
      if (action.payload.name.trim() === "") {
        newMap.delete(action.payload.id);
      } else {
        newMap.set(action.payload.id, action.payload.name);
      }
      return { ...state, renamedNodes: newMap };
    }
    case 'MERGE_NODES': {
      const newMerged = { ...state.merged };
      newMerged[action.payload.id] = action.payload.merged;
      // Also ensure it's collapsed
      const newCollapsed = new Set(state.collapsedNodes);
      newCollapsed.add(action.payload.id);
      return { ...state, merged: newMerged, collapsedNodes: newCollapsed };
    }
    case 'UNMERGE_NODE': {
      const newMerged = { ...state.merged };
      delete newMerged[action.payload];
      const newCollapsed = new Set(state.collapsedNodes);
      newCollapsed.delete(action.payload);
      return { ...state, merged: newMerged, collapsedNodes: newCollapsed };
    }
    case 'UPDATE_MERGED_KEYS':
      // Update merged/collapsed/renamed keys without re-parsing the Newick.
      // Used after useTreeLayout.handleMerged has assigned X|Y ids to
      // nodes that were plain-numeric leaves in the previous render.
      return {
        ...state,
        merged: action.payload.merged,
        collapsedNodes: action.payload.collapsedNodes,
        renamedNodes: action.payload.renamedNodes,
      };
    case 'THRESHOLD_COLLAPSE': {
      const threshold = action.payload;
      const newSet = new Set(state.collapsedNodes);
      const traverse = (node, parentCollapsed = false) => {
        if (!node) return;
        let collapsed = false;
        if (!parentCollapsed && node.children?.length > 0) {
          if (node.data.abstract_x >= threshold) {
            newSet.add(node.unique_id);
            collapsed = true;
          }
        }
        node.children?.forEach(c => traverse(c, parentCollapsed || collapsed));
      };
      if (state.treeInstance?.nodes) traverse(state.treeInstance.nodes);
      return { ...state, collapsedNodes: newSet };
    }
    case 'OPEN_CONTEXT_MENU':
      return { ...state, contextMenu: { ...action.payload, visible: true } };
    case 'CLOSE_CONTEXT_MENU':
      return { ...state, contextMenu: { ...state.contextMenu, visible: false } };
    default:
      return state;
  }
};

export const TreeProvider = ({ children }) => {
  const [state, dispatch] = useReducer(treeReducer, initialState);

  // Auto-reparse when Newick changes OR when loading is set back to true
  // (e.g. loadWithState called with the same Newick string after a reroot)
  useEffect(() => {
    if (!state.newick || !state.loading) return;
    try {
      const tree = new phylotree(state.newick);
      dispatch({ type: 'PARSE_SUCCESS', payload: tree });
    } catch (e) {
      dispatch({ type: 'PARSE_ERROR', payload: e.message });
    }
  }, [state.newick, state.loading]);

  // Wrap actions in useCallback to stable references
  const loadNewick = useCallback((newickStr) => dispatch({ type: 'SET_NEWICK', payload: newickStr }), []);
  const loadNewFile = useCallback((newickStr) => dispatch({ type: 'LOAD_NEW_FILE', payload: newickStr }), []);
  const loadWithState = useCallback((newick, merged, collapsedNodes, renamedNodes) => dispatch({ type: 'LOAD_WITH_STATE', payload: { newick, merged, collapsedNodes, renamedNodes } }), []);
  const toggleCollapse = useCallback((nodeId) => dispatch({ type: 'TOGGLE_COLLAPSE', payload: nodeId }), []);;
  const renameNode = useCallback((id, name) => dispatch({ type: 'RENAME_NODE', payload: { id, name } }), []);
  
  const openContextMenu = useCallback((event, nodeId, nodeData, isNodeCollapsed) => {
    event.preventDefault();
    dispatch({ 
      type: 'OPEN_CONTEXT_MENU', 
      payload: { 
        position: { x: event.clientX, y: event.clientY }, 
        nodeId, 
        nodeData,
        isNodeCollapsed
      } 
    });
  }, []);
  
  const closeContextMenu = useCallback(() => dispatch({ type: 'CLOSE_CONTEXT_MENU' }), []);

  const setMergedNode = useCallback((id, mergedData) => dispatch({ type: 'MERGE_NODES', payload: { id, merged: mergedData } }), []);
  const unmergeNode = useCallback((id) => dispatch({ type: 'UNMERGE_NODE', payload: id }), []);
  const updateMergedKeys = useCallback((merged, collapsedNodes, renamedNodes) => dispatch({ type: 'UPDATE_MERGED_KEYS', payload: { merged, collapsedNodes, renamedNodes } }), []);
  const thresholdCollapse = useCallback((threshold) => dispatch({ type: 'THRESHOLD_COLLAPSE', payload: threshold }), []);

  const contextValue = useMemo(() => ({ 
    state,
    dispatch,
    loadNewick,
    loadNewFile,
    loadWithState,
    updateMergedKeys,
    toggleCollapse,
    thresholdCollapse,
    renameNode,
    openContextMenu,
    closeContextMenu,
    setMergedNode,
    unmergeNode
  }), [state, loadNewick, loadNewFile, loadWithState, updateMergedKeys, toggleCollapse, thresholdCollapse, renameNode, openContextMenu, closeContextMenu, setMergedNode, unmergeNode]);

  return (
    <TreeContext.Provider value={contextValue}>
      {children}
    </TreeContext.Provider>
  )
}

export const useTree = () => useContext(TreeContext);