import { useCallback, useState } from "react";

/**
 * Manages tooltip visibility and position for SVG-based tree nodes.
 *
 * @returns {{
 *   tooltip: { visible: boolean, x: number, y: number, data: object } | null,
 *   showTooltip: (x: number, y: number, data: object) => void,
 *   hideTooltip: () => void,
 * }}
 */
export const useTooltip = () => {
  const [tooltip, setTooltip] = useState(null);

  const showTooltip = useCallback((x, y, data) => {
    setTooltip({ visible: true, x, y, data });
  }, []);

  const hideTooltip = useCallback(() => {
    setTooltip(null);
  }, []);

  return { tooltip, showTooltip, hideTooltip };
};
