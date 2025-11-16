import React, { useEffect, useState, useRef } from "react";
import { FixedSizeList as List } from "react-window";
import "./SequencealignmentAPP.css";

function SequencealignmentAPP({ haplotypeContent }) {
  const [sequences, setSequences] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [selectedPositions, setSelectedPositions] = useState(new Set());

  const leftListRef = useRef(null);
  const rightListRef = useRef(null);
 
  const scrollingSideRef = useRef(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editInput, setEditInput] = useState("");



  // 當 haplotypeContent 更新時解析 FASTA 序列
  useEffect(() => {
    if (haplotypeContent) {
      const parsed = parseFasta(haplotypeContent);
      setSequences(parsed);
      setSelectedPositions(new Set());
    }
  }, [haplotypeContent]);

  // FASTA 格式解析函數
  const parseFasta = (text) => {
    const sequences = [];
    const lines = text.split("\n");
    let currentId = "";
    let currentSeq = "";
    for (const line of lines) {
      if (line.startsWith(">")) {
        if (currentId) {
          sequences.push({ id: currentId, sequence: currentSeq });
        }
        currentId = line.substring(1).trim();
        currentSeq = "";
      } else {
         currentSeq += line.trim().replace(/ /g, "").toUpperCase(); // 轉成大寫
      }
    }
    if (currentId) {
      sequences.push({ id: currentId, sequence: currentSeq });
    }
    return sequences;
  };

  // 儲存編輯歷史以支援復原與重做
  const saveToHistory = (newSequences) => {
    setHistory((prev) => [...prev, sequences]);
    setRedoStack([]);
    setSequences(newSequences);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setRedoStack((r) => [...r, sequences]);
    setSequences(prev);
    setHistory((h) => h.slice(0, h.length - 1));
    setSelectedPositions(new Set());
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setHistory((h) => [...h, sequences]);
    setSequences(next);
    setRedoStack((r) => r.slice(0, r.length - 1));
    setSelectedPositions(new Set());
  };

  // 取得合併後的連續選取區段
  const getMergedRangesFromPositions = () => {
    const sorted = [...selectedPositions].sort((a, b) => a - b);
    const ranges = [];
    if (sorted.length === 0) return ranges;
    let start = sorted[0], end = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === end + 1) {
        end = sorted[i];
      } else {
        ranges.push([start, end]);
        start = sorted[i];
        end = sorted[i];
      }
    }
    ranges.push([start, end]);
    return ranges;
  };

  // 區段編輯：將選取區段替換為使用者輸入內容
const handlePartialEdit = () => {
  if (selectedPositions.size === 0) return;
  setIsEditing(true);
  setEditInput(""); // 清空初始輸入
};

const applyEditInput = () => {
  const sanitized = editInput.toUpperCase().replace(/[^ATCG\-]/g, "");
  const ranges = getMergedRangesFromPositions();
  if (ranges.length === 0) return;

  const updated = sequences.map((seq) => {
    let seqChars = seq.sequence.split("");
    for (const [start, end] of ranges) {
      const len = end - start + 1;
      const padded = sanitized.padEnd(len, "-").slice(0, len);
      for (let i = 0; i < len; i++) {
        seqChars[start + i] = padded[i];
      }
    }
    return { ...seq, sequence: seqChars.join("") };
  });

  saveToHistory(updated);
  setSelectedPositions(new Set());
  setIsEditing(false);
  setEditInput("");
};


  // 區段刪除：將選取區段設為 '-'
