import {
  faAlignLeft,
  faAlignRight,
  faArrowDown,
  faArrowLeft,
  faArrowRight,
  faArrowUp,
  faSortAmountUp,
} from "@fortawesome/free-solid-svg-icons";
import React from "react";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import { BUTTON_TITLES } from "../../constants/treeConstants";
import IconButton from "../../shared/buttons/IconButton";

/**
 * 樹狀圖控制按鈕群組
 * @param {Object} props - 元件屬性
 * @param {function} props.onExpandHorizontal - 水平展開處理函數
 * @param {function} props.onCompressHorizontal - 水平壓縮處理函數
 * @param {function} props.onExpandVertical - 垂直展開處理函數
 * @param {function} props.onCompressVertical - 垂直壓縮處理函數
 * @param {function} props.onSortAscending - 升序排序處理函數
 * @param {function} props.onSortDescending - 降序排序處理函數
 * @param {function} props.onAlignTipsLeft - 將標籤對齊左側處理函數
 * @param {function} props.onAlignTipsRight - 將標籤對齊右側處理函數
 * @returns {JSX.Element} 控制按鈕群組
 */
function ControlButtons({
  onExpandHorizontal,
  onCompressHorizontal,
  onExpandVertical,
  onCompressVertical,
  onSortAscending,
  onSortDescending,
  onAlignTipsLeft,
  onAlignTipsRight,
}) {
  return (
    <ButtonGroup>
      <IconButton
        title={BUTTON_TITLES.EXPAND_V}
        icons={[faArrowUp, faArrowDown]}
        onClick={onExpandVertical}
        style={{ fontSize: 10, display: "flex", flexDirection: "column" }}
      />
      
      <IconButton
        title={BUTTON_TITLES.COMPRESS_V}
        icons={[faArrowDown, faArrowUp]}
        onClick={onCompressVertical}
        style={{ fontSize: 10, display: "flex", flexDirection: "column" }}
      />
      
      <IconButton
        title={BUTTON_TITLES.EXPAND_H}
        icons={[faArrowLeft, faArrowRight]}
        onClick={onExpandHorizontal}
        style={{ fontSize: 10 }}
      />
      
      <IconButton
        title={BUTTON_TITLES.COMPRESS_H}
        icons={[faArrowRight, faArrowLeft]}
        onClick={onCompressHorizontal}
        style={{ fontSize: 10 }}
      />
      
      <IconButton
        title={BUTTON_TITLES.SORT_ASC}
        icons={faSortAmountUp}
        onClick={onSortAscending}
        style={{ transform: "rotate(180deg)" }}
      />
      
      <IconButton
        title={BUTTON_TITLES.SORT_DESC}
        icons={faSortAmountUp}
        onClick={onSortDescending}
      />
      
      <IconButton
        title={BUTTON_TITLES.ALIGN_LEFT}
        icons={faAlignLeft}
        onClick={onAlignTipsLeft}
      />
      
      <IconButton
        title={BUTTON_TITLES.ALIGN_RIGHT}
        icons={faAlignRight}
        onClick={onAlignTipsRight}
      />
    </ButtonGroup>
  );
}

export default ControlButtons;