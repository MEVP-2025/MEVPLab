// src/App.jsx
import { useEffect, useState } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { FileProvider } from './contexts/FileContext';

// Pages
import AnalysisPipelinePage from './pages/AnalysisPipelinePage.jsx';
import HaplotypePage from './pages/HaplotypeNetworkPage.jsx';
import PhylotreePage from './pages/PhylotreePage.jsx';
import SequenceAlignmentPage from './pages/SequenceAlignmentPage.jsx';

// UI
import TitleBar from './bar-components/TitleBar.jsx';
// import FloatingChatManager from './Chat/FloatingChatManager';
import Navbar from './components/Navbar.jsx';

// import css
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import './styles/components/Navbar.css';
// import './styles/components.css'; // Toolkit
// import './styles/globals.css'; // Toolkit
// import './styles/themeToggle.css'; // Toolkit

const App = () => {
  const [theme, setTheme] = useState('light');
  const isMac = window.electronAPI?.platform === 'darwin';

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
    <HashRouter>
      <FileProvider>
        <div className="main-content">
          {isMac && <TitleBar />}

          <Navbar theme={theme} toggleTheme={toggleTheme} />

          <main className="app-main">
            <Routes>
              <Route path="/" element={<AnalysisPipelinePage />} />

              <Route path="/phylotree" element={<PhylotreePage />} />
              <Route path="/haplotype" element={<HaplotypePage />} />
              <Route path="/sequence-alignment" element={<SequenceAlignmentPage />} />
            </Routes>
          </main>

          {/* <FloatingChatManager /> */}
        </div>
      </FileProvider>
    </HashRouter>
  );
};

export default App;