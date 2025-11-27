// src/components/Navbar.jsx
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logo from '../assets/MEVP_logo.png';
import { useFileContext } from '../contexts/FileContext';
import ThemeToggle from './ThemeToggle.jsx';

function MainNavbar({ theme, toggleTheme }) {
  const location = useLocation();
  const {
    phylotreeFileName,
    haplotypeFiles,
    selectedHaplotypeIndex,
    csvFileName,
    eDnaSampleFileName,
    eDnaTagsFileName,
    setSelectedHaplotypeIndex,
    handlePhylotreeFileChange,
    handleHaplotypeFileChange,
    handleCsvFileChange,
    handleEDnaSampleChange,
    handleEDnaTagsChange,
  } = useFileContext();

  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isFileOpen, setIsFileOpen] = useState(false);
  const [isFastaDropdownOpen, setIsFastaDropdownOpen] = useState(false);
  const toolsDropdownRef = useRef(null);
  const fileDropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (isToolsOpen && toolsDropdownRef.current && !toolsDropdownRef.current.contains(event.target)) {
        setIsToolsOpen(false);
      }
      if (isFileOpen && fileDropdownRef.current && !fileDropdownRef.current.contains(event.target)) {
        setIsFileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isToolsOpen, isFileOpen]);

  const closeMenu = () => {
    setIsToolsOpen(false);
    setIsFileOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  const renderFileMenuContent = () => {
    const path = location.pathname;

    // Common Fasta Selector Component
    const FastaSelector = () => (
      haplotypeFiles.length > 0 && (
        <div style={{ padding: '5px 15px' }}>
          <div 
            onClick={(e) => { e.stopPropagation(); setIsFastaDropdownOpen(!isFastaDropdownOpen); }}
            style={{ 
              padding: '6px 10px', 
              backgroundColor: '#e6f0ff',
              borderRadius: '4px', 
              color: '#0066cc',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.9rem',
              fontWeight: 500
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
              {haplotypeFiles[selectedHaplotypeIndex]?.name || "Select Fasta"}
            </span>
            <span style={{ fontSize: '0.7rem', marginLeft: '5px' }}>▼</span>
          </div>
          
          {isFastaDropdownOpen && (
            <div style={{ 
              border: '1px solid var(--border)', 
              marginTop: '4px', 
              borderRadius: '4px', 
              backgroundColor: 'var(--card)',
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              {haplotypeFiles.map((file, idx) => (
                 <div 
                   key={idx}
                   className="dropdown-item"
                   onClick={() => { setSelectedHaplotypeIndex(idx); setIsFastaDropdownOpen(false); }}
                   style={{ 
                     padding: '8px 10px', 
                     fontSize: '0.85rem',
                     backgroundColor: selectedHaplotypeIndex === idx ? 'var(--secondary)' : 'transparent',
                     color: selectedHaplotypeIndex === idx ? 'var(--primary)' : 'var(--foreground)'
                   }}
                 >
                   {file.name}
                 </div>
              ))}
            </div>
          )}
        </div>
      )
    );

    // Phylotree Page
    if (path === '/phylotree') {
      return (
        <label className="dropdown-item">
          {phylotreeFileName ? `Current: ${phylotreeFileName}` : "Upload Newick"}
          <input
            type="file"
            accept=".nwk,.newick,.txt"
            onChange={(e) => { handlePhylotreeFileChange(e); closeMenu(); }}
            style={{ display: "none" }}
          />
        </label>
      );
    }

    // Sequence Alignment Page
    if (path === '/sequence-alignment') {
      return (
        <>
          <label className="dropdown-item">
            {haplotypeFiles.length > 0 ? `Fasta Files: ${haplotypeFiles.length} uploaded` : "Upload Fasta"}
            <input
              type="file"
              accept=".fa,.fasta,.txt"
              multiple
              onChange={(e) => { handleHaplotypeFileChange(e); closeMenu(); }}
              style={{ display: "none" }}
            />
          </label>
          <FastaSelector />
        </>
      );
    }

    // Haplotype Network Page
    if (path === '/haplotype') {
      return (
        <>
          <label className="dropdown-item">
            {haplotypeFiles.length > 0 ? `Fasta Files: ${haplotypeFiles.length} uploaded` : "Upload Fasta"}
            <input
              type="file"
              accept=".fa,.fasta,.txt"
              multiple
              onChange={(e) => { handleHaplotypeFileChange(e); closeMenu(); }}
              style={{ display: "none" }}
            />
          </label>
          <FastaSelector />
          
          <label className="dropdown-item">
            {csvFileName ? `CSV: ${csvFileName}` : "Upload CSV"}
            <input
              type="file"
              accept=".csv"
              onChange={(e) => { handleCsvFileChange(e); closeMenu(); }}
              style={{ display: "none" }}
            />
          </label>

          <label className="dropdown-item">
            {eDnaSampleFileName ? `eDNA: ${eDnaSampleFileName}` : "Upload eDNA Sample Station (XLSX)"}
            <input
              type="file"
              accept=".xlsx"
              onChange={(e) => { handleEDnaSampleChange(e); closeMenu(); }}
              style={{ display: "none" }}
            />
          </label>
        </>
      );
    }

    return null;
  };

  const fileMenuContent = renderFileMenuContent();

  return (
    <nav className="navbar">
      <Link to='/'>
        <img src={logo} alt="MEVP Logo" className="navbar-logo" />
      </Link>

      <div className="nav-links">
        {/* Tools Dropdown */}
        <div className="dropdown" ref={toolsDropdownRef}>
          <div className={`nav-item ${isActive('/analysis') || isActive('/phylotree') || isActive('/sequence-alignment') || isActive('/haplotype') ? 'active' : ''}`} onClick={() => setIsToolsOpen(!isToolsOpen)}>
            Tools ▾
          </div>
          <div className={`dropdown-menu ${isToolsOpen ? 'show' : ''}`}>
            <Link to="/analysis" className={`dropdown-item ${isActive('/analysis') ? 'active' : ''}`} onClick={closeMenu}>
              Analysis Pipeline
            </Link>
            <Link to="/phylotree" className={`dropdown-item ${isActive('/phylotree') ? 'active' : ''}`} onClick={closeMenu}>
              Phylotree
            </Link>
            <Link to="/sequence-alignment" className={`dropdown-item ${isActive('/sequence-alignment') ? 'active' : ''}`} onClick={closeMenu}>
              Sequence Alignment
            </Link>
            <Link to="/haplotype" className={`dropdown-item ${isActive('/haplotype') ? 'active' : ''}`} onClick={closeMenu}>
              Haplotype Network
            </Link>
          </div>
        </div>

        {/* File Dropdown*/}
        {fileMenuContent && (
          <div className="dropdown" ref={fileDropdownRef}>
            <div className="nav-item" onClick={() => setIsFileOpen(!isFileOpen)}>
              File ▾
            </div>
            <div className={`dropdown-menu ${isFileOpen ? 'show' : ''}`}>
              {fileMenuContent}
            </div>
          </div>
        )}
      </div>

      <div className="theme-toggle-container">
        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
      </div>
    </nav>
  );
}

export default MainNavbar;