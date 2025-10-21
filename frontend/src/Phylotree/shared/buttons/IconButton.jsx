import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import RBButton from "react-bootstrap/Button";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";

/**
 * 通用圖示按鈕元件
 * @param {Object} props - 元件屬性
 * @param {string} props.title - 按鈕提示文字
 * @param {Array|Object} props.icons - FontAwesome圖示
 * @param {string} props.variant - 按鈕變體
 * @param {function} props.onClick - 點擊處理函數
 * @param {Object} props.style - 自訂樣式
 * @returns {JSX.Element} 按鈕元件
 */
function IconButton({ title, icons, variant = "secondary", onClick, style, ...restProps }) {
  return (
    <OverlayTrigger placement="top" overlay={<Tooltip>{title}</Tooltip>}>
      <RBButton variant={variant} onClick={onClick} style={style} {...restProps}>
        {Array.isArray(icons) ? (
          icons.map((icon, index) => <FontAwesomeIcon key={index} icon={icon} />)
        ) : (
          <FontAwesomeIcon icon={icons} />
        )}
      </RBButton>
    </OverlayTrigger>
  );
}

export default IconButton;