const handlePartialDelete = () => {
  if (selectedPositions.size === 0) return;
  const ranges = getMergedRangesFromPositions();
  if (ranges.length === 0) return;

  const updated = sequences.map((seq) => {
    let seqChars = seq.sequence.split("");
    for (const [start, end] of ranges.reverse()) {
      seqChars.splice(start, end - start + 1); // 直接刪除
    }
    return { ...seq, sequence: seqChars.join("") };
  });

  saveToHistory(updated);
  setSelectedPositions(new Set());
};



  // 切換位置是否被選取
  const togglePosition = (pos) => {
    setSelectedPositions((prev) => {
      const newSet = new Set(prev);
      newSet.has(pos) ? newSet.delete(pos) : newSet.add(pos);
      return newSet;
    });
  };

  // 將序列字元加上樣式並顯示
  const colorSequence = (sequence) =>
    sequence.split("").map((char, index) => {
      let bgClass = "";
      switch (char.toLowerCase()) {
        case "a": bgClass = "bg-a"; break;
        case "t": bgClass = "bg-t"; break;
        case "c": bgClass = "bg-c"; break;
        case "g": bgClass = "bg-g"; break;
        case "-": bgClass = "bg-large"; break;
        default: bgClass = "bg-other";
      }
      const isSelected = selectedPositions.has(index);
      return (
        <span
          key={index}
          className={`${bgClass} ${isSelected ? "pos-selected" : ""}`}
          title={`Location ${index + 1}, character: ${char}`}
        >
          {char}
        </span>
      );
    });

  const filteredSequences = sequences.filter(
    (seq) =>
      seq.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      seq.sequence.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const maxSequenceLength = Math.max(
    ...filteredSequences.map((seq) => seq.sequence.length),
    0
  );

  const RowHeight = 30;
  const charWidth = 20;

  // 左側每列顯示 ID
  const LeftRow = ({ index, style }) => {
    if (index === 0) return <div style={{ ...style, backgroundColor: "#f0f0f0" }} />;
    return (
      <div className="sequence-id-cell" style={style}>
        {filteredSequences[index - 1]?.id}
      </div>
    );
  };

  const listCount = filteredSequences.length + 1;

  // 滾動同步邏輯
  const handleLeftScroll = ({ scrollOffset }) => {
  if (scrollingSideRef.current !== "left") {
    scrollingSideRef.current = "left";
    rightListRef.current?.scrollTo(scrollOffset);
  }
  scrollingSideRef.current = null;
};

const handleRightScroll = ({ scrollOffset }) => {
  if (scrollingSideRef.current !== "right") {
    scrollingSideRef.current = "right";
    leftListRef.current?.scrollTo(scrollOffset);
  }
  scrollingSideRef.current = null;
};

const CustomInnerElement = React.forwardRef(({ children, ...rest }, ref) => (
  <div ref={ref} {...rest} style={{ ...rest.style, paddingBottom: "20px" }}>
    {children}
  </div>
));



  return (
    <div className="alignment-container">
      {/* 搜尋列 */}
      <div className="search-container">
        <input
          type="text"
          placeholder="Search sequence or ID"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button onClick={() => setSearchTerm("")}>Clear</button>
      </div>

      {/* 功能按鈕列 */}
      <div style={{ marginBottom: 10, display: "flex", gap: 10 }}>
        <button onClick={handlePartialEdit} disabled={selectedPositions.size === 0} title="編輯所有選取位置字元">
          edit
        </button>
        <button onClick={handlePartialDelete} disabled={selectedPositions.size === 0} title="刪除所有選取位置字元">
          delete
        </button>
        <button onClick={handleUndo} disabled={history.length === 0}>Previous step</button>
        <button onClick={handleRedo} disabled={redoStack.length === 0}>recover</button>
      </div>

      {isEditing && (
  <div style={{ marginBottom: 10 }}>
    <label>
      Enter new sequence（A/T/C/G/-）：
      <input
        type="text"
        value={editInput}
        onChange={(e) =>
          setEditInput(e.target.value.toUpperCase().replace(/[^ATCG\-]/g, ""))
        }
        style={{ marginLeft: 10, fontSize: 16, width: 300 }}
      />
    </label>
    <button onClick={applyEditInput} style={{ marginLeft: 10 }}>
      confirm
    </button>
    <button onClick={() => setIsEditing(false)} style={{ marginLeft: 5 }}>
      Cancel
    </button>
  </div>
)}


      {/* 主視圖容器 */}
      <div className="alignment-wrapper" style={{ display: "flex", border: "1px solid #ccc" }}>
         <div className="shared-scroll-wrapper">
        {/* 左側 ID List */}
        <List
          height={600}
          itemCount={listCount}
          itemSize={RowHeight}
          width={700}
          ref={leftListRef}
          className="left-list"
          onScroll={handleLeftScroll}
          innerElementType={CustomInnerElement}
        >
          {LeftRow}
        </List>
        </div>

        {/* 右側序列 List */}
        <div className="sequence-scroll-wrapper">
          <div className="sequence-scroll-inner" style={{ width: `${maxSequenceLength * charWidth}px` }}>
            {/* Header Checkbox */}
            <div className="right-header" style={{ height: RowHeight }}>
              {Array.from({ length: maxSequenceLength }, (_, idx) => (
                <label key={idx} title={`選取位置 ${idx + 1}`}>
                  <input
                    type="checkbox"
                    checked={selectedPositions.has(idx)}
                    onChange={() => togglePosition(idx)}
                  />
                </label>
              ))}
            </div>

            <List
              height={600}
              itemCount={listCount - 1}
              itemSize={RowHeight}
              width={Math.max(maxSequenceLength * charWidth, 400)}
              ref={rightListRef}
              onScroll={handleRightScroll}
              className="right-list"
              innerElementType={CustomInnerElement}
            >
              {({ index, style }) => {
                const seq = filteredSequences[index]?.sequence || "";
                return (
                  <div className="sequence-seq-cell" style={style}>
                    <div className="sequence-scroll-line">{colorSequence(seq)}</div>
                  </div>
                );
              }}
            </List>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SequencealignmentAPP;
