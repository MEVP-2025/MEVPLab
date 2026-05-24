import { useEffect, useRef } from "react";

/**
 * Right-click context menu for tree nodes.
 *
 * @param {{
 *   visible: boolean,
 *   position: { x: number, y: number },
 *   onClose: () => void,
 *   onCollapseSubtree: () => void,
 *   onMoveToRoot: () => void,
 *   isNodeCollapsed: boolean,
 * }} props
 */
function ContextMenu({ visible, position, onClose, onCollapseSubtree, onMoveToRoot, isNodeCollapsed }) {
  const menuRef = useRef(null);

  useEffect(() => {
    if (!visible) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div
      ref={menuRef}
      className="rp-context-menu"
      style={{ top: position.y, left: position.x }}
    >
      <button className="rp-context-menu__item" onClick={onCollapseSubtree}>
        {isNodeCollapsed ? 'Expand Subtree' : 'Collapse Subtree'}
      </button>
      <button className="rp-context-menu__item" onClick={onMoveToRoot}>
        Move to Root
      </button>
    </div>
  );
}

export default ContextMenu;