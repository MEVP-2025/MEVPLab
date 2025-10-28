// src/pages/HaplotypePage.jsx
import { useFileContext } from '../contexts/FileContext'; // Hook
import HaplotypeNetworkApp from '../HaplotypeNetwork/HaplotypeNetworkApp';

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
    <HaplotypeNetworkApp
      initialFileContent={initialFileContent}
      initialFileName={initialFileName}
      csvContent={csvContent}
      csvFileName={csvFileName}
      eDnaSampleContent={eDnaSampleContent}
      eDnaTagsContent={eDnaTagsContent}
    />
  );
}