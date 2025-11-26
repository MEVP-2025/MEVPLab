// src/App.jsx
import { useEffect, useState } from 'react';
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import { FileProvider } from './contexts/FileContext';

// Pages
import AnalysisPipelinePage from './pages/AnalysisPipelinePage.jsx';
import HaplotypePage from './pages/HaplotypeNetworkPage.jsx';
import HomePage from './pages/HomePage.jsx';
import PhylotreePage from './pages/PhylotreePage.jsx';
import SequenceAlignmentPage from './pages/SequenceAlignmentPage.jsx';

// UI
import TitleBar from './components/TitleBar.jsx';
// import FloatingChatManager from './Chat/FloatingChatManager';
import Navbar from './components/Navbar.jsx';

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

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light')
    setTheme(initialTheme)
    document.documentElement.setAttribute('data-theme', initialTheme)
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('theme', newTheme)
  }

  return (
    <FileProvider>
      <div className="main-content">
        { isMac && <TitleBar /> }

        { !isHomePage && <Navbar theme={theme} toggleTheme={toggleTheme} /> }

        <main className="app-main">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/analysis" element={<AnalysisPipelinePage />} />
            <Route path="/phylotree" element={<PhylotreePage />} />
            <Route path="/haplotype" element={<HaplotypePage />} />
            <Route path="/sequence-alignment" element={<SequenceAlignmentPage />} />
          </Routes>
        </main>

        {/* <FloatingChatManager /> */}
      </div>
    </FileProvider>
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