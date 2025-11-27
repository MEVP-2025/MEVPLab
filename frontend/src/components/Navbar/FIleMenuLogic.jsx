// components/Navbar/FileMenuLogic.jsx
import { useLocation } from 'react-router-dom';
import { useFileContext } from '../contexts/FileContext';
import { FastaSelector, UploadMenuItem } from './NavComponents';

export const FileMenuContent = ({ closeMenu }) => {
  const location = useLocation();
  const context = useFileContext(); // 一次取得所有 context

  // 定義每個頁面需要的選單內容 (策略模式)
  const renderers = {
    '/phylotree': () => (
      <UploadMenuItem
        label="Upload Newick"
        currentFile={context.phylotreeFileName}
        accept=".nwk,.newick,.txt"
        onChange={(e) => { context.handlePhylotreeFileChange(e); closeMenu(); }}
      />
    ),
    '/sequence-alignment': () => (
      <>
        <UploadMenuItem
          label={context.haplotypeFiles.length > 0 ? "Add More Fasta" : "Upload Fasta"}
          currentFile={context.haplotypeFiles.length > 0 ? `${context.haplotypeFiles.length} uploaded` : null}
          accept=".fa,.fasta,.txt"
          onChange={(e) => { context.handleHaplotypeFileChange(e); closeMenu(); }}
        />
        <FastaSelector 
          files={context.haplotypeFiles} 
          selectedIndex={context.selectedHaplotypeIndex}
          onSelect={context.setSelectedHaplotypeIndex}
        />
      </>
    ),
    '/haplotype': () => (
      <>
        <UploadMenuItem
          label="Upload Fasta"
          currentFile={context.haplotypeFiles.length > 0 ? `${context.haplotypeFiles.length} files` : null}
          accept=".fa,.fasta,.txt"
          onChange={(e) => { context.handleHaplotypeFileChange(e); closeMenu(); }}
        />
        <FastaSelector 
          files={context.haplotypeFiles} 
          selectedIndex={context.selectedHaplotypeIndex}
          onSelect={context.setSelectedHaplotypeIndex}
        />
        <div className="border-t my-1"></div> {/* 分隔線 */}
        <UploadMenuItem
          label="Upload CSV"
          currentFile={context.csvFileName}
          accept=".csv"
          onChange={(e) => { context.handleCsvFileChange(e); closeMenu(); }}
        />
        <UploadMenuItem
          label="Upload eDNA (XLSX)"
          currentFile={context.eDnaSampleFileName}
          accept=".xlsx"
          onChange={(e) => { context.handleEDnaSampleChange(e); closeMenu(); }}
        />
      </>
    )
  };

  // 根據當前路徑執行對應的 renderer
  const renderer = renderers[location.pathname];
  
  // 如果這個路徑沒有定義 renderer，就不顯示內容
  return renderer ? renderer() : null;
};