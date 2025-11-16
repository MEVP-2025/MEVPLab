// src/pages/PhylotreePage.jsx
import { useFileContext } from '../contexts/FileContext'; // Hook
import SequencealignmentAPP from '../features/SequenceAlignment/SequencealignmentAPP.jsx';

export default function SequenceAlignmentPage() {
  const { haplotypeFiles, selectedHaplotypeIndex } = useFileContext();

  return (
    <SequencealignmentAPP
      haplotypeContent={
        selectedHaplotypeIndex !== null
          ? haplotypeFiles[selectedHaplotypeIndex].content
          : ""
      }
    />
  );
}