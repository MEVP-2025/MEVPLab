import { useEffect } from 'react';
import MainLayout from './components/layout/MainLayout';
import { TreeProvider, useTree } from './context/TreeContext';
import { UIProvider, useUI } from './context/UIContext';
import './styles/phylotree.css';

function TreeLoader({ data }) {
  const { loadNewFile } = useTree();
  const { resetSettings } = useUI();

  useEffect(() => {
    if (data) {
      loadNewFile(data);
      resetSettings();
    }
  }, [data, loadNewFile, resetSettings]);

  return null;
}

function App({ initialNewick }) {
  return (
    <TreeProvider>
      <UIProvider>
        <TreeLoader data={initialNewick} />
        <MainLayout />
      </UIProvider>
    </TreeProvider>
  );
}

export default App;