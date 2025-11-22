// src/pages/HaplotypePage.jsx
import SideGuide from '../components/SideGuide.jsx';
import { useFileContext } from '../contexts/FileContext'; // Hook
import HaplotypeNetworkApp from '../features/HaplotypeNetwork/HaplotypeNetworkApp';
import '../styles/components/SideGuide.css';

export default function HaplotypePage() {
  const {
    haplotypeFiles,
    selectedHaplotypeIndex,
    csvContent,
    csvFileName,
    eDnaSampleContent,
    eDnaTagsContent,
  } = useFileContext();

  const initialFileContent =
    selectedHaplotypeIndex !== null
      ? haplotypeFiles[selectedHaplotypeIndex].content
      : '';
  const initialFileName =
    selectedHaplotypeIndex !== null
      ? haplotypeFiles[selectedHaplotypeIndex].name
      : '';

  return (
    <div className="page-with-guide">
      <HaplotypeNetworkApp
        initialFileContent={initialFileContent}
        initialFileName={initialFileName}
        csvContent={csvContent}
        csvFileName={csvFileName}
        eDnaSampleContent={eDnaSampleContent}
        eDnaTagsContent={eDnaTagsContent}
      />
      <SideGuide guideKey="haplotype" side="right" defaultOpen={false} />
    </div>
  );
}