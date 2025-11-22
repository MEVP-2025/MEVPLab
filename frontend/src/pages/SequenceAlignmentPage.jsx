// src/pages/PhylotreePage.jsx
import SideGuide from '../components/SideGuide.jsx';
import { useFileContext } from '../contexts/FileContext'; // Hook
import SequencealignmentAPP from '../features/SequenceAlignment/SequencealignmentAPP.jsx';
import '../styles/components/SideGuide.css';

export default function SequenceAlignmentPage() {
  const { haplotypeFiles, selectedHaplotypeIndex } = useFileContext();

  return (
    <div className="page-with-guide">
      <SequencealignmentAPP
        haplotypeContent={
          selectedHaplotypeIndex !== null
            ? haplotypeFiles[selectedHaplotypeIndex].content
            : ""
        }
      />
      <SideGuide guideKey="sequence-alignment" side="right" defaultOpen={false} />
    </div>
  );
}