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

  // 這是你原來在「視覺化 App」的 Route element 中做的邏輯
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