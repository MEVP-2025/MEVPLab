import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logo from '../assets/eDNA_logo.png';
import AnalysisProgressBar from '../features/AnalysisPipeline/components/AnalysisProgressBar.jsx';
import '../styles/components/Navbar.css';
import { FileMenuContent } from './Navbar/FIleMenuLogic.jsx';
import { NavDropdown } from './Navbar/NavComponents.jsx';
import ThemeToggle from './ThemeToggle.jsx';

function MainNavbar({ theme, toggleTheme }) {
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isFileOpen, setIsFileOpen] = useState(false);
  const location = useLocation();

  const isActive = (path) => location.pathname === path;
  
  // 判斷是否需要顯示 File Menu
  const showFileMenu = ['/phylotree', '/sequence-alignment', '/haplotype'].includes(location.pathname);

  return (
    <nav className="navbar">
      {/* Logo */}
      <Link to='/'>
        <img src={logo} alt="eDNA WorkBench Logo" className="navbar-logo" />
      </Link>

      <div className="nav-links">
        {/* Tools Dropdown */}
        <NavDropdown 
          label="Tools" 
          isOpen={isToolsOpen} 
          setIsOpen={setIsToolsOpen}
        >
          <Link to="/analysis" className={`dropdown-item ${isActive('/analysis') ? 'active' : ''}`} onClick={() => setIsToolsOpen(false)}>
            Analysis Pipeline
          </Link>
          <Link to="/sequence-alignment" className={`dropdown-item ${isActive('/sequence-alignment') ? 'active' : ''}`} onClick={() => setIsToolsOpen(false)}>
            MSA Viewer
          </Link>
          <Link to="/haplotype" className={`dropdown-item ${isActive('/haplotype') ? 'active' : ''}`} onClick={() => setIsToolsOpen(false)}>
            ASV Distribution Map
          </Link>
          <Link to="/phylotree" className={`dropdown-item ${isActive('/phylotree') ? 'active' : ''}`} onClick={() => setIsToolsOpen(false)}>
            Phylogenetic Tree Viewer
          </Link>
        </NavDropdown>

        {/* File Dropdown (Dynamic Content) */}
        {showFileMenu && (
          <NavDropdown 
            label="File" 
            isOpen={isFileOpen} 
            setIsOpen={setIsFileOpen}
          >
            <FileMenuContent closeMenu={() => setIsFileOpen(false)} />
          </NavDropdown>
        )}

        {/* Portal Target for Page-Specific Actions */}
        <div id="navbar-action-portal" className="navbar-action-portal"></div>
      </div>

      {/* Right Side: Progress Bar + Theme Toggle */}
      <div className="navbar-right">
        <Link to='/analysis' style={{ textDecoration: 'none' }}>
          <AnalysisProgressBar compact={true} />
        </Link>
        <div className="theme-toggle-container" style={{ margin: 0 }}>
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        </div>
      </div>
    </nav>
  );
}

export default MainNavbar;