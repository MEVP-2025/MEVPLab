// src/pages/PhylotreePage.jsx
import SideGuide from '../components/SideGuide.jsx';
import { useFileContext } from '../contexts/FileContext'; // Hook
import PhylotreeApplication from '../features/Phylotree/PhylotreeApp.jsx';
import '../styles/components/SideGuide.css';

export default function PhylotreePage() {
  const { phylotreeContent } = useFileContext();

  return (
    <div className="page-with-guide">
      <PhylotreeApplication initialNewick={phylotreeContent} />
      <SideGuide guideKey="phylotree" side="right" defaultOpen={false} />
    </div>
  );
}