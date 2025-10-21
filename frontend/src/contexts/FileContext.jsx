import { createContext, useContext, useState } from 'react';
import * as XLSX from "xlsx";

const FileContext = createContext(null);

export function FileProvider({ children }) {
  const [phylotreeContent, setPhylotreeContent] = useState('');
  const [phylotreeFileName, setPhylotreeFileName] = useState('');

  const [haplotypeFiles, setHaplotypeFiles] = useState([]); // [{name, content}]
  const [selectedHaplotypeIndex, setSelectedHaplotypeIndex] = useState(null);

  const [csvContent, setCsvContent] = useState('');
  const [csvFileName, setCsvFileName] = useState('');

  const [eDnaSampleContent, setEDnaSampleContent] = useState('');
  const [eDnaTagsContent, setEDnaTagsContent] = useState('');
  const [eDnaSampleFileName, setEDnaSampleFileName] = useState('');
  const [eDnaTagsFileName, setEDnaTagsFileName] = useState('');

  // Handle Newick
  const handlePhylotreeFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setPhylotreeFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhylotreeContent(e.target.result);
    };
    reader.readAsText(file);
  };

  // Handle multiple fasta upload
  const handleHaplotypeFileChange = (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setHaplotypeFiles((prev) => [
          ...prev,
          { name: file.name, content: e.target.result },
        ]);

        if (selectedHaplotypeIndex === null) {
          setSelectedHaplotypeIndex(0);
        }
      };
      reader.readAsText(file);
    });
  };

  // Handle CSV upload
  const handleCsvFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setCsvFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      setCsvContent(e.target.result);
    };
    reader.readAsText(file);
  };

  // Parse eDNA Sample Station
  const handleEDnaSampleChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setEDnaSampleFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      setEDnaSampleContent(jsonData);
    };
    reader.readAsArrayBuffer(file);
  };

  // Parse eDNA Tags
  const handleEDnaTagsChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setEDnaTagsFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      setEDnaTagsContent(jsonData);
    };
    reader.readAsArrayBuffer(file);
  };
  // ... (複製你原本 App.jsx 中的所有檔案處理函式) ...

  // 3. 定義要共享出去的 value
  const value = {
    // state
    phylotreeContent,
    phylotreeFileName,
    haplotypeFiles,
    selectedHaplotypeIndex,
    csvContent,
    csvFileName,
    eDnaSampleContent,
    eDnaTagsContent,
    eDnaSampleFileName,
    eDnaTagsFileName,
    // handler
    setSelectedHaplotypeIndex,
    handlePhylotreeFileChange,
    handleHaplotypeFileChange,
    handleCsvFileChange,
    handleEDnaSampleChange,
    handleEDnaTagsChange,
  };

  return <FileContext.Provider value={value}>{children}</FileContext.Provider>;
}

export function useFileContext() {
  const context = useContext(FileContext);
  if (context === null) {
    throw new Error('useFileContext must be used within a FileProvider');
  }
  return context;
}