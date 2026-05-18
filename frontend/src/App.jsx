// src/App.jsx
import { useEffect, useState } from 'react';
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import { FileProvider } from './contexts/FileContext';

// Pages
import AnalysisPipelinePage from './pages/AnalysisPipelinePage.jsx';
import HaplotypePage from './pages/HaplotypeNetworkPage.jsx';
import HomePage from './pages/HomePage.jsx';
import PhylotreePage from './pages/PhylotreePage.jsx';
import PhylotreeV2Page from './pages/PhylotreeV2.jsx';
import SequenceAlignmentPage from './pages/SequenceAlignmentPage.jsx';

import { AnalysisProvider } from './contexts/AnalysisContext';

// UI
import TitleBar from './components/TitleBar.jsx';
// import FloatingChatManager from './Chat/FloatingChatManager';
import Navbar from './components/MainNavbar.jsx';

// import css
// import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import './styles/components/Navbar.css';
// import './styles/components.css'; // Toolkit
// import './styles/globals.css'; // Toolkit
// import './styles/themeToggle.css'; // Toolkit

const AppContent = () => {
  const [theme, setTheme] = useState('light');
  const isMac = window.electronAPI?.platform === 'darwin';

  const location = useLocation();
  const isHomePage = location.pathname === "/";
  const isPhylotreeV2 = location.pathname === "/phylotree-v2";

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light')
    setTheme(initialTheme)
    document.documentElement.setAttribute('data-theme', initialTheme)
    document.documentElement.setAttribute('data-platform', window.electronAPI?.platform || 'web')
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('theme', newTheme)
  }

  return (
    <AnalysisProvider>
      <FileProvider>
        <div className={`main-content ${isPhylotreeV2 ? 'fixed-layout' : ''}`}>
          { isMac && <TitleBar /> }

          { !isHomePage && <Navbar theme={theme} toggleTheme={toggleTheme} /> }

          <main className={`app-main ${isPhylotreeV2 ? 'fixed-layout' : ''}`}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/analysis" element={<AnalysisPipelinePage />} />
              <Route path="/phylotree" element={<PhylotreePage />} />
              <Route path="/haplotype" element={<HaplotypePage />} />
              <Route path="/sequence-alignment" element={<SequenceAlignmentPage />} />
              <Route path="/phylotree-v2" element={<PhylotreeV2Page />} />
            </Routes>
          </main>

          {/* <FloatingChatManager /> */}
        </div>
      </FileProvider>
    </AnalysisProvider>
  );
};

const App = () => {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  )
}

export default App;