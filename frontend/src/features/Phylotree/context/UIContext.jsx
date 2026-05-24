import { createContext, useCallback, useContext, useState } from 'react';

const UIContext = createContext();

// ── Density presets ────────────────────────────────────────────────
export const DENSITY_PRESETS = {
  compact: {
    branchWidth:      1,
    fontSize:         12,
    nodeRInternal:    3,
    nodeRLeaf:        2,
    nodeRCollapsed:   4,
  },
  normal: {
    branchWidth:      2,
    fontSize:         14,
    nodeRInternal:    4,
    nodeRLeaf:        3,
    nodeRCollapsed:   5,
  },
  large: {
    branchWidth:      3.5,
    fontSize:         17,
    nodeRInternal:    5.5,
    nodeRLeaf:        4,
    nodeRCollapsed:   7,
  },
};

const defaultSettings = {
  width: 800,
  height: 600,
  showInternalLabels: false,
  showBranchLengthAxis: true,
  alignTips: 'left',
  sort: null,
  horizontalSpacing: 20,
  verticalSpacing: 20,
  density: 'normal',
};

export const UIProvider = ({ children }) => {
  const [settings, setSettings] = useState(defaultSettings);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  // Counter-based fit trigger: increment to request a fit-to-view
  const [fitRequest, setFitRequest] = useState(0);
  const requestFit = useCallback(() => setFitRequest(n => n + 1), []);

  const updateSetting = useCallback((key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
    setSearchTerm("");
    setSearchResults([]);
  }, []);

  return (
    <UIContext.Provider value={{ 
      settings, 
      updateSetting,
      resetSettings,
      fitRequest,
      requestFit,
      searchTerm, 
      setSearchTerm,
      searchResults, 
      setSearchResults 
    }}>
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => useContext(UIContext);