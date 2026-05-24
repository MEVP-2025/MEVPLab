import { useState } from 'react';
import '../../styles/layout/MainLayout.css';
import SidebarLeft from './SidebarLeft.jsx';
import SidebarRight from './SidebarRight.jsx';
import TreeViewer from './TreeViewer.jsx';

const MainLayout = () => {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  return (
    <div
      className='phylotree-viewer'
      data-left={leftOpen ? 'open' : 'closed'}
      data-right={rightOpen ? 'open' : 'closed'}
    >
      <div className='sidebar-left'>
        <SidebarLeft isOpen={leftOpen} onToggle={() => setLeftOpen(o => !o)} />
      </div>

      <div className='tree-viewer'>
        <TreeViewer />
      </div>

      <div className='sidebar-right'>
        <SidebarRight isOpen={rightOpen} onToggle={() => setRightOpen(o => !o)} />
      </div>
    </div>
  );
};

export default MainLayout;