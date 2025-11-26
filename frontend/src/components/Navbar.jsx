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

    // Phylotree Page
    if (path === '/phylotree') {
      return (
        <>
          <label className="dropdown-item">
            Upload Newick
            <input
              type="file"
              accept=".nwk,.newick,.txt"
              onChange={(e) => { handlePhylotreeFileChange(e); closeMenu(); }}
              style={{ display: "none" }}
            />
          </label>
          {phylotreeFileName && (
            <div className="dropdown-item" style={{ cursor: 'default', color: 'var(--primary)' }}>
              Current: {phylotreeFileName}
            </div>
          )}
        </>
      );
    }

    // Sequence Alignment Page
    if (path === '/sequence-alignment') {
      return (
        <>
          <label className="dropdown-item">
            Upload Fasta
            <input
              type="file"
              accept=".fa,.fasta,.txt"
              multiple
              onChange={(e) => { handleHaplotypeFileChange(e); closeMenu(); }}
              style={{ display: "none" }}
            />
          </label>
          {haplotypeFiles.length > 0 && (
            <div className="dropdown-item" style={{ cursor: 'default', color: 'var(--primary)' }}>
              {haplotypeFiles.length} files uploaded
            </div>
          )}
        </>
      );
    }

    // Haplotype Network Page
    if (path === '/haplotype') {
      return (
        <>
          <label className="dropdown-item">
            Upload Fasta
            <input
              type="file"
              accept=".fa,.fasta,.txt"
              multiple
              onChange={(e) => { handleHaplotypeFileChange(e); closeMenu(); }}
              style={{ display: "none" }}
            />
          </label>
          
          <label className="dropdown-item">
            Upload CSV
            <input
              type="file"
              accept=".csv"
              onChange={(e) => { handleCsvFileChange(e); closeMenu(); }}
              style={{ display: "none" }}
            />
          </label>

          <label className="dropdown-item">
            Upload EDNA Sample Station
            <input
              type="file"
              accept=".xlsx"
              onChange={(e) => { handleEDnaSampleChange(e); closeMenu(); }}
              style={{ display: "none" }}
            />
          </label>

          {/* File Status Display */}
          {(haplotypeFiles.length > 0 || csvFileName || eDnaSampleFileName) && (
            <>
              <div className="dropdown-item" style={{ cursor: 'default', fontWeight: 600, borderTop: '1px solid var(--border)', marginTop: 5, paddingTop: 10 }}>
                Loaded Files
              </div>
              
              {haplotypeFiles.length > 0 && (
                 <div className="dropdown-item" style={{ cursor: 'default', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
                    Fasta Files ({haplotypeFiles.length})
                 </div>
              )}
              
              {haplotypeFiles.map((file, idx) => (
                <div 
                  key={idx} 
                  className={`dropdown-item ${selectedHaplotypeIndex === idx ? 'active' : ''}`}
                  onClick={() => { setSelectedHaplotypeIndex(idx); closeMenu(); }}
                  style={{ paddingLeft: 25 }}
                >
                  {file.name}
                </div>
              ))}

              {csvFileName && (
                <div className="dropdown-item active" style={{ cursor: 'default' }}>
                  CSV: {csvFileName}
                </div>
              )}
              
              {eDnaSampleFileName && (
                <div className="dropdown-item active" style={{ cursor: 'default' }}>
                  EDNA: {eDnaSampleFileName}
                </div>
              )}
            </>
          )}
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