// components/Navbar/NavComponents.jsx
import React, { useEffect, useRef } from 'react';

// 1. 封裝通用的 Dropdown 邏輯 (處理點擊外部關閉)
export const NavDropdown = ({ label, icon, isOpen, setIsOpen, children }) => {
  const ref = useRef(null);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, setIsOpen]);

  return (
    <div className="relative" ref={ref}>
      <button 
        className={`px-3 py-2 hover:text-blue-600 ${isOpen ? 'text-blue-600' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {label} {icon || '▾'}
      </button>
      {isOpen && (
        <div className="absolute top-full right-0 mt-1 min-w-[200px] bg-white border border-gray-200 shadow-lg rounded-md py-1 z-50">
          {children}
        </div>
      )}
    </div>
  );
};

// 2. 封裝上傳按鈕 Item (解決重複的 input 隱藏邏輯)
export const UploadMenuItem = ({ label, accept, onChange, currentFile }) => (
  <label className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
    <div className="flex flex-col">
      <span className="font-medium">{currentFile ? `Current: ${currentFile}` : label}</span>
      {currentFile && <span className="text-xs text-green-600">已選擇</span>}
    </div>
    <input
      type="file"
      accept={accept}
      onChange={onChange}
      className="hidden" // 隱藏原生 input
    />
  </label>
);

// 3. 封裝 Fasta 選擇器 (原本寫在 render 裡面的那個)
export const FastaSelector = ({ files, selectedIndex, onSelect }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  
  if (!files || files.length === 0) return null;

  return (
    <div className="px-4 py-2">
      <div 
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className="bg-blue-50 text-blue-700 px-3 py-2 rounded text-sm flex justify-between items-center cursor-pointer"
      >
        <span className="truncate max-w-[150px]">{files[selectedIndex]?.name || "Select Fasta"}</span>
        <span>▼</span>
      </div>
      
      {isOpen && (
        <div className="mt-1 border rounded bg-white max-h-40 overflow-y-auto shadow-inner">
          {files.map((file, idx) => (
            <div 
              key={idx}
              onClick={() => { onSelect(idx); setIsOpen(false); }}
              className={`px-3 py-2 text-xs cursor-pointer hover:bg-gray-100 ${selectedIndex === idx ? 'bg-blue-100 text-blue-800' : ''}`}
            >
              {file.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};