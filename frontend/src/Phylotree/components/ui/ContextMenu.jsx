import { useEffect, useRef } from "react";

/**
 * 樹節點右鍵選單元件
 * @param {Object} props - 元件屬性
 * @param {boolean} props.visible - 是否顯示選單
 * @param {Object} props.position - 選單位置 {x, y}
 * @param {function} props.onClose - 關閉選單處理函數
 * @param {function} props.onCollapseSubtree - 折疊/展開子樹處理函數
 * @param {boolean} props.isNodeCollapsed - 節點是否已折疊
 * @returns {JSX.Element|null} 右鍵選單或null
 */
function ContextMenu({ 
  visible, 
  position, 
  onClose, 
  onCollapseSubtree,
  onMoveToRoot,
  isNodeCollapsed 
}) {
  const menuRef = useRef(null);

  // 監聽點擊事件，當點擊選單外部時關閉選單
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    }

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [visible, onClose]);

  if (!visible) return null;

  const menuStyle = {
    position: 'absolute',
    top: `${position.y}px`,
    left: `${position.x}px`,
    backgroundColor: 'white',
    border: '1px solid #ccc',
    borderRadius: '4px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
    minWidth: '200px',
    zIndex: 1000,
    fontFamily: 'Arial, sans-serif',
    userSelect: 'none'
  };

  const itemStyle = {
    padding: '10px 15px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    borderBottom: '1px solid #eee',
  };

  const collapseText = isNodeCollapsed ? "Expand Subtree" : "Collapse Subtree";

  return (
    <div ref={menuRef} style={menuStyle}>
      <div 
        style={itemStyle} 
        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'} 
        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
        onClick={onCollapseSubtree}
      >
        {collapseText}
      </div>
      <div
        style={itemStyle} 
        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'} 
        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
        onClick={onMoveToRoot}
      >
        Move to Root
      </div>
    </div>
  );
}

export default ContextMenu;